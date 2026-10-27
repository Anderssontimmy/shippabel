import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StorePreviewCard } from "./StorePreviewCard";

const preview = { title: "Habit Hero", short_description: "Build habits that stick with daily streaks." };

describe("StorePreviewCard", () => {
  it("shows the draft the way it would look on Google Play, labelled as a draft", () => {
    render(<StorePreviewCard preview={preview} isPaid={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "Your Google Play page, first draft" })).toBeTruthy();
    expect(screen.getByText("Habit Hero")).toBeTruthy();
    expect(screen.getByText("Build habits that stick with daily streaks.")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
  });

  it("does not invent a logo, a rating or screenshots", () => {
    const { container } = render(<StorePreviewCard preview={preview} isPaid={false} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByText(/5\.0|stars?|rating|reviews?|downloads?/i)).toBeNull();
    expect(screen.queryByText("Screenshot")).toBeNull();
  });

  it("tells a free reader what Ship adds to the draft", () => {
    render(<StorePreviewCard preview={preview} isPaid={false} />);
    expect(screen.getByText(/Ship writes the full page, frames your screenshots and publishes it/)).toBeTruthy();
  });

  it("does not sell Ship to someone who already has it", () => {
    render(<StorePreviewCard preview={preview} isPaid />);
    expect(screen.queryByText(/Get Ship|\$99/)).toBeNull();
    expect(screen.getByText(/The store page editor writes the full version/)).toBeTruthy();
  });

  it("offers no second call to action next to the real next step", () => {
    render(<StorePreviewCard preview={preview} isPaid={false} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
