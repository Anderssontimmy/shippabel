import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/PlayPhone", () => ({ default: () => <div data-testid="phone" /> }));
import { Landing } from "./Landing";
import { guarantee } from "@/lib/guarantee";
import { blogPosts } from "@/lib/blog-data";

// jsdom has no IntersectionObserver. This one lets a test say what the browser would report.
type Entry = { isIntersecting: boolean; boundingClientRect: { top: number; bottom: number } };
const observers: { el: Element; callback: (entries: Entry[]) => void }[] = [];
class FakeObserver {
  private callback: (entries: Entry[]) => void;
  constructor(callback: (entries: Entry[]) => void) { this.callback = callback; }
  observe(el: Element) { observers.push({ el, callback: this.callback }); }
  unobserve() {}
  disconnect() {}
}
const report = (el: Element | null, entry: Entry) => {
  const matches = observers.filter((o) => o.el === el);
  expect(matches.length).toBeGreaterThan(0);
  act(() => matches.forEach((o) => o.callback([entry])));
};

const renderLanding = () => render(<MemoryRouter><Landing /></MemoryRouter>);
// The bar is the last thing in the page; the closing section has a link with the same name before it.
const stickyBar = () => screen.getAllByRole("link", { name: /Check my app now/, hidden: true }).at(-1)!.parentElement!;

describe("landing page", () => {
  beforeEach(() => { observers.length = 0; vi.stubGlobal("IntersectionObserver", FakeObserver); });
  afterEach(() => vi.unstubAllGlobals());

  it("has one headline and one primary action in the first screen", () => {
    renderLanding();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const hero = screen.getByRole("heading", { level: 1 }).parentElement!;
    expect(within(hero).getByRole("button", { name: /Check now/ }).className).toContain("bg-green-700");
  });

  it("shows the real report and the real store editor, with alt text that says what they show", () => {
    renderLanding();
    expect(screen.getByRole("img", { name: /sample report from the free check/ }).getAttribute("src")).toBe("/landing/report.jpg");
    expect(screen.getByRole("img", { name: /store page editor/ }).getAttribute("src")).toBe("/landing/listing.jpg");
    expect(screen.getByRole("link", { name: "See the whole report" }).getAttribute("href")).toBe("/scan/demo");
  });

  it("says what stays under the customer's control", () => {
    renderLanding();
    expect(screen.getByText(/only reads your code/)).toBeTruthy();
    expect(screen.getByText(/ordinary commits in your GitHub/)).toBeTruthy();
  });

  it("tells the truth about which apps work", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "What kind of apps work?" }));
    expect(screen.getByText(/Vite web apps are wrapped/)).toBeTruthy();
    expect(screen.getByText(/Next\.js apps need a static export first/)).toBeTruthy();
  });

  it("keeps the phone's bottom bar away until the first screen is behind the visitor, and away from the footer", () => {
    renderLanding();
    const hero = screen.getByRole("heading", { level: 1 }).parentElement;
    const closing = screen.getByRole("heading", { name: /Find out what's in the way/ }).closest("section");

    expect(stickyBar().getAttribute("aria-hidden")).toBe("true");
    report(hero, { isIntersecting: true, boundingClientRect: { top: 100, bottom: 600 } });
    expect(stickyBar().getAttribute("aria-hidden")).toBe("true");

    report(hero, { isIntersecting: false, boundingClientRect: { top: -700, bottom: -100 } });
    expect(stickyBar().getAttribute("aria-hidden")).toBe("false");

    report(closing, { isIntersecting: true, boundingClientRect: { top: 300, bottom: 900 } });
    expect(stickyBar().getAttribute("aria-hidden")).toBe("true");
  });
});

