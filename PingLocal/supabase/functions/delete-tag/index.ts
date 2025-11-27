// supabase/functions/delete-tag/index.ts
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
    const tagId = body.tag_id || body.tagId || body.id

    if (!tagId) throw new Error('tag_id is required')

    const { data: tag } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (!tag) throw new Error(`Tag with id ${tagId} not found`)

    const { error } = await supabaseClient
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, deleted_tag: tag }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})