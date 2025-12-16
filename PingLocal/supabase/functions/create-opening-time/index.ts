// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default opening times template (Mon-Fri 9-5, Sat-Sun closed)
const DEFAULT_OPENING_TIMES = [
  { name: 'Monday', day_number: 1, is_open: true, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Tuesday', day_number: 2, is_open: true, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Wednesday', day_number: 3, is_open: true, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Thursday', day_number: 4, is_open: true, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Friday', day_number: 5, is_open: true, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Saturday', day_number: 6, is_open: false, opening_time: '09:00', closing_time: '17:00' },
  { name: 'Sunday', day_number: 7, is_open: false, opening_time: '09:00', closing_time: '17:00' },
];

// Helper to convert time string (HH:MM) to ISO timestamp
function timeToTimestamp(timeStr: string): string {
  const today = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();

    // Check if this is a "generate all 7 days" request
    if (body.GenerateAll && body.Business) {
      // Generate all 7 days for this business
      const businessName = body.Business;

      // Check if opening times already exist for this business
      const { data: existing } = await supabaseClient
        .from('opening_times')
        .select('id')
        .eq('business_name', businessName);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Opening times already exist for this business' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Create all 7 days
      const openingTimesData = DEFAULT_OPENING_TIMES.map(day => ({
        name: day.name,
        day_number: day.day_number,
        is_open: day.is_open,
        opening_time: timeToTimestamp(day.opening_time),
        closing_time: timeToTimestamp(day.closing_time),
        is_special_date: false,
        business_name: businessName,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }));

      const { data, error } = await supabaseClient
        .from('opening_times')
        .insert(openingTimesData)
        .select();

      if (error) throw error;

      // Transform to Adalo format
      const response = data.map(ot => ({
        id: ot.id,
        Name: ot.name,
        No: ot.day_number,
        'Open?': ot.is_open,
        OpeningTime: ot.opening_time,
        ClosingTime: ot.closing_time,
        'IsSpecialDate?': ot.is_special_date,
        SpecialDate: ot.special_date,
        Business: ot.business_name,
        Created: ot.created,
        Updated: ot.updated,
      }));

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Single opening time creation
    // Transform from Adalo format to Supabase format
    const openingTimeData = {
      name: body.Name,
      day_number: body.No,
      is_open: body['Open?'] ?? false,
      opening_time: body.OpeningTime,
      closing_time: body.ClosingTime,
      is_special_date: body['IsSpecialDate?'] ?? false,
      special_date: body.SpecialDate,
      business_name: body.Business,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('opening_times')
      .insert(openingTimeData)
      .select()
      .single();

    if (error) throw error;

    // Transform back to Adalo format
    const response = {
      id: data.id,
      Name: data.name,
      No: data.day_number,
      'Open?': data.is_open,
      OpeningTime: data.opening_time,
      ClosingTime: data.closing_time,
      'IsSpecialDate?': data.is_special_date,
      SpecialDate: data.special_date,
      Business: data.business_name,
      Created: data.created,
      Updated: data.updated,
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/* To invoke from Adalo:

  URL: https://YOUR_PROJECT.supabase.co/functions/v1/create-opening-time
  Method: POST

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  === Option 1: Generate all 7 days for a business ===
  Body:
  {
    "GenerateAll": true,
    "Business": "My Business Name"
  }

  This will create Mon-Fri (9am-5pm, open) and Sat-Sun (9am-5pm, closed)

  === Option 2: Create single opening time ===
  Body:
  {
    "Name": "Monday",
    "No": 1,
    "Open?": true,
    "OpeningTime": "2025-01-01T09:00:00.000Z",
    "ClosingTime": "2025-01-01T17:00:00.000Z",
    "IsSpecialDate?": false,
    "Business": "My Business Name"
  }

*/
