CREATE TABLE public.commitments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  schedule_type text NOT NULL DEFAULT 'daily',
  weekday integer,
  weekly_target integer,
  reminder_time time without time zone NOT NULL DEFAULT '19:00',
  shared boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.commitment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commitment_id uuid NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT current_date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX commitments_couple_idx ON public.commitments(couple_id);
CREATE INDEX commitment_logs_commitment_idx ON public.commitment_logs(commitment_id, log_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitments TO authenticated;
GRANT ALL ON public.commitments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commitment_logs TO authenticated;
GRANT ALL ON public.commitment_logs TO service_role;

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own commitments or shared with partner" ON public.commitments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (shared AND couple_id = public.current_couple_id())
);

CREATE POLICY "Create own commitments" ON public.commitments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = public.current_couple_id());

CREATE POLICY "Update own commitments" ON public.commitments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own commitments" ON public.commitments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Own logs or current week of shared commitments" ON public.commitment_logs
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    couple_id = public.current_couple_id()
    AND log_date >= (current_date - 7)
    AND EXISTS (
      SELECT 1 FROM public.commitments c
      WHERE c.id = commitment_logs.commitment_id AND c.shared
    )
  )
);

CREATE POLICY "Create own logs" ON public.commitment_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND couple_id = public.current_couple_id());

CREATE POLICY "Delete own logs" ON public.commitment_logs
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commitments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commitment_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.commitment_logs;