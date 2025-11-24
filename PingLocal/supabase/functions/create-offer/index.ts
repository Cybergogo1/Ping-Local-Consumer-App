import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ data: null, error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ data: null, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer name is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!body.business_id) {
      return new Response(
        JSON.stringify({ data: null, error: "Business ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Prepare offer data with defaults
    const offerData = {
      name: body.name,
      summary: body.summary || null,
      full_description: body.full_description || null,
      special_notes: body.special_notes || null,
      offer_type: body.offer_type || "Pay on the day",
      requires_booking: body.requires_booking ?? false,
      booking_type: body.booking_type || null,
      booking_url: body.booking_url || null,
      one_per_customer: body.one_per_customer ?? false,
      price_discount: body.price_discount || null,
      unit_of_measurement: body.unit_of_measurement || null,
      quantity: body.quantity || null,
      number_sold: 0,
      quantity_item: body.quantity_item ?? false,
      status: body.status || "draft",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      finish_time: body.finish_time || null,
      business_id: body.business_id,
      business_name: body.business_name || null,
      featured_image: body.featured_image || null,
      category: body.category || null,
      customer_bill_input: body.customer_bill_input ?? false,
      change_button_text: body.change_button_text || null,
      custom_feed_text: body.custom_feed_text || null,
      business_policy: body.business_policy || null,
      policy_notes: body.policy_notes || null,
      location_area: body.location_area || null,
      business_location: body.business_location || null,
    };

    const { data, error } = await supabaseClient
      .from("offers")
      .insert(offerData)
      .select(`
        *,
        businesses (
          id,
          name,
          featured_image,
          location_area,
          location,
          is_signed_off
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ data, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
