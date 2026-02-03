// supabase/functions/send-email/index.ts
// Centralized email sending function using Resend API
// Called by other edge functions or database triggers/webhooks
// Handles all email types with HTML templates and preference checks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "PingLocal <noreply@app.pinglocal.co.uk>";
const BASE_URL = "https://app.pinglocal.co.uk";

// =====================================================
// Types
// =====================================================

type EmailType =
  | "welcome"
  | "verification_success"
  | "new_offer_from_favorite"
  | "purchase_confirmation"
  | "cancellation_by_business"
  | "cancellation_by_user"
  | "booking_reminder"
  | "redemption_complete"
  | "weekly_summary"
  | "business_new_claim"
  | "business_signed_off"
  | "offer_rejected"
  | "offer_signed_off"
  | "business_stripe_connected"
  | "admin_new_business"
  | "admin_offer_ready_for_review"
  | "business_application_received"
  | "business_redemption_complete";

interface EmailPayload {
  type: EmailType;
  // User identification (at least one required)
  user_id?: string | number;
  user_email?: string;
  user_first_name?: string;
  user_auth_id?: string;
  // Context fields
  offer_name?: string;
  business_name?: string;
  offer_id?: string | number;
  business_id?: string | number;
  amount?: number;
  booking_date?: string;
  booking_time?: string;
  cancellation_reason?: string;
  points_earned?: number;
  new_points_total?: number;
  purchase_type?: string;
  consumer_name?: string;
  rejection_reason?: string;
  // Direct recipient email (bypasses user_id lookup, used for business emails)
  // Can be a single email or comma-separated list for group notifications
  recipient_email?: string;
  // Weekly summary pre-aggregated data
  summary_data?: WeeklySummaryData;
  // Database webhook payload (when triggered by DB webhook)
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface WeeklySummaryData {
  new_offers: Array<{
    name: string;
    business_name: string;
    offer_id: number;
  }>;
  purchases: Array<{
    offer_name: string;
    business_name: string;
    amount: number | null;
  }>;
  points_earned: number;
  upcoming_bookings: Array<{
    offer_name: string;
    business_name: string;
    booking_date: string;
  }>;
}

// =====================================================
// Email preference mapping
// =====================================================

// Maps email types to the notification_preferences column that gates them
// null = always send (transactional)
const PREFERENCE_MAP: Record<EmailType, string | null> = {
  welcome: null,
  verification_success: null,
  new_offer_from_favorite: "new_offers_from_favorites",
  purchase_confirmation: null,
  cancellation_by_business: null,
  cancellation_by_user: null,
  booking_reminder: "redemption_reminders",
  redemption_complete: null,
  weekly_summary: "weekly_digest",
};

// =====================================================
// HTML Templates
// =====================================================

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PingLocal</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <div style="background-color:#1a3a4a;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">PingLocal</h1>
    </div>
    <!-- Content -->
    <div style="padding:32px 24px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="background-color:#f5f5f5;padding:20px 24px;text-align:center;font-size:12px;color:#888888;border-top:1px solid #eeeeee;">
      <p style="margin:0 0 8px;">PingLocal - Discover amazing local offers</p>
      <p style="margin:0;color:#aaaaaa;">You received this email because you have a PingLocal account.</p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0 8px;">
    <a href="${url}" style="display:inline-block;background-color:#1a3a4a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">${text}</a>
  </div>`;
}

function welcomeTemplate(firstName: string): { subject: string; html: string } {
  const name = firstName || "there";
  return {
    subject: "Welcome to PingLocal!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Welcome, ${name}!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Thanks for joining PingLocal. You're now part of a community that discovers the best local offers and promotions.
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Here's what you can do:
      </p>
      <ul style="margin:0 0 24px;padding-left:20px;color:#333333;font-size:16px;line-height:1.8;">
        <li>Browse offers from local businesses</li>
        <li>Follow your favourite businesses to get notified of new offers</li>
        <li>Claim and redeem promotions</li>
        <li>Earn loyalty points with every redemption</li>
      </ul>
      ${ctaButton("Start Exploring", `${BASE_URL}/`)}
    `),
  };
}

