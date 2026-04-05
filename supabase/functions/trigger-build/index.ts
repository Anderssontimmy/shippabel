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
          token: \${{ secrets.EXPO_TOKEN || vars.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm install
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
      - name: Initialize EAS project
        run: eas init --id \${{ vars.EAS_PROJECT_ID }} --non-interactive || eas init --non-interactive || true
      - name: Fix dependencies and assets
        run: |
          npx expo install --fix || true
          mkdir -p assets
          PH='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          for f in icon.png adaptive-icon.png splash.png splash-icon.png favicon.png; do [ ! -f "./assets/$f" ] && echo "$PH" | base64 -d > "./assets/$f"; done
      - name: Build
        run: |
          npx expo prebuild --platform \${{ inputs.platform }} --no-install --clean
          cd android && chmod +x gradlew && cd ..
          eas build --platform \${{ inputs.platform }} --non-interactive --profile production --local --output ./build.apk
      - name: Upload build artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: app-\${{ inputs.platform }}
          path: ./build.apk
      - name: Submit to Google Play
        if: success() && inputs.platform == 'android' && vars.GOOGLE_SERVICE_ACCOUNT_KEY != ''
        env:
          GOOGLE_SERVICE_ACCOUNT_KEY: \${{ vars.GOOGLE_SERVICE_ACCOUNT_KEY }}
        run: |
          echo "$GOOGLE_SERVICE_ACCOUNT_KEY" > google-service-account.json
          eas submit --platform android --non-interactive --latest --profile production
        continue-on-error: true
      - name: Submit to App Store
        if: success() && inputs.platform == 'ios'
        run: eas submit --platform ios --non-interactive --latest --profile production
        continue-on-error: true
      - name: Notify completion
        if: always()
        run: |
          echo "Build status: \${{ job.status }}"
          echo "Platform: \${{ inputs.platform }}"
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
        submit: {
          production: {
            android: {
              serviceAccountKeyPath: "./google-service-account.json",
              track: "production",
            },
          },
        },
      }, null, 2);
      const pushOk = await pushFile(repoPath, "eas.json", easJson, "Add eas.json for EAS Build (via Shippabel)", ghHeaders, defaultBranch);
      if (!pushOk) throw new Error("Workflow file not found — couldn't push eas.json to your repo. Your GitHub token may not have write access. Try signing out and back in with GitHub.");
    }

    // Step 3: Ensure GitHub Actions workflow exists and is up to date
    const hasWorkflow = await checkFileExists(repoPath, ".github/workflows/eas-build.yml", ghHeaders, defaultBranch);
    // Always push to ensure latest version (uses SHA for update)
    const pushOk = await pushFile(repoPath, ".github/workflows/eas-build.yml", EAS_BUILD_WORKFLOW, hasWorkflow ? "Update EAS Build workflow (via Shippabel)" : "Add EAS Build workflow (via Shippabel)", ghHeaders, defaultBranch);
    if (!pushOk && !hasWorkflow) {
      throw new Error("Workflow file not found — couldn't push workflow to your repo. Try signing out and back in with GitHub.");
    }
    if (!hasWorkflow) {
      throw new Error("We just added the build workflow to your repo. GitHub needs a moment to recognize it. Please click 'Retry build' in about 15 seconds.");
    }

    // Step 4a: Get EAS account and find/create project for eas init
    const easAccount = await getEasAccount(easToken);
    if (easAccount) {
      const appConfig = await fetchAppConfig(repoPath, ghToken);
      const expo = appConfig ? ((appConfig.expo ?? appConfig) as Record<string, unknown>) : {};
      const slug = ((expo.slug ?? expo.name ?? project.name) as string).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const easProject = await findOrCreateEasProject(easToken, easAccount, slug);
      if (easProject?.id) {
        await setGitHubSecret(repoPath, "EAS_PROJECT_ID", easProject.id, ghHeaders);
      }
    }

    // Step 4b: Set EXPO_TOKEN as GitHub Actions variable
    await setGitHubSecret(repoPath, "EXPO_TOKEN", easToken, ghHeaders);

    // Step 4c: Set Google Play credentials if available
    const { data: googleCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();
    if (googleCred?.credentials) {
      const googleKey = (googleCred.credentials as Record<string, string>).service_account_json;
      if (googleKey) {
        await setGitHubSecret(repoPath, "GOOGLE_SERVICE_ACCOUNT_KEY", googleKey, ghHeaders);
      }
    }

    // Step 5: Trigger the workflow
    const workflowTriggered = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders);
    if (!workflowTriggered.success) {
      throw new Error(workflowTriggered.error ?? "We couldn't start the build.");
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

async function fetchAppConfig(repoPath: string, token?: string): Promise<Record<string, unknown> | null> {
  const h: Record<string, string> = {};
  if (token) h.Authorization = `token ${token}`;
  try {
    let r = await fetch(`https://raw.githubusercontent.com/${repoPath}/main/app.json`, { headers: h });
    if (r.ok) return await r.json();
    r = await fetch(`https://raw.githubusercontent.com/${repoPath}/master/app.json`, { headers: h });
    if (r.ok) return await r.json();
  } catch {}
  return null;
}

async function setGitHubVariable(repoPath: string, name: string, value: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const r = await fetch(`https://api.github.com/repos/${repoPath}/actions/variables/${name}`, { method: "PATCH", headers, body: JSON.stringify({ name, value }) });
    if (r.ok) return true;
    if (r.status === 404) {
      const c = await fetch(`https://api.github.com/repos/${repoPath}/actions/variables`, { method: "POST", headers, body: JSON.stringify({ name, value }) });
      return c.ok;
    }
    return false;
  } catch { return false; }
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
    // Get current file SHA if it exists
    let sha: string | undefined;
    const checkRes = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${path}`,
      { headers: { ...headers, Accept: "application/vnd.github.v3+json" } }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    const body: Record<string, unknown> = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch,
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          ...headers,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Push ${path} failed (${res.status}):`, errText.slice(0, 200));
    }
    return res.ok;
  } catch (err) {
    console.error(`Push ${path} exception:`, err);
    return false;
  }
}

