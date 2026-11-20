-- Wendy's Bakehouse custom cake pricing, 2026-11.
-- Apply ONLY after backup and staging verification. This changes live prices and
-- supersedes the admin_save_pricing_v2 function from migration 08.
-- Historic order_items snapshots remain untouched.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b')
     OR (SELECT count(*) FROM public.product_option_choices WHERE group_id = '30594a40-1fd1-4cca-8f80-280c9d975ec7') <> 9
  THEN RAISE EXCEPTION 'Unexpected cake pricing schema: abort migration'; END IF;
END $$;

UPDATE public.products
SET price_cents = 0, deposit_percent = 70, deposit_cents = NULL,
    payment_rule = 'deposit', pricing_mode = 'deposit',
    buttercream_minimum_cents = NULL, fondant_minimum_cents = NULL,
    updated_at = clock_timestamp()
WHERE id = '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b';

UPDATE public.product_option_choices c
SET price_delta_cents = pricing.amount, available = pricing.available,
    updated_at = clock_timestamp()
FROM (VALUES
    ('6-inch-1-layer', 0, false),
    ('6-inch-2-layers', 13000, true),
    ('6-inch-3-layers', 18000, true),
    ('8-inch-1-layer', 10000, true),
    ('8-inch-2-layers', 17000, true),
    ('8-inch-3-layers', 23000, true),
    ('10-inch-1-layer', 15000, true),
    ('10-inch-2-layers', 28000, true),
    ('10-inch-3-layers', 35000, true)
) AS pricing(key, amount, available)
WHERE c.group_id = '30594a40-1fd1-4cca-8f80-280c9d975ec7'
  AND c.key = pricing.key;

-- Protect the retired option and the canonical deposit configuration in the
-- atomic admin pricing RPC; other products keep their original pricing rules.
CREATE OR REPLACE FUNCTION public.admin_save_pricing_v2(p_actor uuid, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  p public.products%ROWTYPE;
  live_choices jsonb;
  expected_choices jsonb;
  next_choices jsonb := p_payload->'choices';
  before_state jsonb;
  canonical constant uuid := '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b';
  cake_category constant uuid := '382b2742-6d74-4a4c-9a1f-dabaf5755a2d';
  base_price integer;
  deposit integer;
BEGIN
  -- Called only by the role-checked server using its service-role client.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_actor AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO STRICT p FROM public.products WHERE id = (p_payload->>'id')::uuid FOR UPDATE;
  IF p.updated_at IS DISTINCT FROM (p_payload->>'updated_at')::timestamptz THEN
    RAISE EXCEPTION 'Pricing changed. Reload before saving.';
  END IF;
  IF p.id <> canonical AND p.category_id = cake_category THEN
    RAISE EXCEPTION 'Design listings inherit Custom celebration cake pricing.';
  END IF;
  PERFORM 1 FROM public.product_option_groups WHERE product_id = p.id ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.product_option_choices c WHERE c.group_id IN
    (SELECT id FROM public.product_option_groups WHERE product_id = p.id) ORDER BY c.id FOR UPDATE;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) INTO live_choices
    FROM public.product_option_choices c WHERE c.group_id IN
    (SELECT id FROM public.product_option_groups WHERE product_id = p.id);
  IF jsonb_typeof(p_payload->'expected_choices') IS DISTINCT FROM 'array'
     OR jsonb_typeof(next_choices) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid choice snapshot';
  END IF;
  SELECT coalesce(jsonb_agg(e ORDER BY e->>'id'), '[]'::jsonb) INTO expected_choices
    FROM jsonb_array_elements(p_payload->'expected_choices') e;
  IF live_choices IS DISTINCT FROM expected_choices THEN
    RAISE EXCEPTION 'Choices changed. Reload before saving.';
  END IF;
  IF jsonb_array_length(next_choices) <> jsonb_array_length(live_choices)
    OR (SELECT count(DISTINCT e->>'id') FROM jsonb_array_elements(next_choices) e) <> jsonb_array_length(live_choices)
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(next_choices) e
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(live_choices) old WHERE old->>'id' = e->>'id')
        OR (e->>'price_delta_cents') IS NULL OR (e->>'price_delta_cents') !~ '^-?[0-9]+$'
        OR (e->>'price_delta_cents')::bigint NOT BETWEEN -100000 AND 10000000) THEN
    RAISE EXCEPTION 'Invalid choices';
  END IF;
  base_price := (p_payload->>'price_cents')::integer;
  deposit := (p_payload->>'deposit_percent')::integer;
  IF base_price IS NULL OR base_price NOT BETWEEN 0 AND 10000000
    OR deposit IS NULL OR deposit NOT BETWEEN 1 AND 100
    OR coalesce(p_payload->>'payment_rule', '') NOT IN ('full', 'deposit') THEN
    RAISE EXCEPTION 'Invalid price or deposit';
  END IF;
  IF p.id = canonical AND (p.category_id IS DISTINCT FROM cake_category
    OR p_payload->>'payment_rule' <> 'deposit' OR base_price <> 0
    OR deposit <> 70) THEN
    RAISE EXCEPTION 'Custom cakes require a zero base price and a 70 percent deposit.';
  END IF;
  before_state := jsonb_build_object('product', to_jsonb(p), 'choices', live_choices);
  UPDATE public.products SET
    price_cents = base_price,
    payment_rule = (p_payload->>'payment_rule')::public.payment_rule,
    pricing_mode = (CASE WHEN p_payload->>'payment_rule' = 'deposit' THEN 'deposit' ELSE 'fixed' END)::public.pricing_mode,
    deposit_percent = CASE WHEN p_payload->>'payment_rule' = 'deposit' THEN deposit ELSE NULL END,
    deposit_cents = NULL,
    buttercream_minimum_cents = CASE WHEN p.id = canonical THEN NULL ELSE p.buttercream_minimum_cents END,
    fondant_minimum_cents = CASE WHEN p.id = canonical THEN NULL ELSE p.fondant_minimum_cents END,
    updated_at = clock_timestamp()
  WHERE id = p.id;
  UPDATE public.product_option_choices c SET price_delta_cents = (e->>'price_delta_cents')::integer,
    updated_at = clock_timestamp() FROM jsonb_array_elements(next_choices) e WHERE c.id = (e->>'id')::uuid;
  INSERT INTO public.pricing_change_audit(actor_id, product_id, before_state, after_state)
    SELECT p_actor, p.id, before_state, jsonb_build_object('product', to_jsonb(updated), 'choices', next_choices)
    FROM public.products updated WHERE updated.id = p.id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_pricing_v2(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_pricing_v2(uuid,jsonb) TO service_role;

COMMIT;
