import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PurchaseNotificationPayload {
  offer_id: number;
  offer_name: string;
  business_id: number;
  business_name: string;
  consumer_user_id: number;
  consumer_name: string;
  amount: number | null; // null for "Pay on the day" offers
  purchase_type: string;
  booking_date?: string;
  booking_time?: string;
}

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PurchaseNotificationPayload = await req.json();
    console.log("Received purchase notification payload:", JSON.stringify(payload, null, 2));

    const {
      offer_id,
      offer_name,
      business_id,
      business_name,
      consumer_user_id,
      consumer_name,
      amount,
      purchase_type,
      booking_date,
      booking_time,
    } = payload;

    // Format the purchase date/time
    const now = new Date();
    const purchaseDateTime = `${now.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })} at ${now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    // Format booking info if available
    let bookingInfo = "";
    if (booking_date || booking_time) {
      const parts = [];
      if (booking_date) parts.push(booking_date);
      if (booking_time) parts.push(booking_time);
      bookingInfo = ` (Booking: ${parts.join(" at ")})`;
    }

    // Format amount for display
    const amountDisplay = amount ? `£${amount.toFixed(2)}` : "Pay on the day";

    // 1. Create consumer notification
    const consumerNotification = {
      name: "Purchase Confirmed",
      content: `Congratulations! You bought ${offer_name} from ${business_name}`,
      read: false,
      user_id: consumer_user_id,
      trigger_user_id: null,
      offer_id: offer_id,
      notifications_categories: "purchase",
      business_id: null, // consumer notification, not for business filtering
    };

    const { error: consumerNotifError } = await supabase
      .from("notifications")
      .insert(consumerNotification);

    if (consumerNotifError) {
      console.error("Error creating consumer notification:", consumerNotifError);
    } else {
      console.log("Consumer notification created successfully");
    }

    // 2. Get business owner ID to create business notification
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", business_id)
      .single();

    if (businessError) {
      console.error("Error fetching business:", businessError);
    }

    // Create business notification (if owner exists)
    if (business?.owner_id) {
      const businessNotification = {
        name: "New Purchase",
        content: `${consumer_name} bought your offer '${offer_name}' for ${amountDisplay} on ${purchaseDateTime}${bookingInfo}`,
        read: false,
        user_id: business.owner_id,
        trigger_user_id: consumer_user_id,
        offer_id: offer_id,
        notifications_categories: "purchase",
        business_id: business_id, // for Adalo filtering
      };

      const { error: businessNotifError } = await supabase
        .from("notifications")
        .insert(businessNotification);

      if (businessNotifError) {
        console.error("Error creating business notification:", businessNotifError);
      } else {
        console.log("Business notification created successfully");
      }
    } else {
      console.log("No business owner found, skipping business notification");
    }

    // 3. Send push notification to consumer
    // Check if user has push notifications enabled
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("activate_notifications")
      .eq("id", consumer_user_id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
    }

    let pushSent = false;
    if (userData?.activate_notifications !== false) {
      // Get push tokens for consumer
      const { data: pushTokens, error: tokenError } = await supabase
        .from("push_tokens")
        .select("expo_push_token")
        .eq("user_id", consumer_user_id)
        .eq("is_active", true);

      if (tokenError) {
        console.error("Error fetching push tokens:", tokenError);
      }

      if (pushTokens && pushTokens.length > 0) {
        const tokens = pushTokens.map((t: { expo_push_token: string }) => t.expo_push_token);

        const messages: ExpoPushMessage[] = tokens.map((token) => ({
          to: token,
          sound: "default",
          title: "Purchase Confirmed!",
          body: `You bought the promotion '${offer_name}' from ${business_name}`,
          data: {
            type: "purchase_confirmed",
            offerId: offer_id,
            businessId: business_id
          },
          channelId: "purchases",
        }));

        try {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
          });

          const result = await response.json();
          console.log("Expo push response:", JSON.stringify(result, null, 2));

          // Log to notification_log table
          for (let i = 0; i < messages.length; i++) {
            const ticketData = result.data?.[i];
            const status = ticketData?.status === "ok" ? "sent" : "error";

            await supabase.from("notification_log").insert({
              user_id: consumer_user_id,
              notification_type: "purchase_confirmed",
              title: "Purchase Confirmed!",
              body: `You bought the promotion '${offer_name}' from ${business_name}`,
              data: { offerId: offer_id, businessId: business_id },
              expo_ticket_id: ticketData?.id || null,
              status,
              error_message: ticketData?.message || null,
              related_offer_id: offer_id,
              related_business_id: business_id,
            });
          }

          pushSent = true;
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }
      } else {
        console.log("No push tokens found for consumer");
      }
    } else {
      console.log("Consumer has push notifications disabled");
    }

    return new Response(
      JSON.stringify({
        success: true,
        consumer_notification: !consumerNotifError,
        business_notification: business?.owner_id && !businessError,
        push_sent: pushSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-purchase:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
