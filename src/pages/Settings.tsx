import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Apple,
  Smartphone,
  Rocket,
  Github,
  Check,
  X,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Key,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useCredentials, type Provider } from "@/hooks/useCredentials";
import { useToast } from "@/components/ui/Toast";

interface ProviderConfig {
  id: Provider;
  name: string;
  icon: typeof Apple;
  description: string;
  setupSteps: string[];
  setupLink?: { label: string; url: string };
  fields: { key: string; label: string; placeholder: string; secret: boolean; multiline?: boolean; help?: string }[];
}

const providers: ProviderConfig[] = [
  {
    id: "github" as Provider,
    name: "GitHub",
    icon: Github,
    description: "Connect to scan private apps. If you signed in with GitHub, this is already connected.",
    setupSteps: [
      "Go to github.com and sign in",
      "Click your profile picture → Settings",
      "Scroll down to Developer settings → Personal access tokens → Fine-grained tokens",
      "Click 'Generate new token'",
      "Name it 'Shippabel', set expiration to 90 days",
      "Under 'Repository access', select your app repos",
      "Under 'Permissions', enable 'Contents: Read'",
      "Click 'Generate token' and copy it",
    ],
    setupLink: { label: "Open GitHub Token Settings", url: "https://github.com/settings/tokens?type=beta" },
    fields: [
      {
        key: "access_token",
        label: "Personal Access Token",
        placeholder: "github_pat_xxxxxxxxxxxxxxxxxxxx",
        secret: true,
      },
    ],
  },
  {
    id: "eas",
    name: "Expo (EAS)",
    icon: Rocket,
    description: "Required for building your app. Free to create — you just need an Expo account.",
    setupSteps: [
      "Go to expo.dev and create a free account (or sign in)",
      "Click your profile picture → Account settings",
      "Click 'Access Tokens' in the left sidebar",
      "Click 'Create Token'",
      "Name it 'Shippabel' and click 'Create'",
      "Copy the token — you won't be able to see it again!",
    ],
    setupLink: { label: "Open Expo Token Settings", url: "https://expo.dev/settings/access-tokens" },
    fields: [
      {
        key: "access_token",
        label: "EAS Access Token",
        placeholder: "expo_xxxxxxxxxxxx",
        secret: true,
      },
    ],
  },
  {
    id: "apple",
    name: "Apple App Store",
    icon: Apple,
    description: "Required to publish on the App Store. You need an Apple Developer account ($99/year).",
    setupSteps: [
      "Go to appstoreconnect.apple.com and sign in",
      "Click 'Users and Access' in the top menu",
      "Click the 'Integrations' tab, then 'App Store Connect API'",
      "Click the + button to create a new key",
      "Name it 'Shippabel' and select 'Admin' access",
      "Note the Key ID (shown in the table)",
      "Note the Issuer ID (shown at the top of the page)",
      "Click 'Download API Key' — this downloads a .p8 file",
      "Open the .p8 file with any text editor and copy everything inside",
    ],
    setupLink: { label: "Open App Store Connect", url: "https://appstoreconnect.apple.com/access/integrations/api" },
    fields: [
      {
        key: "key_id",
        label: "API Key ID",
        placeholder: "XXXXXXXXXX",
        secret: false,
        help: "The 10-character ID shown in the Keys table",
      },
      {
        key: "issuer_id",
        label: "Issuer ID",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        secret: false,
        help: "The UUID shown at the top of the API Keys page",
      },
      {
        key: "private_key",
        label: "API Private Key (.p8 content)",
        placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
        secret: true,
        multiline: true,
        help: "Open the downloaded .p8 file in a text editor, then copy and paste everything",
      },
    ],
  },
  {
    id: "google",
    name: "Google Play",
    icon: Smartphone,
    description: "Required to publish on Google Play. You need a Google Play Developer account ($25 one-time).",
    setupSteps: [
      "Go to play.google.com/console and sign in",
      "Click 'Setup' → 'API access' in the left sidebar",
      "Click 'Create new service account'",
      "This opens Google Cloud Console — click 'Create Service Account'",
      "Name it 'Shippabel', click 'Create and Continue'",
      "For role, select 'Service Account User', then click 'Done'",
      "Click the ⋮ menu next to your new account → 'Manage Keys'",
      "Click 'Add Key' → 'Create new key' → choose JSON → 'Create'",
      "A JSON file downloads — open it and copy everything inside",
      "Back in Play Console, click 'Grant Access' next to the service account",
      "Enable 'Admin' permissions and click 'Invite User'",
    ],
    setupLink: { label: "Open Google Play Console", url: "https://play.google.com/console/developers" },
    fields: [
      {
        key: "service_account_json",
        label: "Service Account JSON",
        placeholder: '{"type": "service_account", ...}',
        secret: true,
        multiline: true,
        help: "Open the downloaded JSON file in a text editor, then copy and paste everything",
      },
    ],
  },
];

