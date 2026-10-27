import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppPotentialCard } from "./AppPotentialCard";
import type { AppPotentialAnalysis } from "@/lib/types";

// A scan made before 2026-10-16 still carries the figures the model invented; they must never reach the screen.
const analysis: AppPotentialAnalysis = {
  app_description: "A habit tracker with daily streaks.",
  monetization_ideas: ["A free core with a paid plan for extra statistics.", "A one-time purchase for themes."],
  market_potential: {
    comparable_apps: ["Streaks — top paid app"],
    market_size: "The habit app market will reach $9B by 2030.",
  },
  revenue_potential: "Similar apps earn $2M a year.",
  strengths: ["Simple onboarding", "Works offline"],
  growth_suggestions: ["Add reminders"],
  excitement_hook: "Your app is ready to take on the world!",
};

describe("AppPotentialCard", () => {
  it("shows what the scan understood, with ideas, strengths and quick wins as lists", () => {
    render(<AppPotentialCard analysis={analysis} />);
    expect(screen.getByRole("heading", { level: 2, name: "What we see in your app" })).toBeTruthy();
    expect(screen.getByText("A habit tracker with daily streaks.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "How it could earn money" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Your strengths" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "A free core with a paid plan for extra statistics.",
      "A one-time purchase for themes.",
      "Simple onboarding",
      "Works offline",
      "Add reminders",
    ]);
  });

  it("calls the earning ideas ideas, not a forecast", () => {
    render(<AppPotentialCard analysis={analysis} />);
    expect(screen.getByText("Ideas to think about, not a forecast.")).toBeTruthy();
  });

  it("leaves out the earning section for a scan that has no ideas", () => {
    const { monetization_ideas: _ideas, ...older } = analysis;
    render(<AppPotentialCard analysis={older} />);
    expect(screen.queryByRole("heading", { name: "How it could earn money" })).toBeNull();
    expect(screen.queryByText(/not a forecast/)).toBeNull();
  });

  it("never shows model-guessed market sizes, revenue figures or hype", () => {
    render(<AppPotentialCard analysis={analysis} />);
    expect(screen.queryByText(/\$9B/)).toBeNull();
    expect(screen.queryByText(/\$2M/)).toBeNull();
    expect(screen.queryByText(/take on the world/)).toBeNull();
    expect(screen.queryByText(/Streaks/)).toBeNull();
  });

  it("offers no second call to action next to the real next step", () => {
    render(<AppPotentialCard analysis={analysis} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("leaves out a list that came back empty instead of an empty heading", () => {
    render(<AppPotentialCard analysis={{ ...analysis, growth_suggestions: [] }} />);
    expect(screen.queryByRole("heading", { name: "Quick wins" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Your strengths" })).toBeTruthy();
  });
});

describe("AppPotentialCard earning example", () => {
  const monthly: AppPotentialAnalysis = { ...analysis, earning_example: { billing: "monthly", price_usd: 3.99 } };

  it("says in one sentence what an app like this could bring in if it succeeds, from a price and a stated number of people", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.getByText("If an app like this succeeds, 250 people paying $3.99 a month would bring in about $998 a month.")).toBeTruthy();
  });

  it("is one line, not a table with a heading of its own", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: "What that could look like" })).toBeNull();
    expect(screen.queryByText(/Paying customers|You would earn/)).toBeNull();
  });

  it("says in the same place that it is an illustration, not a forecast, and before fees and tax", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.getByText(/not a forecast\. Nobody can tell how many people will pay/)).toBeTruthy();
    expect(screen.getByText(/before store fees and tax/)).toBeTruthy();
  });

  it("says it once next to the example instead of twice", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.queryByText("Ideas to think about, not a forecast.")).toBeNull();
    expect(screen.getAllByText(/not a forecast/)).toHaveLength(1);
  });

  it("describes a one-time price as money in total", () => {
    render(<AppPotentialCard analysis={{ ...analysis, earning_example: { billing: "once", price_usd: 2.99 } }} />);
    expect(screen.getByText("If an app like this succeeds, 250 people paying $2.99 once would bring in about $748 in total.")).toBeTruthy();
  });

  it("connects the figure to what Ship costs, for someone who does not have Ship yet", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.getByText("At that price, 25 paying customers cover Ship's $99 in the first month.")).toBeTruthy();
  });

  it("says sales, not months, for a one-time price", () => {
    render(<AppPotentialCard analysis={{ ...analysis, earning_example: { billing: "once", price_usd: 4 } }} />);
    expect(screen.getByText("At that price, 25 sales cover Ship's $99.")).toBeTruthy();
  });

  it("leaves Ship's price out for someone who has Ship", () => {
    render(<AppPotentialCard analysis={monthly} isPaid />);
    expect(screen.queryByText(/Ship's \$99/)).toBeNull();
    expect(screen.getByText(/would bring in about \$998 a month/)).toBeTruthy();
  });

  it("shows the example even when the model gave no ideas, and nothing when the price is not believable", () => {
    const { monetization_ideas: _ideas, ...noIdeas } = monthly;
    const { rerender } = render(<AppPotentialCard analysis={noIdeas} />);
    expect(screen.getByRole("heading", { name: "How it could earn money" })).toBeTruthy();
    rerender(<AppPotentialCard analysis={{ ...noIdeas, earning_example: { billing: "monthly", price_usd: 5000 } }} />);
    expect(screen.queryByText(/would bring in/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "How it could earn money" })).toBeNull();
  });

  it("claims nothing about real apps, only about the stated number of people", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.queryByText(/similar apps|other apps|apps earn|market/i)).toBeNull();
  });

  it("still never shows the old model-guessed figures next to the new example", () => {
    render(<AppPotentialCard analysis={monthly} />);
    expect(screen.queryByText(/\$9B/)).toBeNull();
    expect(screen.queryByText(/\$2M/)).toBeNull();
  });
});
