-- Processed Stripe webhook events, for idempotency. Stripe delivers events
-- at-least-once; without this a redelivered checkout.session.completed could
-- re-grant or overwrite entitlements.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
