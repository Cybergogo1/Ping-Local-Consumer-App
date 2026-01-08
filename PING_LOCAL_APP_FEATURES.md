# Ping Local Consumer App - Complete Feature Documentation

**Version:** 1.0.0
**Platform:** iOS & Android (React Native / Expo)
**Last Updated:** December 2024

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Authentication & User Management](#2-authentication--user-management)
3. [Onboarding Experience](#3-onboarding-experience)
4. [Main Navigation Structure](#4-main-navigation-structure)
5. [Home / Feed Screen](#5-home--feed-screen)
6. [Business Directory](#6-business-directory)
7. [Offers & Promotions System](#7-offers--promotions-system)
8. [Offer Claiming Flow](#8-offer-claiming-flow)
9. [Claimed Offers Management](#9-claimed-offers-management)
10. [QR Code Redemption System](#10-qr-code-redemption-system)
11. [Favourites System](#11-favourites-system)
12. [Loyalty Points & Tiers](#12-loyalty-points--tiers)
13. [Notifications System](#13-notifications-system)
14. [Account & Settings](#14-account--settings)
15. [Map Integration](#15-map-integration)
16. [Backend Integration](#16-backend-integration)
17. [Technical Architecture](#17-technical-architecture)

---

## 1. App Overview

**Ping Local** is a consumer-facing mobile application that connects users with exclusive offers and promotions from local independent businesses. The app enables users to discover local businesses, claim exclusive deals, redeem offers via QR codes, and earn loyalty points.

### Core Value Proposition
- Discover local independent businesses
- Access exclusive offers and promotions
- Earn loyalty points for every purchase
- Support local community businesses

---

## 2. Authentication & User Management

### 2.1 Welcome Screen
- App branding and introduction
- Options to Sign Up or Log In
- Clean, branded visual design

### 2.2 User Registration (Sign Up)
- **Required Fields:**
  - First Name
  - Surname
  - Email Address
  - Password (minimum 8 characters)
- Email validation
- Password strength requirements
- Automatic user profile creation in database

### 2.3 Login
- Email and password authentication
- Secure sign-in via Supabase Auth
- Session persistence
- Error handling with user-friendly messages

### 2.4 Email Verification
- Verification email sent on signup
- Email confirmation link/code system
- Resend verification option
- Navigation to onboarding after verification

### 2.5 Password Recovery
- "Forgot Password" flow
- Email-based password reset
- 6-digit OTP code verification
- Secure password update

### 2.6 Session Management
- Automatic session persistence
- Auth state listening
- Secure sign-out functionality
- Session refresh handling

---

## 3. Onboarding Experience

### 3.1 Onboarding Carousel
A 4-slide interactive onboarding tutorial introducing users to the app:

**Slide 1: "Discover"**
- Introduction to finding local independents
- "The best of Wirral's independents - tailored just for you"

**Slide 2: "Love"**
- Emphasis on community connection
- "Hidden gems, real smiles, warm welcomes, and stories to share"

**Slide 3: "Support"**
- Encouragement to support local businesses
- "You've made a choice to support real people"

**Slide 4: "Don't Miss Out"**
- Push notification permission request
- "Be first to hear about exclusive promotions"

### 3.2 Onboarding Features
- Horizontal swipeable carousel
- Progress dots indicator
- Back/Next navigation
- Push notification permission request on final slide
- One-time display (tracked in database)
- Replay option available in Settings

---

## 4. Main Navigation Structure

### 4.1 Bottom Tab Navigation
The app uses a 5-tab bottom navigation bar:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Feed** | Home icon | Main offer feed/homepage |
| **Favourites** | Heart icon | Saved offers and businesses |
| **Claimed** | Central button (elevated) | Claimed offers awaiting redemption |
| **Businesses** | Directory icon | Business directory/search |
| **Account** | Profile icon | User profile and settings |

### 4.2 Navigation Features
- Custom tab bar design with elevated center button
- Tab bar hides during QR redemption flow
- Stack navigation within each tab
- Deep linking support

---

## 5. Home / Feed Screen

### 5.1 Main Features
- **Header Section:**
  - User greeting with first name
  - Loyalty tier badge with current tier icon
  - Notification bell with unread count badge
  - Settings gear icon

- **Location Selection:**
  - Dropdown to select viewing area
  - Filters offers by location

- **Category Filter:**
  - Horizontal scrollable category pills
  - Filter offers by business category
  - "All" option to show all offers

### 5.2 Offer Display
- **Featured Offers Carousel:**
  - Horizontal scrollable featured offers
  - Large promotional cards
  - Auto-scroll capability

- **Offer Cards:**
  - Business featured image
  - Offer name and summary
  - Business name and location
  - Price/discount information
  - "Pay up front" or "Pay on the day" indicator
  - Category tags
  - Favourite heart button

### 5.3 Pull-to-Refresh
- Refresh offer list
- Update notification count
- Sync with latest data

---

## 6. Business Directory

### 6.1 Directory Screen
- Searchable list of all local businesses
- Filter by category
- Business cards with:
  - Featured image
  - Business name
  - Category
  - Location
  - Description summary

### 6.2 Business Detail Screen
- **Header Section:**
  - Large featured image/gallery
  - Business name and category
  - Location with map link

- **Information Sections:**
  - Full description
  - Opening times
  - Contact information (phone, website)
  - Address with directions

- **Business Offers:**
  - List of all current offers from this business
  - Quick claim access

- **Actions:**
  - Add to favourites
  - View on map
  - Call business
  - Visit website

---

## 7. Offers & Promotions System

### 7.1 Offer Types

**Pay Up Front Offers:**
- Payment required at claim time
- Processed through Stripe
- Instant purchase token generation
- Points awarded immediately

**Pay on the Day Offers:**
- Free to claim
- Payment made directly at business
- Bill amount entered by business at redemption
- Points awarded after redemption based on bill

### 7.2 Offer Detail Screen
- **Visual Header:**
  - Image gallery with swipeable images
  - Pagination dots

- **Offer Information:**
  - Offer name
  - Full description
  - Special notes/terms
  - Price and discount details
  - Quantity available (if limited)
  - Expiry date (if applicable)
  - Business policy

- **Business Details:**
  - Business name (clickable to profile)
  - Location
  - Category

- **Booking Information:**
  - Booking type indicator (if required)
  - External booking link/call button

- **Actions:**
  - "Claim Offer" / "Buy Now" button
  - Add to favourites
  - Share offer

### 7.3 Offer Statuses
- **Live:** Available for claiming
- **Sold Out:** Quantity limit reached
- **Expired:** Past end date
- **One Per Customer:** Claim restrictions apply

---

## 8. Offer Claiming Flow

### 8.1 Standard Claim Flow (Pay on the Day)
1. User taps "Claim Offer"
2. Terms acceptance (if applicable)
3. Purchase token created
4. Offer added to Claimed list
5. Ready for redemption

### 8.2 Payment Flow (Pay Up Front)
1. User taps "Buy Now"
2. Stripe payment sheet displayed
3. Card payment processed
4. Purchase token created with payment record
5. Points awarded immediately
6. Confirmation screen shown

### 8.3 Slot Booking Flow
For offers requiring time slot reservation:

**Slot Booking Screen:**
- Calendar strip (30-day view)
- Available dates highlighted
- Time slot selection grid
- Spots remaining indicator
- Party size selector (+/- buttons)
- Selected slot summary
- Continue to claim button

### 8.4 External Booking Flow
For offers requiring external booking:
- Booking confirmation screen
- External website/phone launch
- Booking date selection
- Confirmation checkbox
- Reminder scheduling option

---

## 9. Claimed Offers Management

### 9.1 Claimed Screen
- List of all claimed (unredeemed) offers
- Each claimed offer card shows:
  - Offer name
  - Business name
  - Claim date
  - Expiry date (if applicable)
  - Booking date/time (if booked)
  - Status indicator

### 9.2 Claimed Offer Actions
- **View Details:** Full offer information
- **Redeem Now:** Launch QR code screen
- **View Booking:** See slot/booking details
- **Cancel:** Remove claim (where permitted)

### 9.3 Offer States
- **Active:** Ready to redeem
- **Pending Booking:** Awaiting slot confirmation
- **Expired:** Past redemption window
- **Redeemed:** Successfully used

---

## 10. QR Code Redemption System

### 10.1 QR Code Screen
- **Display Elements:**
  - Large QR code (purchase token ID encoded)
  - Pulsing animation effect
  - "Waiting to be scanned" indicator
  - Offer name display
  - Business name display
  - Help instructions

- **Technical Features:**
  - Redemption token created on screen open
  - Real-time Supabase subscription
  - Auto-cleanup on exit (if not scanned)
  - Screen brightness optimization recommended

### 10.2 Redemption Flow

**Standard Redemption:**
1. User opens QR screen
2. Redemption token created in database
3. Staff scans QR code
4. Status updates in real-time
5. Navigate to success screen

**Pay on the Day Flow:**
1. Staff scans QR code
2. Staff enters bill amount
3. User sees Bill Confirmation screen
4. User confirms bill amount
5. Points calculated and awarded
6. Success screen displayed

### 10.3 Bill Confirmation Screen
- Bill amount display (entered by business)
- Points to be earned calculation
- Offer and business details
- Confirm button
- Dispute option
- Real-time loyalty points calculation

### 10.4 Redemption Success Screen
- Animated success graphic
- "Redeemed!" confirmation
- Offer and business name
- Thank you message
- Done button (returns to Claimed list)

---

## 11. Favourites System

### 11.1 Favourites Screen
- **Segmented Tabs:**
  - Offers tab
  - Businesses tab

- **Favourite Offers:**
  - Grid/list of favourited offers
  - Quick access to offer details
  - Easy unfavourite action

- **Favourite Businesses:**
  - List of favourited businesses
  - Quick access to business profile
  - See all offers from business

### 11.2 Favourite Actions
- Heart icon toggle on offer cards
- Heart icon on business profiles
- Persisted to database
- Synced across sessions

---

## 12. Loyalty Points & Tiers

### 12.1 Points System
- **Earning Rate:** 10 points per 10p spent (equivalent to 10 points per GBP 1)
- **Pay Up Front:** Points awarded at purchase
- **Pay on Day:** Points awarded after bill confirmation

### 12.2 Loyalty Tiers

| Tier | Points Required | Benefits |
|------|-----------------|----------|
| **Ping Local Member** | 0 - 10 | Basic access, earn points |
| **Ping Local Hero** | 10 - 1,200 | Early access, priority support |
| **Ping Local Champion** | 1,200 - 10,000 | Exclusive deals, monthly bonus |
| **Ping Local Legend** | 10,000+ | VIP access, double points days, concierge |

### 12.3 Loyalty Tiers Screen
- Visual tier progression display
- Current tier highlight
- Points to next tier
- Tier benefits explanation
- "How Points Work" section

### 12.4 Level Up Celebrations
- Tier upgrade notifications
- Visual celebration on level up
- New benefits highlighted

---

## 13. Notifications System

### 13.1 Push Notifications
- **Types:**
  - New offer alerts
  - Redemption confirmations
  - Loyalty points earned
  - Tier upgrades
  - System announcements
  - Booking reminders

- **Management:**
  - Permission request during onboarding
  - Toggle in Settings
  - Stored in database (activate_notifications)

### 13.2 In-App Notifications
- **Notifications Screen:**
  - Chronological list of all notifications
  - Unread indicator (blue dot)
  - Category icons (offer, points, system)
  - Time stamps ("2 hours ago")
  - Pull-to-refresh

- **Notification Detail:**
  - Full notification content
  - Related actions (view offer, etc.)
  - Mark as read

### 13.3 Notification Badge
- Header badge with unread count
- Real-time updates via Supabase subscriptions
- Visible across all screens

---

## 14. Account & Settings

### 14.1 Account Screen
- **Profile Section:**
  - User name display
  - Profile picture
  - Email address
  - Loyalty tier badge
  - Current points display

- **Quick Stats:**
  - Total offers claimed
  - Points earned
  - Current tier

### 14.2 Edit Profile Screen
- First name (editable)
- Surname (editable)
- Phone number (optional)
- Email (read-only, contact support to change)
- Save changes with validation

### 14.3 Settings Screen

**Account Section:**
- Edit Profile
- Notification Preferences

**Notifications Section:**
- Push Notifications toggle
- Email Notifications toggle

**Privacy Section:**
- Location Services toggle
- Privacy Policy link
- Terms of Service link

**Support Section:**
- FAQs screen
- Contact Support (email)
- Replay Onboarding

**Account Actions:**
- Sign Out (with confirmation)
- Delete Account (with warning)

### 14.4 FAQs Screen
- Categorized FAQ sections:
  - Getting Started
  - Loyalty Points
  - Payments
  - Account
  - Troubleshooting
- Expandable/collapsible answers
- Contact support option

### 14.5 Notification Preferences
- Granular notification type controls
- Push notification master toggle
- Email notification preferences

---

## 15. Map Integration

### 15.1 Map Screen
- Interactive map view
- Business location markers
- User location (with permission)
- Cluster markers for dense areas

### 15.2 Map Features
- Business marker taps open preview
- Navigate to business details
- Filter by category
- Distance from user
- Directions integration

---

## 16. Backend Integration

### 16.1 Supabase Services
- **Authentication:** User signup, login, password reset
- **Database:** PostgreSQL for all data storage
- **Real-time:** Live subscriptions for redemption flow
- **Edge Functions:** Push notification sending

### 16.2 Stripe Integration
- Secure payment processing
- Card payments for "Pay up front" offers
- Apple Pay / Google Pay support
- Payment sheet integration

### 16.3 Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles and preferences |
| `businesses` | Business listings |
| `offers` | Promotions and deals |
| `purchase_tokens` | Claimed offer records |
| `redemption_tokens` | Redemption tracking |
| `offer_slots` | Booking slots |
| `favourites` | User favourites |
| `notifications` | In-app notifications |
| `loyalty_points` | Points history |
| `image_gallery` | Offer/business images |

### 16.4 Real-time Features
- Redemption status updates
- Notification count updates
- Offer availability changes

---

## 17. Technical Architecture

### 17.1 Technology Stack
- **Framework:** React Native with Expo
- **Navigation:** React Navigation v6
- **State Management:** React Context API
- **Backend:** Supabase (Auth, Database, Real-time, Edge Functions)
- **Payments:** Stripe
- **Maps:** React Native Maps
- **QR Codes:** react-native-qrcode-svg

### 17.2 Key Dependencies
- `@react-navigation/native` - Navigation
- `@react-navigation/bottom-tabs` - Tab navigation
- `@react-navigation/stack` - Stack navigation
- `@supabase/supabase-js` - Backend services
- `@stripe/stripe-react-native` - Payments
- `expo-notifications` - Push notifications
- `expo-location` - Location services
- `react-native-maps` - Map views
- `react-native-qrcode-svg` - QR code generation
- `@react-native-async-storage/async-storage` - Local storage

### 17.3 Context Providers
- **AuthContext:** User authentication state
- **NotificationContext:** Notification count and management

### 17.4 Navigation Structure
```
RootNavigator
├── AuthStack (unauthenticated)
│   ├── Welcome
│   ├── Login
│   ├── SignUp
│   ├── Verification
│   ├── ForgotPassword
│   └── ResetPassword
├── Onboarding (post-verification)
└── MainTabs (authenticated)
    ├── Feed Stack
    │   ├── Home
    │   ├── OfferDetail
    │   ├── BusinessDetail
    │   ├── SlotBooking
    │   ├── Claim
    │   └── Settings/Notifications
    ├── Favourites Stack
    │   ├── Favourites
    │   └── OfferDetail/BusinessDetail
    ├── Claimed Stack
    │   ├── ClaimedMain
    │   ├── QRCode
    │   ├── BillConfirmation
    │   └── RedemptionSuccess
    ├── Businesses Stack
    │   ├── Directory
    │   ├── BusinessDetail
    │   └── Map
    └── Account Stack
        ├── Account
        ├── Settings
        ├── EditProfile
        ├── Notifications
        ├── NotificationDetail
        ├── NotificationPreferences
        ├── FAQs
        ├── LoyaltyTiers
        └── OnboardingReplay
```

---

## Summary

The Ping Local Consumer App is a comprehensive mobile platform that provides:

- **User-friendly authentication** with email verification and password recovery
- **Engaging onboarding** with notification permission handling
- **Rich offer discovery** through feeds, search, and maps
- **Flexible claiming** supporting both payment types and bookings
- **Seamless redemption** via real-time QR code scanning
- **Rewarding loyalty program** with tier progression
- **Comprehensive notifications** keeping users informed
- **Full account management** with profile editing and preferences

The app is built on modern, scalable technology and provides a polished user experience for discovering and supporting local independent businesses.

---

*Document prepared for client review - Ping Local Consumer App v1.0.0*
