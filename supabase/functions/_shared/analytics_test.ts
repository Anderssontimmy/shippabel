import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import {
  cleanSource,
  clientIp,
  countryFromHeaders,
  deviceFromUserAgent,
  isAdmin,
  isBot,
  normalizePath,
  referrerHost,
  visitorHash,
} from "./analytics.ts";

Deno.test("normalizePath keeps real pages and folds ids so a report is not its own page", () => {
  assertEquals(normalizePath("/"), "/");
  assertEquals(normalizePath("/pricing"), "/pricing");
  assertEquals(normalizePath("/pricing/"), "/pricing");
  assertEquals(normalizePath("/blog/publish-lovable-app?utm_source=x#top"), "/blog/publish-lovable-app");
  assertEquals(normalizePath("/scan/0b8f2e5a-6c1d-4f0e-9a52-3d1c2b7e8a90"), "/scan/:id");
  assertEquals(normalizePath("/app/0B8F2E5A-6C1D-4F0E-9A52-3D1C2B7E8A90/listing"), "/app/:id/listing");
  assertEquals(normalizePath("//scan///demo"), "/scan/demo");
});

Deno.test("normalizePath refuses anything that is not a short path", () => {
  for (const bad of [undefined, null, 42, "", "pricing", "https://evil.example/", "/a b", "/a\nb", "/" + "a".repeat(201)]) {
    assertEquals(normalizePath(bad), null);
  }
});

Deno.test("referrerHost returns a bare host and ignores our own site and junk", () => {
  const own = ["shippabel.com"];
  assertEquals(referrerHost("https://www.google.com/search?q=shippabel", own), "google.com");
  assertEquals(referrerHost("https://news.ycombinator.com/item?id=1", own), "news.ycombinator.com");
  assertEquals(referrerHost("https://shippabel.com/pricing", own), null);
  assertEquals(referrerHost("https://www.shippabel.com/", own), null);
  assertEquals(referrerHost("not a url", own), null);
  assertEquals(referrerHost("", own), null);
  assertEquals(referrerHost(undefined, own), null);
});

Deno.test("cleanSource accepts a plain campaign name only", () => {
  assertEquals(cleanSource("Twitter"), "twitter");
  assertEquals(cleanSource("show-hn_2026.10"), "show-hn_2026.10");
  assertEquals(cleanSource("<script>"), null);
  assertEquals(cleanSource("a".repeat(41)), null);
  assertEquals(cleanSource(null), null);
});

Deno.test("isBot flags crawlers, scripts and empty agents but not browsers", () => {
  assertEquals(isBot(null), true);
  assertEquals(isBot(""), true);
  assertEquals(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), true);
  assertEquals(isBot("Mozilla/5.0 HeadlessChrome/120.0 Safari/537.36"), true);
  assertEquals(isBot("curl/8.4.0"), true);
  assertEquals(isBot("python-requests/2.31"), true);
  assertEquals(isBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"), false);
  assertEquals(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"), false);
});

Deno.test("deviceFromUserAgent tells phone, tablet and computer apart", () => {
  assertEquals(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "mobile");
  assertEquals(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/120 Mobile Safari/537.36"), "mobile");
  assertEquals(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"), "tablet");
  assertEquals(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/120 Safari/537.36"), "tablet");
  assertEquals(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"), "desktop");
});

Deno.test("countryFromHeaders reads a two letter code and ignores placeholders", () => {
  assertEquals(countryFromHeaders(new Headers({ "cf-ipcountry": "se" })), "SE");
  assertEquals(countryFromHeaders(new Headers({ "cf-ipcountry": "XX" })), null);
  assertEquals(countryFromHeaders(new Headers({ "cf-ipcountry": "T1" })), null);
  assertEquals(countryFromHeaders(new Headers()), null);
});

Deno.test("clientIp takes the first address the proxy reports", () => {
  assertEquals(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })), "203.0.113.5");
  assertEquals(clientIp(new Headers({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "10.0.0.1" })), "198.51.100.7");
  assertEquals(clientIp(new Headers()), "");
});

Deno.test("visitorHash is stable within a day and changes with the day, the visitor and the salt", async () => {
  const a = await visitorHash("203.0.113.5", "Chrome", "2026-10-16", "salt");
  assertEquals(a, await visitorHash("203.0.113.5", "Chrome", "2026-10-16", "salt"));
  assertEquals(a.length, 32);
  assertNotEquals(a, await visitorHash("203.0.113.5", "Chrome", "2026-10-17", "salt"));
  assertNotEquals(a, await visitorHash("203.0.113.6", "Chrome", "2026-10-16", "salt"));
  assertNotEquals(a, await visitorHash("203.0.113.5", "Firefox", "2026-10-16", "salt"));
  assertNotEquals(a, await visitorHash("203.0.113.5", "Chrome", "2026-10-16", "other"));
  assertEquals(a.includes("203"), false);
});

Deno.test("isAdmin needs the flag set on app_metadata, not user_metadata or a lookalike", () => {
  assertEquals(isAdmin({ app_metadata: { is_admin: true } }), true);
  assertEquals(isAdmin({ app_metadata: { is_admin: "true" } }), false);
  assertEquals(isAdmin({ app_metadata: { plan: "unlimited" } }), false);
  assertEquals(isAdmin({ app_metadata: null }), false);
  assertEquals(isAdmin(null), false);
  assertEquals(isAdmin(undefined), false);
});
