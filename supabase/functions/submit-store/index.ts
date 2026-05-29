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

interface SubmitRequest {
  submission_id: string;
}

interface SubmitResult {
  status: string; // maps to submissions.review_status (see useBuild.ReviewStatus)
  details: string;
  store_submission_id?: string;
  rejection_reason?: string;
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
    if (!authHeader) throw new Error("Unauthorized");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { submission_id } = (await req.json()) as SubmitRequest;

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*, projects(*)")
      .eq("id", submission_id)
      .single();
    if (subError || !submission) throw new Error("Submission not found");

    const project = submission.projects as Record<string, unknown>;
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    if (submission.build_status !== "completed") {
      throw new Error("Build must be completed before submitting to store");
    }

    const { data: listing } = await supabase
      .from("store_listings")
      .select("*")
      .eq("project_id", submission.project_id)
      .eq("platform", submission.platform)
      .single();

    const platform = submission.platform as string;

    let result: SubmitResult;

    if (platform === "ios") {
      result = {
        status: "pending_credentials",
        details: "iOS submission isn't supported yet — only Android (Google Play) is wired up end-to-end.",
        rejection_reason: "iOS submission is not available yet. Android publishing is supported today.",
      };
    } else {
      const { data: googleCred } = await supabase
        .from("user_credentials").select("credentials")
        .eq("user_id", user.id).eq("provider", "google").single();
      const { data: githubCred } = await supabase
        .from("user_credentials").select("credentials")
        .eq("user_id", user.id).eq("provider", "github").single();

      result = await submitToGooglePlay(
        submission,
        listing,
        googleCred?.credentials as Record<string, string> | undefined,
        githubCred?.credentials as Record<string, string> | undefined,
        project,
      );
    }

    await supabase
      .from("submissions")
      .update({
        review_status: result.status,
        store_submission_id: result.store_submission_id ?? null,
        rejection_reason: result.rejection_reason ?? null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (result.status === "waiting_for_review") {
      await supabase
        .from("projects")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("id", submission.project_id);
    }

    return new Response(
      JSON.stringify({ success: result.status === "waiting_for_review", status: result.status, details: result.details }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// ===== Google Play =====

async function submitToGooglePlay(
  submission: Record<string, unknown>,
  listing: Record<string, unknown> | null,
  googleCreds: Record<string, string> | undefined,
  githubCreds: Record<string, string> | undefined,
  project: Record<string, unknown>,
): Promise<SubmitResult> {
  const serviceAccountJson = googleCreds?.service_account_json ?? Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    return {
      status: "pending_credentials",
      details: "Google Play service account not configured.",
      rejection_reason: "Connect your Google Play service account in Settings before submitting.",
    };
  }

  const ghToken = githubCreds?.access_token;
  const repoUrl = project.repo_url as string | undefined;
  const repoPath = repoUrl ? extractGitHubPath(repoUrl) : null;
  if (!repoPath || !ghToken) {
    return {
      status: "pending_credentials",
      details: "Missing GitHub connection or repository.",
      rejection_reason: "Connect your GitHub account in Settings — we fetch the built app file from your repo.",
    };
  }

  // 1. Real package name, read straight from the repo (no guessing).
  const packageName = await detectPackageName(repoPath, ghToken);
  if (!packageName) {
    return {
      status: "pending_credentials",
      details: "Could not determine the app's package name.",
      rejection_reason: "We couldn't find your app's package name (e.g. in capacitor.config or app.json).",
    };
  }

  // 2. Fetch the built artifact (AAB preferred, APK fallback) from the latest successful build.
  let artifact: { bytes: Uint8Array; kind: "aab" | "apk" } | null;
  try {
    artifact = await fetchLatestAndroidArtifact(repoPath, ghToken);
  } catch (err) {
    return {
      status: "pending_credentials",
      details: `Failed to fetch build artifact: ${err instanceof Error ? err.message : "unknown"}`,
      rejection_reason: "We couldn't download your built app file from the last build. Try rebuilding.",
    };
  }
  if (!artifact) {
    return {
      status: "pending_credentials",
      details: "No build artifact found.",
      rejection_reason: "No finished build was found. Build the app first, then submit.",
    };
  }

  // 3. Google auth.
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(JSON.parse(serviceAccountJson));
  } catch (err) {
    return {
      status: "pending_credentials",
      details: `Google auth failed: ${err instanceof Error ? err.message : "unknown"}`,
      rejection_reason: "Your Google Play service account key looks invalid. Re-upload it in Settings.",
    };
  }

  const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}`;
  const upload = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}`;
  const authH = { Authorization: `Bearer ${accessToken}` };

  // 4. Open an edit.
  const editRes = await fetch(`${api}/edits`, { method: "POST", headers: { ...authH, "Content-Type": "application/json" }, body: "{}" });
  if (editRes.status === 404) {
    return {
      status: "pending_credentials",
      details: `Package ${packageName} not found in Play Console.`,
      rejection_reason: `The app "${packageName}" doesn't exist in Google Play Console yet. Create it there once (the first version can't be created via API), then submit again.`,
    };
  }
  if (editRes.status === 403) {
    const t = await editRes.text();
    return {
      status: "pending_credentials",
      details: `Play API access denied: ${t.slice(0, 200)}`,
      rejection_reason: "The service account doesn't have access to this app. Invite it in Play Console → Users & permissions and enable the Play Developer API.",
    };
  }
  if (!editRes.ok) {
    const t = await editRes.text();
    return { status: "pending_credentials", details: `Could not open edit: ${t.slice(0, 200)}`, rejection_reason: "Couldn't start a Play release. Check your service account permissions." };
  }
  const editId = (await editRes.json()).id as string;

  // 5. Upload the binary.
  let versionCode: number;
  try {
    if (artifact.kind === "aab") {
      const r = await fetch(`${upload}/edits/${editId}/bundles?uploadType=media`, {
        method: "POST", headers: { ...authH, "Content-Type": "application/octet-stream" }, body: artifact.bytes,
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 300));
      versionCode = (await r.json()).versionCode as number;
    } else {
      const r = await fetch(`${upload}/edits/${editId}/apks?uploadType=media`, {
        method: "POST", headers: { ...authH, "Content-Type": "application/vnd.android.package-archive" }, body: artifact.bytes,
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 300));
      versionCode = (await r.json()).versionCode as number;
    }
  } catch (err) {
    await deleteEdit(api, editId, authH);
    const msg = err instanceof Error ? err.message : "upload failed";
    return { status: "pending_credentials", details: `Upload failed: ${msg}`, rejection_reason: `Play rejected the upload: ${msg}` };
  }

  // 6. Best-effort listing metadata update (non-fatal).
  if (listing) {
    try {
      await fetch(`${api}/edits/${editId}/listings/en-US`, {
        method: "PUT", headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "en-US",
          title: (listing.app_name as string) ?? "",
          shortDescription: (listing.short_description as string) ?? "",
          fullDescription: (listing.full_description as string) ?? "",
        }),
      });
    } catch { /* non-fatal */ }
  }

