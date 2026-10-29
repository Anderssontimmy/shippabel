import { act, render, screen } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayPhone from "./PlayPhone";

// The screens change on a timer and fade between each other. These are the lengths of the first three screens.
const pass = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms + 100); });
const untilLive = async () => { await pass(3200); await pass(3000); await pass(2400); };

describe("the example phone on the front page", () => {
  beforeEach(() => { vi.useFakeTimers(); MotionGlobalConfig.skipAnimations = true; });
  afterEach(() => { MotionGlobalConfig.skipAnimations = false; vi.useRealTimers(); });

  it("tells the whole story in order: checks the app, fixes it, sends it to both stores, shows it live", async () => {
    render(<PlayPhone />);
    expect(screen.getByText("Checking your app")).toBeTruthy();
    await pass(3200);
    expect(screen.getByText("2 things needed fixing")).toBeTruthy();
    await pass(3000);
    expect(screen.getByText("Sending to both stores")).toBeTruthy();
    await pass(2400);
    expect(screen.getByText("Daily Habits")).toBeTruthy();
    expect(screen.getByText("Live in both stores")).toBeTruthy();
  });

  it("shows a made-up app, not a real customer's, and invents no ratings, reviews or download counts", async () => {
    const { container } = render(<PlayPhone />);
    await untilLive();
    expect(screen.getByText("Daily Habits")).toBeTruthy();
    expect(container.textContent).not.toMatch(/\b5\.0\b|review|download|\d+\+|Ratings/i);
    expect(container.textContent).not.toContain("Published with Shippabel");
  });

  it("never says the app goes to one store only", async () => {
    const { container } = render(<PlayPhone />);
    await pass(3200); await pass(3000);
    expect(screen.getByText("Sending to both stores")).toBeTruthy();
    await pass(2400);
    expect(container.textContent).not.toMatch(/Sending to Google Play|Live on Google Play/);
  });
});
