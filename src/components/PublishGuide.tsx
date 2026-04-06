import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Smartphone,
  Apple,
  Download,
  Upload,
  Shield,
  Users,
  FileText,
  Star,
  Loader2,
  Zap,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublishGuideProps {
  platform: "ios" | "android";
  buildUrl?: string | null;
  appName?: string;
  packageName?: string;
  hasCredentials?: boolean;
  onAutoSubmit?: () => Promise<void>;
  autoSubmitting?: boolean;
  submissionStatus?: string | null;
}

type StepId =
  | "create-app"
  | "content-rating"
  | "data-safety"
  | "target-audience"
  | "download-build"
  | "upload-publish";

interface GuideStep {
  id: StepId;
  title: string;
  timeEstimate: string;
  icon: typeof FileText;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const androidSteps: GuideStep[] = [
  { id: "create-app", title: "Create your app in Google Play", timeEstimate: "1 min", icon: Smartphone },
  { id: "content-rating", title: "Fill in the content rating", timeEstimate: "2 min", icon: Star },
  { id: "data-safety", title: "Fill in data safety", timeEstimate: "2 min", icon: Shield },
  { id: "target-audience", title: "Set target audience", timeEstimate: "1 min", icon: Users },
  { id: "download-build", title: "Download your app file", timeEstimate: "1 min", icon: Download },
  { id: "upload-publish", title: "Upload and publish", timeEstimate: "2 min", icon: Upload },
];

const iosSteps: GuideStep[] = [
  { id: "create-app", title: "Create your app in App Store Connect", timeEstimate: "2 min", icon: Apple },
  { id: "download-build", title: "Download your app file", timeEstimate: "1 min", icon: Download },
  { id: "upload-publish", title: "Upload and submit for review", timeEstimate: "3 min", icon: Upload },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PublishGuide = ({
  platform,
  buildUrl,
  appName,
  packageName,
  hasCredentials,
  onAutoSubmit,
  autoSubmitting,
  submissionStatus,
}: PublishGuideProps) => {
  const steps = platform === "android" ? androidSteps : iosSteps;
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [expandedStep, setExpandedStep] = useState<StepId>(steps[0]!.id);
  const [showManualGuide, setShowManualGuide] = useState(!hasCredentials);
  const { toast } = useToast();

  const markDone = (id: StepId) => {
    const next = new Set(completedSteps);
    next.add(id);
    setCompletedSteps(next);
    // Auto-advance to next uncompleted step
    const nextStep = steps.find((s) => !next.has(s.id));
    if (nextStep) setExpandedStep(nextStep.id);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast("success", `Copied ${label}!`);
  };

  const progress = Math.round((completedSteps.size / steps.length) * 100);

  const displayName = appName || "My App";
  const displayPackage = packageName || "com.yourname.yourapp";

  // If auto-submit is in progress or completed, show status
  if (submissionStatus && submissionStatus !== "not_submitted") {
    return (
      <Card className="text-center py-8 border-green-200 bg-green-50">
        <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          {submissionStatus === "waiting_for_review" || submissionStatus === "in_review" ? (
            <Loader2 className="h-7 w-7 text-green-600 animate-spin" />
          ) : submissionStatus === "approved" ? (
            <Check className="h-7 w-7 text-green-600" />
          ) : (
            <Zap className="h-7 w-7 text-green-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-surface-900 mb-2">
          {submissionStatus === "approved"
            ? "Your app is live!"
            : submissionStatus === "waiting_for_review"
            ? "Submitted for review"
            : submissionStatus === "in_review"
            ? "In review"
            : "Submitted"}
        </h3>
        <p className="text-sm text-surface-500 max-w-md mx-auto">
          {submissionStatus === "approved"
            ? `Your app is live on the ${platform === "ios" ? "App Store" : "Google Play Store"}!`
            : platform === "android"
            ? "Google usually reviews new apps in a few hours to a few days. We'll update this page automatically."
            : "Apple usually reviews apps in 1-3 business days. We'll update this page automatically."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-submit option */}
      {hasCredentials && onAutoSubmit && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900 mb-1">Automatic submission available</h3>
              <p className="text-xs text-surface-500 mb-3">
                Your {platform === "ios" ? "Apple" : "Google Play"} credentials are connected. We can upload your app and
                store listing automatically — no manual steps needed.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={onAutoSubmit}
                  disabled={autoSubmitting}
                  className="gap-1.5"
                >
                  {autoSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      Submit automatically
                    </>
                  )}
                </Button>
                <button
                  onClick={() => setShowManualGuide(!showManualGuide)}
                  className="text-xs text-surface-500 hover:text-surface-700 cursor-pointer"
                >
                  {showManualGuide ? "Hide manual guide" : "I'd rather do it manually"}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No credentials — prompt to connect */}
      {!hasCredentials && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-surface-900 mb-1">
                Want us to submit for you?
              </h3>
              <p className="text-xs text-surface-500 mb-2">
                Connect your {platform === "ios" ? "Apple Developer" : "Google Play"} account in Settings and we'll
                handle the upload and metadata automatically. Or follow the manual steps below.
              </p>
              <Link to="/settings">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <Settings className="h-3 w-3" />
                  Go to Settings
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Manual guide (always shown if no credentials, toggleable if has credentials) */}
      {showManualGuide && (
        <>

      {/* Progress header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-surface-900">
            {hasCredentials ? "Manual guide" : `Publish to ${platform === "ios" ? "App Store" : "Google Play"}`}
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Follow each step below. We'll walk you through everything.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-surface-700">{completedSteps.size}/{steps.length} done</p>
          <p className="text-xs text-surface-400">~{platform === "android" ? "9" : "6"} min total</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = completedSteps.has(step.id);
          const isExpanded = expandedStep === step.id;
          const Icon = step.icon;

          return (
            <Card key={step.id} className={`transition-all ${done ? "opacity-60" : ""}`}>
              {/* Step header — always visible */}
              <button
                onClick={() => setExpandedStep(isExpanded ? step.id : step.id)}
                className="w-full flex items-center gap-3 cursor-pointer"
              >
                {/* Number / check */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    done
                      ? "bg-green-500 text-white"
                      : isExpanded
                      ? "bg-surface-900 text-white"
                      : "bg-surface-100 text-surface-500"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>

                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${done ? "text-surface-500 line-through" : "text-surface-900"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-surface-400">{step.timeEstimate}</p>
                </div>

                <Icon className="h-4 w-4 text-surface-400 shrink-0 mr-1" />
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-surface-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-surface-400 shrink-0" />
                )}
              </button>

              {/* Step content — expanded only */}
              {isExpanded && !done && (
                <div className="mt-4 pt-4 border-t border-surface-100">
                  {platform === "android" ? (
                    <AndroidStepContent
                      stepId={step.id}
                      onDone={() => markDone(step.id)}
                      copy={copy}
                      appName={displayName}
                      buildUrl={buildUrl}
                    />
                  ) : (
                    <IosStepContent
                      stepId={step.id}
                      onDone={() => markDone(step.id)}
                      copy={copy}
                      appName={displayName}
                      packageName={displayPackage}
                      buildUrl={buildUrl}
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* All done */}
      {completedSteps.size === steps.length && (
        <Card className="text-center py-8 border-green-200 bg-green-50">
          <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-surface-900 mb-2">You did it!</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto">
            {platform === "android"
              ? "Your app is submitted to Google Play. Google usually reviews new apps in a few hours to a few days. You'll get an email when it's approved."
              : "Your app is submitted to Apple. Apple usually reviews apps in 1-3 business days. You'll get an email when it's approved."}
          </p>
        </Card>
      )}

      </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Android step content
// ---------------------------------------------------------------------------

const AndroidStepContent = ({
  stepId,
  onDone,
  copy,
  appName,
  buildUrl,
}: {
  stepId: StepId;
  onDone: () => void;
  copy: (text: string, label: string) => void;
  appName: string;
  buildUrl?: string | null;
}) => {
  switch (stepId) {
    case "create-app":
      return (
        <div className="space-y-4 text-sm">
          <Instruction step={1}>
            <p>
              Open Google Play Console.
              If you don't have an account yet, create one first ($25 one-time fee).
            </p>
            <ExternalButton href="https://play.google.com/console" label="Open Google Play Console" />
          </Instruction>

          <Instruction step={2}>
            <p>
              Click the blue <Strong>"Create app"</Strong> button in the top right corner.
            </p>
          </Instruction>

          <Instruction step={3}>
            <p>Fill in these fields:</p>
            <FieldGuide label="App name" value={appName} onCopy={() => copy(appName, "app name")} />
            <FieldGuide label="Default language" value="English (United States)" />
            <FieldGuide label="App or game" value="App" />
            <FieldGuide label="Free or paid" value="Free" />
          </Instruction>

          <Instruction step={4}>
            <p>Check all the boxes at the bottom (developer policies) and click <Strong>"Create app"</Strong>.</p>
          </Instruction>

          <DoneButton onClick={onDone} label="I created the app" />
        </div>
      );

    case "content-rating":
      return (
        <div className="space-y-4 text-sm">
          <HelpBox>
            Google needs to know what type of content your app has to give it an age rating (like movie ratings).
            Most simple apps get an "Everyone" rating.
          </HelpBox>

          <Instruction step={1}>
            <p>In your app's dashboard, go to the left sidebar:</p>
            <p className="font-medium text-surface-800 mt-1">
              Policy and programs → App content → Content rating → <Strong>Start</Strong>
            </p>
          </Instruction>

          <Instruction step={2}>
            <p>Enter your email address and click <Strong>"Next"</Strong>.</p>
          </Instruction>

          <Instruction step={3}>
            <p>Select your app category. For most apps, choose:</p>
            <FieldGuide label="Category" value="Utility, Productivity, Communication, or Other" />
          </Instruction>

          <Instruction step={4}>
            <p>Answer the questionnaire. For most simple apps, answer <Strong>"No"</Strong> to everything:</p>
            <div className="rounded-lg bg-surface-50 border border-surface-200 p-3 space-y-2 mt-2">
              <QuestionAnswer q="Does the app contain violence?" a="No" />
              <QuestionAnswer q="Does the app contain sexual content?" a="No" />
              <QuestionAnswer q="Does the app contain profanity?" a="No" />
              <QuestionAnswer q="Does the app contain drug references?" a="No" />
              <QuestionAnswer q="Does the app allow user interaction?" a="No (unless your app has chat/social features)" />
              <QuestionAnswer q="Does the app share user location?" a="No (unless your app uses GPS)" />
              <QuestionAnswer q="Can users purchase digital content?" a="No (unless your app has in-app purchases)" />
            </div>
          </Instruction>

          <Instruction step={5}>
            <p>Click <Strong>"Save"</Strong> and then <Strong>"Next"</Strong>. Review your rating and click <Strong>"Submit"</Strong>.</p>
          </Instruction>

          <DoneButton onClick={onDone} label="I submitted the content rating" />
        </div>
      );

    case "data-safety":
      return (
        <div className="space-y-4 text-sm">
          <HelpBox>
            Google wants to know what data your app collects from users.
            Be honest — lying here can get your app removed later.
          </HelpBox>

          <Instruction step={1}>
            <p>In the left sidebar, go to:</p>
            <p className="font-medium text-surface-800 mt-1">
              Policy and programs → App content → Data safety → <Strong>Start</Strong>
            </p>
          </Instruction>

          <Instruction step={2}>
            <p>Answer these questions:</p>
            <div className="rounded-lg bg-surface-50 border border-surface-200 p-3 space-y-2 mt-2">
              <QuestionAnswer
                q="Does your app collect or share user data?"
                a="Choose 'Yes' if your app has login, analytics, or stores any user info. Choose 'No' if it works completely offline with no accounts."
              />
              <QuestionAnswer
                q="Is all data encrypted in transit?"
                a="Yes (if you use HTTPS, which is standard)"
              />
              <QuestionAnswer
                q="Can users request data deletion?"
                a="Yes (if you have user accounts, you must offer this)"
              />
            </div>
          </Instruction>

          <Instruction step={3}>
            <p>If your app <Strong>does</Strong> collect data, select which types:</p>
            <div className="rounded-lg bg-surface-50 border border-surface-200 p-3 space-y-1 mt-2 text-xs">
              <p><Strong>Has login?</Strong> → Check "Personal info" (name, email)</p>
              <p><Strong>Uses analytics?</Strong> → Check "App activity" and "Diagnostics"</p>
              <p><Strong>Shows ads?</Strong> → Check "Device or other IDs"</p>
              <p><Strong>Uses location?</Strong> → Check "Location"</p>
              <p><Strong>Takes photos?</Strong> → Check "Photos and videos"</p>
            </div>
          </Instruction>

          <Instruction step={4}>
            <p>Click <Strong>"Save"</Strong> and then <Strong>"Submit"</Strong>.</p>
          </Instruction>

          <DoneButton onClick={onDone} label="I submitted data safety" />
        </div>
      );

    case "target-audience":
      return (
        <div className="space-y-4 text-sm">
          <HelpBox>
            Google needs to know who your app is for. This affects which rules apply to your app.
          </HelpBox>

          <Instruction step={1}>
            <p>In the left sidebar, go to:</p>
            <p className="font-medium text-surface-800 mt-1">
              Policy and programs → App content → Target audience → <Strong>Start</Strong>
            </p>
          </Instruction>

          <Instruction step={2}>
            <p>Select the age group for your app:</p>
            <FieldGuide
              label="Target age"
              value="Select '18 and over' unless your app is specifically made for children"
            />
            <p className="text-xs text-amber-700 mt-2">
              Important: If you select any age under 13, your app must follow strict children's privacy rules (COPPA).
              Only select this if your app is truly built for kids.
            </p>
          </Instruction>

          <Instruction step={3}>
            <p>Click <Strong>"Next"</Strong> and then <Strong>"Save"</Strong>.</p>
          </Instruction>

          <DoneButton onClick={onDone} label="I set the target audience" />
        </div>
      );

    case "download-build":
      return (
        <div className="space-y-4 text-sm">
          <Instruction step={1}>
            <p>Go to your GitHub Actions page and find the latest successful build.</p>
            {buildUrl ? (
              <ExternalButton href={buildUrl} label="Open GitHub Actions" />
            ) : (
              <p className="text-xs text-surface-400 mt-1">
                The link to your build will appear here once the build is complete.
              </p>
            )}
          </Instruction>

          <Instruction step={2}>
            <p>
              Scroll down to <Strong>"Artifacts"</Strong> at the bottom of the build page.
              Download the file called <Strong>app-release-aab</Strong> (or app-release-apk).
            </p>
            <p className="text-xs text-surface-400 mt-1">
              The .aab file is what Google Play needs. It's a zip — don't unzip it.
            </p>
          </Instruction>

          <DoneButton onClick={onDone} label="I downloaded the file" />
        </div>
      );

    case "upload-publish":
      return (
        <div className="space-y-4 text-sm">
          <Instruction step={1}>
            <p>In Google Play Console, go to your app and click:</p>
            <p className="font-medium text-surface-800 mt-1">
              Release → Production → <Strong>"Create new release"</Strong>
            </p>
          </Instruction>

          <Instruction step={2}>
            <p>
              Google will ask about app signing. Click <Strong>"Continue"</Strong> to let Google manage signing
              (this is the easiest option).
            </p>
          </Instruction>

          <Instruction step={3}>
            <p>
              Click <Strong>"Upload"</Strong> and select the .aab file you just downloaded.
              Wait for it to finish uploading.
            </p>
          </Instruction>

          <Instruction step={4}>
            <p>Fill in release notes (what's new in this version):</p>
            <FieldGuide label="Release notes" value="Initial release" onCopy={() => copy("Initial release", "release notes")} />
          </Instruction>

          <Instruction step={5}>
            <p>
              Click <Strong>"Review release"</Strong> at the bottom. Review everything, then click{" "}
              <Strong>"Start rollout to Production"</Strong>.
            </p>
          </Instruction>

          <Instruction step={6}>
            <p>
              A popup will ask you to confirm. Click <Strong>"Rollout"</Strong>. That's it — your app is submitted!
            </p>
          </Instruction>

          <DoneButton onClick={onDone} label="I submitted my app!" />
        </div>
      );

    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// iOS step content
// ---------------------------------------------------------------------------

const IosStepContent = ({
  stepId,
  onDone,
  copy,
  appName,
  packageName,
  buildUrl,
}: {
  stepId: StepId;
  onDone: () => void;
  copy: (text: string, label: string) => void;
  appName: string;
  packageName: string;
  buildUrl?: string | null;
}) => {
  switch (stepId) {
    case "create-app":
      return (
        <div className="space-y-4 text-sm">
          <Instruction step={1}>
            <p>
              Open App Store Connect. You need an Apple Developer account ($99/year).
            </p>
            <ExternalButton href="https://appstoreconnect.apple.com" label="Open App Store Connect" />
          </Instruction>

          <Instruction step={2}>
            <p>
              Click <Strong>"My Apps"</Strong> and then the <Strong>"+"</Strong> button → <Strong>"New App"</Strong>.
            </p>
          </Instruction>

          <Instruction step={3}>
            <p>Fill in these fields:</p>
            <FieldGuide label="Platform" value="iOS" />
            <FieldGuide label="Name" value={appName} onCopy={() => copy(appName, "app name")} />
            <FieldGuide label="Primary language" value="English (U.S.)" />
            <FieldGuide label="Bundle ID" value={packageName} onCopy={() => copy(packageName, "bundle ID")} />
            <FieldGuide label="SKU" value={packageName.replace(/\./g, "-")} onCopy={() => copy(packageName.replace(/\./g, "-"), "SKU")} />
          </Instruction>

          <Instruction step={4}>
            <p>Click <Strong>"Create"</Strong>. Your app page will open.</p>
          </Instruction>

          <Instruction step={5}>
            <p>On the app page, fill in:</p>
            <div className="rounded-lg bg-surface-50 border border-surface-200 p-3 space-y-1 mt-2 text-xs">
              <p><Strong>Privacy Policy URL</Strong> — paste your privacy policy link</p>
              <p><Strong>Category</Strong> — pick the best match for your app</p>
              <p><Strong>Age Rating</Strong> — click "Edit" and answer the questions (same as Google: answer "No" to everything for simple apps)</p>
              <p><Strong>Description</Strong> — paste your store listing description</p>
              <p><Strong>Keywords</Strong> — paste your keywords</p>
              <p><Strong>Screenshots</Strong> — upload the screenshots you created earlier</p>
            </div>
          </Instruction>

          <DoneButton onClick={onDone} label="I created the app" />
        </div>
      );

    case "download-build":
      return (
        <div className="space-y-4 text-sm">
          <Instruction step={1}>
            <p>Go to your GitHub Actions page and find the latest successful build.</p>
            {buildUrl ? (
              <ExternalButton href={buildUrl} label="Open GitHub Actions" />
            ) : (
              <p className="text-xs text-surface-400 mt-1">
                The link to your build will appear here once the build is complete.
              </p>
            )}
          </Instruction>

          <Instruction step={2}>
            <p>
              Scroll down to <Strong>"Artifacts"</Strong> at the bottom of the build page.
              Download the <Strong>.ipa</Strong> file.
            </p>
          </Instruction>

          <DoneButton onClick={onDone} label="I downloaded the file" />
        </div>
      );

    case "upload-publish":
      return (
        <div className="space-y-4 text-sm">
          <HelpBox>
            Apple requires you to upload your app using their Transporter app (free on the Mac App Store).
            If you don't have a Mac, you can use a cloud Mac service.
          </HelpBox>

          <Instruction step={1}>
            <p>Download and open <Strong>Transporter</Strong> from the Mac App Store.</p>
            <ExternalButton href="https://apps.apple.com/app/transporter/id1450874784" label="Get Transporter (free)" />
          </Instruction>

          <Instruction step={2}>
            <p>
              Sign in with your Apple Developer account. Then drag and drop your <Strong>.ipa file</Strong> into Transporter.
            </p>
          </Instruction>

          <Instruction step={3}>
            <p>Click <Strong>"Deliver"</Strong>. Wait for the upload to finish (usually 2-5 minutes).</p>
          </Instruction>

          <Instruction step={4}>
            <p>
              Go back to App Store Connect. Under your app, go to the <Strong>"Build"</Strong> section.
              Your build will appear after ~10 minutes of processing.
            </p>
            <p className="text-xs text-surface-400 mt-1">
              If you don't see it right away, wait 10-15 minutes and refresh.
            </p>
          </Instruction>

          <Instruction step={5}>
            <p>
              Select the build, then scroll to the top and click <Strong>"Submit for Review"</Strong>.
            </p>
          </Instruction>

          <DoneButton onClick={onDone} label="I submitted my app!" />
        </div>
      );

    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

const Instruction = ({ step, children }: { step: number; children: React.ReactNode }) => (
  <div className="flex gap-3 items-start">
    <div className="h-6 w-6 rounded-full bg-surface-100 text-surface-600 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
      {step}
    </div>
    <div className="flex-1 space-y-1.5 text-surface-700">{children}</div>
  </div>
);

const Strong = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-surface-900">{children}</span>
);

const HelpBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-800">
    {children}
  </div>
);

const FieldGuide = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) => (
  <div className="flex items-center justify-between rounded-lg bg-surface-50 border border-surface-200 px-3 py-2 mt-1.5">
    <div>
      <p className="text-xs text-surface-400">{label}</p>
      <p className="text-sm font-medium text-surface-900">{value}</p>
    </div>
    {onCopy && (
      <button onClick={onCopy} className="text-surface-400 hover:text-surface-700 cursor-pointer p-1">
        <Copy className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const QuestionAnswer = ({ q, a }: { q: string; a: string }) => (
  <div className="flex items-start gap-2">
    <div className="shrink-0 mt-0.5 h-4 w-4 rounded-sm bg-surface-200 flex items-center justify-center">
      <Check className="h-2.5 w-2.5 text-surface-600" />
    </div>
    <div>
      <p className="text-xs text-surface-700">{q}</p>
      <p className="text-xs font-medium text-green-700">→ {a}</p>
    </div>
  </div>
);

const ExternalButton = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-green-700 hover:text-green-800 underline underline-offset-2"
  >
    {label} <ExternalLink className="h-3 w-3" />
  </a>
);

const DoneButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <div className="pt-2">
    <Button size="sm" onClick={onClick} className="gap-1.5">
      <Check className="h-3.5 w-3.5" />
      {label}
    </Button>
  </div>
);
