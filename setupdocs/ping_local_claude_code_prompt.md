# Ping Local - Native User App Development Prompt

## Project Overview

Build a React Native (Expo) mobile application for Ping Local's consumer-facing side. Ping Local is a location-based promotions platform for businesses in Wirral, Merseyside, where users can browse, purchase, and redeem promotional offers using QR codes.

**Current State**: The app currently runs on Adalo but needs to be rebuilt natively for performance improvements. The admin and business sides will remain on Adalo temporarily, but all data should be migrated to Supabase.

## Tech Stack

- **Frontend**: React Native with Expo, TypeScript
- **Navigation**: React Navigation (Tab + Stack navigators)
- **State Management**: React Context API
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Authentication, PostgreSQL Database, Storage, Row Level Security)
- **Animations**: Lottie (for onboarding and success screens)
- **Payments**: Stripe integration (React Native Stripe SDK)
- **Notifications**: Expo Notifications
- **Maps**: React Native Maps
- **QR Code**: React Native QR Code Scanner & Generator

## Core App Functionality

### User Journey Types
Users can interact with promotions in 5 different ways based on promotion configuration:

1. **Pay Upfront / No Booking**: Direct payment → Claimed promotions
2. **Pay Upfront / Slot Booking**: Calendar selection → Payment → Claimed promotions
3. **Pay Upfront / External Booking**: External booking notice → Payment → Claimed promotions
4. **Pay on Day / No Booking**: Confirmation → Claim (no payment) → Claimed promotions
5. **Pay on Day / Slot Booking**: Calendar selection → Claim → Claimed promotions
6. **Pay on Day / External Booking**: External booking notice → Claim → Claimed promotions

### QR Code Redemption Flow

**Pay Upfront Promotions**:
1. User opens QR code from claimed promotions
2. Business scans with their Ping Local business app
3. Business confirms promotion details
4. User receives redemption confirmation

**Pay on Day Promotions**:
1. User opens QR code from claimed promotions
2. Business scans with their Ping Local business app
3. Business enters bill amount
4. User confirms bill amount on their device
5. User receives loyalty points (bill × 10)
6. Promotion marked as redeemed

### Loyalty System

**4-Tier System**:
- **Local Member**: 0-10 points (default)
- **Local Hero**: 10-1,200 points
- **Local Champion**: 1,200-10,000 points
- **Local Legend**: 10,000+ points

**Points Earning**:
- Pay upfront promotions: cost × 10 points (immediate)
- Pay on day promotions: bill × 10 points (after redemption)

**Display Requirements**:
- Header icon showing current tier
- Account page with tier progress bar
- Level up notifications/celebrations
- Tier information page

## Database Schema (Supabase)

### Core Tables

