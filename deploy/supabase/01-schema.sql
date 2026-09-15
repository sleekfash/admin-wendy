-- Wendy's Bakehouse — database structure (roles, tables, RLS policies, functions, triggers)
-- Target: a fresh Supabase project. Run this FIRST in the SQL editor.
-- Generated from the live Lovable Cloud database.

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff'
);

--
-- Name: delivery_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_mode AS ENUM (
    'pickup_only',
    'fixed_zones',
    'distance'
);

--
-- Name: payment_rule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_rule AS ENUM (
    'full',
    'deposit'
);

--
-- Name: pricing_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pricing_mode AS ENUM (
    'fixed',
    'deposit',
    'quote'
);

--
-- Name: create_order(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_order(_order jsonb, _items jsonb) RETURNS TABLE(id uuid, reference text)
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
    delivery_fee_cents, total_cents, balance_cents, delivery_postal_code, delivery_snapshot
  )
  SELECT
    o.reference, o.customer_name, o.email, o.phone, o.pickup_date, o.pickup_window,
    o.fulfilment, o.delivery_area, o.occasion, o.notes, o.allergies, o.heard_from,
    o.subtotal_cents, o.due_now_cents, o.has_quote_items, o.status,
    o.checkout_method, o.payer_name, o.transfer_reference, o.transfer_date,
    o.payment_provider, o.payment_status,
    coalesce(o.delivery_fee_cents, 0), coalesce(o.total_cents, 0), coalesce(o.balance_cents, 0),
    o.delivery_postal_code, coalesce(o.delivery_snapshot, '{}'::jsonb)
  FROM jsonb_to_record(_order) AS o(
    reference text, customer_name text, email text, phone text,
    pickup_date date, pickup_window text, fulfilment text, delivery_area text,
    occasion text, notes text, allergies text, heard_from text,
    subtotal_cents integer, due_now_cents integer, has_quote_items boolean,
    status text, checkout_method text, payer_name text, transfer_reference text,
    transfer_date date, payment_provider text, payment_status text,
    delivery_fee_cents integer, total_cents integer, balance_cents integer,
    delivery_postal_code text, delivery_snapshot jsonb
  )
  RETURNING public.orders.id, public.orders.reference INTO new_id, new_ref;

  INSERT INTO public.order_items (
    order_id, product_id, product_slug, name, quantity,
    unit_price_cents, deposit_cents, pricing_mode, options, notes,
    options_snapshot, base_price_cents, options_total_cents,
    line_total_cents, line_due_now_cents, payment_rule, pack_size
  )
  SELECT
    new_id, i.product_id, i.product_slug, i.name, i.quantity,
    i.unit_price_cents, i.deposit_cents, i.pricing_mode::pricing_mode,
    coalesce(i.options, '{}'::jsonb), i.notes,
    coalesce(i.options_snapshot, '[]'::jsonb), coalesce(i.base_price_cents, 0),
    coalesce(i.options_total_cents, 0), coalesce(i.line_total_cents, 0),
    coalesce(i.line_due_now_cents, 0), coalesce(i.payment_rule, 'full')::payment_rule, i.pack_size
  FROM jsonb_to_recordset(_items) AS i(
    product_id uuid, product_slug text, name text, quantity integer,
    unit_price_cents integer, deposit_cents integer, pricing_mode text,
    options jsonb, notes text, options_snapshot jsonb,
    base_price_cents integer, options_total_cents integer,
    line_total_cents integer, line_due_now_cents integer,
    payment_rule text, pack_size integer
  );

  RETURN QUERY SELECT new_id, new_ref;
END;
$$;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

--
-- Name: is_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','staff')
  );
$$;

--
-- Name: sync_product_available(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_product_available() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.available := (NEW.status = 'available');
  RETURN NEW;
END;
$$;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    blurb text DEFAULT ''::text NOT NULL,
    image_key text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    postal_prefixes text[] DEFAULT '{}'::text[] NOT NULL,
    fee_cents integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT delivery_zones_fee_cents_check CHECK ((fee_cents >= 0))
);

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_slug text,
    name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_cents integer,
    deposit_cents integer,
    pricing_mode public.pricing_mode DEFAULT 'quote'::public.pricing_mode NOT NULL,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    options_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
    base_price_cents integer DEFAULT 0 NOT NULL,
    options_total_cents integer DEFAULT 0 NOT NULL,
    line_total_cents integer DEFAULT 0 NOT NULL,
    line_due_now_cents integer DEFAULT 0 NOT NULL,
    payment_rule public.payment_rule DEFAULT 'full'::public.payment_rule NOT NULL,
    pack_size integer
);

