// supabase/functions/delete-image-gallery/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    let id: string | null = null

    // 1. Check query params first
    id = url.searchParams.get('id')

    // 2. Check URL path (e.g., /delete-image-gallery/123)
    if (!id) {
      const pathParts = url.pathname.split('/')
      const lastPart = pathParts[pathParts.length - 1]
      if (lastPart && lastPart !== 'delete-image-gallery' && /^\d+$/.test(lastPart)) {
        id = lastPart
      }
    }

    // 3. Try to parse body (for POST requests)
    if (!id && (req.method === 'POST' || req.method === 'DELETE')) {
      try {
        const text = await req.text()
        if (text) {
          const body = JSON.parse(text)
          // Support many variations of how Adalo might send the id
          const data = body.fields || body
          id = String(data.id || data.Id || data.ID ||
               data.image_gallery_id || data.imageGalleryId ||
               data.record_id || data.recordId ||
               body.id || body.Id || '')
          if (id === '' || id === 'undefined' || id === 'null') {
            id = null
          }
        }
      } catch {
        // Body might be empty or invalid JSON
      }
    }

    if (!id) throw new Error('id is required - send as query param ?id=123 or in body as { "id": 123 }')

    // Fetch the record before deleting (to return it)
    const { data: imageGalleryItem } = await supabaseClient
      .from('image_gallery')
      .select('*')
      .eq('id', id)
      .single()

    if (!imageGalleryItem) throw new Error(`Image gallery item with id ${id} not found`)

    const { error } = await supabaseClient
      .from('image_gallery')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, deleted_item: imageGalleryItem }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
