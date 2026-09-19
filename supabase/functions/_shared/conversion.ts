import { ScanError, type ScanSource } from "./scanSource.ts";

export interface ConversionFile { path: string; content: string }

// Browser components cannot be mounted as React Native components. Keep the web
// bundle and use Capacitor's WebView; never replace the app's entry point/scripts.
export function planConversion(source: ScanSource, name: string, repoPath: string): ConversionFile[] {
  const pkg = source.packageJson;
  const deps = { ...(pkg?.dependencies as Record<string, unknown> ?? {}), ...(pkg?.devDependencies as Record<string, unknown> ?? {}) };
  if ("expo" in deps || source.appConfig?.expo || source.fileList.some(p => /^capacitor\.config\.(json|ts|js)$/.test(p))) return [];
  if ("react-native" in deps) throw new ScanError("This React Native app needs an Expo setup compatible with its native dependencies. Automatic web conversion cannot do that.");
  if ("next" in deps || "nuxt" in deps) throw new ScanError("This app needs a static web export before mobile conversion. Server routes must stay on a hosted backend. Configure a static export and Capacitor first.");
  const build = (pkg?.scripts as Record<string, unknown> | undefined)?.build;
  if (!pkg || !("vite" in deps) || typeof build !== "string" || !/\bvite\s+build\b/.test(build) || !source.fileList.includes("index.html")) {
    throw new ScanError("Automatic conversion currently supports Vite apps with a root index.html and a vite build script. Other apps need a static build and Capacitor configuration first.");
  }
  if (Object.keys(deps).some(dep => dep.startsWith("@capacitor/"))) throw new ScanError("This app already has Capacitor dependencies. Add its capacitor.config file first so we preserve its existing mobile setup.");
  const segment = (value: string) => `app${value.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const [owner, repo] = repoPath.split("/");
  const updated = structuredClone(pkg);
  updated.dependencies = { ...(pkg.dependencies as Record<string, string> ?? {}), "@capacitor/core": "^8.0.0", "@capacitor/android": "^8.0.0" };
  updated.devDependencies = { ...(pkg.devDependencies as Record<string, string> ?? {}), "@capacitor/cli": "^8.0.0" };
  return [
    { path: "package.json", content: JSON.stringify(updated, null, 2) + "\n" },
    { path: "capacitor.config.json", content: JSON.stringify({ appId: `com.${segment(owner)}.${segment(repo)}`, appName: name.trim().slice(0, 50) || repo, webDir: "dist" }, null, 2) + "\n" },
  ];
}

// One commit and a non-forced ref update: an interrupted request cannot publish
// half the conversion, and a concurrent user commit cannot be overwritten.
export async function commitConversion(repoPath: string, token: string, source: ScanSource, files: ConversionFile[], request: typeof fetch = fetch): Promise<void> {
  if (!files.length) return;
  if (!source.branch || !source.commitSha || !source.treeSha) throw new ScanError("Could not resolve the repository revision. Scan again.");
  const send = async (path: string, method: string, body: unknown) => {
    const response = await request(`https://api.github.com/repos/${repoPath}${path}`, {
      method, signal: AbortSignal.timeout(15000), redirect: "error",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      if ([409, 422].includes(response.status)) throw new ScanError("The repository changed or its branch is protected. Refresh and try again; no conversion files were published.", 409);
      throw new ScanError("GitHub could not save the conversion. Check Contents write access and try again.", 502);
    }
    return response.json();
  };
  const tree = await send("/git/trees", "POST", { base_tree: source.treeSha, tree: files.map(file => ({ ...file, mode: "100644", type: "blob" })) });
  if (typeof tree.sha !== "string") throw new ScanError("GitHub returned an invalid tree.", 502);
  const commit = await send("/git/commits", "POST", { message: "Configure Android web wrapper via Shippabel", tree: tree.sha, parents: [source.commitSha] });
  if (typeof commit.sha !== "string") throw new ScanError("GitHub returned an invalid commit.", 502);
  await send(`/git/refs/heads/${source.branch.split("/").map(encodeURIComponent).join("/")}`, "PATCH", { sha: commit.sha, force: false });
}
