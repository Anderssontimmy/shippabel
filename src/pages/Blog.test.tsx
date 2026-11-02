import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BlogPost } from "./Blog";
import { blogPosts } from "@/lib/blog-data";

const renderPost = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes><Route path="/blog/:slug" element={<BlogPost />} /></Routes>
    </MemoryRouter>,
  );

describe("blog article", () => {
  it("is styled by the typography plugin its prose classes come from", () => {
    // Without the plugin every prose-* class is silently ignored and an article renders as one wall of text.
    expect(readFileSync("src/index.css", "utf8")).toContain('@plugin "@tailwindcss/typography"');
    const { container } = renderPost(blogPosts[0]!.slug);
    expect(container.querySelector("article")?.className).toContain("prose");
    expect(container.querySelectorAll("article h2").length).toBeGreaterThan(0);
  });

  it("lets a reader check their app before the first paragraph, because that is where search traffic lands", () => {
    const { container } = renderPost(blogPosts[0]!.slug);
    const field = screen.getByRole("complementary", { name: "Check your own app" });
    expect(field.querySelector("input")?.getAttribute("aria-label")).toBe("GitHub repository link");
    const article = container.querySelector("article")!;
    expect(field.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("ends with one link to the scanner, not a button inside a link", () => {
    renderPost(blogPosts[0]!.slug);
    const cta = screen.getByRole("link", { name: /Check my app for free/ });
    expect(cta.getAttribute("href")).toBe("/scan");
    expect(cta.querySelector("button")).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Check now"]);
  });
});

describe("blog article navigation and dates", () => {
  const post = blogPosts.find((p) => p.slug === "google-play-12-testers-rule")!;

  it("shows where the reader is, with a trail back to the home page and the guides", () => {
    renderPost(post.slug);
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    const links = within(trail).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["Home", "/"], ["Guides", "/blog"]]);
    expect(within(trail).getByText(post.title).getAttribute("aria-current")).toBe("page");
  });

  it("says when the guide was published and last updated, in a form machines can read too", () => {
    const { container } = renderPost(post.slug);
    const times = [...container.querySelectorAll("time")];
    expect(times.map((t) => t.getAttribute("datetime"))).toEqual([post.date, post.updated]);
    expect(screen.getByText(/Updated November 2, 2026/)).toBeTruthy();
  });

  it("ends with the guides the author chose as next reading, in that order", () => {
    renderPost(post.slug);
    const more = screen.getByRole("heading", { name: "More guides" }).parentElement!;
    const hrefs = within(more).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(post.related.map((slug) => `/blog/${slug}`));
  });

  it("asks search engines to leave out an address that is not a guide", () => {
    renderPost("not-a-guide");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex");
  });
});
