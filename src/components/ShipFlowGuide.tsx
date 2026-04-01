import { Link } from "react-router-dom";
import {
  ArrowRight,
  Scan,
  Wrench,
  UserPlus,
  FileText,
  ImageIcon,
  Link2,
  Package,
  Send,
  Check,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useShipFlow, type FlowStep } from "@/hooks/useShipFlow";

const stepIcons: Record<FlowStep, typeof Scan> = {
  scan: Scan,
  fix: Wrench,
  signup: UserPlus,
  listing: FileText,
  screenshots: ImageIcon,
  connect: Link2,
  build: Package,
  submit: Send,
};

const stepColors: Record<FlowStep, string> = {
  scan: "text-blue-400 bg-blue-500/10",
  fix: "text-amber-400 bg-amber-500/10",
  signup: "text-surface-600 bg-surface-100",
  listing: "text-green-400 bg-green-500/10",
  screenshots: "text-pink-400 bg-pink-500/10",
  connect: "text-cyan-400 bg-cyan-500/10",
  build: "text-orange-400 bg-orange-500/10",
  submit: "text-green-400 bg-green-500/10",
};

const stepRoutes: Record<FlowStep, (id: string) => string> = {
  scan: () => "/scan",
  fix: (id) => `/scan/${id}`,
  signup: () => "/login",
  listing: (id) => `/app/${id}/listing`,
  screenshots: (id) => `/app/${id}/screenshots`,
  connect: () => "/settings",
  build: (id) => `/app/${id}/submit`,
  submit: (id) => `/app/${id}/submit`,
};

const stepGuides: Record<FlowStep, { title: string; body: string; cta: string; helpLinks?: { label: string; url: string }[] }> = {
  scan: {
    title: "Scan your app",
    body: "Paste your GitHub URL or upload a zip file. We'll check your Expo project against every App Store and Google Play requirement in about 30 seconds.",
    cta: "Go to scanner",
  },
  fix: {
    title: "Fix the issues we found",
    body: "Your scan found critical issues that will block your submission. Click 'Auto-fix' above to let us fix what we can automatically, then handle the rest manually (like creating an app icon).",
    cta: "Scroll to issues",
  },
  signup: {
    title: "Create your account",
    body: "Sign up to save your progress and unlock store listing generation, screenshots, and submission. It's quick — just enter your email.",
    cta: "Sign up",
  },
  listing: {
    title: "Generate your store listing",
    body: "Our AI will analyze your app and write 3 variants of your store copy — app name, subtitle, description, and keywords. Pick one, tweak it, and save. We'll also generate and host a privacy policy for you.",
    cta: "Generate listing",
  },
  screenshots: {
    title: "Create store screenshots",
    body: "Upload screenshots from your phone, pick a device frame (iPhone 16 Pro, Pixel 9, iPad), add captions, and download properly sized images for both stores.",
    cta: "Create screenshots",
  },
  connect: {
    title: "Connect your developer accounts",
    body: "To build and submit, we need access to your Expo, Apple, and Google developer accounts. Follow the guides below to get your credentials.",
    cta: "Go to settings",
    helpLinks: [
      { label: "How to get an EAS access token", url: "https://docs.expo.dev/accounts/programmatic-access/" },
      { label: "How to create an Apple API key", url: "https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api" },
      { label: "How to set up Google Play service account", url: "https://developers.google.com/android-publisher/getting_started" },
    ],
  },
  build: {
    title: "Build your app",
    body: "We'll trigger a production build via Expo EAS. This creates a signed IPA (iOS) or AAB (Android) ready for store submission. Builds take 10-20 minutes.",
    cta: "Start build",
  },
  submit: {
    title: "Submit to the stores",
    body: "Your build is ready. We'll upload the binary, set your store listing metadata, and submit for review. Apple reviews take 1-3 days, Google Play takes hours to days.",
    cta: "Submit for review",
  },
};

export const ShipFlowGuide = ({ projectId }: { projectId: string }) => {
  const { steps, currentStep } = useShipFlow(projectId);

  const current = steps.find((s) => s.id === currentStep);
  if (!current) return null;

  const guide = stepGuides[currentStep];
  const Icon = stepIcons[currentStep];
  const colorClass = stepColors[currentStep];
  const route = stepRoutes[currentStep](projectId);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-primary-500/20 bg-gradient-to-b from-primary-500/5 to-transparent">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-surface-400">
          Step {steps.findIndex((s) => s.id === currentStep) + 1} of {steps.length}
        </span>
        <span className="text-xs text-surface-500">{progress}% complete</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-100 mb-6">
        <div
          className="h-full rounded-full bg-surface-900 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step guide */}
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 shrink-0 ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{guide.title}</h3>
          <p className="text-sm text-surface-400 leading-relaxed mb-4">{guide.body}</p>

          {guide.helpLinks && (
            <div className="space-y-1.5 mb-4">
              {guide.helpLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {currentStep === "fix" ? (
            <Button size="sm" className="gap-2" onClick={() => document.getElementById("issues-section")?.scrollIntoView({ behavior: "smooth" })}>
              {guide.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Link to={route}>
              <Button size="sm" className="gap-2">
                {guide.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mini step overview */}
      <div className="mt-6 pt-4 border-t border-surface-200">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {steps.map((step) => {
            const StepIcon = stepIcons[step.id];
            return (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1"
                title={step.label}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center ${
                    step.completed
                      ? "bg-green-500/20 text-green-400"
                      : step.id === currentStep
                      ? "bg-surface-900 text-white"
                      : step.available
                      ? "bg-surface-100 text-surface-500"
                      : "bg-surface-50 text-surface-400"
                  }`}
                >
                  {step.completed ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : !step.available ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="text-[9px] text-surface-600 text-center leading-tight">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
