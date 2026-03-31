-- Update offers SELECT policy to also hide offers from test businesses
DROP POLICY IF EXISTS "Only show started and non-test offers" ON offers;

CREATE POLICY "Only show valid consumer offers"
ON offers FOR SELECT
TO anon, authenticated
USING (
  (start_date <= now() OR start_date IS NULL)
  AND (is_test = false OR is_test IS NULL)
  AND (
    business_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = offers.business_id
      AND b.is_test = true
    )
  )
);