  // 7. Assign the new version to the internal testing track.
  const trackRes = await fetch(`${api}/edits/${editId}/tracks/internal`, {
    method: "PUT", headers: { ...authH, "Content-Type": "application/json" },
    body: JSON.stringify({ track: "internal", releases: [{ status: "completed", versionCodes: [String(versionCode)] }] }),
  });
  if (!trackRes.ok) {
    const t = await trackRes.text();
    await deleteEdit(api, editId, authH);
    return { status: "pending_credentials", details: `Track assignment failed: ${t.slice(0, 200)}`, rejection_reason: `Couldn't assign the build to the internal track: ${t.slice(0, 200)}` };
  }

  // 8. Commit the edit (publishes to internal testers; no Google review needed for internal track).
  const commitRes = await fetch(`${api}/edits/${editId}:commit`, { method: "POST", headers: authH });
  if (!commitRes.ok) {
    const t = await commitRes.text();
    return { status: "pending_credentials", details: `Commit failed: ${t.slice(0, 200)}`, rejection_reason: `Couldn't finalize the release: ${t.slice(0, 200)}` };
  }

  return {
    status: "waiting_for_review",
    details: `Uploaded version code ${versionCode} to the internal testing track for ${packageName}.`,
    store_submission_id: packageName,
  };
}

async function deleteEdit(api: string, editId: string, authH: Record<string, string>) {
  try { await fetch(`${api}/edits/${editId}`, { method: "DELETE", headers: authH }); } catch { /* ignore */ }
}

// ===== Repo helpers (GitHub) =====

function extractGitHubPath(url: string): string | null {
  try {
    const p = new URL(url).pathname.split("/").filter(Boolean);
    return p.length < 2 ? null : `${p[0]}/${p[1]!.replace(/\.git$/, "")}`;
  } catch { return null; }
}

async function ghRaw(repoPath: string, branch: string, file: string, token: string): Promise<string | null> {
  const r = await fetch(`https://raw.githubusercontent.com/${repoPath}/${branch}/${file}`, { headers: { Authorization: `token ${token}` } });
  return r.ok ? await r.text() : null;
}

