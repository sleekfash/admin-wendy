-- Wendy's Bakehouse — upgrade an existing database for percentage deposits,
-- multi-select product options, and the existing Stripe payment workflow.
-- Run this before re-running the idempotent 02-data.sql seed.

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deposit_percent integer;
ALTER TABLE public.product_option_groups
  ADD COLUMN IF NOT EXISTS allow_multiple boolean DEFAULT false NOT NULL;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS deposit_percent integer;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deposit_percent integer,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_deposit_within_price,
  DROP CONSTRAINT IF EXISTS products_deposit_percent_valid;
ALTER TABLE public.products
  ADD CONSTRAINT products_deposit_percent_valid
    CHECK (deposit_percent IS NULL OR deposit_percent BETWEEN 1 AND 100),
  ADD CONSTRAINT products_deposit_within_price
    CHECK (
      payment_rule <> 'deposit'
      OR (
        price_cents IS NOT NULL
        AND (
          (deposit_percent IS NOT NULL AND deposit_percent BETWEEN 1 AND 100)
          OR (deposit_cents IS NOT NULL AND deposit_cents <= price_cents)
        )
      )
    );

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_deposit_percent_valid;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_deposit_percent_valid
    CHECK (deposit_percent IS NULL OR deposit_percent BETWEEN 1 AND 100);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_deposit_percent_valid,
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_deposit_percent_valid
    CHECK (deposit_percent IS NULL OR deposit_percent BETWEEN 1 AND 100),
  ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status = ANY (ARRAY[
      'not_paid', 'pending_verification', 'pending', 'expired', 'failed', 'paid', 'refunded'
    ]));

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_key
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_order(_order jsonb, _items jsonb)
RETURNS TABLE(id uuid, reference text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
  new_ref text;
BEGIN
  INSERT INTO public.orders (
    reference, customer_name, email, phone, pickup_date, pickup_window,
    fulfilment, delivery_area, occasion, notes, allergies, heard_from,
    subtotal_cents, due_now_cents, has_quote_items, status,
    checkout_method, payer_name, transfer_reference, transfer_date,
    payment_provider, payment_status,
    delivery_fee_cents, total_cents, balance_cents, delivery_postal_code,
    delivery_snapshot, deposit_percent
  )
  SELECT
    o.reference, o.customer_name, o.email, o.phone, o.pickup_date, o.pickup_window,
    o.fulfilment, o.delivery_area, o.occasion, o.notes, o.allergies, o.heard_from,
    o.subtotal_cents, o.due_now_cents, o.has_quote_items, o.status,
    o.checkout_method, o.payer_name, o.transfer_reference, o.transfer_date,
    o.payment_provider, o.payment_status,
    coalesce(o.delivery_fee_cents, 0), coalesce(o.total_cents, 0),
    coalesce(o.balance_cents, 0), o.delivery_postal_code,
    coalesce(o.delivery_snapshot, '{}'::jsonb), o.deposit_percent
  FROM jsonb_to_record(_order) AS o(
    reference text, customer_name text, email text, phone text,
    pickup_date date, pickup_window text, fulfilment text, delivery_area text,
    occasion text, notes text, allergies text, heard_from text,
    subtotal_cents integer, due_now_cents integer, has_quote_items boolean,
    status text, checkout_method text, payer_name text, transfer_reference text,
    transfer_date date, payment_provider text, payment_status text,
    delivery_fee_cents integer, total_cents integer, balance_cents integer,
    delivery_postal_code text, delivery_snapshot jsonb, deposit_percent integer
  )
  RETURNING public.orders.id, public.orders.reference INTO new_id, new_ref;

  INSERT INTO public.order_items (
    order_id, product_id, product_slug, name, quantity,
    unit_price_cents, deposit_cents, pricing_mode, options, notes,
    options_snapshot, base_price_cents, options_total_cents,
    line_total_cents, line_due_now_cents, payment_rule, pack_size, deposit_percent
  )
  SELECT
    new_id, i.product_id, i.product_slug, i.name, i.quantity,
    i.unit_price_cents, i.deposit_cents, i.pricing_mode::pricing_mode,
    coalesce(i.options, '{}'::jsonb), i.notes,
    coalesce(i.options_snapshot, '[]'::jsonb), coalesce(i.base_price_cents, 0),
    coalesce(i.options_total_cents, 0), coalesce(i.line_total_cents, 0),
    coalesce(i.line_due_now_cents, 0),
    coalesce(i.payment_rule, 'full')::payment_rule, i.pack_size, i.deposit_percent
  FROM jsonb_to_recordset(_items) AS i(
    product_id uuid, product_slug text, name text, quantity integer,
    unit_price_cents integer, deposit_cents integer, pricing_mode text,
    options jsonb, notes text, options_snapshot jsonb,
    base_price_cents integer, options_total_cents integer,
    line_total_cents integer, line_due_now_cents integer,
    payment_rule text, pack_size integer, deposit_percent integer
  );

  RETURN QUERY SELECT new_id, new_ref;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM authenticated;
GRANT ALL ON FUNCTION public.create_order(jsonb, jsonb) TO service_role;

-- Business writes are performed only by role-checked server functions. Keeping
-- browser sessions read-only prevents direct REST calls from bypassing pricing,
-- immutable order snapshots, and payment-state transitions.
DROP POLICY IF EXISTS "admins manage orders" ON public.orders;
DROP POLICY IF EXISTS "admins read orders" ON public.orders;
DROP POLICY IF EXISTS "staff update orders" ON public.orders;
CREATE POLICY "admins read orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON TABLE public.orders, public.order_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.orders, public.order_items TO authenticated;

REVOKE ALL ON TABLE
  public.products,
  public.product_option_groups,
  public.product_option_choices
FROM anon, authenticated;
GRANT SELECT ON TABLE
  public.products,
  public.product_option_groups,
  public.product_option_choices
TO anon, authenticated;

COMMIT;
