import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export function ciState(runs, commit) {
  const latest = runs.filter((run) => run.head_sha === commit && run.event === "push")
    .sort((a, b) => b.id - a.id)[0];
  if (!latest || latest.status !== "completed") return "pending";
  return latest.conclusion === "success" ? "success" : "failed";
}

async function main() {
  if (process.env.VERCEL_ENV !== "production") return;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(commit ?? "")) throw new Error("Production requires VERCEL_GIT_COMMIT_SHA to verify CI.");
  const endpoint = `https://api.github.com/repos/Anderssontimmy/shippabel/actions/workflows/ci.yml/runs?head_sha=${commit}&event=push&per_page=10`;
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Cannot verify GitHub CI (${response.status}). Production build stopped.`);
    const state = ciState((await response.json()).workflow_runs ?? [], commit);
    if (state === "success") { console.log(`CI passed for ${commit}. Production build allowed.`); return; }
    if (state === "failed") throw new Error(`CI failed for ${commit}. Production build stopped.`);
    console.log(`Waiting for CI on ${commit}...`);
    await setTimeout(30000);
  }
  throw new Error("CI did not finish within 12 minutes. Retry deployment after CI passes.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