function verificationSuccessTemplate(firstName: string): {
  subject: string;
  html: string;
} {
  const name = firstName || "there";
  return {
    subject: "Email Verified - You're All Set!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">You're verified, ${name}!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Your email has been successfully verified. Your account is now fully set up and ready to go.
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        You can now claim offers, make purchases, and earn loyalty points.
      </p>
      ${ctaButton("Start Exploring", `${BASE_URL}/`)}
    `),
  };
}

function newOfferFromFavoriteTemplate(
  firstName: string,
  offerName: string,
  businessName: string,
  offerId?: string | number
): { subject: string; html: string } {
  const name = firstName || "there";
  return {
    subject: `New offer from ${businessName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">New Offer Alert!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, <strong>${businessName}</strong> just launched a new offer:
      </p>
      <div style="background-color:#f0f7fa;border-left:4px solid #1a3a4a;padding:16px;margin:0 0 24px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#1a3a4a;font-size:18px;font-weight:600;">${offerName}</p>
      </div>
      ${ctaButton("View Offer", offerId ? `${BASE_URL}/offer/${offerId}` : `${BASE_URL}/`)}
    `),
  };
}

function purchaseConfirmationTemplate(
  firstName: string,
  offerName: string,
  businessName: string,
  amount: number | null,
  bookingDate?: string,
  bookingTime?: string,
  purchaseType?: string
): { subject: string; html: string } {
  const name = firstName || "there";
  const amountDisplay =
    amount != null ? `&pound;${amount.toFixed(2)}` : "Pay on the day";
  const isPurchase = purchaseType === "Pay up front";

  let bookingSection = "";
  if (bookingDate || bookingTime) {
    const parts = [];
    if (bookingDate) parts.push(bookingDate);
    if (bookingTime) parts.push(`at ${bookingTime}`);
    bookingSection = `
      <tr>
        <td style="padding:8px 0;color:#666666;font-size:14px;">Booking</td>
        <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${parts.join(" ")}</td>
      </tr>`;
  }

  return {
    subject: isPurchase
      ? `Purchase Confirmed - ${offerName}`
      : `Offer Claimed - ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">${isPurchase ? "Purchase" : "Claim"} Confirmed!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, you've successfully ${isPurchase ? "purchased" : "claimed"} an offer.
      </p>
      <div style="background-color:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${offerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Business</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Amount</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${amountDisplay}</td>
          </tr>
          ${bookingSection}
        </table>
      </div>
      ${ctaButton("View My Claims", `${BASE_URL}/claimed`)}
    `),
  };
}

function cancellationByBusinessTemplate(
  firstName: string,
  offerName: string,
  businessName: string,
  reason?: string
): { subject: string; html: string } {
  const name = firstName || "there";
  const reasonSection = reason
    ? `<p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;"><strong>Reason:</strong> ${reason}</p>`
    : "";

  return {
    subject: `Booking Cancelled - ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#c0392b;font-size:22px;">Booking Cancelled</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, unfortunately <strong>${businessName}</strong> has cancelled your booking for:
      </p>
      <div style="background-color:#fdf0ef;border-left:4px solid #c0392b;padding:16px;margin:0 0 16px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#333333;font-size:18px;font-weight:600;">${offerName}</p>
      </div>
      ${reasonSection}
      ${ctaButton("Browse Offers", `${BASE_URL}/`)}
    `),
  };
}

function cancellationByUserTemplate(
  firstName: string,
  offerName: string
): { subject: string; html: string } {
  const name = firstName || "there";
  return {
    subject: `Booking Cancelled - ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Booking Cancelled</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, your booking for the following offer has been cancelled:
      </p>
      <div style="background-color:#f0f7fa;border-left:4px solid #1a3a4a;padding:16px;margin:0 0 24px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#1a3a4a;font-size:18px;font-weight:600;">${offerName}</p>
      </div>
      ${ctaButton("Browse Offers", `${BASE_URL}/`)}
    `),
  };
}

