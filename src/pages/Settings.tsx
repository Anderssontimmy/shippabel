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
  fields: { key: string; label: string; placeholder: string; secret: boolean; multiline?: boolean; help?: string }[];
}

const providers: ProviderConfig[] = [
  {
    id: "github" as Provider,
    name: "GitHub",
    icon: Github,
    description: "Connect to scan private repos directly. If you signed in with GitHub, this is already connected.",
    fields: [
      {
        key: "access_token",
        label: "Personal Access Token",
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        secret: true,
        help: "Create at github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Grant 'Contents: Read' access to your repos.",
      },
    ],
  },
  {
    id: "eas",
    name: "Expo (EAS)",
    icon: Rocket,
    description: "Required for building your app. Get a token from expo.dev/accounts/[you]/settings/access-tokens",
    fields: [
      {
        key: "access_token",
        label: "EAS Access Token",
        placeholder: "expo_xxxxxxxxxxxx",
        secret: true,
        help: "Create at expo.dev → Settings → Access Tokens",
      },
    ],
  },
  {
    id: "apple",
    name: "Apple App Store",
    icon: Apple,
    description: "Required for iOS submission. You need an Apple Developer account ($99/year).",
    fields: [
      {
        key: "key_id",
        label: "API Key ID",
        placeholder: "XXXXXXXXXX",
        secret: false,
        help: "From App Store Connect → Users → Keys",
      },
      {
        key: "issuer_id",
        label: "Issuer ID",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        secret: false,
        help: "Found at the top of the API Keys page",
      },
      {
        key: "private_key",
        label: "API Private Key (.p8 content)",
        placeholder: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
        secret: true,
        multiline: true,
        help: "Download the .p8 file and paste its contents here",
      },
    ],
  },
  {
    id: "google",
    name: "Google Play",
    icon: Smartphone,
    description: "Required for Android submission. You need a Google Play Developer account ($25 one-time).",
    fields: [
      {
        key: "service_account_json",
        label: "Service Account JSON",
        placeholder: '{"type": "service_account", ...}',
        secret: true,
        multiline: true,
        help: "Create a service account in Google Cloud Console, grant it access in Play Console, then download the JSON key",
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
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">
          Connect your developer accounts to enable building and store submission.
        </p>
      </div>

      {/* Security notice */}
      <Card className="mb-8 border-primary-500/20 bg-primary-500/5">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Your credentials are secure</h3>
            <p className="text-xs text-surface-400">
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
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${connected ? "bg-green-500/10" : "bg-surface-800"}`}>
                  <provider.icon className={`h-5 w-5 ${connected ? "text-green-400" : "text-surface-400"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{provider.name}</h3>
                    {connected && (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400 mb-3">{provider.description}</p>

                  {/* Edit form */}
                  {isEditing && (
                    <div className="space-y-3 mb-4">
                      {provider.fields.map((field) => (
                        <div key={field.key}>
                          <div className="flex justify-between mb-1">
                            <label className="text-xs font-medium text-surface-300">{field.label}</label>
                            {field.secret && (
                              <button
                                onClick={() => setShowSecrets((s) => ({ ...s, [field.key]: !s[field.key] }))}
                                className="text-xs text-surface-500 hover:text-surface-300 flex items-center gap-1 cursor-pointer"
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
                                className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-xs text-surface-500 font-mono cursor-pointer min-h-[6rem] flex items-center"
                              >
                                {formData[field.key] ? "••••••••••••••••" : field.placeholder}
                              </div>
                            ) : (
                              <textarea
                                value={formData[field.key] ?? ""}
                                onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                rows={4}
                                className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-xs text-white placeholder:text-surface-600 outline-none focus:border-primary-500 font-mono resize-none"
                              />
                            )
                          ) : (
                            <input
                              type={field.secret && !showSecrets[field.key] ? "password" : "text"}
                              value={formData[field.key] ?? ""}
                              onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-xs text-white placeholder:text-surface-600 outline-none focus:border-primary-500 font-mono"
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
                <div className={`h-2 w-2 rounded-full ${step.ready ? "bg-green-400" : "bg-surface-600"}`} />
                <span className="text-sm text-surface-300">{step.label}</span>
              </div>
              <span className={`text-xs ${step.ready ? "text-green-400" : "text-surface-500"}`}>{step.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
