import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ data: null, error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    // Debug logging
    console.log("=== REQUEST DEBUG ===");
    console.log("Method:", req.method);
    console.log("Full URL:", req.url);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Support both GET (query param) and POST (body) methods
    let offerId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      console.log("Query params:", Object.fromEntries(url.searchParams));
      offerId = url.searchParams.get("offer_id");
      console.log("Extracted offerId from query:", offerId);
    } else if (req.method === "POST") {
      const body = await req.json();
      console.log("POST body:", JSON.stringify(body, null, 2));
      // Handle both direct format and Adalo's 'fields' wrapper
      const requestData = body.fields || body;
      offerId = requestData.offer_id || requestData.id;
      console.log("Extracted offerId from body:", offerId);
    }

    console.log("Final offerId:", offerId);
    console.log("===================");

    if (!offerId) {
      return new Response(
        JSON.stringify({
          data: null,
          error: "offer_id query parameter is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch offer with nested business and policy data
    const { data, error } = await supabaseClient
      .from("offers")
      .select(`
        *,
        businesses!offers_business_id_fkey (
          id,
          name,
          featured_image,
          location_area,
          location,
          is_signed_off,
          description,
          description_summary,
          opening_times,
          phone_number,
          email,
          category,
          sub_categories,
          is_featured,
          currently_trading
        ),
        business_policies!offers_business_policy_id_fkey (
          id,
          name,
          returns_policy,
          redemption,
          category,
          created_by_ping
        )
      `)
      .eq("id", offerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ data: null, error: "Offer not found" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          }
        );
      }
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

    // Build flattened response with top-level fields for easy Adalo magic text access
    const responseData = {
      // Flattened offer fields
      offer_id: String(data.id),
      offer_name: data.name,
      offer_summary: data.summary,
      offer_description: data.full_description,
      offer_special_notes: data.special_notes,
      offer_image: data.featured_image,
      offer_type: data.offer_type,
      offer_status: data.status,
      offer_price_discount: data.price_discount,
      offer_quantity: data.quantity,
      offer_quantity_item: data.quantity_item,
      offer_unit_of_measurement: data.unit_of_measurement,
      offer_start_date: data.start_date,
      offer_end_date: data.end_date,
      offer_finish_time: data.finish_time,
      offer_category: data.category,
      offer_requires_booking: data.requires_booking,
      offer_booking_type: data.booking_type,
      offer_booking_url: data.booking_url,
      offer_one_per_customer: data.one_per_customer,
      offer_customer_bill_input: data.customer_bill_input,
      offer_change_button_text: data.change_button_text,
      offer_custom_feed_text: data.custom_feed_text,
      offer_business_policy_id: data.business_policy_id,
      offer_policy_name: data.business_policies?.name,
      offer_policy_returns: data.business_policies?.returns_policy,
      offer_policy_redemption: data.business_policies?.redemption,
      offer_policy_notes: data.policy_notes,
      offer_number_sold: data.number_sold,
      offer_created: data.created,

      // Flattened business fields
      business_id: data.businesses ? String(data.businesses.id) : null,
      business_name: data.businesses?.name || data.business_name,
      business_image: data.businesses?.featured_image,
      business_location: data.businesses?.location || data.business_location,
      business_location_area: data.businesses?.location_area || data.location_area,
      business_is_signed_off: data.businesses?.is_signed_off,
      business_description: data.businesses?.description,
      business_description_summary: data.businesses?.description_summary,
      business_opening_times: data.businesses?.opening_times,
      business_phone_number: data.businesses?.phone_number,
      business_email: data.businesses?.email,
      business_category: data.businesses?.category,
      business_sub_categories: data.businesses?.sub_categories,
      business_is_featured: data.businesses?.is_featured,
      business_currently_trading: data.businesses?.currently_trading,

      // Nested objects for complex access
      offer: {
        id: String(data.id),
        name: data.name,
        summary: data.summary,
        full_description: data.full_description,
        special_notes: data.special_notes,
        featured_image: data.featured_image,
        offer_type: data.offer_type,
        status: data.status,
        price_discount: data.price_discount,
        quantity: data.quantity,
        quantity_item: data.quantity_item,
        unit_of_measurement: data.unit_of_measurement,
        start_date: data.start_date,
        end_date: data.end_date,
        finish_time: data.finish_time,
        category: data.category,
        requires_booking: data.requires_booking,
        booking_type: data.booking_type,
        booking_url: data.booking_url,
        one_per_customer: data.one_per_customer,
        customer_bill_input: data.customer_bill_input,
        change_button_text: data.change_button_text,
        custom_feed_text: data.custom_feed_text,
        business_policy_id: data.business_policy_id,
        policy_notes: data.policy_notes,
        number_sold: data.number_sold,
        created: data.created,
        business_id: String(data.business_id),
        business_name: data.business_name,
        business_location: data.business_location,
        location_area: data.location_area,
      },
      business: data.businesses ? {
        id: String(data.businesses.id),
        name: data.businesses.name,
        featured_image: data.businesses.featured_image,
        location_area: data.businesses.location_area,
        location: data.businesses.location,
        is_signed_off: data.businesses.is_signed_off,
        description: data.businesses.description,
        description_summary: data.businesses.description_summary,
        opening_times: data.businesses.opening_times,
        phone_number: data.businesses.phone_number,
        email: data.businesses.email,
        category: data.businesses.category,
        sub_categories: data.businesses.sub_categories,
        is_featured: data.businesses.is_featured,
        currently_trading: data.businesses.currently_trading,
      } : null,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-offer-with-context:", error);
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
