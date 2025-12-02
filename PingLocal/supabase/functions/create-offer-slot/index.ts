// supabase/functions/create-offer-slot/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
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

    // Validate required fields
    if (!requestData.offer_id) {
      return new Response(
        JSON.stringify({ error: 'offer_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!requestData.slot_date) {
      return new Response(
        JSON.stringify({ error: 'slot_date is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!requestData.slot_time) {
      return new Response(
        JSON.stringify({ error: 'slot_time is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create the slot
    const slotData = {
      offer_id: requestData.offer_id,
      slot_date: requestData.slot_date,
      slot_time: requestData.slot_time,
      capacity: requestData.capacity || 10,
      booked_count: 0,
      available: true,
    }

    const { data, error } = await supabaseClient
      .from('offer_slots')
      .insert(slotData)
      .select()
      .single()

    if (error) throw error

    // Return in Adalo-compatible format (id as string)
    const responseData = {
      ...data,
      id: String(data.id),
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
