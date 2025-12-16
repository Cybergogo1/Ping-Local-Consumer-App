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

  // Allow POST or DELETE requests
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST or DELETE.' }),
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

    // Option 1: Delete by ID
    if (body.id) {
      const { error } = await supabaseClient
        .from('opening_times')
        .delete()
        .eq('id', body.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: `Deleted opening time with id ${body.id}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Option 2: Delete all opening times for a business
    if (body.Business || body.DeleteAllForBusiness) {
      const businessName = body.Business || body.DeleteAllForBusiness;

      const { data, error } = await supabaseClient
        .from('opening_times')
        .delete()
        .eq('business_name', businessName)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted ${data?.length || 0} opening times for business: ${businessName}`,
          deleted_count: data?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Either id or Business/DeleteAllForBusiness is required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
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

  URL: https://YOUR_PROJECT.supabase.co/functions/v1/delete-opening-time
  Method: POST or DELETE

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  === Option 1: Delete single opening time by ID ===
  Body:
  {
    "id": 123
  }

  === Option 2: Delete all opening times for a business ===
  Body:
  {
    "Business": "My Business Name"
  }

  or

  {
    "DeleteAllForBusiness": "My Business Name"
  }

*/
