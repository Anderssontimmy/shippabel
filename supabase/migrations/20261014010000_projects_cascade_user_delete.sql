-- Deleting an account must delete its projects (and, through them, issues, listings, builds and upload keys).
-- Without this, projects.user_id blocked the deletion of any account that owned a project.
ALTER TABLE public.projects DROP CONSTRAINT projects_user_id_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
