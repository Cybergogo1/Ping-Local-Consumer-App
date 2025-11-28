// supabase/functions/create-business-policy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const body = await req.json()
    const {
      name,
      returns_policy,
      redemption,
      category,
      created_by_ping,
      business_id,
      business_ids,
      offer_ids
    } = body

    if (!name) {
      throw new Error('Policy name is required')
    }

    // Deduplicate arrays to prevent primary key conflicts in junction tables
    const uniqueBusinessIds = business_ids ? Array.from(new Set(business_ids)) : null
    const uniqueOfferIds = offer_ids ? Array.from(new Set(offer_ids)) : null

    const { data, error } = await supabaseClient.rpc('create_business_policy', {
      policy_name: name,
      policy_returns_policy: returns_policy || null,
      policy_redemption: redemption || null,
      policy_category: category || null,
      policy_created_by_ping: created_by_ping || false,
      policy_business_id: business_id || null,
      business_ids: uniqueBusinessIds,
      offer_ids: uniqueOfferIds
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ id: data, message: 'Business policy created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
