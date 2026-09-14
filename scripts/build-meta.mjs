import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
let commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
if (!commit) {
  try { commit = execFileSync(process.platform === "win32" ? "C:/Program Files/Git/cmd/git.exe" : "git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
  catch { commit = "unknown"; }
}
writeFileSync("dist/version.json", JSON.stringify({ commit, built_at: new Date().toISOString() }));