```sql
-- Users Table
users
- id (uuid, PK)
- email (text, unique)
- full_name (text)
- phone (text)
- loyalty_points (integer, default: 0)
- loyalty_tier (text, default: 'Local Member')
- verified (boolean, default: false)
- verification_code (text)
- notification_enabled (boolean, default: false)
- location_enabled (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)

-- Businesses Table
businesses
- id (uuid, PK)
- name (text)
- description (text)
- location (text) -- Area name (e.g., "Birkenhead", "Prenton")
- address (text)
- latitude (float)
- longitude (float)
- featured_image_url (text)
- is_featured (boolean, default: false)
- joined_date (timestamp)
- features (text[]) -- Array of feature tags
- live_promotions_count (integer, default: 0)
- created_at (timestamp)

-- Promotions Table
promotions
- id (uuid, PK)
- business_id (uuid, FK → businesses)
- title (text)
- description (text)
- featured_image_url (text)
- gallery_images (text[])
- price (decimal)
- unit (text) -- "item", "person", "box", etc.
- promotion_type (text) -- "pay_upfront" or "pay_on_day"
- booking_type (text) -- "none", "slot", "external"
- external_booking_url (text, nullable)
- external_booking_phone (text, nullable)
- quantity_total (integer, nullable)
- quantity_remaining (integer, nullable)
- start_date (timestamp)
- end_date (timestamp)
- status (text) -- "active", "ended", "sold_out"
- special_notes (text, nullable)
- terms_and_conditions (text)
- location_area (text) -- For filtering
- tags (text[]) -- Categories and features
- features (text[])
- created_at (timestamp)

-- Promotion Slots Table (for slot-based bookings)
promotion_slots
- id (uuid, PK)
- promotion_id (uuid, FK → promotions)
- slot_date (date)
- slot_time (time)
- capacity (integer)
- booked_count (integer, default: 0)
- available (boolean, default: true)

-- User Offers (Claimed/Purchased Promotions)
user_offers
- id (uuid, PK)
- user_id (uuid, FK → users)
- promotion_id (uuid, FK → promotions)
- business_id (uuid, FK → businesses)
- quantity (integer, default: 1)
- total_paid (decimal, nullable)
- party_size (integer, nullable)
- booking_slot_id (uuid, FK → promotion_slots, nullable)
- status (text) -- "claimed", "redeemed", "expired"
- qr_code_data (text) -- Encrypted/hashed unique identifier
- claimed_at (timestamp)
- redeemed_at (timestamp, nullable)
- loyalty_points_earned (integer, default: 0)

-- Favorites
favorites
- id (uuid, PK)
- user_id (uuid, FK → users)
- favoritable_type (text) -- "business" or "promotion"
- favoritable_id (uuid)
- created_at (timestamp)

-- Notifications
notifications
- id (uuid, PK)
- user_id (uuid, FK → users)
- title (text)
- message (text)
- read (boolean, default: false)
- type (text) -- "promotion", "redemption", "level_up", etc.
- related_id (uuid, nullable)
- created_at (timestamp)

-- FAQs
faqs
- id (uuid, PK)
- question (text)
- answer (text)
- order_index (integer)
- created_at (timestamp)
```

## Screen Structure & Implementation Details

### Authentication Flow

1. **Welcome Screen**
   - Login/Register options
   - Background image and graphic
   - Navigation to Login or Sign Up

2. **Sign Up Screen**
   - Email, password, full name, phone
   - Back button to Welcome
   - Submit creates unverified user account
   - Sends verification email with code
   - Navigate to Verification Screen

3. **Login Screen**
   - Email and password
   - Supabase Auth login
   - Check if verified, if not → Verification Screen
   - If verified → Home Feed

4. **Onboarding Screens (1-4)**
   - First-time user experience
   - Lottie animations/graphics
   - Screen 4: Request notification permissions
   - Swipeable carousel or next/skip buttons

5. **Verification Screen**
   - Input field for verification code
   - Verify against user's verification_code in database
   - "Resend code" option (generates new code, sends email)
   - Success → Show Verification Success modal → Home Feed

### Main Navigation (Bottom Tabs)

- **Home** (Feed icon)
- **Map** (Map pin icon)
- **Favorites** (Heart icon)
- **Directory** (List/Building icon)
- **Account** (User icon)

### Header Elements (Global)

- **Left**: Loyalty tier icon (dynamic based on points)
- **Right**: Notification bell with unread count badge

---

### HOME TAB

#### Home Feed Screen
- Pull-to-refresh
- Personalized feed algorithm (can start with simple sorting)
- If no promotions in user_offers → Show "generating feed" message
- Once loaded, display promotion cards with:
  - Featured image
  - Title
  - Business name
  - Location area
  - End date
  - Proximity to user (if location enabled)
  - Status indicator
- Filter/sort options:
  - Location areas (dropdown)
  - Categories/tags (chips)
  - Sort by: Proximity, Ending soon, Newest
- Tap card → Navigate to Promotion Detail Screen

#### Promotion Detail Screen
- **Header Section**:
  - Featured image (full width)
  - If quantity-based: Show "X remaining" overlay
- **Info Section**:
  - Title (large text)
  - Business name (link to Business Detail)
  - Location area
- **Buy Now Block** (sticky or prominent):
  - CTA button text varies: "Buy Now", "Book & Buy", "Claim Now", "Book & Claim"
  - Price (if pay_upfront)
  - Unit (item/person/box)
  - End date countdown
- **Features List**: Icon chips for promotion features
- **Ended Banner**: Red banner if promotion has ended
- **Description**: Full promotion description
- **Special Notes**: If exists, highlighted section
- **Terms & Conditions**: Expandable or link
- **Image Gallery**: Horizontal scrollable images
- **Business Card**: Mini business info with map link
- **Favorite Button**: Heart icon (toggle favorite)

