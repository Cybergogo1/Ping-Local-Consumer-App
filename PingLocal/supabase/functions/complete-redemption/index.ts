// supabase/functions/complete-redemption/index.ts
// Called by Adalo business app when staff confirms redemption
// Updates redemption_token to status='Finished', sets bill amount if Pay on Day
// Also marks purchase_token as redeemed

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

    if (findError || !redemptionToken) {
      return new Response(
        JSON.stringify({ error: 'Redemption token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if already completed
    if (redemptionToken.status === 'Finished' || redemptionToken.completed) {
      return new Response(
        JSON.stringify({ error: 'This redemption has already been completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const now = new Date()

    // Update redemption token to finished
    const updateData: Record<string, any> = {
      status: 'Finished',
      completed: true,
      time_redeemed: now.toISOString(),
      date_redeemed: now.toISOString().split('T')[0],
      updated: now.toISOString(),
    }

    // If bill amount provided (Pay on Day), set it
    if (bill_amount !== undefined && bill_amount !== null) {
      updateData.bill_input_total = bill_amount
    }

    const { error: updateError } = await supabaseClient
      .from('redemption_tokens')
      .update(updateData)
      .eq('id', redemption_token_id)

    if (updateError) {
      throw updateError
    }

    // Also mark the purchase token as redeemed
    if (redemptionToken.purchase_token_id) {
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
        status: 'Finished',
        bill_amount: bill_amount || null,
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
