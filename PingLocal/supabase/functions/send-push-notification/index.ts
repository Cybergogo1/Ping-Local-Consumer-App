import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationPayload {
  type: "new_offer" | "offer_expiring" | "redemption_reminder" | "loyalty_upgrade";
  business_id?: string;
  business_name?: string;
  offer_id?: string;
  offer_title?: string;
  user_id?: string;
  claim_id?: string;
  new_tier?: string;
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

    const payload: NotificationPayload = await req.json();
    console.log("Received notification payload:", JSON.stringify(payload, null, 2));

    let tokens: string[] = [];
    let title = "";
    let body = "";
    let data: Record<string, unknown> = {};
    let channelId = "default";
    let targetUserIds: string[] = [];

    switch (payload.type) {
      case "new_offer": {
        // Get all users who favorited this business
        const { data: favorites, error: favError } = await supabase
          .from("user_favorites")
          .select("user_id")
          .eq("business_id", payload.business_id)
          .eq("is_business", true);

        if (favError) {
          console.error("Error fetching favorites:", favError);
        }

        if (favorites && favorites.length > 0) {
          const userIds = favorites.map((f: { user_id: string }) => f.user_id);

          // Get users with new_offers_from_favorites enabled
          const { data: preferences, error: prefError } = await supabase
            .from("notification_preferences")
            .select("user_id")
            .in("user_id", userIds)
            .eq("new_offers_from_favorites", true);

          if (prefError) {
            console.error("Error fetching preferences:", prefError);
          }

          // If no preferences found, assume all users want notifications (default true)
          const enabledUserIds = preferences && preferences.length > 0
            ? preferences.map((p: { user_id: string }) => p.user_id)
            : userIds;

          targetUserIds = enabledUserIds;

          // Also check global push notification setting on users table
          const { data: usersWithPushEnabled, error: usersError } = await supabase
            .from("users")
            .select("id")
            .in("id", enabledUserIds)
            .eq("activate_notifications", true);

          if (usersError) {
            console.error("Error fetching users:", usersError);
          }

          const finalUserIds = usersWithPushEnabled
            ? usersWithPushEnabled.map((u: { id: string }) => u.id)
            : enabledUserIds;

          // Get push tokens for these users
          const { data: pushTokens, error: tokenError } = await supabase
            .from("push_tokens")
            .select("expo_push_token, user_id")
            .in("user_id", finalUserIds)
            .eq("is_active", true);

          if (tokenError) {
            console.error("Error fetching push tokens:", tokenError);
          }

          tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
          targetUserIds = pushTokens?.map((t: { user_id: string }) => t.user_id) || [];
        }

        title = `New from ${payload.business_name || "a business you follow"}`;
        body = payload.offer_title || "Check out their latest offer!";
        data = { type: "new_offer", offerId: payload.offer_id, businessId: payload.business_id };
        channelId = "offers";
        break;
      }

      case "offer_expiring": {
        // Get users who claimed but haven't redeemed
        const { data: claims, error: claimsError } = await supabase
          .from("claimed_offers")
          .select("user_id")
          .eq("offer_id", payload.offer_id)
          .eq("status", "claimed");

        if (claimsError) {
          console.error("Error fetching claims:", claimsError);
        }

        if (claims && claims.length > 0) {
          const claimUserIds = claims.map((c: { user_id: string }) => c.user_id);

          // Check notification preferences
          const { data: preferences } = await supabase
            .from("notification_preferences")
            .select("user_id")
            .in("user_id", claimUserIds)
            .eq("offer_expiring_soon", true);

          const enabledUserIds = preferences && preferences.length > 0
            ? preferences.map((p: { user_id: string }) => p.user_id)
            : claimUserIds;

          const { data: pushTokens } = await supabase
            .from("push_tokens")
            .select("expo_push_token, user_id")
            .in("user_id", enabledUserIds)
            .eq("is_active", true);

          tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
          targetUserIds = pushTokens?.map((t: { user_id: string }) => t.user_id) || [];
        }

        title = "Offer Expiring Soon";
        body = `${payload.offer_title || "An offer you claimed"} expires tomorrow!`;
        data = { type: "offer_expiring", offerId: payload.offer_id };
        channelId = "reminders";
        break;
      }

      case "redemption_reminder": {
        // Single user notification
        if (payload.user_id) {
          // Check user's preference
          const { data: preferences } = await supabase
            .from("notification_preferences")
            .select("redemption_reminders")
            .eq("user_id", payload.user_id)
            .single();

          // Default to true if no preference found
          const wantsReminders = preferences?.redemption_reminders !== false;

          if (wantsReminders) {
            const { data: pushTokens } = await supabase
              .from("push_tokens")
              .select("expo_push_token")
              .eq("user_id", payload.user_id)
              .eq("is_active", true);

            tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
            targetUserIds = [payload.user_id];
          }
        }

        title = "Redemption Reminder";
        body = `Don't forget to redeem your ${payload.offer_title || "offer"}!`;
        data = { type: "redemption_reminder", claimId: payload.claim_id, offerId: payload.offer_id };
        channelId = "reminders";
        break;
      }

      case "loyalty_upgrade": {
        if (payload.user_id) {
          // Check user's preference
          const { data: preferences } = await supabase
            .from("notification_preferences")
            .select("loyalty_updates")
            .eq("user_id", payload.user_id)
            .single();

          const wantsUpdates = preferences?.loyalty_updates !== false;

          if (wantsUpdates) {
            const { data: pushTokens } = await supabase
              .from("push_tokens")
              .select("expo_push_token")
              .eq("user_id", payload.user_id)
              .eq("is_active", true);

            tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
            targetUserIds = [payload.user_id];
          }
        }

        title = "Congratulations!";
        body = `You've reached ${payload.new_tier || "a new"} status!`;
        data = { type: "loyalty_upgrade", newTier: payload.new_tier };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }

    console.log(`Found ${tokens.length} tokens to send to`);

    // Send notifications via Expo Push API
    if (tokens.length > 0) {
      const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        sound: "default",
        title,
        body,
        data,
        channelId,
      }));

      // Batch notifications (Expo recommends max 100 per request)
      const batches: ExpoPushMessage[][] = [];
      for (let i = 0; i < messages.length; i += 100) {
        batches.push(messages.slice(i, i + 100));
      }

      let totalSent = 0;
      let totalErrors = 0;

      for (const batch of batches) {
        try {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(batch),
          });

          const result = await response.json();
          console.log("Expo push response:", JSON.stringify(result, null, 2));

          // Log each notification
          for (let i = 0; i < batch.length; i++) {
            const ticketData = result.data?.[i];
            const status = ticketData?.status === "ok" ? "sent" : "error";

            if (status === "sent") {
              totalSent++;
            } else {
              totalErrors++;
            }

            // Log to notification_log table
            await supabase.from("notification_log").insert({
              user_id: targetUserIds[i] || null,
              notification_type: payload.type,
              title,
              body,
              data,
              expo_ticket_id: ticketData?.id || null,
              status,
              error_message: ticketData?.message || null,
              related_offer_id: payload.offer_id || null,
              related_business_id: payload.business_id || null,
            });
          }
        } catch (batchError) {
          console.error("Error sending batch:", batchError);
          totalErrors += batch.length;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          sent: totalSent,
          errors: totalErrors,
          total_tokens: tokens.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent: 0, message: "No tokens to send to" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