describe("what the landing page tells a hesitant buyer", () => {
  beforeEach(() => { observers.length = 0; vi.stubGlobal("IntersectionObserver", FakeObserver); });
  afterEach(() => vi.unstubAllGlobals());

  it("says how long each step takes, with the times the product really has", () => {
    renderLanding();
    const steps = within(screen.getByRole("list", { name: "How long each step takes" })).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    const text = steps.map((li) => li.textContent).join(" | ");
    expect(text).toContain("About 30 seconds");
    expect(text).toContain("About 10 to 20 minutes");
    expect(text).toContain("A few hours to a few days");
  });

  it("lists what the price includes and, next to it, what it does not", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 2, name: "What $99 gets you, and what it doesn't." })).toBeTruthy();
    const included = within(screen.getByRole("list", { name: "Included" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(included).toContain("A privacy policy, written and hosted for you");
    expect(included).toContain("A signed build, uploaded to Google Play's testing track");
    const excluded = within(screen.getByRole("list", { name: "Not included" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(excluded).toContain("Google's $25 developer fee, paid to Google");
    expect(excluded.join(" ")).toMatch(/closed test with at least 12 testers for 14 days/);
    expect(excluded.join(" ")).toMatch(/backend or hosting/);
  });

  it("shows the money-back promise with the same words as the pricing page, and an address to ask", () => {
    renderLanding();
    expect(screen.getAllByText(guarantee.headline).length).toBeGreaterThan(0);
    expect(screen.getAllByText(guarantee.detail).length).toBeGreaterThan(0);
    const panel = screen.getAllByText(guarantee.headline)[0]!.closest("div")!;
    expect(within(panel).getByRole("link", { name: "hello@shippabel.com" }).getAttribute("href")).toBe("mailto:hello@shippabel.com");
  });

  it("says plainly which stores work today: Google Play is live, the App Store is not yet", () => {
    renderLanding();
    const stores = within(screen.getByRole("list", { name: "Stores" })).getAllByRole("listitem");
    const row = (name: string) => stores.find((li) => li.textContent?.startsWith(name))?.textContent;
    expect(row("Google Play")).toBe("Google PlayLive");
    expect(row("App Store")).toBe("App StoreComing soon");
  });

  it("says which kinds of app work, which need a step first and which do not", () => {
    renderLanding();
    const apps = within(screen.getByRole("list", { name: "Apps" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(apps).toContain("Web apps from Lovable, Bolt, v0, Cursor and others (Vite)Live");
    expect(apps).toContain("Next.js and Nuxt appsStatic export first");
    expect(apps).toContain("Flutter, Swift and Kotlin appsNot supported");
  });

  it("links to a guide for each tool, and every link goes to a guide that exists", () => {
    renderLanding();
    const links = within(screen.getByRole("navigation", { name: "Guides by tool" })).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(5);
    const slugs = new Set(blogPosts.map((post) => post.slug));
    for (const link of links) {
      const href = link.getAttribute("href")!;
      expect(href.startsWith("/blog/"), href).toBe(true);
      expect(slugs.has(href.replace("/blog/", "")), href).toBe(true);
    }
  });

  it("answers the questions a buyer hesitates over: the App Store, the guarantee and Google's 12 testers", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "Can I publish to the App Store?" }));
    expect(screen.getByText(/Not yet\. Today Shippabel builds and submits to Google Play only/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Is there a guarantee?" }));
    // once in the promise panel and once more in the answer
    expect(screen.getAllByText(guarantee.detail, { exact: false }).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Why does Google ask for 12 testers?" }));
    expect(screen.getByText(/The closed test happens in your Play Console/)).toBeTruthy();
  });

  it("gives a way to ask a person before buying, next to the closing action", () => {
    renderLanding();
    const closing = screen.getByRole("heading", { name: /Find out what's in the way/ }).closest("section")!;
    expect(within(closing).getByRole("link", { name: "hello@shippabel.com" }).getAttribute("href")).toBe("mailto:hello@shippabel.com");
  });

  it("does not invent proof: no testimonials, no scarcity counters, no struck-through prices", () => {
    const { container } = renderLanding();
    expect(container.querySelector("blockquote")).toBeNull();
    expect(container.querySelector("s, del, strike")).toBeNull();
    expect(screen.queryByText(/slots? (left|open)|spots? left|limited time|most popular/i)).toBeNull();
  });
});
