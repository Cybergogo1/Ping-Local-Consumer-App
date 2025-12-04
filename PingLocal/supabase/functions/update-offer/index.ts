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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

    // Log incoming data for debugging
    console.log("Received body:", JSON.stringify(body, null, 2));

    // Get id from body OR from URL path (match update-business pattern exactly)
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const urlId = pathParts[pathParts.length - 1];
    const id = body.id || (urlId && urlId !== 'update-offer' ? urlId : null);

    console.log("Final ID:", id);

    if (!id) {
      return new Response(
        JSON.stringify({
          data: null,
          error: "Offer ID is required"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Adalo sends data wrapped in 'fields' object, extract it
    const requestData = body.fields || body;

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      created: _created,
      number_sold: _numberSold,
      ...updateData
    } = requestData;

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
      "business_policy_id",
      "policy_notes",
      "location_area",
      "business_location",
      "pricing_complete",
      "rejection_reason",
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

    // Get current offer status before update (to detect status change to active)
    let previousStatus: string | null = null;
    if (cleanedData.status === "active") {
      const { data: currentOffer } = await supabaseClient
        .from("offers")
        .select("status")
        .eq("id", id)
        .single();
      previousStatus = currentOffer?.status || null;
    }

    const { data, error } = await supabaseClient
      .from("offers")
      .update(cleanedData)
      .eq("id", id)
      .select(`
        *,
        businesses!offers_business_id_fkey (
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

    // Send push notification if offer just became active (was draft/pending before)
    if (data.status === "active" && previousStatus && previousStatus !== "active") {
      try {
        const notificationPayload = {
          type: "new_offer",
          business_id: data.business_id,
          business_name: data.business_name || data.businesses?.name || "A business you follow",
          offer_id: data.id,
          offer_title: data.name,
        };

        // Call the send-push-notification function
        const notificationResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify(notificationPayload),
          }
        );

        const notificationResult = await notificationResponse.json();
        console.log("Push notification result:", notificationResult);
      } catch (notificationError) {
        // Don't fail the offer update if notification fails
        console.error("Error sending push notification:", notificationError);
      }
    }

    // Return direct format (fields at top level) to match working collections
    // Convert id to string for Adalo compatibility
    const responseData = {
      ...data,
      id: String(data.id),
    };

    return new Response(JSON.stringify(responseData), {
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
