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
      JSON.stringify({ error: 'Method not allowed. Use PUT or PATCH.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const url = new URL(req.url)

    // Log the incoming request for debugging
    console.log('Received body:', JSON.stringify(body, null, 2))

    // Support multiple Adalo formats
    const requestData = body.fields || body.record || body.action?.fields || body

    // Get ID from query param or body
    const id = url.searchParams.get('id') || requestData.id || body.id

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'id is required (as query param or in body)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if record exists
    const { data: existingRecord, error: fetchError } = await supabaseClient
      .from('loyalty_points')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingRecord) {
      return new Response(
        JSON.stringify({ error: 'Loyalty points record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {
      updated: new Date().toISOString()
    }

    // Support multiple field name formats
    const name = requestData.name ?? requestData.Name
    const amount = requestData.amount ?? requestData.Amount
    const reason = requestData.reason ?? requestData.Reason
    const dateReceived = requestData.date_received ?? requestData.dateReceived ?? requestData['Date Received']
    const userId = requestData.user_id ?? requestData.userId ?? requestData['User Id']

    if (name !== undefined) {
      updateData.name = name
    }
    if (amount !== undefined) {
      updateData.amount = Number(amount)
    }
    if (reason !== undefined) {
      updateData.reason = reason
    }
    if (dateReceived !== undefined) {
      updateData.date_received = dateReceived
    }
    if (userId !== undefined) {
      updateData.user_id = Number(userId)
    }

    // Check if there's anything meaningful to update (besides updated timestamp)
    if (Object.keys(updateData).length === 1) {
      return new Response(
        JSON.stringify({ error: 'No fields to update provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { data, error } = await supabaseClient
      .from('loyalty_points')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Return in Adalo-compatible format (lowercase only to avoid duplicate fields)
    const responseData = {
      id: String(data.id),
      name: data.name,
      amount: data.amount,
      user_id: data.user_id ? String(data.user_id) : null,
      reason: data.reason,
      date_received: data.date_received,
      created: data.created,
      updated: data.updated,
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
