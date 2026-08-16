CREATE TABLE public.rooms (
  couple_id uuid PRIMARY KEY REFERENCES public.couples(id) ON DELETE CASCADE,
  love_points integer NOT NULL DEFAULT 120,
  plant_growth integer NOT NULL DEFAULT 0,
  plant_watered_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couple can manage their room" ON public.rooms FOR ALL TO authenticated
  USING (couple_id = public.current_couple_id())
  WITH CHECK (couple_id = public.current_couple_id());

CREATE TABLE public.room_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  x numeric NOT NULL DEFAULT 50,
  y numeric NOT NULL DEFAULT 50,
  rotation integer NOT NULL DEFAULT 0,
  scale numeric NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_items TO authenticated;
GRANT ALL ON public.room_items TO service_role;
ALTER TABLE public.room_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couple can manage their room items" ON public.room_items FOR ALL TO authenticated
  USING (couple_id = public.current_couple_id())
  WITH CHECK (couple_id = public.current_couple_id());

CREATE TABLE public.room_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_unlocks TO authenticated;
GRANT ALL ON public.room_unlocks TO service_role;
ALTER TABLE public.room_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couple can manage their room unlocks" ON public.room_unlocks FOR ALL TO authenticated
  USING (couple_id = public.current_couple_id())
  WITH CHECK (couple_id = public.current_couple_id());

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_room_items_updated_at BEFORE UPDATE ON public.room_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_room_unlocks_updated_at BEFORE UPDATE ON public.room_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;