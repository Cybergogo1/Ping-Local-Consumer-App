-- Migration: Convert business_policy from TEXT to business_policy_id INTEGER foreign key
-- This changes the offers table to use a proper foreign key relationship to business_policies

-- Step 1: Add new business_policy_id column
ALTER TABLE offers ADD COLUMN business_policy_id INTEGER;

-- Step 2: Add foreign key constraint
ALTER TABLE offers
  ADD CONSTRAINT fk_offers_business_policy
  FOREIGN KEY (business_policy_id)
  REFERENCES business_policies(id)
  ON DELETE SET NULL;

-- Step 3: Create index for faster lookups
CREATE INDEX idx_offers_business_policy_id ON offers(business_policy_id);

-- Step 4: Drop the old business_policy TEXT column
ALTER TABLE offers DROP COLUMN business_policy;

-- Add comment to document the column
COMMENT ON COLUMN offers.business_policy_id IS 'Foreign key reference to business_policies table';
