-- Update the SELECT policy to also hide test offers
DROP POLICY IF EXISTS "Only show started offers" ON offers;

CREATE POLICY "Only show started and non-test offers"
ON offers FOR SELECT
TO anon, authenticated
USING (
  (start_date <= now() OR start_date IS NULL)
  AND (is_test = false OR is_test IS NULL)
);
