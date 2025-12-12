// supabase/functions/get-image-gallery/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Support both GET query params and POST body
    let id: string | null = null
    let imageableType: string | null = null
    let imageableId: string | null = null
    let offerId: string | null = null
    let limit = 50
    let offset = 0

    if (req.method === 'GET') {
      const url = new URL(req.url)
      id = url.searchParams.get('id')
      imageableType = url.searchParams.get('imageable_type')
      imageableId = url.searchParams.get('imageable_id')
      offerId = url.searchParams.get('offer_id')
      limit = parseInt(url.searchParams.get('limit') || '50')
      offset = parseInt(url.searchParams.get('offset') || '0')
    } else if (req.method === 'POST') {
      const body = await req.json()
      id = body.id || body.Id || null
      imageableType = body.imageable_type || body.ImageableType || null
      imageableId = body.imageable_id || body.ImageableId || null
      offerId = body.offer_id || body.OfferId || null
      limit = body.limit || 50
      offset = body.offset || 0
    }

    let query = supabaseClient.from('image_gallery').select('*')

    if (id) {
      query = query.eq('id', id)
    }
    if (imageableType) {
      query = query.eq('imageable_type', imageableType)
    }
    if (imageableId) {
      query = query.eq('imageable_id', imageableId)
    }
    if (offerId) {
      query = query.eq('offer_id', offerId)
    }

    query = query.order('display_order', { ascending: true })
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query
    if (error) throw error

    // Transform to match get-offers pattern - wrap in records and convert id to String
    const records = (data || []).map((record: Record<string, unknown>) => ({
      ...record,
      id: String(record.id),
    }))

    return new Response(
      JSON.stringify({ records }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
