import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Which addresses the host tells search engines to leave out. The sources in vercel.json are written so that, with no
// named parameters in them, they read as plain regular expressions over the whole path.
const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const noindexRules = config.headers
  .filter((h) => h.headers.some((x) => x.key === "X-Robots-Tag" && x.value === "noindex"))
  .map((h) => new RegExp(`^${h.source}$`));
const noindexed = (path: string) => noindexRules.some((rule) => rule.test(path));

describe("which addresses search engines are told to leave out", () => {
  it("leaves out a user's own report, but not the example report", () => {
    expect(noindexed("/scan/3f2b8c1e-7d64-4f0a-9b1c-2a5d6e7f8091")).toBe(true);
    expect(noindexed("/scan/demo")).toBe(false);
    expect(noindexed("/scan")).toBe(false);
  });

  it("leaves out the pages behind the login", () => {
    for (const path of ["/dashboard", "/settings", "/admin", "/login", "/app/abc/listing", "/app/abc/submit"]) {
      expect(noindexed(path), path).toBe(true);
    }
  });

  it("leaves out an address that is not a page of ours, because the app answers it with the home page", () => {
    for (const path of ["/random-page", "/wp-login.php", "/blogpost", "/pricing-old", "/.env"]) {
      expect(noindexed(path), path).toBe(true);
    }
  });

  it("never leaves out a page, a guide or a file search engines need", () => {
    const wanted = [
      "/", "/pricing", "/about", "/privacy", "/blog", "/blog/google-play-12-testers-rule", "/scan",
      "/assets/index-abc123.js", "/mockups/phone.png", "/robots.txt", "/sitemap.xml", "/llms.txt",
      "/og-image.png", "/favicon.svg", "/version.json", "/.well-known/ai-plugin.json",
    ];
    for (const path of wanted) expect(noindexed(path), path).toBe(false);
  });
});

describe("how long the files search engines and AI crawlers re-read may be cached", () => {
  const ttl = (source: string) => {
    const rule = config.headers.find((h) => h.source === source)!;
    const value = rule.headers.find((x) => x.key === "Cache-Control")!.value;
    return Number(/s-maxage=(\d+)/.exec(value)![1]);
  };

  it("keeps the sitemap, robots.txt and llms.txt in the CDN for an hour at most, so a change reaches them the same day", () => {
    for (const file of ["/sitemap.xml", "/robots.txt", "/llms.txt"]) expect(ttl(file), file).toBeLessThanOrEqual(3600);
  });
});
