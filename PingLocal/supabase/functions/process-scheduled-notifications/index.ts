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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Processing scheduled notifications for ${todayStr}`);

    // Get all pending notifications scheduled for today or earlier
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", todayStr);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${scheduledNotifications?.length || 0} notifications to process`);

    let sentCount = 0;
    let errorCount = 0;

    for (const notification of scheduledNotifications || []) {
      try {
        // Check if the offer still exists and is still Signed Off
        const { data: offer } = await supabase
          .from("offers")
          .select("id, status")
          .eq("id", notification.offer_id)
          .single();

        if (!offer || offer.status !== "Signed Off") {
          // Offer was deleted or status changed - cancel the notification
          await supabase
            .from("scheduled_notifications")
            .update({ status: "cancelled", updated: new Date().toISOString() })
            .eq("id", notification.id);
          console.log(`Notification ${notification.id} cancelled - offer no longer valid`);
          continue;
        }

        // Send the notification
        const notificationResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify(notification.payload),
          }
        );

        const result = await notificationResponse.json();
        console.log(`Notification ${notification.id} result:`, result);

        // Mark as sent
        await supabase
          .from("scheduled_notifications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            updated: new Date().toISOString(),
          })
          .eq("id", notification.id);

        sentCount++;
      } catch (notifError) {
        console.error(`Error processing notification ${notification.id}:`, notifError);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        processed: scheduledNotifications?.length || 0,
        sent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing scheduled notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
