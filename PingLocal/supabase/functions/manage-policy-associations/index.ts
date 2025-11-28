// supabase/functions/manage-policy-associations/index.ts
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
      policy_id,
      action, // 'add' or 'remove'
      type, // 'businesses' or 'offers'
      ids // array of business_ids or offer_ids
    } = body

    if (!policy_id || !action || !type || !ids) {
      throw new Error('policy_id, action, type, and ids are required')
    }

    if (!['add', 'remove'].includes(action)) {
      throw new Error('action must be either "add" or "remove"')
    }

    if (!['businesses', 'offers'].includes(type)) {
      throw new Error('type must be either "businesses" or "offers"')
    }

    let functionName = ''
    let paramName = ''

    if (action === 'add' && type === 'businesses') {
      functionName = 'add_businesses_to_policy'
      paramName = 'business_ids'
    } else if (action === 'remove' && type === 'businesses') {
      functionName = 'remove_businesses_from_policy'
      paramName = 'business_ids'
    } else if (action === 'add' && type === 'offers') {
      functionName = 'add_offers_to_policy'
      paramName = 'offer_ids'
    } else if (action === 'remove' && type === 'offers') {
      functionName = 'remove_offers_from_policy'
      paramName = 'offer_ids'
    }

    const params = {
      policy_id: policy_id,
      [paramName]: ids
    }

    const { data, error } = await supabaseClient.rpc(functionName, params)

    if (error) throw error

    return new Response(
      JSON.stringify({
        message: `Successfully ${action === 'add' ? 'added' : 'removed'} ${type} ${action === 'add' ? 'to' : 'from'} policy`,
        success: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
