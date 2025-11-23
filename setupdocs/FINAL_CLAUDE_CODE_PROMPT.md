# Ping Local - Native Consumer App (Final Prompt for Claude Code)

## Project Status & Context

**Current State:**
- ✅ Supabase project is live and configured
- ✅ Database schema deployed and populated with data
- ✅ Storage buckets created (business_images, offer_images, user_avatars)
- ✅ Adalo business/admin app connected to Supabase via Edge Functions
- ✅ Design assets collected (fonts, colors, screenshots)

**What We're Building:**
A React Native mobile app for Ping Local consumers (end users). This replaces the current Adalo consumer app while business/admin functions remain in Adalo during the transition.

---

## Tech Stack

- **Frontend**: React Native with Expo, TypeScript
- **Navigation**: React Navigation v6 (Tab + Stack navigators)
- **State Management**: React Context API
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Authentication, Database, Storage)
- **Payments**: Stripe (React Native Stripe SDK)
- **Notifications**: Expo Notifications (in-app + push)
- **Maps**: React Native Maps (for business locations)
- **QR Code**: react-native-qrcode-svg (generation only)
- **Date/Time**: date-fns
- **Forms**: react-hook-form
- **Image Loading**: expo-image

---

## Supabase Connection

**Project Details:**
```
SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g
```

**Note:** Database schema is already deployed and working. Just connect to it - no migration needed.

---

## Database Schema Reference

**Note:** This is for reference only. Schema is already deployed in Supabase.

### Core Tables

**users** - Consumer accounts (admins/business users are in Adalo)
- id, email, first_name, surname, password (bcrypt)
- phone_no, profile_pic (URL string)
- loyalty_points (integer), loyalty_tier (text)
- is_admin (boolean), is_business (boolean), is_test (boolean)
- verified (boolean), verification_code (text)
- activate_notifications (boolean)
- selected_location (text), selected_location_id (integer)
- selected_tags (text array)
- created, updated

**businesses** - All businesses using Ping Local
- id, name, email, description, description_summary
- location (full address), location_area (area name)
- phone_number, opening_times
- featured_image (URL string), category, sub_categories
- is_featured (boolean), is_signed_off (boolean)
- available_promotion_types (text)
- stripe_account_no, lead_rate, cut_percent
- currently_trading (boolean)
- created, updated

**offers** - Promotions/deals from businesses
- id, name, summary, full_description, special_notes
- offer_type ('Pay up front' or 'Pay on the day')
- requires_booking (boolean), booking_type ('external', 'call', null)
- booking_url (text), one_per_customer (boolean)
- price_discount (numeric), unit_of_measurement (text)
- quantity (integer), number_sold (integer), quantity_item (boolean)
- status ('Signed Off' = live, 'draft' = pending)
- start_date, end_date, finish_time
- business_id (FK to businesses), business_name (denormalized)
- featured_image (URL string), category
- customer_bill_input (boolean)
- change_button_text (custom CTA), custom_feed_text
- business_policy, policy_notes
- location_area, business_location
- created_by_id, created_by_name
- signed_off_by_id, signed_off_by_name
- rejection_reason
- created, updated

**user_offers** - Claimed/purchased promotions
- id, user_id (FK), offer_id (FK), business_id (FK)
- quantity (integer), total_paid (numeric)
- party_size (integer)
- booking_slot_date (date), booking_slot_time (time)
- status ('claimed', 'redeemed', 'expired')
- qr_code_data (text) - Format: "UO-{id}"
- claimed_at, redeemed_at
- loyalty_points_earned (integer)
- created, updated

**tags** - Categories and feature tags
- id, name, type ('Category' or 'tags')
- created, updated

**location_areas** - Geographic areas in Wirral
- id, name, featured_image (URL string)
- description, location, map_location
- created, updated

**loyalty_points** - Individual point transactions
- id, name (promotion name), amount
- user_id (FK), reason (text)
- date_received
- created, updated

**notifications** - User notifications
- id, name, content
- read (boolean)
- trigger_user_id (FK), receiver_id (FK)
- offer_id (FK), notifications_categories
- created, updated

**favorites** - User favorites
- id, user_id (FK)
- favoritable_type ('business' or 'offer')
- favoritable_id (integer)
- created
- UNIQUE(user_id, favoritable_type, favoritable_id)

**business_tags** - Many-to-many: businesses to tags
- business_id (FK), tag_id (FK)

