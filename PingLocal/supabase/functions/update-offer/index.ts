import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "PUT, PATCH, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "PUT" && req.method !== "PATCH") {
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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const body = await req.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created: _created,
      number_sold: _numberSold,
      ...updateData
    } = body;

    // Only include fields that were provided
    const cleanedData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "summary",
      "full_description",
      "special_notes",
      "offer_type",
      "requires_booking",
      "booking_type",
      "booking_url",
      "one_per_customer",
      "price_discount",
      "unit_of_measurement",
      "quantity",
      "quantity_item",
      "status",
      "start_date",
      "end_date",
      "finish_time",
      "business_id",
      "business_name",
      "featured_image",
      "category",
      "customer_bill_input",
      "change_button_text",
      "custom_feed_text",
      "business_policy",
      "policy_notes",
      "location_area",
      "business_location",
    ];

    for (const field of allowedFields) {
      if (field in updateData) {
        cleanedData[field] = updateData[field];
      }
    }

    if (Object.keys(cleanedData).length === 0) {
      return new Response(
        JSON.stringify({ data: null, error: "No valid fields to update" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { data, error } = await supabaseClient
      .from("offers")
      .update(cleanedData)
      .eq("id", id)
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

    if (!data) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    return new Response(JSON.stringify({ data, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
