-- Migration: Add business favorites support to favorites table
-- Created: 2024-12-02
-- Purpose: Extend favorites table to support both offer and business favorites

-- First, make offer_id nullable (it was previously NOT NULL)
ALTER TABLE favorites ALTER COLUMN offer_id DROP NOT NULL;

-- Add business_id column to favorites table
ALTER TABLE favorites ADD COLUMN business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;

-- Add index for business favorites queries
CREATE INDEX IF NOT EXISTS idx_favorites_business_id ON favorites(business_id);

-- Drop existing unique constraint (if exists)
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_offer_id_key;

-- Create partial unique indexes instead of constraints (PostgreSQL doesn't support WHERE in UNIQUE constraints)
-- Ensure user can only favorite a specific offer once
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_user_offer_idx
  ON favorites(user_id, offer_id) WHERE offer_id IS NOT NULL;

-- Ensure user can only favorite a specific business once
CREATE UNIQUE INDEX IF NOT EXISTS favorites_unique_user_business_idx
  ON favorites(user_id, business_id) WHERE business_id IS NOT NULL;

-- Add check constraint to ensure either offer_id OR business_id is set (not both, not neither)
ALTER TABLE favorites ADD CONSTRAINT favorites_check_type
  CHECK (
    (offer_id IS NOT NULL AND business_id IS NULL) OR
    (offer_id IS NULL AND business_id IS NOT NULL)
  );

-- Note: RLS policies are already permissive (true) so no changes needed
-- Users can only see/modify their own favorites through user_id equality checks
