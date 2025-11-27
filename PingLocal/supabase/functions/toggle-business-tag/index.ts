// supabase/functions/toggle-business-tag/index.ts
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

    const url = new URL(req.url)

    // Accept from either query params OR body
    let businessId = url.searchParams.get('business_id')
    let tagId = url.searchParams.get('tag_id')
    let isSelectedParam = url.searchParams.get('is_selected')

    // Fallback to body if query params not provided
    if (!businessId || !tagId) {
      try {
        const body = await req.json()
        businessId = businessId || body.business_id || body.businessId
        tagId = tagId || body.tag_id || body.tagId
        isSelectedParam = isSelectedParam || body.is_selected || body.selected_text
      } catch (e) {
        // Empty body is ok if query params provided
      }
    }

    // Current state - accepts boolean or string
    const currentlySelected =
      isSelectedParam === true ||
      isSelectedParam === 'true'

    if (!businessId || !tagId) {
      throw new Error('business_id and tag_id are required')
    }

    let action: string
    let newState: boolean

    if (currentlySelected) {
      // Remove
      await supabaseClient
        .from('business_tags')
        .delete()
        .eq('business_id', businessId)
        .eq('tag_id', tagId)
      
      action = 'removed'
      newState = false
    } else {
      // Add
      await supabaseClient
        .from('business_tags')
        .upsert({ business_id: businessId, tag_id: tagId })
      
      action = 'added'
      newState = true
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        tag_id: tagId,
        business_id: businessId,
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