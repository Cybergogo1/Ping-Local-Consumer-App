-- Drop any existing permissive policies on offers that allow unrestricted SELECT
-- Common default policy names from Supabase dashboard
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'offers' AND schemaname = 'public'
        AND policyname != 'Only show started offers'
        AND policyname != 'Allow all modifications'
        AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY %I ON offers', pol.policyname);
    END LOOP;
END $$;

-- Also drop and recreate "Allow all modifications" to exclude SELECT
-- (our previous migration made it FOR ALL which includes SELECT and overrides the filter)
DROP POLICY IF EXISTS "Allow all modifications" ON offers;

CREATE POLICY "Allow all modifications"
ON offers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow updates"
ON offers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deletes"
ON offers FOR DELETE
TO authenticated
USING (true);
