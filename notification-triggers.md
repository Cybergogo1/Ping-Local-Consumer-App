# PingLocal Notification Triggers Documentation

## Overview

This document outlines all notification triggers in the PingLocal consumer app, including push notifications, in-app notifications, and local device notifications.

---

## Notification Types

The system supports **6 core notification types** defined in the `send-push-notification` Supabase function:

| Type | Description |
|------|-------------|
| `new_offer` | New offers from favorited businesses |
| `offer_expiring` | When claimed offers are about to expire |
| `offer_claimed` | Confirmation when user claims/purchases an offer |
| `redemption_reminder` | Reminder to redeem a claimed offer |
| `loyalty_upgrade` | When user reaches a new loyalty tier |
| `loyalty_points_earned` | When loyalty points are awarded |

---

## Detailed Trigger Map

### 1. Claim Screen Triggers

**File:** `src/screens/claim/ClaimScreen.tsx`

#### Trigger 1.1: "Pay on the Day" Claim (~Line 150)
- **Function:** `handleClaim()`
- **User Action:** User claims a free/pay-later offer
- **Notifications Sent:**
  - `notify-purchase` - Business receives notification about the claim
  - `send-push-notification` (type: `offer_claimed`) - User receives confirmation

#### Trigger 1.2: "Pay Up Front" Purchase (~Lines 221-407)
- **Function:** `handlePayment()`
- **User Action:** User completes a paid purchase
- **Notifications Sent:**
  1. `send-push-notification` (type: `loyalty_points_earned`) - Points earned notification (~Line 330)
  2. `send-push-notification` (type: `loyalty_upgrade`) - Only if tier changed (~Line 347)
  3. `notify-purchase` - Business notification (~Line 371)
  4. `send-push-notification` (type: `offer_claimed`) - User purchase confirmation (~Line 392)

---

### 2. Bill Confirmation Screen Triggers

**File:** `src/screens/redemption/BillConfirmationScreen.tsx`

#### Trigger 2.1: Bill Amount Confirmation (~Lines 56-115)
- **Function:** `handleConfirm()`
- **User Action:** User confirms final bill amount during redemption
- **Notifications Sent:**
  1. `send-push-notification` (type: `loyalty_points_earned`) - Points earned for redemption (~Line 89)
  2. `send-push-notification` (type: `loyalty_upgrade`) - Only if tier changed (~Line 105)

---

### 3. Booking Confirmation Modal Triggers

**File:** `src/components/modals/BookingConfirmationModal.tsx`

#### Trigger 3.1: Booking Date Confirmation (~Lines 52-106)
- **Function:** `handleConfirm()`
- **User Action:** User confirms a booking date
- **Notification Type:** LOCAL DEVICE NOTIFICATION (not push)
- **Schedule:** 1 day before booking at 10:00 AM
- **Content:**
  - Title: "Booking Reminder"
  - Body: "Don't forget your booking at [businessName] tomorrow!"
  - Data: `{ type: 'booking_reminder', purchaseTokenId }`

---

### 4. Create Offer Function Triggers

**File:** `supabase/functions/create-offer/index.ts`

#### Trigger 4.1: New Active Offer Created (~Lines 116-146)
- **Event:** Business creates a new offer with `status: "active"`
- **Notification Type:** `new_offer`
- **Recipients:** All users who favorited the business (with preferences enabled)
- **Content:**
  - Title: "New from [businessName]"
  - Body: "[offerTitle]"

---

### 5. Update Offer Function Triggers

**File:** `supabase/functions/update-offer/index.ts`

#### Trigger 5.1: Offer Status Changed to Active (~Lines 162-192)
- **Event:** Business updates offer from draft/pending to `status: "active"`
- **Notification Type:** `new_offer`
- **Recipients:** All users who favorited the business
- **Content:** Same as Trigger 4.1

---

### 6. Create Loyalty Points Function Triggers

**File:** `supabase/functions/create-loyalty-points/index.ts`

#### Trigger 6.1: Loyalty Points Awarded (~Lines 162-213)
- **Event:** Admin or system creates loyalty points record
- **In-App Notifications Created:**
  1. Points earned notification (~Lines 176-190)
  2. Tier upgrade notification - if user levels up (~Lines 193-209)
