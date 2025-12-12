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

    // Parse query parameters (for Adalo compatibility)
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const featured = url.searchParams.get('featured')
    const locationArea = url.searchParams.get('location_area')
    const isSignedOff = url.searchParams.get('is_signed_off')
    const businessId = url.searchParams.get('id')

    // Build query
    let query = supabaseClient
      .from('businesses')
      .select('*')
      .order('created', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }
    if (locationArea) {
      query = query.eq('location_area', locationArea)
    }
    if (isSignedOff) {
      query = query.eq('is_signed_off', isSignedOff === 'true')
    }
    if (businessId) {
      query = query.eq('id', businessId)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform to Adalo format (if needed)
    const transformedData = data.map(business => ({
      id: business.id,
      Name: business.name,
      'Featured Image': business.featured_image,
      Email: business.email,
      Description: business.description,
      DescriptionSummary: business.description_summary,
      Location: business.location,
      'Phone Number': business.phone_number,
      'Opening Times': business.opening_times,
      'AvailablePromotionTypes': business.available_promotion_types,
      'IsFeatured?': business.is_featured,
      'IsSignedOff?': business.is_signed_off,
      'Location Area': business.location_area,
      'Primary User': business.primary_user,
      OwnerID: business.owner_id,
      Category: business.category,
      'Sub Categories': business.sub_categories,
      'Stripe Account No.': business.stripe_account_no,
      LeadRate: business.lead_rate,
      CutPercent: business.cut_percent,
      'Currently Trading': business.currently_trading,
      latitude: business.latitude,
      longitude: business.longitude,
      Created: business.created,
      Updated: business.updated
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