export const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { credentials, loading, saving, error, hasCredential, saveCredential, removeCredential } = useCredentials();
  const { toast } = useToast();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const handleSave = async (provider: ProviderConfig) => {
    // Validate all required fields
    const missing = provider.fields.filter((f) => !formData[f.key]?.trim());
    if (missing.length > 0) {
      toast("error", `Missing: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    await saveCredential(provider.id, formData, provider.name);
    if (!error) {
      toast("success", `${provider.name} credentials saved!`);
      setEditingProvider(null);
      setFormData({});
    }
  };

  const handleRemove = async (provider: ProviderConfig) => {
    await removeCredential(provider.id);
    toast("info", `${provider.name} credentials removed.`);
  };

  const startEditing = (provider: ProviderConfig) => {
    const existing = credentials.find((c) => c.provider === provider.id);
    if (existing) {
      setFormData(existing.credentials as Record<string, string>);
    } else {
      setFormData({});
    }
    setEditingProvider(provider.id);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-16">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900">Settings</h1>
        <p className="text-surface-500 text-sm mt-1">
          Connect your developer accounts to enable building and store submission.
        </p>
      </div>

      {/* Security notice */}
      <Card className="mb-8 border-surface-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-surface-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-surface-900 mb-1">Your credentials are secure</h3>
            <p className="text-xs text-surface-500">
              Credentials are encrypted at rest in Supabase and only used server-side in Edge Functions.
              They are never exposed to the browser or stored in logs.
            </p>
          </div>
        </div>
      </Card>

      {/* Provider cards */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const connected = hasCredential(provider.id);
          const isEditing = editingProvider === provider.id;

          return (
            <Card key={provider.id}>
              <div className="flex items-start gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${connected ? "bg-green-50" : "bg-surface-100"}`}>
                  <provider.icon className={`h-5 w-5 ${connected ? "text-green-600" : "text-surface-400"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{provider.name}</h3>
                    {connected && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mb-3">{provider.description}</p>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="space-y-3 mb-4">
                      {/* Setup guide */}
                      <div className="rounded-lg border border-surface-200 overflow-hidden">
                        <button
                          onClick={() => setShowGuide((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-50 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2 text-xs font-medium text-surface-700">
                            <HelpCircle className="h-3.5 w-3.5 text-surface-400" />
                            How do I get this?
                          </span>
                          {showGuide[provider.id]
                            ? <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                            : <ChevronRight className="h-3.5 w-3.5 text-surface-400" />
                          }
                        </button>
                        {showGuide[provider.id] && (
                          <div className="px-3 pb-3 border-t border-surface-100">
                            <ol className="mt-2.5 space-y-2">
                              {provider.setupSteps.map((step, i) => (
                                <li key={i} className="flex gap-2.5 text-xs text-surface-600">
                                  <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-surface-100 text-surface-500 text-[10px] font-semibold shrink-0 mt-0.5" style={{ minWidth: "18px", minHeight: "18px" }}>
                                    {i + 1}
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                            {provider.setupLink && (
                              <a
                                href={provider.setupLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {provider.setupLink.label}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {provider.fields.map((field) => (
                        <div key={field.key}>
                          <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium text-surface-600">{field.label}</label>
                            {field.secret && (
                              <button
                                onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))}
                                className="text-xs text-surface-500 hover:text-surface-600 flex items-center gap-1 cursor-pointer"
                              >
                                {showSecrets[field.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {showSecrets[field.key] ? "Hide" : "Show"}
                              </button>
                            )}
                          </div>
                          {field.multiline ? (
                            field.secret && !showSecrets[field.key] ? (
                              <div
                                onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: true }))}
                                className="w-full rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 text-xs text-surface-500 font-mono cursor-pointer min-h-[6rem] flex items-center"
                              >
                                {formData[field.key] ? "••••••••••••••••" : field.placeholder}
                              </div>
                            ) : (
                              <textarea
                                value={formData[field.key] ?? ""}
                                onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                rows={4}
                                className="w-full rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 text-xs text-surface-900 placeholder:text-surface-400 outline-none focus:border-surface-400 font-mono resize-none"
                              />
                            )
                          ) : (
                            <input
                              type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                              value={formData[field.key] ?? ""}
                              onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 text-xs text-surface-900 placeholder:text-surface-400 outline-none focus:border-surface-400 font-mono"
                            />
                          )}
                          {field.help && (
                            <p className="text-[10px] text-surface-600 mt-1">{field.help}</p>
                          )}
                        </div>
                      ))}

                      {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(provider)} disabled={saving} className="gap-1.5">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                          {saving ? "Saving..." : "Save credentials"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingProvider(null); setFormData({}); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isEditing && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEditing(provider)}>
                        {connected ? "Update" : "Connect"}
                      </Button>
                      {connected && (
                        <Button size="sm" variant="ghost" onClick={() => handleRemove(provider)} className="text-red-400 hover:text-red-300">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Status summary */}
      <Card className="mt-8">
        <h3 className="text-sm font-semibold mb-3">Pipeline Status</h3>
        <div className="space-y-2">
          {[
            { label: "Scan & Fix", ready: true, note: "Always available" },
            { label: "Generate Store Listing", ready: true, note: "AI-powered" },
            { label: "Generate Screenshots", ready: true, note: "Client-side" },
            { label: "Build (EAS)", ready: hasCredential("eas"), note: hasCredential("eas") ? "Connected" : "Needs EAS token" },
            { label: "Submit to iOS", ready: hasCredential("apple") && hasCredential("eas"), note: hasCredential("apple") ? "Connected" : "Needs Apple credentials" },
            { label: "Submit to Android", ready: hasCredential("google") && hasCredential("eas"), note: hasCredential("google") ? "Connected" : "Needs Google credentials" },
          ].map((step) => (
            <div key={step.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${step.ready ? "bg-green-500" : "bg-surface-300"}`} />
                <span className="text-sm text-surface-700">{step.label}</span>
              </div>
              <span className={`text-xs ${step.ready ? "text-green-600" : "text-surface-400"}`}>{step.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
