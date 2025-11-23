# Ping Local - Native User App Development Prompt (Updated with Adalo Schema)

## Project Overview

Build a React Native (Expo) mobile application for Ping Local's consumer-facing side. This app will connect to an existing Supabase database that mirrors the current Adalo structure, allowing the business/admin sides to remain on Adalo while the user-facing app becomes native.

**Critical**: The database schema must exactly match the existing Adalo structure to maintain compatibility during the transition period.

## Tech Stack

- **Frontend**: React Native with Expo, TypeScript
- **Navigation**: React Navigation (Tab + Stack navigators)
- **State Management**: React Context API
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL Database with Row Level Security)
- **Animations**: Lottie (for onboarding and success screens)
- **Payments**: Stripe integration (React Native Stripe SDK)
- **Notifications**: Expo Notifications
- **Maps**: React Native Maps
- **QR Code**: React Native QR Code Scanner & Generator

## Database Schema (Matching Adalo Structure)

### Core Tables - EXACT Adalo Field Mapping

```sql
-- Users Table (from Users CSV)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  surname TEXT,
  password TEXT, -- Hashed with bcrypt
  phone_no TEXT,
  profile_pic JSONB, -- Stores image metadata like Adalo
  loyalty_points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  is_business BOOLEAN DEFAULT FALSE,
  is_test BOOLEAN DEFAULT FALSE,
  viewing_date TIMESTAMP,
  last_notify_clear TIMESTAMP,
  business TEXT, -- Business name reference
  activate_notifications BOOLEAN DEFAULT FALSE,
  favourite_business TEXT, -- Business name reference
  verification_code TEXT,
  verified BOOLEAN DEFAULT FALSE,
  api_requires_sync BOOLEAN DEFAULT FALSE,
  api_last_sync_date TIMESTAMP,
  loyalty_tier TEXT DEFAULT 'Ping Local Member',
  selected_location TEXT,
  selected_location_id INTEGER,
  selected_tags TEXT[], -- Array for tags
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Businesses Table (from Businesses CSV)
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  featured_image JSONB, -- JSON structure: {'url': '...', 'size': ..., 'width': ..., 'height': ..., 'filename': '...', 'metadata': {...}}
  email TEXT,
  description TEXT,
  description_summary TEXT,
  location TEXT, -- Full address
  phone_number TEXT,
  opening_times TEXT,
  available_promotion_types TEXT, -- 'Pay up front', 'Pay on the day', 'Both'
  is_featured BOOLEAN DEFAULT FALSE,
  is_signed_off BOOLEAN DEFAULT FALSE,
  location_area TEXT, -- Area name (e.g., 'Oxton', 'West Kirby')
  primary_user TEXT,
  owner_id INTEGER,
  category TEXT,
  sub_categories TEXT,
  stripe_account_no TEXT,
  lead_rate NUMERIC,
  cut_percent NUMERIC,
  api_requires_sync BOOLEAN DEFAULT FALSE,
  api_last_sync_date TIMESTAMP,
  currently_trading BOOLEAN DEFAULT FALSE,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Offers (Promotions) Table (from Offers CSV)
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT,
  full_description TEXT,
  special_notes TEXT,
  offer_type TEXT, -- 'Pay up front' or 'Pay on the day'
  requires_booking BOOLEAN DEFAULT FALSE,
  booking_type TEXT, -- 'external', 'online', 'call', or NULL
  one_per_customer BOOLEAN DEFAULT FALSE,
  price_discount NUMERIC,
  unit_of_measurement TEXT, -- 'Person', 'Item', 'Box', etc.
  quantity INTEGER,
  number_sold INTEGER DEFAULT 0,
  quantity_item BOOLEAN DEFAULT FALSE,
  status TEXT, -- 'Signed Off', 'draft'
  finish_time TIMESTAMP,
  booking_url TEXT,
  business_id INTEGER REFERENCES businesses(id),
  business_name TEXT, -- Denormalized for Adalo compatibility
  featured_image JSONB, -- Same JSON structure as businesses
  category TEXT,
  customer_bill_input BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by_id INTEGER,
  created_by_name TEXT,
  signed_off_by_name TEXT,
  signed_off_by_id INTEGER,
  rejection_reason TEXT,
  business_policy TEXT,
  policy_notes TEXT,
  pricing_complete BOOLEAN DEFAULT FALSE,
  api_requires_sync BOOLEAN DEFAULT FALSE,
  api_last_sync_date TIMESTAMP,
  business_location TEXT, -- Denormalized address
  location_area TEXT,
  change_button_text TEXT, -- Custom CTA text
  custom_feed_text TEXT,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Tags Table (from Tags CSV)
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'Category' or 'tags'
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Location Areas Table (from Location_Area CSV)
CREATE TABLE location_areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  featured_image JSONB,
  description TEXT,
  location TEXT,
  map_location TEXT, -- Full address for geocoding
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Loyalty Points Table (from LoyaltyPoints CSV)
CREATE TABLE loyalty_points (
  id SERIAL PRIMARY KEY,
  name TEXT, -- Promotion name
  amount NUMERIC,
  user_id INTEGER REFERENCES users(id),
  reason TEXT, -- 'Purchasing Promotion', 'Claimed Promotion', 'Redeemed Promotion', 'redemption'
  date_received TIMESTAMP,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Notifications Table (from Notifications CSV)
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  name TEXT,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  trigger_user_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  offer_id INTEGER REFERENCES offers(id),
  notifications_categories TEXT,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- User Offers (Claimed/Purchased Promotions) - INFERRED from relationships
CREATE TABLE user_offers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  offer_id INTEGER REFERENCES offers(id),
  business_id INTEGER REFERENCES businesses(id),
  quantity INTEGER DEFAULT 1,
  total_paid NUMERIC,
  party_size INTEGER,
  booking_slot_date DATE,
  booking_slot_time TIME,
  status TEXT, -- 'claimed', 'redeemed', 'expired'
  qr_code_data TEXT, -- Unique identifier for QR code
  claimed_at TIMESTAMP DEFAULT NOW(),
  redeemed_at TIMESTAMP,
  loyalty_points_earned INTEGER DEFAULT 0,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Offer Slots (for slot-based bookings) - INFERRED
CREATE TABLE offer_slots (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id),
  slot_date DATE,
  slot_time TIME,
  capacity INTEGER,
  booked_count INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Favorites - INFERRED from Users.favourite_business field
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  favoritable_type TEXT, -- 'business' or 'offer'
  favoritable_id INTEGER,
  created TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, favoritable_type, favoritable_id)
);

-- Many-to-Many: Offers to Tags
CREATE TABLE offer_tags (
  offer_id INTEGER REFERENCES offers(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (offer_id, tag_id)
);

-- Many-to-Many: Businesses to Tags
CREATE TABLE business_tags (
  business_id INTEGER REFERENCES businesses(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (business_id, tag_id)
);

-- Image Gallery (for additional offer/business images) - INFERRED
CREATE TABLE image_gallery (
  id SERIAL PRIMARY KEY,
  imageable_type TEXT, -- 'offer' or 'business'
  imageable_id INTEGER,
  image_data JSONB, -- Same JSON structure as featured_image
  display_order INTEGER DEFAULT 0,
  created TIMESTAMP DEFAULT NOW()
);
```

