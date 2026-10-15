import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages = readdirSync("src/pages").filter((f) => f.endsWith(".tsx") && !f.includes(".test."));

describe("accessibility guards", () => {
  it("gives every page except the landing page its own tab title", () => {
    // Without one, a signed-in user's tabs and a screen reader all say "Shippabel" on every page.
    const missing = pages.filter((f) => f !== "Landing.tsx" && !readFileSync(`src/pages/${f}`, "utf8").includes("useDocumentHead("));
    expect(missing).toEqual([]);
  });

  it("draws a focus ring and respects reduced motion", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.animate-fade-up[\s\S]*animation: none/);
  });

  it("does not use the colors measured at 2.5:1 or lower for text", () => {
    const offenders = readdirSync("src", { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".tsx") && !e.name.includes(".test."))
      .map((e) => `${e.parentPath}/${e.name}`)
      .filter((p) => /text-surface-(300|400)\b/.test(readFileSync(p, "utf8")));
    expect(offenders).toEqual([]);
  });
});
