import { instrument } from "../_shared/monitoring.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptCreds } from "../_shared/crypto.ts";
import { projectCallbackToken } from "../_shared/callback.ts";
import { setGitHubSecret } from "../_shared/githubSecrets.ts";

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
      project_id:
        required: true
        type: string
      submission_id:
        required: true
        type: string
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
          java-version: 21
      - name: Install dependencies
        run: npm install
      - name: Build web app
        run: npm run build
      - name: Prepare Android project
        run: |
          if [ ! -d android ]; then npx cap add android; fi
          npx cap sync android
      - name: Decode signing keystore
        env:
          KS_B64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          if [ -n "$KS_B64" ]; then echo "$KS_B64" | base64 -d > "$RUNNER_TEMP/upload.jks"; fi
      - name: Build Android
        env:
          KS_PW: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KS_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
        run: |
          cd android
          chmod +x gradlew
          if [ -f "$RUNNER_TEMP/upload.jks" ]; then
            ./gradlew assembleRelease bundleRelease \\
              -Pandroid.injected.signing.store.file="$RUNNER_TEMP/upload.jks" \\
              -Pandroid.injected.signing.store.password="$KS_PW" \\
              -Pandroid.injected.signing.key.alias="$KS_ALIAS" \\
              -Pandroid.injected.signing.key.password="$KS_PW"
          else
            echo "Configure the Android upload signing key before building for Google Play."
            exit 1
          fi
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release-apk
          path: android/app/build/outputs/apk/release/*.apk
      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: app-release-aab
          path: android/app/build/outputs/bundle/release/*.aab
      - name: Notify Shippabel
        if: always()
        run: |
          STATUS=\${{ job.status }}
          curl --fail-with-body --retry 3 --retry-all-errors -sS -X POST "https://fpqjxkilatlcihunfxpb.supabase.co/functions/v1/build-complete" \\
            -H "Content-Type: application/json" \\
            -H "x-callback-secret: \${{ secrets.SHIPPABEL_CALLBACK_SECRET }}" \\
            -d "{\\\"project_id\\\": \\\"\${{ inputs.project_id }}\\\", \\\"submission_id\\\": \\\"\${{ inputs.submission_id }}\\\", \\\"run_id\\\": \\\"\${{ github.run_id }}\\\", \\\"status\\\": \\\"$STATUS\\\"}"
`;

// EAS/Expo workflow — for React Native/Expo apps
const EAS_WORKFLOW = `name: EAS Build
on:
  workflow_dispatch:
    inputs:
      project_id:
        required: true
        type: string
      submission_id:
        required: true
        type: string
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
          token: \${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm install
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
      - name: Initialize EAS project
        run: eas init --id \${{ vars.EAS_PROJECT_ID }} --non-interactive
      - name: Build
        env:
          EAS_NO_VCS: "1"
        run: |
          eas build --platform android --non-interactive --profile production --wait --json > build-result.json
          node -e 'const fs=require("fs");const result=JSON.parse(fs.readFileSync("build-result.json","utf8"));const build=Array.isArray(result)?result[0]:result;if(!build.artifacts?.buildUrl)process.exit(1);fs.writeFileSync("build-url.txt",build.artifacts.buildUrl)'
          curl --fail --location "$(cat build-url.txt)" --output ./build.aab
      - name: Upload build artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: app-\${{ inputs.platform }}
          path: ./build.aab
      - name: Notify Shippabel
        if: always()
        run: |
          STATUS=\${{ job.status }}
          curl --fail-with-body --retry 3 --retry-all-errors -sS -X POST "https://fpqjxkilatlcihunfxpb.supabase.co/functions/v1/build-complete" \\
            -H "Content-Type: application/json" \\
            -H "x-callback-secret: \${{ secrets.SHIPPABEL_CALLBACK_SECRET }}" \\
            -d "{\\\"project_id\\\": \\\"\${{ inputs.project_id }}\\\", \\\"submission_id\\\": \\\"\${{ inputs.submission_id }}\\\", \\\"run_id\\\": \\\"\${{ github.run_id }}\\\", \\\"status\\\": \\\"$STATUS\\\"}"
`;

Deno.serve(instrument("trigger-build", async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Please sign in.");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Please sign in.");

    const plan = (user.app_metadata as Record<string, unknown> | undefined)?.plan;
    if (plan !== "ship" && plan !== "unlimited") {
      return new Response(
        JSON.stringify({ error: "This feature requires the Ship plan." }),
        { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Get GitHub token
    const { data: ghCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "github").single();
    const ghCreds = await decryptCreds(ghCred?.credentials as Record<string, unknown> | undefined, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
    const ghToken = ghCreds.access_token;
    if (!ghToken) throw new Error("Connect your GitHub account first.");

    const { project_id, platform } = (await req.json()) as BuildRequest;
    if (platform !== "android") throw new Error("Only Android builds are currently supported.");
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
      if (!await pushFile(repoPath, workflowFile, CAPACITOR_WORKFLOW, hasWorkflow ? "Update Capacitor workflow" : "Add Capacitor workflow", ghHeaders, defaultBranch)) throw new Error("Could not update the build workflow.");
      if (!hasWorkflow) throw new Error("We just added the build workflow. Please click Retry in 15 seconds.");

      // Set project ID (public) + per-project callback token (secret) for the callback
      await setGitHubVariable(repoPath, "SHIPPABEL_PROJECT_ID", project_id, ghHeaders);
      const capToken = await projectCallbackToken(Deno.env.get("BUILD_CALLBACK_SECRET") ?? "", project_id);
      if (!await setGitHubSecret(repoPath, "SHIPPABEL_CALLBACK_SECRET", capToken, ghHeaders))
        throw new Error("Couldn't configure the build callback. Check that your GitHub token has repo access.");
      // Clean up the plaintext variable older builds wrote
      await deleteGitHubVariable(repoPath, "SHIPPABEL_CALLBACK_SECRET", ghHeaders);

      // Trigger Capacitor workflow
      const { data: submissionId, error: startError } = await supabase.rpc("start_build", { p_project_id: project_id, p_platform: platform });
      if (startError || !submissionId) throw new Error(startError?.message ?? "Could not save the build.");
      const wt = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders, "capacitor-build.yml", project_id, submissionId);
      if (!wt.success) {
        await supabase.rpc("complete_build", { p_project_id: project_id, p_submission_id: submissionId, p_status: "failure", p_run_id: null });
        throw new Error(wt.error ?? "Could not start the build.");
      }
      await supabase.from("submissions").update({ eas_build_id: wt.runUrl }).eq("id", submissionId);

      return new Response(JSON.stringify({ success: true, submission_id: submissionId, workflow_url: wt.runUrl }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });

    } else {
      // ===== EXPO/EAS BUILD =====
      // Get EAS token
      let easToken = Deno.env.get("EAS_ACCESS_TOKEN") ?? "";
      const { data: easCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "eas").single();
      if (easCred?.credentials) {
        const easCreds = await decryptCreds(easCred.credentials as Record<string, unknown>, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
        easToken = easCreds.access_token ?? easToken;
      }
      if (!easToken) throw new Error("Connect your Expo account in Settings.");

      if (!await checkFileExists(repoPath, "app.json", ghHeaders, defaultBranch))
        throw new Error("Your app needs to be converted first.");

      // Preserve existing EAS configuration, but production Android must be an AAB.
      const easResponse = await fetch(`https://api.github.com/repos/${repoPath}/contents/eas.json?ref=${encodeURIComponent(defaultBranch)}`, {
        headers: { ...ghHeaders, Accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(15000),
      });
      if (!easResponse.ok && easResponse.status !== 404) throw new Error("Could not read the EAS build configuration.");
      const easConfig = easResponse.ok ? await easResponse.json() : {};
      easConfig.build ??= {};
      easConfig.build.production ??= {};
      easConfig.build.production.android = { ...easConfig.build.production.android, buildType: "app-bundle" };
      easConfig.build.production.distribution = "store";
      if (!await pushFile(repoPath, "eas.json", JSON.stringify(easConfig, null, 2), "Configure Google Play app bundle", ghHeaders, defaultBranch)) throw new Error("Could not save the EAS build configuration.");

      // Ensure workflow
      const workflowFile = ".github/workflows/eas-build.yml";
      const hasWorkflow = await checkFileExists(repoPath, workflowFile, ghHeaders, defaultBranch);
      if (!await pushFile(repoPath, workflowFile, EAS_WORKFLOW, hasWorkflow ? "Update EAS workflow" : "Add EAS workflow", ghHeaders, defaultBranch)) throw new Error("Could not update the build workflow.");
      if (!hasWorkflow) throw new Error("We just added the build workflow. Please click Retry in 15 seconds.");

      // Setup EAS project
      const easAccount = await getEasAccount(easToken);
      if (easAccount) {
        const appConfig = await fetchAppConfig(repoPath, ghToken, defaultBranch);
        const expo = appConfig ? ((appConfig.expo ?? appConfig) as Record<string, unknown>) : {};
        const slug = ((expo.slug ?? expo.name ?? project.name) as string).toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const easProject = await findOrCreateEasProject(easToken, easAccount, slug);
        if (easProject?.id) await setGitHubVariable(repoPath, "EAS_PROJECT_ID", easProject.id, ghHeaders);
      }
      // Tokens are sensitive — store them as encrypted Actions secrets, never as
      // plaintext variables (variables are readable by any repo collaborator).
      if (!await setGitHubSecret(repoPath, "EXPO_TOKEN", easToken, ghHeaders))
        throw new Error("Couldn't store your Expo token securely in the repo. Check that your GitHub token has repo access.");

      // Google credentials
      const { data: googleCred } = await supabase.from("user_credentials").select("credentials").eq("user_id", user.id).eq("provider", "google").single();
      if (googleCred?.credentials) {
        const googleCreds = await decryptCreds(googleCred.credentials as Record<string, unknown>, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
        const gKey = googleCreds.service_account_json;
        if (gKey) await setGitHubSecret(repoPath, "GOOGLE_SERVICE_ACCOUNT_KEY", gKey, ghHeaders);
      }

      // Set project ID (public) + per-project callback token (secret) for the callback
      await setGitHubVariable(repoPath, "SHIPPABEL_PROJECT_ID", project_id, ghHeaders);
      const easCallbackToken = await projectCallbackToken(Deno.env.get("BUILD_CALLBACK_SECRET") ?? "", project_id);
      if (!await setGitHubSecret(repoPath, "SHIPPABEL_CALLBACK_SECRET", easCallbackToken, ghHeaders))
        throw new Error("Couldn't configure the build callback. Check that your GitHub token has repo access.");
      // Clean up plaintext variables older builds wrote
      await deleteGitHubVariable(repoPath, "SHIPPABEL_CALLBACK_SECRET", ghHeaders);
      await deleteGitHubVariable(repoPath, "EXPO_TOKEN", ghHeaders);
      await deleteGitHubVariable(repoPath, "GOOGLE_SERVICE_ACCOUNT_KEY", ghHeaders);

      // Trigger EAS workflow
      const { data: submissionId, error: startError } = await supabase.rpc("start_build", { p_project_id: project_id, p_platform: platform });
      if (startError || !submissionId) throw new Error(startError?.message ?? "Could not save the build.");
      const wt = await triggerWorkflow(repoPath, defaultBranch, platform, ghHeaders, "eas-build.yml", project_id, submissionId);
      if (!wt.success) {
        await supabase.rpc("complete_build", { p_project_id: project_id, p_submission_id: submissionId, p_status: "failure", p_run_id: null });
        throw new Error(wt.error ?? "Could not start the build.");
      }
      await supabase.from("submissions").update({ eas_build_id: wt.runUrl }).eq("id", submissionId);

      return new Response(JSON.stringify({ success: true, submission_id: submissionId, workflow_url: wt.runUrl }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
}));

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
    return (await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}?ref=${encodeURIComponent(branch)}`, { headers })).ok;
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

async function fetchAppConfig(repoPath: string, token: string, branch: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/app.json?ref=${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json" }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Could not read app.json from your default branch.");
  return await response.json();
}

// Remove legacy plaintext Actions variables that older builds may have written.
async function deleteGitHubVariable(repoPath: string, name: string, headers: Record<string, string>): Promise<void> {
  try {
    await fetch(`https://api.github.com/repos/${repoPath}/actions/variables/${name}`, { method: "DELETE", headers });
  } catch { /* best effort */ }
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

