# PingLocal Consumer App - External Integration Map

A complete reference of how the consumer React Native app communicates with Supabase, external services, and manages data. Use this alongside `PING_LOCAL_BUSINESS_APP_PROMPT.md` when building the business app.

---

## Table of Contents

1. [Authentication Flows](#1-authentication-flows)
2. [Database Reads (Direct Queries)](#2-database-reads-direct-queries)
3. [Database Writes (Direct Queries)](#3-database-writes-direct-queries)
4. [Edge Function Invocations (from App)](#4-edge-function-invocations-from-app)
5. [Realtime Subscriptions](#5-realtime-subscriptions)
6. [Push Notifications](#6-push-notifications)
7. [Edge Functions (Full Backend Catalogue)](#7-edge-functions-full-backend-catalogue)
8. [Database Triggers & Webhooks](#8-database-triggers--webhooks)
9. [Cron Jobs](#9-cron-jobs)
10. [External Services](#10-external-services)
11. [Local Storage](#11-local-storage)
12. [Context Providers & App Structure](#12-context-providers--app-structure)
13. [Database Tables Overview](#13-database-tables-overview)

---

## 1. Authentication Flows

**File:** `src/contexts/AuthContext.tsx`

### Sign Up
1. `supabase.auth.signUp({ email, password, options: { data: { first_name, surname } } })`
2. Check if user profile already exists: `supabase.from('users').select('id').eq('email', email).single()`
3. If exists → reset profile: `supabase.from('users').update({ first_name, surname, loyalty_points: 0, ... }).eq('email', email)`
4. If new → create profile: `supabase.from('users').insert({ email, first_name, surname, loyalty_points: 0, loyalty_tier: 'Standard', verified: false, onboarding_completed: false, ... })`

### Sign In
- `supabase.auth.signInWithPassword({ email, password })`

### Sign Out
- `supabase.auth.signOut()`
- Push tokens deactivated (see Push Notifications section)

### Email Verification
- `supabase.auth.verifyOtp({ token, type: 'email', email })`
- Then: `supabase.from('users').update({ verified: true }).eq('id', user.id)`

### Resend Verification
- `supabase.auth.resend({ type: 'signup', email })`

### Password Reset
1. `supabase.auth.resetPasswordForEmail(email)`
2. `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`
3. Direct REST API PUT to `/auth/v1/user` with new password and access token

### Session Management
- `supabase.auth.getSession()` — on app startup
- `supabase.auth.onAuthStateChange()` — subscribes to auth state changes
- `supabase.auth.getUser()` — get current user details

### Onboarding Complete
- `supabase.from('users').update({ onboarding_completed: true }).eq('email', user.email)`

### Notification Permission
- `supabase.from('users').update({ notification_permission_status }).eq('email', user.email)`
- Values: `not_asked`, `granted`, `denied`, `dismissed`

### Loyalty Level-Up Check
- `supabase.from('users').select('pending_level_up, pending_level_up_from, pending_level_up_to, loyalty_points').eq('email', user.email).single()`
- Clear after shown: `supabase.from('users').update({ pending_level_up: false, pending_level_up_from: null, pending_level_up_to: null }).eq('email', user.email)`

---

## 2. Database Reads (Direct Queries)

### HomeScreen (`src/screens/main/HomeScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `location_areas.select('*').order('name')` | location_areas | — | Populate location filter dropdown |
| `offers.select('business_id, businesses!inner(category)').eq('status','Signed Off').gte('end_date', now)` | offers → businesses | Active only | Get unique categories for filter |
| `tags.select('*').eq('type','tags').order('name')` | tags | type = 'tags' | Populate tag filter |
| `offers.select('*, businesses!inner(...), offer_tags(tags(...))').eq('status','Signed Off').gte('end_date', now)` | offers → businesses, offer_tags → tags | Status, date, location (ilike), category, tags | Main paginated offer list. Sorts: newest / ending_soon / proximity. Uses `.range()` for pagination (20 per page) |

### OfferDetailScreen (`src/screens/main/OfferDetailScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `offers.select('*').eq('id', offerId).single()` | offers | id | Get offer details |
| `image_gallery.select('*').eq('offer_id', offerId).order('display_order')` | image_gallery | offer_id | Gallery carousel images |
| `businesses.select('id,name,location_area,...').eq('name', business_name).single()` | businesses | name | Business info for offer |
| `offer_tags.select('tag_id').eq('offer_id', offerId)` | offer_tags | offer_id | Get tag IDs |
| `tags.select('id,name,type').in('id', tagIds)` | tags | id IN (...) | Get tag details |
| `business_policies.select('...').eq('id', policyId).single()` | business_policies | id | Get redemption/returns policy |
| `favorites.select('id').eq('user_id',...).eq('offer_id',...).maybeSingle()` | favorites | user_id, offer_id | Check if favorited |
| `purchase_tokens.select('*').eq('user_id', email).eq('offer_id',...).eq('cancelled', false)` | purchase_tokens | user_id, offer_id, not cancelled | Check if already claimed (one-per-customer) |

### BusinessDetailScreen (`src/screens/main/BusinessDetailScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `businesses.select('*').eq('name', businessId).single()` | businesses | name | Business details |
| `offers.select('*').eq('business_name', businessId).eq('status','Signed Off').gte('end_date', now)` | offers | business_name, active | Business's active offers |
| `opening_times.select('*').eq('business_name', businessId).order('day_number')` | opening_times | business_name | Opening hours |

### DirectoryScreen (`src/screens/main/DirectoryScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `businesses.select('*').eq('is_signed_off', true).order('is_featured', desc).order('name')` | businesses | is_signed_off | All businesses (featured first) |
| `offers.select('business_name').eq('status','Signed Off').gte('end_date', now)` | offers | active | Count offers per business |
| `business_tags.select('business_id, tags(id, name, type)')` | business_tags → tags | — | Tags for each business |

### MapScreen (`src/screens/main/MapScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `businesses.select('*').eq('is_signed_off', true)` | businesses | is_signed_off | Business map markers |
| `offers.select('id,name,summary,...').eq('status','Signed Off').gte('end_date', now)` | offers | active | Offer data for map pins |

### FavoritesScreen (`src/screens/main/FavoritesScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `favorites.select('id, offer_id, business_id').eq('user_id', authUser.id)` | favorites | user_id | User's favorites |
| `offers.select('*').in('id', offerIds)` | offers | id IN (...) | Favorited offer details |
| `businesses.select('*').in('id', businessIds)` | businesses | id IN (...) | Favorited business details |

### ClaimedScreen (`src/screens/main/ClaimedScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `offers.select('id, featured_image, business_name, booking_type, booking_url').in('id', offerIds)` | offers | id IN (...) | Claimed offer details |

### AccountScreen (`src/screens/main/AccountScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `purchase_tokens.select('*').eq('user_id', user.id).eq('redeemed', true).order('updated', desc).limit(10)` | purchase_tokens | user_id, redeemed | Recent redeemed offers |
| `offers.select('id,name,business_name,featured_image').in('id', offerIds)` | offers | id IN (...) | Offer details for redeemed list |
| `purchase_tokens.select('*', { count: 'exact', head: true }).eq('user_id', user.id)` | purchase_tokens | user_id | Total claim count |

### NotificationsScreen (`src/screens/main/NotificationsScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `notifications.select('*').eq('user_id', user.id).order('created', desc).limit(50)` | notifications | user_id | User's notifications |

### QRCodeScreen (`src/screens/redemption/QRCodeScreen.tsx`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `redemption_tokens.select('id, status').eq('purchase_token_id',...).eq('status','Finished').single()` | redemption_tokens | purchase_token_id, status | Check if already redeemed |

### Loyalty Points Service (`src/services/loyaltyPointsService.ts`)

| Query | Table(s) | Filters | Purpose |
|-------|----------|---------|---------|
| `loyalty_points.select('*').eq('user_id', userId)` | loyalty_points | user_id | Points history for user |
| `loyalty_points.select('points').eq('user_id', userId)` | loyalty_points | user_id | Calculate total points |

---

## 3. Database Writes (Direct Queries)

### Claiming an Offer (`src/screens/claim/ClaimScreen.tsx`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| INSERT | purchase_tokens | user_id, user_email, offer_id, offer_name, business_id, purchase_type, customer_price, ping_local_take, offer_slot, quantity, customer_phone_no, redeemed, cancelled | Create purchase/claim record |
| UPDATE | offer_slots | booked_count (increment) | Mark slot as booked |
| UPDATE | offers | number_sold (increment) | Track total sold |
| UPDATE | users | loyalty_points | Award points after purchase |
| INSERT | loyalty_points | user_id, points, reason, offer_id | Record points transaction |

### Favorites (`src/components/promotions/PromotionCard.tsx`, `src/screens/main/FavoritesScreen.tsx`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| INSERT | favorites | user_id, offer_id | Add to favorites |
| DELETE | favorites | (by user_id + offer_id) | Remove from favorites |

### Notifications (`src/screens/main/NotificationsScreen.tsx`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| UPDATE | notifications | read = true (single) | Mark notification read |
| UPDATE | notifications | read = true (bulk by user_id) | Mark all as read |

### Redemption (`src/screens/redemption/QRCodeScreen.tsx`, `BillConfirmationScreen.tsx`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| INSERT | redemption_tokens | purchase_token_id, customer_id, customer_name, offer_name, business_id, scanned, status, completed | Create QR redemption token |
| DELETE | redemption_tokens | (unscanned tokens) | Cleanup abandoned redemptions |
| UPDATE | redemption_tokens | status = 'Rejected' | Dispute bill amount |

### Claim Cancellation (`src/services/claimCancellationService.ts`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| UPDATE | purchase_tokens | cancelled = true | Cancel claim |
| UPDATE | offers | number_sold (decrement) | Restore availability |
| UPDATE | offer_slots | booked_count (decrement) | Restore slot availability |

### Push Tokens (`src/services/notificationService.ts`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| UPSERT | push_tokens | user_id, expo_push_token, device_type, device_name, is_active | Save/update push token (on conflict: user_id + expo_push_token) |
| UPDATE | push_tokens | is_active = false | Deactivate on logout |
| DELETE | push_tokens | (by user_id) | Remove all tokens for user |
| UPDATE | push_tokens | last_used_at | Track token usage |

### Profile (`src/screens/main/EditProfileScreen.tsx`)

| Operation | Table | Fields | Purpose |
|-----------|-------|--------|---------|
| UPDATE | users | first_name, surname, phone_no | Edit profile |

---

## 4. Edge Function Invocations (from App)

These are the edge functions the consumer app calls directly via `supabase.functions.invoke()`:

| Function | Called From | Parameters | Purpose |
|----------|-----------|------------|---------|
| `create-payment-intent` | ClaimScreen | amount, offer_id, business_id, user_id, user_email, offer_name, quantity | Create Stripe payment for "Pay Up Front" offers |
| `notify-purchase` | ClaimScreen | offer_id, offer_name, business_id, business_name, consumer_user_id, consumer_name, amount, purchase_type, booking_date/time, party_size, tables_booked | Notify business of new purchase + send emails |
| `send-push-notification` | ClaimScreen | type (`offer_claimed`, `loyalty_points_earned`, `loyalty_upgrade`), user_id, offer details | Send push + in-app notification to consumer |
| `confirm-bill` | BillConfirmationScreen | redemption_token_id, user_id | Consumer confirms bill for Pay-on-Day redemption. Awards loyalty points, checks tier upgrades |

---

## 5. Realtime Subscriptions

| Channel | Table | Events | Filter | File | Purpose |
|---------|-------|--------|--------|------|---------|
| `notifications-changes` | notifications | INSERT, UPDATE, DELETE | `user_id=eq.{userId}` | `src/contexts/NotificationContext.tsx` | Live unread notification count badge |
| `purchase_token_{id}` | purchase_tokens | UPDATE | `id=eq.{tokenId}` | `src/screens/redemption/QRCodeScreen.tsx` | Detect when purchase is marked as redeemed |
| `redemption_token_{id}_{timestamp}` | redemption_tokens | ALL (*) | `id=eq.{tokenId}` | `src/screens/redemption/QRCodeScreen.tsx` | Detect status changes: 'Submitted' (→ BillConfirmation) or 'Finished' (→ RedemptionSuccess) |
| `bill_confirmation_{tokenId}` | redemption_tokens | UPDATE | `id=eq.{tokenId}` | `src/screens/redemption/BillConfirmationScreen.tsx` | Listen for status → 'Finished' after bill confirmed |
| `redemption_waiting_{tokenId}` | redemption_tokens | UPDATE | `id=eq.{tokenId}` | `src/screens/redemption/RedemptionWaitingScreen.tsx` | Waiting screen for Pay-on-Day: navigates on 'Submitted' or 'Finished' |
| Auth state | — | — | — | `src/contexts/AuthContext.tsx` | `supabase.auth.onAuthStateChange()` for login/logout |

---

## 6. Push Notifications

**Service:** `src/services/notificationService.ts`

### Token Registration
- On app launch (if permission granted): registers Expo push token via UPSERT to `push_tokens` table
- On logout: deactivates token (`is_active = false`)
- Tracks `last_used_at` for each token

### Notification Types Received by Consumer
| Type | Trigger | Content |
|------|---------|---------|
| `offer_claimed` | After claiming/purchasing | "You've claimed {offer}" |
| `loyalty_points_earned` | After purchase | "You earned {X} points" |
| `loyalty_upgrade` | Points threshold reached | "You've reached {tier} tier!" |
| `new_offer` | Business publishes offer | "New offer from {business}" (via scheduled notification) |
| `offer_expiring` | Offer nearing end_date | "Offer expiring soon" (via scheduled notification) |
| `redemption_reminder` | Before booking date | Reminder to redeem |
| `cancellation` | Business cancels claim | "Your claim was cancelled" |

### Notification Channels (Android)
- `default`, `offers`, `reminders`, `purchases`

---

## 7. Edge Functions (Full Backend Catalogue)

**62 total edge functions** in `supabase/functions/`. Many are CRUD operations used by Adalo or will be used by the business app.

### Payment & Purchase
| Function | Method | Tables | External APIs |
|----------|--------|--------|---------------|
| `create-payment-intent` | POST | businesses (read) | **Stripe** (create PaymentIntent with Connect split) |
| `notify-purchase` | POST | businesses, users, push_tokens, notifications, notification_log | **Expo Push**, **Resend** (email) |
| `cancel-claim` | POST | purchase_tokens, offers, offer_slots, notifications, notification_log | **Expo Push**, **Resend** |

### Redemption Flow
| Function | Method | Tables | Purpose |
|----------|--------|--------|---------|
| `scan-redemption-token` | POST | redemption_tokens, purchase_tokens, users | Business scans QR code |
| `complete-redemption` | POST | redemption_tokens, purchase_tokens, offers | Business confirms redemption |
| `confirm-bill` | POST | redemption_tokens, purchase_tokens, users, businesses, loyalty_points | Consumer confirms bill (Pay-on-Day) |

### Email & Notifications
| Function | Method | Tables | External APIs |
|----------|--------|--------|---------------|
| `send-email` | POST | users, notification_preferences, businesses, offers, notification_log | **Resend** |
| `send-push-notification` | POST | favorites, notification_preferences, push_tokens, users, notifications, notification_log | **Expo Push** |
| `process-scheduled-notifications` | GET (cron) | scheduled_notifications, offers | Calls send-push-notification + send-email |
| `send-weekly-summary` | GET (cron) | notification_preferences, users, offers, purchase_tokens, loyalty_points | Calls send-email |

### Business CRUD (used by Adalo / future business app)
`create-business`, `update-business`, `delete-business`, `get-businesses`

### Offer CRUD
`create-offer`, `update-offer`, `delete-offer`, `get-offers`, `get-offer-with-context`

### Offer Slots
`create-offer-slot`, `delete-offer-slot`, `get-offer-slots`

### Tags
`create-tag`, `update-tag`, `delete-tag`, `get-tags`, `get-tags-for-business`, `get-tags-for-offer`, `toggle-business-tag`, `toggle-offer-tag`, `get-business-tags`, `get-offer-tags`, `get-selected-offer-tags`

### Business Policies
`create-business-policy`, `update-business-policy`, `delete-business-policy`, `get-business-policies`, `get-business-policy`, `manage-policy-associations`

### Business Contacts
`create-business-contact`, `update-business-contact`, `delete-business-contact`, `get-business-contacts`

### Opening Times
`create-opening-time`, `update-opening-time`, `delete-opening-time`, `get-opening-times`

### Image Gallery
`create-image-gallery`, `update-image-gallery`, `delete-image-gallery`, `get-image-gallery`

### Users & Other
`get-users`, `update-user`, `get-location-areas`, `create-loyalty-points`, `update-loyalty-points`, `delete-loyalty-points`, `get-loyalty-points`, `get-purchase-tokens`, `update-redemption-tokens`, `get-redemption-tokens`, `get-redemption-status`

---

## 8. Database Triggers & Webhooks

### Auto-Created Triggers (via Migrations)

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `create_default_notification_preferences` | auth.users | AFTER INSERT | Creates default notification prefs (new_offers=true, offer_expiring=true, redemption_reminders=true, loyalty_updates=true, weekly_digest=false, marketing=false) |
| `update_push_tokens_updated_at` | push_tokens | BEFORE UPDATE | Auto-update timestamp |
| `update_notification_preferences_updated_at` | notification_preferences | BEFORE UPDATE | Auto-update timestamp |

### Database Webhooks (call `send-email` edge function)

| Webhook | Table | Event | Condition | Email Type |
|---------|-------|-------|-----------|------------|
| Welcome email | auth.users | INSERT | — | `welcome` |
| Verification success | users | UPDATE | `verified: false → true` | `verification_success` |
| Cancellation email | purchase_tokens | UPDATE | `cancelled: false → true` | `cancellation_by_user` |
| Business signed off | businesses | UPDATE | `is_signed_off: false → true` | `business_signed_off` |
| Offer rejected | offers | UPDATE | `status → 'Rejected'` | `offer_rejected` |
| Offer signed off | offers | UPDATE | `status → 'Signed Off'` | `offer_signed_off` |
| Stripe connected | businesses | UPDATE | `stripe_account_no: empty → populated` | `business_stripe_connected` |
| New business (admin) | businesses | INSERT | — | `admin_new_business` |
| Offer ready for review (admin) | offers | UPDATE | `status → 'Ready for Review'` | `admin_offer_ready_for_review` |

---

## 9. Cron Jobs

| Job | Schedule | Function | Purpose |
|-----|----------|----------|---------|
| Process scheduled notifications | Daily | `process-scheduled-notifications` | Send pending offer_expiring / redemption_reminder notifications |
| Weekly summary | `0 8 * * 1` (Mon 8am UTC) | `send-weekly-summary` | Aggregated email: new offers from favorites, purchases, loyalty points |

---

## 10. External Services

| Service | Used For | Called From | Currency |
|---------|----------|------------|----------|
| **Stripe** (Connect) | Payment processing with platform fee split | `create-payment-intent` edge function | GBP |
| **Resend** | Transactional email (18 templates) | `send-email` edge function | — |
| **Expo Push API** | iOS/Android push notifications (batched up to 100) | `send-push-notification`, `notify-purchase`, `cancel-claim` | — |
| **Supabase Auth** | User authentication, email verification, password reset | AuthContext.tsx | — |
| **Expo Location** | User location for proximity sorting | HomeScreen.tsx (client-side) | — |
| **React Native Maps** | Map display | MapScreen.tsx (client-side) | — |

---

## 11. Local Storage

| Key / Usage | Library | Purpose | File |
|-------------|---------|---------|------|
| Supabase auth tokens | `expo-secure-store` | Securely persists auth session/tokens across app restarts | `src/lib/supabase.ts` |
| `onboarding_completed_{email}` | AsyncStorage | Fallback flag if DB update fails during onboarding | `src/contexts/AuthContext.tsx` |
| `@ping_local_location_services` | AsyncStorage | User's location services preference (on/off) | `src/screens/main/SettingsScreen.tsx` |

---

## 12. Context Providers & App Structure

**File:** `App.tsx`

Provider hierarchy (outermost → innermost):
1. **StripeProvider** — Stripe payment context
2. **SafeAreaProvider** — Safe area insets
3. **AuthProvider** (`src/contexts/AuthContext.tsx`) — Session, user profile, auth functions, onboarding, loyalty level-up
4. **LocationProvider** (`src/contexts/LocationContext.tsx`) — User GPS location, permission state, `requestLocation()` / `refreshLocation()`
5. **NotificationProvider** (`src/contexts/NotificationContext.tsx`) — Unread count, realtime subscription, `refreshUnreadCount()`
6. **NavigationContainer** — React Navigation
7. **PushNotificationHandler** (`src/hooks/usePushNotifications.ts`) — Registers push token, sets up notification listeners

### Push Notification Navigation (when user taps)
| Notification Type | Navigates To |
|-------------------|-------------|
| `new_offer` | OfferDetail (with offerId) |
| `offer_expiring` | Claimed screen |
| `redemption_reminder` | Claimed screen |
| `loyalty_upgrade` | Account screen |
| default | Home screen |

### Local Notification Scheduling
- **Booking reminders** scheduled locally via `Notifications.scheduleNotificationAsync()` for day before booking at 10am (`src/services/notificationService.ts`)

---

## 13. Database Tables Overview

### Tables the Consumer App READS from
| Table | Key Fields Used |
|-------|----------------|
| offers | id, name, summary, price_discount, status, end_date, business_name, featured_image, number_sold, number_available, offer_type, booking_type, business_policy, one_per_customer |
| businesses | id, name, location_area, category, featured_image, location, phone_number, description_summary, is_signed_off, is_featured, lead_rate, stripe_account_no |
| offer_tags | offer_id, tag_id |
| business_tags | business_id, tag_id |
| tags | id, name, type |
| location_areas | id, name |
| opening_times | business_name, day_number, open_time, close_time |
| image_gallery | offer_id, image_url, display_order |
| business_policies | id, name, returns_policy, redemption, category |
| favorites | id, user_id, offer_id, business_id |
| notifications | id, user_id, message, read, created |
| purchase_tokens | id, user_id, user_email, offer_id, redeemed, cancelled |
| redemption_tokens | id, purchase_token_id, status, scanned |
| loyalty_points | id, user_id, points, reason, offer_id |
| users | id, email, first_name, surname, loyalty_points, loyalty_tier, verified, onboarding_completed, pending_level_up |

### Tables the Consumer App WRITES to
| Table | Operations | Context |
|-------|-----------|---------|
| users | INSERT, UPDATE | Sign up, profile edit, verification, loyalty, onboarding, notification permission |
| purchase_tokens | INSERT, UPDATE | Claim/purchase offers, cancel claims |
| redemption_tokens | INSERT, UPDATE, DELETE | QR redemption flow |
| offers | UPDATE | Increment/decrement number_sold |
| offer_slots | UPDATE | Increment/decrement booked_count |
| favorites | INSERT, DELETE | Add/remove favorites |
| notifications | UPDATE | Mark as read |
| push_tokens | UPSERT, UPDATE, DELETE | Push token lifecycle |
| loyalty_points | INSERT | Record points earned |

---

## Key Patterns for the Business App

1. **Businesses are identified by `name` not `id`** in many queries (offers.business_name, opening_times.business_name). The business app should follow this pattern.
2. **Offer status flow:** Draft → Ready for Review → Signed Off / Rejected. Only "Signed Off" offers are visible to consumers.
3. **Purchase types:** "Pay on the Day" (lead fee only at claim) vs "Pay Up Front" (full Stripe payment at claim).
4. **Redemption flow:** Consumer generates QR → Business scans (`scan-redemption-token`) → Business completes (`complete-redemption`) → Consumer confirms bill if Pay-on-Day (`confirm-bill`).
5. **Shared tables to be careful with:** offers, businesses, purchase_tokens, redemption_tokens, offer_slots - both apps read/write these.
6. **Edge functions already exist** for most business CRUD operations (create/update/delete for offers, slots, tags, policies, contacts, opening times, gallery images). The business app can reuse these.
7. **Notification system** already supports business-targeted notifications (business_new_claim, business_redemption_complete, business_stripe_connected). Business app needs to register push tokens and check notification_preferences.