### Critical Data Structure Notes

**Image Storage Format** (matching Adalo):
```json
{
  "url": "hash.jpg",
  "size": 1234567,
  "width": 4032,
  "height": 3024,
  "filename": "original_filename.jpg",
  "metadata": {
    "width": 4032,
    "height": 3024,
    "blurHash": "eXXXXXXX",
    "blurHashWidth": 32
  }
}
```

**Offer Type Values** (from CSV):
- `"Pay up front"` - User pays in app before redemption
- `"Pay on the day"` - User claims, pays at business
- `"Both"` - Business accepts both (check per offer)

**Booking Type Values** (from CSV):
- `NULL` or empty - No booking required
- `"external"` - Book via phone/URL outside app
- `"online"` - Book through app slots (not yet seen in CSV)
- `"call"` - Book via phone call
- May also have slot-based bookings (time slot selection)

**Status Values**:
- Offers: `"Signed Off"` (live), `"draft"` (pending)
- User Offers: `"claimed"`, `"redeemed"`, `"expired"`

**Loyalty Tiers** (from CSV):
- `"Ping Local Member"` (0-10 points)
- `"Ping Local Hero"` (10-1,200 points)
- `"Ping Local Champion"` (1,200-10,000 points)
- `"Ping Local Legend"` (10,000+ points)

