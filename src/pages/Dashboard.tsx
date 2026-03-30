import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Rocket,
  Scan,
  FileText,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Project, ProjectStatus } from "@/lib/types";

const statusConfig: Record<ProjectStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  scanning: { label: "Scanning", color: "text-blue-400", icon: Loader2 },
  issues_found: { label: "Issues Found", color: "text-amber-400", icon: AlertCircle },
  ready: { label: "Ready", color: "text-emerald-400", icon: CheckCircle2 },
  building: { label: "Building", color: "text-blue-400", icon: Loader2 },
  submitted: { label: "Submitted", color: "text-primary-400", icon: Rocket },
  live: { label: "Live", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-400", icon: AlertCircle },
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
  }, [user, authLoading, navigate, loadProjects]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Manage your apps</p>
        </div>
        <Link to="/scan">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New scan
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-16">
          <Rocket className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No apps yet</h2>
          <p className="text-sm text-surface-400 mb-6 max-w-sm mx-auto">
            Scan your first Expo project to check if it's ready for the App Store.
          </p>
          <Link to="/scan">
            <Button className="gap-2">
              <Scan className="h-4 w-4" />
              Scan your app
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            const StatusIcon = status.icon;
            const score = project.scan_result?.score;

            return (
              <Card key={project.id} hover className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Score badge */}
                  {score != null && (
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        score >= 80
                          ? "bg-emerald-500/10 text-emerald-400"
                          : score >= 50
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {score}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{project.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                        <StatusIcon className={`h-3 w-3 ${project.status === "scanning" || project.status === "building" ? "animate-spin" : ""}`} />
                        {status.label}
                      </span>
                      {project.scan_result && (
                        <span className="text-xs text-surface-500">
                          {project.scan_result.summary.total} issues
                        </span>
                      )}
                      <span className="text-xs text-surface-600">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/scan/${project.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Scan className="h-3.5 w-3.5" />
                      Report
                    </Button>
                  </Link>
                  <Link to={`/app/${project.id}/listing`}>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Listing
                    </Button>
                  </Link>
                  <Link to={`/app/${project.id}/screenshots`}>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Screenshots
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
