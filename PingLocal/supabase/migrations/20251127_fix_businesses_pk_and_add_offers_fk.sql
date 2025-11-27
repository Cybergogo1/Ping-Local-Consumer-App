-- Migration: Fix businesses table primary key and add foreign key constraint for offers
-- This migration addresses the schema inconsistency where businesses uses 'name' as PK
-- but offers.business_id expects an integer id foreign key

-- Step 1: Add an id column to businesses table if it doesn't exist
-- We use a sequence to generate unique IDs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'id'
  ) THEN
    -- Add the id column
    ALTER TABLE businesses ADD COLUMN id SERIAL;

    -- For existing rows, the SERIAL will auto-populate with sequential IDs
    -- This is safe because we're just adding a new column
  END IF;
END $$;

-- Step 2: Drop the old primary key constraint on 'name'
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_pkey;

-- Step 3: Add new primary key on 'id'
ALTER TABLE businesses ADD PRIMARY KEY (id);

-- Step 4: Keep 'name' as unique (important for data integrity)
ALTER TABLE businesses ADD CONSTRAINT businesses_name_unique UNIQUE (name);

-- Step 5: Clean up orphaned offers (offers with business_id that don't exist in businesses)
-- This finds offers where business_id doesn't match any business.id and sets them to NULL
UPDATE offers
SET business_id = NULL
WHERE business_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM businesses WHERE id = offers.business_id
  );

-- Step 6: Add foreign key constraint from offers to businesses
-- This ensures offers.business_id references a valid businesses.id
ALTER TABLE offers
  ADD CONSTRAINT offers_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES businesses(id)
  ON DELETE SET NULL;  -- If a business is deleted, set offer's business_id to NULL

-- Step 7: Add index on offers.business_id for better query performance
CREATE INDEX IF NOT EXISTS idx_offers_business_id ON offers(business_id);

-- Step 8: Add comment to document the relationship
COMMENT ON CONSTRAINT offers_business_id_fkey ON offers IS
  'Foreign key constraint linking offers to businesses table';