function bookingReminderTemplate(
  firstName: string,
  offerName: string,
  businessName: string,
  bookingDate?: string,
  offerId?: string | number
): { subject: string; html: string } {
  const name = firstName || "there";
  const dateDisplay = bookingDate || "soon";

  return {
    subject: `Reminder: Your booking at ${businessName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Booking Reminder</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, just a reminder that your booking is coming up:
      </p>
      <div style="background-color:#f0f7fa;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${offerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Business</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Date</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${dateDisplay}</td>
          </tr>
        </table>
      </div>
      ${ctaButton("View My Claims", `${BASE_URL}/claimed`)}
    `),
  };
}

function redemptionCompleteTemplate(
  firstName: string,
  offerName: string,
  amount: number | null,
  pointsEarned: number,
  newPointsTotal: number
): { subject: string; html: string } {
  const name = firstName || "there";

  let amountRow = "";
  if (amount != null) {
    amountRow = `
      <tr>
        <td style="padding:8px 0;color:#666666;font-size:14px;">Bill Amount</td>
        <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">&pound;${amount.toFixed(2)}</td>
      </tr>`;
  }

  return {
    subject: `Redemption Complete - ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#27ae60;font-size:22px;">Redemption Complete!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, you've successfully redeemed your offer. Here's a summary:
      </p>
      <div style="background-color:#f0faf4;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${offerName}</td>
          </tr>
          ${amountRow}
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Points Earned</td>
            <td style="padding:8px 0;color:#27ae60;font-size:14px;text-align:right;font-weight:600;">+${pointsEarned}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Total Points</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${newPointsTotal}</td>
          </tr>
        </table>
      </div>
      ${ctaButton("View My Account", `${BASE_URL}/account`)}
    `),
  };
}

function weeklySummaryTemplate(
  firstName: string,
  data: WeeklySummaryData
): { subject: string; html: string } {
  const name = firstName || "there";

  let offersSection = "";
  if (data.new_offers.length > 0) {
    const offerItems = data.new_offers
      .slice(0, 5)
      .map(
        (o) =>
          `<li style="margin:0 0 8px;color:#333333;font-size:14px;line-height:1.5;"><strong>${o.name}</strong> from ${o.business_name}</li>`
      )
      .join("");
    const moreText =
      data.new_offers.length > 5
        ? `<p style="margin:0;color:#888888;font-size:13px;">...and ${data.new_offers.length - 5} more</p>`
        : "";
    offersSection = `
      <h3 style="margin:0 0 12px;color:#1a3a4a;font-size:16px;">New Offers from Your Favourites</h3>
      <ul style="margin:0 0 8px;padding-left:20px;">${offerItems}</ul>
      ${moreText}
    `;
  }

  let purchasesSection = "";
  if (data.purchases.length > 0) {
    const purchaseItems = data.purchases
      .map(
        (p) =>
          `<li style="margin:0 0 8px;color:#333333;font-size:14px;line-height:1.5;"><strong>${p.offer_name}</strong> from ${p.business_name}</li>`
      )
      .join("");
    purchasesSection = `
      <h3 style="margin:0 0 12px;color:#1a3a4a;font-size:16px;">Your Purchases This Week</h3>
      <ul style="margin:0 0 8px;padding-left:20px;">${purchaseItems}</ul>
    `;
  }

  let bookingsSection = "";
  if (data.upcoming_bookings.length > 0) {
    const bookingItems = data.upcoming_bookings
      .map(
        (b) =>
          `<li style="margin:0 0 8px;color:#333333;font-size:14px;line-height:1.5;"><strong>${b.offer_name}</strong> at ${b.business_name} - ${b.booking_date}</li>`
      )
      .join("");
    bookingsSection = `
      <h3 style="margin:0 0 12px;color:#1a3a4a;font-size:16px;">Upcoming Bookings</h3>
      <ul style="margin:0 0 8px;padding-left:20px;">${bookingItems}</ul>
    `;
  }

  const pointsSection =
    data.points_earned > 0
      ? `<p style="margin:0 0 16px;color:#27ae60;font-size:16px;font-weight:600;">You earned ${data.points_earned} loyalty points this week!</p>`
      : "";

  const hasContent =
    data.new_offers.length > 0 ||
    data.purchases.length > 0 ||
    data.upcoming_bookings.length > 0 ||
    data.points_earned > 0;

  const emptyState = !hasContent
    ? `<p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">It's been a quiet week. Check out the app for the latest local offers!</p>`
    : "";

  return {
    subject: "Your Weekly PingLocal Summary",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Your Week in Review</h2>
      <p style="margin:0 0 24px;color:#333333;font-size:16px;line-height:1.5;">
        Hi ${name}, here's what happened this week on PingLocal:
      </p>
      ${emptyState}
      ${pointsSection}
      ${offersSection}
      ${purchasesSection}
      ${bookingsSection}
      ${ctaButton("Open PingLocal", `${BASE_URL}/`)}
    `),
  };
}

function businessNewClaimTemplate(
  consumerName: string,
  offerName: string,
  businessName: string,
  amount: number | null,
  bookingDate?: string,
  bookingTime?: string,
  purchaseType?: string
): { subject: string; html: string } {
  const amountDisplay = amount ? `£${amount.toFixed(2)}` : "Pay on the day";
  const customer = consumerName || "A customer";

  let bookingSection = "";
  if (bookingDate || bookingTime) {
    const parts = [];
    if (bookingDate) {
      parts.push(`<tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Booking Date</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${bookingDate}</td>
          </tr>`);
    }
    if (bookingTime) {
      parts.push(`<tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Booking Time</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${bookingTime}</td>
          </tr>`);
    }
    bookingSection = parts.join("");
  }

  const typeDisplay = purchaseType
    ? purchaseType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const typeSection = typeDisplay
    ? `<tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Type</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${typeDisplay}</td>
          </tr>`
    : "";

  return {
    subject: `New claim on your offer: ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">New Claim!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        A customer has claimed your offer:
      </p>
      <div style="background-color:#f0f7fa;border-left:4px solid #1a3a4a;padding:16px;margin:0 0 24px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#1a3a4a;font-size:18px;font-weight:600;">${offerName}</p>
      </div>
      <div style="background-color:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Customer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${customer}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${offerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Amount</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${amountDisplay}</td>
          </tr>
          ${bookingSection}
          ${typeSection}
        </table>
      </div>
    `),
  };
}

function businessSignedOffTemplate(
  businessName: string
): { subject: string; html: string } {
  return {
    subject: "Your business has been approved!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#27ae60;font-size:22px;">You're Approved!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Great news! <strong>${businessName}</strong> has been signed off and is now live on PingLocal.
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        You can now create and publish offers for your customers to discover.
      </p>
    `),
  };
}