**offer_tags** - Many-to-many: offers to tags
- offer_id (FK), tag_id (FK)

---

## Design System

### **Fonts**

**Typography System:**
- **Headers/Titles**: Geologica Bold, 28px
- **Body/Buttons**: Montserrat Semi-Bold, 16px
- **Labels/Small Text**: Montserrat Medium, 13px

**Implementation:**
```typescript
// If exact fonts unavailable, use closest system fonts:
// Geologica Bold → System: "Helvetica Neue Bold" or default bold
// Montserrat → System: "System" or default
```

### **Colors**

```typescript
const colors = {
  primary: '#36566F',      // Primary Blue
  secondary: '#63829D',    // Secondary Lighter Blue
  accent: '#F4E364',       // Yellow Highlight
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    light: '#F5F5F5',
    medium: '#9CA3AF',
    dark: '#374151'
  },
  error: '#EF4444',
  success: '#10B981'
}
```

### **Spacing**

Base spacing off of the Word document screenshots provided. Use Tailwind/NativeWind spacing scale (px, 1-4, etc.) as reference.

---

## Core App Functionality

### **User Journey Types**

Based on promotion configuration, users experience 5 different flows:

1. **Pay Up Front / No Booking**
   - View offer → Click "Buy Now" → Stripe payment → QR code generated → Success

2. **Pay Up Front / External Booking (Phone/URL)**
   - View offer → Click "Book & Buy" → External booking notice → Enter party size → Stripe payment → QR code generated → Success

3. **Pay Up Front / Call Booking**
   - View offer → Click "Book & Buy" → Show phone number to call → Enter party size → Stripe payment → QR code generated → Success

4. **Pay on Day / No Booking**
   - View offer → Click "Claim Now" → Confirm → QR code generated → Success (no payment, no points yet)

5. **Pay on Day / External Booking**
   - View offer → Click "Book & Claim" → External booking notice → Enter party size → Confirm → QR code generated → Success

**Excluded from Phase 1:** Online slot booking (date/time picker) - will add later

---

### **QR Code System**

**Generation (Native App):**
- Format: `UO-{user_offer_id}`
- Example: `UO-123`
- Generated when user claims/purchases promotion
- Stored in `user_offers.qr_code_data`

**Scanning & Redemption (Adalo - not our concern):**
- Adalo business app scans QR code
- Adalo handles all redemption logic
- Native app listens for real-time updates via Supabase Realtime

**Real-time Updates:**
```typescript
// Subscribe to user_offers changes
const subscription = supabase
  .channel('user_offer_updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_offers',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Update UI when offer is redeemed
      if (payload.new.status === 'redeemed') {
        showSuccessNotification()
        refreshClaimedOffers()
      }
    }
  )
  .subscribe()
```

---

### **Loyalty System**

**4-Tier System:**
- **Ping Local Member**: 0-10 points (default)
- **Ping Local Hero**: 10-1,200 points
- **Ping Local Champion**: 1,200-10,000 points
- **Ping Local Legend**: 10,000+ points

**Points Earning:**
- **Pay up front**: `cost × 10` points (awarded immediately on purchase)
- **Pay on day**: `bill × 10` points (awarded after redemption by business)

**Automatic Tier Updates:**
Database trigger automatically updates `loyalty_tier` when `loyalty_points` changes.

**Display Requirements:**
- Header icon showing current tier (dynamic)
- Account page with tier name and progress bar
- "Level up!" notification when tier changes
- Tier information page explaining all tiers

---

## Screen Structure & Implementation

### **Authentication Flow**

**1. Welcome Screen**
- Logo/branding
- "Login" button → Login Screen
- "Sign Up" button → Sign Up Screen
- Background image from design assets

**2. Sign Up Screen**
- Fields: Email, First Name, Surname, Password, Phone Number
- Email validation
- Password requirements (min 8 chars)
- Create user with `verified: false`
- Generate 6-digit verification code
- Send verification email (Supabase Auth)
- Navigate to Verification Screen

**3. Login Screen**
- Email and password fields
- "Forgot Password?" link
- Supabase Auth login
- Check `verified` status
- If not verified → Verification Screen
- If verified → Home Feed

**4. Verification Screen**
- Input field for 6-digit code
- Verify against `users.verification_code`
- "Resend code" button (generates new code)
- On success: Update `verified: true` → Navigate to Onboarding

