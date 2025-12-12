// supabase/functions/update-redemption-tokens/index.ts
// Updates a redemption token record. Can filter by id or business_id.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return new Response(
      JSON.stringify({ data: null, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Log incoming data for debugging
    console.log('Received body:', JSON.stringify(body, null, 2))

    // Get id from body OR from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const urlId = pathParts[pathParts.length - 1]
    const id = body.id || (urlId && urlId !== 'update-redemption-tokens' ? urlId : null)

    console.log('Final ID:', id)

    if (!id) {
      return new Response(
        JSON.stringify({ data: null, error: 'Redemption token ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Adalo sends data wrapped in 'fields' object, extract it
    const requestData = body.fields || body

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created: _created,
      ...updateData
    } = requestData

    // Only include fields that were provided
    const cleanedData: Record<string, unknown> = {}
    const allowedFields = [
      'purchase_token_id',
      'customer_id',
      'promotion_id',
      'business_id',
      'status',
      'scanned',
      'completed',
      'time_redeemed',
      'date_redeemed',
      'bill_input_total',
      'Adjusted_Bill',
      'updated',
    ]

    for (const field of allowedFields) {
      if (field in updateData) {
        cleanedData[field] = updateData[field]
      }
    }

    // Always set updated timestamp
    cleanedData.updated = new Date().toISOString()

    if (Object.keys(cleanedData).length <= 1) {
      // Only 'updated' field present, no actual data to update
      return new Response(
        JSON.stringify({ data: null, error: 'No valid fields to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { data, error } = await supabaseClient
      .from('redemption_tokens')
      .update(cleanedData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return new Response(
        JSON.stringify({ data: null, error: 'Redemption token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Transform record to ensure id is string for Adalo compatibility
    const responseData = {
      ...data,
      id: String(data.id),
      purchase_token_id: data.purchase_token_id ? String(data.purchase_token_id) : null,
      customer_id: data.customer_id ? String(data.customer_id) : null,
      promotion_id: data.promotion_id ? String(data.promotion_id) : null,
      business_id: data.business_id ? String(data.business_id) : null,
      Adjusted_Bill: data.Adjusted_Bill ?? null,
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Update redemption token error:', error)
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
