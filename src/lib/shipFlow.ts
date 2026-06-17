// Single source of truth for ship-flow step derivation.
// Both the dashboard card (condensed 5-step view) and the in-app flow bar/guide
// (full 8-step view) derive from the SAME facts and the SAME rules here, so they
// can never disagree about what is "done".

export type FlowStep =
  | "scan"
  | "fix"
  | "signup"
  | "listing"
  | "screenshots"
  | "connect"
  | "build"
  | "submit";

// The canonical facts about a project's progress. Gather these the same way
// everywhere (see useShipFlow + Dashboard) and feed them to the derivers below.
export interface ShipFacts {
  scanned: boolean;
  criticalIssues: number;
  loggedIn: boolean;
  hasListing: boolean;
  hasScreenshots: boolean;
  hasEas: boolean;
  hasBuild: boolean; // a build has completed
  isSubmitted: boolean; // submitted / in review / approved
  isLive: boolean; // published live on the store
}

export interface FlowStepState {
  id: FlowStep;
  label: string;
  description: string;
  completed: boolean;
  available: boolean;
}

const isFixed = (f: ShipFacts) => f.scanned && f.criticalIssues === 0;

// Full 8-step model — used by the in-app flow bar and guide.
export function deriveSteps(f: ShipFacts): FlowStepState[] {
  return [
    { id: "scan", label: "Check", description: "See if your app is ready for the stores", completed: f.scanned, available: true },
    { id: "fix", label: "Fix", description: "Fix the problems we found", completed: isFixed(f), available: f.scanned },
    { id: "signup", label: "Sign Up", description: "Create a free account to continue", completed: f.loggedIn, available: f.scanned },
    { id: "listing", label: "Store Page", description: "Write your app's name, description, and more", completed: f.hasListing, available: f.scanned && f.loggedIn },
    { id: "screenshots", label: "Screenshots", description: "Add screenshots of your app", completed: f.hasScreenshots, available: f.scanned && f.loggedIn && f.hasListing },
    { id: "connect", label: "Connect", description: "Link your Apple and Google accounts", completed: f.hasEas, available: f.loggedIn && f.hasListing },
    { id: "build", label: "Build", description: "Prepare your app for the stores", completed: f.hasBuild, available: f.hasEas && f.hasListing },
    { id: "submit", label: "Go Live", description: "Send your app to Google Play", completed: f.isSubmitted || f.isLive, available: f.hasBuild },
  ];
}

// Honest progress: weighted by the full 8-step model, so "Publish" (which rolls up
// connect + build + submit on the dashboard) counts as the 3 steps of real work it is,
// not 1/5 of the bar. Same value the in-app guide shows.
export function progressPercent(f: ShipFacts): number {
  const steps = deriveSteps(f);
  return Math.round((steps.filter((s) => s.completed).length / steps.length) * 100);
}

// First incomplete step in sequence — the user's current focus.
export function getCurrentStep(f: ShipFacts): FlowStep {
  if (!f.scanned) return "scan";
  if (f.criticalIssues > 0) return "fix";
  if (!f.loggedIn) return "signup";
  if (!f.hasListing) return "listing";
  if (!f.hasScreenshots) return "screenshots";
  if (!f.hasEas) return "connect";
  if (!f.hasBuild) return "build";
  return "submit";
}

// Condensed 5-step view for the dashboard list. "publish" rolls up
// connect + build + submit. Derived from the SAME facts as the full model.
export type DashStepKey = "check" | "fix" | "listing" | "screenshots" | "publish";

export interface DashStepState {
  key: DashStepKey;
  done: boolean;
  active: boolean;
}

export function deriveDashboardSteps(f: ShipFacts): DashStepState[] {
  const fixed = isFixed(f);
  return [
    { key: "check", done: f.scanned, active: !f.scanned },
    { key: "fix", done: fixed, active: f.scanned && !fixed },
    { key: "listing", done: f.hasListing, active: fixed && !f.hasListing },
    { key: "screenshots", done: f.hasScreenshots, active: f.hasListing && !f.hasScreenshots },
    { key: "publish", done: f.isLive, active: f.hasScreenshots && !f.isLive },
  ];
}