**5. Onboarding Screens (1-4)**
- Swipeable carousel
- Screen 4: Request notification permissions
- "Skip" button on all screens
- "Next" button, final screen has "Get Started"
- After completing → Home Feed

---

### **Main Navigation (Bottom Tabs)**

```
📱 Bottom Tab Navigator:
├─ Home (Feed icon)
├─ Map (Map pin icon)  
├─ Favorites (Heart icon)
├─ Directory (List icon)
└─ Account (User icon)
```

**Global Header Elements:**
- **Left**: Loyalty tier icon (changes based on points)
- **Right**: Notification bell with unread badge

---

### **HOME TAB**

#### **Home Feed Screen**

**Features:**
- Pull-to-refresh
- Infinite scroll pagination
- Filter/sort bar at top:
  - Location dropdown (All Locations, Birkenhead, Oxton, West Kirby, etc.)
  - Category chips (scrollable)
  - Sort by: Proximity, Ending Soon, Newest

**Promotion Card:**
```
┌─────────────────────────────────────┐
│ [Featured Image]                     │
│                                      │
│ Title (Geologica Bold 28px)         │
│ Business Name (Montserrat 16px)     │
│ Location Area • Ends: Nov 30        │
│ 📍 0.5 mi away                       │
│ [Featured Badge if applicable]      │
└─────────────────────────────────────┘
```

**Data Loading:**
```typescript
const { data: offers } = await supabase
  .from('offers')
  .select(`
    *,
    businesses!inner(
      id, name, location_area, featured_image, location
    )
  `)
  .eq('status', 'Signed Off')
  .gte('end_date', new Date().toISOString())
  .order('created', { ascending: false })
  .range(page * limit, (page + 1) * limit - 1)
```

**Filtering:**
- By location_area
- By tags (join with offer_tags)
- By proximity (calculate distance using Haversine or PostGIS)

**Tap card** → Navigate to Promotion Detail Screen

---

#### **Promotion Detail Screen**

**Layout (from top to bottom):**

1. **Hero Section**
   - Featured image (full width)
   - If quantity-based: "X remaining" overlay badge
   - Favorite button (heart icon, top right)

2. **Header Section**
   - Title (Geologica Bold 28px)
   - Business name (tappable → Business Detail)
   - Location area
   - Tags as chips

3. **Buy Now Block** (sticky or prominent card)
   - CTA button with dynamic text:
     - "Buy Now" (pay upfront, no booking)
     - "Book & Buy" (pay upfront, booking required)
     - "Claim Now" (pay on day, no booking)
     - "Book & Claim" (pay on day, booking required)
     - Or use `change_button_text` if set
   - Price (if pay_upfront): £XX.XX
   - Unit: "per person" / "per item" / "per box"
   - End date with countdown

4. **Ended Banner** (if offer expired)
   - Red banner: "This promotion ended on {end_date}"

5. **Description Section**
   - Full description text
   - Special notes (highlighted if present)

6. **Details Section**
   - Quantity remaining (if applicable)
   - One per customer badge (if applicable)
   - Start date / End date

7. **Terms & Conditions**
   - Expandable section or link to modal
   - Business policy (if set)
   - Policy notes (if set)

8. **Image Gallery**
   - Horizontal scrollable (if multiple images)

9. **Business Card**
   - Mini business info
   - "View on map" button
   - "View all promotions" link

**Action: Tap Buy/Claim Button** → Navigate based on booking_type

---

#### **Claim/Purchase Flow**

**Entry Point:** "Buy Now" / "Book & Buy" / "Claim Now" button on Promotion Detail

**Flow Decision Tree:**

```typescript
function handleClaimPress(offer) {
  if (!offer.requires_booking) {
    // No booking required
    navigation.navigate('PaymentScreen', { offer })
  } else {
    // Booking required
    if (offer.booking_type === 'external') {
      // External URL booking
      navigation.navigate('ExternalBookingScreen', { 
        offer,
        type: 'url'
      })
    } else if (offer.booking_type === 'call') {
      // Phone call booking
      navigation.navigate('ExternalBookingScreen', { 
        offer,
        type: 'phone'
      })
    } else {
      // Slot booking (Phase 2 - show coming soon)
      showAlert('Online booking coming soon!')
    }
  }
}
```

---

#### **External Booking Screen**

**For booking_type === 'external' (URL):**
- Display message: "You'll need to book via {business_name}"
- Show external URL as button/link
- Input: Party size (number input)
- "Continue to Checkout" button
- Navigate to Payment/Claim Screen

