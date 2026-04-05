import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://shippabel.com", "https://www.shippabel.com", "http://localhost:5173"];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
}

interface BuildRequest { project_id: string; platform: "ios" | "android"; }

// Capacitor workflow — for web apps wrapped with Capacitor
const CAPACITOR_WORKFLOW = `name: Capacitor Build
on:
  workflow_dispatch:
    inputs:
      platform:
        description: Platform
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
          node-version: 22
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - name: Install dependencies
        run: npm install
      - name: Build web app
        run: npm run build
      - name: Sync Capacitor
        run: npx cap sync android
      - name: Build Android APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleRelease
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/*.apk
`;

// EAS/Expo workflow — for React Native/Expo apps
const EAS_WORKFLOW = `name: EAS Build
on:
  workflow_dispatch:
    inputs:
      platform:
        description: Platform
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
          rm -f package-lock.json yarn.lock pnpm-lock.yaml
          npx expo install --fix || true
          mkdir -p assets
          PH='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          for f in icon.png adaptive-icon.png splash.png splash-icon.png favicon.png; do [ ! -f "./assets/$f" ] && echo "$PH" | base64 -d > "./assets/$f"; done
      - name: Build
        env:
          EAS_NO_VCS: "1"
        run: |
          npx expo prebuild --platform \${{ inputs.platform }} --no-install --clean
          cd android && chmod +x gradlew && cd ..
          EAS_NO_VCS=1 eas build --platform \${{ inputs.platform }} --non-interactive --profile production --local --output ./build.apk
      - name: Upload build artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: app-\${{ inputs.platform }}
          path: ./build.apk
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in.");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Please sign in.");

    // Get GitHub token
    const { data: ghCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "github").single();
    const ghToken = (ghCred?.credentials as Record<string, string> | undefined)?.access_token;
    if (!ghToken) throw new Error("Connect your GitHub account first.");

    const { project_id, platform } = (await req.json()) as BuildRequest;
    const { data: project } = await supabase.from("projects").select("*").eq("id", project_id).eq("user_id", user.id).single();
    if (!project) throw new Error("App not found.");
    if (!project.repo_url) throw new Error("No GitHub link.");

    const repoPath = extractGitHubPath(project.repo_url);
    if (!repoPath) throw new Error("Bad GitHub link.");
    const ghHeaders = { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };
    const defaultBranch = await getDefaultBranch(repoPath, ghHeaders);

    // Detect app type: Capacitor or Expo
    const isCapacitor = await checkFileExists(repoPath, "capacitor.config.ts", ghHeaders, defaultBranch)
      || await checkFileExists(repoPath, "capacitor.config.json", ghHeaders, defaultBranch);

    if (isCapacitor) {
      // ===== CAPACITOR BUILD =====
      const workflowFile = ".github/workflows/capacitor-build.yml";
      const hasWorkflow = await checkFileExists(repoPath, workflowFile, ghHeaders, defaultBranch);
      await pushFile(repoPath, workflowFile, CAPACITOR_WORKFLOW, hasWorkflow ? "Update Capacitor workflow" : "Add Capacitor workflow", ghHeaders, defaultBranch);
      if (!hasWorkflow) throw new Error("We just added the build workflow. Please click Retry in 15 seconds.");

      // Trigger Capacitor workflow
      const wt = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders, "capacitor-build.yml");
      if (!wt.success) throw new Error(wt.error ?? "Couldn't start build.");

      const { data: submission } = await supabase.from("submissions").insert({
        project_id, platform, build_status: "in_progress", review_status: "not_submitted", eas_build_id: wt.runUrl ?? "",
      }).select().single();
      if (!submission) throw new Error("Save failed.");
      await supabase.from("projects").update({ status: "building", updated_at: new Date().toISOString() }).eq("id", project_id);

      return new Response(JSON.stringify({ success: true, submission_id: submission.id, workflow_url: wt.runUrl }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });

    } else {
      // ===== EXPO/EAS BUILD =====
      // Get EAS token
      let easToken = Deno.env.get("EAS_ACCESS_TOKEN") ?? "";
      const { data: easCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "eas").single();
      if (easCred?.credentials) easToken = (easCred.credentials as Record<string, string>).access_token ?? easToken;
      if (!easToken) throw new Error("Connect your Expo account in Settings.");

      if (!await checkFileExists(repoPath, "app.json", ghHeaders, defaultBranch))
        throw new Error("Your app needs to be converted first.");

      // Ensure eas.json
      if (!await checkFileExists(repoPath, "eas.json", ghHeaders, defaultBranch)) {
        await pushFile(repoPath, "eas.json", JSON.stringify({
          cli: { version: ">= 3.0.0" },
          build: { production: { android: { buildType: "apk" }, ios: { simulator: false } } },
          submit: { production: {} },
        }, null, 2), "Add eas.json", ghHeaders, defaultBranch);
      }

      // Ensure workflow
      const workflowFile = ".github/workflows/eas-build.yml";
      const hasWorkflow = await checkFileExists(repoPath, workflowFile, ghHeaders, defaultBranch);
      await pushFile(repoPath, workflowFile, EAS_WORKFLOW, hasWorkflow ? "Update EAS workflow" : "Add EAS workflow", ghHeaders, defaultBranch);
      if (!hasWorkflow) throw new Error("We just added the build workflow. Please click Retry in 15 seconds.");

      // Setup EAS project
      const easAccount = await getEasAccount(easToken);
      if (easAccount) {
        const appConfig = await fetchAppConfig(repoPath, ghToken);
        const expo = appConfig ? ((appConfig.expo ?? appConfig) as Record<string, unknown>) : {};
        const slug = ((expo.slug ?? expo.name ?? project.name) as string).toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const easProject = await findOrCreateEasProject(easToken, easAccount, slug);
        if (easProject?.id) await setGitHubVariable(repoPath, "EAS_PROJECT_ID", easProject.id, ghHeaders);
      }
      await setGitHubVariable(repoPath, "EXPO_TOKEN", easToken, ghHeaders);

      // Google credentials
      const { data: googleCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "google").single();
      if (googleCred?.credentials) {
        const gKey = (googleCred.credentials as Record<string, string>).service_account_json;
        if (gKey) await setGitHubVariable(repoPath, "GOOGLE_SERVICE_ACCOUNT_KEY", gKey, ghHeaders);
      }

      // Trigger EAS workflow
      const wt = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders, "eas-build.yml");
      if (!wt.success) throw new Error(wt.error ?? "Couldn't start build.");

      const { data: submission } = await supabase.from("submissions").insert({
        project_id, platform, build_status: "in_progress", review_status: "not_submitted", eas_build_id: wt.runUrl ?? "",
      }).select().single();
      if (!submission) throw new Error("Save failed.");
      await supabase.from("projects").update({ status: "building", updated_at: new Date().toISOString() }).eq("id", project_id);

      return new Response(JSON.stringify({ success: true, submission_id: submission.id, workflow_url: wt.runUrl }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

// --- Helpers ---

function extractGitHubPath(url: string): string | null {
  try {
    const p = new URL(url).pathname.split("/").filter(Boolean);
    return p.length < 2 ? null : `${p[0]}/${p[1]!.replace(/\.git$/, "")}`;
  } catch { return null; }
}

async function getDefaultBranch(repoPath: string, headers: Record<string, string>): Promise<string> {
  try {
    const r = await fetch(`https://api.github.com/repos/${repoPath}`, { headers });
    if (r.ok) return (await r.json()).default_branch ?? "main";
  } catch {}
  return "main";
}

