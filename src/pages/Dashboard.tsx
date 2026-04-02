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

const cleanAppName = (name: string) => {
  // Remove hashes like "-3fb3de3a" from the end
  return name.replace(/-[a-f0-9]{8,}$/i, "").replace(/-/g, " ");
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
      // Silently fail
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    loadProjects();
  }, [user, authLoading, navigate, loadProjects]);

  if (authLoading || (loading && user)) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 text-surface-400 animate-spin" /></div>;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.user_metadata?.name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "there";
  const hasApps = projects.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">

      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900">
          Hi, {firstName} 👋
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          {hasApps
            ? "Here's where your apps are at."
            : "Let's get your first app into the store."}
        </p>
      </div>

      {/* Empty state */}
      {!hasApps && (
        <Card className="text-center py-14 px-6">
          <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <Rocket className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">No apps yet</h2>
          <p className="text-sm text-surface-500 mb-8 max-w-sm mx-auto">
            Paste a link to your app and we'll check if it's ready for the App Store and Google Play. Takes 30 seconds.
          </p>
          <Link to="/scan">
            <Button size="lg" className="gap-2">
              Check my first app
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* Apps */}
      {hasApps && (
        <div className="space-y-4">
          {projects.map((project) => {
            const steps = getSteps(project);
            const score = project.scan_result?.score;
            const activeStep = steps.find((s) => s.active);
            const completedCount = steps.filter((s) => s.done).length;
            const progress = (completedCount / steps.length) * 100;
            const displayName = cleanAppName(project.name);

            return (
              <Card key={project.id} className="p-0 overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-surface-100">
                  <div
                    className={`h-full transition-all duration-500 ${progress === 100 ? "bg-green-500" : "bg-surface-900"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="p-5 sm:p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      {score != null && (
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-base font-bold shrink-0 ${
                          score >= 80 ? "bg-green-50 text-green-700"
                          : score >= 50 ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                        }`}>{score}</div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-surface-900 truncate text-lg capitalize">{displayName}</h3>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {completedCount} of {steps.length} steps done
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
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-5">
                    {steps.map((step, i) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              step.done ? "bg-green-100 text-green-600"
                              : step.active ? "bg-surface-900 text-white ring-2 ring-surface-900/20"
                              : "bg-surface-100 text-surface-400"
                            }`}>
                              {step.done ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                            </div>
                            <span className={`text-xs font-medium hidden sm:block ${
                              step.done ? "text-green-600" : step.active ? "text-surface-900" : "text-surface-400"
                            }`}>{step.label}</span>
                          </div>
                          {i < steps.length - 1 && (
                            <div className={`flex-1 h-px mx-1.5 sm:mx-2 ${i < completedCount ? "bg-green-200" : "bg-surface-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Next action */}
                  {activeStep && project.status !== "live" && (
                    <Link to={activeStep.href}>
                      <div className="flex items-center justify-between rounded-xl bg-surface-50 border border-surface-200 px-4 py-3.5 hover:bg-white hover:border-surface-300 hover:shadow-sm transition-all group">
                        <span className="text-sm font-medium text-surface-700">{activeStep.actionLabel}</span>
                        <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-surface-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )}

                  {project.status === "live" && (
                    <Link to={`/app/${project.id}/status`}>
                      <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3.5 hover:bg-green-100 transition-colors group">
                        <span className="text-sm font-medium text-green-700">Your app is live! 🎉</span>
                        <ArrowRight className="h-4 w-4 text-green-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Add another app */}
          <Link to="/scan">
            <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-surface-200 py-5 text-sm font-medium text-surface-400 hover:border-surface-300 hover:text-surface-600 transition-colors cursor-pointer">
              <Plus className="h-4 w-4" />
              Check another app
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};
