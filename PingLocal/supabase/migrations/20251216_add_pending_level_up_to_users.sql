-- Add pending level up columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pending_level_up BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_level_up_from TEXT,
ADD COLUMN IF NOT EXISTS pending_level_up_to TEXT;

-- Add comment explaining usage
COMMENT ON COLUMN users.pending_level_up IS 'Flag indicating user has a pending level up to show on next app open';
COMMENT ON COLUMN users.pending_level_up_from IS 'Previous tier before level up (member, hero, champion, legend)';
COMMENT ON COLUMN users.pending_level_up_to IS 'New tier after level up (member, hero, champion, legend)';
