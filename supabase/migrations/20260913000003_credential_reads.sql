-- Only credential status is public to its owner, including legacy rows that
-- may predate encryption. Workers retain service-role access to the payload.
REVOKE SELECT ON public.user_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,user_id,provider,label,is_valid,created_at,updated_at)
  ON public.user_credentials TO authenticated;
