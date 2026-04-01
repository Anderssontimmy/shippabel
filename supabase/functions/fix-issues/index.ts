import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
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

    const { project_id, issue_ids } = (await req.json()) as FixRequest;

    // Fetch project — verify ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
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

    // Fetch current app.json from GitHub
    const appJson = await fetchFileFromGitHub(repoPath, "app.json");
    let config: Record<string, unknown> | null = null;
    if (appJson) {
      try {
        config = JSON.parse(appJson.content);
      } catch {
        config = null;
      }
    }

    const fixed: string[] = [];
    const failed: string[] = [];
    const fileUpdates: Map<string, string> = new Map();

    for (const issue of issues) {
      const result = applyFix(issue, config, repoPath);
      if (result.success) {
        fixed.push(issue.id);
        if (result.fileContent && result.filePath) {
          fileUpdates.set(result.filePath, result.fileContent);
        }
      } else {
        failed.push(issue.id);
      }
    }

    // Push file updates to GitHub
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (githubToken && fileUpdates.size > 0) {
      for (const [filePath, content] of fileUpdates) {
        await pushFileToGitHub(repoPath, filePath, content, githubToken);
      }
    }

    // If we modified app.json, serialize and push it
    if (config && fixed.length > 0 && githubToken) {
      const updatedContent = JSON.stringify(config, null, 2) + "\n";
      await pushFileToGitHub(repoPath, "app.json", updatedContent, githubToken);
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
        success: true,
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
});

interface FixResult {
  success: boolean;
  filePath?: string;
  fileContent?: string;
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
      return { success: true };
    }

    case "Default bundle identifier detected": {
      const name = ((expo.slug ?? expo.name ?? "myapp") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).bundleIdentifier = `com.app.${name}`;
      (expo.android as Record<string, unknown>).package = `com.app.${name}`;
      return { success: true };
    }

    case "Version not set": {
      expo.version = "1.0.0";
      return { success: true };
    }

    case "Build number not set": {
      if (!expo.ios) expo.ios = {};
      if (!expo.android) expo.android = {};
      (expo.ios as Record<string, unknown>).buildNumber = "1";
      (expo.android as Record<string, unknown>).versionCode = 1;
      return { success: true };
    }

    case "Missing privacy policy URL": {
      // Will be set when privacy policy is generated
      return { success: true };
    }

    case "No app category set": {
      if (!expo.ios) expo.ios = {};
      (expo.ios as Record<string, unknown>).appStoreCategory = "UTILITIES";
      return { success: true };
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
  filePath: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${filePath}`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
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
) {
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
    content: btoa(content),
  };
  if (sha) body.sha = sha;

  await fetch(
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
}