async function checkFileExists(repoPath: string, path: string, headers: Record<string, string>, branch: string): Promise<boolean> {
  try {
    return (await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}?ref=${branch}`, { headers })).ok;
  } catch { return false; }
}

async function pushFile(repoPath: string, path: string, content: string, message: string, headers: Record<string, string>, branch: string): Promise<boolean> {
  try {
    let sha: string | undefined;
    const cr = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, { headers: { ...headers, Accept: "application/vnd.github.v3+json" } });
    if (cr.ok) sha = (await cr.json()).sha;
    const body: Record<string, unknown> = { message, content: btoa(unescape(encodeURIComponent(content))), branch };
    if (sha) body.sha = sha;
    return (await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, {
      method: "PUT", headers: { ...headers, Accept: "application/vnd.github.v3+json" }, body: JSON.stringify(body),
    })).ok;
  } catch { return false; }
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
    const r = await fetch(`https://api.github.com/repos/${repoPath}/actions/variables/${name}`, {
      method: "PATCH", headers, body: JSON.stringify({ name, value }),
    });
    if (r.ok) return true;
    if (r.status === 404) {
      return (await fetch(`https://api.github.com/repos/${repoPath}/actions/variables`, {
        method: "POST", headers, body: JSON.stringify({ name, value }),
      })).ok;
    }
    return false;
  } catch { return false; }
}

