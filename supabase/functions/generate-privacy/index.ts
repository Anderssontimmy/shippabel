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

interface GeneratePrivacyRequest {
  project_id: string;
  app_name: string;
  developer_name?: string;
  developer_email?: string;
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

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { project_id, app_name, developer_name, developer_email } =
      (await req.json()) as GeneratePrivacyRequest;

    // Fetch project to analyze permissions and services
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    // Detect permissions and services from scan
    let detectedServices: string[] = [];
    let detectedPermissions: string[] = [];

    if (project?.repo_url) {
      const analysis = await analyzeProjectPrivacy(project.repo_url);
      detectedServices = analysis.services;
      detectedPermissions = analysis.permissions;
    }

    const prompt = `You are a legal document writer specializing in mobile app privacy policies. Generate a comprehensive, legally appropriate privacy policy for a mobile app.

App name: ${app_name}
Developer: ${developer_name ?? "[Developer Name]"}
Contact email: ${developer_email ?? "[contact@email.com]"}

Detected third-party services: ${detectedServices.length > 0 ? detectedServices.join(", ") : "None detected"}
Detected permissions: ${detectedPermissions.length > 0 ? detectedPermissions.join(", ") : "None detected"}

Requirements:
- Must comply with Apple App Store and Google Play Store requirements
- Must comply with GDPR and CCPA basics
- Written in clear, plain English (not legalese)
- Include sections: What we collect, How we use data, Third-party services, Data retention, Your rights, Children's privacy, Changes, Contact
- Include the current date as the effective date
- If permissions like camera, location, or contacts are detected, explain why they're used
- For each third-party service, briefly explain what data it processes

Output ONLY the privacy policy text in Markdown format. No preamble or commentary.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    const privacyPolicy = result.content?.[0]?.text ?? "";

    // Store the privacy policy and generate a hosted URL
    const policyId = crypto.randomUUID();
    const policyUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/privacy-policies/${project_id}.html`;

    // Convert markdown to basic HTML
    const html = generatePrivacyHtml(app_name, privacyPolicy);

    // Upload to Supabase Storage
    await supabase.storage
      .from("privacy-policies")
      .upload(`${project_id}.html`, new Blob([html], { type: "text/html" }), {
        upsert: true,
        contentType: "text/html",
      });

    // Update the store listing with privacy policy URL
    await supabase
      .from("store_listings")
      .update({ privacy_policy_url: policyUrl })
      .eq("project_id", project_id);

    return new Response(
      JSON.stringify({
        success: true,
        privacy_policy: privacyPolicy,
        hosted_url: policyUrl,
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

async function analyzeProjectPrivacy(repoUrl: string) {
  const services: string[] = [];
  const permissions: string[] = [];

  try {
    const urlObj = new URL(repoUrl);
    const parts = urlObj.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return { services, permissions };
    const repoPath = `${parts[0]}/${parts[1]}`;

    // Check package.json for service SDKs
    const pkgRes = await fetch(
      `https://raw.githubusercontent.com/${repoPath}/main/package.json`
    );
    if (pkgRes.ok) {
      const pkg = await pkgRes.json();
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };

      const serviceMap: Record<string, string> = {
        "@supabase/supabase-js": "Supabase (authentication, database)",
        "firebase": "Firebase (Google analytics, authentication)",
        "@react-native-firebase/app": "Firebase",
        "@stripe/stripe-react-native": "Stripe (payment processing)",
        "expo-ads-admob": "Google AdMob (advertising)",
        "@sentry/react-native": "Sentry (error tracking)",
        "expo-analytics": "Analytics",
        "@segment/analytics-react-native": "Segment (analytics)",
        "react-native-onesignal": "OneSignal (push notifications)",
      };

      for (const [dep, name] of Object.entries(serviceMap)) {
        if (dep in allDeps) services.push(name);
      }
    }

    // Check app.json for permissions
    const appRes = await fetch(
      `https://raw.githubusercontent.com/${repoPath}/main/app.json`
    );
    if (appRes.ok) {
      const appJson = await appRes.json();
      const expo = appJson.expo ?? appJson;

      const iosInfoPlist = (expo.ios as Record<string, unknown>)?.infoPlist as Record<string, unknown> | undefined;
      if (iosInfoPlist) {
        const permMap: Record<string, string> = {
          NSCameraUsageDescription: "Camera",
          NSPhotoLibraryUsageDescription: "Photo Library",
          NSLocationWhenInUseUsageDescription: "Location (while in use)",
          NSLocationAlwaysUsageDescription: "Location (always)",
          NSContactsUsageDescription: "Contacts",
          NSMicrophoneUsageDescription: "Microphone",
          NSCalendarsUsageDescription: "Calendar",
        };
        for (const [key, name] of Object.entries(permMap)) {
          if (key in iosInfoPlist) permissions.push(name);
        }
      }

      const androidPerms = (expo.android as Record<string, unknown>)?.permissions as string[] | undefined;
      if (androidPerms) {
        const permMap: Record<string, string> = {
          CAMERA: "Camera",
          READ_CONTACTS: "Contacts",
          ACCESS_FINE_LOCATION: "Precise Location",
          ACCESS_COARSE_LOCATION: "Approximate Location",
          RECORD_AUDIO: "Microphone",
          READ_CALENDAR: "Calendar",
          READ_EXTERNAL_STORAGE: "Storage",
        };
        for (const perm of androidPerms) {
          const name = permMap[perm];
          if (name && !permissions.includes(name)) permissions.push(name);
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return { services, permissions };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generatePrivacyHtml(appName: string, markdown: string): string {
  const safeAppName = escapeHtml(appName);
  // Basic markdown to HTML
  let html = markdown
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — ${safeAppName}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.7; color: #1a1a1a; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; }
    h3 { font-size: 1.1rem; margin-top: 1.5rem; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.25rem; }
    p { margin: 1rem 0; }
  </style>
</head>
<body>
  <p>${html}</p>
  <hr>
  <p style="color: #666; font-size: 0.85rem;">Generated by <a href="https://shippabel.com">Shippabel</a></p>
</body>
</html>`;
}
