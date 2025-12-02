// supabase/functions/delete-offer-slot/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Support both direct fields and Adalo's 'fields' wrapper
    const requestData = body.fields || body

    const slotId = requestData.slot_id || requestData.id

    if (!slotId) {
      return new Response(
        JSON.stringify({ error: 'slot_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if slot has any bookings
    const { data: slot, error: fetchError } = await supabaseClient
      .from('offer_slots')
      .select('booked_count')
      .eq('id', slotId)
      .single()

    if (fetchError) throw fetchError

    if (slot && slot.booked_count > 0) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete slot with existing bookings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Delete the slot
    const { error } = await supabaseClient
      .from('offer_slots')
      .delete()
      .eq('id', slotId)

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, deleted_id: String(slotId) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
