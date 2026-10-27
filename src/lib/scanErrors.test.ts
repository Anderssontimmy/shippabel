import { describe, expect, it } from "vitest";
import { needsGitHubAccess } from "./scanErrors";

describe("needsGitHubAccess", () => {
  it("recognizes the private repository message, old and new wording", () => {
    expect(needsGitHubAccess("Repository or file not found. For a private app, connect GitHub in Settings and check access.")).toBe(true);
    expect(needsGitHubAccess("Repository or file not found. If it is a private app, continue with GitHub so we can read it.")).toBe(true);
    expect(needsGitHubAccess("Connect your GitHub account first")).toBe(true);
  });

  it("leaves other failures alone", () => {
    expect(needsGitHubAccess(null)).toBe(false);
    expect(needsGitHubAccess("")).toBe(false);
    expect(needsGitHubAccess("GitHub refused access or reached its request limit. Check repository access and try again later.")).toBe(false);
    expect(needsGitHubAccess("That doesn't look like a GitHub link.")).toBe(false);
  });
});