--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    customer_name text NOT NULL,
    email text,
    phone text NOT NULL,
    pickup_date date,
    pickup_window text,
    fulfilment text DEFAULT 'pickup'::text NOT NULL,
    delivery_area text,
    occasion text,
    notes text,
    allergies text,
    heard_from text,
    subtotal_cents integer DEFAULT 0 NOT NULL,
    due_now_cents integer DEFAULT 0 NOT NULL,
    has_quote_items boolean DEFAULT false NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    payment_status text DEFAULT 'not_paid'::text NOT NULL,
    payment_provider text,
    payment_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    checkout_method text DEFAULT 'whatsapp'::text NOT NULL,
    payer_name text,
    transfer_reference text,
    transfer_date date,
    slip_path text,
    delivery_fee_cents integer DEFAULT 0 NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    balance_cents integer DEFAULT 0 NOT NULL,
    delivery_postal_code text,
    delivery_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    stripe_session_id text,
    stripe_payment_intent_id text,
    paid_at timestamp with time zone,
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['not_paid'::text, 'pending_verification'::text, 'pending'::text, 'expired'::text, 'failed'::text, 'paid'::text, 'refunded'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['new'::text, 'confirmed'::text, 'baking'::text, 'ready'::text, 'collected'::text, 'cancelled'::text])))
);

--
-- Name: product_option_choices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_choices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    price_delta_cents integer DEFAULT 0 NOT NULL,
    available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: product_option_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    category_id uuid,
    short text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    pricing_mode public.pricing_mode DEFAULT 'quote'::public.pricing_mode NOT NULL,
    price_cents integer,
    deposit_cents integer,
    price_note text,
    price_band text,
    lead_time text DEFAULT ''::text NOT NULL,
    serves text,
    image_key text,
    image_url text,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    includes jsonb DEFAULT '[]'::jsonb NOT NULL,
    available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    payment_rule public.payment_rule DEFAULT 'full'::public.payment_rule NOT NULL,
    pack_size integer,
    pack_unit text,
    CONSTRAINT products_deposit_non_negative CHECK (((deposit_cents IS NULL) OR (deposit_cents >= 0))),
    CONSTRAINT products_deposit_within_price CHECK (((payment_rule <> 'deposit'::public.payment_rule) OR ((price_cents IS NOT NULL) AND (deposit_cents IS NOT NULL) AND (deposit_cents <= price_cents)))),
    CONSTRAINT products_pack_size_positive CHECK (((pack_size IS NULL) OR (pack_size > 0))),
    CONSTRAINT products_price_non_negative CHECK (((price_cents IS NULL) OR (price_cents >= 0))),
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['available'::text, 'unavailable'::text, 'archived'::text])))
);

--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    singleton boolean DEFAULT true NOT NULL,
    bank_account_name text DEFAULT 'Wendy''s Bakehouse'::text NOT NULL,
    bank_account_number text DEFAULT '0000000000'::text NOT NULL,
    bank_name text DEFAULT 'Bank name pending'::text NOT NULL,
    bank_note text DEFAULT 'Use your order reference as the transfer description.'::text NOT NULL,
    whatsapp_number text DEFAULT '+1 647 620 2518'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_mode public.delivery_mode DEFAULT 'pickup_only'::public.delivery_mode NOT NULL,
    delivery_origin_postal_code text,
    delivery_distance_config jsonb DEFAULT '{"bands": []}'::jsonb NOT NULL
);

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);

--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);

--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders_stripe_session_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_stripe_session_id_key ON public.orders USING btree (stripe_session_id) WHERE (stripe_session_id IS NOT NULL);

--
-- Name: orders orders_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_reference_key UNIQUE (reference);

--
-- Name: product_option_choices product_option_choices_group_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_choices
    ADD CONSTRAINT product_option_choices_group_id_key_key UNIQUE (group_id, key);

--
-- Name: product_option_choices product_option_choices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_choices
    ADD CONSTRAINT product_option_choices_pkey PRIMARY KEY (id);

--
-- Name: product_option_groups product_option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_groups
    ADD CONSTRAINT product_option_groups_pkey PRIMARY KEY (id);

--
-- Name: product_option_groups product_option_groups_product_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_groups
    ADD CONSTRAINT product_option_groups_product_id_key_key UNIQUE (product_id, key);

