// supabase/functions/update-tag/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, PUT, PATCH, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Accept POST, PUT, or PATCH
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
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

    const url = new URL(req.url)

    // Debug logging
    console.log('=== UPDATE TAG REQUEST ===')
    console.log('Full URL:', req.url)
    console.log('Method:', req.method)

    let id: string | null = null

    // Try to get ID from URL path first (e.g., /update-tag/{id})
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastPart = pathParts[pathParts.length - 1]

    if (lastPart && !isNaN(Number(lastPart))) {
      id = lastPart
      console.log('ID from URL path:', id)
    }

    // If not in path, try query params
    if (!id) {
      id = url.searchParams.get('id') || url.searchParams.get('tag_id')
      console.log('ID from query params:', id)
    }

    // Parse body
    let body: Record<string, unknown> = {}
    try {
      const text = await req.text()
      console.log('Request body:', text)
      if (text) {
        body = JSON.parse(text)
      }
    } catch (e) {
      console.log('Body parsing error:', e.message)
    }

    // Support multiple Adalo formats
    const requestData = body.fields || body.record || body.action?.fields || body

    console.log('Parsed requestData:', JSON.stringify(requestData, null, 2))

    // If ID still not found, try body
    if (!id) {
      id = String(requestData.id || requestData.Id || requestData.tag_id || requestData.tagId || body.id || body.tag_id || '')
      console.log('ID from body:', id)
    }

    console.log('Final Tag ID to update:', id)

    if (!id || id === 'undefined' || id === 'null' || id === '') {
      return new Response(
        JSON.stringify({ error: 'Tag ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if tag exists
    const { data: existingTag, error: fetchError } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('id', id)
      .single()

    console.log('Existing tag:', existingTag)

    if (fetchError || !existingTag) {
      return new Response(
        JSON.stringify({ error: `Tag with id ${id} not found` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Extract fields to update
    const name = requestData.name || requestData.Name || body.name
    const type = requestData.type || requestData.Type || body.type

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (name !== undefined && name !== null && name !== '') {
      updateData.name = name
    }

    if (type !== undefined && type !== null && type !== '') {
      updateData.type = type
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2))

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          tag: existingTag,
          message: 'No changes provided'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Check if new name conflicts with existing tag (if name is being changed)
    if (updateData.name && updateData.name !== existingTag.name) {
      const { data: conflictingTag } = await supabaseClient
        .from('tags')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', id)
        .maybeSingle()

      if (conflictingTag) {
        return new Response(
          JSON.stringify({ error: `A tag with name "${updateData.name}" already exists` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        )
      }
    }

    // Perform update
    const { data, error } = await supabaseClient
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.log('Update error:', error)
      throw error
    }

    console.log('Updated tag:', data)

    return new Response(
      JSON.stringify({ success: true, tag: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.log('Caught error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
