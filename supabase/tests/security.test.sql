BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
-- This transaction contains only test metadata and rolls back. Match Storage's
-- own session flag so direct pgTAP DELETE statements can exercise the RLS rule.
SET LOCAL storage.allow_delete_query = 'true';
SELECT no_plan();

INSERT INTO auth.users(id, email, raw_app_meta_data) VALUES
('10000000-0000-4000-8000-000000000001','one@example.test','{}'),
('10000000-0000-4000-8000-000000000002','two@example.test','{}');
INSERT INTO public.projects(id,name,user_id) VALUES
('20000000-0000-4000-8000-000000000001','owned','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','legacy guest',null);
SELECT set_config('request.headers', jsonb_build_object('x-guest-token',repeat('a',64))::text,true);
INSERT INTO public.projects(id,name) VALUES ('20000000-0000-4000-8000-000000000003','guest a');
SELECT set_config('request.headers', jsonb_build_object('x-guest-token',repeat('b',64))::text,true);
INSERT INTO public.projects(id,name) VALUES ('20000000-0000-4000-8000-000000000004','guest b');
INSERT INTO public.issues(project_id,severity,category,title,description) VALUES
('20000000-0000-4000-8000-000000000003','critical','security','guest a issue','fixture');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.projects),1,'Guest B sees only its own report');
SELECT is((SELECT count(*)::int FROM public.issues),0,'Guest B cannot read guest A issues');
SELECT set_config('request.headers', '{}',true);
SELECT is((SELECT count(*)::int FROM public.projects),0,'No guest token cannot enumerate reports, including legacy rows');
SELECT throws_ok($$INSERT INTO public.projects(name) VALUES('unscoped')$$,'42501',null,'Guest project creation requires proof');
SELECT set_config('request.headers', jsonb_build_object('x-guest-token',repeat('a',64))::text,true);
SELECT is((SELECT count(*)::int FROM public.issues),1,'Guest A can read its own issues');
SELECT lives_ok($$INSERT INTO storage.objects(bucket_id,name) VALUES('project-archives','scans/20000000-0000-4000-8000-000000000003/source.zip')$$,'Guest A can upload to its own private path');
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='project-archives'),0,'Even the uploading guest cannot warm a shared archive download cache');
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name) VALUES('project-archives','scans/20000000-0000-4000-8000-000000000004/source.zip')$$,'42501',null,'Guest A cannot upload into guest B project');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
SELECT results_eq($$UPDATE public.projects SET user_id='10000000-0000-4000-8000-000000000002' WHERE id='20000000-0000-4000-8000-000000000004' RETURNING id$$,ARRAY[]::uuid[],'Login alone cannot claim another guest report');
SELECT results_eq($$UPDATE public.projects SET user_id='10000000-0000-4000-8000-000000000002' WHERE id='20000000-0000-4000-8000-000000000003' RETURNING id$$,ARRAY['20000000-0000-4000-8000-000000000003'::uuid],'Valid guest proof can claim the report after login');
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='project-archives'),0,'Authenticated project owners also use server-only archive reads');
SELECT lives_ok($$INSERT INTO storage.objects(bucket_id,name) VALUES('projects','screenshots/20000000-0000-4000-8000-000000000003/page_1.png')$$,'Owner can upload screenshot');
SELECT throws_ok($$INSERT INTO storage.objects(bucket_id,name) VALUES('projects','screenshots/20000000-0000-4000-8000-000000000001/page_1.png')$$,'42501',null,'Owner cannot upload screenshot to another project');
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id='projects'),1,'Owner can read own screenshot metadata for replacement');
SELECT throws_ok($$UPDATE storage.objects SET name='screenshots/20000000-0000-4000-8000-000000000001/page_1.png' WHERE bucket_id='projects'$$,'42501',null,'Owner cannot move a screenshot into another project');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SELECT results_eq($$UPDATE storage.objects SET metadata='{"overwritten":true}' WHERE bucket_id='projects' RETURNING name$$,ARRAY[]::text[],'Foreign screenshot cannot be overwritten');
SELECT results_eq($$DELETE FROM storage.objects WHERE bucket_id='projects' RETURNING name$$,ARRAY[]::text[],'Foreign screenshot cannot be deleted');
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
SELECT results_eq($$DELETE FROM storage.objects WHERE bucket_id='projects' RETURNING name$$,ARRAY['screenshots/20000000-0000-4000-8000-000000000003/page_1.png']::text[],'Owner can clean up a failed screenshot upload');
SELECT throws_ok($$INSERT INTO public.submissions(project_id,platform,build_status) VALUES('20000000-0000-4000-8000-000000000003','android','completed')$$,'42501',null,'Clients cannot fabricate completed builds');
SELECT throws_ok($$SELECT public.consume_scan_quota('ip','20000000-0000-4000-8000-000000000003',NULL)$$,'42501',null,'Clients cannot invoke privileged quotas');
SELECT throws_ok($$SELECT public.apply_stripe_event('{}')$$,'42501',null,'Clients cannot grant payment entitlements');
RESET ROLE;
SELECT is((SELECT public FROM storage.buckets WHERE id='project-archives'),false,'Source archive bucket is private');