#### Claim/Purchase Flow

**Entry Point**: "Buy Now" button on Promotion Detail

**Branch based on promotion config**:

1. **Booking Type: None**
   - Navigate directly to Payment/Claim Screen

2. **Booking Type: Slot**
   - Navigate to Slot Selection Screen
   - Calendar view with available dates
   - Select date → Show available time slots
   - Select slot → Navigate to Payment/Claim Screen

3. **Booking Type: External**
   - Navigate to External Booking Notice Screen
   - Display message: "You'll need to book via [phone/URL]"
   - Input: Party size (number)
   - Button: "Continue to Checkout/Claim"
   - Navigate to Payment/Claim Screen

**Payment/Claim Screen**:

- Display promotion details
- Show slot info if applicable
- Show party size if applicable
- Quantity selector (if allowed by promotion)

**If pay_upfront**:
- Stripe payment element
- Calculate total: price × quantity
- On successful payment:
  - Create user_offer record
  - Add loyalty points (cost × 10)
  - Check for tier level up
  - Navigate to Success Screen

**If pay_on_day**:
- No payment element
- "Confirm Booking" button
- On confirm:
  - Create user_offer record
  - No loyalty points yet
  - Navigate to Success Screen

**Success Screen**:
- Lottie celebration animation
- Display:
  - "Promotion Claimed!" or "Purchase Complete!"
  - Loyalty points earned (if applicable)
  - "You leveled up!" if tier changed
- Navigate to Claimed Promotions screen

---

### MAP TAB

#### Map View Screen
- React Native Maps full screen
- Map pins for each active promotion
- Pin clusters for nearby businesses
- Tap pin → Show promotion preview card (bottom sheet)
- Tap preview → Navigate to Promotion Detail
- Current location marker (if enabled)
- Filter button (same filters as Home Feed)
- List toggle button → Switch to Home Feed list view

---

### FAVORITES TAB

#### Favorites Screen
- Top tab navigator: "Businesses" | "Promotions"

**Businesses Tab**:
- List of favorited businesses
- Business card: name, location, features, live promotions count
- Tap → Navigate to Business Detail

**Promotions Tab**:
- List of favorited promotions
- Promotion card (same as Home Feed)
- Tap → Navigate to Promotion Detail

Empty states: "No favorites yet" with CTA to explore

---

### DIRECTORY TAB

#### Business Directory Screen
- **Featured Section**: Horizontal scrollable carousel
  - Larger cards for featured businesses
- **All Businesses List**: Vertical list
  - Business name
  - Location
  - Feature tags
  - Live promotions count
- Search bar at top
- Tap business → Navigate to Business Detail

#### Business Detail Screen
- **Header**: Featured image with overlaid name and location
- **Tags Section**: Feature tags as chips
- **Description**: Business description text
- **Recent Promotions Section**: List of active promotions
- **Map Section**: Embedded map showing business location
- **Favorite Button**: Heart icon toggle
- Link to "View all promotions" → Filter Home Feed by this business

---

### ACCOUNT TAB

#### My Account Screen
- **Loyalty Section** (top):
  - Large tier icon
  - Tier name
  - Progress bar to next tier
  - Points: "X / Y points to [Next Tier]"
  - Tap → Navigate to Loyalty Scheme Info
- **Quick Actions**:
  - My Claimed Promotions (button)
  - Notifications (button with unread badge)
  - Settings (button)
- **Redemption History**: Scrollable list of past offers

#### Claimed Promotions Screen
- **Empty State**: Graphic + "No claimed promotions yet"
- **Active Offers List**: Cards showing:
  - Featured image
  - Title
  - Business name, location
  - Booking details or expiry date
  - Price paid (if applicable)
  - "Redeem Now" button
- Status indicators: "Active", "Expiring Soon", "Expired"
- Tap "Redeem Now" → Show QR Code Modal

#### QR Code Modal
- Full-screen modal or bottom sheet
- Large QR code (generated from user_offer.qr_code_data)
- Promotion title and business name
- Instructions: "Show this QR code to the business"
- Close button
- **Await Scan**: Monitor for business scan event
  - If pay_upfront: Show "Redeemed!" → Dismiss modal
  - If pay_on_day: Navigate to Bill Confirmation Screen

