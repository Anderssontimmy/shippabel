import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import {
  Sparkles,
  Save,
  Loader2,
  Apple,
  Smartphone,
  FileText,
  Shield,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useStoreListing } from "@/hooks/useStoreListing";

const charLimits: Record<string, Record<string, number>> = {
  ios: { app_name: 30, subtitle: 30, keywords: 100, full_description: 4000 },
  android: { app_name: 30, short_description: 80, full_description: 4000 },
};

const CharCount = ({ current, max }: { current: number; max: number }) => {
  const over = current > max;
  return (
    <span className={`text-xs ${over ? "text-red-400" : current > max * 0.9 ? "text-amber-400" : "text-surface-500"}`}>
      {current}/{max}
    </span>
  );
};

export const Listing = () => {
  const { id } = useParams();
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [appContext, setAppContext] = useState("");
  const [privacyModal, setPrivacyModal] = useState(false);
  const [devName, setDevName] = useState("");
  const [devEmail, setDevEmail] = useState("");

  const {
    listing,
    variants,
    generating,
    saving,
    error,
    load,
    generateCopy,
    selectVariant,
    updateField,
    save,
    generatePrivacy,
  } = useStoreListing(id ?? "", platform);

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, platform]);

  const limits = charLimits[platform]!;
  const lim = (key: string) => limits[key] ?? 100;

  return (
    <div>
    {id && <ShipFlowBar projectId={id} />}
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/scan/${id}`} className="text-surface-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Store Listing</h1>
          <p className="text-surface-400 text-sm mt-1">
            Generate and edit your app store listing copy
          </p>
        </div>
      </div>

      {/* Platform switcher */}
      <div className="flex rounded-xl bg-surface-900 border border-surface-800 p-1 mb-8 max-w-xs">
        <button
          onClick={() => setPlatform("ios")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            platform === "ios" ? "bg-surface-800 text-white shadow-sm" : "text-surface-400"
          }`}
        >
          <Apple className="h-4 w-4" />
          iOS
        </button>
        <button
          onClick={() => setPlatform("android")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            platform === "android" ? "bg-surface-800 text-white shadow-sm" : "text-surface-400"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Android
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Generate CTA */}
          {!listing?.app_name && !generating && (
            <Card className="border-primary-500/20 bg-primary-500/5">
              <div className="text-center py-4">
                <Sparkles className="h-8 w-8 text-primary-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Generate store listing with AI</h3>
                <p className="text-sm text-surface-400 mb-4 max-w-md mx-auto">
                  Tell us about your app and we'll generate optimized copy for the {platform === "ios" ? "App Store" : "Google Play Store"}.
                </p>
                <textarea
                  value={appContext}
                  onChange={(e) => setAppContext(e.target.value)}
                  placeholder="Describe your app: what it does, who it's for, key features..."
                  className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white placeholder:text-surface-500 outline-none focus:border-primary-500 mb-4 resize-none h-24"
                />
                <Button onClick={() => generateCopy(appContext)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate copy
                </Button>
              </div>
            </Card>
          )}

          {generating && (
            <Card className="text-center py-10">
              <Loader2 className="h-8 w-8 text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-surface-400">Generating store copy with AI...</p>
            </Card>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Variant selector */}
          {variants.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-3">Choose a variant</h3>
              <div className="grid grid-cols-3 gap-3">
                {["Professional", "Friendly", "Bold"].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => selectVariant(i)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                      listing?.app_name === variants[i]?.app_name
                        ? "border-primary-500 bg-primary-500/10 text-primary-300"
                        : "border-surface-700 text-surface-400 hover:border-surface-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          {(listing?.app_name || generating) && !generating && (
            <div className="space-y-5">
              {/* App name */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium text-surface-300">App Name</label>
                  <CharCount current={listing?.app_name?.length ?? 0} max={lim("app_name")} />
                </div>
                <input
                  value={listing?.app_name ?? ""}
                  onChange={(e) => updateField("app_name", e.target.value)}
                  className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Subtitle (iOS) / Short description (Android) */}
              {platform === "ios" ? (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-surface-300">Subtitle</label>
                    <CharCount current={listing?.subtitle?.length ?? 0} max={lim("subtitle")} />
                  </div>
                  <input
                    value={listing?.subtitle ?? ""}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-surface-300">Short Description</label>
                    <CharCount current={listing?.short_description?.length ?? 0} max={lim("short_description")} />
                  </div>
                  <input
                    value={listing?.short_description ?? ""}
                    onChange={(e) => updateField("short_description", e.target.value)}
                    className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              )}

              {/* Full description */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm font-medium text-surface-300">Full Description</label>
                  <CharCount current={listing?.full_description?.length ?? 0} max={lim("full_description")} />
                </div>
                <textarea
                  value={listing?.full_description ?? ""}
                  onChange={(e) => updateField("full_description", e.target.value)}
                  rows={10}
                  className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>

              {/* Keywords (iOS only) */}
              {platform === "ios" && (
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-sm font-medium text-surface-300">Keywords</label>
                    <CharCount current={listing?.keywords?.length ?? 0} max={lim("keywords")} />
                  </div>
                  <input
                    value={listing?.keywords ?? ""}
                    onChange={(e) => updateField("keywords", e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white placeholder:text-surface-500 outline-none focus:border-primary-500 transition-colors"
                  />
                  <p className="text-xs text-surface-500 mt-1">Comma-separated. Apple uses these for search ranking.</p>
                </div>
              )}

              {/* Privacy policy */}
              <Card>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-1">Privacy Policy</h4>
                    {listing?.privacy_policy_url ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-400" />
                        <a
                          href={listing.privacy_policy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-400 hover:text-primary-300 underline"
                        >
                          View hosted policy
                        </a>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-surface-400 mb-3">
                          Required by both stores. We'll generate and host one for you.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                          onClick={() => setPrivacyModal(true)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Generate privacy policy
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Save */}
              <div className="flex gap-3">
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save listing
                </Button>
                <Button variant="secondary" onClick={() => generateCopy(appContext)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Preview panel — below form on mobile, sticky sidebar on desktop */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <h3 className="text-sm font-semibold text-surface-300 mb-3">
              {platform === "ios" ? "App Store" : "Google Play"} Preview
            </h3>
            <Card className="bg-white text-gray-900 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {listing?.app_name || "Your App Name"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {platform === "ios"
                      ? listing?.subtitle || "Your subtitle here"
                      : listing?.short_description || "Short description"}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="h-2.5 w-2.5 text-amber-400">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1">5.0</span>
                  </div>
                </div>
              </div>

              {/* Screenshot placeholders */}
              <div className="flex gap-1.5 overflow-hidden mb-3">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="h-28 w-14 rounded bg-gray-100 shrink-0 flex items-center justify-center">
                    <span className="text-[8px] text-gray-300">Screenshot</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                  {listing?.full_description || "Your full description will appear here..."}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Privacy modal */}
      {privacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Generate Privacy Policy</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Developer / Company Name</label>
                <input
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="Your Name or Company"
                  className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Contact Email</label>
                <input
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="privacy@yourapp.com"
                  className="w-full rounded-lg bg-surface-800 border border-surface-700 px-3 py-2 text-sm text-white outline-none focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={async () => {
                  await generatePrivacy(listing?.app_name ?? "My App", devName, devEmail);
                  setPrivacyModal(false);
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
              <Button variant="ghost" onClick={() => setPrivacyModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
    </div>
  );
};
