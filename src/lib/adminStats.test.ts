import { describe, expect, it } from "vitest";
import { change, compact, formatDay, niceMax, percent, revenue } from "./adminStats";

describe("admin stat helpers", () => {
  it("describes a change in words, and does not invent a percentage from nothing", () => {
    expect(change(12, 8)).toEqual({ text: "4 more (50%)", tone: "up" });
    expect(change(6, 8)).toEqual({ text: "2 fewer (25%)", tone: "down" });
    expect(change(5, 5)).toEqual({ text: "no change", tone: "flat" });
    expect(change(0, 0)).toEqual({ text: "no change", tone: "flat" });
    expect(change(3, 0)).toEqual({ text: "3 more (none before)", tone: "new" });
  });

  it("gives a conversion only when there is something to divide by", () => {
    expect(percent(1, 4)).toBe(25);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 10)).toBe(0);
    expect(percent(5, 0)).toBeNull();
  });

  it("rounds an axis top to a round number", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(1)).toBe(1);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(12)).toBe(20);
    expect(niceMax(21)).toBe(50);
    expect(niceMax(100)).toBe(100);
    expect(niceMax(101)).toBe(200);
  });

  it("shortens big numbers", () => {
    expect(compact(999)).toBe("999");
    expect(compact(1200)).toBe("1.2K");
    expect(compact(12000)).toBe("12K");
  });

  it("counts revenue at list price, from the plans people bought", () => {
    expect(revenue({ paid_ship: 2, paid_unlimited: 1 })).toBe(2 * 99 + 179);
    expect(revenue({ paid_ship: 0, paid_unlimited: 0 })).toBe(0);
  });

  it("writes a day without drifting across a time zone", () => {
    expect(formatDay("2026-10-12")).toBe("Mon 12 Oct");
  });
});
