BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT no_plan();

-- Only the service role may read page counts or the admin overview; the edge function checks the
-- caller is the owner before it asks.
SELECT is(has_function_privilege('anon', 'public.admin_overview(integer,text)', 'execute'), false, 'anon cannot run the admin overview');
SELECT is(has_function_privilege('authenticated', 'public.admin_overview(integer,text)', 'execute'), false, 'a signed-in user cannot run the admin overview');
SELECT is(has_function_privilege('service_role', 'public.admin_overview(integer,text)', 'execute'), true, 'the service role can run the admin overview');
SELECT is(has_function_privilege('anon', 'public.admin_period(timestamptz,timestamptz)', 'execute'), false, 'anon cannot run the period counts');
SELECT is(has_function_privilege('authenticated', 'public.admin_period(timestamptz,timestamptz)', 'execute'), false, 'a signed-in user cannot run the period counts');
SELECT is((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.page_views'::regclass), true, 'page_views has row level security');
SELECT is(has_table_privilege('anon', 'public.page_views', 'select'), false, 'anon cannot read page views');
SELECT is(has_table_privilege('authenticated', 'public.page_views', 'insert'), false, 'a signed-in user cannot write page views');

-- Fixture: two visitors, three page views today, one scan, one signup, one live and one test payment.
-- auth.users.created_at has no default (GoTrue sets it when someone signs up), so the fixture sets it.
INSERT INTO auth.users(id, email, raw_app_meta_data, created_at) VALUES
('30000000-0000-4000-8000-000000000001', 'free@example.test', '{"provider":"email"}', now()),
('30000000-0000-4000-8000-000000000002', 'paid@example.test', jsonb_build_object('provider','github','plan','ship','payment_mode','live','plan_activated_at', now()), now()),
('30000000-0000-4000-8000-000000000003', 'test@example.test', jsonb_build_object('provider','google','plan','unlimited','payment_mode','test','plan_activated_at', now()), now());
INSERT INTO public.page_views(visitor, path, referrer, source, country, device, entry) VALUES
('aaaa', '/', 'news.ycombinator.com', NULL, 'SE', 'desktop', true),
('aaaa', '/scan', NULL, NULL, 'SE', 'desktop', false),
('bbbb', '/', NULL, 'twitter', 'US', 'mobile', true);
INSERT INTO public.scan_events(ip) VALUES ('203.0.113.5');
INSERT INTO public.page_views(visitor, path, created_at) VALUES ('old', '/', now() - interval '400 days');

SELECT is((public.admin_overview(7)->'current'->>'visitors')::int, 2, 'two visitors in the week');
SELECT is((public.admin_overview(7)->'current'->>'pageviews')::int, 3, 'three page views in the week, the old one is outside it');
SELECT is((public.admin_overview(7)->'current'->>'scanner_visitors')::int, 1, 'one visitor reached the scanner');
SELECT is((public.admin_overview(7)->'current'->>'scans')::int, 1, 'one scan');
SELECT is((public.admin_overview(7)->'current'->>'signups')::int, 3, 'three signups');
SELECT is((public.admin_overview(7)->'current'->>'paid')::int, 1, 'only the live payment counts as paid');
SELECT is((public.admin_overview(7)->'current'->>'paid_ship')::int, 1, 'the live payment was the Ship plan');
SELECT is((public.admin_overview(7)->'current'->>'paid_unlimited')::int, 0, 'the test-mode Unlimited account is not revenue');
SELECT is((public.admin_overview(7)->'all_time'->>'paid')::int, 1, 'all-time paid is live payments only');
SELECT is(jsonb_array_length(public.admin_overview(7)->'by_day'), 7, 'one bucket per day, empty days included');
SELECT is((public.admin_overview(7)->'by_day'->6->>'visitors')::int, 2, 'today has the two visitors');
SELECT is(public.admin_overview(7)->'top_pages'->0->>'path', '/', 'the front page is the top page');
SELECT is((public.admin_overview(7)->'top_pages'->0->>'views')::int, 2, 'the front page has two views');
SELECT is(
  (SELECT jsonb_agg(s->>'name' ORDER BY s->>'name') FROM jsonb_array_elements(public.admin_overview(7)->'sources') s),
  '["news.ycombinator.com","twitter"]'::jsonb,
  'sources come from entry views, a campaign name wins over the referrer, and the second page of a visit is not "Direct"');
SELECT is((public.admin_overview(7)->'tracking_since') IS NOT NULL, true, 'it says when counting started');
SELECT is(jsonb_array_length(public.admin_overview(1000)->'by_day'), 365, 'the range is capped at a year');
SELECT is((public.admin_overview(0)->'range'->>'days')::int, 1, 'the range is at least a day');
SELECT is(jsonb_array_length(public.admin_overview(7)->'recent_signups'), 3, 'recent signups are listed');

SELECT * FROM finish();
ROLLBACK;
