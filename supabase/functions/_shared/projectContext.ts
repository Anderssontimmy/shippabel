import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { decryptCreds } from "./crypto.ts";
import { analyzeZip, extractGitHubPath, fetchGitHubProject, type ScanSource } from "./scanSource.ts";

// Call only after verifying project ownership. Private projects and ZIPs use
// the same source readers as the scanner; missing source must not mean no data.
export async function loadProjectSource(supabase: SupabaseClient, userId: string, project: { id: string; repo_url?: string | null }): Promise<ScanSource> {
  if (project.repo_url) {
    const { data, error } = await supabase.from("user_credentials").select("credentials").eq("user_id", userId).eq("provider", "github").maybeSingle();
    if (error) throw new Error("Could not read your GitHub connection. Please try again.");
    const credential = await decryptCreds(data?.credentials, Deno.env.get("CREDENTIALS_ENC_KEY") ?? "");
    return fetchGitHubProject(extractGitHubPath(project.repo_url), credential.access_token, fetch, { includeSource: false });
  }
  const { data, error } = await supabase.storage.from("project-archives").download(`scans/${project.id}/source.zip`);
  if (error || !data) throw new Error("Your source archive could not be read. Please upload and scan your app again.");
  return analyzeZip(new Uint8Array(await data.arrayBuffer()));
}

export function appContext(source: ScanSource): string {
  return [source.packageJson && `Package: ${JSON.stringify(source.packageJson).slice(0, 3000)}`,
    source.appConfig && `App settings: ${JSON.stringify(source.appConfig).slice(0, 3000)}`,
    source.readmeContent && `README: ${source.readmeContent}`].filter(Boolean).join("\n\n");
}

export function privacyContext(source: ScanSource) {
  const deps = { ...(source.packageJson?.dependencies as Record<string, unknown> ?? {}), ...(source.packageJson?.devDependencies as Record<string, unknown> ?? {}) };
  const knownServices: Record<string, string> = {
    "@supabase/supabase-js": "Supabase (authentication, database)", firebase: "Firebase (Google analytics, authentication)",
    "@react-native-firebase/app": "Firebase", "@stripe/stripe-react-native": "Stripe (payment processing)",
    "@stripe/stripe-js": "Stripe (payment processing)", "expo-ads-admob": "Google AdMob (advertising)",
    "@sentry/react-native": "Sentry (error tracking)", "@sentry/react": "Sentry (error tracking)", "expo-analytics": "Analytics",
    "@segment/analytics-react-native": "Segment (analytics)", "react-native-onesignal": "OneSignal (push notifications)",
  };
  const services = [...new Set(Object.entries(knownServices).filter(([dep]) => dep in deps).map(([, label]) => label))];
  const expo = (source.appConfig?.expo ?? source.appConfig ?? {}) as Record<string, unknown>;
  const ios = (expo.ios as { infoPlist?: Record<string, unknown> } | undefined)?.infoPlist ?? {};
  const android = (expo.android as { permissions?: string[] } | undefined)?.permissions ?? [];
  const labels: Record<string, string> = {
    NSCameraUsageDescription: "Camera", NSPhotoLibraryUsageDescription: "Photo Library", NSLocationWhenInUseUsageDescription: "Location (while in use)",
    NSLocationAlwaysUsageDescription: "Location (always)", NSContactsUsageDescription: "Contacts", NSMicrophoneUsageDescription: "Microphone", NSCalendarsUsageDescription: "Calendar",
    CAMERA: "Camera", READ_CONTACTS: "Contacts", ACCESS_FINE_LOCATION: "Precise Location", ACCESS_COARSE_LOCATION: "Approximate Location",
    RECORD_AUDIO: "Microphone", READ_CALENDAR: "Calendar", READ_EXTERNAL_STORAGE: "Storage",
  };
  const permissions = [...new Set([...Object.keys(ios).filter(p => p in labels), ...android.map(p => p.replace(/^android\.permission\./, ""))].map(p => labels[p] ?? p))];
  return { services, permissions };
}
