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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

    // Log incoming data for debugging
    console.log("Received body:", JSON.stringify(body, null, 2));

    // Adalo might wrap data in a 'fields' object, so check both formats
    const requestData = body.fields || body;

    console.log("Extracted data:", JSON.stringify(requestData, null, 2));

    // Validate required fields
    if (!requestData.name) {
      return new Response(
        JSON.stringify({ data: null, error: "Offer name is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!requestData.business_id) {
      return new Response(
        JSON.stringify({ data: null, error: "Business ID is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch the business to get its location_area
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("location_area")
      .eq("id", requestData.business_id)
      .single();

    if (businessError) {
      console.error("Error fetching business:", businessError);
      return new Response(
        JSON.stringify({ data: null, error: "Business not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Prepare offer data with defaults
    const offerData = {
      name: requestData.name,
      summary: requestData.summary || null,
      full_description: requestData.full_description || null,
      special_notes: requestData.special_notes || null,
      offer_type: requestData.offer_type || "Pay on the day",
      requires_booking: requestData.requires_booking ?? false,
      booking_type: requestData.booking_type || null,
      booking_url: requestData.booking_url || null,
      one_per_customer: requestData.one_per_customer ?? false,
      price_discount: requestData.price_discount || null,
      unit_of_measurement: requestData.unit_of_measurement || null,
      quantity: requestData.quantity || null,
      number_sold: 0,
      quantity_item: requestData.quantity_item ?? false,
      status: requestData.status || "draft",
      start_date: requestData.start_date || null,
      end_date: requestData.end_date || null,
      finish_time: requestData.finish_time || null,
      business_id: requestData.business_id,
      business_name: requestData.business_name || null,
      featured_image: requestData.featured_image || null,
      category: requestData.category || null,
      customer_bill_input: requestData.customer_bill_input ?? false,
      change_button_text: requestData.change_button_text || null,
      custom_feed_text: requestData.custom_feed_text || null,
      business_policy_id: requestData.business_policy_id || null,
      policy_notes: requestData.policy_notes || null,
      location_area: business.location_area || null,
      business_location: requestData.business_location || null,
    };

    const { data, error } = await supabaseClient
      .from("offers")
      .insert(offerData)
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

    // Send push notification if offer is signed off (published)
    if (data.status === "Signed Off") {
      try {
        const notificationPayload = {
          type: "new_offer",
          business_id: String(data.business_id),
          business_name: data.business_name || data.businesses?.name || "A business you follow",
          offer_id: String(data.id),
          offer_title: data.name,
        };

        // Check if start_date is today or in the past (send immediately) or in the future (schedule)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let shouldSendNow = true;
        let scheduledFor: string | null = null;

        if (data.start_date) {
          const startDate = new Date(data.start_date);
          startDate.setHours(0, 0, 0, 0);

          if (startDate > today) {
            // Start date is in the future - schedule for that date
            shouldSendNow = false;
            scheduledFor = data.start_date;

            // Store scheduled notification in database
            await supabaseClient.from("scheduled_notifications").insert({
              notification_type: "new_offer",
              payload: notificationPayload,
              scheduled_for: data.start_date,
              offer_id: data.id,
              business_id: data.business_id,
              status: "pending",
            });
            console.log(`Notification scheduled for ${data.start_date}`);
          }
        }

        if (shouldSendNow) {
          // Call the send-push-notification function immediately
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
        }
      } catch (notificationError) {
        // Don't fail the offer creation if notification fails
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
