-- Enable RLS on offers table (if not already enabled)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Allow anon users to only see offers that have started (or have no start date)
CREATE POLICY "Only show started offers"
ON offers FOR SELECT
TO anon, authenticated
USING (start_date <= now() OR start_date IS NULL);

-- Allow all other operations (insert, update, delete) for authenticated/service role
-- so the business app and edge functions continue to work
CREATE POLICY "Allow all modifications"
ON offers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
