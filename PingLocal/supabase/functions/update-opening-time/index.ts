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

  // Allow POST or PUT requests
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST or PUT.' }),
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

    // ID is required for update
    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'id is required for update' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Transform from Adalo format to Supabase format
    // Only include fields that are provided
    const updateData: Record<string, unknown> = {
      updated: new Date().toISOString(),
    };

    if (body.Name !== undefined) updateData.name = body.Name;
    if (body.No !== undefined) updateData.day_number = body.No;
    if (body['Open?'] !== undefined) updateData.is_open = body['Open?'];
    if (body.OpeningTime !== undefined) updateData.opening_time = body.OpeningTime;
    if (body.ClosingTime !== undefined) updateData.closing_time = body.ClosingTime;
    if (body['IsSpecialDate?'] !== undefined) updateData.is_special_date = body['IsSpecialDate?'];
    if (body.SpecialDate !== undefined) updateData.special_date = body.SpecialDate;
    if (body.Business !== undefined) updateData.business_name = body.Business;

    const { data, error } = await supabaseClient
      .from('opening_times')
      .update(updateData)
      .eq('id', body.id)
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

  URL: https://YOUR_PROJECT.supabase.co/functions/v1/update-opening-time
  Method: POST or PUT

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  Body (only include fields you want to update):
  {
    "id": 123,
    "Open?": true,
    "OpeningTime": "2025-01-01T10:00:00.000Z",
    "ClosingTime": "2025-01-01T18:00:00.000Z"
  }

  Available fields:
    - id (required)
    - Name: Day name (Monday, Tuesday, etc.)
    - No: Day number (1-7)
    - Open?: Boolean
    - OpeningTime: ISO timestamp
    - ClosingTime: ISO timestamp
    - IsSpecialDate?: Boolean
    - SpecialDate: Date for special hours
    - Business: Business name

*/
