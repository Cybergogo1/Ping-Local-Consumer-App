import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use DELETE.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)

    // Get parameters from query string
    const id = url.searchParams.get('id')
    const userId = url.searchParams.get('user_id') || url.searchParams.get('userId')
    const deleteAll = url.searchParams.get('delete_all') === 'true'

    // Validate: must have either id or (user_id with delete_all)
    if (!id && !userId) {
      return new Response(
        JSON.stringify({ error: 'Either id or user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Delete by specific ID
    if (id) {
      // Check if record exists
      const { data: existingRecord, error: fetchError } = await supabaseClient
        .from('loyalty_points')
        .select('id')
        .eq('id', id)
        .single()

      if (fetchError || !existingRecord) {
        return new Response(
          JSON.stringify({ error: 'Loyalty points record not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      const { error } = await supabaseClient
        .from('loyalty_points')
        .delete()
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, message: 'Loyalty points record deleted', deleted_id: id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Delete all records for a user (requires delete_all=true for safety)
    if (userId && deleteAll) {
      // Get count of records to be deleted
      const { data: existingRecords, error: fetchError } = await supabaseClient
        .from('loyalty_points')
        .select('id')
        .eq('user_id', userId)

      if (fetchError) throw fetchError

      if (!existingRecords || existingRecords.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No loyalty points records found for user', deleted_count: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const { error } = await supabaseClient
        .from('loyalty_points')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          message: 'All loyalty points records deleted for user',
          deleted_count: existingRecords.length,
          user_id: userId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // If user_id provided without delete_all flag
    if (userId && !deleteAll) {
      return new Response(
        JSON.stringify({ error: 'To delete all records for a user, set delete_all=true' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
