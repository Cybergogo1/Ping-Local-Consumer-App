// supabase/functions/toggle-offer-tag/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract from query params first
    const url = new URL(req.url)
    let offerId = url.searchParams.get('offer_id')
    let tagId = url.searchParams.get('tag_id')
    let isSelectedParam = url.searchParams.get('is_selected')

    // Fallback to body if query params not provided
    if (!offerId || !tagId) {
      try {
        const body = await req.json()
        offerId = offerId || body.offer_id || body.offerId
        tagId = tagId || body.tag_id || body.tagId
        isSelectedParam = isSelectedParam || body.is_selected || body.selected_text
      } catch (e) {
        // Empty body is ok if query params provided
      }
    }

    // Validate required params
    if (!offerId || !tagId) {
      throw new Error('offer_id and tag_id are required')
    }

    // Parse is_selected: true means "currently selected, so remove it"
    const currentlySelected =
      isSelectedParam === true ||
      isSelectedParam === 'true'

    let action
    let newState

    if (currentlySelected) {
      // Remove the tag (toggle off)
      await supabaseClient
        .from('offer_tags')
        .delete()
        .eq('offer_id', offerId)
        .eq('tag_id', tagId)

      action = 'removed'
      newState = false
    } else {
      // Add the tag (toggle on)
      await supabaseClient
        .from('offer_tags')
        .upsert({ offer_id: offerId, tag_id: tagId })

      action = 'added'
      newState = true
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        tag_id: tagId,
        offer_id: offerId,
        is_selected: newState
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
});
