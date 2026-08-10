CREATE TABLE public.photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_comments TO authenticated;
GRANT ALL ON public.photo_comments TO service_role;

ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can view comments" ON public.photo_comments
FOR SELECT TO authenticated USING (couple_id = public.current_couple_id());

CREATE POLICY "Couple members can add comments" ON public.photo_comments
FOR INSERT TO authenticated WITH CHECK (couple_id = public.current_couple_id() AND created_by = auth.uid());

CREATE POLICY "Authors can update their comments" ON public.photo_comments
FOR UPDATE TO authenticated USING (couple_id = public.current_couple_id() AND created_by = auth.uid())
WITH CHECK (couple_id = public.current_couple_id() AND created_by = auth.uid());

CREATE POLICY "Authors can delete their comments" ON public.photo_comments
FOR DELETE TO authenticated USING (couple_id = public.current_couple_id() AND created_by = auth.uid());

CREATE INDEX photo_comments_photo_id_idx ON public.photo_comments (photo_id, created_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.photo_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();