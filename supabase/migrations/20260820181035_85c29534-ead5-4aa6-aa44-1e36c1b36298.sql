ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS background_key text,
  ADD COLUMN IF NOT EXISTS seed_color text,
  ADD COLUMN IF NOT EXISTS seed_character text;