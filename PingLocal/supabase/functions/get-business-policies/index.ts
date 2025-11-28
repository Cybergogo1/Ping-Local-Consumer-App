// supabase/functions/get-business-policies/index.ts
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
    const offerId = url.searchParams.get('offer_id')
    const policyId = url.searchParams.get('id')
    const createdByPing = url.searchParams.get('created_by_ping')

    let data, error

    if (policyId) {
      // Get a specific policy by ID
      const result = await supabaseClient.rpc('get_business_policy_by_id', {
        policy_id: parseInt(policyId)
      })
      data = result.data
      error = result.error
    } else if (businessId) {
      // Get policies for a specific business
      const result = await supabaseClient.rpc('get_business_policies_by_business', {
        business_id_param: parseInt(businessId)
      })
      data = result.data
      error = result.error
    } else if (offerId) {
      // Get policies for a specific offer
      const result = await supabaseClient.rpc('get_business_policies_by_offer', {
        offer_id_param: parseInt(offerId)
      })
      data = result.data
      error = result.error
    } else {
      // Get all policies
      const result = await supabaseClient.rpc('get_all_business_policies')
      data = result.data
      error = result.error
    }

    if (error) throw error

    // Apply created_by_ping filter if specified
    if (createdByPing !== null && data) {
      const filterValue = createdByPing === 'true'
      data = data.filter((policy: any) => policy.created_by_ping === filterValue)
    }

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
