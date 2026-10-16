// First-party, cookie-free page counting. Nothing here identifies a person: the IP address and
// browser are only ever fed into a hash that changes every day and is never stored with them.

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Report ids and project ids would make every visit to a report its own "page".
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.split(/[?#]/)[0] ?? "";
  if (!path.startsWith("/") || path.length > 200 || /[\s\u0000-\u001f]/.test(path)) return null;
  const collapsed = path.replace(UUID, ":id").replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
}

// Where the visitor came from, as a bare host. A visit that comes from our own site is not a source.
export function referrerHost(raw: unknown, ownHosts: string[]): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || ownHosts.includes(host)) return null;
    return host.slice(0, 80);
  } catch {
    return null;
  }
}

// utm_source / ref from the landing URL: short, lowercase, no surprises.
export function cleanSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return /^[a-z0-9._-]{1,40}$/.test(value) ? value : null;
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|monitor|uptime|pingdom|curl|wget|python|node-fetch|axios|go-http|java\/|okhttp|libwww|scrapy|httpclient/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

export type Device = "mobile" | "tablet" | "desktop";

export function deviceFromUserAgent(userAgent: string): Device {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function countryFromHeaders(headers: Headers): string | null {
  const code = (headers.get("cf-ipcountry") ?? "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

export function clientIp(headers: Headers): string {
  return (headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
}

// The same visitor gets the same value for one day and a different one tomorrow, so a visitor can be
// counted within a day but never followed across days. The secret salt keeps the hash from being
// reversed by trying every IP address.
export async function visitorHash(ip: string, userAgent: string, day: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${day}|${ip}|${userAgent}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Only the owner's account carries this flag. app_metadata can be written by the server alone.
export function isAdmin(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  return user?.app_metadata?.is_admin === true;
}
