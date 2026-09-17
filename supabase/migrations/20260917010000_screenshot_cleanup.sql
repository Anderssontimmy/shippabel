-- Failed screenshot batches can be removed without allowing cross-project deletion.
CREATE POLICY "Owners can delete screenshots" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'projects' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.user_id = auth.uid()
  AND starts_with(storage.objects.name, 'screenshots/' || p.id::text || '/')
));
