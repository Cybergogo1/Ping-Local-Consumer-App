// supabase/functions/get-purchase-tokens/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const userId = url.searchParams.get('user_id')
    const userEmail = url.searchParams.get('user_email')
    const offerId = url.searchParams.get('offer_id')
    const businessId = url.searchParams.get('business_id')
    const redeemed = url.searchParams.get('redeemed')
    const cancelled = url.searchParams.get('cancelled')
    const purchaseType = url.searchParams.get('purchase_type')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabaseClient.from('purchase_tokens').select('*')

    if (id) {
      query = query.eq('id', id)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (userEmail) {
      query = query.eq('user_email', userEmail)
    }
    if (offerId) {
      query = query.eq('offer_id', offerId)
    }
    if (businessId) {
      query = query.eq('business_id', businessId)
    }
    if (redeemed !== null) {
      query = query.eq('redeemed', redeemed === 'true')
    }
    if (cancelled !== null) {
      query = query.eq('cancelled', cancelled === 'true')
    }
    if (purchaseType) {
      query = query.eq('purchase_type', purchaseType)
    }

    query = query.order('created', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error

    return new Response(
      JSON.stringify({ records: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
