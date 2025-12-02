// supabase/functions/scan-redemption-token/index.ts
// Called by Adalo business app when staff scans a QR code
// Updates redemption_token to scanned=true, status='In Progress'
// Returns offer details for business to confirm

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

    const body = await req.json()
    const requestData = body.fields || body

    const { purchase_token_id, scanned_by } = requestData

    if (!purchase_token_id) {
      return new Response(
        JSON.stringify({ error: 'purchase_token_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Find the redemption token by purchase_token_id
    const { data: redemptionToken, error: findError } = await supabaseClient
      .from('redemption_tokens')
      .select('*')
      .eq('purchase_token_id', purchase_token_id)
      .single()

    if (findError || !redemptionToken) {
      return new Response(
        JSON.stringify({ error: 'Redemption token not found. Customer may not have opened their QR code yet.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if already scanned
    if (redemptionToken.scanned) {
      return new Response(
        JSON.stringify({ error: 'This QR code has already been scanned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if already redeemed
    if (redemptionToken.status === 'Finished' || redemptionToken.completed) {
      return new Response(
        JSON.stringify({ error: 'This offer has already been redeemed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get purchase token details for the response
    const { data: purchaseToken, error: purchaseError } = await supabaseClient
      .from('purchase_tokens')
      .select('*')
      .eq('id', purchase_token_id)
      .single()

    if (purchaseError || !purchaseToken) {
      return new Response(
        JSON.stringify({ error: 'Purchase token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get user details
    const { data: user } = await supabaseClient
      .from('users')
      .select('first_name, surname, email')
      .eq('id', purchaseToken.user_id)
      .single()

    // Update redemption token: mark as scanned and in progress
    const { error: updateError } = await supabaseClient
      .from('redemption_tokens')
      .update({
        scanned: true,
        status: 'In Progress',
        updated: new Date().toISOString(),
      })
      .eq('id', redemptionToken.id)

    if (updateError) {
      throw updateError
    }

    // Return offer details for Adalo to display
    const customerName = user
      ? `${user.first_name || ''} ${user.surname || ''}`.trim() || user.email
      : purchaseToken.user_email || 'Unknown Customer'

    return new Response(
      JSON.stringify({
        success: true,
        redemption_token_id: redemptionToken.id,
        purchase_token_id: purchaseToken.id,
        offer_name: purchaseToken.offer_name,
        customer_name: customerName,
        customer_email: purchaseToken.user_email,
        purchase_type: purchaseToken.purchase_type,
        customer_price: purchaseToken.customer_price,
        offer_id: purchaseToken.offer_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Scan redemption token error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
