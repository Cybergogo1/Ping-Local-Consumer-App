// supabase/functions/create-image-gallery/index.ts
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Support both snake_case and Adalo-style field names
    const imageGalleryData = {
      imageable_type: body.imageable_type || body.ImageableType,
      imageable_id: body.imageable_id || body.ImageableId,
      offer_id: body.offer_id || body.OfferId,
      image_url: body.image_url || body.ImageUrl,
      display_order: body.display_order ?? body.DisplayOrder ?? 0,
      created: new Date().toISOString(),
    }

    if (!imageGalleryData.image_url) {
      throw new Error('image_url is required')
    }

    const { data, error } = await supabaseClient
      .from('image_gallery')
      .insert(imageGalleryData)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
