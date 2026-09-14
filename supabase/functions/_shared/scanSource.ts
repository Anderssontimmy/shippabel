import { unzipSync } from "npm:fflate@0.8.2";

export class ScanError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}

const MAX_ARCHIVE = 20 * 1024 * 1024;
const MAX_FILE = 512 * 1024;
const MAX_EXPANDED = 100 * 1024 * 1024;
const sourcePattern = /\.(tsx?|jsx?)$/i;
export const sourceFiles = (files: string[]) => files.filter((f) =>
  sourcePattern.test(f) && !/(^|\/)(node_modules|vendor|dist|\.git)\//.test(f) && !f.endsWith(".d.ts")
).sort().slice(0, 10);

export function extractGitHubPath(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new ScanError("Enter a GitHub repository URL.", 400); }
  const parts = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password ||
      parts.length !== 2 || !parts.every((p) => /^[\w.-]+$/.test(p)) || parts.some((p) => p === "." || p === "..")) {
    throw new ScanError("Use a repository link: https://github.com/owner/repository.", 400);
  }
  return `${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
}

function parseConfig(text: string | undefined, name: string): Record<string, unknown> | null {
  if (text === undefined) return null;
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new ScanError(`${name} is not valid JSON. Fix it and scan again.`); }
}

export interface ScanSource {
  appConfig: Record<string, unknown> | null;
  packageJson: Record<string, unknown> | null;
  readmeContent: string | null;
  fileList: string[];
  contents: Map<string, string>;
  branch?: string;
}

function projectFromContents(fileList: string[], contents: Map<string, string>): ScanSource {
  if (!fileList.length) throw new ScanError("This project contains no readable files.");
  return {
    appConfig: parseConfig(contents.get("app.json"), "app.json"),
    packageJson: parseConfig(contents.get("package.json"), "package.json"),
    readmeContent: contents.get(fileList.find((f) => f.toLowerCase() === "readme.md") ?? "")?.slice(0, 2000) ?? null,
    fileList, contents,
  };
}

export async function fetchGitHubProject(repoPath: string, token?: string, request: typeof fetch = fetch): Promise<ScanSource> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async (path: string, raw = false) => {
    let response: Response;
    try {
      response = await request(`https://api.github.com/repos/${repoPath}${path}`, {
        headers: raw ? { ...headers, Accept: "application/vnd.github.raw+json" } : headers,
        signal: AbortSignal.timeout(15000), redirect: "error",
      });
    } catch { throw new ScanError("GitHub could not be reached. Please try again.", 502); }
    if (!response.ok) {
      if (response.status === 404) throw new ScanError("Repository or file not found. For a private app, connect GitHub in Settings and check access.");
      if (response.status === 401) throw new ScanError("Your GitHub connection has expired. Reconnect it in Settings.");
      if ([403, 429].includes(response.status)) throw new ScanError("GitHub refused access or reached its request limit. Check repository access and try again later.", 429);
      throw new ScanError(`GitHub could not read this project (${response.status}). Try again later.`, 502);
    }
    return response;
  };
  const metadata = await (await get("")).json();
  if (typeof metadata.default_branch !== "string") throw new ScanError("GitHub did not return a default branch.");
  const commit = await (await get(`/commits/${encodeURIComponent(metadata.default_branch)}`)).json();
  if (typeof commit.sha !== "string") throw new ScanError("GitHub returned an invalid commit.", 502);
  const tree = await (await get(`/git/trees/${commit.sha}?recursive=1`)).json();
  if (tree.truncated) throw new ScanError("This repository is too large for a complete scan. Upload a ZIP containing just your app.");
  if (!Array.isArray(tree.tree) || typeof tree.sha !== "string") throw new ScanError("GitHub returned an invalid file tree.", 502);
  const entries = tree.tree.filter((entry: { type: string; path?: string }) => entry.type === "blob" && typeof entry.path === "string") as { path: string; size?: number }[];
  const fileList = entries.map((entry) => entry.path);
  const readme = fileList.find((f) => f.toLowerCase() === "readme.md");
  const selected = new Set(["app.json", "package.json", readme, ...sourceFiles(fileList)]);
  const contents = new Map<string, string>();
  // Resolve content against the exact tree snapshot, including private repositories.
  await Promise.all(entries.filter((entry) => selected.has(entry.path)).map(async (entry) => {
    if ((entry.size ?? 0) > MAX_FILE) throw new ScanError(`${entry.path} is too large to scan (maximum 512 KB).`);
    const response = await get(`/contents/${entry.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(commit.sha)}`, true);
    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_FILE) throw new ScanError(`${entry.path} is too large to scan.`);
    contents.set(entry.path, text);
  }));
  return { ...projectFromContents(fileList, contents), branch: metadata.default_branch };
}

