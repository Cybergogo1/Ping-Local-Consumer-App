// supabase/functions/get-redemption-status/index.ts
// Called by Adalo business app to check the current status of a redemption token
// Returns the full redemption token data including status and bill amount

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    console.log('Get redemption status called:', {
      method: req.method,
      url: req.url
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let redemption_token_id: number

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const idParam = url.searchParams.get('redemption_token_id')
      if (!idParam) {
        return new Response(
          JSON.stringify({ error: 'redemption_token_id parameter is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      redemption_token_id = parseInt(idParam)
    } else {
      // POST request
      const body = await req.json()
      const requestData = body.fields || body
      redemption_token_id = requestData.redemption_token_id

      if (!redemption_token_id) {
        return new Response(
          JSON.stringify({ error: 'redemption_token_id is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
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

    console.log('Returning redemption token:', {
      id: redemptionToken.id,
      status: redemptionToken.status,
      completed: redemptionToken.completed,
      bill_input_total: redemptionToken.bill_input_total
    })

    // Return the full redemption token data
    return new Response(
      JSON.stringify({
        success: true,
        redemption_token: {
          id: redemptionToken.id,
          purchase_token_id: redemptionToken.purchase_token_id,
          status: redemptionToken.status,
          scanned: redemptionToken.scanned,
          completed: redemptionToken.completed,
          bill_input_total: redemptionToken.bill_input_total,
          time_redeemed: redemptionToken.time_redeemed,
          date_redeemed: redemptionToken.date_redeemed,
          customer_name: redemptionToken.customer_name,
          customer_id: redemptionToken.customer_id,
          offer_name: redemptionToken.offer_name,
          business_name: redemptionToken.business_name,
          promotion_id: redemptionToken.promotion_id,
          created: redemptionToken.created,
          updated: redemptionToken.updated,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Get redemption status error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
