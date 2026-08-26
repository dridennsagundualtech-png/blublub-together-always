ALTER TABLE public.photos ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS photos_one_pinned_per_couple ON public.photos (couple_id) WHERE is_pinned;

CREATE TABLE public.photo_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('heart','laugh','hug')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_reactions TO authenticated;
GRANT ALL ON public.photo_reactions TO service_role;
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couple members can view reactions" ON public.photo_reactions FOR SELECT TO authenticated USING (couple_id = public.current_couple_id());
CREATE POLICY "Couple members can add their reactions" ON public.photo_reactions FOR INSERT TO authenticated WITH CHECK (couple_id = public.current_couple_id() AND user_id = auth.uid());
CREATE POLICY "Users can remove their reactions" ON public.photo_reactions FOR DELETE TO authenticated USING (couple_id = public.current_couple_id() AND user_id = auth.uid());