-- Restore start_date restriction to RLS policy
DROP POLICY IF EXISTS "Only show non-test offers" ON offers;

CREATE POLICY "Only show valid consumer offers"
ON offers FOR SELECT
TO anon, authenticated
USING (
  (start_date <= now() OR start_date IS NULL)
  AND (is_test = false OR is_test IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = offers.business_id
    AND b.is_test = true
  )
);
