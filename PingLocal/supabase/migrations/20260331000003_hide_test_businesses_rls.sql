-- Enable RLS on businesses table
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop any existing SELECT policies on businesses
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'businesses' AND schemaname = 'public'
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY %I ON businesses', pol.policyname);
    END LOOP;
END $$;

-- Only show non-test businesses
CREATE POLICY "Hide test businesses"
ON businesses FOR SELECT
TO anon, authenticated
USING (is_test = false OR is_test IS NULL);

-- Allow all modifications for authenticated users
CREATE POLICY "Allow business inserts"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow business updates"
ON businesses FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow business deletes"
ON businesses FOR DELETE
TO authenticated
USING (true);
