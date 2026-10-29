import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/PlayPhone", () => ({ default: () => <div data-testid="phone" /> }));
import { Landing } from "./Landing";
import { guarantee } from "@/lib/guarantee";

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

  it("says in plain words that both stores are covered and that nothing technical is needed", () => {
    renderLanding();
    expect(screen.getByText(/We put it in the App Store and Google Play for you/)).toBeTruthy();
    expect(screen.getByText(/You don't need to know anything technical/)).toBeTruthy();
  });

  it("explains what a GitHub link is, for someone who has never heard of it, and offers a zip file instead", () => {
    renderLanding();
    expect(screen.getByText("What's a GitHub link?")).toBeTruthy();
    expect(screen.getByText(/the web address where your app's files are saved online/)).toBeTruthy();
    expect(screen.getByText(/No link\? Choose .upload a zip file. instead/)).toBeTruthy();
  });

  it("shows the moving phone with a made-up app, and says it is an example", async () => {
    renderLanding();
    expect(await screen.findByTestId("phone")).toBeTruthy();
    const example = screen.getByRole("img", { name: /An example: an app is checked, fixed, sent to both stores and goes live/ });
    expect(within(example).getByTestId("phone")).toBeTruthy();
    expect(screen.getByText("An example app, made up for this page.")).toBeTruthy();
  });

  it("shows how it goes in three steps, ending with the app in both stores", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 2, name: "How it goes" })).toBeTruthy();
    const steps = within(screen.getByRole("list", { name: "The three steps" })).getAllByRole("listitem");
    expect(steps.map((li) => within(li).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "Paste your link",
      "Check your store page",
      "Press publish",
    ]);
    expect(steps[2]!.textContent).toContain("App Store and Google Play");
  });

  it("states one price, the promise and the stores' own fees without a table or a list of exclusions", () => {
    renderLanding();
    expect(screen.getByText(/\$99 once for one app/)).toBeTruthy();
    expect(screen.getByText(guarantee.headline)).toBeTruthy();
    expect(screen.getByText(/Apple and Google charge their own fee for a developer account/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Not included")).toBeNull();
  });

  it("promises only that the app is only changed when the person says so", () => {
    renderLanding();
    expect(screen.getByText("We only change your app when you say so")).toBeTruthy();
  });

  it("answers four questions and no more", () => {
    renderLanding();
    const faq = screen.getByRole("heading", { name: "You're probably wondering" }).closest("section")!;
    expect(within(faq).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Do I need to know how to code?",
      "What do I need before I start?",
      "How long does it take?",
      "What if the stores say no?",
    ]);
    fireEvent.click(within(faq).getByRole("button", { name: "What if the stores say no?" }));
    expect(within(faq).getByText(/we can't get your app live, you get your money back/)).toBeTruthy();
  });

  it("is honest in plain words that not every app can be published as it is", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("button", { name: "What do I need before I start?" }));
    expect(screen.getByText(/Not every app can be published as it is. The free check tells you what yours needs/)).toBeTruthy();
  });

  it("stays simple: five sections, and no developer words for people who have never heard of them", () => {
    const { container } = renderLanding();
    expect(container.querySelectorAll("section")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "What do I need before I start?" }));
    const jargon = /\b(Vite|Next\.js|Nuxt|Expo|Capacitor|React Native|repository|commit|keystore|AAB|static export|bundle identifier)\b/i;
    expect(container.textContent).not.toMatch(jargon);
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
