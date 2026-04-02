import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Apple,
  Smartphone,
  AlertCircle,
  FileText,
  Wrench,
  Package,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useBuild } from "@/hooks/useBuild";
import { supabase } from "@/lib/supabase";
import type { Project, ScanResult } from "@/lib/types";

type WizardStep = "review" | "configure" | "build" | "submit";

const steps: { id: WizardStep; label: string; icon: typeof FileText }[] = [
  { id: "review", label: "Checklist", icon: FileText },
  { id: "configure", label: "Settings", icon: Wrench },
  { id: "build", label: "Build", icon: Package },
  { id: "submit", label: "Go Live", icon: Send },
];

export const Submit = () => {
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState<WizardStep>("review");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [project, setProject] = useState<Project | null>(null);
  const [hasListing, setHasListing] = useState(false);
  const [hasScreenshots, setHasScreenshots] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);

  const {
    building,
    submitting,
    error,
    triggerBuild,
    submitToStore,
    latestByPlatform,
  } = useBuild(id ?? "");

  const submission = latestByPlatform(platform);
  const { toast } = useToast();

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProject = async () => {
    if (!id) return;

    if (id === "demo") {
      setProject({
        id: "demo",
        name: "demo-app",
        repo_url: "https://github.com/demo/fitness-app",
        status: "scanned",
        scan_result: { score: 73, summary: { critical: 0, warning: 5, info: 3, total: 8 }, issues: [], project_type: "expo" },
        created_at: new Date().toISOString(),
        user_id: "demo",
        platform: null,
        framework: null,
        updated_at: new Date().toISOString(),
      } as unknown as Project);
      setHasListing(true);
      setLoadingProject(false);
      return;
    }

    const [projectRes, listingRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("store_listings").select("id, app_name, screenshots").eq("project_id", id),
    ]);

    if (projectRes.data) setProject(projectRes.data as Project);
    const listings = listingRes.data ?? [];
    setHasListing(listings.some((l) => l.app_name && l.app_name.trim() !== ""));
    setHasScreenshots(listings.some((l) => Array.isArray(l.screenshots) && l.screenshots.length > 0));
    setLoadingProject(false);
  };

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const canProceed = () => {
    switch (currentStep) {
      case "review":
        return project && project.scan_result && (project.scan_result as ScanResult).summary.critical === 0;
      case "configure":
        return hasListing;
      case "build":
        return submission?.build_status === "completed";
      case "submit":
        return false;
    }
  };

  const goNext = () => {
    const next = steps[currentStepIndex + 1];
    if (next) setCurrentStep(next.id);
  };

  const goPrev = () => {
    const prev = steps[currentStepIndex - 1];
    if (prev) setCurrentStep(prev.id);
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-surface-400 animate-spin" />
      </div>
    );
  }

  const scan = project?.scan_result as ScanResult | null;
  const { isPaid } = usePlan();

  // Check if app needs conversion before it can be built
  const needsConversion = scan?.needs_conversion === true;

  if (!isPaid) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 sm:py-24">
        <UpgradePrompt
          feature="Publish Your App"
          description="We handle the entire build and submission process for you."
          benefits={[
            "We build your app for iOS and Android",
            "Submit directly to App Store and Google Play",
            "Track your review status in real-time",
            "Handle rejections with AI-powered guidance",
          ]}
        />
      </div>
    );
  }

  if (needsConversion) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 sm:py-24">
        <Card className="text-center py-10 px-6">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-surface-900 mb-2">One more step before building</h2>
          <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
            Your app needs to be converted to a mobile format before we can build it for the App Store and Google Play. This is quick and automatic — just click the button below.
          </p>
          <Link to={`/scan/${id}`}>
            <Button className="gap-2">
              <Rocket className="h-4 w-4" />
              Go to scan results to convert
            </Button>
          </Link>
          <p className="text-xs text-surface-400 mt-3">Look for the green "Make it App Store ready" button</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
    {id && <ShipFlowBar projectId={id} />}
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/scan/${id}`} className="text-surface-500 hover:text-surface-700 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900">Publish Your App</h1>
          <p className="text-surface-400 text-sm mt-1">
            We'll prepare your app and send it to the stores for you
          </p>
        </div>
      </div>

      {/* Platform selector */}
      <div className="flex rounded-xl bg-surface-50 border border-surface-200 p-1 mb-8 max-w-xs">
        <button
          onClick={() => setPlatform("ios")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            platform === "ios" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"
          }`}
        >
          <Apple className="h-4 w-4" />
          iOS
        </button>
        <button
          onClick={() => setPlatform("android")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            platform === "android" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Android
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-10">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 cursor-pointer ${
                i <= currentStepIndex ? "text-surface-900" : "text-surface-400"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < currentStepIndex
                    ? "bg-green-500 text-white"
                    : i === currentStepIndex
                    ? "bg-surface-900 text-white"
                    : "bg-surface-100 text-surface-500"
                }`}
              >
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < currentStepIndex ? "bg-green-500" : "bg-surface-100"}`} />
            )}
          </div>
        ))}
      </div>

      {error && !error.includes("Workflow file not found") && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {error && error.includes("Workflow file not found") && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900 mb-2">One-time setup needed</h3>
              <p className="text-sm text-surface-600 mb-4">
                To build your app, we need to add a build configuration to your GitHub project. This only needs to be done once.
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-surface-800 mb-1">Step 1: Go to your GitHub repo</p>
                  <a href={project?.repo_url?.replace(/\.git$/, "") ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="text-green-700 hover:text-green-800 underline text-xs">
                    Open your repo on GitHub →
                  </a>
                </div>

                <div>
                  <p className="font-medium text-surface-800 mb-1">Step 2: Create <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-amber-200">eas.json</code> in the root</p>
                  <div className="bg-white rounded-lg border border-amber-200 p-3 font-mono text-xs text-surface-700 relative">
                    <button
                      onClick={() => { navigator.clipboard.writeText('{\n  "cli": { "version": ">= 3.0.0" },\n  "build": {\n    "production": {\n      "android": { "buildType": "apk" },\n      "ios": { "simulator": false }\n    }\n  }\n}'); toast("success", "Copied!"); }}
                      className="absolute top-2 right-2 text-[10px] text-amber-600 hover:text-amber-800 cursor-pointer"
                    >Copy</button>
                    {`{\n  "cli": { "version": ">= 3.0.0" },\n  "build": {\n    "production": {\n      "android": { "buildType": "apk" },\n      "ios": { "simulator": false }\n    }\n  }\n}`}
                  </div>
                </div>

                <div>
                  <p className="font-medium text-surface-800 mb-1">Step 3: Create <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-amber-200">.github/workflows/eas-build.yml</code></p>
                  <div className="bg-white rounded-lg border border-amber-200 p-3 font-mono text-xs text-surface-700 relative whitespace-pre-wrap">
                    <button
                      onClick={() => { navigator.clipboard.writeText("name: EAS Build\non:\n  workflow_dispatch:\n    inputs:\n      platform:\n        description: Platform to build for\n        required: true\n        type: choice\n        options:\n          - android\n          - ios\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - name: Setup Expo and EAS\n        uses: expo/expo-github-action@v8\n        with:\n          eas-version: latest\n          token: ${{ secrets.EXPO_TOKEN }}\n      - name: Install dependencies\n        run: npm install\n      - name: Build\n        run: eas build --platform ${{ inputs.platform }} --non-interactive --no-wait"); toast("success", "Copied!"); }}
                      className="absolute top-2 right-2 text-[10px] text-amber-600 hover:text-amber-800 cursor-pointer"
                    >Copy</button>
{`name: EAS Build
on:
  workflow_dispatch:
    inputs:
      platform:
        ...

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout, setup node, expo
      - npm install
      - eas build --platform ...`}
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText("name: EAS Build\non:\n  workflow_dispatch:\n    inputs:\n      platform:\n        description: Platform to build for\n        required: true\n        type: choice\n        options:\n          - android\n          - ios\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - name: Setup Expo and EAS\n        uses: expo/expo-github-action@v8\n        with:\n          eas-version: latest\n          token: ${{ secrets.EXPO_TOKEN }}\n      - name: Install dependencies\n        run: npm install\n      - name: Build\n        run: eas build --platform ${{ inputs.platform }} --non-interactive --no-wait"); toast("success", "Copied full file!"); }}
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium mt-1 cursor-pointer"
                  >
                    Copy full workflow file
                  </button>
                </div>

                <div>
                  <p className="font-medium text-surface-800 mb-1">Step 4: Add your Expo token as a GitHub Secret</p>
                  <p className="text-xs text-surface-600">Go to your repo → Settings → Secrets → Actions → New secret</p>
                  <p className="text-xs text-surface-600">Name: <code className="bg-white px-1 py-0.5 rounded border border-amber-200">EXPO_TOKEN</code> — Value: your EAS token from Shippabel Settings</p>
                </div>

                <div className="pt-2">
                  <Button size="sm" onClick={() => window.location.reload()} className="gap-1.5">
                    <Rocket className="h-3.5 w-3.5" />
                    I've done this — retry build
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step content */}
      {currentStep === "review" && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-1">Ready to publish?</h3>
            <p className="text-sm text-surface-500 mb-4">Let's make sure everything is in order before we build your app.</p>
            <div className="space-y-3">
              <CheckItem
                label="No critical issues"
                checked={scan != null && scan.summary.critical === 0}
                link={`/scan/${id}`}
                linkText="View scan report"
              />
              <CheckItem
                label="Store listing created"
                checked={hasListing}
                link={`/app/${id}/listing`}
                linkText="Create listing"
              />
              <CheckItem
                label="Screenshots uploaded"
                checked={hasScreenshots}
                link={`/app/${id}/screenshots`}
                linkText="Upload screenshots"
              />
              <CheckItem
                label={`Readiness score: ${scan?.score ?? 0}/100`}
                checked={(scan?.score ?? 0) >= 60}
              />
            </div>
          </Card>

          {scan && scan.summary.critical > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">
                You have {scan.summary.critical} critical issue{scan.summary.critical > 1 ? "s" : ""} that must be fixed before building.{" "}
                <Link to={`/scan/${id}`} className="underline hover:text-red-600">
                  View report
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {currentStep === "configure" && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-surface-900 mb-4">Build Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Platform</label>
                <p className="text-sm text-surface-900">{platform === "ios" ? "iOS (App Store)" : "Android (Google Play)"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Build Type</label>
                <p className="text-sm text-surface-900">Ready for the store</p>
                <p className="text-xs text-surface-500 mt-1">
                  We'll create the final version of your app that can be published
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1">Repository</label>
                <p className="text-sm text-surface-400">{project?.repo_url ?? "No repo linked"}</p>
              </div>
            </div>
          </Card>

          {platform === "ios" && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">Apple Developer Account Required</h4>
                  <p className="text-xs text-surface-400">
                    You need an Apple Developer account ($99/year) to build and submit iOS apps.
                    EAS will guide you through certificate setup during the first build.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {currentStep === "build" && (
        <div className="space-y-6">
          {submission && submission.build_status !== "idle" ? (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-4">Build Status</h3>
              <BuildStatusDisplay submission={submission} />

              {submission.build_status === "failed" && (
                <Button
                  onClick={async () => { const r = await triggerBuild(platform); if (r) toast("success", "Build started! This takes 10-20 minutes."); }}
                  disabled={building}
                  className="mt-4 gap-2"
                >
                  {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Retry build
                </Button>
              )}
            </Card>
          ) : (
            <Card className="text-center py-10">
              <Package className="h-12 w-12 text-surface-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Ready to build</h3>
              <p className="text-sm text-surface-400 mb-6 max-w-md mx-auto">
                We'll build your app for{" "}
                {platform === "ios" ? "iOS" : "Android"}. This usually takes 10-20 minutes. You can close this page and come back later.
              </p>
              <Button
                onClick={async () => { const r = await triggerBuild(platform); if (r) toast("success", "Build started! This takes 10-20 minutes."); }}
                disabled={building}
                className="gap-2"
              >
                {building ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting build...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Start {platform === "ios" ? "iOS" : "Android"} build
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>
      )}

      {currentStep === "submit" && (
        <div className="space-y-6">
          {submission?.build_status !== "completed" ? (
            <Card className="text-center py-10">
              <AlertCircle className="h-12 w-12 text-surface-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Build not ready</h3>
              <p className="text-sm text-surface-400">
                Complete the build step first before submitting to the store.
              </p>
            </Card>
          ) : submission.review_status !== "not_submitted" ? (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-4">Submission Status</h3>
              <ReviewStatusDisplay submission={submission} />
            </Card>
          ) : (
            <Card className="text-center py-10">
              <Send className="h-12 w-12 text-surface-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Submit to {platform === "ios" ? "App Store" : "Google Play"}</h3>
              <p className="text-sm text-surface-400 mb-6 max-w-md mx-auto">
                Your build is ready. We'll upload it along with your store listing and screenshots,
                then submit for review.
              </p>
              <Button
                onClick={async () => { if (submission) { await submitToStore(submission.id); toast("success", "Submitted! We'll track your review status."); } }}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit for review
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={currentStepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {currentStepIndex < steps.length - 1 && (
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
    </div>
  );
};

const CheckItem = ({
  label,
  checked,
  link,
  linkText,
}: {
  label: string;
  checked: boolean;
  link?: string;
  linkText?: string;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div
        className={`h-5 w-5 rounded-full flex items-center justify-center ${
          checked ? "bg-green-500" : "bg-surface-100 border border-surface-200"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className={`text-sm ${checked ? "text-surface-700" : "text-surface-500"}`}>
        {label}
      </span>
    </div>
    {!checked && link && (
      <Link to={link} className="text-xs text-surface-400 hover:text-surface-700">
        {linkText}
      </Link>
    )}
  </div>
);

const BuildStatusDisplay = ({ submission }: { submission: Submission }) => {
  const statusMap: Record<string, { label: string; color: string; animate?: boolean }> = {
    queued: { label: "Queued", color: "text-surface-500" },
    in_progress: { label: "Building...", color: "text-blue-600", animate: true },
    completed: { label: "Build Complete", color: "text-green-600" },
    failed: { label: "Build Failed", color: "text-red-600" },
  };

  const status = statusMap[submission.build_status] ?? statusMap["queued"]!;

  return (
    <div className="flex items-center gap-3">
      {status.animate ? (
        <Loader2 className={`h-5 w-5 ${status.color} animate-spin`} />
      ) : submission.build_status === "completed" ? (
        <Check className={`h-5 w-5 ${status.color}`} />
      ) : submission.build_status === "failed" ? (
        <AlertCircle className={`h-5 w-5 ${status.color}`} />
      ) : (
        <div className={`h-5 w-5 rounded-full border-2 ${status.color} border-current`} />
      )}
      <div>
        <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
        {submission.eas_build_id && (
          <p className="text-xs text-surface-500 mt-0.5">
            Build ID: {submission.eas_build_id}
          </p>
        )}
      </div>
    </div>
  );
};

const ReviewStatusDisplay = ({ submission }: { submission: Submission }) => {
  const statusMap: Record<string, { label: string; desc: string; color: string }> = {
    pending_credentials: {
      label: "Credentials Needed",
      desc: "Please configure your Apple/Google developer account credentials.",
      color: "text-amber-600",
    },
    waiting_for_review: {
      label: "Waiting for Review",
      desc: "Your app has been submitted and is in the review queue.",
      color: "text-blue-600",
    },
    in_review: {
      label: "In Review",
      desc: "A reviewer is currently looking at your app.",
      color: "text-blue-600",
    },
    approved: {
      label: "Approved!",
      desc: "Your app has been approved and is live on the store.",
      color: "text-green-600",
    },
    rejected: {
      label: "Rejected",
      desc: submission.rejection_reason ?? "Your app was rejected. Check the reason below.",
      color: "text-red-600",
    },
  };

  const status = statusMap[submission.review_status] ?? statusMap["waiting_for_review"]!;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {submission.review_status === "approved" ? (
          <Check className={`h-5 w-5 ${status.color}`} />
        ) : submission.review_status === "rejected" ? (
          <AlertCircle className={`h-5 w-5 ${status.color}`} />
        ) : (
          <Loader2 className={`h-5 w-5 ${status.color} animate-spin`} />
        )}
        <div>
          <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
          <p className="text-xs text-surface-400 mt-0.5">{status.desc}</p>
        </div>
      </div>

      {submission.submitted_at && (
        <p className="text-xs text-surface-500">
          Submitted: {new Date(submission.submitted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </div>
  );
};

// Re-export Submission type for sub-components
import type { Submission as _Submission } from "@/hooks/useBuild";
type Submission = _Submission;
