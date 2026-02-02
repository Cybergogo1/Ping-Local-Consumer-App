-- Add auth_id column to users table to map Supabase Auth UUID to integer user ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Create index for efficient lookups by auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Backfill existing users by matching email with auth.users
-- This populates auth_id for all users who have a matching email in auth.users
UPDATE users u
SET auth_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email)
AND u.auth_id IS NULL;
