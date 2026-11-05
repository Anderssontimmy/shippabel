import { describe, expect, it } from "vitest";
import { NOT_A_LINK, parseGitHubLink } from "./githubLink";

const ok = (url: string) => ({ ok: true, url });
const rejected = (site: string) => ({ ok: false, site });

describe("a GitHub link as people really paste it", () => {
  it("accepts the address from the browser bar", () => {
    expect(parseGitHubLink("https://github.com/acme/app")).toEqual(ok("https://github.com/acme/app"));
    expect(parseGitHubLink("https://github.com/acme/app/")).toEqual(ok("https://github.com/acme/app"));
  });

  it("accepts it without https, with www, in capitals, or with spaces around it", () => {
    for (const pasted of ["github.com/acme/app", "www.github.com/acme/app", "http://github.com/acme/app", "HTTPS://GitHub.com/acme/app", "  https://github.com/acme/app \n"]) {
      expect(parseGitHubLink(pasted), pasted).toEqual(ok("https://github.com/acme/app"));
    }
  });

  it("accepts the clone address that ends in .git", () => {
    expect(parseGitHubLink("https://github.com/acme/app.git")).toEqual(ok("https://github.com/acme/app"));
    expect(parseGitHubLink("https://github.com/acme/my.app")).toEqual(ok("https://github.com/acme/my.app"));
  });

  it("accepts a link to a page inside the project and scans the whole project", () => {
    for (const pasted of [
      "https://github.com/acme/app/tree/main/src",
      "https://github.com/acme/app/blob/main/README.md",
      "https://github.com/acme/app/issues/3",
      "https://github.com/acme/app?tab=readme-ov-file",
      "https://github.com/acme/app#readme",
    ]) {
      expect(parseGitHubLink(pasted), pasted).toEqual(ok("https://github.com/acme/app"));
    }
  });
});

describe("what is turned away, and the only thing remembered about it", () => {
  it("turns away a GitHub page that is not a project, and says it was GitHub", () => {
    expect(parseGitHubLink("https://github.com/acme")).toEqual(rejected("github.com"));
    expect(parseGitHubLink("github.com")).toEqual(rejected("github.com"));
    expect(parseGitHubLink("https://github.com/acme/.git")).toEqual(rejected("github.com"));
  });

  it("turns away the tools people build in, remembering the site and nothing else", () => {
    expect(parseGitHubLink("https://lovable.dev/projects/3f2b8c1e")).toEqual(rejected("lovable.dev"));
    expect(parseGitHubLink("https://my-secret-app.lovable.app/")).toEqual(rejected("lovable.app"));
    expect(parseGitHubLink("replit.com/@someone/Daily-Habits")).toEqual(rejected("replit.com"));
    expect(parseGitHubLink("https://bolt.new/~/sb1-abc123")).toEqual(rejected("bolt.new"));
    expect(parseGitHubLink("https://gitlab.com/acme/app")).toEqual(rejected("gitlab.com"));
  });

  it("does not take a lookalike for GitHub", () => {
    expect(parseGitHubLink("https://evil.test/github.com/acme/app")).toEqual(rejected("evil.test"));
    expect(parseGitHubLink("https://github.com.evil.test/acme/app")).toEqual(rejected("evil.test"));
    expect(parseGitHubLink("https://notgithub.com/acme/app")).toEqual(rejected("notgithub.com"));
    expect(parseGitHubLink("ftp://github.com/acme/app")).toEqual(rejected("github.com"));
  });

  it("turns away a link that carries a password or token", () => {
    expect(parseGitHubLink("https://ghp_abc123@github.com/acme/app")).toEqual(rejected("github.com"));
    expect(parseGitHubLink("https://user:secret@github.com/acme/app")).toEqual(rejected("github.com"));
  });

  it("remembers nothing but a label when it is not a link at all", () => {
    for (const pasted of ["my app", "Daily Habits", "myapp", "localhost:3000", "192.168.0.10:5173", "javascript:alert(1)", "C:\\Users\\me\\app", "a@b"]) {
      expect(parseGitHubLink(pasted), pasted).toEqual(rejected(NOT_A_LINK));
    }
  });

  it("never remembers a person: an email address becomes its mail site", () => {
    expect(parseGitHubLink("someone@gmail.com")).toEqual(rejected("gmail.com"));
  });

  it("never remembers a path or a query, and a very long name is just a label", () => {
    expect(parseGitHubLink("https://example.com/secret/path?token=1")).toEqual(rejected("example.com"));
    expect(parseGitHubLink(`https://${"a".repeat(60)}.com/secret/path?token=1`)).toEqual(rejected(NOT_A_LINK));
  });
});
