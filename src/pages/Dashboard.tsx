import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Rocket,
  Scan,
  Loader2,
  Plus,
  CheckCircle2,
  ArrowRight,
  Wrench,
  FileText,
  Send,
  Settings,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Project, ScanResult } from "@/lib/types";

interface AppStep {
  key: string;
  label: string;
  icon: typeof CheckCircle2;
  done: boolean;
  active: boolean;
  href: string;
  actionLabel: string;
}

const getSteps = (project: Project): AppStep[] => {
  const scan = project.scan_result as ScanResult | null;
  const scanned = !!scan;
  const hasCritical = (scan?.summary?.critical ?? 0) > 0;
  const fixed = scanned && !hasCritical;
  const status = project.status;
  const hasListing = status === "building" || status === "submitted" || status === "live";
  const isBuilt = status === "submitted" || status === "live";
  const isLive = status === "live";

  return [
    { key: "check", label: "Check", icon: Scan, done: scanned, active: !scanned, href: `/scan/${project.id}`, actionLabel: "See results" },
    { key: "fix", label: "Fix", icon: Wrench, done: fixed, active: scanned && !fixed, href: `/scan/${project.id}`, actionLabel: hasCritical ? `Fix ${scan?.summary?.critical} problems` : "All fixed" },
    { key: "listing", label: "Store page", icon: FileText, done: hasListing, active: fixed && !hasListing, href: `/app/${project.id}/listing`, actionLabel: "Write store page" },
    { key: "publish", label: "Publish", icon: Send, done: isLive, active: hasListing && !isLive, href: isBuilt ? `/app/${project.id}/status` : `/app/${project.id}/submit`, actionLabel: isBuilt ? "Track review" : "Publish app" },
  ];
};

export const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setProjects((data ?? []) as Project[]);
    } catch {
      // Silently fail — show empty state
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    loadProjects();
  }, [user, authLoading, navigate, loadProjects]);

  if (authLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-surface-400 animate-spin" /></div>;
  }

  if (loading && user) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-surface-400 animate-spin" /></div>;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const hasApps = projects.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">

      {/* Welcome header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-surface-500 text-sm mt-2">
          {hasApps
            ? `You have ${projects.length} app${projects.length > 1 ? "s" : ""} — keep going!`
            : "Let's get your app on the App Store."}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Check new app", icon: Plus, href: "/scan", accent: true },
          { label: "My settings", icon: Settings, href: "/settings", accent: false },
          { label: "Pricing", icon: Sparkles, href: "/pricing", accent: false },
          { label: "How it works", icon: HelpCircle, href: "/#how-it-works", accent: false },
        ].map((action) => (
          <Link key={action.label} to={action.href}>
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors cursor-pointer border ${
              action.accent
                ? "border-surface-900 bg-surface-900 text-white hover:bg-surface-800"
                : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"
            }`}>
              <action.icon className="h-4 w-4 shrink-0" />
              {action.label}
            </div>
          </Link>
        ))}
      </div>

      {/* First time user — big onboarding card */}
      {!hasApps && (
        <Card className="mb-10 p-0 overflow-hidden">
          <div className="p-10 sm:p-12">
            <div className="max-w-lg">
              <Rocket className="h-9 w-9 text-surface-900 mb-5" />
              <h2 className="text-xl sm:text-2xl font-semibold text-surface-900 mb-3">Get your app in the store</h2>
              <p className="text-surface-500 text-sm leading-relaxed mb-8">
                Here's how it works — it only takes a few minutes:
              </p>

              <div className="space-y-5 mb-10">
                {[
                  { num: "1", title: "Check your app", desc: "Paste your GitHub link or upload a zip. We'll check everything in 30 seconds." },
                  { num: "2", title: "We fix the problems", desc: "Most issues get fixed automatically with one click. No coding needed." },
                  { num: "3", title: "Write your store page", desc: "AI creates your app name, description, keywords, and privacy policy." },
                  { num: "4", title: "Go live", desc: "We build your app and submit it to the App Store and Google Play." },
                ].map((step) => (
                  <div key={step.num} className="flex items-start gap-4">
                    <div className="h-7 w-7 rounded-full bg-surface-100 text-surface-600 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-surface-900">{step.title}</h4>
                      <p className="text-xs text-surface-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/scan">
                <Button size="lg" className="gap-2">
                  Check my app now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Apps section */}
      {hasApps && (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-900">My Apps</h2>
            <Link to="/scan">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New app
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {projects.map((project) => {
              const steps = getSteps(project);
              const score = project.scan_result?.score;
              const activeStep = steps.find((s) => s.active);
              const completedCount = steps.filter((s) => s.done).length;
              const progress = (completedCount / steps.length) * 100;

              return (
                <Card key={project.id} className="p-0 overflow-hidden">
                  {/* Progress bar */}
                  <div className="h-1 bg-surface-100">
                    <div className="h-full bg-surface-900 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="p-6 sm:p-7">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        {score != null && (
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-semibold shrink-0 ${
                            score >= 80 ? "bg-green-50 text-green-700" : score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                          }`}>{score}</div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-surface-900 truncate text-lg">{project.name}</h3>
                          <p className="text-xs text-surface-400">
                            {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      {project.status === "live" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="flex items-center gap-1 sm:gap-2 mb-5">
                      {steps.map((step, i) => {
                        const StepIcon = step.icon;
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <Link to={step.href} className="flex items-center gap-1.5 sm:gap-2">
                              <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                                step.done ? "bg-green-50 text-green-600"
                                : step.active ? "bg-surface-900 text-white"
                                : "bg-surface-100 text-surface-400"
                              }`}>
                                {step.done ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                              </div>
                              <span className={`text-xs font-medium hidden sm:block ${
                                step.done ? "text-green-600" : step.active ? "text-surface-900" : "text-surface-400"
                              }`}>{step.label}</span>
                            </Link>
                            {i < steps.length - 1 && (
                              <div className={`flex-1 h-px mx-2 ${i < completedCount ? "bg-green-200" : "bg-surface-200"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Active step CTA */}
                    {activeStep && (
                      <Link to={activeStep.href}>
                        <div className="flex items-center justify-between rounded-xl bg-surface-50 border border-surface-200 px-4 py-3.5 hover:bg-surface-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <activeStep.icon className="h-4 w-4 text-surface-600" />
                            <span className="text-sm font-medium text-surface-700">Next: {activeStep.actionLabel}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-surface-400" />
                        </div>
                      </Link>
                    )}

                    {/* Quick links */}
                    <div className="flex gap-3 mt-4">
                      <Link to={`/scan/${project.id}`} className="text-xs text-surface-400 hover:text-surface-600">Report</Link>
                      <span className="text-surface-200">·</span>
                      <Link to={`/app/${project.id}/listing`} className="text-xs text-surface-400 hover:text-surface-600">Store page</Link>
                      <span className="text-surface-200">·</span>
                      <Link to={`/app/${project.id}/screenshots`} className="text-xs text-surface-400 hover:text-surface-600">Screenshots</Link>
                      <span className="text-surface-200">·</span>
                      <Link to={`/app/${project.id}/submit`} className="text-xs text-surface-400 hover:text-surface-600">Publish</Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