## Database Functions and Triggers

```sql
-- Trigger to update loyalty tier automatically
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.loyalty_points >= 10000 THEN
    NEW.loyalty_tier := 'Ping Local Legend';
  ELSIF NEW.loyalty_points >= 1200 THEN
    NEW.loyalty_tier := 'Ping Local Champion';
  ELSIF NEW.loyalty_points >= 10 THEN
    NEW.loyalty_tier := 'Ping Local Hero';
  ELSE
    NEW.loyalty_tier := 'Ping Local Member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_tier_update
BEFORE UPDATE OF loyalty_points ON users
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_tier();

-- Trigger to update offer sold count
CREATE OR REPLACE FUNCTION update_offer_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offers 
  SET number_sold = number_sold + NEW.quantity
  WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sold_count
AFTER INSERT ON user_offers
FOR EACH ROW
EXECUTE FUNCTION update_offer_sold_count();

-- Function to calculate proximity to user
CREATE OR REPLACE FUNCTION get_nearby_offers(
  user_lat float,
  user_lng float,
  max_distance_km float DEFAULT 50
)
RETURNS TABLE(
  offer_id INTEGER,
  offer_name TEXT,
  business_name TEXT,
  location_area TEXT,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    b.name,
    b.location_area,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(CAST(b.location->>'lat' AS FLOAT))) * 
        cos(radians(CAST(b.location->>'lng' AS FLOAT)) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(CAST(b.location->>'lat' AS FLOAT)))
      )
    ) AS distance
  FROM offers o
  JOIN businesses b ON o.business_id = b.id
  WHERE o.status = 'Signed Off'
  AND o.end_date > NOW()
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;
```

## Key Implementation Points for Adalo Compatibility

### 1. Image Handling
- Store images in Supabase Storage
- Generate and store blurHash for images
- Maintain the same JSON structure as Adalo
- URLs should be accessible by both native app and Adalo

### 2. Field Name Consistency
- Use snake_case in Supabase but map to Adalo's format
- Preserve all Adalo field names for API compatibility
- Don't drop any fields even if not currently used

### 3. Relationship Handling
- Adalo uses denormalized data (e.g., business_name in offers)
- Maintain these denormalized fields for compatibility
- Update both normalized and denormalized fields together

### 4. Authentication
- Passwords are bcrypt hashed in Adalo
- Use Supabase Auth but store additional fields in users table
- Verification code system matches Adalo's implementation

### 5. Loyalty Points
- Store individual transactions in loyalty_points table
- Sum and update users.loyalty_points field
- Trigger automatically updates loyalty_tier

### 6. Status and State Management
- Respect Adalo's status values exactly
- "Signed Off" = approved/live offer
- "draft" = pending approval

## Migration Strategy

### Phase 1: Supabase Setup
1. Create Supabase project
2. Run database schema migration
3. Import data from Adalo CSVs
4. Set up Storage buckets for images
5. Configure Row Level Security policies

### Phase 2: Data Migration Script
```typescript
// Example migration script structure
async function migrateUsers() {
  // Read Users CSV
  // Transform data to match Supabase schema
  // Handle password hashes (keep bcrypt)
  // Migrate profile pictures to Supabase Storage
  // Insert into Supabase users table
}

async function migrateBusinesses() {
  // Read Businesses CSV
  // Extract coordinates from 'Location' field
  // Migrate featured images to Storage
  // Insert into businesses table
}

async function migrateOffers() {
  // Read Offers CSV
  // Link to migrated businesses
  // Migrate featured images
  // Preserve all status and booking information
}

// Continue for all tables...
```

### Phase 3: Adalo API Integration
Create Supabase Edge Functions to expose REST API that Adalo can consume:

