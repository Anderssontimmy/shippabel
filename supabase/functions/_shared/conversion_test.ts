import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import { planConversion, commitConversion } from "./conversion.ts";
import { capacitorIssues } from "./capacitor.ts";
import { ScanError, type ScanSource } from "./scanSource.ts";

const source = (): ScanSource => ({ packageJson: { name: "fixture", scripts: { build: "tsc -b && vite build", start: "vite" }, dependencies: { react: "^19.0.0" }, devDependencies: { vite: "^6.0.0" } }, appConfig: null, readmeContent: null, fileList: ["package.json", "index.html", "src/App.tsx"], contents: new Map(), branch: "release/stable", commitSha: "original-commit", treeSha: "original-tree" });

Deno.test("web conversion keeps React and build scripts, without importing DOM components into React Native", () => {
  const input = source(); const original = structuredClone(input.packageJson);
  const files = planConversion(input, "My web app", "owner/repo");
  assertEquals(files.map(f => f.path), ["package.json", "capacitor.config.json"]);
  const pkg = JSON.parse(files[0].content);
  assertEquals(pkg.scripts, original!.scripts);
  assertEquals(pkg.dependencies.react, "^19.0.0");
  assertEquals(pkg.dependencies.expo, undefined);
  assertEquals(pkg.dependencies["react-native"], undefined);
  assertEquals(input.packageJson, original);
  const config = JSON.parse(files[1].content);
  assertEquals(config.webDir, "dist");
  assertEquals(config.appId, "com.appowner.apprepo");
});
Deno.test("unsupported server and native apps stop before changes are planned", () => {
  for (const name of ["next", "nuxt", "react-native"]) {
    const input = source(); input.packageJson!.dependencies = { [name]: "1" };
    assertThrows(() => planConversion(input, "App", "owner/repo"), ScanError);
  }
  const unsupported = source(); unsupported.packageJson!.scripts = { build: "custom-build" };
  assertThrows(() => planConversion(unsupported, "App", "owner/repo"), ScanError);
});
Deno.test("existing mobile configuration is not replaced on retries", () => {
  const input = source(); input.fileList.push("capacitor.config.json");
  assertEquals(planConversion(input, "Different name", "owner/repo"), []);
  input.fileList.pop(); input.appConfig = { expo: { name: "Existing" } };
  assertEquals(planConversion(input, "Different name", "owner/repo"), []);
});
Deno.test("conversion publishes a single commit to the real branch without force", async () => {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  await commitConversion("owner/repo", "token", source(), planConversion(source(), "App", "owner/repo"), (async (url, init) => {
    calls.push({ path: new URL(String(url)).pathname, body: JSON.parse(String(init?.body)) });
    return Response.json({ sha: calls.length === 1 ? "new-tree" : "new-commit" });
  }) as typeof fetch);
  assertEquals(calls.map(c => c.path), ["/repos/owner/repo/git/trees", "/repos/owner/repo/git/commits", "/repos/owner/repo/git/refs/heads/release/stable"]);
  assertEquals(calls[0].body.base_tree, "original-tree");
  assertEquals(calls[1].body.parents, ["original-commit"]);
  assertEquals(calls[2].body, { sha: "new-commit", force: false });
});
Deno.test("concurrent repository changes are reported instead of forced or partially written", async () => {
  let calls = 0;
  await assertRejects(() => commitConversion("owner/repo", "token", source(), planConversion(source(), "App", "owner/repo"), (() => Promise.resolve(++calls < 3 ? Response.json({ sha: "sha" }) : new Response(null, { status: 422 }))) as typeof fetch), ScanError, "no conversion files were published");
});
Deno.test("Capacitor uses its own config and flags malformed settings", () => {
  const input = source(); input.contents.set("capacitor.config.json", '{"appId":"com.test.app","webDir":"dist"}');
  assertEquals(capacitorIssues(input).filter(i => i.severity === "critical"), []);
  input.contents.set("capacitor.config.json", '{"appId":"bad","webDir":"."}');
  assertEquals(capacitorIssues(input).filter(i => i.severity === "critical").length, 2);
  input.contents.set("capacitor.config.json", "{");
  assertEquals(capacitorIssues(input)[0].title, "Invalid Capacitor configuration");
});