**For booking_type === 'call':**
- Display message: "Call {business_name} to book"
- Show phone number as tappable (opens phone dialer)
- Input: Party size (number input)
- "Continue to Checkout" button
- Navigate to Payment/Claim Screen

---

#### **Payment/Claim Screen**

**Display:**
- Offer summary (image, title, business)
- Booking info (if applicable)
- Party size (if applicable)
- Quantity selector (if offer allows)
- Total calculation

**If offer_type === 'Pay up front':**

Use Stripe Payment Sheet:

```typescript
// 1. Create payment intent via Supabase Edge Function
const { data: paymentIntent } = await supabase.functions.invoke('create-payment-intent', {
  body: {
    amount: offer.price_discount * quantity * 100, // cents
    offerId: offer.id,
    userId: user.id,
    quantity,
    partySize
  }
})

// 2. Show Stripe Payment Sheet
const { error } = await initPaymentSheet({
  merchantDisplayName: 'Ping Local',
  paymentIntentClientSecret: paymentIntent.client_secret
})

const { error: paymentError } = await presentPaymentSheet()

// 3. If successful, create user_offer
if (!paymentError) {
  const { data: userOffer } = await supabase
    .from('user_offers')
    .insert({
      user_id: user.id,
      offer_id: offer.id,
      business_id: offer.business_id,
      quantity,
      total_paid: offer.price_discount * quantity,
      party_size: partySize,
      status: 'claimed',
      qr_code_data: `UO-${Date.now()}`, // Temporary, will be set to actual ID
      claimed_at: new Date().toISOString()
    })
    .select()
    .single()

  // Update with actual ID
  await supabase
    .from('user_offers')
    .update({ qr_code_data: `UO-${userOffer.id}` })
    .eq('id', userOffer.id)

  // 4. Award loyalty points
  const pointsEarned = Math.floor(offer.price_discount * quantity * 10)
  
  await supabase.from('loyalty_points').insert({
    user_id: user.id,
    amount: pointsEarned,
    name: offer.name,
    reason: 'Purchasing Promotion',
    date_received: new Date().toISOString()
  })

  // Update user's total points (triggers tier update automatically)
  const { data: userData } = await supabase
    .from('users')
    .select('loyalty_points, loyalty_tier')
    .eq('id', user.id)
    .single()

  await supabase
    .from('users')
    .update({ 
      loyalty_points: userData.loyalty_points + pointsEarned 
    })
    .eq('id', user.id)

  // 5. Navigate to success
  navigation.navigate('SuccessScreen', {
    pointsEarned,
    leveledUp: checkIfLeveledUp(userData.loyalty_tier, pointsEarned),
    userOfferId: userOffer.id
  })
}
```

**If offer_type === 'Pay on the day':**

Simple confirmation:

```typescript
// Just create the user_offer, no payment
const { data: userOffer } = await supabase
  .from('user_offers')
  .insert({
    user_id: user.id,
    offer_id: offer.id,
    business_id: offer.business_id,
    quantity,
    party_size: partySize,
    status: 'claimed',
    qr_code_data: `UO-${Date.now()}`,
    claimed_at: new Date().toISOString()
  })
  .select()
  .single()

// Update with actual ID
await supabase
  .from('user_offers')
  .update({ qr_code_data: `UO-${userOffer.id}` })
  .eq('id', userOffer.id)

// No loyalty points yet - awarded at redemption
navigation.navigate('SuccessScreen', {
  payOnDay: true,
  userOfferId: userOffer.id
})
```

---

#### **Success Screen**

**Display:**
- Lottie celebration animation
- Success message: "Promotion Claimed!" or "Purchase Complete!"
- Points earned (if pay upfront): "You earned {points} points!"
- Level up message (if applicable): "You leveled up to {tier}!"
- "View My Promotions" button → Claimed Promotions screen
- "Continue Browsing" button → Home Feed

---

### **MAP TAB**

#### **Map View Screen**

**Features:**
- React Native Maps full screen
- Show current user location (if permission granted)
- Map pins for each active promotion (business locations)
- Pin clustering for nearby businesses
- Tap pin → Show promotion preview card (bottom sheet)
- Tap preview card → Navigate to Promotion Detail
- Filter button (same filters as Home Feed)
- "List View" toggle button → Switch to Home Feed

