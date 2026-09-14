-- Per-IP scan log for rate limiting anonymous scans (scan-project).
-- Written/read only by edge functions via the service-role key. No client RLS
-- policies are defined, so RLS denies all anon/authenticated access by default.
CREATE TABLE IF NOT EXISTS scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scan_events_ip_time ON scan_events(ip, created_at);
