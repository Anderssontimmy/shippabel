-- Security: the public `projects` storage bucket had a broad SELECT policy
-- ("Anyone can read from projects") granting role `public` the ability to LIST
-- every file across all users. Public buckets serve objects via their public
-- CDN URL without this policy, so it only enabled cross-user file enumeration.
-- Drop it. Screenshots use getPublicUrl (public CDN, no RLS); scan zips are read
-- server-side via the service role — neither depends on this policy.
DROP POLICY IF EXISTS "Anyone can read from projects" ON storage.objects;
