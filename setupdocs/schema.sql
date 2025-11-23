-- Ping Local Database Schema
-- Run this in Supabase SQL Editor BEFORE importing CSV data

-- Drop existing tables if they exist (use with caution!)
-- DROP TABLE IF EXISTS image_gallery CASCADE;
-- DROP TABLE IF EXISTS business_tags CASCADE;
-- DROP TABLE IF EXISTS offer_tags CASCADE;
-- DROP TABLE IF EXISTS favorites CASCADE;
-- DROP TABLE IF EXISTS offer_slots CASCADE;
-- DROP TABLE IF EXISTS user_offers CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS loyalty_points CASCADE;
-- DROP TABLE IF EXISTS offers CASCADE;
-- DROP TABLE IF EXISTS businesses CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;
-- DROP TABLE IF EXISTS location_areas CASCADE;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Location Areas Table
CREATE TABLE location_areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  featured_image JSONB,
  description TEXT,
  location TEXT,
  map_location TEXT,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Tags Table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'Category' or 'tags'
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  surname TEXT,
  password TEXT, -- Hashed with bcrypt
  phone_no TEXT,
  profile_pic JSONB,
  loyalty_points INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  is_business BOOLEAN DEFAULT FALSE,
  is_test BOOLEAN DEFAULT FALSE,
  viewing_date TIMESTAMP,
  last_notify_clear TIMESTAMP,
  business TEXT,
  activate_notifications BOOLEAN DEFAULT FALSE,
  favourite_business TEXT,
  verification_code TEXT,
  verified BOOLEAN DEFAULT FALSE,
  api_requires_sync BOOLEAN DEFAULT FALSE,
  api_last_sync_date TIMESTAMP,
  loyalty_tier TEXT DEFAULT 'Ping Local Member',
  selected_location TEXT,
  selected_location_id INTEGER,
  selected_tags TEXT[],
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Businesses Table
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  featured_image JSONB,
  email TEXT,
  description TEXT,
  description_summary TEXT,
  location TEXT,
  phone_number TEXT,
  opening_times TEXT,
  available_promotion_types TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_signed_off BOOLEAN DEFAULT FALSE,
  location_area TEXT,
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

-- Offers (Promotions) Table
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT,
  full_description TEXT,
  special_notes TEXT,
  offer_type TEXT,
  requires_booking BOOLEAN DEFAULT FALSE,
  booking_type TEXT,
  one_per_customer BOOLEAN DEFAULT FALSE,
  price_discount NUMERIC,
  unit_of_measurement TEXT,
  quantity INTEGER,
  number_sold INTEGER DEFAULT 0,
  quantity_item BOOLEAN DEFAULT FALSE,
  status TEXT,
  finish_time TIMESTAMP,
  booking_url TEXT,
  business_id INTEGER REFERENCES businesses(id),
  business_name TEXT,
  featured_image JSONB,
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
  business_location TEXT,
  location_area TEXT,
  change_button_text TEXT,
  custom_feed_text TEXT,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Loyalty Points Table
CREATE TABLE loyalty_points (
  id SERIAL PRIMARY KEY,
  name TEXT,
  amount NUMERIC,
  user_id INTEGER REFERENCES users(id),
  reason TEXT,
  date_received TIMESTAMP,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Notifications Table
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

-- User Offers (Claimed/Purchased Promotions)
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
  status TEXT,
  qr_code_data TEXT,
  claimed_at TIMESTAMP DEFAULT NOW(),
  redeemed_at TIMESTAMP,
  loyalty_points_earned INTEGER DEFAULT 0,
  created TIMESTAMP DEFAULT NOW(),
  updated TIMESTAMP DEFAULT NOW()
);

-- Offer Slots (for slot-based bookings)
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

-- Favorites
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  favoritable_type TEXT,
  favoritable_id INTEGER,
  created TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, favoritable_type, favoritable_id)
);

-- Many-to-Many: Offers to Tags
CREATE TABLE offer_tags (
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, tag_id)
);

-- Many-to-Many: Businesses to Tags
CREATE TABLE business_tags (
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, tag_id)
);

-- Image Gallery (for additional offer/business images)
CREATE TABLE image_gallery (
  id SERIAL PRIMARY KEY,
  imageable_type TEXT,
  imageable_id INTEGER,
  image_data JSONB,
  display_order INTEGER DEFAULT 0,
  created TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

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

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_location_areas_updated_at BEFORE UPDATE ON location_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verified ON users(verified);
CREATE INDEX idx_businesses_location_area ON businesses(location_area);
CREATE INDEX idx_businesses_is_featured ON businesses(is_featured);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_business_id ON offers(business_id);
CREATE INDEX idx_offers_end_date ON offers(end_date);
CREATE INDEX idx_user_offers_user_id ON user_offers(user_id);
CREATE INDEX idx_user_offers_status ON user_offers(status);
CREATE INDEX idx_notifications_receiver_id ON notifications(receiver_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ============================================================================

-- Enable RLS on tables (uncomment if you want to use RLS)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example policies (customize as needed)
-- CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
-- CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
