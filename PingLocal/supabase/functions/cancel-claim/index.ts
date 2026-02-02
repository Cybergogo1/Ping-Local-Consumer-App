import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExpoPushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId?: string;
}

/**
 * Cancel Claim Edge Function
 *
 * This function allows a business to cancel a claim (purchase_token) from Adalo.
 * It performs the same operations as the consumer app's cancellation service:
 *
 * 1. Sets cancelled: true on the purchase_token
 * 2. Decrements the offer's number_sold
 * 3. If slot-based, decrements the offer_slot's booked_count by the party size
 * 4. Sends a notification to the consumer (both in-app and push)
 *
 * Note: The booking_reminder_id notification cancellation is skipped since
 * that's a client-side Expo notification that can't be cancelled server-side.
 *
 * Request body:
 * {
 *   "purchase_token_id": number,  // Required: ID of the purchase token to cancel
 *   "reason": string              // Optional: Reason for cancellation to show the user
 * }
 *
 * Response:
 * {
 *   "data": { "cancelled": true, "purchase_token_id": number, "notification_sent": boolean } | null,
 *   "error": string | null
 * }
 */
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
    // Create Supabase client with service role for full access
    // Using service role since this is called from Adalo (server-to-server)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const body = await req.json();
    const { purchase_token_id, reason } = body;

    if (!purchase_token_id) {
      return new Response(
        JSON.stringify({ data: null, error: "purchase_token_id is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch the purchase token with user and offer info for notification
    const { data: purchaseToken, error: fetchError } = await supabaseClient
      .from("purchase_tokens")
      .select(`
        id,
        offer_id,
        offer_slot,
        quantity,
        redeemed,
        cancelled,
        user_id,
        offer_name,
        offers (
          id,
          name,
          business_id,
          businesses (
            id,
            name
          )
        )
      `)
      .eq("id", purchase_token_id)
      .single();

    if (fetchError || !purchaseToken) {
      return new Response(
        JSON.stringify({ data: null, error: "Purchase token not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Check if already redeemed or cancelled
    if (purchaseToken.redeemed) {
      return new Response(
        JSON.stringify({ data: null, error: "Cannot cancel: claim has already been redeemed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (purchaseToken.cancelled) {
      return new Response(
        JSON.stringify({ data: null, error: "Claim is already cancelled" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // 1. Cancel the purchase token
    const { error: cancelError } = await supabaseClient
      .from("purchase_tokens")
      .update({ cancelled: true })
      .eq("id", purchase_token_id);

    if (cancelError) {
      throw new Error(`Failed to cancel claim: ${cancelError.message}`);
    }

    // 2. Decrement number_sold on the offer
    if (purchaseToken.offer_id) {
      const { data: offer, error: offerFetchError } = await supabaseClient
        .from("offers")
        .select("number_sold")
        .eq("id", purchaseToken.offer_id)
        .single();

      if (!offerFetchError && offer) {
        const newNumberSold = Math.max(0, (offer.number_sold || 1) - 1);
        await supabaseClient
          .from("offers")
          .update({ number_sold: newNumberSold })
          .eq("id", purchaseToken.offer_id);
      }
    }

    // 3. If slot-based, decrement booked_count by party size
    if (purchaseToken.offer_slot) {
      const { data: slot, error: slotFetchError } = await supabaseClient
        .from("offer_slots")
        .select("booked_count")
        .eq("id", purchaseToken.offer_slot)
        .single();

      if (!slotFetchError && slot) {
        // Use stored quantity (party size), default to 1 for backwards compatibility
        const partySize = purchaseToken.quantity ?? 1;
        const newBookedCount = Math.max(0, (slot.booked_count || 1) - partySize);
        await supabaseClient
          .from("offer_slots")
          .update({ booked_count: newBookedCount })
          .eq("id", purchaseToken.offer_slot);
      }
    }

    // 4. Send notification to the consumer
    let notificationSent = false;

    if (purchaseToken.user_id) {
      // Get offer and business names for the notification
      const offerName = purchaseToken.offers?.name || purchaseToken.offer_name || "your offer";
      const businessName = purchaseToken.offers?.businesses?.name || "The business";
      const offerId = purchaseToken.offers?.id || purchaseToken.offer_id;
      const businessId = purchaseToken.offers?.business_id || purchaseToken.offers?.businesses?.id;

      // Build notification content
      const title = "Booking Cancelled";
      const notificationBody = reason
        ? `${businessName} has cancelled your booking for the promotion '${offerName}'. Reason: ${reason}`
        : `${businessName} has cancelled your booking for the promotion '${offerName}'.`;

      const notificationData = {
        type: "claim_cancelled",
        offerId: offerId,
        businessId: businessId,
        purchaseTokenId: purchase_token_id,
      };

      // Create in-app notification
      try {
        await supabaseClient.from("notifications").insert({
          user_id: purchaseToken.user_id,
          name: title,
          content: notificationBody,
          read: false,
          notifications_categories: "offer",
          offer_id: offerId || null,
          business_id: businessId || null,
        });
        notificationSent = true;
      } catch (notifError) {
        console.error("Error creating in-app notification:", notifError);
      }

      // Get user's auth_id for push token lookup
      const { data: userData } = await supabaseClient
        .from("users")
        .select("auth_id, activate_notifications")
        .eq("id", purchaseToken.user_id)
        .single();

      // Send push notification if user has it enabled
      if (userData?.auth_id && userData?.activate_notifications) {
        const { data: pushTokens } = await supabaseClient
          .from("push_tokens")
          .select("expo_push_token")
          .eq("user_id", userData.auth_id)
          .eq("is_active", true);

        if (pushTokens && pushTokens.length > 0) {
          const messages: ExpoPushMessage[] = pushTokens.map((t) => ({
            to: t.expo_push_token,
            sound: "default",
            title,
            body: notificationBody,
            data: notificationData,
            channelId: "offers",
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
            for (const ticketData of result.data || []) {
              await supabaseClient.from("notification_log").insert({
                user_id: String(purchaseToken.user_id),
                notification_type: "claim_cancelled",
                title,
                body: notificationBody,
                data: notificationData,
                expo_ticket_id: ticketData?.id || null,
                status: ticketData?.status === "ok" ? "sent" : "error",
                error_message: ticketData?.message || null,
                related_offer_id: offerId ? String(offerId) : null,
                related_business_id: businessId ? String(businessId) : null,
              });
            }
          } catch (pushError) {
            console.error("Error sending push notification:", pushError);
          }
        }
      }
    }

    // 5. Send cancellation email to the consumer
    let emailSent = false;
    if (purchaseToken.user_id) {
      try {
        const offerName = purchaseToken.offers?.name || purchaseToken.offer_name || "your offer";
        const businessName = purchaseToken.offers?.businesses?.name || "The business";

        // Get user email and name for the email
        const { data: userForEmail } = await supabaseClient
          .from("users")
          .select("email, first_name, auth_id")
          .eq("id", purchaseToken.user_id)
          .single();

        if (userForEmail?.email) {
          const emailResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "cancellation_by_business",
                user_id: String(purchaseToken.user_id),
                user_email: userForEmail.email,
                user_first_name: userForEmail.first_name,
                user_auth_id: userForEmail.auth_id,
                offer_name: offerName,
                business_name: businessName,
                cancellation_reason: reason,
              }),
            }
          );
          const emailResult = await emailResponse.json();
          if (!emailResponse.ok) {
            console.error("Cancellation email send failed:", emailResult);
          } else {
            emailSent = true;
            console.log("Cancellation email sent to consumer:", emailResult);
          }
        }
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          cancelled: true,
          purchase_token_id: purchase_token_id,
          notification_sent: notificationSent,
          email_sent: emailSent,
        },
        error: null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ data: null, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
