-- First-party, cookie-free page counting plus the numbers behind the owner's /admin page.
--
-- page_views is written by the `track` edge function and read by `admin_overview`, both with the
-- service role. No policy exists, so RLS denies everything to anon and authenticated, and the
-- grants are revoked as well. `visitor` is a hash that changes every day (see
-- supabase/functions/_shared/analytics.ts); no IP address, user agent or cookie is stored.
CREATE TABLE IF NOT EXISTS public.page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor text NOT NULL,
  path text NOT NULL,
  referrer text,
  source text,
  country text,
  device text,
  -- the first page of a visit: only these carry a referrer, so only these say where people came from
  entry boolean NOT NULL DEFAULT false
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_views FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_time ON public.page_views (visitor, created_at);

-- Counts for one period. Visitors are counted per day (the hash changes daily), so someone who comes
-- back on three days is three visitors, like in other cookie-free tools.
CREATE OR REPLACE FUNCTION public.admin_period(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'visitors', (SELECT count(DISTINCT visitor) FROM public.page_views WHERE created_at >= p_from AND created_at < p_to),
    'pageviews', (SELECT count(*) FROM public.page_views WHERE created_at >= p_from AND created_at < p_to),
    'scanner_visitors', (SELECT count(DISTINCT visitor) FROM public.page_views
                          WHERE created_at >= p_from AND created_at < p_to AND (path = '/scan' OR path LIKE '/scan/%')),
    'scans', (SELECT count(*) FROM public.scan_events WHERE created_at >= p_from AND created_at < p_to),
    -- signed-in scanners are 'user:<id>', guests are their IP address
    'scanners', (SELECT count(DISTINCT ip) FROM public.scan_events WHERE created_at >= p_from AND created_at < p_to),
    'signups', (SELECT count(*) FROM auth.users WHERE created_at >= p_from AND created_at < p_to),
    'paid', (SELECT count(*) FROM auth.users
              WHERE raw_app_meta_data->>'payment_mode' = 'live'
                AND (raw_app_meta_data->>'plan_activated_at')::timestamptz >= p_from
                AND (raw_app_meta_data->>'plan_activated_at')::timestamptz < p_to),
    'paid_ship', (SELECT count(*) FROM auth.users
                   WHERE raw_app_meta_data->>'payment_mode' = 'live' AND raw_app_meta_data->>'plan' = 'ship'
                     AND (raw_app_meta_data->>'plan_activated_at')::timestamptz >= p_from
                     AND (raw_app_meta_data->>'plan_activated_at')::timestamptz < p_to),
    'paid_unlimited', (SELECT count(*) FROM auth.users
                        WHERE raw_app_meta_data->>'payment_mode' = 'live' AND raw_app_meta_data->>'plan' = 'unlimited'
                          AND (raw_app_meta_data->>'plan_activated_at')::timestamptz >= p_from
                          AND (raw_app_meta_data->>'plan_activated_at')::timestamptz < p_to)
  );
$$;

-- Everything the admin page shows, in one call. Days are cut in p_tz so "today" is the owner's today.
CREATE OR REPLACE FUNCTION public.admin_overview(p_days integer DEFAULT 30, p_tz text DEFAULT 'Europe/Stockholm')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  n integer := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := (now() AT TIME ZONE p_tz)::date;
  first_day date := today - (n - 1);
  prev_first date := first_day - n;
  t0 timestamptz := first_day::timestamp AT TIME ZONE p_tz;
  tp timestamptz := prev_first::timestamp AT TIME ZONE p_tz;
  t1 timestamptz := (today + 1)::timestamp AT TIME ZONE p_tz;
