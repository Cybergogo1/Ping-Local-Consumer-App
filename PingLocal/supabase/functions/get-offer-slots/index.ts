// supabase/functions/get-offer-slots/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let offerId: string | null = null

    // Handle both GET (query params) and POST (body) methods
    if (req.method === 'GET') {
      const url = new URL(req.url)
      offerId = url.searchParams.get('offer_id')
    } else if (req.method === 'POST') {
      const body = await req.json()
      const requestData = body.fields || body
      offerId = requestData.offer_id
    }

    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'offer_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch slots for the offer, ordered by date and time
    const { data, error } = await supabaseClient
      .from('offer_slots')
      .select('*')
      .eq('offer_id', offerId)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })

    if (error) throw error

    // Convert IDs to strings for Adalo compatibility and calculate available capacity
    const slots = (data || []).map(slot => ({
      ...slot,
      id: String(slot.id),
      offer_id: String(slot.offer_id),
      available_capacity: slot.capacity - slot.booked_count,
    }))

    return new Response(
      JSON.stringify(slots),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
