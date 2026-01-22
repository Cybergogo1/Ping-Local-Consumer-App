// supabase/functions/complete-redemption/index.ts
// Called by Adalo business app when staff enters bill/confirms redemption
// For Pay on Day: Sets status='Submitted' (awaits customer confirmation)
// For Pay up Front: Sets status='Finished' (immediate completion)
// Sets bill amount for Pay on Day offers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get raw text first to handle Adalo sending "undefined" as literal text
    const rawText = await req.text()

    // Replace literal "undefined" with null before parsing
    const cleanedText = rawText.replace(/:\s*undefined/g, ': null')

    let body
    try {
      body = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('JSON parse error. Raw text:', rawText)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const requestData = body.fields || body

    const { redemption_token_id, bill_amount, completed_by } = requestData

    if (!redemption_token_id) {
      return new Response(
        JSON.stringify({ error: 'redemption_token_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get the redemption token
    const { data: redemptionToken, error: findError } = await supabaseClient
      .from('redemption_tokens')
      .select('*')
      .eq('id', redemption_token_id)
      .single()

    if (findError) {
      console.error('Error fetching redemption token:', findError)
      return new Response(
        JSON.stringify({ error: 'Redemption token not found', details: findError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (!redemptionToken) {
      return new Response(
        JSON.stringify({ error: 'Redemption token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Redemption token fetched:', JSON.stringify(redemptionToken, null, 2))

    // Get the offer details via purchase_token
    let offer = null
    let purchaseTokenData = null
    if (redemptionToken.purchase_token_id) {
      const { data: purchaseToken, error: purchaseError } = await supabaseClient
        .from('purchase_tokens')
        .select('offer_id, customer_price')
        .eq('id', redemptionToken.purchase_token_id)
        .single()

      if (!purchaseError && purchaseToken) {
        purchaseTokenData = purchaseToken
        if (purchaseToken.offer_id) {
          const { data: offerData } = await supabaseClient
            .from('offers')
            .select('offer_type, customer_bill_input')
            .eq('id', purchaseToken.offer_id)
            .single()

          offer = offerData
        }
      }
    }

    console.log('Offer fetched:', offer)

    // Check if already completed
    if (redemptionToken.status === 'Finished' || redemptionToken.completed) {
      return new Response(
        JSON.stringify({ error: 'This redemption has already been completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Determine if this is a Pay on Day offer
    const isPayOnDay = offer?.offer_type === 'Pay on the day' || offer?.customer_bill_input === true

    console.log('Offer details:', {
      offer_type: offer?.offer_type,
      customer_bill_input: offer?.customer_bill_input,
      isPayOnDay,
      bill_amount
    })

    const now = new Date()

    // Update redemption token
    const updateData: Record<string, any> = {
      updated: now.toISOString(),
    }

    if (isPayOnDay) {
      // Pay on Day: Set to 'Submitted' status (awaits customer confirmation)
      updateData.status = 'Submitted'

      // Bill amount is required for Pay on Day
      if (bill_amount !== undefined && bill_amount !== null) {
        updateData.bill_input_total = bill_amount
      } else {
        return new Response(
          JSON.stringify({ error: 'bill_amount is required for Pay on Day offers' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    } else {
      // Pay up Front: Complete immediately
      updateData.status = 'Finished'
      updateData.completed = true
      updateData.time_redeemed = now.toISOString()
      updateData.date_redeemed = now.toISOString().split('T')[0]

      // Set bill_input_total from customer_price for display purposes in Adalo
      if (purchaseTokenData?.customer_price !== undefined && purchaseTokenData?.customer_price !== null) {
        updateData.bill_input_total = purchaseTokenData.customer_price
      }
    }

    console.log('Update data:', updateData)

    const { error: updateError } = await supabaseClient
      .from('redemption_tokens')
      .update(updateData)
      .eq('id', redemption_token_id)

    if (updateError) {
      throw updateError
    }

    // Only mark purchase token as redeemed if Pay up Front (immediate completion)
    // For Pay on Day, this happens when customer confirms the bill
    if (!isPayOnDay && redemptionToken.purchase_token_id) {
      const { error: purchaseUpdateError } = await supabaseClient
        .from('purchase_tokens')
        .update({
          redeemed: true,
          updated: now.toISOString(),
        })
        .eq('id', redemptionToken.purchase_token_id)

      if (purchaseUpdateError) {
        console.error('Error updating purchase token:', purchaseUpdateError)
        // Don't fail the whole request, redemption is still complete
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        redemption_token_id: redemption_token_id,
        status: updateData.status,
        is_pay_on_day: isPayOnDay,
        bill_amount: bill_amount || null,
        requires_customer_confirmation: isPayOnDay,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Complete redemption error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
