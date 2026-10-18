import { describe, expect, it } from "vitest";
import { scoreGoal } from "./scoreGoal";

const issue = (auto_fixable: boolean, fixed = false) => ({ auto_fixable, fixed });

describe("score goal", () => {
  it("says what it takes to reach 100, and how much of it Auto-fix does", () => {
    expect(scoreGoal(73, [issue(true), issue(true), issue(false)])).toBe("Fix the 3 items below and your score can reach 100. Auto-fix can do 2 of them.");
    expect(scoreGoal(92, [issue(true), issue(true)])).toBe("Fix the 2 items below and your score can reach 100. Auto-fix can do all of them.");
    expect(scoreGoal(94, [issue(false), issue(false)])).toBe("Fix the 2 items below and your score can reach 100.");
  });

  it("speaks of one item in the singular", () => {
    expect(scoreGoal(98, [issue(true)])).toBe("Fix the item below and your score can reach 100. Auto-fix can do it.");
    expect(scoreGoal(98, [issue(false)])).toBe("Fix the item below and your score can reach 100.");
  });

  it("counts only what is still open", () => {
    expect(scoreGoal(90, [issue(true, true), issue(false), issue(false, true)])).toBe("Fix the item below and your score can reach 100.");
  });

  it("says nothing when there is nothing left to gain", () => {
    expect(scoreGoal(100, [issue(true)])).toBeNull();
    expect(scoreGoal(95, [])).toBeNull();
    expect(scoreGoal(95, [issue(true, true)])).toBeNull();
  });
});