function offerRejectedTemplate(
  businessName: string,
  offerName: string,
  rejectionReason?: string
): { subject: string; html: string } {
  const reasonSection = rejectionReason
    ? `<div style="background-color:#fdf0ef;border-left:4px solid #c0392b;padding:16px;margin:0 0 24px;border-radius:0 4px 4px 0;">
        <p style="margin:0 0 4px;color:#666666;font-size:13px;font-weight:600;">REASON</p>
        <p style="margin:0;color:#333333;font-size:16px;line-height:1.5;">${rejectionReason}</p>
      </div>`
    : "";

  return {
    subject: `Offer rejected: ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#c0392b;font-size:22px;">Offer Rejected</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Your offer <strong>${offerName}</strong> for <strong>${businessName}</strong> has been reviewed and was not approved.
      </p>
      ${reasonSection}
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Please review the feedback above and update your offer accordingly. You can resubmit it for review once the changes have been made.
      </p>
    `),
  };
}

function offerSignedOffTemplate(
  businessName: string,
  offerName: string,
  startDate?: string
): { subject: string; html: string } {
  let liveMessage: string;
  if (startDate) {
    const formatted = new Date(startDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    liveMessage = `Your offer <strong>${offerName}</strong> for <strong>${businessName}</strong> has been approved and will be live on <strong>${formatted}</strong>.`;
  } else {
    liveMessage = `Your offer <strong>${offerName}</strong> for <strong>${businessName}</strong> has been approved and is now live on PingLocal.`;
  }

  return {
    subject: `Offer approved: ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#27ae60;font-size:22px;">Offer Approved!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        ${liveMessage}
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Customers will be able to discover and claim this offer.
      </p>
    `),
  };
}

