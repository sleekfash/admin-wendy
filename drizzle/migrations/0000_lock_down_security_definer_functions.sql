-- create_order is only ever invoked by trusted server code with the service role.
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_order(jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb) TO service_role;

-- Move the role helper out of the exposed API schema.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
