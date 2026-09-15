-- Let a signed-in user claim an anonymous (ownerless) scan as their own.
-- Powers the "email me this report" capture on scan results: the visitor
-- signs in via magic link and the project is attached to their new account.
-- Only ownerless rows can be claimed, and only to your own user id.
CREATE POLICY "claim_orphan_projects" ON projects
  FOR UPDATE TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
