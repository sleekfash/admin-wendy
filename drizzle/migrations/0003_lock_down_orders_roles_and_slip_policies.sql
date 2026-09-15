-- 1. Role checks must not depend on the caller being able to read user_roles.
--    SECURITY DEFINER keeps role lookups working while user_roles stays
--    completely unreachable from the browser.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','staff')
  );
$$;

-- 2. Orders, order items and role assignments are written and read only by
--    trusted server code. Make the lockdown explicit so a future default
--    grant cannot silently open them to the Data API.
REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.order_items FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.user_roles TO service_role;

-- 3. Order creation is only ever invoked by trusted server code.
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb) TO service_role;

-- 4. Payment slips: explicit, narrowly scoped storage policies.
--    Uploads keep happening through trusted server code; no client role may
--    write. Admins and staff may read slips, and only admins may remove them.
DROP POLICY IF EXISTS "staff read payment slips" ON storage.objects;
CREATE POLICY "staff read payment slips"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-slips' AND public.is_staff());

DROP POLICY IF EXISTS "admins delete payment slips" ON storage.objects;
CREATE POLICY "admins delete payment slips"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-slips' AND public.is_admin());