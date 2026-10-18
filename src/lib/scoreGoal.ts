import type { Issue } from "@/lib/types";

// The scanner takes 100 and subtracts for every open issue (supabase/functions/scan-project), so 100 is
// reachable exactly when nothing is left open. That makes "fix these and you reach 100" a fact, not a forecast.
export const scoreGoal = (score: number, issues: Pick<Issue, "fixed" | "auto_fixable">[]) => {
  const open = issues.filter((issue) => !issue.fixed);
  const autoFixable = open.filter((issue) => issue.auto_fixable).length;
  if (score >= 100 || open.length === 0) return null;
  const items = open.length === 1 ? "the item below" : `the ${open.length} items below`;
  const auto = autoFixable === 0 ? "" : autoFixable === open.length ? (open.length === 1 ? " Auto-fix can do it." : " Auto-fix can do all of them.") : ` Auto-fix can do ${autoFixable} of them.`;
  return `Fix ${items} and your score can reach 100.${auto}`;
};
