-- User credentials for external services (encrypted at rest by Supabase)
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL, -- 'apple', 'google', 'eas'
  credentials JSONB NOT NULL, -- encrypted service-specific credentials
  label TEXT, -- user-friendly label ("My Apple Dev Account")
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credentials"
  ON user_credentials FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);

-- Add plan field to track paid status
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_plan TEXT DEFAULT 'free';
