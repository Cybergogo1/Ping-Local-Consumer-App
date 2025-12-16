import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Parse query parameters
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const id = url.searchParams.get('id')
    const email = url.searchParams.get('email')
    const search = url.searchParams.get('search')

    // Build query
    let query = supabaseClient
      .from('users')
      .select('*')
      .order('created', { ascending: false })

    // Apply filters
    if (id) {
      query = query.eq('id', id)
    }
    if (email) {
      query = query.eq('email', email)
    }
    if (search) {
      // Search by first name, surname, or email
      query = query.or(`first_name.ilike.%${search}%,surname.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range((page - 1) * limit, page * limit - 1)

    const { data, error } = await query

    if (error) throw error

    // Transform to Adalo-compatible format (ensure all fields have values for Adalo to detect them)
    const transformedData = data.map(record => ({
      id: String(record.id),
      email: record.email || '',
      first_name: record.first_name || '',
      surname: record.surname || '',
      phone_no: record.phone_no || '',
      loyalty_points: record.loyalty_points ?? 0,
      loyalty_tier: record.loyalty_tier || '',
      verified: record.verified ?? false,
      onboarding_completed: record.onboarding_completed ?? false,
      notification_permission_status: record.notification_permission_status || 'not_asked',
      profile_pic: record.profile_pic || '',
      activate_notifications: record.activate_notifications ?? false,
      selected_location: record.selected_location || '',
      selected_location_id: record.selected_location_id ? String(record.selected_location_id) : '',
      created: record.created || '',
      updated: record.updated || '',
    }))

    return new Response(
      JSON.stringify(transformedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
