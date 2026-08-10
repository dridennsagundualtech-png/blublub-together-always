ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_location boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS song_title text,
  ADD COLUMN IF NOT EXISTS song_artist text;

ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS next_due_on date;
UPDATE public.bills SET next_due_on = make_date(
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  EXTRACT(MONTH FROM CURRENT_DATE)::int,
  LEAST(GREATEST(due_day,1),28)
) WHERE next_due_on IS NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;
ALTER TABLE public.messages ALTER COLUMN body SET DEFAULT '';

CREATE TABLE public.locations (
  user_id uuid PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own location all" ON public.locations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "partner shared location select" ON public.locations FOR SELECT TO authenticated
  USING (
    couple_id IS NOT NULL AND couple_id = public.current_couple_id()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = locations.user_id AND p.share_location)
  );
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bucket_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  notes text,
  target_date date,
  done boolean NOT NULL DEFAULT false,
  done_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_list TO authenticated;
GRANT ALL ON public.bucket_list TO service_role;
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "couple access" ON public.bucket_list FOR ALL TO authenticated
  USING (couple_id = public.current_couple_id()) WITH CHECK (couple_id = public.current_couple_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bucket_list
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  feeling text NOT NULL DEFAULT '',
  need text NOT NULL DEFAULT '',
  responsibility text NOT NULL DEFAULT '',
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cooldowns TO authenticated;
GRANT ALL ON public.cooldowns TO service_role;
ALTER TABLE public.cooldowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cooldown all" ON public.cooldowns FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid() AND couple_id = public.current_couple_id());
CREATE POLICY "partner shared cooldown select" ON public.cooldowns FOR SELECT TO authenticated
  USING (shared AND couple_id = public.current_couple_id());
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cooldowns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cooldowns;