**Implementation:**
```typescript
<MapView
  initialRegion={{
    latitude: userLatitude || 53.4084, // Wirral center
    longitude: userLongitude || -3.0070,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1
  }}
>
  {offers.map(offer => (
    <Marker
      key={offer.id}
      coordinate={{
        latitude: offer.businesses.latitude,
        longitude: offer.businesses.longitude
      }}
      onPress={() => showOfferPreview(offer)}
    />
  ))}
</MapView>
```

---

### **FAVORITES TAB**

#### **Favorites Screen**

**Top Tab Navigator:**
- "Businesses" tab
- "Promotions" tab

**Businesses Tab:**
- List of favorited businesses
- Business card: name, location, features, live promotions count
- Tap → Navigate to Business Detail

**Promotions Tab:**
- List of favorited promotions
- Promotion card (same as Home Feed)
- Tap → Navigate to Promotion Detail

**Empty States:**
- "No favorites yet" with illustration
- "Start exploring" CTA → Navigate to Home or Directory

**Data Loading:**
```typescript
const { data: favBusinesses } = await supabase
  .from('favorites')
  .select(`
    *,
    businesses(*)
  `)
  .eq('user_id', userId)
  .eq('favoritable_type', 'business')

const { data: favOffers } = await supabase
  .from('favorites')
  .select(`
    *,
    offers(*, businesses(*))
  `)
  .eq('user_id', userId)
  .eq('favoritable_type', 'offer')
```

---

### **DIRECTORY TAB**

#### **Business Directory Screen**

**Layout:**

1. **Search Bar** (top)
   - Search by business name
   - Filter button → Opens filter modal

2. **Featured Section**
   - Horizontal scrollable carousel
   - Larger cards for featured businesses
   - Query: `is_featured: true`

3. **All Businesses List**
   - Vertical scrollable list
   - Business card with:
     - Featured image
     - Name
     - Location area
     - Category tags
     - Live promotions count

**Data Loading:**
```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select(`
    *,
    offers!inner(count)
  `)
  .eq('is_signed_off', true)
  .eq('currently_trading', true)
  .order('is_featured', { ascending: false })
  .order('name')
```

**Tap business** → Navigate to Business Detail Screen

---

#### **Business Detail Screen**

**Layout:**

1. **Header**
   - Featured image (full width)
   - Business name overlaid
   - Location area
   - Favorite button (heart icon)

2. **Info Section**
   - Category tags (chips)
   - Phone number (tappable → call)
   - Opening times
   - Description

3. **Promotions Section**
   - "Active Promotions" header
   - List of active offers from this business
   - "View all" link → Filter Home Feed by business

4. **Location Section**
   - Embedded map showing business location
   - "Get Directions" button → Open in maps app

**Data Loading:**
```typescript
const { data: business } = await supabase
  .from('businesses')
  .select(`
    *,
    offers!inner(
      *
    )
  `)
  .eq('id', businessId)
  .eq('offers.status', 'Signed Off')
  .single()
```

---

### **ACCOUNT TAB**

#### **My Account Screen**

**Layout:**

1. **Loyalty Section** (top card)
   - Large tier icon (center)
   - Tier name (Geologica Bold)
   - Points display: "X / Y points"
   - Progress bar to next tier
   - Tap → Navigate to Loyalty Scheme Info

2. **Quick Actions** (cards/buttons)
   - "My Claimed Promotions" → Claimed Promotions Screen
   - "Notifications" (with unread badge) → Notifications Screen
   - "Settings" → Settings Screen

3. **Redemption History**
   - Scrollable list of past redeemed offers
   - Show: date, business name, points earned

**Data Loading:**
```typescript
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

const { data: history } = await supabase
  .from('user_offers')
  .select(`
    *,
    offers(name),
    businesses(name)
  `)
  .eq('user_id', userId)
  .eq('status', 'redeemed')
  .order('redeemed_at', { ascending: false })
  .limit(10)
```

---

#### **Claimed Promotions Screen**

**Empty State:**
- Illustration
- "No claimed promotions yet"
- "Start browsing" CTA → Home Feed

**Active Offers List:**
Cards showing:
- Featured image
- Promotion title
- Business name, location
- Booking details (date/time if applicable)
- Expiry date or "Expires: Nov 30"
- Price paid (if applicable)
- "Redeem Now" button

**Status Indicators:**
- 🟢 "Active" (green badge)
- 🟡 "Expiring Soon" (yellow badge, < 3 days)
- 🔴 "Expired" (red badge, greyed out)

**Tap "Redeem Now"** → Show QR Code Modal