async function triggerWorkflow(repoPath: string, branch: string, platform: string, headers: Record<string, string>, workflowFile: string, projectId: string, submissionId: string): Promise<{ success: boolean; runUrl?: string; error?: string }> {
  try {
    if (!(await fetch(`https://api.github.com/repos/${repoPath}/contents/.github/workflows/${workflowFile}?ref=${encodeURIComponent(branch)}`, { headers })).ok)
      return { success: false, error: "Workflow file not found." };
    const lr = await fetch(`https://api.github.com/repos/${repoPath}/actions/workflows`, { headers });
    if (!lr.ok) return { success: false, error: "GitHub Actions may be disabled." };
    const wfs = (await lr.json()).workflows ?? [];
    const ow = wfs.find((w: { path: string }) => w.path === `.github/workflows/${workflowFile}`);
    if (!ow) return { success: false, error: "Workflow not indexed yet. Try again in 30 seconds." };
    const res = await fetch(`https://api.github.com/repos/${repoPath}/actions/workflows/${ow.id}/dispatches`, {
      method: "POST", headers, body: JSON.stringify({ ref: branch, inputs: { platform, project_id: projectId, submission_id: submissionId } }),
    });
    if (!res.ok) return { success: false, error: `Trigger failed (${res.status})` };
    return { success: true, runUrl: `https://github.com/${repoPath}/actions` };
  } catch (err) { return { success: false, error: `${err}` }; }
}
