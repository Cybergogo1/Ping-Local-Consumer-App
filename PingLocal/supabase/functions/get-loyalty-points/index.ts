import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Parse query parameters
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const userId = url.searchParams.get('user_id') || url.searchParams.get('userId')
    const id = url.searchParams.get('id')
    const includeTotal = url.searchParams.get('include_total') === 'true'

    // Build query
    let query = supabaseClient
      .from('loyalty_points')
      .select('*')
      .order('created', { ascending: false })

    // Apply filters
    if (id) {
      query = query.eq('id', id)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Apply pagination
    query = query.range((page - 1) * limit, page * limit - 1)

    const { data, error } = await query

    if (error) throw error

    // Calculate total amount if requested and filtering by user
    let totalAmount = null
    if (includeTotal && userId) {
      const { data: allPoints, error: totalError } = await supabaseClient
        .from('loyalty_points')
        .select('amount')
        .eq('user_id', userId)

      if (!totalError && allPoints) {
        totalAmount = allPoints.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
      }
    }

    // Transform to Adalo-compatible format (lowercase only to avoid duplicate fields)
    const transformedData = data.map(record => ({
      id: String(record.id),
      name: record.name,
      amount: record.amount,
      user_id: record.user_id ? String(record.user_id) : null,
      reason: record.reason,
      date_received: record.date_received,
      created: record.created,
      updated: record.updated,
    }))

    // Return response with optional total
    const response = includeTotal && userId
      ? { data: transformedData, total_amount: totalAmount }
      : transformedData

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