**Data Loading:**
```typescript
const { data: claimedOffers } = await supabase
  .from('user_offers')
  .select(`
    *,
    offers(*),
    businesses(name, location_area)
  `)
  .eq('user_id', userId)
  .in('status', ['claimed', 'expired'])
  .order('claimed_at', { ascending: false })
```

---

#### **QR Code Modal**

**Display:**
- Full-screen modal or bottom sheet
- Large QR code (generated from `qr_code_data`)
- Promotion title and business name
- Instructions: "Show this QR code to the business"
- Close button

**QR Code Generation:**
```typescript
import QRCode from 'react-native-qrcode-svg'

<QRCode
  value={userOffer.qr_code_data} // e.g., "UO-123"
  size={250}
  backgroundColor="white"
  color="black"
/>
```

**Real-time Redemption Monitoring:**
```typescript
// Subscribe to changes while modal is open
useEffect(() => {
  const subscription = supabase
    .channel(`user_offer_${userOfferId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_offers',
        filter: `id=eq.${userOfferId}`
      },
      (payload) => {
        if (payload.new.status === 'redeemed') {
          showSuccessAnimation()
          closeModal()
          // If pay_on_day, points will already be awarded by Adalo
          refreshClaimedOffers()
        }
      }
    )
    .subscribe()

  return () => subscription.unsubscribe()
}, [userOfferId])
```

---

#### **Notifications Screen**

**Features:**
- List of notifications (newest first)
- Unread notifications highlighted
- Tap notification:
  - Mark as read
  - Navigate to related content (offer, business)
- "Mark all as read" button (top right)

**Data Loading:**
```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('receiver_id', userId)
  .order('created', { ascending: false })
  .limit(50)
```

**Mark as Read:**
```typescript
await supabase
  .from('notifications')
  .update({ read: true })
  .eq('id', notificationId)
```

---

#### **Settings Screen**

**Options:**
- Change User Details → Edit Profile Screen
- Change Password → Change Password Screen
- Location Preferences toggle
- Notification Preferences toggle
- FAQ → FAQ Section
- Delete Account (with confirmation)
- Logout

**Implementation:**
```typescript
// Update user details
await supabase
  .from('users')
  .update({
    first_name,
    surname,
    phone_no
  })
  .eq('id', userId)

// Change password
await supabase.auth.updateUser({
  password: newPassword
})

// Toggle notifications
await supabase
  .from('users')
  .update({
    activate_notifications: !currentValue
  })
  .eq('id', userId)

// Logout
await supabase.auth.signOut()
navigation.navigate('Welcome')
```

---

#### **Loyalty Scheme Info Screen**

**Display:**
- Header explaining the program
- 3 tier cards (exclude Local Member since it's default):
  - **Local Hero**: 10-1,200 points
  - **Local Champion**: 1,200-10,000 points
  - **Local Legend**: 10,000+ points
- Each card shows:
  - Tier icon
  - Tier name
  - Point range
  - Benefits/description

---

## State Management Architecture

Use React Context API for global state:

```typescript
// contexts/AuthContext.tsx
const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signIn: async (email, password) => {},
  signUp: async (email, password, data) => {},
  signOut: async () => {},
})

// contexts/UserContext.tsx
const UserContext = createContext({
  userData: null, // Full user data from users table
  loyaltyPoints: 0,
  loyaltyTier: 'Ping Local Member',
  refreshUserData: async () => {},
})

// contexts/NotificationContext.tsx
const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  refreshNotifications: async () => {},
  markAsRead: async (id) => {},
})
```

---

## Notifications Implementation

### **In-App Notifications**

Display badge on notification bell icon in header.

### **Push Notifications**

**Setup:**
1. Configure Expo Push Notifications
2. Request permissions on Onboarding Screen 4
3. Store push token in Supabase:

```typescript
import * as Notifications from 'expo-notifications'