function businessStripeConnectedTemplate(
  businessName: string
): { subject: string; html: string } {
  return {
    subject: "Stripe account connected!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#27ae60;font-size:22px;">Payments Ready!</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Your Stripe account has been successfully connected to <strong>${businessName}</strong> on PingLocal.
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        You can now receive payments from customers who claim your paid offers.
      </p>
    `),
  };
}

function adminNewBusinessTemplate(
  businessName: string,
  businessEmail?: string
): { subject: string; html: string } {
  const emailRow = businessEmail
    ? `<tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Email</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${businessEmail}</td>
          </tr>`
    : "";

  return {
    subject: `New business created: ${businessName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">New Business Created</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        A new business has been created on PingLocal:
      </p>
      <div style="background-color:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Business</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${businessName}</td>
          </tr>
          ${emailRow}
        </table>
      </div>
    `),
  };
}

function adminOfferReadyForReviewTemplate(
  offerName: string,
  businessName: string
): { subject: string; html: string } {
  return {
    subject: `Offer ready for review: ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Offer Ready for Review</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        A new offer is ready for review:
      </p>
      <div style="background-color:#f0f7fa;border-left:4px solid #1a3a4a;padding:16px;margin:0 0 24px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#1a3a4a;font-size:18px;font-weight:600;">${offerName}</p>
      </div>
      <div style="background-color:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Business</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${offerName}</td>
          </tr>
        </table>
      </div>
    `),
  };
}

function businessApplicationReceivedTemplate(
  businessName: string
): { subject: string; html: string } {
  return {
    subject: "We've received your application!",
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#1a3a4a;font-size:22px;">Application Received</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        Thanks for registering <strong>${businessName}</strong> on PingLocal!
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        We've received your application and we'll be in touch to discuss your business joining PingLocal.
      </p>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        In the meantime, if you have any questions, feel free to reach out to us.
      </p>
    `),
  };
}

