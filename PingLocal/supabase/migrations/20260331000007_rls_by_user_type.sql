-- Replace single policy with role-specific policies
DROP POLICY IF EXISTS "Only show valid consumer offers" ON offers;

-- Anon role: unrestricted SELECT (Adalo business app uses anon key)
CREATE POLICY "Anon can read all offers"
ON offers FOR SELECT
TO anon
USING (true);

-- Authenticated role: restrict based on whether user is a business user
-- Business users (is_business = true) see everything
-- Consumer users see only started, non-test offers from non-test businesses
CREATE POLICY "Authenticated offer access by user type"
ON offers FOR SELECT
TO authenticated
USING (
  -- Business users see everything
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND u.is_business = true
  )
  OR
  -- Consumer users only see valid offers
  (
    (start_date <= now() OR start_date IS NULL)
    AND (is_test = false OR is_test IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = offers.business_id
      AND b.is_test = true
    )
  )
);
