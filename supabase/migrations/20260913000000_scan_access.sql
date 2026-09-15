-- Guest reports belong to the browser that created them. Only a SHA-256 hash
-- is stored; report IDs and hashes do not grant access. Legacy ownerless rows
-- remain inaccessible until re-scanned, rather than becoming claimable by ID.
CREATE OR REPLACE FUNCTION public.request_guest_hash() RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN token ~ '^[a-f0-9]{64}$'
    THEN encode(extensions.digest(token, 'sha256'), 'hex') ELSE NULL END
  FROM (SELECT current_setting('request.headers', true)::jsonb ->> 'x-guest-token' AS token) t;
$$;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS guest_token_hash text;
ALTER TABLE public.projects ALTER COLUMN guest_token_hash SET DEFAULT public.request_guest_hash();

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT
USING (user_id = auth.uid() OR (user_id IS NULL AND guest_token_hash = public.request_guest_hash()));

DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
CREATE POLICY "Users can insert projects" ON public.projects FOR INSERT
WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND guest_token_hash = public.request_guest_hash()));

DROP POLICY IF EXISTS "claim_orphan_projects" ON public.projects;
CREATE POLICY "claim_orphan_projects" ON public.projects FOR UPDATE TO authenticated
USING (user_id IS NULL AND guest_token_hash = public.request_guest_hash())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view issues for their projects" ON public.issues;
CREATE POLICY "Users can view issues for their projects" ON public.issues FOR SELECT
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = issues.project_id));

-- Code archives must not use the public screenshot bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-archives', 'project-archives', false, 20971520, ARRAY['application/zip','application/x-zip-compressed','application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 20971520;

CREATE POLICY "Upload own project archive" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'project-archives' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE storage.objects.name = 'scans/' || p.id::text || '/source.zip'
));
CREATE POLICY "Read own project archive" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'project-archives' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE storage.objects.name = 'scans/' || p.id::text || '/source.zip'
));

-- Client-writable submissions cannot be treated as proof that a build finished.
DROP POLICY IF EXISTS "Users can manage own submissions" ON public.submissions;

-- Shared quotas count verified identities; an arbitrary Authorization header
-- must never bypass the anonymous limits. Serialize claims to avoid races.
CREATE OR REPLACE FUNCTION public.consume_scan_quota(p_ip text, p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ip_count bigint; total_count bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(739132);
  SELECT count(*) INTO ip_count FROM public.scan_events
    WHERE ip = CASE WHEN p_user_id IS NULL THEN p_ip ELSE 'user:' || p_user_id::text END
      AND created_at > now() - interval '1 hour';
  SELECT count(*) INTO total_count FROM public.scan_events WHERE created_at > now() - interval '1 hour';
  IF ip_count >= (CASE WHEN p_user_id IS NULL THEN 10 ELSE 60 END) OR total_count >= 1000 THEN RETURN false; END IF;
  INSERT INTO public.scan_events(ip, project_id)
  VALUES (CASE WHEN p_user_id IS NULL THEN p_ip ELSE 'user:' || p_user_id::text END, p_project_id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_scan_quota(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_quota(text, uuid, uuid) TO service_role;

-- Persist the report and its issues in one transaction.
CREATE OR REPLACE FUNCTION public.save_scan_result(p_project_id uuid, p_result jsonb, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.projects SET scan_result = p_result, status = p_status, updated_at = now() WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  DELETE FROM public.issues WHERE project_id = p_project_id;
  INSERT INTO public.issues(id, project_id, severity, category, title, description, auto_fixable, fix_description, fixed)
  SELECT coalesce((i->>'id')::uuid, gen_random_uuid()), p_project_id, i->>'severity', i->>'category', i->>'title', i->>'description',
    (i->>'auto_fixable')::boolean, i->>'fix_description', false
  FROM jsonb_array_elements(p_result->'issues') i;
END;
$$;
REVOKE ALL ON FUNCTION public.save_scan_result(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_scan_result(uuid, jsonb, text) TO service_role;
