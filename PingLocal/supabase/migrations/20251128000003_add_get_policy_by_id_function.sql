-- Migration: Add get_business_policy_by_id RPC function
-- This function allows retrieving a single business policy by its ID

-- Drop the function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_business_policy_by_id(INTEGER);

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
  WHERE bp.id = policy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_business_policy_by_id IS 'Retrieves a single business policy by its ID';
