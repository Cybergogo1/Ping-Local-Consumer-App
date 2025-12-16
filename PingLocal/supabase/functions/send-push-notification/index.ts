import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface NotificationPayload {
  type: "new_offer" | "offer_expiring" | "redemption_reminder" | "loyalty_upgrade" | "loyalty_points_earned" | "offer_claimed";
  business_id?: string;
  business_name?: string;
  offer_id?: string;
  offer_title?: string;
  user_id?: string;
  claim_id?: string;
  new_tier?: string;
  points_earned?: number;
  reason?: string;
  purchase_type?: string; // 'claim' or 'purchase'
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
          .from("favorites")
          .select("user_id")
          .eq("business_id", payload.business_id)
          .not("business_id", "is", null);

        if (favError) {
          console.error("Error fetching favorites:", favError);
        }

        if (favorites && favorites.length > 0) {
          // favorites.user_id is auth UUID
          const authUuids = favorites.map((f: { user_id: string }) => f.user_id);

          // Get users with new_offers_from_favorites enabled
          const { data: preferences, error: prefError } = await supabase
            .from("notification_preferences")
            .select("user_id")
            .in("user_id", authUuids)
            .eq("new_offers_from_favorites", true);

          if (prefError) {
            console.error("Error fetching preferences:", prefError);
          }

          // If no preferences found, assume all users want notifications (default true)
          const enabledAuthUuids = preferences && preferences.length > 0
            ? preferences.map((p: { user_id: string }) => p.user_id)
            : authUuids;

          // Get integer user IDs using auth_id column for notifications table
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, auth_id, activate_notifications")
            .in("auth_id", enabledAuthUuids);

          if (usersError) {
            console.error("Error fetching users:", usersError);
          }

          // Map auth UUIDs to integer IDs for in-app notifications
          const userIdMap = new Map<string, number>();
          if (usersData) {
            for (const u of usersData) {
              if (u.auth_id) {
                userIdMap.set(u.auth_id, u.id);
              }
            }
          }

          // targetUserIds stores integer IDs for notification inserts
          targetUserIds = usersData?.map((u: { id: number }) => String(u.id)) || [];

          // For push notifications, filter users with activate_notifications = true
          const pushEnabledUsers = usersData?.filter((u: { activate_notifications: boolean }) =>
            u.activate_notifications === true
          ) || [];
          const pushAuthUuids = pushEnabledUsers.map((u: { auth_id: string }) => u.auth_id);

          // Get push tokens for these users (push_tokens uses auth UUID)
          if (pushAuthUuids.length > 0) {
            const { data: pushTokens, error: tokenError } = await supabase
              .from("push_tokens")
              .select("expo_push_token, user_id")
              .in("user_id", pushAuthUuids)
              .eq("is_active", true);

            if (tokenError) {
              console.error("Error fetching push tokens:", tokenError);
            }

            tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
          }
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
          // Always add to targetUserIds for in-app notification
          targetUserIds = [payload.user_id];

          // Check user's preference for push notifications
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
          // Always add to targetUserIds for in-app notification
          targetUserIds = [payload.user_id];

          // Check user's preference for push notifications
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
          }
        }

        title = "Congratulations!";
        body = `You've reached ${payload.new_tier || "a new"} status!`;
        data = { type: "loyalty_upgrade", newTier: payload.new_tier };
        break;
      }

      case "loyalty_points_earned": {
        if (payload.user_id) {
          // Always add to targetUserIds for in-app notification
          targetUserIds = [payload.user_id];

          // Check user's preference for push notifications
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
          }
        }

        const points = payload.points_earned || 0;
        title = "Loyalty Points Earned!";

        // Customize body based on reason
        if (payload.reason === "purchase") {
          body = `You earned ${points} loyalty points for your purchase!`;
        } else if (payload.reason === "redemption") {
          body = `You earned ${points} loyalty points for redeeming your offer!`;
        } else if (payload.reason === "admin") {
          body = `You've been awarded ${points} loyalty points!`;
        } else {
          body = `You earned ${points} loyalty points!`;
        }

        data = { type: "loyalty_points_earned", points: points, reason: payload.reason };
        break;
      }

      case "offer_claimed": {
        // Single user notification when they claim/purchase an offer
        if (payload.user_id) {
          targetUserIds = [payload.user_id];

          const { data: pushTokens } = await supabase
            .from("push_tokens")
            .select("expo_push_token")
            .eq("user_id", payload.user_id)
            .eq("is_active", true);

          tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
        }

        const isPurchase = payload.purchase_type === "purchase";
        title = isPurchase ? "Purchase Confirmed!" : "Offer Claimed!";
        body = isPurchase
          ? `You've purchased ${payload.offer_title || "an offer"} from ${payload.business_name || "a business"}. Show your QR code to redeem!`
          : `You've claimed ${payload.offer_title || "an offer"} from ${payload.business_name || "a business"}. Show your QR code to redeem!`;
        data = { type: "offer_claimed", offerId: payload.offer_id, businessId: payload.business_id, claimId: payload.claim_id };
        channelId = "offers";
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

    console.log(`Found ${tokens.length} tokens to send to, ${targetUserIds.length} target users`);

    // Map notification types to categories for the notifications table
    const categoryMap: Record<string, string> = {
      new_offer: "offer",
      offer_expiring: "offer",
      offer_claimed: "offer",
      redemption_reminder: "redemption",
      loyalty_upgrade: "loyalty",
      loyalty_points_earned: "points",
    };

    // ALWAYS create entries in the notifications table for all target users
    // This ensures notifications appear in-app even if push fails
    let notificationsCreated = 0;
    for (const userId of targetUserIds) {
      try {
        await supabase.from("notifications").insert({
          user_id: userId,
          name: title,
          content: body,
          read: false,
          notifications_categories: categoryMap[payload.type] || "system",
          offer_id: payload.offer_id ? parseInt(payload.offer_id) : null,
          business_id: payload.business_id ? parseInt(payload.business_id) : null,
        });
        notificationsCreated++;
      } catch (notifError) {
        console.error(`Error creating notification for user ${userId}:`, notifError);
      }
    }

    console.log(`Created ${notificationsCreated} notification entries`);

    // Send push notifications via Expo Push API (separate from in-app notifications)
    let totalSent = 0;
    let totalErrors = 0;

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

          // Log each push attempt
          for (let i = 0; i < batch.length; i++) {
            const ticketData = result.data?.[i];
            const status = ticketData?.status === "ok" ? "sent" : "error";
            const userId = targetUserIds[i];

            if (status === "sent") {
              totalSent++;
            } else {
              totalErrors++;
            }

            // Log to notification_log table (for debugging/analytics)
            await supabase.from("notification_log").insert({
              user_id: userId || null,
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notificationsCreated,
        push_sent: totalSent,
        push_errors: totalErrors,
        total_tokens: tokens.length,
        total_users: targetUserIds.length
      }),
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
