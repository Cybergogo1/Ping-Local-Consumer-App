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

    // Log the incoming request for debugging
    console.log('Received body:', JSON.stringify(body, null, 2))

    // Support multiple Adalo formats:
    // 1. Direct fields: { offer_id: 123 }
    // 2. Wrapped in 'fields': { fields: { offer_id: 123 } }
    // 3. Wrapped in 'record': { record: { offer_id: 123 } }
    // 4. Adalo action format: { action: { fields: { offer_id: 123 } } }
    const requestData = body.fields || body.record || body.action?.fields || body

    // Support multiple field name formats from Adalo
    // Adalo may send: offer_id, offerId, or "Offer Id"
    const offerId = requestData.offer_id || requestData.offerId || requestData['Offer Id'] || requestData['offer id'] || body.offer_id
    const slotDate = requestData.slot_date || requestData.slotDate || requestData['Slot Date'] || requestData['slot date'] || body.slot_date
    const slotTime = requestData.slot_time || requestData.slotTime || requestData['Slot Time'] || requestData['slot time'] || body.slot_time
    const capacity = requestData.capacity || requestData.Capacity || body.capacity || 10

    // Validate required fields
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'offer_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!slotDate) {
      return new Response(
        JSON.stringify({ error: 'slot_date is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!slotTime) {
      return new Response(
        JSON.stringify({ error: 'slot_time is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create the slot
    const slotData = {
      offer_id: offerId,
      slot_date: slotDate,
      slot_time: slotTime,
      capacity: capacity,
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
