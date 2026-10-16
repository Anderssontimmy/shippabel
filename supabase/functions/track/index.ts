import { instrument } from "../_shared/monitoring.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cleanSource,
  clientIp,
  countryFromHeaders,
  deviceFromUserAgent,
  isBot,
  normalizePath,
  referrerHost,
  visitorHash,
} from "../_shared/analytics.ts";

// Cookie-free page counting for the owner's /admin page. Only the real site is counted: previews,
// localhost, crawlers and scripts are dropped. Every answer is an empty 204 so the counter can never
// break a page or tell a caller why it was ignored.
const SITE_HOSTS = ["shippabel.com", "www.shippabel.com"];
const ALLOWED_ORIGINS = SITE_HOSTS.map((host) => `https://${host}`);
const MAX_PER_VISITOR_PER_MINUTE = 60;
// The endpoint is open, and anyone can vary their user agent to look like a new visitor. A cap on the
// whole site keeps a flood from filling the table; a front page that busy would be a good problem.
const MAX_PER_MINUTE = 600;

Deno.serve(instrument("track", async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const done = () => new Response(null, { status: 204, headers: cors });

  const userAgent = req.headers.get("user-agent");
  const salt = Deno.env.get("ANALYTICS_SALT");
  if (req.method !== "POST" || !ALLOWED_ORIGINS.includes(origin) || isBot(userAgent) || !salt) return done();

  let body: { path?: unknown; ref?: unknown; src?: unknown; entry?: unknown };
  try { body = JSON.parse(await req.text()); } catch { return done(); }
  const path = normalizePath(body.path);
  if (!path || path.startsWith("/admin")) return done();
  const entry = body.entry === true;

  try {
    const day = new Date().toISOString().slice(0, 10);
    const visitor = await visitorHash(clientIp(req.headers), userAgent!, day, salt);
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Someone sending more than a page a second is not reading.
    const since = new Date(Date.now() - 60_000).toISOString();
    const [mine, everyone] = await Promise.all([
      supabase.from("page_views").select("id", { count: "exact", head: true }).eq("visitor", visitor).gte("created_at", since),
      supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    if ((mine.count ?? 0) >= MAX_PER_VISITOR_PER_MINUTE || (everyone.count ?? 0) >= MAX_PER_MINUTE) return done();

    await supabase.from("page_views").insert({
      visitor,
      path,
      referrer: entry ? referrerHost(body.ref, SITE_HOSTS) : null,
      source: entry ? cleanSource(body.src) : null,
      country: countryFromHeaders(req.headers),
      device: deviceFromUserAgent(userAgent!),
      entry,
    });
  } catch {
    // A failed count is not worth a failed page view.
  }
  return done();
}));
