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

  // We derive progress from project status and scan_result
  const hasListing = status === "building" || status === "submitted" || status === "live";
  const isBuilt = status === "submitted" || status === "live";
  const isLive = status === "live";

  return [
    {
      key: "check",
      label: "Check",
      icon: Scan,
      done: scanned,
      active: !scanned,
      href: `/scan/${project.id}`,
      actionLabel: "See results",
    },
    {
      key: "fix",
      label: "Fix",
      icon: Wrench,
      done: fixed,
      active: scanned && !fixed,
      href: `/scan/${project.id}`,
      actionLabel: hasCritical ? `Fix ${scan?.summary?.critical} problems` : "All fixed",
    },
    {
      key: "listing",
      label: "Store page",
      icon: FileText,
      done: hasListing,
      active: fixed && !hasListing,
      href: `/app/${project.id}/listing`,
      actionLabel: "Write store page",
    },
    {
      key: "publish",
      label: "Publish",
      icon: Send,
      done: isLive,
      active: hasListing && !isLive,
      href: isBuilt ? `/app/${project.id}/status` : `/app/${project.id}/submit`,
      actionLabel: isBuilt ? "Track review" : "Publish app",
    },
  ];
};

export const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) loadProjects();
    if (!authLoading && !user) setLoading(false);
  }, [user, authLoading, navigate, loadProjects]);

  if (authLoading || (user && loading)) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Apps</h1>
          <p className="text-surface-400 text-sm mt-1">Track your apps from check to live</p>
        </div>
        <Link to="/scan">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New app
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-16">
          <Rocket className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No apps yet</h2>
          <p className="text-sm text-surface-400 mb-6 max-w-sm mx-auto">
            Check your first app to see if it's ready for the App Store and Google Play.
          </p>
          <Link to="/scan">
            <Button className="gap-2">
              <Scan className="h-4 w-4" />
              Check my app
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const steps = getSteps(project);
            const score = project.scan_result?.score;
            const activeStep = steps.find((s) => s.active);
            const completedCount = steps.filter((s) => s.done).length;
            const progress = (completedCount / steps.length) * 100;

            return (
              <Card key={project.id} className="p-0 overflow-hidden">
                {/* Progress bar at top */}
                <div className="h-1 bg-surface-800">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="p-5 sm:p-6">
                  {/* Header: name + score + date */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      {score != null && (
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            score >= 80
                              ? "bg-green-500/10 text-green-400"
                              : score >= 50
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {score}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate text-lg">{project.name}</h3>
                        <p className="text-xs text-surface-500">
                          {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {project.status === "live" && (
                      <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>

                  {/* Steps progress */}
                  <div className="flex items-center gap-1 sm:gap-2 mb-5">
                    {steps.map((step, i) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div
                              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shrink-0 ${
                                step.done
                                  ? "bg-green-500/15 text-green-400"
                                  : step.active
                                  ? "bg-primary-500/15 text-primary-400 ring-2 ring-primary-500/30"
                                  : "bg-surface-800 text-surface-600"
                              }`}
                            >
                              {step.done ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <StepIcon className={`h-4 w-4 ${step.active ? "animate-pulse" : ""}`} />
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium hidden sm:block ${
                                step.done
                                  ? "text-green-400"
                                  : step.active
                                  ? "text-white"
                                  : "text-surface-600"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {i < steps.length - 1 && (
                            <div
                              className={`flex-1 h-px mx-1 sm:mx-2 ${
                                step.done ? "bg-green-500/30" : "bg-surface-800"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Next action */}
                  {activeStep && (
                    <Link to={activeStep.href}>
                      <div className="flex items-center justify-between rounded-xl bg-surface-800/50 border border-surface-700/50 px-4 py-3 hover:bg-surface-800 hover:border-surface-600 transition-colors group">
                        <div>
                          <p className="text-xs text-surface-500 mb-0.5">Next step</p>
                          <p className="text-sm font-medium text-white">{activeStep.actionLabel}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-surface-500 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )}

                  {project.status === "live" && (
                    <Link to={`/app/${project.id}/status`}>
                      <div className="flex items-center justify-between rounded-xl bg-green-500/5 border border-green-500/20 px-4 py-3 hover:bg-green-500/10 transition-colors group">
                        <div>
                          <p className="text-sm font-medium text-green-400">Your app is live! 🎉</p>
                          <p className="text-xs text-surface-500 mt-0.5">View status & downloads</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-green-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
