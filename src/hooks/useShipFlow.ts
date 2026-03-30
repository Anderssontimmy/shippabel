import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type FlowStep =
  | "scan"
  | "fix"
  | "signup"
  | "listing"
  | "screenshots"
  | "connect"
  | "build"
  | "submit";

export interface FlowState {
  currentStep: FlowStep;
  steps: {
    id: FlowStep;
    label: string;
    description: string;
    completed: boolean;
    available: boolean;
  }[];
  projectId: string | null;
  score: number | null;
  criticalIssues: number;
  hasListing: boolean;
  hasCredentials: { eas: boolean; apple: boolean; google: boolean };
  hasBuild: boolean;
  isSubmitted: boolean;
}

export const useShipFlow = (projectId?: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<FlowState>({
    currentStep: "scan",
    steps: buildSteps({}),
    projectId: projectId ?? null,
    score: null,
    criticalIssues: 0,
    hasListing: false,
    hasCredentials: { eas: false, apple: false, google: false },
    hasBuild: false,
    isSubmitted: false,
  });

  const refresh = useCallback(async () => {
    if (!projectId) return;

    const checks: Record<string, unknown> = {};

    // Fetch project
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (project?.scan_result) {
      const scan = project.scan_result as { score: number; summary: { critical: number } };
      checks.scanned = true;
      checks.score = scan.score;
      checks.criticalIssues = scan.summary.critical;
      checks.fixed = scan.summary.critical === 0;
    }

    checks.loggedIn = !!user;

    // Check listing
    const { data: listings } = await supabase
      .from("store_listings")
      .select("id")
      .eq("project_id", projectId);
    checks.hasListing = (listings?.length ?? 0) > 0;

    // Check credentials
    if (user) {
      const { data: creds } = await supabase
        .from("user_credentials")
        .select("provider")
        .eq("user_id", user.id);

      const providers = (creds ?? []).map((c) => c.provider);
      checks.hasEas = providers.includes("eas");
      checks.hasApple = providers.includes("apple");
      checks.hasGoogle = providers.includes("google");
    }

    // Check submissions
    const { data: subs } = await supabase
      .from("submissions")
      .select("build_status, review_status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subs && subs.length > 0) {
      const latest = subs[0]!;
      checks.hasBuild = latest.build_status === "completed";
      checks.isSubmitted = ["waiting_for_review", "in_review", "approved"].includes(latest.review_status);
    }

    // Determine current step
    let currentStep: FlowStep = "scan";
    if (checks.scanned && (checks.criticalIssues as number) > 0) currentStep = "fix";
    else if (checks.scanned && !checks.loggedIn) currentStep = "signup";
    else if (checks.scanned && !checks.hasListing) currentStep = "listing";
    else if (checks.scanned && checks.hasListing && !(checks.hasEas)) currentStep = "connect";
    else if (checks.hasEas && !checks.hasBuild) currentStep = "build";
    else if (checks.hasBuild && !checks.isSubmitted) currentStep = "submit";
    else if (checks.isSubmitted) currentStep = "submit";

    setState({
      currentStep,
      steps: buildSteps(checks),
      projectId,
      score: (checks.score as number) ?? null,
      criticalIssues: (checks.criticalIssues as number) ?? 0,
      hasListing: !!checks.hasListing,
      hasCredentials: {
        eas: !!checks.hasEas,
        apple: !!checks.hasApple,
        google: !!checks.hasGoogle,
      },
      hasBuild: !!checks.hasBuild,
      isSubmitted: !!checks.isSubmitted,
    });
  }, [projectId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
};

function buildSteps(checks: Record<string, unknown>) {
  const scanned = !!checks.scanned;
  const fixed = !!checks.fixed;
  const loggedIn = !!checks.loggedIn;
  const hasListing = !!checks.hasListing;
  const hasEas = !!checks.hasEas;
  const hasBuild = !!checks.hasBuild;
  const isSubmitted = !!checks.isSubmitted;

  return [
    {
      id: "scan" as FlowStep,
      label: "Check",
      description: "See if your app is ready for the stores",
      completed: scanned,
      available: true,
    },
    {
      id: "fix" as FlowStep,
      label: "Fix",
      description: "Fix the problems we found",
      completed: fixed,
      available: scanned,
    },
    {
      id: "signup" as FlowStep,
      label: "Sign Up",
      description: "Create a free account to continue",
      completed: loggedIn,
      available: scanned,
    },
    {
      id: "listing" as FlowStep,
      label: "Store Page",
      description: "Write your app's name, description, and more",
      completed: hasListing,
      available: scanned && loggedIn,
    },
    {
      id: "screenshots" as FlowStep,
      label: "Screenshots",
      description: "Add screenshots of your app",
      completed: false,
      available: scanned && loggedIn,
    },
    {
      id: "connect" as FlowStep,
      label: "Connect",
      description: "Link your Apple and Google accounts",
      completed: hasEas,
      available: loggedIn,
    },
    {
      id: "build" as FlowStep,
      label: "Build",
      description: "Prepare your app for the stores",
      completed: hasBuild,
      available: hasEas,
    },
    {
      id: "submit" as FlowStep,
      label: "Go Live",
      description: "Send your app to the App Store & Google Play",
      completed: isSubmitted,
      available: hasBuild,
    },
  ];
}
