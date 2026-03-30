import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
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
import { useBuild } from "@/hooks/useBuild";
import { supabase } from "@/lib/supabase";
import type { Project, ScanResult } from "@/lib/types";

type WizardStep = "review" | "configure" | "build" | "submit";

const steps: { id: WizardStep; label: string; icon: typeof FileText }[] = [
  { id: "review", label: "Review", icon: FileText },
  { id: "configure", label: "Configure", icon: Wrench },
  { id: "build", label: "Build", icon: Package },
  { id: "submit", label: "Submit", icon: Send },
];

export const Submit = () => {
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState<WizardStep>("review");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [project, setProject] = useState<Project | null>(null);
  const [hasListing, setHasListing] = useState(false);
  const [hasScreenshots] = useState(false);
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

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProject = async () => {
    if (!id) return;

    const [projectRes, listingRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("store_listings").select("id").eq("project_id", id).eq("platform", platform),
    ]);

    if (projectRes.data) setProject(projectRes.data as Project);
    setHasListing((listingRes.data?.length ?? 0) > 0);
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
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const scan = project?.scan_result as ScanResult | null;

  return (
    <div>
    {id && <ShipFlowBar projectId={id} />}
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/scan/${id}`} className="text-surface-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Build & Submit</h1>
          <p className="text-surface-400 text-sm mt-1">
            Build your app and submit to the stores
          </p>
        </div>
      </div>

      {/* Platform selector */}
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

      {/* Step indicator */}
      <div className="flex items-center mb-10">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 cursor-pointer ${
                i <= currentStepIndex ? "text-white" : "text-surface-600"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < currentStepIndex
                    ? "bg-emerald-500 text-white"
                    : i === currentStepIndex
                    ? "bg-primary-600 text-white"
                    : "bg-surface-800 text-surface-500"
                }`}
              >
                {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < currentStepIndex ? "bg-emerald-500" : "bg-surface-800"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Step content */}
      {currentStep === "review" && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-4">Pre-flight Checklist</h3>
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
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-300">
                You have {scan.summary.critical} critical issue{scan.summary.critical > 1 ? "s" : ""} that must be fixed before building.{" "}
                <Link to={`/scan/${id}`} className="underline hover:text-red-200">
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
            <h3 className="font-semibold mb-4">Build Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Platform</label>
                <p className="text-sm text-white">{platform === "ios" ? "iOS (App Store)" : "Android (Google Play)"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Build Profile</label>
                <p className="text-sm text-white">Production</p>
                <p className="text-xs text-surface-500 mt-1">
                  Optimized, signed build ready for store submission
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Repository</label>
                <p className="text-sm text-primary-400">{project?.repo_url ?? "No repo linked"}</p>
              </div>
            </div>
          </Card>

          {platform === "ios" && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
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
              <h3 className="font-semibold mb-4">Build Status</h3>
              <BuildStatusDisplay submission={submission} />

              {submission.build_status === "failed" && (
                <Button
                  onClick={() => triggerBuild(platform)}
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
              <Package className="h-12 w-12 text-primary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to build</h3>
              <p className="text-sm text-surface-400 mb-6 max-w-md mx-auto">
                This will trigger a production build via EAS Build for{" "}
                {platform === "ios" ? "iOS" : "Android"}. The build typically takes 10-20 minutes.
              </p>
              <Button
                onClick={() => triggerBuild(platform)}
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
              <AlertCircle className="h-12 w-12 text-surface-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Build not ready</h3>
              <p className="text-sm text-surface-400">
                Complete the build step first before submitting to the store.
              </p>
            </Card>
          ) : submission.review_status !== "not_submitted" ? (
            <Card>
              <h3 className="font-semibold mb-4">Submission Status</h3>
              <ReviewStatusDisplay submission={submission} />
            </Card>
          ) : (
            <Card className="text-center py-10">
              <Send className="h-12 w-12 text-primary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Submit to {platform === "ios" ? "App Store" : "Google Play"}</h3>
              <p className="text-sm text-surface-400 mb-6 max-w-md mx-auto">
                Your build is ready. We'll upload it along with your store listing and screenshots,
                then submit for review.
              </p>
              <Button
                onClick={() => submission && submitToStore(submission.id)}
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
          checked ? "bg-emerald-500" : "bg-surface-800 border border-surface-700"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </div>
      <span className={`text-sm ${checked ? "text-surface-200" : "text-surface-500"}`}>
        {label}
      </span>
    </div>
    {!checked && link && (
      <Link to={link} className="text-xs text-primary-400 hover:text-primary-300">
        {linkText}
      </Link>
    )}
  </div>
);

const BuildStatusDisplay = ({ submission }: { submission: Submission }) => {
  const statusMap: Record<string, { label: string; color: string; animate?: boolean }> = {
    queued: { label: "Queued", color: "text-surface-400" },
    in_progress: { label: "Building...", color: "text-blue-400", animate: true },
    completed: { label: "Build Complete", color: "text-emerald-400" },
    failed: { label: "Build Failed", color: "text-red-400" },
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
      color: "text-amber-400",
    },
    waiting_for_review: {
      label: "Waiting for Review",
      desc: "Your app has been submitted and is in the review queue.",
      color: "text-blue-400",
    },
    in_review: {
      label: "In Review",
      desc: "A reviewer is currently looking at your app.",
      color: "text-blue-400",
    },
    approved: {
      label: "Approved!",
      desc: "Your app has been approved and is live on the store.",
      color: "text-emerald-400",
    },
    rejected: {
      label: "Rejected",
      desc: submission.rejection_reason ?? "Your app was rejected. Check the reason below.",
      color: "text-red-400",
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
          Submitted: {new Date(submission.submitted_at).toLocaleString()}
        </p>
      )}
    </div>
  );
};

// Re-export Submission type for sub-components
import type { Submission as _Submission } from "@/hooks/useBuild";
type Submission = _Submission;
