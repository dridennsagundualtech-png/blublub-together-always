
-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Redeem codes upgrade
DELETE FROM public.redeem_codes;
ALTER TABLE public.redeem_codes
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS used_at timestamptz,
  ADD COLUMN IF NOT EXISTS used_by uuid;

DO $$ BEGIN
  ALTER TABLE public.redeem_codes ADD PRIMARY KEY (code);
EXCEPTION WHEN others THEN NULL; END $$;

GRANT ALL ON public.redeem_codes TO service_role;

DROP POLICY IF EXISTS "admins read codes" ON public.redeem_codes;
CREATE POLICY "admins read codes" ON public.redeem_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.redeem_codes TO authenticated;

-- Redeem: only unexpired, unused codes; single use
CREATE OR REPLACE FUNCTION public.redeem_premium(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hit int;
BEGIN
  UPDATE public.redeem_codes
     SET used_at = now(), used_by = auth.uid()
   WHERE upper(code) = upper(trim(_code))
     AND used_at IS NULL
     AND expires_at > now();
  GET DIAGNOSTICS _hit = ROW_COUNT;
  IF _hit = 0 THEN RETURN false; END IF;
  UPDATE public.profiles SET is_premium = true, updated_at = now() WHERE id = auth.uid();
  RETURN true;
END; $$;

-- Admin-only generator
CREATE OR REPLACE FUNCTION public.generate_redeem_code(_valid_hours int DEFAULT 24)
RETURNS public.redeem_codes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _code text; _row public.redeem_codes;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _valid_hours IS NULL OR _valid_hours < 1 OR _valid_hours > 168 THEN
    RAISE EXCEPTION 'Validity must be between 1 and 168 hours';
  END IF;
  LOOP
    _code := 'BB-' || upper(substr(replace(encode(gen_random_bytes(8),'base64'),'/','') , 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redeem_codes WHERE upper(code) = _code);
  END LOOP;
  INSERT INTO public.redeem_codes (code, created_by, expires_at)
  VALUES (_code, auth.uid(), now() + make_interval(hours => _valid_hours))
  RETURNING * INTO _row;
  RETURN _row;
END; $$;
