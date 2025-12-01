// supabase/functions/get-tags-for-offer/index.ts
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
    const tagType = url.searchParams.get('type')

    // If no offer_id provided, return all tags with is_selected: false
    if (!offerId) {
      let tagsQuery = supabaseClient.from('tags').select('*').order('name')
      if (tagType) {
        tagsQuery = tagsQuery.eq('type', tagType)
      }
      const { data: allTags, error: tagsError } = await tagsQuery
      if (tagsError) throw tagsError

      const tagsWithSelection = allTags?.map(tag => ({
        id: tag.id,
        name: tag.name,
        type: tag.type,
        is_selected: false,
        selected_text: 'false',
        selected_icon: '',
        offer_id: null
      })) || []

      return new Response(
        JSON.stringify(tagsWithSelection),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let tagsQuery = supabaseClient.from('tags').select('*').order('name')
    if (tagType) {
      tagsQuery = tagsQuery.eq('type', tagType)
    }
    const { data: allTags, error: tagsError } = await tagsQuery
    if (tagsError) throw tagsError

    const { data: offerTags } = await supabaseClient
      .from('offer_tags')
      .select('tag_id')
      .eq('offer_id', parseInt(offerId))

    const assignedTagIds = new Set(offerTags?.map(ot => ot.tag_id) || [])

    const tagsWithSelection = allTags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      is_selected: assignedTagIds.has(tag.id),
      selected_text: assignedTagIds.has(tag.id) ? 'true' : 'false',
      selected_icon: assignedTagIds.has(tag.id) ? '✓' : '',
      offer_id: parseInt(offerId)
    })) || []

    return new Response(
      JSON.stringify(tagsWithSelection),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})