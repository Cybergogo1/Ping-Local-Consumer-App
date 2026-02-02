-- Add min_people column to offer_slots table
ALTER TABLE offer_slots ADD COLUMN IF NOT EXISTS min_people INTEGER DEFAULT 1;
