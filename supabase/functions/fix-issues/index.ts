import { instrument } from "../_shared/monitoring.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptCreds } from "../_shared/crypto.ts";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
  "Access-Control-Allow-Origin": allowed,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface FixRequest {
  project_id: string;
  issue_ids?: string[]; // Fix specific issues, or all auto-fixable if omitted
}

Deno.serve(instrument("fix-issues", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sign in to use this feature");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Sign in to use this feature");

    const plan = (user.app_metadata as Record<string, unknown> | undefined)?.plan;
    if (plan !== "ship" && plan !== "unlimited") {
      return new Response(
        JSON.stringify({ error: "This feature requires the Ship plan." }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Per-user hourly rate limit (defense-in-depth against cost/abuse)
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((recentCount ?? 0) >= 60) {
      return new Response(
        JSON.stringify({ error: "You've hit the hourly limit. Please try again in a bit." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    await supabase.from("usage_events").insert({ user_id: user.id, action: "fix-issues" });

    const { project_id, issue_ids } = (await req.json()) as FixRequest;

    // Fetch project — must belong to the requesting user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) throw new Error("Project not found");
    if (!project.repo_url) throw new Error("No repository URL — cannot apply fixes");

    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("Invalid GitHub URL");

    // Fetch issues to fix
    let query = supabase
      .from("issues")
      .select("*")
      .eq("project_id", project_id)
      .eq("auto_fixable", true)
      .eq("fixed", false);

    if (issue_ids && issue_ids.length > 0) {
      query = query.in("id", issue_ids);
    }

    const { data: issues, error: issuesError } = await query;
    if (issuesError || !issues) throw new Error("Could not fetch issues");

    // Use the user's stored GitHub token (works for private repos), falling
    // back to a platform token for public ones.
    let githubToken = Deno.env.get("GITHUB_TOKEN") ?? "";
    const { data: ghCred } = await supabase
      .from("user_credentials").select("credentials")
      .eq("user_id", user.id).eq("provider", "github").single();
    if (ghCred?.credentials) {
      const ghCreds = await decryptCreds(ghCred.credentials as Record<string, unknown>, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
      githubToken = ghCreds.access_token ?? githubToken;
    }
    if (!githubToken) throw new Error("Connect your GitHub account first so we can push fixes to your repo.");

    // Fetch current app.json from GitHub
    const appJson = await fetchFileFromGitHub(repoPath, "app.json", githubToken);
    let config: Record<string, unknown> | null = null;
    if (appJson) {
      try {
        config = JSON.parse(appJson.content);
      } catch {
        config = null;
      }
    }

    // Apply fixes locally, tracking what each one needs pushed. Only issues
    // whose backing push actually succeeds are reported (and stored) as fixed.
    const configFixIds: string[] = [];
    const noopFixIds: string[] = [];
    const failed: string[] = [];
    const fileUpdates: Map<string, { content: string; ids: string[] }> = new Map();

    for (const issue of issues) {
      const result = applyFix(issue, config, repoPath);
      if (!result.success) {
        failed.push(issue.id);
      } else if (result.fileContent && result.filePath) {
        const entry = fileUpdates.get(result.filePath) ?? { content: result.fileContent, ids: [] };
        entry.ids.push(issue.id);
        fileUpdates.set(result.filePath, entry);
      } else if (result.touchesConfig) {
        configFixIds.push(issue.id);
      } else {
        noopFixIds.push(issue.id);
      }
    }

    const fixed: string[] = [...noopFixIds];

    // Push file updates to GitHub — verify each push
    for (const [filePath, entry] of fileUpdates) {
      const ok = await pushFileToGitHub(repoPath, filePath, entry.content, githubToken);
      if (ok) fixed.push(...entry.ids);
      else failed.push(...entry.ids);
    }

    // If we modified app.json, serialize, push, and verify
    if (configFixIds.length > 0) {
      if (config) {
        const updatedContent = JSON.stringify(config, null, 2) + "\n";
        const ok = await pushFileToGitHub(repoPath, "app.json", updatedContent, githubToken);
        if (ok) fixed.push(...configFixIds);
        else failed.push(...configFixIds);
      } else {
        failed.push(...configFixIds);
      }
    }

    // Mark issues as fixed in database
    if (fixed.length > 0) {
      await supabase
        .from("issues")
        .update({ fixed: true, fixed_at: new Date().toISOString() })
        .in("id", fixed);

      // Re-calculate scan score
      const { data: remainingIssues } = await supabase
        .from("issues")
        .select("severity")
        .eq("project_id", project_id)
        .eq("fixed", false);

      if (remainingIssues) {
        const critical = remainingIssues.filter((i) => i.severity === "critical").length;
        const warning = remainingIssues.filter((i) => i.severity === "warning").length;
        const info = remainingIssues.filter((i) => i.severity === "info").length;
        const newScore = Math.max(0, Math.min(100, 100 - critical * 20 - warning * 6 - info * 2));

        const scanResult = project.scan_result as Record<string, unknown>;
        scanResult.issues = (scanResult.issues as Record<string, unknown>[]).map((issue) =>
          fixed.includes(issue.id as string) ? { ...issue, fixed: true } : issue
        );
        scanResult.score = newScore;
        (scanResult as { summary: Record<string, number> }).summary = {
          critical,
          warning,
          info,
          total: remainingIssues.length,
        };

        await supabase
          .from("projects")
          .update({
            scan_result: scanResult,
            status: critical === 0 ? "ready" : "issues_found",
            updated_at: new Date().toISOString(),
          })
          .eq("id", project_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        fixed: fixed.length,
        failed: failed.length,
        fixed_ids: fixed,
        has_github_token: !!githubToken,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
}));

interface FixResult {
  success: boolean;
  filePath?: string;
  fileContent?: string;
  touchesConfig?: boolean;
}

function applyFix(
  issue: Record<string, unknown>,
  config: Record<string, unknown> | null,
  _repoPath: string
): FixResult {
  const title = issue.title as string;

  if (!config) return { success: false };

  const expo = (config.expo ?? config) as Record<string, unknown>;

  switch (title) {
    case "Missing bundle identifier": {
      const name = ((expo.slug ?? expo.name ?? "myapp") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).bundleIdentifier = `com.app.${name}`;
      (expo.android as Record<string, unknown>).package = `com.app.${name}`;
      return { success: true, touchesConfig: true };
    }

    case "Default bundle identifier detected": {
      const name = ((expo.slug ?? expo.name ?? "myapp") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).bundleIdentifier = `com.app.${name}`;
      (expo.android as Record<string, unknown>).package = `com.app.${name}`;
      return { success: true, touchesConfig: true };
    }

    case "Version not set": {
      expo.version = "1.0.0";
      return { success: true, touchesConfig: true };
    }

    case "Build number not set": {
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).buildNumber = "1";
      (expo.android as Record<string, unknown>).versionCode = 1;
      return { success: true, touchesConfig: true };
    }

    case "Missing privacy policy URL": {
      // A policy is only fixed after generate-privacy has actually produced it.
      return { success: false };
    }

    case "No app category set": {
      if (!expo.ios) expo.ios = {};
      (expo.ios as Record<string, unknown>).appStoreCategory = "UTILITIES";
      return { success: true, touchesConfig: true };
    }

    case "Environment file committed to repository":
    case "No .gitignore file": {
      const gitignoreContent = `# Dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Environment variables
.env*

# Native builds
ios/
android/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`;
      return { success: true, filePath: ".gitignore", fileContent: gitignoreContent };
    }

    default:
      return { success: false };
  }
}

function extractGitHubPath(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const repo = parts[1]!.replace(/\.git$/, "");
    return `${parts[0]}/${repo}`;
  } catch {
    return null;
  }
}

async function fetchFileFromGitHub(
  repoPath: string,
  filePath: string,
  token?: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
    if (token) headers.Authorization = `token ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${filePath}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = atob(data.content.replace(/\n/g, ""));
    return { content, sha: data.sha };
  } catch {
    return null;
  }
}

async function pushFileToGitHub(
  repoPath: string,
  filePath: string,
  content: string,
  token: string
): Promise<boolean> {
  // Get current file SHA if it exists
  let sha: string | undefined;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${filePath}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist, that's fine
  }

  const body: Record<string, unknown> = {
    message: `fix: auto-fix by Shippabel`,
    // btoa alone throws on non-ASCII content
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