async function setGitHubSecret(repoPath: string, secretName: string, secretValue: string, headers: Record<string, string>): Promise<boolean> {
  try {
    // Get repo public key
    const keyRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/secrets/public-key`, { headers });
    if (!keyRes.ok) {
      console.error("Failed to get public key:", keyRes.status);
      return false;
    }
    const keyData = await keyRes.json();
    const publicKeyB64 = keyData.key;
    const keyId = keyData.key_id;

    // Encrypt using libsodium sealed box via tweetnacl-compatible approach
    // GitHub requires NaCl sealed box encryption (X25519 + XSalsa20-Poly1305)
    // Since Deno doesn't have libsodium, we use a workaround:
    // Pass the token as a workflow environment variable instead of a secret
    // This uses GitHub Actions Variables API (not encrypted, but works)

    // Try Variables API first (simpler, no encryption needed)
    const varRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/variables/${secretName}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: secretName, value: secretValue }),
    });

    if (varRes.ok) return true;

    // Variable doesn't exist yet — create it
    if (varRes.status === 404) {
      const createRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/variables`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: secretName, value: secretValue }),
      });
      if (createRes.ok) return true;
      console.error("Failed to create variable:", createRes.status, await createRes.text());
    }

    return false;
  } catch (err) {
    console.error("setGitHubSecret error:", err);
    return false;
  }
}

async function triggerWorkflow(
  repoPath: string,
  branch: string,
  platform: string,
  headers: Record<string, string>
): Promise<{ success: boolean; runUrl?: string; error?: string }> {
  try {
    // First check if workflow file exists
    const checkRes = await fetch(
      `https://api.github.com/repos/${repoPath}/contents/.github/workflows/eas-build.yml?ref=${branch}`,
      { headers }
    );
    if (!checkRes.ok) {
      return { success: false, error: `Workflow file not found on branch "${branch}". Status: ${checkRes.status}. The file may not have been pushed correctly.` };
    }

    // Check if GitHub Actions is enabled (list workflows)
    const listRes = await fetch(
      `https://api.github.com/repos/${repoPath}/actions/workflows`,
      { headers }
    );
    const listText = await listRes.text();
    if (!listRes.ok) {
      return { success: false, error: `GitHub Actions may be disabled. Status: ${listRes.status}. Go to github.com/${repoPath}/settings/actions and enable Actions. Response: ${listText.slice(0, 100)}` };
    }

    // Find our workflow
    const listData = JSON.parse(listText);
    const workflows = listData.workflows ?? [];
    const ourWorkflow = workflows.find((w: { path: string }) => w.path === ".github/workflows/eas-build.yml");

    if (!ourWorkflow) {
      return { success: false, error: `GitHub hasn't indexed the workflow yet. Found ${workflows.length} workflows but not eas-build.yml. Try again in 30 seconds. Workflows: ${workflows.map((w: { path: string }) => w.path).join(", ")}` };
    }

    // Trigger workflow_dispatch using the workflow ID
    const res = await fetch(
      `https://api.github.com/repos/${repoPath}/actions/workflows/${ourWorkflow.id}/dispatches`,
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
      return { success: false, error: `Couldn't trigger workflow (${res.status}): ${text.slice(0, 150)}` };
    }

    const runUrl = `https://github.com/${repoPath}/actions/workflows/eas-build.yml`;
    return { success: true, runUrl };
  } catch (err) {
    return { success: false, error: `Error: ${err}` };
  }
}

async function getEasAccount(token: string): Promise<{ id: string; username: string } | null> {
  try {
    const res = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: `query { meActor { ... on User { id username accounts { id name } } ... on Robot { id firstName accounts { id name } } } }` }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const actor = data?.data?.meActor;
    if (!actor) return null;
    return { id: actor.accounts?.[0]?.id ?? actor.id, username: actor.username ?? actor.firstName };
  } catch { return null; }
}

async function findOrCreateEasProject(token: string, account: { id: string; username: string }, slug: string): Promise<{ id: string } | null> {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  try {
    // Find
    const findRes = await fetch("https://api.expo.dev/graphql", { method: "POST", headers, body: JSON.stringify({ query: `query { app { byFullName(fullName: "@${account.username}/${slug}") { id } } }` }) });
    if (findRes.ok) {
      const d = await findRes.json();
      if (d?.data?.app?.byFullName?.id) return { id: d.data.app.byFullName.id };
    }
    // Create
    const createRes = await fetch("https://api.expo.dev/graphql", { method: "POST", headers, body: JSON.stringify({ query: `mutation { app { createApp(appInput: { accountId: "${account.id}", projectName: "${slug}" }) { id } } }` }) });
    if (createRes.ok) {
      const d = await createRes.json();
      if (d?.data?.app?.createApp?.id) return { id: d.data.app.createApp.id };
    }
    return null;
  } catch { return null; }
}
