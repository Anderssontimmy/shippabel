import { extractGitHubPath, fetchGitHubProject, ScanError } from "../_shared/scanSource.ts";
import { planConversion, commitConversion } from "../_shared/conversion.ts";
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

interface ConvertRequest {
  project_id: string;
}

Deno.serve(instrument("convert-project", async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== "POST") throw new ScanError("Method not allowed", 405);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in first");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Please sign in first");

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
    await supabase.from("usage_events").insert({ user_id: user.id, action: "convert-project" });

    const { project_id } = (await req.json()) as ConvertRequest;

    // Fetch project — must belong to the requesting user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) throw new Error("Project not found");
    if (!project.repo_url) throw new Error("No repository linked");

    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("Invalid repository URL");

    // Get user's GitHub token
    const { data: githubCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "github")
      .single();

    const githubCreds = await decryptCreds(githubCred?.credentials as Record<string, unknown> | undefined, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
    const githubToken = githubCreds.access_token;

    if (!githubToken) throw new ScanError("Connect your GitHub account in Settings with Contents write access.");
    const source = await fetchGitHubProject(repoPath, githubToken, fetch, { includeSource: false });
    const filesToPush = planConversion(source, project.name, repoPath);
    await commitConversion(repoPath, githubToken, source, filesToPush);
    const pushedFiles = filesToPush.map(file => file.path);

    // Re-scan the project to get updated score and issue list. The re-scan is
    // the source of truth for which issues remain — don't blanket-mark issues
    // as fixed here (an existing but incomplete app.json gets no fix pushed).
    // Forward the USER's auth header: scan-project's ownership guard rejects
    // the call otherwise (the service-role token carries no user identity).
    const { error: rescanError } = await supabase.functions.invoke("scan-project", {
      body: { project_id, repo_url: project.repo_url },
      headers: { Authorization: authHeader },
      timeout: 45000,
    });

    return new Response(
      JSON.stringify({
        success: true,
        files_pushed: pushedFiles,
        total_files: filesToPush.length,
        rescan_ok: !rescanError,
        message: pushedFiles.length > 0
          ? `Updated ${pushedFiles.length} file${pushedFiles.length > 1 ? "s" : ""} in your repository.${rescanError ? " The re-scan didn't finish, so click Re-scan (or refresh) to see updated results." : " Your web app now has an Android wrapper. Its build, signing key and store assets still need verification."}`
          : "No changes were needed.",
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return new Response(
      JSON.stringify({ error: message }),
      { status: err instanceof ScanError ? err.status : 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
}));

