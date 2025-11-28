-- Migration: Create business_policies table with junction tables and CRUD functions
-- This creates a table for storing business return/redemption policies with relationships to businesses and offers

-- Step 1: Create the main business_policies table
CREATE TABLE business_policies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create junction table for business_policies and businesses (many-to-many)
-- A policy can be associated with multiple businesses, and a business can have multiple policies
CREATE TABLE business_policy_businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_policy_id INTEGER NOT NULL REFERENCES business_policies(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a business can only be linked to a policy once
  UNIQUE(business_policy_id, business_id)
);

-- Step 3: Create junction table for business_policies and offers (many-to-many)
-- A policy can be associated with multiple offers, and an offer can have multiple policies
CREATE TABLE business_policy_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_policy_id INTEGER NOT NULL REFERENCES business_policies(id) ON DELETE CASCADE,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure an offer can only be linked to a policy once
  UNIQUE(business_policy_id, offer_id)
);

-- Step 4: Create indexes for faster lookups
CREATE INDEX idx_business_policies_name ON business_policies(name);
CREATE INDEX idx_business_policies_category ON business_policies(category);
CREATE INDEX idx_business_policies_created_by_ping ON business_policies(created_by_ping);

CREATE INDEX idx_business_policy_businesses_policy_id ON business_policy_businesses(business_policy_id);
CREATE INDEX idx_business_policy_businesses_business_id ON business_policy_businesses(business_id);

CREATE INDEX idx_business_policy_offers_policy_id ON business_policy_offers(business_policy_id);
CREATE INDEX idx_business_policy_offers_offer_id ON business_policy_offers(offer_id);

-- Step 5: Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_policies_updated_at
  BEFORE UPDATE ON business_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_business_policies_updated_at();

-- Step 6: Enable Row Level Security
ALTER TABLE business_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_policy_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_policy_offers ENABLE ROW LEVEL SECURITY;

-- Policies for business_policies table
CREATE POLICY "Anyone can view business policies" ON business_policies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert business policies" ON business_policies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update business policies" ON business_policies
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete business policies" ON business_policies
  FOR DELETE USING (true);

-- Policies for business_policy_businesses junction table
CREATE POLICY "Anyone can view business policy business associations" ON business_policy_businesses
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert business policy business associations" ON business_policy_businesses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can delete business policy business associations" ON business_policy_businesses
  FOR DELETE USING (true);

-- Policies for business_policy_offers junction table
CREATE POLICY "Anyone can view business policy offer associations" ON business_policy_offers
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert business policy offer associations" ON business_policy_offers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can delete business policy offer associations" ON business_policy_offers
  FOR DELETE USING (true);

-- ============================================================================
-- CRUD FUNCTIONS
-- ============================================================================

-- GET: Get all business policies
CREATE OR REPLACE FUNCTION get_all_business_policies()
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.name,
    bp.returns_policy,
    bp.redemption,
    bp.category,
    bp.created_by_ping,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- GET: Get a single business policy by ID with associated businesses and offers
