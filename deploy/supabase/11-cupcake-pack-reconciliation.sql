-- Apply after staging validation and backup. Preserve historical order snapshots.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.products WHERE id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502' AND price_cents=3500 AND payment_rule='full')
 OR NOT EXISTS (SELECT 1 FROM public.product_option_groups WHERE id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503' AND product_id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502' AND key='box-size')
 THEN RAISE EXCEPTION 'Unexpected cupcake pricing configuration'; END IF;
END $$;
UPDATE public.product_option_choices SET available=false, updated_at=clock_timestamp() WHERE group_id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503' AND key='box-20' AND available;
INSERT INTO public.product_option_choices (id,group_id,key,label,price_delta_cents,available,sort_order)
VALUES ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d573','f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503','box-24','Box of 24',7300,true,4)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.product_option_choices WHERE group_id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503' AND key='box-24' AND price_delta_cents=7300 AND available)
 THEN RAISE EXCEPTION '24 cupcake pack verification failed'; END IF;
END $$;
UPDATE public.products SET short='6 for $35, 12 for $60, or 24 for $108.', updated_at=clock_timestamp() WHERE id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502';
UPDATE public.categories SET blurb='Fresh cupcakes in boxes of 6, 12 or 24.' WHERE id='f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d501';
COMMIT;
