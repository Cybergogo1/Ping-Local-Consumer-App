// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Parse query parameters (for Adalo compatibility)
    const url = new URL(req.url);
    const businessName = url.searchParams.get('business_name');
    const id = url.searchParams.get('id');
    const dayNumber = url.searchParams.get('day_number');

    // Build query
    let query = supabaseClient
      .from('opening_times')
      .select('*')
      .order('day_number', { ascending: true });

    // Apply filters
    if (businessName) {
      query = query.eq('business_name', businessName);
    }
    if (id) {
      query = query.eq('id', parseInt(id));
    }
    if (dayNumber) {
      query = query.eq('day_number', parseInt(dayNumber));
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform to Adalo format
    const transformedData = data.map(openingTime => ({
      id: openingTime.id,
      Name: openingTime.name,
      No: openingTime.day_number,
      'Open?': openingTime.is_open,
      OpeningTime: openingTime.opening_time,
      ClosingTime: openingTime.closing_time,
      'IsSpecialDate?': openingTime.is_special_date,
      SpecialDate: openingTime.special_date,
      Business: openingTime.business_name,
      Created: openingTime.created,
      Updated: openingTime.updated,
    }));

    return new Response(
      JSON.stringify(transformedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/* To invoke from Adalo:

  URL: https://YOUR_PROJECT.supabase.co/functions/v1/get-opening-times
  Method: GET

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY

  Query Parameters (optional):
    - business_name: Filter by business name
    - id: Get specific opening time by ID
    - day_number: Filter by day (1=Monday, 7=Sunday)

  Example: /get-opening-times?business_name=My%20Business

*/
