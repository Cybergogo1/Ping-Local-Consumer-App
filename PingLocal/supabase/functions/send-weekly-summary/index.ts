// supabase/functions/send-weekly-summary/index.ts
// Cron-triggered weekly email digest
// Sends a summary of the past week's activity to users who opted in (weekly_digest = true)
// Schedule: Every Monday at 8:00 AM UTC via pg_cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    console.log(`Processing weekly summaries. Period: ${oneWeekAgoStr} to ${now.toISOString()}`);

    // 1. Get all users who opted in to weekly_digest
    const { data: optedInPrefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("weekly_digest", true);

    if (prefsError) {
      throw new Error(`Error fetching preferences: ${prefsError.message}`);
    }

    if (!optedInPrefs || optedInPrefs.length === 0) {
      console.log("No users opted in to weekly digest");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No opted-in users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${optedInPrefs.length} users opted in to weekly digest`);

    // Get auth UUIDs for these users
    const authUuids = optedInPrefs.map((p) => p.user_id);

    // 2. Get user details (integer ID, email, name, auth_id)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, first_name, auth_id")
      .in("auth_id", authUuids);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log("No matching users found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No matching users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // 3. Aggregate data for each user

        // New offers from favorites (businesses they follow)
        const { data: userFavorites } = await supabase
          .from("favorites")
          .select("business_id")
          .eq("user_id", user.auth_id)
          .not("business_id", "is", null);

        const favBusinessIds = userFavorites?.map((f) => f.business_id).filter(Boolean) || [];

        let newOffers: Array<{ name: string; business_name: string; offer_id: number }> = [];
        if (favBusinessIds.length > 0) {
          const { data: offers } = await supabase
            .from("offers")
            .select("id, name, business_name")
            .in("business_id", favBusinessIds)
            .eq("status", "Signed Off")
            .gte("created", oneWeekAgoStr)
            .limit(10);

          newOffers = (offers || []).map((o) => ({
            name: o.name,
            business_name: o.business_name || "A local business",
            offer_id: o.id,
          }));
        }

        // Purchases made this week
        const { data: purchases } = await supabase
          .from("purchase_tokens")
          .select("offer_name, customer_price, business_id")
          .eq("user_id", user.id)
          .eq("cancelled", false)
          .gte("created", oneWeekAgoStr);

        const purchaseData = [];
        if (purchases && purchases.length > 0) {
          // Get business names for purchases
          const bizIds = [...new Set(purchases.map((p) => p.business_id).filter(Boolean))];
          let bizMap: Record<number, string> = {};
          if (bizIds.length > 0) {
            const { data: businesses } = await supabase
              .from("businesses")
              .select("id, name")
              .in("id", bizIds);
            bizMap = (businesses || []).reduce((acc, b) => {
              acc[b.id] = b.name;
              return acc;
            }, {} as Record<number, string>);
          }

          for (const p of purchases) {
            purchaseData.push({
              offer_name: p.offer_name || "An offer",
              business_name: bizMap[p.business_id] || "A business",
              amount: p.customer_price,
            });
          }
        }

        // Points earned this week
        const { data: pointsRecords } = await supabase
          .from("loyalty_points")
          .select("amount")
          .eq("user_id", user.id)
          .gte("created", oneWeekAgoStr);

        const totalPointsEarned = (pointsRecords || []).reduce(
          (sum, r) => sum + (r.amount || 0),
          0
        );

        // Upcoming bookings (next 7 days)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const { data: upcomingBookings } = await supabase
          .from("purchase_tokens")
          .select("offer_name, business_id, booking_date")
          .eq("user_id", user.id)
          .eq("cancelled", false)
          .eq("redeemed", false)
          .not("booking_date", "is", null)
          .gte("booking_date", now.toISOString())
          .lte("booking_date", nextWeek.toISOString())
          .limit(5);

        const bookingData = [];
        if (upcomingBookings && upcomingBookings.length > 0) {
          const bizIds = [...new Set(upcomingBookings.map((b) => b.business_id).filter(Boolean))];
          let bizMap: Record<number, string> = {};
          if (bizIds.length > 0) {
            const { data: businesses } = await supabase
              .from("businesses")
              .select("id, name")
              .in("id", bizIds);
            bizMap = (businesses || []).reduce((acc, b) => {
              acc[b.id] = b.name;
              return acc;
            }, {} as Record<number, string>);
          }

          for (const b of upcomingBookings) {
            bookingData.push({
              offer_name: b.offer_name || "An offer",
              business_name: bizMap[b.business_id] || "A business",
              booking_date: b.booking_date
                ? new Date(b.booking_date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "Soon",
            });
          }
        }

        // 4. Send email via send-email function
        await supabase.functions.invoke("send-email", {
          body: {
            type: "weekly_summary",
            user_id: String(user.id),
            user_email: user.email,
            user_first_name: user.first_name,
            user_auth_id: user.auth_id,
            summary_data: {
              new_offers: newOffers,
              purchases: purchaseData,
              points_earned: totalPointsEarned,
              upcoming_bookings: bookingData,
            },
          },
        });

        sentCount++;
        console.log(`Weekly summary sent to user ${user.id} (${user.email})`);
      } catch (userError) {
        console.error(`Error processing weekly summary for user ${user.id}:`, userError);
        errorCount++;
      }
    }

    console.log(`Weekly summary complete. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_users: users.length,
        sent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-weekly-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
