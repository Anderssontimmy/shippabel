-- Per-user usage log for rate limiting expensive (AI) edge functions.
-- Written/read only by edge functions via the service-role key. No client RLS policies
-- are defined, so RLS denies all anon/authenticated access by default.
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_usage_events_user_time ON usage_events(user_id, created_at);
