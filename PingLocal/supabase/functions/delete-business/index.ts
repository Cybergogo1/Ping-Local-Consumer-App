// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, POST, OPTIONS'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow DELETE or POST (for Adalo compatibility)
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed. Use DELETE or POST.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get id from body or URL
    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    let softDelete = url.searchParams.get('soft') === 'true';

    // Also check body for Adalo compatibility
    if (req.method === 'POST' || !id) {
      try {
        const body = await req.json();
        id = id || body.id?.toString();
        if (body.soft !== undefined) {
          softDelete = body.soft === true || body.soft === 'true';
        }
      } catch {
        // Body parsing failed, continue with URL params
      }
    }

    if (!id) {
      return new Response(JSON.stringify({
        error: 'Business ID is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Check if business exists first
    const { data: existingBusiness, error: fetchError } = await supabaseClient
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingBusiness) {
      return new Response(JSON.stringify({
        error: 'Business not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    if (softDelete) {
      // Soft delete - update is_signed_off to false and mark as inactive
      const { data, error } = await supabaseClient
        .from('businesses')
        .update({
          is_signed_off: false,
          currently_trading: false,
          updated: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        id: data.id,
        Name: data.name,
        deleted: true,
        soft_delete: true,
        message: 'Business has been deactivated'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      // Hard delete - permanently remove from database
      const { error } = await supabaseClient
        .from('businesses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({
        id: parseInt(id),
        Name: existingBusiness.name,
        deleted: true,
        soft_delete: false,
        message: 'Business permanently deleted'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});

/* To invoke:

  URL: https://pyufvauhjqfffezptuxl.supabase.co/functions/v1/delete-business
  Method: DELETE or POST

  Headers:
    Authorization: Bearer YOUR_SUPABASE_ANON_KEY
    Content-Type: application/json

  Option 1 - Query params (DELETE):
    DELETE /delete-business?id=123
    DELETE /delete-business?id=123&soft=true  (soft delete)

  Option 2 - Body (POST, Adalo compatible):
    {
      "id": 123,
      "soft": true  // optional, defaults to hard delete
    }

  Response:
    {
      "id": 123,
      "Name": "Business Name",
      "deleted": true,
      "soft_delete": false,
      "message": "Business permanently deleted"
    }

*/
