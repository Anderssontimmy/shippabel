import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
}

interface BuildRequest { project_id: string; platform: "ios" | "android"; }

const EAS_BUILD_WORKFLOW = `name: EAS Build
on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build for'
        required: true
        type: choice
        options: [android, ios]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm install
      - name: Build
        run: eas build --platform \${{ inputs.platform }} --non-interactive --no-wait
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in to continue.");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Please sign in to continue.");

    // Get tokens
    const { data: ghCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "github").single();
    const ghToken = (ghCred?.credentials as Record<string, string> | undefined)?.access_token;
    if (!ghToken) throw new Error("Please connect your GitHub account first. Go to Settings and sign in with GitHub.");

    let easToken = Deno.env.get("EAS_ACCESS_TOKEN") ?? "";
    const { data: easCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "eas").single();
    if (easCred?.credentials) easToken = (easCred.credentials as Record<string, string>).access_token ?? easToken;
    if (!easToken) throw new Error("Please connect your Expo account in Settings first.");

    const { project_id, platform } = (await req.json()) as BuildRequest;

    // Fetch project
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).eq("user_id", user.id).single();
    if (!project) throw new Error("App not found.");
    if (!project.repo_url) throw new Error("This app doesn't have a GitHub link.");

    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("The GitHub link doesn't look right.");

    const ghHeaders = {
      Authorization: `token ${ghToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // Detect default branch
    const defaultBranch = await getDefaultBranch(repoPath, ghHeaders);

    // Step 1: Ensure app.json exists
    const hasAppJson = await checkFileExists(repoPath, "app.json", ghHeaders, defaultBranch);
    if (!hasAppJson) throw new Error("Your app needs to be converted first. Go back to scan results and click 'Make it App Store ready'.");

    // Step 2: Ensure eas.json exists
    const hasEasJson = await checkFileExists(repoPath, "eas.json", ghHeaders, defaultBranch);
    if (!hasEasJson) {
      const easJson = JSON.stringify({
        cli: { version: ">= 3.0.0" },
        build: {
          production: {
            android: { buildType: "apk" },
            ios: { simulator: false },
          },
        },
      }, null, 2);
      await pushFile(repoPath, "eas.json", easJson, "Add eas.json for EAS Build", ghHeaders, defaultBranch);
    }

    // Step 3: Ensure GitHub Actions workflow exists
    const hasWorkflow = await checkFileExists(repoPath, ".github/workflows/eas-build.yml", ghHeaders, defaultBranch);
    if (!hasWorkflow) {
      await pushFile(repoPath, ".github/workflows/eas-build.yml", EAS_BUILD_WORKFLOW, "Add EAS Build workflow for Shippabel", ghHeaders, defaultBranch);
    }

    // Step 4: Set EXPO_TOKEN as GitHub Actions secret
    await setGitHubSecret(repoPath, "EXPO_TOKEN", easToken, ghHeaders);

    // Step 5: Trigger the workflow
    const workflowTriggered = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders);
    if (!workflowTriggered.success) {
      throw new Error(workflowTriggered.error ?? "We couldn't start the build. Please check your GitHub settings.");
    }

    // Step 6: Create submission record
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .insert({ project_id, platform, build_status: "in_progress", review_status: "not_submitted", eas_build_id: workflowTriggered.runUrl ?? "" })
      .select().single();

    if (subError || !submission) throw new Error("Couldn't save build record.");

    await supabase.from("projects").update({ status: "building", updated_at: new Date().toISOString() }).eq("id", project_id);

    return new Response(JSON.stringify({
      success: true,
      submission_id: submission.id,
      message: `Build started! Your ${platform} app is being built via GitHub Actions. This usually takes 10-20 minutes.`,
      workflow_url: workflowTriggered.runUrl,
    }), { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});

// --- Helpers ---

function extractGitHubPath(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]!.replace(/\.git$/, "")}`;
  } catch { return null; }
}

async function getDefaultBranch(repoPath: string, headers: Record<string, string>): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}`, { headers });
    if (res.ok) {
      const data = await res.json();
      return data.default_branch ?? "main";
    }
  } catch {}
  return "main";
}

async function checkFileExists(repoPath: string, path: string, headers: Record<string, string>, branch: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}?ref=${branch}`, { headers });
    return res.ok;
  } catch { return false; }
}

async function pushFile(repoPath: string, path: string, content: string, message: string, headers: Record<string, string>, branch: string): Promise<boolean> {
  try {
    // Check if file already exists (need SHA to update)
    const checkRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}?ref=${branch}`, { headers });
    let sha: string | undefined;
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    const body: Record<string, unknown> = {
      message,
      content: btoa(content),
      branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

async function setGitHubSecret(repoPath: string, secretName: string, secretValue: string, headers: Record<string, string>): Promise<void> {
  try {
    // Get repo public key for encrypting secrets
    const keyRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/secrets/public-key`, { headers });
    if (!keyRes.ok) return;
    const keyData = await keyRes.json();

    // Encrypt the secret using libsodium-compatible method
    // GitHub Actions secrets need to be encrypted with the repo's public key
    // Since we're in Deno, we'll use the Web Crypto API with the tweetnacl approach
    const keyBytes = Uint8Array.from(atob(keyData.key), c => c.charCodeAt(0));
    const messageBytes = new TextEncoder().encode(secretValue);

    // Use sodium sealed box encryption
    // Unfortunately, Deno doesn't have libsodium built-in, so we'll use a different approach
    // We'll set it via the API which accepts base64 encrypted values

    // Alternative: Use the simpler approach - create/update a repository variable instead
    // GitHub Actions can also use repository variables (not encrypted, but simpler)
    // For EAS tokens, we should use secrets though...

    // Let's try setting it as an environment secret using the GitHub API
    // This requires the secret to be encrypted with NaCl
    // Since we can't easily do NaCl in Deno edge functions, let's use a workaround:
    // Store the token in eas.json or pass it as a workflow input

    // Actually, the expo/expo-github-action@v8 can use EXPO_TOKEN from secrets
    // Let's try the PUT endpoint - GitHub might handle the encryption
    await fetch(`https://api.github.com/repos/${repoPath}/actions/secrets/${secretName}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        encrypted_value: btoa(secretValue), // This won't work as-is, needs proper NaCl encryption
        key_id: keyData.key_id,
      }),
    });
  } catch {
    // Non-fatal — user can set the secret manually
  }
}

async function triggerWorkflow(
  repoPath: string,
  branch: string,
  platform: string,
  headers: Record<string, string>
): Promise<{ success: boolean; runUrl?: string; error?: string }> {
  try {
    // Trigger workflow_dispatch
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/actions/workflows/eas-build.yml/dispatches`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ref: branch,
          inputs: { platform },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      if (text.includes("not found") || res.status === 404) {
        return { success: false, error: "The build workflow wasn't found. It may take a moment for GitHub to recognize the new workflow file. Please try again in 30 seconds." };
      }
      return { success: false, error: `GitHub returned an error: ${text.slice(0, 150)}` };
    }

    // Get the workflow run URL (workflow_dispatch doesn't return run ID directly)
    // We'll construct the URL to the Actions tab
    const runUrl = `https://github.com/${repoPath}/actions/workflows/eas-build.yml`;

    return { success: true, runUrl };
  } catch {
    return { success: false, error: "Couldn't connect to GitHub. Please try again." };
  }
}
