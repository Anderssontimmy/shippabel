import { describe, it, expect } from "vitest";
import { deriveSteps, getCurrentStep, deriveDashboardSteps, type ShipFacts } from "./shipFlow";

const base: ShipFacts = {
  scanned: false,
  criticalIssues: 0,
  loggedIn: false,
  hasListing: false,
  hasScreenshots: false,
  hasEas: false,
  hasBuild: false,
  isSubmitted: false,
  isLive: false,
};
const facts = (o: Partial<ShipFacts>): ShipFacts => ({ ...base, ...o });

describe("shipFlow", () => {
  it("starts at scan when nothing is done", () => {
    expect(getCurrentStep(base)).toBe("scan");
  });

  it("advances through the sequence as facts accumulate", () => {
    expect(getCurrentStep(facts({ scanned: true, criticalIssues: 2 }))).toBe("fix");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: false }))).toBe("signup");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: true }))).toBe("listing");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: true, hasListing: true }))).toBe("screenshots");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: true, hasListing: true, hasScreenshots: true }))).toBe("connect");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: true, hasListing: true, hasScreenshots: true, hasEas: true }))).toBe("build");
    expect(getCurrentStep(facts({ scanned: true, loggedIn: true, hasListing: true, hasScreenshots: true, hasEas: true, hasBuild: true }))).toBe("submit");
  });

  it("matches the in-review dashboard state (publish active, everything before it done)", () => {
    const f = facts({ scanned: true, loggedIn: true, hasListing: true, hasScreenshots: true, hasEas: true, hasBuild: true, isSubmitted: true });
    const byKey = Object.fromEntries(deriveDashboardSteps(f).map((s) => [s.key, s]));
    expect(byKey.check!.done && byKey.fix!.done && byKey.listing!.done && byKey.screenshots!.done).toBe(true);
    expect(byKey.publish!.done).toBe(false); // not done until live
    expect(byKey.publish!.active).toBe(true);
  });

  // The whole point of the shared module: the card and the in-app flow can never
  // disagree on the steps they share.
  it("dashboard and full views never disagree on shared steps", () => {
    const samples = [
      base,
      facts({ scanned: true }),
      facts({ scanned: true, criticalIssues: 1 }),
      facts({ scanned: true, loggedIn: true, hasListing: true }),
      facts({ scanned: true, loggedIn: true, hasListing: true, hasScreenshots: true, hasEas: true, hasBuild: true, isLive: true }),
    ];
    for (const f of samples) {
      const full = Object.fromEntries(deriveSteps(f).map((s) => [s.id, s.completed]));
      const dash = Object.fromEntries(deriveDashboardSteps(f).map((s) => [s.key, s.done]));
      expect(dash.check).toBe(full.scan);
      expect(dash.fix).toBe(full.fix);
      expect(dash.listing).toBe(full.listing);
      expect(dash.screenshots).toBe(full.screenshots);
    }
  });
});
