import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppPotentialCard } from "./AppPotentialCard";
import type { AppPotentialAnalysis } from "@/lib/types";

const analysis: AppPotentialAnalysis = {
  app_description: "A habit tracker with daily streaks.",
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
  it("shows what the scan understood, with strengths and quick wins as lists", () => {
    render(<AppPotentialCard analysis={analysis} />);
    expect(screen.getByRole("heading", { level: 2, name: "What we see in your app" })).toBeTruthy();
    expect(screen.getByText("A habit tracker with daily streaks.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Your strengths" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Simple onboarding",
      "Works offline",
      "Add reminders",
    ]);
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
