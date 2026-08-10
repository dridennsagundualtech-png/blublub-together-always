CREATE OR REPLACE FUNCTION public.generate_redeem_code(_valid_hours integer DEFAULT 24)
 RETURNS redeem_codes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _code text; _row public.redeem_codes;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _valid_hours IS NULL OR _valid_hours < 1 OR _valid_hours > 168 THEN
    RAISE EXCEPTION 'Validity must be between 1 and 168 hours';
  END IF;
  LOOP
    _code := 'BB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redeem_codes WHERE upper(code) = _code);
  END LOOP;
  INSERT INTO public.redeem_codes (code, created_by, expires_at)
  VALUES (_code, auth.uid(), now() + make_interval(hours => _valid_hours))
  RETURNING * INTO _row;
  RETURN _row;
END; $function$;