```typescript
// /api/businesses - GET, POST, PUT, DELETE
// /api/offers - GET, POST, PUT, DELETE  
// /api/users - GET, POST, PUT, DELETE
// /api/user-offers - GET, POST, PUT, DELETE

// Each endpoint should:
// - Accept Adalo's expected request format
// - Return data in Adalo's expected response format
// - Update both native and denormalized fields
// - Maintain data consistency
```

## Screen Implementation Details

### Authentication Flow

**Sign Up Screen**:
- Fields: Email, First Name, Surname, Password, Phone No
- Create user with `verified: false`
- Generate 6-digit verification code
- Send email with code
- Navigate to Verification Screen

**Verification Screen**:
- Input 6-digit code
- Match against user's `verification_code`
- On success: Set `verified: true`, navigate to Onboarding
- "Resend code" generates new code and sends email

**Login Screen**:
- Email and password
- Use Supabase Auth
- Check `verified` flag, redirect to verification if false
- If verified, navigate to Home Feed

### Home Feed

**Data Loading**:
```typescript
// Fetch offers based on user preferences
const { data: offers } = await supabase
  .from('offers')
  .select(`
    *,
    businesses (
      id,
      name,
      location_area,
      featured_image
    ),
    offer_tags (
      tags (
        id,
        name,
        type
      )
    )
  `)
  .eq('status', 'Signed Off')
  .gte('end_date', new Date().toISOString())
  .order('created', { ascending: false });
```

**Filtering**:
- Location Area: Filter by `location_area` field
- Tags: Filter via `offer_tags` join
- Proximity: Use `get_nearby_offers()` function if location enabled

### Promotion Detail Screen

**Data Display**:
- Show all fields from offer
- Display business information from relationship
- Show tags from `offer_tags`
- Feature Image from `featured_image` JSONB
- Additional images from `image_gallery` table

**Buy/Claim Button Logic**:
```typescript
const getButtonText = (offer) => {
  // Use custom text if provided
  if (offer.change_button_text) {
    return offer.change_button_text;
  }
  
  // Default logic
  if (offer.offer_type === 'Pay up front') {
    if (offer.requires_booking) {
      return 'Book & Buy';
    }
    return 'Buy Now';
  } else {
    if (offer.requires_booking) {
      return 'Book & Claim';
    }
    return 'Claim Now';
  }
};
```

### Purchase/Claim Flow

**Flow Decision Tree**:
```
1. User clicks Buy/Claim button
2. Check offer.requires_booking:
   - If FALSE → Go to Payment/Claim Screen
   - If TRUE → Check offer.booking_type:
     - If "external" → External Booking Screen
     - If "online" → Slot Selection Screen
     - If "call" → External Booking Screen (show phone)
     - If NULL/other → Slot Selection Screen (if slots exist)
3. After booking (if required) → Payment/Claim Screen
4. Complete transaction → Success Screen
```

**Payment Screen (Pay Up Front)**:
```typescript
// Create Stripe Payment Intent via Edge Function
const { data: paymentIntent } = await supabase.functions.invoke('create-payment-intent', {
  body: {
    amount: offer.price_discount * quantity * 100, // Convert to cents
    offerId: offer.id,
    userId: user.id,
    quantity: quantity
  }
});

// Use Stripe Payment Sheet
const { error, paymentIntent: result } = await stripe.confirmPayment(
  paymentIntent.client_secret
);

if (result.status === 'succeeded') {
  // Create user_offer record
  await createUserOffer({
    userId: user.id,
    offerId: offer.id,
    quantity: quantity,
    totalPaid: offer.price_discount * quantity,
    status: 'claimed'
  });
  
  // Award loyalty points
  await awardLoyaltyPoints(user.id, offer.price_discount * quantity * 10);
  
  // Show success
  navigation.navigate('SuccessScreen');
}
```

**Claim Screen (Pay on Day)**:
```typescript
// Simple confirmation, no payment
const handleClaim = async () => {
  await createUserOffer({
    userId: user.id,
    offerId: offer.id,
    quantity: quantity,
    status: 'claimed'
  });
  
  // No loyalty points yet - awarded at redemption
  navigation.navigate('SuccessScreen', { payOnDay: true });
};
```

### QR Code System