- **Content:** Customized based on `reason` field ("purchase", "redemption", or "admin")

---

### 7. Purchase Notification Function Triggers

**File:** `supabase/functions/notify-purchase/index.ts`

#### Trigger 7.1: Purchase/Claim Completed (~Lines 94-237)
- **Called From:** ClaimScreen after purchase
- **Notifications Created:**

  1. **Consumer In-App Notification** (~Lines 95-114):
     - Name: "Purchase Confirmed"
     - Content: "Congratulations! You bought [offerName] from [businessName]"

  2. **Business Owner In-App Notification** (~Lines 127-151):
     - Name: "New Purchase"
     - Content: "[customerName] bought your offer '[offerName]' for £[amount]"

  3. **Consumer Push Notification** (~Lines 153-236):
     - Type: `purchase_confirmed`
     - Condition: Only if user has `activate_notifications: true`

---

## Notification Infrastructure

### Push Notification Hook

**File:** `src/hooks/usePushNotifications.ts`

**Navigation Handlers for Notification Types:**
| Type | Navigation Target |
|------|-------------------|
| `new_offer` | Offer details screen |
| `offer_expiring` | Claimed offers screen |
| `redemption_reminder` | Claimed offers screen |
| `loyalty_upgrade` | Account screen |
| Default | Home screen |

### Notification Service

**File:** `src/services/notificationService.ts`

**Core Configuration:**
- EAS Project ID: `e3a2debb-38ae-4e21-bb81-5668f8cb0aee`

**Android Notification Channels:**
| Channel ID | Purpose | Importance |
|------------|---------|------------|
| `default` | General notifications | Default |
| `offers` | New offers | High |
| `reminders` | Reminders & expiring offers | Default |

**Key Functions:**
- `scheduleLocalNotification()` - Schedule device-local notifications
- Token registration and management
- Badge count management

### Push Notification Supabase Function

**File:** `supabase/functions/send-push-notification/index.ts`

**Key Features:**
- Handles all 6 notification types
- Creates in-app notifications in `notifications` table
- Sends push notifications via Expo Push API (batch processing, max 100 per request)
- Respects user notification preferences
- Logs all attempts to `notification_log` table

---

## User Notification Preferences

**File:** `src/screens/main/NotificationPreferencesScreen.tsx`

| Preference | Controls |
|------------|----------|
| `activate_notifications` | Global notifications toggle |
| `new_offers_from_favorites` | New offers from favorited businesses |
| `offer_expiring_soon` | Expiring offer reminders |
| `redemption_reminders` | Redemption reminders |
| `loyalty_updates` | Loyalty points and tier updates |

---

## Summary Table

| Notification Type | Trigger | Source File | In-App | Push | Trigger Type |
|-------------------|---------|-------------|--------|------|--------------|
| `offer_claimed` | User claims/purchases | ClaimScreen.tsx | Yes | Yes | User Action |
| `loyalty_points_earned` | Purchase/redemption | ClaimScreen.tsx, BillConfirmationScreen.tsx | Yes | Yes | User Action |
| `loyalty_upgrade` | Tier level change | ClaimScreen.tsx, BillConfirmationScreen.tsx | Yes | Yes | User Action |
| `new_offer` | Business creates/activates offer | create-offer, update-offer functions | Yes | Yes | Business Action |
| `offer_expiring` | Scheduled check | send-push-notification function | Yes | Yes | Scheduled |
| `redemption_reminder` | Scheduled check | send-push-notification function | Yes | Yes | Scheduled |
| `booking_reminder` | User confirms booking | BookingConfirmationModal.tsx | Local | N/A | User Action |
| `purchase_confirmed` | After purchase | notify-purchase function | Yes | Yes | User Action |

---

## Notes

- All push notifications use the Expo Notifications API
- Notifications are logged to the `notification_log` table for analytics and debugging
- The `offer_expiring` and `redemption_reminder` notifications require a backend scheduler/cron job to trigger the send-push-notification function periodically
