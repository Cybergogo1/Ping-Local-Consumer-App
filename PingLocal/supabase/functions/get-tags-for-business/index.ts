// supabase/functions/get-tags-for-business/index.ts
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
    const businessId = url.searchParams.get('business_id')
    const tagType = url.searchParams.get('type')

    if (!businessId) throw new Error('business_id is required')

    // Get ALL tags
    let tagsQuery = supabaseClient.from('tags').select('*').order('name')
    if (tagType) {
      tagsQuery = tagsQuery.eq('type', tagType)
    }
    const { data: allTags, error: tagsError } = await tagsQuery
    if (tagsError) throw tagsError

    // Get assigned tag IDs for this business
    const { data: businessTags } = await supabaseClient
      .from('business_tags')
      .select('tag_id')
      .eq('business_id', parseInt(businessId))

    const assignedTagIds = new Set(businessTags?.map(bt => bt.tag_id) || [])

    // Merge: add is_selected to each tag
    const tagsWithSelection = allTags?.map(tag => ({
      id: tag.id,
      name: tag.name,
      type: tag.type,
      // Boolean for logic
      is_selected: assignedTagIds.has(tag.id),
      // Text version (Adalo handles this better sometimes)
      selected_text: assignedTagIds.has(tag.id) ? 'true' : 'false',
      // Visual checkmark
      selected_icon: assignedTagIds.has(tag.id) ? '✓' : '',
      // Reference
      business_id: parseInt(businessId)
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