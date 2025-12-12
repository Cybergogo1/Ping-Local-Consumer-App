// supabase/functions/update-image-gallery/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use PUT, PATCH, or POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const id = body.id

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'id is required for updates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Build update object - only include fields that are provided
    const updateData: Record<string, any> = {}

    // Support both snake_case and Adalo-style field names
    if (body.imageable_type !== undefined || body.ImageableType !== undefined) {
      updateData.imageable_type = body.imageable_type || body.ImageableType
    }
    if (body.imageable_id !== undefined || body.ImageableId !== undefined) {
      updateData.imageable_id = body.imageable_id || body.ImageableId
    }
    if (body.offer_id !== undefined || body.OfferId !== undefined) {
      updateData.offer_id = body.offer_id || body.OfferId
    }
    if (body.image_url !== undefined || body.ImageUrl !== undefined) {
      updateData.image_url = body.image_url || body.ImageUrl
    }
    if (body.display_order !== undefined || body.DisplayOrder !== undefined) {
      updateData.display_order = body.display_order ?? body.DisplayOrder
    }

    const { data, error } = await supabaseClient
      .from('image_gallery')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
