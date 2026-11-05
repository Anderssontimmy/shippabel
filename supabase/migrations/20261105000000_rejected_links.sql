-- What people paste into the scanner when it is not a GitHub project link, so the next thing to support is
-- a fact and not a guess.
--
-- Only the name of the website is stored (replit.com, lovable.app, or "(not a link)"), never the address,
-- the path or the account name in front of it; the `track` edge function checks that before it writes.
-- `visitor` is the same daily hash as in page_views, so twelve tries by one person are one person.
-- Written and read with the service role only: no policy exists, so RLS denies everything to anon and
-- authenticated, and the grants are revoked as well.
CREATE TABLE IF NOT EXISTS public.rejected_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  visitor text NOT NULL,
  site text NOT NULL
);

ALTER TABLE public.rejected_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rejected_links FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_rejected_links_created ON public.rejected_links (created_at);
CREATE INDEX IF NOT EXISTS idx_rejected_links_visitor_time ON public.rejected_links (visitor, created_at);
