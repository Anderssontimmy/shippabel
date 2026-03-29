-- Projects: each uploaded app
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  repo_url TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'both')) DEFAULT 'both',
  framework TEXT DEFAULT 'expo',
  status TEXT CHECK (status IN ('scanning', 'issues_found', 'ready', 'building', 'submitted', 'live', 'rejected')) DEFAULT 'scanning',
  scan_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store listings: generated store copy & assets
CREATE TABLE store_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  app_name TEXT,
  subtitle TEXT,
  short_description TEXT,
  full_description TEXT,
  keywords TEXT,
  category TEXT,
  privacy_policy_url TEXT,
  screenshots JSONB,
  icon_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissions: each build & submit attempt
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  eas_build_id TEXT,
  build_status TEXT DEFAULT 'pending',
  store_submission_id TEXT,
  review_status TEXT DEFAULT 'not_submitted',
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issues: found during scanning
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info')) NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  auto_fixable BOOLEAN DEFAULT false,
  fix_description TEXT,
  fixed BOOLEAN DEFAULT false,
  fixed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Projects: users can read/write their own, anonymous can insert (for free scans)
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Issues: read access follows project ownership
CREATE POLICY "Users can view issues for their projects"
  ON issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = issues.project_id
      AND (projects.user_id = auth.uid() OR projects.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can insert issues"
  ON issues FOR INSERT
  WITH CHECK (true);

-- Store listings: project owner access
CREATE POLICY "Users can view own store listings"
  ON store_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = store_listings.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own store listings"
  ON store_listings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = store_listings.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Submissions: project owner access
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = submissions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own submissions"
  ON submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = submissions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_store_listings_project_id ON store_listings(project_id);
CREATE INDEX idx_submissions_project_id ON submissions(project_id);
