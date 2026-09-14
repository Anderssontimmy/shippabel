CREATE OR REPLACE FUNCTION public.apply_stripe_event(p_event jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE object jsonb := p_event #> '{data,object}';
  target_id uuid; purchased_plan text; current_plan text;
BEGIN
  INSERT INTO public.stripe_events(id, type) VALUES (p_event->>'id', p_event->>'type') ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN RETURN 'duplicate'; END IF;
  -- One-time plans: unpaid checkouts and subscription events cannot grant or
  -- revoke a permanent purchase.
  IF p_event->>'type' NOT IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
    OR object->>'mode' IS DISTINCT FROM 'payment'
    OR object->>'payment_status' IS DISTINCT FROM 'paid' THEN RETURN 'ignored'; END IF;
  purchased_plan := object #>> '{metadata,plan}';
  IF purchased_plan NOT IN ('ship','unlimited') OR purchased_plan IS NULL THEN RAISE EXCEPTION 'Unknown purchase plan'; END IF;
  target_id := (object #>> '{metadata,supabase_user_id}')::uuid;
  SELECT raw_app_meta_data->>'plan' INTO current_plan FROM auth.users WHERE id = target_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment user not found'; END IF;
  UPDATE auth.users SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'plan', CASE WHEN current_plan = 'unlimited' THEN 'unlimited' ELSE purchased_plan END,
    'stripe_customer_id', object->>'customer', 'plan_activated_at', now(), 'payment_mode', CASE WHEN (p_event->>'livemode')::boolean THEN 'live' ELSE 'test' END
  ), updated_at = now() WHERE id = target_id;
  RETURN 'applied';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_stripe_event(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_event(jsonb) TO service_role;