async function detectPackageName(repoPath: string, token: string): Promise<string | null> {
  const ghH = { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "shippabel" };
  let branch = "main";
  try {
    const r = await fetch(`https://api.github.com/repos/${repoPath}`, { headers: ghH });
    if (r.ok) branch = (await r.json()).default_branch ?? "main";
  } catch { /* default main */ }

  // Capacitor: appId: 'com.x.y'
  for (const f of ["capacitor.config.ts", "capacitor.config.json"]) {
    const c = await ghRaw(repoPath, branch, f, token);
    const m = c?.match(/appId\s*[:=]\s*['"]([^'"]+)['"]/);
    if (m) return m[1];
  }
  // Expo: app.json -> expo.android.package | android.package
  const appJson = await ghRaw(repoPath, branch, "app.json", token);
  if (appJson) {
    try {
      const j = JSON.parse(appJson);
      const pkg = j?.expo?.android?.package ?? j?.android?.package;
      if (pkg) return pkg as string;
    } catch { /* ignore */ }
  }
  // Android gradle: applicationId "com.x.y"
  const gradle = await ghRaw(repoPath, branch, "android/app/build.gradle", token);
  const gm = gradle?.match(/applicationId\s+['"]([^'"]+)['"]/);
  if (gm) return gm[1];

  return null;
}

async function fetchLatestAndroidArtifact(repoPath: string, token: string): Promise<{ bytes: Uint8Array; kind: "aab" | "apk" } | null> {
  const ghH = { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "shippabel" };

  const runsRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/runs?status=success&per_page=20`, { headers: ghH });
  if (!runsRes.ok) throw new Error(`runs list ${runsRes.status}`);
  const runs = (await runsRes.json()).workflow_runs as Array<{ id: number }>;

  for (const run of runs) {
    const artsRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/runs/${run.id}/artifacts`, { headers: ghH });
    if (!artsRes.ok) continue;
    const arts = (await artsRes.json()).artifacts as Array<{ id: number; name: string; expired: boolean }>;
    const usable = arts.filter((a) => !a.expired);
    // Prefer an artifact that looks like an AAB, then anything.
    const ordered = [
      ...usable.filter((a) => /aab/i.test(a.name)),
      ...usable.filter((a) => !/aab/i.test(a.name)),
    ];
    for (const art of ordered) {
      const found = await extractAndroidBinaryFromArtifact(repoPath, art.id, token);
      if (found) return found;
    }
  }
  return null;
}

async function extractAndroidBinaryFromArtifact(repoPath: string, artifactId: number, token: string): Promise<{ bytes: Uint8Array; kind: "aab" | "apk" } | null> {
  const zipRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/artifacts/${artifactId}/zip`, {
    headers: { Authorization: `token ${token}`, "User-Agent": "shippabel" },
  });
  if (!zipRes.ok) return null;
  const data = new Uint8Array(await zipRes.arrayBuffer());

  // Minimal ZIP reader (dependency-free): walk the central directory, inflate with DecompressionStream.
  const u16 = (o: number) => data[o] | (data[o + 1] << 8);
  const u32 = (o: number) => (data[o] | (data[o + 1] << 8) | (data[o + 2] << 16) | data[o + 3] * 0x1000000) >>> 0;

  let eocd = -1;
  for (let i = data.length - 22; i >= 0 && i >= data.length - 22 - 0x10000; i--) {
    if (u32(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = u16(eocd + 10);
  let p = u32(eocd + 16);

  type Entry = { name: string; method: number; compSize: number; lho: number };
  const entries: Entry[] = [];
  for (let n = 0; n < count; n++) {
    if (u32(p) !== 0x02014b50) break;
    const method = u16(p + 10);
    const compSize = u32(p + 20);
    const nameLen = u16(p + 28);
    const extraLen = u16(p + 30);
    const commentLen = u16(p + 32);
    const lho = u32(p + 42);
    const name = new TextDecoder().decode(data.subarray(p + 46, p + 46 + nameLen));
    entries.push({ name, method, compSize, lho });
    p += 46 + nameLen + extraLen + commentLen;
  }

  const aab = entries.find((e) => e.name.toLowerCase().endsWith(".aab"));
  const apk = entries.find((e) => e.name.toLowerCase().endsWith(".apk"));
  const target = aab ?? apk;
  if (!target) return null;

  if (u32(target.lho) !== 0x04034b50) return null;
  const lNameLen = u16(target.lho + 26);
  const lExtraLen = u16(target.lho + 28);
  const start = target.lho + 30 + lNameLen + lExtraLen;
  const comp = data.subarray(start, start + target.compSize);

  let bytes: Uint8Array;
  if (target.method === 0) {
    bytes = comp;
  } else if (target.method === 8) {
    const stream = new Blob([comp]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  } else {
    return null;
  }
  return { bytes, kind: aab ? "aab" : "apk" };
}

// ===== Google auth =====

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signingInput = `${header}.${payload}`;

  const pem = serviceAccount.private_key.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${b64url(new Uint8Array(sig))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error_description ?? "no access token");
  return tokenData.access_token as string;
}

function b64url(input: string | Uint8Array): string {
  const str = typeof input === "string" ? btoa(input) : btoa(String.fromCharCode(...input));
  return str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