BEGIN
  RETURN jsonb_build_object(
    'range', jsonb_build_object('days', n, 'from', first_day, 'to', today, 'tz', p_tz),
    'tracking_since', (SELECT min(created_at) FROM public.page_views),
    'current', public.admin_period(t0, t1),
    'previous', public.admin_period(tp, t0),

    'by_day', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day, 'visitors', coalesce(v.visitors, 0), 'pageviews', coalesce(v.pageviews, 0),
        'scans', coalesce(s.scans, 0), 'signups', coalesce(u.signups, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM (SELECT g::date AS day FROM generate_series(first_day, today, interval '1 day') AS g) d
      LEFT JOIN (SELECT (created_at AT TIME ZONE p_tz)::date AS day, count(DISTINCT visitor) AS visitors, count(*) AS pageviews
                   FROM public.page_views WHERE created_at >= t0 AND created_at < t1 GROUP BY 1) v ON v.day = d.day
      LEFT JOIN (SELECT (created_at AT TIME ZONE p_tz)::date AS day, count(*) AS scans
                   FROM public.scan_events WHERE created_at >= t0 AND created_at < t1 GROUP BY 1) s ON s.day = d.day
      LEFT JOIN (SELECT (created_at AT TIME ZONE p_tz)::date AS day, count(*) AS signups
                   FROM auth.users WHERE created_at >= t0 AND created_at < t1 GROUP BY 1) u ON u.day = d.day
    ),

    'top_pages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) ORDER BY views DESC, path), '[]'::jsonb)
      FROM (SELECT path, count(*) AS views, count(DISTINCT visitor) AS visitors FROM public.page_views
             WHERE created_at >= t0 AND created_at < t1 GROUP BY path ORDER BY count(*) DESC, path LIMIT 10) q
    ),
    'sources', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'visitors', visitors) ORDER BY visitors DESC, name), '[]'::jsonb)
      FROM (SELECT coalesce(nullif(source, ''), nullif(referrer, ''), 'Direct') AS name, count(DISTINCT visitor) AS visitors
              FROM public.page_views WHERE entry AND created_at >= t0 AND created_at < t1
             GROUP BY 1 ORDER BY count(DISTINCT visitor) DESC, 1 LIMIT 10) q
    ),
    'countries', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'visitors', visitors) ORDER BY visitors DESC, name), '[]'::jsonb)
      FROM (SELECT coalesce(country, 'Unknown') AS name, count(DISTINCT visitor) AS visitors FROM public.page_views
             WHERE created_at >= t0 AND created_at < t1 GROUP BY 1 ORDER BY count(DISTINCT visitor) DESC, 1 LIMIT 10) q
    ),
    'devices', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'visitors', visitors) ORDER BY visitors DESC, name), '[]'::jsonb)
      FROM (SELECT coalesce(device, 'unknown') AS name, count(DISTINCT visitor) AS visitors FROM public.page_views
             WHERE created_at >= t0 AND created_at < t1 GROUP BY 1) q
    ),

    'recent_signups', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'email', email,
        'provider', raw_app_meta_data->>'provider', 'plan', coalesce(raw_app_meta_data->>'plan', 'free')) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT created_at, email, raw_app_meta_data FROM auth.users ORDER BY created_at DESC LIMIT 10) q
    ),
    'recent_scans', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'name', name, 'repo_url', repo_url,
        'score', score, 'type', type, 'signed_in', signed_in) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT created_at, name, repo_url, scan_result->>'score' AS score, scan_result->>'project_type' AS type,
                   user_id IS NOT NULL AS signed_in
              FROM public.projects ORDER BY created_at DESC LIMIT 10) q
    ),
    'recent_builds', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('at', created_at, 'name', name, 'platform', platform,
        'build_status', build_status, 'review_status', review_status) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT s.created_at, p.name, s.platform, s.build_status, s.review_status
              FROM public.submissions s JOIN public.projects p ON p.id = s.project_id
             ORDER BY s.created_at DESC LIMIT 10) q
    ),

    'all_time', jsonb_build_object(
      'users', (SELECT count(*) FROM auth.users),
      'projects', (SELECT count(*) FROM public.projects),
      'scans', (SELECT count(*) FROM public.scan_events),
      'builds', (SELECT count(*) FROM public.submissions),
      'paid', (SELECT count(*) FROM auth.users WHERE raw_app_meta_data->>'payment_mode' = 'live')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_period(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_overview(integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_period(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_overview(integer, text) TO service_role;
