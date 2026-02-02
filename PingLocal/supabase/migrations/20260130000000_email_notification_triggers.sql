-- Email Notification Triggers
-- Created: January 30, 2026
-- Sets up database triggers to send emails via the send-email edge function
-- Uses Supabase Database Webhooks for welcome email (configured in Dashboard)

-- =====================================================
-- Note on pg_net vs Database Webhooks:
-- This migration uses Database Webhooks (configured via Dashboard UI)
-- for the welcome email trigger on auth.users INSERT, since pg_net
-- may not be enabled. The verification and cancellation triggers
-- below also use Database Webhooks.
--
-- To configure Database Webhooks:
-- 1. Go to Supabase Dashboard > Database > Webhooks
-- 2. Create webhooks as described in comments below
-- =====================================================

-- =====================================================
-- DATABASE WEBHOOK: Welcome Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-welcome-email
--   Table: auth.users
--   Events: INSERT
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function will receive the webhook payload with
-- record (the new auth.users row) and handle it via handleDatabaseWebhook().
-- Since auth.users has email and raw_user_meta_data, the function can
-- extract the user's email and first_name.
--
-- IMPORTANT: The webhook payload from auth.users INSERT will include
-- record.email but NOT the custom users table fields. The send-email
-- function uses record.email directly for the welcome email.

-- =====================================================
-- DATABASE WEBHOOK: Verification Success Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-verification-success-email
--   Table: users (public.users, NOT auth.users)
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.verified = false
-- and record.verified = true before sending.

-- =====================================================
-- DATABASE WEBHOOK: User-Initiated Cancellation Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-cancellation-email
--   Table: purchase_tokens
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.cancelled = false
-- and record.cancelled = true before sending.
-- purchase_tokens has user_email and offer_name columns,
-- so the function has all data it needs.

-- =====================================================
-- DATABASE WEBHOOK: Business Signed Off Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-business-signed-off-email
--   Table: businesses
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.is_signed_off = false
-- and record.is_signed_off = true before sending.
-- Sends to record.email (the business email).

-- =====================================================
-- DATABASE WEBHOOK: Offer Rejected Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-offer-rejected-email
--   Table: offers
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.status != 'Rejected'
-- and record.status = 'Rejected' before sending.
-- Looks up business email via record.business_id.
-- Includes record.rejection_reason in the email.

-- =====================================================
-- DATABASE WEBHOOK: Offer Signed Off Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-offer-signed-off-email
--   Table: offers
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.status != 'Signed Off'
-- and record.status = 'Signed Off' before sending.
-- Looks up business email via record.business_id.

-- =====================================================
-- DATABASE WEBHOOK: Business Stripe Connected Email
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: send-business-stripe-connected-email
--   Table: businesses
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.stripe_account_no is empty
-- and record.stripe_account_no has a value before sending.
-- Sends to record.email (the business email).

-- =====================================================
-- DATABASE WEBHOOK: Admin - New Business Created
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: admin-new-business-created
--   Table: businesses
--   Events: INSERT
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function detects INSERT (no old_record)
-- and sends to ADMIN_NOTIFICATION_EMAILS env var.
-- Set via: npx supabase secrets set ADMIN_NOTIFICATION_EMAILS="email1@x.com,email2@x.com"

-- =====================================================
-- DATABASE WEBHOOK: Admin - Offer Ready for Review
-- =====================================================
-- Configure in Supabase Dashboard > Database > Webhooks:
--   Name: admin-offer-ready-for-review
--   Table: offers
--   Events: UPDATE
--   Type: Supabase Edge Function
--   Function: send-email
--   HTTP Method: POST
--   Headers: Content-Type: application/json
--
-- The send-email function checks old_record.status != 'Ready for Review'
-- and record.status = 'Ready for Review' before sending.
-- Sends to ADMIN_NOTIFICATION_EMAILS env var.

-- =====================================================
-- CRON: Weekly Summary Email
-- =====================================================
-- Schedule the weekly summary to run every Monday at 8:00 AM UTC.
-- This calls the send-weekly-summary edge function.
--
-- Requires pg_cron and pg_net extensions.
-- If pg_cron is not available, configure this via an external
-- scheduler (e.g., GitHub Actions, Supabase Dashboard Cron).

-- Check if extensions are available and create cron job
DO $outer$
BEGIN
  -- Only create the cron job if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule weekly summary for every Monday at 8:00 AM UTC
    PERFORM cron.schedule(
      'weekly-email-summary',
      '0 8 * * 1',
      $cron$
      SELECT
        net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/send-weekly-summary',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Weekly email summary cron job created successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Configure weekly summary cron externally.';
  END IF;
END
$outer$;
