import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/PlayPhone", () => ({ default: () => <div data-testid="phone" /> }));
import { Landing } from "./Landing";

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
