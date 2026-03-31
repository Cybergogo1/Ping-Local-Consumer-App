-- Remove start_date restriction from RLS as it blocks Adalo (business app)
-- from reading future offers. The consumer app handles start_date filtering in code.
DROP POLICY IF EXISTS "Only show valid consumer offers" ON offers;

CREATE POLICY "Only show non-test offers"
ON offers FOR SELECT
TO anon, authenticated
USING (
  (is_test = false OR is_test IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = offers.business_id
    AND b.is_test = true
  )
);
