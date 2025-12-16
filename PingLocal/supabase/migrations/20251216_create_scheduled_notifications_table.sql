-- Create scheduled_notifications table for future notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id SERIAL PRIMARY KEY,
    notification_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    scheduled_for DATE NOT NULL,
    offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    sent_at TIMESTAMPTZ,
    created TIMESTAMPTZ DEFAULT NOW(),
    updated TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying of pending notifications by date
CREATE INDEX idx_scheduled_notifications_pending ON scheduled_notifications (scheduled_for, status) WHERE status = 'pending';

-- Index for looking up notifications by offer
CREATE INDEX idx_scheduled_notifications_offer ON scheduled_notifications (offer_id);

-- Add RLS policies
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to scheduled_notifications"
    ON scheduled_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);