CREATE OR REPLACE FUNCTION get_business_policy_by_id(policy_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  business_ids INTEGER[],
  offer_ids INTEGER[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.name,
    bp.returns_policy,
    bp.redemption,
    bp.category,
    bp.created_by_ping,
    bp.created_at,
    bp.updated_at,
    ARRAY_AGG(DISTINCT bpb.business_id) FILTER (WHERE bpb.business_id IS NOT NULL) AS business_ids,
    ARRAY_AGG(DISTINCT bpo.offer_id) FILTER (WHERE bpo.offer_id IS NOT NULL) AS offer_ids
  FROM business_policies bp
  LEFT JOIN business_policy_businesses bpb ON bp.id = bpb.business_policy_id
  LEFT JOIN business_policy_offers bpo ON bp.id = bpo.business_policy_id
  WHERE bp.id = policy_id
  GROUP BY bp.id;
END;
$$ LANGUAGE plpgsql;

-- GET: Get business policies for a specific business
CREATE OR REPLACE FUNCTION get_business_policies_by_business(business_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.name,
    bp.returns_policy,
    bp.redemption,
    bp.category,
    bp.created_by_ping,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  INNER JOIN business_policy_businesses bpb ON bp.id = bpb.business_policy_id
  WHERE bpb.business_id = business_id_param
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- GET: Get business policies for a specific offer
CREATE OR REPLACE FUNCTION get_business_policies_by_offer(offer_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.name,
    bp.returns_policy,
    bp.redemption,
    bp.category,
    bp.created_by_ping,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  INNER JOIN business_policy_offers bpo ON bp.id = bpo.business_policy_id
  WHERE bpo.offer_id = offer_id_param
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- CREATE: Create a new business policy with optional business and offer associations
CREATE OR REPLACE FUNCTION create_business_policy(
  policy_name TEXT,
  policy_returns_policy TEXT DEFAULT NULL,
  policy_redemption TEXT DEFAULT NULL,
  policy_category TEXT DEFAULT NULL,
  policy_created_by_ping BOOLEAN DEFAULT FALSE,
  business_ids INTEGER[] DEFAULT NULL,
  offer_ids INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_policy_id INTEGER;
  business_id INTEGER;
  offer_id INTEGER;
BEGIN
  -- Insert the new business policy
  INSERT INTO business_policies (name, returns_policy, redemption, category, created_by_ping)
  VALUES (policy_name, policy_returns_policy, policy_redemption, policy_category, policy_created_by_ping)
  RETURNING id INTO new_policy_id;

  -- Associate with businesses if provided
  IF business_ids IS NOT NULL THEN
    FOREACH business_id IN ARRAY business_ids
    LOOP
      INSERT INTO business_policy_businesses (business_policy_id, business_id)
      VALUES (new_policy_id, business_id)
      ON CONFLICT (business_policy_id, business_id) DO NOTHING;
    END LOOP;
  END IF;

  -- Associate with offers if provided
  IF offer_ids IS NOT NULL THEN
    FOREACH offer_id IN ARRAY offer_ids
    LOOP
      INSERT INTO business_policy_offers (business_policy_id, offer_id)
      VALUES (new_policy_id, offer_id)
      ON CONFLICT (business_policy_id, offer_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN new_policy_id;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: Update an existing business policy
CREATE OR REPLACE FUNCTION update_business_policy(
  policy_id INTEGER,
  policy_name TEXT DEFAULT NULL,
  policy_returns_policy TEXT DEFAULT NULL,
  policy_redemption TEXT DEFAULT NULL,
  policy_category TEXT DEFAULT NULL,
  policy_created_by_ping BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE business_policies
  SET
    name = COALESCE(policy_name, name),
    returns_policy = COALESCE(policy_returns_policy, returns_policy),
    redemption = COALESCE(policy_redemption, redemption),
    category = COALESCE(policy_category, category),
    created_by_ping = COALESCE(policy_created_by_ping, created_by_ping)
  WHERE id = policy_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: Add business associations to a policy
CREATE OR REPLACE FUNCTION add_businesses_to_policy(
  policy_id INTEGER,
  business_ids INTEGER[]
)
RETURNS BOOLEAN AS $$
DECLARE
  business_id INTEGER;
BEGIN
  FOREACH business_id IN ARRAY business_ids
  LOOP
    INSERT INTO business_policy_businesses (business_policy_id, business_id)
    VALUES (policy_id, business_id)
    ON CONFLICT (business_policy_id, business_id) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: Remove business associations from a policy
CREATE OR REPLACE FUNCTION remove_businesses_from_policy(
  policy_id INTEGER,
  business_ids INTEGER[]
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM business_policy_businesses
  WHERE business_policy_id = policy_id
    AND business_id = ANY(business_ids);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: Add offer associations to a policy
CREATE OR REPLACE FUNCTION add_offers_to_policy(
  policy_id INTEGER,
  offer_ids INTEGER[]
)
RETURNS BOOLEAN AS $$
DECLARE
  offer_id INTEGER;
BEGIN
  FOREACH offer_id IN ARRAY offer_ids
  LOOP
    INSERT INTO business_policy_offers (business_policy_id, offer_id)
    VALUES (policy_id, offer_id)
    ON CONFLICT (business_policy_id, offer_id) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: Remove offer associations from a policy
CREATE OR REPLACE FUNCTION remove_offers_from_policy(
  policy_id INTEGER,
  offer_ids INTEGER[]
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM business_policy_offers
  WHERE business_policy_id = policy_id
    AND offer_id = ANY(offer_ids);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- DELETE: Delete a business policy (cascade will handle junction table cleanup)
CREATE OR REPLACE FUNCTION delete_business_policy(policy_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM business_policies WHERE id = policy_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Add comments to document the tables
COMMENT ON TABLE business_policies IS 'Stores return and redemption policies for businesses and offers';
COMMENT ON TABLE business_policy_businesses IS 'Junction table linking business policies to businesses (many-to-many)';
COMMENT ON TABLE business_policy_offers IS 'Junction table linking business policies to offers (many-to-many)';