--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);

--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

--
-- Name: settings settings_singleton_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_singleton_key UNIQUE (singleton);

--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);

--
-- Name: product_option_choices_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_option_choices_group_idx ON public.product_option_choices USING btree (group_id);

--
-- Name: product_option_groups_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_option_groups_product_idx ON public.product_option_groups USING btree (product_id);

--
-- Name: categories categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: delivery_zones delivery_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: orders orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: product_option_choices product_option_choices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_option_choices_updated_at BEFORE UPDATE ON public.product_option_choices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: product_option_groups product_option_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_option_groups_updated_at BEFORE UPDATE ON public.product_option_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: products products_sync_available; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_sync_available BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_product_available();

--
-- Name: products products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: settings settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

--
-- Name: product_option_choices product_option_choices_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_choices
    ADD CONSTRAINT product_option_choices_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.product_option_groups(id) ON DELETE CASCADE;

--
-- Name: product_option_groups product_option_groups_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_groups
    ADD CONSTRAINT product_option_groups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: categories admins manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage categories" ON public.categories TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: delivery_zones admins manage delivery zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage delivery zones" ON public.delivery_zones TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: product_option_choices admins manage option choices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage option choices" ON public.product_option_choices TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: product_option_groups admins manage option groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage option groups" ON public.product_option_groups TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: order_items admins manage order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage order items" ON public.order_items TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: orders admins manage orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage orders" ON public.orders TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: products admins manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage products" ON public.products TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: settings admins manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage settings" ON public.settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles own roles readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));

--
-- Name: product_option_choices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_option_choices ENABLE ROW LEVEL SECURITY;

--
-- Name: product_option_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: product_option_choices public can read option choices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can read option choices" ON public.product_option_choices FOR SELECT TO authenticated, anon USING (true);

--
-- Name: product_option_groups public can read option groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can read option groups" ON public.product_option_groups FOR SELECT TO authenticated, anon USING (true);

--
-- Name: products public can read products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can read products" ON public.products FOR SELECT TO authenticated, anon USING (((available = true) OR public.is_admin()));

--
-- Name: categories public can read visible categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can read visible categories" ON public.categories FOR SELECT TO authenticated, anon USING (((visible = true) OR public.is_admin()));

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: categories staff read categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff read categories" ON public.categories FOR SELECT TO authenticated USING (public.is_staff());

--
-- Name: order_items staff read order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff read order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff());

--
-- Name: orders staff read orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff());

--
-- Name: products staff read products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff read products" ON public.products FOR SELECT TO authenticated USING (public.is_staff());

--
-- Name: orders staff update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

--
-- Name: FUNCTION create_order(_order jsonb, _items jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_order(_order jsonb, _items jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_order(_order jsonb, _items jsonb) TO service_role;

--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;

--
-- Name: FUNCTION is_staff(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_staff() TO anon;
GRANT ALL ON FUNCTION public.is_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_staff() TO service_role;

--
-- Name: FUNCTION sync_product_available(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_product_available() TO anon;
GRANT ALL ON FUNCTION public.sync_product_available() TO authenticated;
GRANT ALL ON FUNCTION public.sync_product_available() TO service_role;

--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

--
-- Name: TABLE delivery_zones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.delivery_zones TO anon;
GRANT ALL ON TABLE public.delivery_zones TO authenticated;
GRANT ALL ON TABLE public.delivery_zones TO service_role;

--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: -
--

-- Order items are only ever read/written by trusted server code.
REVOKE ALL ON TABLE public.order_items FROM anon, authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;

--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

-- Orders are only ever read/written by trusted server code.
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

--
-- Name: TABLE product_option_choices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_option_choices TO anon;
GRANT ALL ON TABLE public.product_option_choices TO authenticated;
GRANT ALL ON TABLE public.product_option_choices TO service_role;

--
-- Name: TABLE product_option_groups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_option_groups TO anon;
GRANT ALL ON TABLE public.product_option_groups TO authenticated;
GRANT ALL ON TABLE public.product_option_groups TO service_role;

--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

--
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.settings TO anon;
GRANT ALL ON TABLE public.settings TO authenticated;
GRANT ALL ON TABLE public.settings TO service_role;

--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

-- Role assignments are never reachable from the browser; role checks go
-- through the SECURITY DEFINER helpers is_admin()/is_staff().
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

--
-- PostgreSQL database dump complete
--


