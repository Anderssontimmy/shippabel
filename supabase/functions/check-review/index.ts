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

interface CheckRequest {
  submission_id: string;
}

interface StatusResult {
  build_status: string;
  review_status: string;
  eas_build_url?: string;
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { submission_id } = (await req.json()) as CheckRequest;

    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*, projects(*)")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) throw new Error("Submission not found");

    const project = submission.projects as Record<string, unknown>;
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    const result: StatusResult = {
      build_status: submission.build_status,
      review_status: submission.review_status,
    };

    // Check EAS build status if build is in progress
    if (submission.build_status === "in_progress" && submission.eas_build_id) {
      const easStatus = await checkEasBuildStatus(submission.eas_build_id);

      if (easStatus !== submission.build_status) {
        result.build_status = easStatus;

        await supabase
          .from("submissions")
          .update({ build_status: easStatus })
          .eq("id", submission_id);

        // Update project status when build completes
        if (easStatus === "completed") {
          await supabase
            .from("projects")
            .update({ status: "ready", updated_at: new Date().toISOString() })
            .eq("id", submission.project_id);
        } else if (easStatus === "failed") {
          await supabase
            .from("projects")
            .update({ status: "issues_found", updated_at: new Date().toISOString() })
            .eq("id", submission.project_id);
        }
      }

      result.eas_build_url = `https://expo.dev/builds/${submission.eas_build_id}`;
    }

    // Check store review status if submitted
    if (submission.review_status === "waiting_for_review" || submission.review_status === "in_review") {
      const platform = submission.platform as string;
      const provider = platform === "ios" ? "apple" : "google";

      const { data: cred } = await supabase
        .from("user_credentials")
        .select("credentials")
        .eq("user_id", user.id)
        .eq("provider", provider)
        .single();

      const credentials = cred?.credentials as Record<string, string> | undefined;

      if (credentials) {
        const reviewStatus = platform === "ios"
          ? await checkAppStoreReview(credentials, submission.store_submission_id)
          : await checkGooglePlayReview(credentials, submission.store_submission_id);

        if (reviewStatus && reviewStatus.status !== submission.review_status) {
          result.review_status = reviewStatus.status;

          const updateData: Record<string, unknown> = {
            review_status: reviewStatus.status,
          };
          if (reviewStatus.rejection_reason) {
            updateData.rejection_reason = reviewStatus.rejection_reason;
            result.rejection_reason = reviewStatus.rejection_reason;
          }
          if (reviewStatus.status === "approved") {
            updateData.reviewed_at = new Date().toISOString();
          }

          await supabase
            .from("submissions")
            .update(updateData)
            .eq("id", submission_id);

          // Update project status
          if (reviewStatus.status === "approved") {
            await supabase
              .from("projects")
              .update({ status: "live", updated_at: new Date().toISOString() })
              .eq("id", submission.project_id);
          } else if (reviewStatus.status === "rejected") {
            await supabase
              .from("projects")
              .update({ status: "rejected", updated_at: new Date().toISOString() })
              .eq("id", submission.project_id);
          }
        }
      }
    }

    // If rejected, try to parse the reason with AI
    if (submission.review_status === "rejected" && submission.rejection_reason) {
      result.rejection_reason = submission.rejection_reason;
    }

    return new Response(
      JSON.stringify({ success: true, status: result }),
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

// --- App Store Connect review status ---

async function checkAppStoreReview(
  credentials: Record<string, string>,
  storeSubmissionId: string | null
): Promise<{ status: string; rejection_reason?: string } | null> {
  if (!storeSubmissionId || !credentials.key_id || !credentials.issuer_id || !credentials.private_key) {
    return null;
  }

  try {
    const jwt = await generateAppleJwt(credentials.key_id, credentials.issuer_id, credentials.private_key);

    const res = await fetch(
      `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${storeSubmissionId}`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const appStoreState = data.data?.attributes?.appStoreState ?? "";

    const stateMap: Record<string, string> = {
      WAITING_FOR_REVIEW: "waiting_for_review",
      IN_REVIEW: "in_review",
      READY_FOR_SALE: "approved",
      REJECTED: "rejected",
      DEVELOPER_REJECTED: "rejected",
      PENDING_DEVELOPER_RELEASE: "approved",
      PROCESSING_FOR_APP_STORE: "in_review",
    };

    const mapped = stateMap[appStoreState];
    if (!mapped) return null;

    const result: { status: string; rejection_reason?: string } = { status: mapped };

    // Fetch rejection reason if rejected
    if (mapped === "rejected") {
      const resolRes = await fetch(
        `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${storeSubmissionId}/appStoreReviewAttachments`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (resolRes.ok) {
        const resolData = await resolRes.json();
        const notes = resolData.data?.[0]?.attributes?.description;
        if (notes) result.rejection_reason = notes;
      }
    }

    return result;
  } catch {
    return null;
  }
}

async function generateAppleJwt(keyId: string, issuerId: string, privateKeyPem: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const pemBody = privateKeyPem
    .replace(/-----BEGIN.*?-----/g, "")
    .replace(/-----END.*?-----/g, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, sigInput);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${header}.${payload}.${sigB64}`;
}

// --- Google Play review status ---

async function checkGooglePlayReview(
  credentials: Record<string, string>,
  storeSubmissionId: string | null
): Promise<{ status: string; rejection_reason?: string } | null> {
  if (!storeSubmissionId) return null;

  // Credentials may be stored as { service_account_json: "..." } or directly as { client_email, private_key }
  let clientEmail = credentials.client_email;
  let privateKey = credentials.private_key;

  if (!clientEmail && credentials.service_account_json) {
    try {
      const sa = JSON.parse(credentials.service_account_json);
      clientEmail = sa.client_email;
      privateKey = sa.private_key;
    } catch { /* ignore parse errors */ }
  }

  if (!clientEmail || !privateKey) return null;

  try {
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const packageName = storeSubmissionId;

    // Check the latest track release status
    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!res.ok) return null;

    const edit = await res.json();
    const editId = edit.id;

    // Check production track
    const trackRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/production`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!trackRes.ok) return null;

    const trackData = await trackRes.json();
    const release = trackData.releases?.[0];
    if (!release) return null;

    const statusMap: Record<string, string> = {
      draft: "waiting_for_review",
      inProgress: "in_review",
      halted: "rejected",
      completed: "approved",
    };

    const mapped = statusMap[release.status];
    if (!mapped) return null;

    return { status: mapped };
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const pemBody = privateKeyPem
    .replace(/-----BEGIN.*?-----/g, "")
    .replace(/-----END.*?-----/g, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, sigInput);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${header}.${payload}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function checkEasBuildStatus(buildId: string): Promise<string> {
  const easToken = Deno.env.get("EAS_ACCESS_TOKEN");
  if (!easToken) return "in_progress";

  try {
    const res = await fetch(`https://api.expo.dev/v2/builds/${buildId}`, {
      headers: { Authorization: `Bearer ${easToken}` },
    });

    if (!res.ok) return "in_progress";

    const data = await res.json();
    const status = data.status ?? data.buildStatus ?? "";

    switch (status) {
      case "finished":
      case "FINISHED":
        return "completed";
      case "errored":
      case "ERRORED":
      case "canceled":
      case "CANCELED":
        return "failed";
      default:
        return "in_progress";
    }
  } catch {
    return "in_progress";
  }
}
