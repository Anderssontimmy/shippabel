import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import { zipSync, strToU8 } from "npm:fflate@0.8.2";
import { analyzeZip, extractGitHubPath, fetchGitHubProject, findSecrets, ScanError } from "./scanSource.ts";
import { canScanProject, guestTokenHash, validateScanRequest } from "./scanAccess.ts";

const fakeKey = "sk_live_" + "TESTONLYNOTAREALKEY123456789";

Deno.test("ZIP: deflated files preserve source directories and detect secrets", () => {
  const result = analyzeZip(zipSync({ "app/package.json": strToU8('{"name":"fixture","dependencies":{"expo":"1"}}'), "app/src/config.ts": strToU8(`const key = '${fakeKey}'`), "app/assets/icon.png": new Uint8Array([1, 2]) }, { level: 6 }));
  assertEquals(result.packageJson?.name, "fixture");
  assertEquals(result.fileList.includes("src/config.ts"), true);
  assertEquals(findSecrets(result), [{ file: "src/config.ts", name: "Stripe secret key" }]);
});
Deno.test("ZIP: root files prevent stripping independent directories", () => {
  const result = analyzeZip(zipSync({ "package.json": strToU8("{}"), "src/index.ts": strToU8("export {}"), "assets/icon.png": new Uint8Array([1]) }));
  assertEquals(result.fileList, ["package.json", "src/index.ts", "assets/icon.png"]);
});
Deno.test("ZIP: invalid, empty, oversized and traversal archives fail", () => {
  for (const bytes of [strToU8("not a zip"), zipSync({}), new Uint8Array(21 * 1024 * 1024), zipSync({ "../secret.ts": strToU8("bad") })]) assertThrows(() => analyzeZip(bytes), ScanError);
});
Deno.test("ZIP: broken configuration fails instead of scoring empty data", () => {
  assertThrows(() => analyzeZip(zipSync({ "package.json": strToU8("{broken") })), ScanError, "valid JSON");
});
Deno.test("ZIP: excessive expanded files fail before decompression", () => {
  assertThrows(() => analyzeZip(zipSync({ "source.ts": new Uint8Array(600000) })), ScanError, "too large");
});
Deno.test("GitHub URLs: lookalike hosts, credentials, nested paths and HTTP rejected", () => {
  for (const url of ["https://github.com.evil.test/a/b", "https://evil.test/github.com/a/b", "http://github.com/a/b", "https://me@github.com/a/b", "https://github.com/a/b/tree/main", "invalid"]) assertThrows(() => extractGitHubPath(url));
  assertEquals(extractGitHubPath("https://github.com/org/repo.git/"), "org/repo");
});
function githubMock(branch = "release/stable", failFile = false): typeof fetch {
  return (async (input, init) => {
    const url = new URL(String(input));
    assertEquals(new Headers(init?.headers).get("authorization"), "Bearer test-token");
    if (url.pathname.endsWith("/o/r")) return Response.json({ default_branch: branch });
    if (url.pathname.includes("/commits/")) {
      assertEquals(decodeURIComponent(url.pathname.split("/commits/")[1]), branch);
      return Response.json({ sha: "commit-sha" });
    }
    if (url.pathname.includes("/git/trees/")) return Response.json({ sha: "tree-sha", tree: [{ type: "blob", path: "package.json" }, { type: "blob", path: "src/config.ts" }] });
    assertEquals(url.searchParams.get("ref"), "commit-sha");
    assertEquals(new Headers(init?.headers).get("accept"), "application/vnd.github.raw+json");
    if (url.pathname.endsWith("package.json")) return new Response('{"name":"private-fixture"}');
    return failFile ? new Response("Forbidden", { status: 403 }) : new Response(`const key = '${fakeKey}'`);
  }) as typeof fetch;
}
for (const branch of ["master", "trunk", "release/stable"]) Deno.test(`Private GitHub: ${branch} uses authenticated commit snapshot for config and security`, async () => {
  const result = await fetchGitHubProject("o/r", "test-token", githubMock(branch));
  assertEquals(result.branch, branch);
  assertEquals(result.packageJson?.name, "private-fixture");
  assertEquals(findSecrets(result).length, 1);
});
Deno.test("GitHub errors: failed private source fetch must fail the scan", async () => {
  await assertRejects(() => fetchGitHubProject("o/r", "test-token", githubMock("main", true)), ScanError, "refused");
});
Deno.test("GitHub errors: unavailable repository and truncated tree must fail", async () => {
  await assertRejects(() => fetchGitHubProject("o/r", undefined, (() => Promise.resolve(new Response("", { status: 404 }))) as typeof fetch), ScanError);
  let calls = 0;
  const mock = (() => Promise.resolve(Response.json(++calls === 1 ? { default_branch: "main" } : calls === 2 ? { sha: "commit" } : { truncated: true }))) as typeof fetch;
  await assertRejects(() => fetchGitHubProject("o/r", undefined, mock), ScanError, "too large");
});
Deno.test("Access: missing, legacy, wrong-owner and foreign-guest projects rejected", async () => {
  const token = "a".repeat(64);
  const hash = await guestTokenHash(token);
  assertEquals(await canScanProject(null, "user", token), false);
  assertEquals(await canScanProject({ user_id: "other" }, "user", token), false);
  assertEquals(await canScanProject({ user_id: "user" }, "user", ""), true);
  assertEquals(await canScanProject({ user_id: null }, "user", token), false);
  assertEquals(await canScanProject({ user_id: null, guest_token_hash: hash }, "user", "b".repeat(64)), false);
  assertEquals(await canScanProject({ user_id: null, guest_token_hash: hash }, null, token), true);
});
Deno.test("Scan request rejects foreign uploads, invalid IDs and conflicting sources", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const input of [null, {}, { project_id: id }, { project_id: id, file_path: "scans/other/source.zip" }, { project_id: id, repo_url: "repo", file_path: `scans/${id}/source.zip` }]) assertThrows(() => validateScanRequest(input));
  assertEquals(validateScanRequest({ project_id: id, file_path: `scans/${id}/source.zip` }).project_id, id);
});
