CREATE POLICY "voice couple read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice' AND (storage.foldername(name))[1] = public.current_couple_id()::text);
CREATE POLICY "voice couple insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice' AND (storage.foldername(name))[1] = public.current_couple_id()::text);
CREATE POLICY "voice owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice' AND owner = auth.uid());