// Request permission and get token
const { status } = await Notifications.requestPermissionsAsync()
if (status === 'granted') {
  const token = await Notifications.getExpoPushTokenAsync()
  
  // Save to Supabase (add push_token column to users table)
  await supabase
    .from('users')
    .update({ push_token: token.data })
    .eq('id', userId)
}
```

**Notification Types:**
- Promotion ending soon (24h before end_date)
- New promotion from favorite business
- Redemption confirmation (when QR scanned)
- Level up notification

**Note:** Push notifications are sent by Supabase Edge Functions or external service, not the mobile app.

---

## Error Handling & Edge Cases

### **Network Errors**
- Show error toast/banner
- Retry button
- Offline mode message

### **Payment Errors**
- Clear error messages from Stripe
- Allow retry without losing data
- Handle incomplete payments

### **Expired Promotions**
- Grey out expired offers
- Disable "Redeem" button
- Show "Expired" badge

### **Sold Out Promotions**
- Hide from feed if `quantity_remaining <= 0`
- Or show with "Sold Out" badge

### **Authentication Errors**
- Invalid credentials → Clear error message
- Unverified account → Redirect to verification
- Session expired → Redirect to login

---

## Testing Requirements

### **Test Scenarios to Support:**

1. **Authentication Flow**
   - Sign up with valid/invalid email
   - Verification code (correct/incorrect)
   - Login with verified/unverified account
   - Password reset

2. **Browse & Filter**
   - Load promotions from Supabase
   - Filter by location area
   - Filter by category tags
   - Sort by proximity, end date, newest

3. **Purchase Flow (Pay Up Front)**
   - Select promotion
   - Complete Stripe payment with test card
   - Verify user_offer created
   - Verify loyalty points awarded
   - Verify QR code generated

4. **Claim Flow (Pay on Day)**
   - Select promotion
   - Complete claim (no payment)
   - Verify user_offer created
   - Verify QR code generated
   - Verify NO loyalty points yet

5. **External Booking**
   - Select promotion requiring external booking
   - Enter party size
   - Complete purchase/claim

6. **QR Code Generation**
   - Open claimed promotion
   - Generate QR code
   - Verify format: `UO-{id}`

7. **Loyalty System**
   - Award points on purchase
   - Verify tier updates automatically
   - Test tier thresholds (10, 1200, 10000)

8. **Favorites**
   - Add/remove business to favorites
   - Add/remove promotion to favorites
   - View favorites list

9. **Real-time Updates**
   - Simulate offer redemption (update in Supabase)
   - Verify UI updates via Realtime subscription

10. **Notifications**
    - Create notification in Supabase
    - Verify appears in notifications list
    - Mark as read

---

## Performance Optimization

### **Image Loading**
- Use expo-image with placeholders
- Lazy load images in lists
- Cache images locally

### **List Performance**
- Use FlatList with proper key extraction
- Implement pagination (limit 20-50 per page)
- Use memo for list items
- virtualization for long lists

### **State Management**
- Memoize expensive calculations (tier, proximity)
- Debounce search inputs (300ms)
- Cache user data in Context

### **Network**
- Implement retry logic with exponential backoff
- Cache frequently accessed data (tags, location_areas)
- Use Supabase query optimization (select only needed fields)

---

## Security Considerations

### **Authentication**
- Use Supabase Auth (secure by default)
- Store JWT tokens securely (handled by Supabase)
- Implement session refresh

### **API Keys**
- Store in environment variables
- Use anon key (safe for client-side)
- Never expose service_role key

### **Payments**
- Use Stripe Payment Sheet (PCI compliant)
- All payment processing server-side (Edge Functions)
- Store payment intent IDs, not card details

### **QR Codes**
- Currently simple format (UO-{id})
- Phase 2: Add timestamp + signature for enhanced security

---

## File Structure

```
ping-local-app/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Auth stack
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── verification.tsx
│   ├── (onboarding)/             # Onboarding stack
│   │   ├── step1.tsx
│   │   ├── step2.tsx
│   │   ├── step3.tsx
│   │   └── step4.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── home.tsx
│   │   ├── map.tsx
│   │   ├── favorites.tsx
│   │   ├── directory.tsx
│   │   └── account.tsx
│   └── index.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Base components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── promotions/
│   │   │   ├── PromotionCard.tsx
│   │   │   ├── PromotionDetail.tsx
│   │   │   └── PromotionFilters.tsx
│   │   ├── business/
│   │   │   ├── BusinessCard.tsx
│   │   │   └── BusinessDetail.tsx
│   │   ├── loyalty/
│   │   │   ├── TierIcon.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── TierCard.tsx
│   │   └── qr/
│   │       └── QRCodeGenerator.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── UserContext.tsx
│   │   └── NotificationContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUser.ts
│   │   ├── useOffers.ts
│   │   ├── useBusinesses.ts
│   │   └── useNotifications.ts
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── stripe.ts             # Stripe setup
│   │   └── notifications.ts      # Notification setup
│   ├── utils/
│   │   ├── loyalty.ts            # Tier calculations
│   │   ├── distance.ts           # Proximity calculations
│   │   ├── formatting.ts         # Date/currency formatting
│   │   └── validation.ts         # Form validation
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── fonts.ts
│   │   └── config.ts
│   └── types/
│       ├── database.ts           # Supabase types
│       └── index.ts
├── assets/
│   ├── images/
│   ├── fonts/
│   └── animations/               # Lottie files
├── .env
├── app.json
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Create `.env` file:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dWZ2YXVoanFmZmZlenB0dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NTExMDQsImV4cCI6MjA3OTMyNzEwNH0.IEhzK1gNDqaS2q9656CBsx9JZBRHYZAfHYYKIVd4S5g

