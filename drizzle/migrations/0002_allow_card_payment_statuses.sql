ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY[
    'not_paid'::text,
    'pending_verification'::text,
    'pending'::text,
    'expired'::text,
    'failed'::text,
    'paid'::text,
    'refunded'::text
  ]));