**QR Code Generation**:
```typescript
// When user wants to redeem
const generateQRCode = (userOffer) => {
  const qrData = {
    id: userOffer.id,
    userId: userOffer.user_id,
    offerId: userOffer.offer_id,
    timestamp: Date.now(),
    // Add signature/hash for security
    signature: generateSignature(userOffer)
  };
  
  return JSON.stringify(qrData);
};
```

**Redemption Flow** (Pay Up Front):
1. Business scans QR code (on business app)
2. Business app verifies signature and fetches user_offer
3. Business confirms offer details
4. Business marks as redeemed:
```typescript
await supabase
  .from('user_offers')
  .update({
    status: 'redeemed',
    redeemed_at: new Date().toISOString()
  })
  .eq('id', userOfferId);
```
5. User app (subscribed to real-time) shows success animation

**Redemption Flow** (Pay on Day):
1-3. Same as above
4. Business enters bill amount
5. Send bill amount to user:
```typescript
await supabase
  .from('user_offers')
  .update({
    total_paid: billAmount,
    status: 'pending_confirmation'
  })
  .eq('id', userOfferId);
```
6. User app shows bill confirmation screen
7. User confirms → Award points and mark redeemed:
```typescript
await awardLoyaltyPoints(userId, billAmount * 10);
await supabase
  .from('user_offers')
  .update({
    status: 'redeemed',
    redeemed_at: new Date().toISOString(),
    loyalty_points_earned: billAmount * 10
  })
  .eq('id', userOfferId);
```

### Real-time Subscriptions

```typescript
// Subscribe to user_offer changes for QR redemption
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
      if (payload.new.status === 'redeemed') {
        showSuccessAnimation();
        closeQRModal();
      } else if (payload.new.status === 'pending_confirmation') {
        showBillConfirmation(payload.new.total_paid);
      }
    }
  )
  .subscribe();
```

## Adalo Integration Points

### During Transition Period

**Option 1: Adalo Reads from Supabase (Recommended)**
- Configure Adalo's Custom Actions to call Supabase Edge Functions
- Edge Functions return data in Adalo's expected format
- Adalo business/admin screens work unchanged

**Option 2: Dual Write**
- Native app writes to Supabase
- Supabase triggers/functions sync to Adalo via API
- More complex but maintains Adalo as source of truth temporarily

**Option 3: Supabase as Source of Truth**
- Migrate Adalo to use Supabase via external collections
- Adalo becomes UI layer on top of Supabase
- Simplest long-term but requires Adalo reconfiguration

## Edge Functions Needed

1. **create-payment-intent**: Handle Stripe payment creation
2. **handle-stripe-webhook**: Process payment confirmations
3. **send-verification-email**: Send verification codes
4. **generate-qr-signature**: Create secure QR codes
5. **verify-qr-code**: Validate QR codes for redemption
6. **award-loyalty-points**: Calculate and award points
7. **send-notification**: Send push notifications

## Testing Requirements

- Test data migration thoroughly with sample data
- Verify Adalo can read/write to Supabase
- Test all 6 user journey flows (pay upfront/on day × booking types)
- Test QR code generation and redemption
- Test real-time subscription updates
- Test loyalty point calculations and tier updates
- Test with actual Stripe payments in test mode
- Verify image uploads and display

## Launch Checklist

- [ ] Complete data migration from Adalo to Supabase
- [ ] Verify data integrity (all relationships intact)
- [ ] Set up Adalo API integration or custom actions
- [ ] Test business/admin workflows in Adalo work with Supabase
- [ ] Native app tested on iOS and Android
- [ ] QR redemption tested end-to-end
- [ ] Payment processing tested with real Stripe account
- [ ] Push notifications configured and tested
- [ ] Coordinate cutover with businesses
- [ ] Monitor both systems during transition

## Critical Success Factors

1. **Data Consistency**: Adalo and native app must see same data
2. **No Downtime**: Transition must be seamless for users and businesses
3. **QR Compatibility**: QR codes must work across both systems during transition
4. **Payment Reliability**: Zero tolerance for payment issues
5. **Image Accessibility**: Images must be accessible from both Adalo and native app

This approach maintains complete compatibility with your existing Adalo system while building the native user-facing app.
