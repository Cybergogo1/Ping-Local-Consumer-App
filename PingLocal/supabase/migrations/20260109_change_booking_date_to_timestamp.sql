-- Change booking_date from DATE to TIMESTAMPTZ to support storing time
ALTER TABLE purchase_tokens
ALTER COLUMN booking_date TYPE TIMESTAMPTZ USING booking_date::TIMESTAMPTZ;

COMMENT ON COLUMN purchase_tokens.booking_date IS 'Date and time user says they booked for (external/call bookings)';
