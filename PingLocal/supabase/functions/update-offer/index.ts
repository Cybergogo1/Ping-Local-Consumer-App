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
      "slot_name",
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
        let value = updateData[field];

        // Handle quantity field: empty string or null means unlimited (store as null)
        if (field === "quantity" && (value === "" || value === null || value === undefined)) {
          value = null;
        }

        cleanedData[field] = value;
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

    // Get current offer status before update (to detect status change to Signed Off)
    let previousStatus: string | null = null;
    let currentStartDate: string | null = null;
    if (cleanedData.status === "Signed Off") {
      const { data: currentOffer } = await supabaseClient
        .from("offers")
        .select("status, start_date")
        .eq("id", id)
        .single();
      previousStatus = currentOffer?.status || null;
      currentStartDate = currentOffer?.start_date || null;
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

    // Send push notification if offer just became Signed Off (was draft/pending before)
    if (data.status === "Signed Off" && previousStatus && previousStatus !== "Signed Off") {
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

        // Use the updated start_date if provided, otherwise use existing
        const startDateStr = cleanedData.start_date || data.start_date;
        let shouldSendNow = true;

        if (startDateStr) {
          const startDate = new Date(startDateStr);
          startDate.setHours(0, 0, 0, 0);

          if (startDate > today) {
            // Start date is in the future - schedule for that date
            shouldSendNow = false;

            // Store scheduled notification in database
            await supabaseClient.from("scheduled_notifications").insert({
              notification_type: "new_offer",
              payload: notificationPayload,
              scheduled_for: startDateStr,
              offer_id: data.id,
              business_id: data.business_id,
              status: "pending",
            });
            console.log(`Notification scheduled for ${startDateStr}`);
          }
        }

        if (shouldSendNow) {
          // Send notification directly (inline logic to avoid JWT issues with function-to-function calls)
          console.log("Sending new_offer notification inline...");

          // Get all users who favorited this business
          const { data: favorites, error: favError } = await supabaseClient
            .from("favorites")
            .select("user_id")
            .eq("business_id", data.business_id)
            .not("business_id", "is", null);

          if (favError) {
            console.error("Error fetching favorites:", favError);
          }

          let inAppUserIds: number[] = [];  // Integer IDs for notifications table
          let pushUserIds: string[] = [];   // Auth UUIDs for push tokens
          let tokens: string[] = [];

          if (favorites && favorites.length > 0) {
            // favorites.user_id is auth UUID, notifications.user_id expects integer
            // Use auth_id column to map from auth UUID to users.id (integer)
            const authUuids = favorites.map((f: { user_id: string }) => f.user_id);
            console.log("Auth UUIDs from favorites:", authUuids);

            // Get integer user IDs from users table using auth_id column
            const { data: usersData, error: usersError } = await supabaseClient
              .from("users")
              .select("id, auth_id, activate_notifications")
              .in("auth_id", authUuids);

            if (usersError) {
              console.error("Error fetching users:", usersError);
            }

            console.log("Users found:", JSON.stringify(usersData));

            if (usersData && usersData.length > 0) {
              // Get users with new_offers_from_favorites enabled (for in-app notifications)
              // notification_preferences uses auth UUID as user_id
              const { data: preferences } = await supabaseClient
                .from("notification_preferences")
                .select("user_id")
                .in("user_id", authUuids)
                .eq("new_offers_from_favorites", true);

              // If no preferences found, assume all users want notifications (default true)
              const enabledAuthUuids = preferences && preferences.length > 0
                ? preferences.map((p: { user_id: string }) => p.user_id)
                : authUuids;

              // Map to integer IDs for notifications table
              // Filter users whose auth_id is in the enabled list
              const enabledUsersData = usersData.filter((u: { auth_id: string }) =>
                enabledAuthUuids.includes(u.auth_id)
              );
              // Get integer IDs for in-app notifications
              inAppUserIds = enabledUsersData.map((u: { id: number }) => u.id);

              // For push notifications, filter users with activate_notifications = true
              const pushEnabledUsers = usersData.filter((u: { auth_id: string, activate_notifications: boolean }) =>
                u.activate_notifications === true && enabledAuthUuids.includes(u.auth_id)
              );
              // Get auth UUIDs for push token lookup (push_tokens uses auth UUID)
              const pushAuthUuids = pushEnabledUsers.map((u: { auth_id: string }) => u.auth_id);

              // Get push tokens for users with push enabled
              if (pushAuthUuids.length > 0) {
                const { data: pushTokens } = await supabaseClient
                  .from("push_tokens")
                  .select("expo_push_token, user_id")
                  .in("user_id", pushAuthUuids)
                  .eq("is_active", true);

                tokens = pushTokens?.map((t: { expo_push_token: string }) => t.expo_push_token) || [];
                pushUserIds = pushTokens?.map((t: { user_id: string }) => t.user_id) || [];
              }
            }
          }

          console.log(`Found ${inAppUserIds.length} in-app users, ${tokens.length} push tokens`);

          const title = `New from ${notificationPayload.business_name}`;
          const body = notificationPayload.offer_title || "Check out their latest offer!";

          // Create in-app notifications for all users who favorited (regardless of push settings)
          for (const userId of inAppUserIds) {
            console.log(`Creating in-app notification for user ${userId}...`);
            const { data: notifData, error: notifErr } = await supabaseClient
              .from("notifications")
              .insert({
                user_id: userId,
                name: title,
                content: body,
                read: false,
                notifications_categories: "offer",
                offer_id: data.id,
                business_id: data.business_id,
              })
              .select()
              .single();

            if (notifErr) {
              console.error(`Error creating notification for user ${userId}:`, JSON.stringify(notifErr));
            } else {
              console.log(`Notification created: ${JSON.stringify(notifData)}`);
            }
          }

          // Send push notifications via Expo
          if (tokens.length > 0) {
            const messages = tokens.map((token) => ({
              to: token,
              sound: "default",
              title,
              body,
              data: { type: "new_offer", offerId: notificationPayload.offer_id, businessId: notificationPayload.business_id },
              channelId: "offers",
            }));

            // Batch notifications (max 100 per request)
            for (let i = 0; i < messages.length; i += 100) {
              const batch = messages.slice(i, i + 100);
              try {
                const response = await fetch("https://exp.host/--/api/v2/push/send", {
                  method: "POST",
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(batch),
                });
                const result = await response.json();
                console.log("Expo push response:", JSON.stringify(result, null, 2));
              } catch (pushErr) {
                console.error("Error sending push batch:", pushErr);
              }
            }
          }

          console.log(`Notification sent: ${inAppUserIds.length} in-app, ${tokens.length} push`);
        }
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
