// Cookie-free page counting for the owner's /admin page. The `track` edge function turns the visit into a
// hash that changes every day; nothing is stored in the browser and nothing identifies a person.

const SITE_HOSTS = ["shippabel.com", "www.shippabel.com"];
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track`;

export interface CountContext {
  hostname: string;
  pathname: string;
  doNotTrack: boolean;
  isAdmin: boolean;
}

// Only the real site counts: not previews, not localhost, not the owner's own browsing, and nobody who
// has asked not to be tracked.
export const shouldCount = ({ hostname, pathname, doNotTrack, isAdmin }: CountContext): boolean =>
  SITE_HOSTS.includes(hostname) && !doNotTrack && !isAdmin && !pathname.startsWith("/admin");

export const sourceFromSearch = (search: string): string | undefined => {
  const params = new URLSearchParams(search);
  return params.get("utm_source") ?? params.get("ref") ?? params.get("source") ?? undefined;
};

export interface PageView {
  path: string;
  entry: boolean;
  ref?: string;
  src?: string;
}

// The first page of a visit says where the visitor came from; later pages only say where they went.
export const buildPageView = (pathname: string, search: string, referrer: string, entry: boolean): PageView =>
  entry ? { path: pathname, entry, ref: referrer || undefined, src: sourceFromSearch(search) } : { path: pathname, entry };

// text/plain keeps this a "simple" request, so the browser sends it without a preflight.
export const sendPageView = (view: PageView, send: typeof fetch = fetch): void => {
  try {
    void send(ENDPOINT, {
      method: "POST",
      body: JSON.stringify(view),
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // Counting must never get in the way of the page.
  }
};
