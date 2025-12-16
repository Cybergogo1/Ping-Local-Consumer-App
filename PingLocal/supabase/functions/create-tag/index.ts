// supabase/functions/create-tag/index.ts
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Log the full request body for debugging
    console.log('=== CREATE TAG REQUEST ===')
    console.log('Full body:', JSON.stringify(body, null, 2))

    // Support multiple Adalo formats
    const requestData = body.fields || body.record || body.action?.fields || body

    console.log('Parsed requestData:', JSON.stringify(requestData, null, 2))

    const name = requestData.name || requestData.Name || body.name
    const type = requestData.type || requestData.Type || body.type || 'tags'

    // Check if Adalo is sending an id - we need to ignore it
    const incomingId = requestData.id || requestData.Id || body.id
    console.log('Incoming id (will be ignored):', incomingId)
    console.log('Name:', name)
    console.log('Type:', type)

    // Validate required fields
    if (!name) {
      return new Response(
        JSON.stringify({ error: 'name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if tag with this name already exists
    const { data: existingTag, error: checkError } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (checkError) {
      console.log('Check error:', checkError)
      throw checkError
    }

    // If tag exists, return the existing one
    if (existingTag) {
      console.log('Tag already exists:', existingTag)
      return new Response(
        JSON.stringify({
          success: true,
          tag: existingTag,
          message: 'Tag already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Create new tag - explicitly only pass name and type, NOT id
    const insertData = {
      name: name,
      type: type
    }
    console.log('Insert data:', JSON.stringify(insertData, null, 2))

    const { data, error } = await supabaseClient
      .from('tags')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.log('Insert error:', error)
      throw error
    }

    console.log('Created tag:', data)

    return new Response(
      JSON.stringify({ success: true, tag: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    console.log('Caught error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