-- Atomic Stripe processing and permanent-plan behavior.
CREATE FUNCTION pg_temp.payment(event_id text, plan text, payment_status text DEFAULT 'paid', user_id text DEFAULT '10000000-0000-4000-8000-000000000001') RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('id',event_id,'type','checkout.session.completed','livemode',false,'data',jsonb_build_object('object',jsonb_build_object(
    'mode','payment','payment_status',payment_status,'customer','cus_test','metadata',jsonb_build_object('plan',plan,'supabase_user_id',user_id))));
$$;
SELECT is(public.apply_stripe_event(pg_temp.payment('evt_unpaid','ship','unpaid')),'ignored','Unpaid checkout does not activate plan');
SELECT is((SELECT raw_app_meta_data->>'plan' FROM auth.users WHERE id='10000000-0000-4000-8000-000000000001'),NULL,'Plan remains free before payment');
SELECT is(public.apply_stripe_event(pg_temp.payment('evt_paid','ship')),'applied','Paid checkout activates plan');
SELECT is(public.apply_stripe_event(pg_temp.payment('evt_paid','ship')),'duplicate','Webhook replay is idempotent');
SELECT is(public.apply_stripe_event(pg_temp.payment('evt_upgrade','unlimited')),'applied','Unlimited upgrade applies');
SELECT is(public.apply_stripe_event(pg_temp.payment('evt_delayed','ship')),'applied','Delayed lower-tier event processed');
SELECT is((SELECT raw_app_meta_data->>'plan' FROM auth.users WHERE id='10000000-0000-4000-8000-000000000001'),'unlimited','Delayed lower-tier event cannot downgrade unlimited');
SELECT throws_ok($$SELECT public.apply_stripe_event(pg_temp.payment('evt_bad','invalid'))$$,'P0001',null,'Invalid plan fails transaction');
SELECT is((SELECT count(*)::int FROM public.stripe_events WHERE id='evt_bad'),0,'Failed event remains retryable');
SELECT throws_ok($$SELECT public.apply_stripe_event(pg_temp.payment('evt_missing','ship','paid','10000000-0000-4000-8000-000000000009'))$$,'P0001',null,'Missing account fails transaction');
SELECT is((SELECT count(*)::int FROM public.stripe_events WHERE id='evt_missing'),0,'Missing-account event is not silently consumed');

-- Correct build identity, concurrency and retries.
CREATE TEMP TABLE build_fixture AS SELECT public.start_build('20000000-0000-4000-8000-000000000001','android') id;
SELECT throws_ok($$SELECT public.start_build('20000000-0000-4000-8000-000000000001','android')$$,'P0001','A build is already in progress','Concurrent dispatch is rejected');
SELECT throws_ok($$SELECT public.complete_build('20000000-0000-4000-8000-000000000003',(SELECT id FROM build_fixture),'success','123')$$,'P0001','Submission not found','Callback cannot target a foreign project');
SELECT is(public.complete_build('20000000-0000-4000-8000-000000000001',(SELECT id FROM build_fixture),'success','123'),'applied','Correct callback completes exact submission');
SELECT is((SELECT status FROM public.projects WHERE id='20000000-0000-4000-8000-000000000001'),'ready','Build success is ready, not submitted');
SELECT is(public.complete_build('20000000-0000-4000-8000-000000000001',(SELECT id FROM build_fixture),'failure','123'),'duplicate','Late conflicting callback cannot reverse success');
SELECT is((SELECT build_status FROM public.submissions WHERE id=(SELECT id FROM build_fixture)),'completed','Terminal build stays completed');

-- Quota and atomic scan writes.
SELECT ok(public.consume_scan_quota('fixture-ip','20000000-0000-4000-8000-000000000001',NULL),'First guest scan is allowed');
SELECT public.consume_scan_quota('fixture-ip','20000000-0000-4000-8000-000000000001',NULL) FROM generate_series(1,9);
SELECT is(public.consume_scan_quota('fixture-ip','20000000-0000-4000-8000-000000000001',NULL),false,'Guest quota blocks attempt 11');
SELECT throws_ok($$SELECT public.save_scan_result('20000000-0000-4000-8000-000000000003','{"issues":[{"severity":"invalid","category":"security","title":"bad","description":"bad","auto_fixable":false}]}','ready')$$,'23514',null,'Bad issue aborts scan transaction');
SELECT is((SELECT title FROM public.issues WHERE project_id='20000000-0000-4000-8000-000000000003'),'guest a issue','Previous issues survive failed scan save');
SELECT * FROM finish();
ROLLBACK;