#### Bill Confirmation Screen (Pay on Day Only)
- "Confirm Your Bill" header
- Display amount entered by business
- "Is this correct?" prompt
- Confirm button → Award loyalty points, show success, navigate back
- User must verbally dispute if wrong (no dispute button)

#### Notifications Screen
- List of notifications (newest first)
- Unread notifications highlighted
- Tap notification → Mark as read, navigate to related content if applicable
- "Mark all as read" option

#### Settings Screen
- Change User Details (name, phone, email)
- Change Password
- Location Preferences toggle
- Notification Preferences toggle
- FAQ link
- Delete Account (with confirmation)
- Logout

#### FAQ Section
- List view of FAQ entries
- Tap → Navigate to FAQ Detail Screen
- FAQ Detail: Question as header, answer as body text

#### Loyalty Scheme Info Screen
- Header explaining the program
- 3 tier cards (Local Hero, Champion, Legend)
- Each card: Icon, name, point range, benefits
- Note: Excludes Local Member (default tier)

---

## Technical Implementation Priorities

### Phase 1: Foundation (Week 1-2)
1. Set up Expo project with TypeScript
2. Configure NativeWind/Tailwind
3. Set up Supabase project and database schema
4. Implement Row Level Security policies
5. Set up Supabase Auth with email verification
6. Build basic navigation structure (tabs + stack)
7. Create reusable component library:
   - Buttons, cards, inputs
   - Loading states
   - Empty states
   - Error boundaries

### Phase 2: Authentication (Week 2)
1. Welcome/Login/Sign Up screens
2. Email verification flow
3. Onboarding screens with Lottie
4. Notification permission handling
5. Protected route setup

### Phase 3: Core Features (Week 3-4)
1. Home Feed with promotion cards
2. Promotion Detail screen
3. Map view with pins
4. Business Directory and detail pages
5. Favorites functionality
6. Search and filter system
7. Loyalty tier calculation and display

### Phase 4: Purchase/Claim Flow (Week 4-5)
1. Slot booking calendar
2. External booking screens
3. Stripe payment integration
4. Claim confirmation (pay on day)
5. Success screens with animations
6. Loyalty point award logic

### Phase 5: QR & Redemption (Week 5-6)
1. Claimed promotions list
2. QR code generation
3. QR code display modal
4. Real-time redemption updates (Supabase Realtime)
5. Bill confirmation screen (pay on day)
6. Redemption history

### Phase 6: Polish & Optimization (Week 6-7)
1. Notifications system (Expo Notifications)
2. Push notification setup
3. Account settings and profile updates
4. FAQ section
5. Loading states and error handling
6. Performance optimization
7. Offline support (basic caching)

### Phase 7: Testing & Launch (Week 7-8)
1. E2E testing setup
2. User acceptance testing
3. Bug fixes
4. App store preparation
5. Adalo data migration plan
6. Soft launch

---

## Key Technical Considerations

### Supabase Setup

**Authentication**:
- Enable email/password authentication
- Set up email templates for verification
- Configure RLS policies for all tables
- Consider magic link as future enhancement

**Database**:
- Enable Realtime for user_offers table (redemption updates)
- Create database functions for:
  - Calculating loyalty tier from points
  - Updating promotion quantity on claim
  - Awarding loyalty points
- Set up triggers for:
  - Auto-updating loyalty_tier when points change
  - Sending notifications on key events
  - Updating business live_promotions_count

**Storage**:
- Buckets for: promotion_images, business_images, user_avatars
- Public read access, authenticated write with RLS

### State Management

Use Context API for:
- Authentication state (user session)
- User profile data (loyalty points, tier)
- Cart/current promotion being claimed
- Notifications count

Consider Zustand for complex state if Context becomes unwieldy.

### Stripe Integration

- Use `@stripe/stripe-react-native` SDK
- Server-side functions in Supabase Edge Functions for:
  - Creating payment intents
  - Confirming payments
  - Handling webhooks
- Store payment intent ID with user_offer
- Handle payment failures gracefully

### QR Code Implementation

**Generation**:
- Use `react-native-qrcode-svg`
- QR data format: Encrypted JSON with:
  - user_offer_id
  - user_id
  - promotion_id
  - timestamp
- Generate unique code per offer on claim

**Scanning** (for business app, but be aware):
- Use `react-native-qr-scanner` or Expo Camera
- Scan → Decrypt → Verify → Show confirmation

