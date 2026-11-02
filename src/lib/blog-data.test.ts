import { describe, expect, it } from "vitest";
import { blogPosts, formatPostDate } from "./blog-data";

const slugs = new Set(blogPosts.map((p) => p.slug));

describe("the guides' data", () => {
  it("has one guide per address and one title per guide", () => {
    expect(slugs.size).toBe(blogPosts.length);
    expect(new Set(blogPosts.map((p) => p.title)).size).toBe(blogPosts.length);
  });

  it("gives every guide real dates, because search engines read them from the page", () => {
    for (const post of blogPosts) {
      for (const day of [post.date, post.updated]) {
        expect(day, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(day)), post.slug).toBe(false);
      }
      expect(post.updated >= post.date, `${post.slug} updated before published`).toBe(true);
      expect(post.updated <= new Date().toISOString().slice(0, 10), `${post.slug} dated in the future`).toBe(true);
    }
  });

  it("keeps titles and descriptions the length a search result shows", () => {
    for (const post of blogPosts) {
      expect(post.title.length, post.slug).toBeLessThanOrEqual(62);
      expect(post.excerpt.length, post.slug).toBeGreaterThanOrEqual(60);
      expect(post.excerpt.length, post.slug).toBeLessThanOrEqual(160);
    }
  });

  it("points every related guide at a guide that exists, never at itself, at most three", () => {
    for (const post of blogPosts) {
      expect(post.related.length, post.slug).toBeGreaterThan(0);
      expect(post.related.length, post.slug).toBeLessThanOrEqual(3);
      for (const slug of post.related) {
        expect(slugs.has(slug), `${post.slug} -> ${slug}`).toBe(true);
        expect(slug).not.toBe(post.slug);
      }
    }
  });

  it("links only to guides that exist, and sends every outside link to https in a new tab without leaking the page", () => {
    for (const post of blogPosts) {
      for (const [, href] of post.content.matchAll(/href="([^"]+)"/g)) {
        const internal = href!.match(/^https:\/\/shippabel\.com\/blog\/([^/"#?]+)$/);
        if (internal) expect(slugs.has(internal[1]!), `${post.slug} links to missing guide ${href}`).toBe(true);
        else if (!href!.startsWith("https://shippabel.com")) expect(href, post.slug).toMatch(/^https:\/\//);
      }
      for (const tag of post.content.match(/<a [^>]*href="https:\/\/(?!shippabel\.com)[^"]+"[^>]*>/g) ?? []) {
        expect(tag, post.slug).toContain('rel="noopener noreferrer"');
      }
    }
  });

  it("makes no claim the product does not back up", () => {
    const banned: [RegExp, string][] = [
      [/\$\s?500\s*[-–]\s*\$?\s?2,?000/, "an unsourced price for hiring a developer"],
      [/React,\s*Next\.js,?\s*(and\s*)?Vue/i, "automatic wrapping of Next.js or Vue apps"],
      [/2\s*[-–]\s*5 days/, "an unsourced manual-publishing time"],
    ];
    for (const post of blogPosts) for (const [pattern, what] of banned) expect(post.content, `${post.slug}: ${what}`).not.toMatch(pattern);
  });

  it("tells every guide that promises a quick launch about Google's 12-tester rule, with a link to the guide that explains it", () => {
    for (const post of blogPosts.filter((p) => /Google usually reviews/.test(p.content))) {
      expect(post.content, post.slug).toContain("https://shippabel.com/blog/google-play-12-testers-rule");
    }
  });

  it("cites Google or Apple for the facts the new guides lean on", () => {
    for (const slug of ["google-play-12-testers-rule", "how-much-does-it-cost-to-publish-an-app", "google-play-developer-account-setup"]) {
      const post = blogPosts.find((p) => p.slug === slug)!;
      expect(post.content, slug).toMatch(/<h2>Sources<\/h2>/);
      expect(post.content, slug).toMatch(/href="https:\/\/(support\.google\.com|developer\.apple\.com)/);
    }
  });

  it("writes a date the way a reader says it", () => {
    expect(formatPostDate("2026-11-02")).toBe("November 2, 2026");
    expect(formatPostDate("2026-04-02")).toBe("April 2, 2026");
  });
});