async function getEasAccount(token: string): Promise<{ id: string; username: string } | null> {
  try {
    const r = await fetch("https://api.expo.dev/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: `query { meActor { ... on User { id username accounts { id name } } ... on Robot { id firstName accounts { id name } } } }` }),
    });
    if (!r.ok) return null;
    const a = (await r.json())?.data?.meActor;
    return a ? { id: a.accounts?.[0]?.id ?? a.id, username: a.username ?? a.firstName } : null;
  } catch { return null; }
}

async function findOrCreateEasProject(token: string, account: { id: string; username: string }, slug: string): Promise<{ id: string } | null> {
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  try {
    const fr = await fetch("https://api.expo.dev/graphql", { method: "POST", headers: h, body: JSON.stringify({ query: `query { app { byFullName(fullName: "@${account.username}/${slug}") { id } } }` }) });
    if (fr.ok) { const d = await fr.json(); if (d?.data?.app?.byFullName?.id) return { id: d.data.app.byFullName.id }; }
    const cr = await fetch("https://api.expo.dev/graphql", { method: "POST", headers: h, body: JSON.stringify({ query: `mutation { app { createApp(appInput: { accountId: "${account.id}", projectName: "${slug}" }) { id } } }` }) });
    if (cr.ok) { const d = await cr.json(); if (d?.data?.app?.createApp?.id) return { id: d.data.app.createApp.id }; }
    return null;
  } catch { return null; }
}

async function triggerWorkflow(repoPath: string, branch: string, platform: string, headers: Record<string, string>, workflowFile: string): Promise<{ success: boolean; runUrl?: string; error?: string }> {
  try {
    if (!(await fetch(`https://api.github.com/repos/${repoPath}/contents/.github/workflows/${workflowFile}?ref=${branch}`, { headers })).ok)
      return { success: false, error: "Workflow file not found." };
    const lr = await fetch(`https://api.github.com/repos/${repoPath}/actions/workflows`, { headers });
    if (!lr.ok) return { success: false, error: "GitHub Actions may be disabled." };
    const wfs = (await lr.json()).workflows ?? [];
    const ow = wfs.find((w: { path: string }) => w.path === `.github/workflows/${workflowFile}`);
    if (!ow) return { success: false, error: "Workflow not indexed yet. Try again in 30 seconds." };
    const res = await fetch(`https://api.github.com/repos/${repoPath}/actions/workflows/${ow.id}/dispatches`, {
      method: "POST", headers, body: JSON.stringify({ ref: branch, inputs: { platform } }),
    });
    if (!res.ok) return { success: false, error: `Trigger failed (${res.status})` };
    return { success: true, runUrl: `https://github.com/${repoPath}/actions` };
  } catch (err) { return { success: false, error: `${err}` }; }
}
