import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
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

  it("ends with one link to the scanner, not a button inside a link", () => {
    renderPost(blogPosts[0]!.slug);
    const cta = screen.getByRole("link", { name: /Check my app for free/ });
    expect(cta.getAttribute("href")).toBe("/scan");
    expect(cta.querySelector("button")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