function businessRedemptionCompleteTemplate(
  businessName: string,
  offerName: string,
  customerName: string,
  amount: number | null
): { subject: string; html: string } {
  let amountRow = "";
  if (amount != null) {
    amountRow = `
      <tr>
        <td style="padding:8px 0;color:#666666;font-size:14px;">Bill Amount</td>
        <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">&pound;${amount.toFixed(2)}</td>
      </tr>`;
  }

  return {
    subject: `Offer redeemed: ${offerName}`,
    html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#27ae60;font-size:22px;">Offer Redeemed</h2>
      <p style="margin:0 0 16px;color:#333333;font-size:16px;line-height:1.5;">
        A customer has redeemed an offer at <strong>${businessName}</strong>.
      </p>
      <div style="background-color:#f0faf4;border-radius:8px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Customer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;font-weight:600;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666666;font-size:14px;">Offer</td>
            <td style="padding:8px 0;color:#333333;font-size:14px;text-align:right;">${offerName}</td>
          </tr>
          ${amountRow}
        </table>
      </div>
    `),
  };
}

// =====================================================
// Main handler
// =====================================================

serve(async (req) => {
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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: EmailPayload = await req.json();
    console.log("Received email payload:", JSON.stringify(payload, null, 2));

    // Handle database webhook payloads (they include record and type is a DB event)
    const DB_EVENT_TYPES = ["INSERT", "UPDATE", "DELETE"];
    if (payload.record && (!payload.type || DB_EVENT_TYPES.includes(payload.type))) {
      return handleDatabaseWebhook(supabase, payload);
    }

    if (!payload.type) {
      return new Response(
        JSON.stringify({ error: "Email type is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Resolve user email and name
    // If recipient_email is provided (e.g. for business emails), use it directly
    let userEmail = payload.recipient_email || payload.user_email;
    let userFirstName = payload.user_first_name;
    let userAuthId = payload.user_auth_id;

    if (!userEmail && payload.user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("email, first_name, auth_id")
        .eq("id", payload.user_id)
        .single();

      if (user) {
        userEmail = user.email;
        userFirstName = userFirstName || user.first_name;
        userAuthId = userAuthId || user.auth_id;
      }
    }

    if (!userEmail) {
      console.error("Could not resolve user email for payload:", payload);
      return new Response(
        JSON.stringify({ error: "Could not resolve user email" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check notification preferences for gated email types
    const preferenceColumn = PREFERENCE_MAP[payload.type];
    if (preferenceColumn && userAuthId) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select(preferenceColumn)
        .eq("user_id", userAuthId)
        .single();

      // If preference exists and is explicitly false, skip sending
      if (prefs && prefs[preferenceColumn] === false) {
        console.log(
          `User ${userAuthId} opted out of ${preferenceColumn}, skipping email`
        );
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: `User opted out of ${preferenceColumn}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Select template based on type
    let subject: string;
    let html: string;

    switch (payload.type) {
      case "welcome": {
        const t = welcomeTemplate(userFirstName || "");
        subject = t.subject;
        html = t.html;
        break;
      }
      case "verification_success": {
        const t = verificationSuccessTemplate(userFirstName || "");
        subject = t.subject;
        html = t.html;
        break;
      }
      case "new_offer_from_favorite": {
        const t = newOfferFromFavoriteTemplate(
          userFirstName || "",
          payload.offer_name || "a new offer",
          payload.business_name || "a business you follow",
          payload.offer_id
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "purchase_confirmation": {
        const t = purchaseConfirmationTemplate(
          userFirstName || "",
          payload.offer_name || "an offer",
          payload.business_name || "a business",
          payload.amount ?? null,
          payload.booking_date,
          payload.booking_time,
          payload.purchase_type
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "cancellation_by_business": {
        const t = cancellationByBusinessTemplate(
          userFirstName || "",
          payload.offer_name || "your offer",
          payload.business_name || "The business",
          payload.cancellation_reason
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "cancellation_by_user": {
        const t = cancellationByUserTemplate(
          userFirstName || "",
          payload.offer_name || "your offer"
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "booking_reminder": {
        const t = bookingReminderTemplate(
          userFirstName || "",
          payload.offer_name || "your offer",
          payload.business_name || "the business",
          payload.booking_date,
          payload.offer_id
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "redemption_complete": {
        const t = redemptionCompleteTemplate(
          userFirstName || "",
          payload.offer_name || "your offer",
          payload.amount ?? null,
          payload.points_earned || 0,
          payload.new_points_total || 0
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "business_redemption_complete": {
        const t = businessRedemptionCompleteTemplate(
          payload.business_name || "your business",
          payload.offer_name || "an offer",
          payload.consumer_name || "A customer",
          payload.amount ?? null
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "weekly_summary": {
        if (!payload.summary_data) {
          return new Response(
            JSON.stringify({ error: "summary_data is required for weekly_summary" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
        const t = weeklySummaryTemplate(
          userFirstName || "",
          payload.summary_data
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "business_new_claim": {
        const t = businessNewClaimTemplate(
          payload.consumer_name || "A customer",
          payload.offer_name || "an offer",
          payload.business_name || "your business",
          payload.amount ?? null,
          payload.booking_date,
          payload.booking_time,
          payload.purchase_type
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "business_signed_off": {
        const t = businessSignedOffTemplate(
          payload.business_name || "Your business"
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "offer_rejected": {
        const t = offerRejectedTemplate(
          payload.business_name || "your business",
          payload.offer_name || "your offer",
          payload.rejection_reason
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "offer_signed_off": {
        const t = offerSignedOffTemplate(
          payload.business_name || "your business",
          payload.offer_name || "your offer"
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "business_stripe_connected": {
        const t = businessStripeConnectedTemplate(
          payload.business_name || "Your business"
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "admin_new_business": {
        const t = adminNewBusinessTemplate(
          payload.business_name || "Unknown business",
          payload.recipient_email ? undefined : payload.user_email
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      case "admin_offer_ready_for_review": {
        const t = adminOfferReadyForReviewTemplate(
          payload.offer_name || "an offer",
          payload.business_name || "a business"
        );
        subject = t.subject;
        html = t.html;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${payload.type}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: userEmail.includes(",")
          ? userEmail.split(",").map((e: string) => e.trim())
          : [userEmail],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resend response:", JSON.stringify(resendData, null, 2));

    // Log to notification_log
    try {
      await supabase.from("notification_log").insert({
        user_id: userAuthId || null,
        notification_type: `email_${payload.type}`,
        title: subject,
        body: `Email sent to ${userEmail}`,
        data: {
          resend_id: resendData.id,
          email_type: payload.type,
          offer_id: payload.offer_id,
          business_id: payload.business_id,
        },
        status: resendResponse.ok ? "sent" : "error",
        error_message: resendResponse.ok
          ? null
          : JSON.stringify(resendData),
        related_offer_id: payload.offer_id
          ? String(payload.offer_id)
          : null,
        related_business_id: payload.business_id
          ? String(payload.business_id)
          : null,
      });
    } catch (logError) {
      console.error("Error logging email to notification_log:", logError);
    }

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email",
          details: resendData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: resendData.id,
        type: payload.type,
        to: userEmail,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// =====================================================
// Database webhook handler
// =====================================================
// When triggered by a Supabase Database Webhook, the payload contains
// record (new row) and old_record (previous row) instead of our typed fields.

async function handleDatabaseWebhook(
  supabase: ReturnType<typeof createClient>,
  payload: EmailPayload
): Promise<Response> {
  const record = payload.record!;
  const oldRecord = payload.old_record;

  // Detect: purchase_tokens.cancelled changed from false to true (user cancellation)
  if (
    record.cancelled === true &&
    oldRecord &&
    oldRecord.cancelled === false &&
    record.user_email
  ) {
    // Look up user first name
    let firstName = "";
    if (record.user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("first_name")
        .eq("id", record.user_id)
        .single();
      firstName = user?.first_name || "";
    }

    const template = cancellationByUserTemplate(
      firstName,
      (record.offer_name as string) || "your offer"
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [record.user_email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendData = await resendResponse.json();
    console.log(
      "Resend response (webhook cancellation):",
      JSON.stringify(resendData, null, 2)
    );

    return new Response(
      JSON.stringify({
        success: resendResponse.ok,
        type: "cancellation_by_user",
        webhook: true,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Detect: users.verified changed from false to true
  if (
    record.verified === true &&
    oldRecord &&
    oldRecord.verified === false &&
    record.email
  ) {
    const template = verificationSuccessTemplate(
      (record.first_name as string) || ""
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [record.email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendData = await resendResponse.json();
    console.log(
      "Resend response (webhook verification):",
      JSON.stringify(resendData, null, 2)
    );

    return new Response(
      JSON.stringify({
        success: resendResponse.ok,
        type: "verification_success",
        webhook: true,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Detect: businesses.is_signed_off changed from false to true
  if (
    record.is_signed_off === true &&
    oldRecord &&
    oldRecord.is_signed_off === false &&
    record.email
  ) {
    const template = businessSignedOffTemplate(
      (record.name as string) || "Your business"
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [record.email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendData = await resendResponse.json();
    console.log(
      "Resend response (webhook business signed off):",
      JSON.stringify(resendData, null, 2)
    );

    return new Response(
      JSON.stringify({
        success: resendResponse.ok,
        type: "business_signed_off",
        webhook: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Detect: offers.status changed to 'Rejected'
  if (
    record.status === "Rejected" &&
    oldRecord &&
    oldRecord.status !== "Rejected"
  ) {
    // Look up business email
    let businessEmail = "";
    let businessName = (record.business_name as string) || "";
    if (record.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("email, name")
        .eq("id", record.business_id)
        .single();
      businessEmail = biz?.email || "";
      businessName = businessName || biz?.name || "";
    }

    if (businessEmail) {
      const template = offerRejectedTemplate(
        businessName,
        (record.name as string) || "your offer",
        (record.rejection_reason as string) || undefined
      );

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [businessEmail],
          subject: template.subject,
          html: template.html,
        }),
      });

      const resendData = await resendResponse.json();
      console.log(
        "Resend response (webhook offer rejected):",
        JSON.stringify(resendData, null, 2)
      );

      return new Response(
        JSON.stringify({
          success: resendResponse.ok,
          type: "offer_rejected",
          webhook: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Detect: offers.status changed to 'Signed Off'
  if (
    record.status === "Signed Off" &&
    oldRecord &&
    oldRecord.status !== "Signed Off"
  ) {
    let businessEmail = "";
    let businessName = (record.business_name as string) || "";
    if (record.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("email, name")
        .eq("id", record.business_id)
        .single();
      businessEmail = biz?.email || "";
      businessName = businessName || biz?.name || "";
    }

    if (businessEmail) {
      const template = offerSignedOffTemplate(
        businessName,
        (record.name as string) || "your offer",
        (record.start_date as string) || undefined
      );

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [businessEmail],
          subject: template.subject,
          html: template.html,
        }),
      });

      const resendData = await resendResponse.json();
      console.log(
        "Resend response (webhook offer signed off):",
        JSON.stringify(resendData, null, 2)
      );

      return new Response(
        JSON.stringify({
          success: resendResponse.ok,
          type: "offer_signed_off",
          webhook: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Detect: businesses.stripe_account_no filled in (was empty, now has value)
  if (
    record.stripe_account_no &&
    oldRecord &&
    !oldRecord.stripe_account_no &&
    record.email
  ) {
    const template = businessStripeConnectedTemplate(
      (record.name as string) || "Your business"
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [record.email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendData = await resendResponse.json();
    console.log(
      "Resend response (webhook stripe connected):",
      JSON.stringify(resendData, null, 2)
    );

    return new Response(
      JSON.stringify({
        success: resendResponse.ok,
        type: "business_stripe_connected",
        webhook: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Detect: new business created (INSERT on businesses table)
  // Webhook should be configured for INSERT events on businesses table
  if (
    record.name &&
    !oldRecord &&
    record.id
  ) {
    const results: Array<{ type: string; success: boolean }> = [];

    // Send application received email to the business
    if (record.email) {
      const bizTemplate = businessApplicationReceivedTemplate(
        (record.name as string)
      );

      const bizResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [record.email],
          subject: bizTemplate.subject,
          html: bizTemplate.html,
        }),
      });

      const bizData = await bizResponse.json();
      console.log(
        "Resend response (webhook business application received):",
        JSON.stringify(bizData, null, 2)
      );
      results.push({ type: "business_application_received", success: bizResponse.ok });
    }

    // Send admin notification
    const adminEmails = Deno.env.get("ADMIN_NOTIFICATION_EMAILS");
    if (adminEmails) {
      const template = adminNewBusinessTemplate(
        (record.name as string),
        (record.email as string) || undefined
      );

      const recipients = adminEmails.split(",").map((e: string) => e.trim());
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipients,
          subject: template.subject,
          html: template.html,
        }),
      });

      const resendData = await resendResponse.json();
      console.log(
        "Resend response (webhook new business admin):",
        JSON.stringify(resendData, null, 2)
      );
      results.push({ type: "admin_new_business", success: resendResponse.ok });
    } else {
      console.log("ADMIN_NOTIFICATION_EMAILS not set, skipping admin new business email");
    }

    return new Response(
      JSON.stringify({
        success: results.every((r) => r.success),
        types: results.map((r) => r.type),
        webhook: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Detect: offers.status changed to 'Ready for Review'
  if (
    record.status === "Ready for Review" &&
    oldRecord &&
    oldRecord.status !== "Ready for Review"
  ) {
    const adminEmails = Deno.env.get("ADMIN_NOTIFICATION_EMAILS");
    if (adminEmails) {
      const template = adminOfferReadyForReviewTemplate(
        (record.name as string) || "an offer",
        (record.business_name as string) || "a business"
      );

      const recipients = adminEmails.split(",").map((e: string) => e.trim());
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipients,
          subject: template.subject,
          html: template.html,
        }),
      });

      const resendData = await resendResponse.json();
      console.log(
        "Resend response (webhook offer ready for review admin):",
        JSON.stringify(resendData, null, 2)
      );

      return new Response(
        JSON.stringify({
          success: resendResponse.ok,
          type: "admin_offer_ready_for_review",
          webhook: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      console.log("ADMIN_NOTIFICATION_EMAILS not set, skipping admin offer review email");
    }
  }

  console.log("Database webhook received but no matching handler:", record);
  return new Response(
    JSON.stringify({ success: true, skipped: true, reason: "No matching handler" }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
