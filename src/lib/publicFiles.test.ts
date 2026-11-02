import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blogPosts } from "./blog-data";

const read = (path: string) => readFileSync(path, "utf8");

describe("robots.txt", () => {
  const robots = read("public/robots.txt");
  const group = robots.split(/\r?\n\r?\n/).find((g) => /^User-agent:/m.test(g))!;
  const agents = [...group.matchAll(/^User-agent:\s*(.+)$/gm)].map((m) => m[1]!.trim());

  it("welcomes the search engines and AI assistants people use, all under the same rules", () => {
    for (const agent of ["*", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended"]) {
      expect(agents, agent).toContain(agent);
    }
    expect(group).toContain("Allow: /");
  });

  it("keeps every one of them out of the pages behind the login", () => {
    for (const path of ["/app/", "/dashboard", "/settings", "/admin"]) expect(group).toContain(`Disallow: ${path}`);
    // a second group would let the agents named in it ignore these rules
    expect(robots.match(/^User-agent: \*/gm)).toHaveLength(1);
  });

  it("points to the sitemap", () => {
    expect(robots).toContain("Sitemap: https://shippabel.com/sitemap.xml");
  });
});

describe("llms.txt", () => {
  const llms = read("public/llms.txt");

  it("lists every guide, so a new guide cannot be left out", () => {
    for (const post of blogPosts) expect(llms, post.slug).toContain(`https://shippabel.com/blog/${post.slug}`);
  });

  it("links only to guides that exist", () => {
    const slugs = new Set(blogPosts.map((p) => p.slug));
    for (const [, slug] of llms.matchAll(/https:\/\/shippabel\.com\/blog\/([a-z0-9-]+)/g)) expect(slugs.has(slug!), slug).toBe(true);
  });

  it("says what the product does today: Google Play only, no App Store yet, and which apps can be converted", () => {
    expect(llms).toMatch(/Google Play only/);
    expect(llms).toMatch(/App Store \(iOS\) publishing is planned and is \*\*not available yet\*\*/);
    expect(llms).toMatch(/Vite/);
    expect(llms).toMatch(/Next\.js and Nuxt/);
    expect(llms).not.toMatch(/auto-?wraps? .*Next\.js/i);
  });

  it("carries the prices the pricing page carries and the date it was last checked", () => {
    expect(llms).toContain("$99");
    expect(llms).toContain("$179");
    expect(llms).toMatch(/Last updated: \d{4}-\d{2}-\d{2}/);
  });
});

describe("the AI plugin manifest", () => {
  const manifest = JSON.parse(read("public/.well-known/ai-plugin.json")) as Record<string, string>;

  it("describes the product as it is: Google Play today, the App Store not yet", () => {
    expect(manifest.description_for_model).toMatch(/Google Play only/);
    expect(manifest.description_for_model).toMatch(/not available yet/);
    expect(manifest.description_for_model).not.toMatch(/EAS|Works with apps built using .*Next\.js, Vue/);
    expect(manifest.description_for_human).not.toMatch(/App Store/);
  });
});
