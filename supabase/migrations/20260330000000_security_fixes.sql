-- Security fixes: tighten RLS policies

-- Remove dangerous anonymous UPDATE on projects
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Restrict INSERT — only allow inserting your own projects or anonymous scans
DROP POLICY IF EXISTS "Users can insert projects" ON projects;
CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Fix issues INSERT — only service role should insert (via Edge Functions)
DROP POLICY IF EXISTS "Service role can insert issues" ON issues;
-- No INSERT policy for anon — Edge Functions use service_role key which bypasses RLS

-- Tighten anonymous SELECT — only allow viewing your own projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);
-- Note: keeping NULL read access for free scan flow, but UPDATE is now blocked
