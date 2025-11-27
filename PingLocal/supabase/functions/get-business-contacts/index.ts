// supabase/functions/get-business-contacts/index.ts
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
    const businessId = url.searchParams.get('business_id')
    const id = url.searchParams.get('id')

    let query = supabaseClient.from('business_contacts').select('*').order('created_at', { ascending: false })

    if (id) {
      // Get a single contact by ID
      query = query.eq('id', id).single()
    } else if (businessId) {
      // Get all contacts for a specific business
      query = query.eq('business_id', businessId)
    }

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
