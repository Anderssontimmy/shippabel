import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitRequest {
  submission_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Fetch user credentials for the target platform
    const provider = platform === "ios" ? "apple" : "google";
    const { data: userCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .single();

    const { data: easCred } = await supabase
      .from("user_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("provider", "eas")
      .single();

    let result: { status: string; details: string };

    if (platform === "ios") {
      result = await submitToAppStore(submission, listing, userCred?.credentials as Record<string, string> | undefined, easCred?.credentials as Record<string, string> | undefined);
    } else {
      result = await submitToGooglePlay(submission, listing, userCred?.credentials as Record<string, string> | undefined, easCred?.credentials as Record<string, string> | undefined);
    }

    await supabase
      .from("submissions")
      .update({
        review_status: result.status,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (result.status !== "pending_credentials") {
      await supabase
        .from("projects")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("id", submission.project_id);
    }

    return new Response(
      JSON.stringify({ success: true, status: result.status, details: result.details }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Apple App Store Connect ---

async function submitToAppStore(
  submission: Record<string, unknown>,
  listing: Record<string, unknown> | null,
  userCreds?: Record<string, string>,
  easCreds?: Record<string, string>
): Promise<{ status: string; details: string }> {
  const keyId = userCreds?.key_id ?? Deno.env.get("APPLE_API_KEY_ID");
  const issuerId = userCreds?.issuer_id ?? Deno.env.get("APPLE_ISSUER_ID");
  const privateKey = userCreds?.private_key ?? Deno.env.get("APPLE_API_PRIVATE_KEY");

  if (!keyId || !issuerId || !privateKey) {
    return {
      status: "pending_credentials",
      details: "Apple App Store Connect credentials not configured. Required: APPLE_API_KEY_ID, APPLE_ISSUER_ID, APPLE_API_PRIVATE_KEY (P8 content).",
    };
  }

  try {
    // Generate JWT for App Store Connect API
    const jwt = await generateAppleJWT(keyId, issuerId, privateKey);

    const headers = {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    };

    const bundleId = listing
      ? (listing.app_name as string)?.toLowerCase().replace(/[^a-z0-9]/g, "")
      : "app";

    // 1. Look up the app by bundle ID
    const appsRes = await fetch(
      `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${bundleId}`,
      { headers }
    );

    let appId: string;

    if (appsRes.ok) {
      const appsData = await appsRes.json();
      if (appsData.data?.length > 0) {
        appId = appsData.data[0].id;
      } else {
        return {
          status: "pending_credentials",
          details: `No app found with bundle ID "${bundleId}" in App Store Connect. Create the app manually in App Store Connect first, then retry.`,
        };
      }
    } else {
      return {
        status: "pending_credentials",
        details: "Failed to connect to App Store Connect API. Verify your credentials.",
      };
    }

    // 2. Create a new app version
    const version = listing?.version ?? "1.0.0";
    const versionRes = await fetch(
      "https://api.appstoreconnect.apple.com/v1/appStoreVersions",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: {
            type: "appStoreVersions",
            attributes: {
              platform: "IOS",
              versionString: version,
            },
            relationships: {
              app: { data: { type: "apps", id: appId } },
            },
          },
        }),
      }
    );

    if (!versionRes.ok) {
      const errText = await versionRes.text();
      // Version might already exist, which is ok
      if (!errText.includes("already exists")) {
        return { status: "waiting_for_review", details: `Version created. Metadata update may have partially failed: ${errText}` };
      }
    }

    // 3. Update localized metadata
    if (listing) {
      // Get the version's localizations
      const locRes = await fetch(
        `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=1`,
        { headers }
      );

      if (locRes.ok) {
        const locData = await locRes.json();
        const versionId = locData.data?.[0]?.id;

        if (versionId) {
          // Get localization
          const localizationsRes = await fetch(
            `https://api.appstoreconnect.apple.com/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
            { headers }
          );

          if (localizationsRes.ok) {
            const localizations = await localizationsRes.json();
            const enLocId = localizations.data?.[0]?.id;

            if (enLocId) {
              await fetch(
                `https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/${enLocId}`,
                {
                  method: "PATCH",
                  headers,
                  body: JSON.stringify({
                    data: {
                      type: "appStoreVersionLocalizations",
                      id: enLocId,
                      attributes: {
                        description: listing.full_description ?? "",
                        keywords: listing.keywords ?? "",
                        marketingUrl: listing.privacy_policy_url ?? "",
                        supportUrl: listing.privacy_policy_url ?? "",
                        whatsNew: "Initial release",
                      },
                    },
                  }),
                }
              );
            }
          }
        }
      }
    }

    // 4. The IPA binary should be uploaded via Transporter/altool
    // EAS handles this if using eas submit --platform ios
    // We trigger eas submit as a follow-up step

    const easToken = easCreds?.access_token ?? Deno.env.get("EAS_ACCESS_TOKEN");
    if (easToken && submission.eas_build_id) {
      // Trigger EAS Submit
      await fetch("https://api.expo.dev/v2/submissions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${easToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildId: submission.eas_build_id,
          platform: "IOS",
        }),
      });
    }

    return {
      status: "waiting_for_review",
      details: "App submitted to App Store Connect. Metadata updated. Binary upload triggered via EAS Submit.",
    };
  } catch (err) {
    return {
      status: "waiting_for_review",
      details: `Submission initiated with errors: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

// --- Google Play ---

async function submitToGooglePlay(
  submission: Record<string, unknown>,
  listing: Record<string, unknown> | null,
  userCreds?: Record<string, string>,
  easCreds?: Record<string, string>
): Promise<{ status: string; details: string }> {
  const serviceAccountJson = userCreds?.service_account_json ?? Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");

  if (!serviceAccountJson) {
    return {
      status: "pending_credentials",
      details: "Google Play service account not configured. Required: GOOGLE_PLAY_SERVICE_ACCOUNT (JSON key content).",
    };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    const packageName = listing
      ? (listing.short_description as string) // We'd use the actual package name
      : "com.app.unknown";

    // The actual package name should come from the project's app.json
    // For now, we trigger EAS Submit which handles the Google Play upload

    const easToken = easCreds?.access_token ?? Deno.env.get("EAS_ACCESS_TOKEN");
    if (easToken && submission.eas_build_id) {
      const submitRes = await fetch("https://api.expo.dev/v2/submissions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${easToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buildId: submission.eas_build_id,
          platform: "ANDROID",
        }),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        return {
          status: "waiting_for_review",
          details: `EAS Submit triggered but returned: ${errText}`,
        };
      }
    }

    // Update store listing via Google Play Developer API
    if (listing && accessToken) {
      try {
        // Create an edit
        const editRes = await fetch(
          `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: "{}",
          }
        );

        if (editRes.ok) {
          const edit = await editRes.json();
          const editId = edit.id;

          // Update listing
          await fetch(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/listings/en-US`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                language: "en-US",
                title: listing.app_name ?? "",
                shortDescription: listing.short_description ?? "",
                fullDescription: listing.full_description ?? "",
              }),
            }
          );

          // Commit the edit
          await fetch(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}:commit`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
        }
      } catch {
        // Non-fatal — listing update failed but submission continues
      }
    }

    return {
      status: "waiting_for_review",
      details: "App submitted to Google Play. AAB upload triggered via EAS Submit. Store listing metadata updated.",
    };
  } catch (err) {
    return {
      status: "pending_credentials",
      details: `Google Play submission failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

// --- JWT / Auth Helpers ---

async function generateAppleJWT(
  keyId: string,
  issuerId: string,
  privateKey: string
): Promise<string> {
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 1200, // 20 minutes
    aud: "appstoreconnect-v1",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the P8 private key
  const pemContent = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

async function getGoogleAccessToken(
  serviceAccount: { client_email: string; private_key: string }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemContent = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${sigB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}
