-- Android upload keys. Generated and read only by the server (the keystore and its password
-- are encrypted with CREDENTIALS_ENC_KEY). No policies and no client grants: a user or anon
-- key can neither read nor write this table.
CREATE TABLE public.project_signing_keys (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  keystore jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_signing_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_signing_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.project_signing_keys TO service_role;
