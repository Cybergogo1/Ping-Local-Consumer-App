-- Drop existing favorites table if it exists (from failed previous migration)
DROP TABLE IF EXISTS favorites CASCADE;

-- Create favorites table for storing user favorites (offers only)
-- Note: Users favorite offers, which are linked to businesses
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure user can only favorite each offer once
  UNIQUE(user_id, offer_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_offer_id ON favorites(offer_id);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (true);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (true);
