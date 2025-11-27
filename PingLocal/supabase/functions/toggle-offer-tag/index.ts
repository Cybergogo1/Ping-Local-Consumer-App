// supabase/functions/toggle-offer-tag/index.ts
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const offerId = body.offer_id || body.offerId
    const tagId = body.tag_id || body.tagId
    const currentlySelected = 
      body.is_selected === true || 
      body.is_selected === 'true' || 
      body.selected_text === 'true'

    if (!offerId || !tagId) {
      throw new Error('offer_id and tag_id are required')
    }

    let action: string
    let newState: boolean

    if (currentlySelected) {
      await supabaseClient
        .from('offer_tags')
        .delete()
        .eq('offer_id', offerId)
        .eq('tag_id', tagId)
      
      action = 'removed'
      newState = false
    } else {
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
})