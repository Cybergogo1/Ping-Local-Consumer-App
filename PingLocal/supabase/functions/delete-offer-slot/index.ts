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

  // Accept both POST (for Adalo) and DELETE methods
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ data: null, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    let id: string | null = null

    // Try to get ID from URL path first (Adalo sends /delete-offer-slot/{id})
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastPart = pathParts[pathParts.length - 1]

    // Check if last part is a number (the ID)
    if (lastPart && !isNaN(Number(lastPart))) {
      id = lastPart
    }

    // If not in path, try query params
    if (!id) {
      id = url.searchParams.get('id') || url.searchParams.get('slot_id')
    }

    // If still not found, try to parse body (for POST requests)
    if (!id && req.method === 'POST') {
      try {
        const text = await req.text()
        if (text) {
          const body = JSON.parse(text)
          const requestData = body.fields || body.record || body.action?.fields || body
          id = String(requestData.id || requestData.Id || requestData.slot_id || requestData.slotId || body.id || body.slot_id)
        }
      } catch {
        // Body parsing error, continue
      }
    }

    if (!id || id === 'undefined' || id === 'null') {
      return new Response(
        JSON.stringify({ data: null, error: 'Slot ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if slot exists and has any bookings
    const { data: slot, error: fetchError } = await supabaseClient
      .from('offer_slots')
      .select('id, booked_count')
      .eq('id', id)
      .single()

    if (fetchError || !slot) {
      return new Response(
        JSON.stringify({ data: null, error: 'Slot not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (slot.booked_count > 0) {
      return new Response(
        JSON.stringify({ data: null, error: 'Cannot delete slot with existing bookings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Delete the slot
    const { error } = await supabaseClient
      .from('offer_slots')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: parseInt(id),
          deleted: true,
          message: 'Slot permanently deleted',
        },
        error: null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
