ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS github_run_id text;

CREATE OR REPLACE FUNCTION public.start_build(p_project_id uuid, p_platform text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE submission_id uuid;
BEGIN
  PERFORM 1 FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.submissions WHERE project_id = p_project_id AND build_status IN ('pending','in_progress'))
    THEN RAISE EXCEPTION 'A build is already in progress'; END IF;
  INSERT INTO public.submissions(project_id, platform, build_status, review_status)
    VALUES(p_project_id, p_platform, 'in_progress', 'not_submitted') RETURNING id INTO submission_id;
  UPDATE public.projects SET status = 'building', updated_at = now() WHERE id = p_project_id;
  RETURN submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_build(p_project_id uuid, p_submission_id uuid, p_status text, p_run_id text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_status text;
BEGIN
  IF p_status NOT IN ('success', 'failure', 'cancelled') THEN RAISE EXCEPTION 'Invalid build status'; END IF;
  PERFORM 1 FROM public.projects WHERE id = p_project_id FOR UPDATE;
  SELECT build_status INTO current_status FROM public.submissions WHERE id = p_submission_id AND project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF current_status NOT IN ('pending','in_progress') THEN RETURN 'duplicate'; END IF;
  UPDATE public.submissions SET build_status = CASE WHEN p_status = 'success' THEN 'completed' ELSE 'failed' END,
    github_run_id = p_run_id WHERE id = p_submission_id;
  -- A completed build is ready for submission. It has not been submitted.
  IF p_submission_id = (SELECT id FROM public.submissions WHERE project_id = p_project_id ORDER BY created_at DESC LIMIT 1) THEN
    UPDATE public.projects SET status = CASE WHEN p_status = 'success' THEN 'ready' ELSE 'issues_found' END, updated_at = now() WHERE id = p_project_id;
  END IF;
  RETURN 'applied';
END;
$$;
REVOKE ALL ON FUNCTION public.start_build(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_build(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_build(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_build(uuid,uuid,text,text) TO service_role;
