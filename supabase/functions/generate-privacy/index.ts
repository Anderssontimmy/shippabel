import { loadProjectSource, privacyContext } from "../_shared/projectContext.ts";
import { generateText } from "../_shared/anthropic.ts";
import { instrument } from "../_shared/monitoring.ts";
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

Deno.serve(instrument("generate-privacy", async (req) => {
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
    await supabase.from("usage_events").insert({ user_id: user.id, action: "generate-privacy" });

    const { project_id, app_name, developer_name, developer_email } =
      (await req.json()) as GeneratePrivacyRequest;

    // Fetch project to analyze permissions and services — must belong to the user
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) return Response.json({ error: "Project not found" }, { status: 404, headers: getCorsHeaders(req) });
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("AI service not configured");
    const source = await loadProjectSource(supabase, user.id, project);
    const { services: detectedServices, permissions: detectedPermissions } = privacyContext(source);

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

    const privacyPolicy = await generateText({ apiKey: anthropicKey, prompt, maxTokens: 6144 });

    // Store the privacy policy and generate a hosted URL
    const policyUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/privacy-policies/${project_id}.html`;

    // Convert markdown to basic HTML
    const html = generatePrivacyHtml(app_name, privacyPolicy);

    // Upload to Supabase Storage — fail loudly, otherwise we'd hand the user
    // a hosted URL that 404s and they'd submit it to Google Play
    const { error: uploadError } = await supabase.storage
      .from("privacy-policies")
      .upload(`${project_id}.html`, new Blob([html], { type: "text/html" }), {
        upsert: true,
        contentType: "text/html",
      });
    if (uploadError) {
      throw new Error(`Couldn't publish the privacy policy: ${uploadError.message}`);
    }

    // Save the URL even when the policy is generated before the listing copy.
    const { error: saveError } = await supabase.from("store_listings").upsert(
      { project_id, platform: "android", privacy_policy_url: policyUrl },
      { onConflict: "project_id,platform" }
    );
    if (saveError) throw new Error("Your privacy policy was generated but could not be saved. Please try again.");

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
}));

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generatePrivacyHtml(appName: string, markdown: string): string {
  const safeAppName = escapeHtml(appName);
  // Basic markdown to HTML
  const html = escapeHtml(markdown)
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
