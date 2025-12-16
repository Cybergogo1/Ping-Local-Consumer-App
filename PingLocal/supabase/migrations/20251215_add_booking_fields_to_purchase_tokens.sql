-- Add booking tracking fields to purchase_tokens table
-- These fields support the external/call booking flow where users
-- confirm their booking after claiming

-- Add booking_date: The date the user says they've booked for
ALTER TABLE purchase_tokens
ADD COLUMN IF NOT EXISTS booking_date DATE;

-- Add booking_confirmed: Whether the user has confirmed they made a booking
ALTER TABLE purchase_tokens
ADD COLUMN IF NOT EXISTS booking_confirmed BOOLEAN DEFAULT FALSE;

-- Add booking_reminder_id: ID of the scheduled notification for cancellation
ALTER TABLE purchase_tokens
ADD COLUMN IF NOT EXISTS booking_reminder_id TEXT;

-- Add an index for querying unconfirmed external bookings
CREATE INDEX IF NOT EXISTS idx_purchase_tokens_booking_confirmed
ON purchase_tokens (booking_confirmed)
WHERE booking_confirmed = FALSE;

COMMENT ON COLUMN purchase_tokens.booking_date IS 'Date user says they booked for (external/call bookings)';
COMMENT ON COLUMN purchase_tokens.booking_confirmed IS 'Whether user confirmed they made a booking';
COMMENT ON COLUMN purchase_tokens.booking_reminder_id IS 'ID of scheduled reminder notification';
