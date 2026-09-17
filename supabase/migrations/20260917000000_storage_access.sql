-- Storage CDN cache keys do not include x-guest-token. Serving source ZIPs to
-- the shared anon JWT could therefore reuse an authorized response for another
-- guest. The app only needs to upload archives; server-side functions read them.
DROP POLICY IF EXISTS "Read own project archive" ON storage.objects;

-- Screenshot paths are public for store listing delivery, but only the project
-- owner may create or replace them. A broad bucket-level UPDATE allowed writes
-- to another user's known screenshot path.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('projects', 'projects', true, 10485760, ARRAY['image/png','image/jpeg','image/webp']),
  ('privacy-policies', 'privacy-policies', true, 5242880, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload to projects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in projects" ON storage.objects;

CREATE POLICY "Owners can upload screenshots" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'projects' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.user_id = auth.uid()
  AND starts_with(storage.objects.name, 'screenshots/' || p.id::text || '/')
));
CREATE POLICY "Owners can read screenshot metadata" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'projects' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.user_id = auth.uid()
  AND starts_with(storage.objects.name, 'screenshots/' || p.id::text || '/')
));
CREATE POLICY "Owners can replace screenshots" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'projects' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.user_id = auth.uid()
  AND starts_with(storage.objects.name, 'screenshots/' || p.id::text || '/')
))
WITH CHECK (bucket_id = 'projects' AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.user_id = auth.uid()
  AND starts_with(storage.objects.name, 'screenshots/' || p.id::text || '/')
));
