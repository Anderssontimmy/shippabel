import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blogPosts } from "./blog-data";
import { landingCopy } from "./landingCopy";
import { buildSitemap, prerenderPages, renderPage, withBrand, type PrerenderPage } from "./seo";

const pages = prerenderPages();
const template = readFileSync("index.html", "utf8");
const home = pages.find((p) => p.path === "/")!;
const ldTypes = (page: PrerenderPage) => page.jsonLd.map((j) => (j as { "@type": string })["@type"]);
const ldOf = <T,>(page: PrerenderPage, type: string) => page.jsonLd.find((j) => (j as { "@type": string })["@type"] === type) as T;

describe("what each public page tells a search engine", () => {
  it("gives every page its own address, title and description", () => {
    for (const key of ["path", "canonical", "title", "description"] as const) {
      expect(new Set(pages.map((p) => p[key])).size, key).toBe(pages.length);
    }
  });

  it("writes titles and descriptions at the length a search result shows", () => {
    for (const page of pages) {
      expect(page.title.length, `${page.path} title`).toBeLessThanOrEqual(62);
      expect(page.description.length, `${page.path} description`).toBeGreaterThanOrEqual(50);
      expect(page.description.length, `${page.path} description`).toBeLessThanOrEqual(160);
    }
  });

  it("adds the brand to a title only when it still fits", () => {
    expect(withBrand("About")).toBe("About | Shippabel");
    const long = "The complete beginner's guide to publishing your first AI-built app";
    expect(withBrand(long)).toBe(long);
  });

  it("keeps the login page out of search results and nothing else", () => {
    expect(pages.filter((p) => p.noindex).map((p) => p.path)).toEqual(["/login"]);
  });

  it("makes every guide's address its canonical address", () => {
    for (const post of blogPosts) {
      const page = pages.find((p) => p.path === `/blog/${post.slug}`)!;
      expect(page.canonical).toBe(`https://shippabel.com/blog/${post.slug}`);
    }
  });
});

describe("the structured data", () => {
  it("describes the product only on the pages that are about the product, never the same blocks on every page", () => {
    expect(ldTypes(home)).toEqual(["Organization", "WebSite", "SoftwareApplication", "FAQPage"]);
    for (const post of blogPosts) {
      const page = pages.find((p) => p.path === `/blog/${post.slug}`)!;
      expect(ldTypes(page), post.slug).toEqual(["Article", "BreadcrumbList"]);
    }
    expect(pages.flatMap(ldTypes).filter((t) => t === "FAQPage")).toHaveLength(1);
  });

  it("lists in the FAQ exactly the questions and answers a visitor can read on the page", () => {
    const faq = ldOf<{ mainEntity: { name: string; acceptedAnswer: { text: string } }[] }>(home, "FAQPage");
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(landingCopy.faqs.map((f) => [f.q, f.a]));
  });

  it("dates every guide with real ISO dates taken from the guide", () => {
    for (const post of blogPosts) {
      const page = pages.find((p) => p.path === `/blog/${post.slug}`)!;
      const article = ldOf<{ datePublished: string; dateModified: string; headline: string }>(page, "Article");
      expect(article.datePublished).toBe(post.date);
      expect(article.dateModified).toBe(post.updated);
      expect(article.headline).toBe(post.title);
    }
  });

  it("claims no ratings or reviews, because there are none", () => {
    const all = JSON.stringify(pages.flatMap((p) => p.jsonLd));
    expect(all).not.toMatch(/aggregateRating|"review"|ratingValue/);
  });

  it("states the prices the pricing page states, and the product's real scope", () => {
    const app = ldOf<{ offers: { price: string }[]; description: string }>(home, "SoftwareApplication");
    expect(app.offers.map((o) => o.price)).toEqual(["0", "99", "179"]);
    expect(app.description).toContain("Google Play");
    expect(app.description).not.toMatch(/Next\.js|Vue|iOS/);
  });
});

describe("the plain HTML a crawler without JavaScript reads", () => {
  it("says on the front page what the visitor reads, from the same words", () => {
    const html = home.content!;
    for (const line of landingCopy.headline) expect(html).toContain(line);
    expect(html).toContain(landingCopy.intro);
    for (const s of landingCopy.steps) {
      expect(html).toContain(s.title);
      expect(html).toContain(s.body);
    }
    for (const f of landingCopy.faqs) {
      expect(html).toContain(f.q);
      expect(html).toContain(f.a);
    }
    expect(html).toContain(landingCopy.price.line);
    expect(html).toContain(landingCopy.price.promise);
  });

  it("keeps the old claims out of the front page's HTML", () => {
    expect(home.content).not.toMatch(/Next\.js|Vue|\$500|2-5 days|Android Studio/);
  });

  it("gives each guide its full text, its title as the one heading and the dates it was published and updated", () => {
    for (const post of blogPosts) {
      const page = pages.find((p) => p.path === `/blog/${post.slug}`)!;
      expect(page.content, post.slug).toContain(post.content.slice(0, 80).trim());
      expect(page.content!.match(/<h1>/g), post.slug).toHaveLength(1);
      expect(page.content, post.slug).toContain(`datetime="${post.updated}"`);
    }
  });
});

describe("filling the page template", () => {
  const out = (page: PrerenderPage) => renderPage(template, page);

  it("starts from a template that carries no structured data of its own, so no page inherits another page's", () => {
    expect(template).not.toContain("application/ld+json");
    expect(template).not.toMatch(/name="keywords"/);
  });

  it("writes the page's own title, description, address and social tags", () => {
    const post = blogPosts[0]!;
    const page = pages.find((p) => p.path === `/blog/${post.slug}`)!;
    const html = out(page);
    expect(html).toContain(`<title>${page.title.replace(/&/g, "&amp;")}</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://shippabel.com/blog/${post.slug}"`);
    expect(html).toContain(`<meta property="og:url" content="https://shippabel.com/blog/${post.slug}"`);
    expect(html).toContain('<meta property="og:type" content="article"');
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it("puts a page's structured data in its head, valid, and unable to close its own script", () => {
    const hostile: PrerenderPage = { ...home, jsonLd: [{ "@type": "Thing", name: "</script><script>alert(1)</script>" }] };
    const html = out(hostile);
    expect(html).not.toContain("</script><script>alert(1)");
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!));
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe("</script><script>alert(1)</script>");
  });

  it("hides the crawler text so the page does not flash, and puts it after the app's root", () => {
    expect(out(home)).toMatch(/<div id="root"><\/div>\s*<div id="prerender-content" style="display:none">/);
  });

  it("marks a page noindex only when it says so", () => {
    expect(out(pages.find((p) => p.path === "/login")!)).toContain('<meta name="robots" content="noindex, follow"');
    expect(out(home)).toContain('<meta name="robots" content="index, follow"');
  });
});

describe("the sitemap", () => {
  const xml = buildSitemap();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

  it("lists the public pages and every guide, once each, and leaves out the login and demo pages", () => {
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain("https://shippabel.com/");
    for (const post of blogPosts) expect(locs).toContain(`https://shippabel.com/blog/${post.slug}`);
    expect(locs.some((l) => /\/login|\/scan\/demo|\/dashboard|\/app\//.test(l))).toBe(false);
  });

  it("dates a guide by its last update and gives no date to a page it has no date for", () => {
    for (const post of blogPosts) {
      expect(xml).toContain(`<loc>https://shippabel.com/blog/${post.slug}</loc>\n    <lastmod>${post.updated}</lastmod>`);
    }
    expect(xml).toContain("<loc>https://shippabel.com/pricing</loc>\n  </url>");
  });
});