# Stripe (get publishable key from Stripe dashboard)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App Config
EXPO_PUBLIC_APP_ENV=development
```

---

## Launch Checklist

### **Phase 1 Complete When:**
- [ ] Users can sign up and verify email
- [ ] Users can browse and filter promotions
- [ ] Users can favorite businesses and promotions
- [ ] Users can purchase "Pay up front" promotions with Stripe
- [ ] Users can claim "Pay on day" promotions
- [ ] External booking flow works (phone/URL)
- [ ] QR codes generate correctly (format: UO-{id})
- [ ] Loyalty points calculate and award correctly
- [ ] Loyalty tiers update automatically
- [ ] Claimed promotions display with QR codes
- [ ] Real-time updates work (redemption status)
- [ ] Notifications display (in-app)
- [ ] Push notifications work
- [ ] Map view shows promotion locations
- [ ] Business directory and details work
- [ ] Account settings functional
- [ ] App tested on iOS and Android
- [ ] Design matches screenshots (fonts, colors, spacing)

---

## What's NOT in Phase 1 (Future Phases)

- ❌ Online slot booking (date/time picker)
- ❌ QR code scanning (Adalo handles this)
- ❌ Admin/business interfaces (stay in Adalo)
- ❌ Advanced search features
- ❌ Social features (sharing, reviews)
- ❌ Referral system
- ❌ In-app chat/support
- ❌ Multiple payment methods (only Stripe for now)
- ❌ Offline mode (beyond basic caching)

---

## Development Workflow

### **Day 1-2: Setup**
- Initialize Expo project with TypeScript
- Install dependencies
- Configure NativeWind
- Set up Supabase client
- Create basic navigation structure

### **Day 3-5: Authentication**
- Build auth screens
- Implement Supabase Auth
- Email verification flow
- Onboarding screens

### **Day 6-10: Core Features**
- Home feed with promotion cards
- Promotion detail screen
- Filtering and sorting
- Business directory
- Business detail screen

### **Day 11-15: Purchase Flow**
- Payment/claim screens
- Stripe integration
- External booking screens
- Success screens
- Loyalty point logic

### **Day 16-18: User Account**
- Claimed promotions list
- QR code generation
- Real-time redemption updates
- Account settings
- Notifications

### **Day 19-20: Polish**
- Map view
- Favorites
- Loading states
- Error handling
- Animations

### **Day 21-23: Testing**
- Test all user journeys
- Fix bugs
- Test on physical devices
- Performance optimization

### **Day 24-25: Deployment Prep**
- Configure app.json for production
- Set up EAS Build
- Prepare app store assets
- Final testing

---

## Success Criteria

**The app is ready to launch when:**
1. All Phase 1 features work reliably
2. Design matches screenshots (within reasonable variation)
3. No critical bugs
4. Tested on both iOS and Android
5. Stripe payments work with test cards
6. QR codes generate correctly
7. Real-time updates function properly
8. Notifications send successfully
9. Performance is acceptable (no major lag)
10. Code is clean and maintainable

---

## Support & Resources

**Supabase Project:** https://supabase.com/dashboard/project/pyufvauhjqfffezptuxl

**Documentation:**
- Expo: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs/payments/accept-a-payment?platform=react-native

**Design Assets:**
- Fonts: Geologica, Montserrat (or system alternatives)
- Colors: #36566F, #63829D, #F4E364
- Screenshots: Provided in Word document

---

## Final Notes

This is a comprehensive native app replacing the Adalo consumer experience. The focus is on performance, reliability, and matching the existing design. Business/admin functionality remains in Adalo during transition.

**Start building, test frequently, and iterate based on real usage!** 🚀
