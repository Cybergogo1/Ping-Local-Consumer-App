-- Migration: Add business_id field to business_policies database functions
-- This updates all policy retrieval functions to include the business_id column

-- Drop existing functions first (required when changing return types)
DROP FUNCTION IF EXISTS get_all_business_policies();
DROP FUNCTION IF EXISTS get_business_policy_by_id(INTEGER);
DROP FUNCTION IF EXISTS get_business_policies_by_business(INTEGER);
DROP FUNCTION IF EXISTS get_business_policies_by_offer(INTEGER);
DROP FUNCTION IF EXISTS create_business_policy(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER[], INTEGER[]);
DROP FUNCTION IF EXISTS update_business_policy(INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Update get_all_business_policies to include business_id
CREATE OR REPLACE FUNCTION get_all_business_policies()
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  business_id INTEGER,
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
    bp.business_id,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_business_policy_by_id to include business_id
CREATE OR REPLACE FUNCTION get_business_policy_by_id(policy_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  business_id INTEGER,
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
    bp.business_id,
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

-- Update get_business_policies_by_business to include business_id
-- This function returns policies that are either directly owned OR associated via junction table
CREATE OR REPLACE FUNCTION get_business_policies_by_business(business_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  business_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    bp.id,
    bp.name,
    bp.returns_policy,
    bp.redemption,
    bp.category,
    bp.created_by_ping,
    bp.business_id,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  LEFT JOIN business_policy_businesses bpb ON bp.id = bpb.business_policy_id
  WHERE bp.business_id = business_id_param OR bpb.business_id = business_id_param
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_business_policies_by_offer to include business_id
CREATE OR REPLACE FUNCTION get_business_policies_by_offer(offer_id_param INTEGER)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  returns_policy TEXT,
  redemption TEXT,
  category TEXT,
  created_by_ping BOOLEAN,
  business_id INTEGER,
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
    bp.business_id,
    bp.created_at,
    bp.updated_at
  FROM business_policies bp
  INNER JOIN business_policy_offers bpo ON bp.id = bpo.business_policy_id
  WHERE bpo.offer_id = offer_id_param
  ORDER BY bp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update create_business_policy to accept and set business_id
CREATE OR REPLACE FUNCTION create_business_policy(
  policy_name TEXT,
  policy_returns_policy TEXT DEFAULT NULL,
  policy_redemption TEXT DEFAULT NULL,
  policy_category TEXT DEFAULT NULL,
  policy_created_by_ping BOOLEAN DEFAULT FALSE,
  policy_business_id INTEGER DEFAULT NULL,
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
  INSERT INTO business_policies (name, returns_policy, redemption, category, created_by_ping, business_id)
  VALUES (policy_name, policy_returns_policy, policy_redemption, policy_category, policy_created_by_ping, policy_business_id)
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

-- Update update_business_policy to allow updating business_id
CREATE OR REPLACE FUNCTION update_business_policy(
  policy_id INTEGER,
  policy_name TEXT DEFAULT NULL,
  policy_returns_policy TEXT DEFAULT NULL,
  policy_redemption TEXT DEFAULT NULL,
  policy_category TEXT DEFAULT NULL,
  policy_created_by_ping BOOLEAN DEFAULT NULL,
  policy_business_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE business_policies
  SET
    name = COALESCE(policy_name, name),
    returns_policy = COALESCE(policy_returns_policy, returns_policy),
    redemption = COALESCE(policy_redemption, redemption),
    category = COALESCE(policy_category, category),
    created_by_ping = COALESCE(policy_created_by_ping, created_by_ping),
    business_id = COALESCE(policy_business_id, business_id)
  WHERE id = policy_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
