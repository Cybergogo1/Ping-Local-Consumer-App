// supabase/functions/get-selected-offer-tags/index.ts
// External collection endpoint for Adalo - returns only selected tags for an offer filtered by type='tags'
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const offerId = url.searchParams.get('offer_id')

    if (!offerId) {
      throw new Error('offer_id is required')
    }

    // Get tags that are assigned to this offer AND have type = 'tags'
    const { data, error } = await supabaseClient
      .from('offer_tags')
      .select(`
        id,
        tag_id,
        offer_id,
        tags!inner (
          id,
          name,
          type
        )
      `)
      .eq('offer_id', parseInt(offerId))
      .eq('tags.type', 'tags')

    if (error) throw error

    // Transform to Adalo-friendly format
    const selectedTags = data?.map((ot: any) => ({
      id: ot.id,                    // offer_tags junction id
      tag_id: ot.tags.id,           // the actual tag id
      offer_id: ot.offer_id,
      'Tag Name': ot.tags.name,     // Adalo-style field name
      'Tag Type': ot.tags.type,
      name: ot.tags.name,           // also include lowercase for flexibility
      type: ot.tags.type
    })) || []

    return new Response(
      JSON.stringify(selectedTags),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
