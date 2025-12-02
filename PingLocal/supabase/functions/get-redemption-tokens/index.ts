// supabase/functions/get-redemption-tokens/index.ts
// Returns redemption tokens, can be filtered by id, purchase_token_id, or customer_id

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const purchaseTokenId = url.searchParams.get('purchase_token_id')
    const customerId = url.searchParams.get('customer_id')
    const status = url.searchParams.get('status')
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    let query = supabaseClient
      .from('redemption_tokens')
      .select('*')

    // Filter by specific redemption token ID
    if (id) {
      query = query.eq('id', id)
    }

    // Filter by purchase token ID
    if (purchaseTokenId) {
      query = query.eq('purchase_token_id', purchaseTokenId)
    }

    // Filter by customer ID
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Order by created date descending (newest first)
    query = query.order('created', { ascending: false })

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    if (offset) {
      query = query.range(
        parseInt(offset),
        parseInt(offset) + (parseInt(limit || '10') - 1)
      )
    }

    const { data, error } = id ? await query.single() : await query

    if (error) {
      throw error
    }

    // Transform record to ensure id is string for Adalo compatibility
    const transformRecord = (record: Record<string, unknown>) => {
      return {
        ...record,
        id: String(record.id),
        purchase_token_id: record.purchase_token_id ? String(record.purchase_token_id) : null,
        customer_id: record.customer_id ? String(record.customer_id) : null,
        promotion_id: record.promotion_id ? String(record.promotion_id) : null,
      }
    }

    const records = Array.isArray(data)
      ? data.map(transformRecord)
      : [transformRecord(data)]

    return new Response(
      JSON.stringify({ records }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Get redemption tokens error:', error)
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
