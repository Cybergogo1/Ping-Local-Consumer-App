// supabase/functions/update-business-policy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

    // Log incoming data for debugging
    console.log("Received body:", JSON.stringify(body, null, 2))

    // Adalo sends data wrapped in 'fields' object, extract it
    const requestData = body.fields || body

    // Get id from multiple sources: query param, body.id, fields.id, or URL path
    const url = new URL(req.url)
    const queryId = url.searchParams.get('id')
    const pathParts = url.pathname.split('/')
    const urlId = pathParts[pathParts.length - 1]
    const id = queryId || body.id || requestData.id || (urlId && urlId !== 'update-business-policy' ? urlId : null)

    console.log("Query ID:", queryId)
    console.log("Body ID:", body.id)
    console.log("RequestData ID:", requestData.id)
    console.log("URL Path ID:", urlId)
    console.log("Final ID:", id)

    const {
      name,
      returns_policy,
      redemption,
      category,
      created_by_ping,
      business_id
    } = requestData

    if (!id) {
      throw new Error('Policy ID is required')
    }

    const { data, error } = await supabaseClient.rpc('update_business_policy', {
      policy_id: id,
      policy_name: name || null,
      policy_returns_policy: returns_policy || null,
      policy_redemption: redemption || null,
      policy_category: category || null,
      policy_created_by_ping: created_by_ping !== undefined ? created_by_ping : null,
      policy_business_id: business_id || null
    })

    if (error) throw error

    if (!data) {
      throw new Error('Business policy not found')
    }

    return new Response(
      JSON.stringify({ message: 'Business policy updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
