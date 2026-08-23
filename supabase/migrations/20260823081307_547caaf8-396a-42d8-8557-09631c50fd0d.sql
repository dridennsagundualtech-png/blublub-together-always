ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS album text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pet_positions jsonb NOT NULL DEFAULT '{}'::jsonb;