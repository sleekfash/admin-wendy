-- Apply after migration 09 and staging verification; never run against production without approval.
BEGIN;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.product_option_choices WHERE group_id='30594a40-1fd1-4cca-8f80-280c9d975ec7' AND key IN ('8-inch-2-layers','8-inch-3-layers')) <> 2
 OR (SELECT count(*) FROM public.product_option_choices WHERE group_id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510' AND key IN ('second-tier-10-inch','third-tier-10-inch')) <> 2
 THEN RAISE EXCEPTION 'Unexpected pricing choices'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.products WHERE id='44ded383-6c8e-4cbd-a8a4-e42da64c0c8b' AND price_cents=0 AND deposit_percent=70 AND payment_rule='deposit') THEN RAISE EXCEPTION 'Migration 09 prerequisite missing'; END IF;
END $$;
UPDATE public.product_option_choices SET price_delta_cents=CASE key WHEN '8-inch-2-layers' THEN 18000 ELSE 25000 END, updated_at=clock_timestamp()
WHERE group_id='30594a40-1fd1-4cca-8f80-280c9d975ec7' AND key IN ('8-inch-2-layers','8-inch-3-layers') AND price_delta_cents IS DISTINCT FROM CASE key WHEN '8-inch-2-layers' THEN 18000 ELSE 25000 END;
UPDATE public.product_option_choices SET price_delta_cents=35000, updated_at=clock_timestamp()
WHERE group_id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510' AND key IN ('second-tier-10-inch','third-tier-10-inch') AND price_delta_cents IS DISTINCT FROM 35000;
COMMIT;
