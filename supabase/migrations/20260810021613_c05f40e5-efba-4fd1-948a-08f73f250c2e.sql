CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  kind text NOT NULL,
  task text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'playing',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  turn uuid,
  winner_id uuid,
  is_draw boolean NOT NULL DEFAULT false,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple access" ON public.games
  FOR ALL TO authenticated
  USING (couple_id = public.current_couple_id())
  WITH CHECK (couple_id = public.current_couple_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX games_couple_created_idx ON public.games (couple_id, created_at DESC);

ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adult_confirmed boolean NOT NULL DEFAULT false;