export function analyzeZip(bytes: Uint8Array): ScanSource {
  if (bytes.length > MAX_ARCHIVE) throw new ScanError("ZIP files must be 20 MB or smaller.", 413);
  if (bytes.length < 22 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new ScanError("Upload a valid .zip file. Other archive formats are not supported.");
  const names: string[] = [];
  let expanded = 0;
  let selectedSize = 0;
  let extracted: Record<string, Uint8Array>;
  try {
    extracted = unzipSync(bytes, { filter: (entry) => {
      if (names.length >= 20000 || entry.name.startsWith("/") || entry.name.includes("\\") || entry.name.split("/").includes("..")) throw new ScanError("The ZIP contains unsafe paths or too many files.");
      expanded += entry.originalSize;
      if (expanded > MAX_EXPANDED) throw new ScanError("The extracted ZIP is too large (maximum 100 MB).");
      if (entry.name.endsWith("/")) return false;
      names.push(entry.name);
      const selected = /(^|\/)(app\.json|package\.json|readme\.md)$/i.test(entry.name) || sourcePattern.test(entry.name);
      if (!selected || /(^|\/)(node_modules|vendor|dist|\.git)\//.test(entry.name)) return false;
      if (entry.originalSize > MAX_FILE) throw new ScanError(`${entry.name} is too large to scan (maximum 512 KB).`);
      selectedSize += entry.originalSize;
      if (selectedSize > 10 * 1024 * 1024) throw new ScanError("The ZIP contains too much source code. Upload just your app.");
      return true;
    } });
  } catch (error) {
    if (error instanceof ScanError) throw error;
    throw new ScanError("This ZIP is damaged or uses unsupported compression. Export a new ZIP and try again.");
  }
  const prefix = names[0]?.includes("/") ? names[0].slice(0, names[0].indexOf("/") + 1) : "";
  // Strip a single common wrapper, never each file's first directory independently.
  const root = prefix && names.every((name) => name.startsWith(prefix)) ? prefix : "";
  const fileList = names.map((name) => name.slice(root.length));
  const contents = new Map(Object.entries(extracted).map(([name, data]) => [name.slice(root.length), new TextDecoder().decode(data)]));
  return projectFromContents(fileList, contents);
}

export function findSecrets(source: ScanSource) {
  const patterns = [
    { pattern: /sk[-_]live[-_][a-zA-Z0-9]{20,}/, name: "Stripe secret key" },
    { pattern: /AIza[0-9A-Za-z_-]{35}/, name: "Google API key" },
    { pattern: /sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{40,}/, name: "OpenAI/Anthropic API key" },
    { pattern: /AKIA[0-9A-Z]{16}/, name: "AWS access key" },
  ];
  return sourceFiles(source.fileList).flatMap((file) => {
    const content = source.contents.get(file);
    if (content === undefined) throw new ScanError(`Could not run the security check on ${file}.`);
    const match = patterns.find(({ pattern }) => pattern.test(content));
    return match ? [{ file, name: match.name }] : [];
  });
}