### Location & Maps

- Request location permissions on Map tab first access
- Use `expo-location` for user location
- Calculate proximity using Haversine formula or PostGIS in Supabase
- Cache user location, update periodically
- Fallback to area center if location disabled

### Real-time Updates

Use Supabase Realtime for:
- QR code redemption status updates
- Live promotion quantity updates
- New notification alerts

Subscribe to changes when:
- User is on Claimed Promotions screen
- User has QR code modal open

### Notifications

**In-App**:
- Badge counts on notification bell
- Toast/banner for new notifications

**Push Notifications**:
- Set up Expo Notifications
- Store push tokens in Supabase
- Send via Supabase Edge Functions or external service
- Types: Promotion ending soon, new promotion from favorite business, redemption confirmation, level up

### Error Handling

- Network errors: Retry logic with exponential backoff
- Payment errors: Clear messaging, allow retry
- QR scan errors: Helpful error messages
- Form validation: Real-time feedback

### Performance

- Lazy load images with placeholders
- Pagination for feeds (infinite scroll)
- Cache promotion data locally (AsyncStorage)
- Optimize map pins (clustering for 50+ items)
- Debounce search inputs
- Memoize expensive calculations (loyalty tier, proximity)

---

## Adalo Migration Strategy

1. **Database Export**: Export all data from Adalo
2. **Supabase Import**: Create migration scripts to import into Supabase
3. **Field Mapping**: Map Adalo fields to Supabase schema
4. **Data Validation**: Ensure all relationships are maintained
5. **Dual Operation Period**: 
   - Native app reads from Supabase
   - Adalo admin/business apps read from Supabase (via API or native integration)
   - Eventually migrate admin/business to native as well
6. **Cutover**: Coordinate with businesses for smooth transition

---

## Design Assets Needed

- Loyalty tier icons (4 variations)
- App icon and splash screen
- Onboarding graphics/animations
- Empty state illustrations
- Lottie animations for success states
- Business category icons
- Feature/tag icons

---

## Testing Requirements

- Unit tests for utility functions (tier calculation, proximity, etc.)
- Integration tests for Supabase queries
- E2E tests for critical flows:
  - Sign up and verification
  - Promotion purchase flow
  - QR code redemption
  - Payment processing
- Manual testing on iOS and Android
- Test with various network conditions
- Test edge cases (expired promotions, sold out, etc.)

---

## Launch Checklist

- [ ] Configure app.json for production
- [ ] Set up Sentry or error tracking
- [ ] Configure analytics (Amplitude, Mixpanel, or similar)
- [ ] Set up Stripe production keys
- [ ] Configure Supabase production environment
- [ ] Test on physical devices (iOS and Android)
- [ ] Prepare app store listings (screenshots, descriptions)
- [ ] Set up CI/CD for builds (EAS Build)
- [ ] Privacy policy and terms of service
- [ ] App store optimization
- [ ] Beta testing with select users
- [ ] Monitor for crashes and errors post-launch

---

## Questions/Decisions Needed

1. **Promotion Algorithm**: How should the personalized feed work? Based on user location, past purchases, favorite categories, or business proximity?

2. **Adalo Sync**: During transition period, should there be real-time sync between Adalo and Supabase, or will it be a one-time migration?

3. **QR Security**: How should QR codes be encrypted/secured? Should they be single-use with expiry?

4. **Payment Refunds**: Are refunds allowed? If so, what's the process and impact on loyalty points?

5. **Multiple Redemptions**: Can a user claim the same promotion multiple times? Any limits?

6. **Promotion Expiry**: What happens to claimed promotions that expire unredeemed?

7. **Business Verification**: How do businesses scan QR codes - separate business app scanning feature, or web-based scanner?

8. **Offline Mode**: Should users be able to browse promotions offline? Show cached QR codes?

---

## Desired Outcome

A fully functional, performant React Native mobile app that:
- Matches the UX flow of the current Adalo app
- Provides smooth, native performance
- Integrates seamlessly with Supabase backend
- Handles payments securely via Stripe
- Supports QR-based redemption system
- Implements complete loyalty program
- Is ready for App Store and Play Store deployment

The app should be maintainable, scalable, and structured to support future features like push notifications, advanced analytics, and social features.
