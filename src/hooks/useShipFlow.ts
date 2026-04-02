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
  const isDemo = projectId === "demo";
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

    if (isDemo) {
      const demoChecks = {
        scanned: true,
        score: 73,
        criticalIssues: 0,
        fixed: true,
        loggedIn: true,
        hasListing: true,
        hasScreenshots: true,
        hasEas: true,
        hasApple: true,
        hasGoogle: true,
        hasBuild: false,
        isSubmitted: false,
      };
      setState({
        currentStep: "build",
        steps: buildSteps(demoChecks),
        projectId: "demo",
        score: 73,
        criticalIssues: 0,
        hasListing: true,
        hasCredentials: { eas: true, apple: true, google: true },
        hasBuild: false,
        isSubmitted: false,
      });
      return;
    }

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

    // Check listing — need at least one platform with app_name filled in
    const { data: listings } = await supabase
      .from("store_listings")
      .select("id, platform, app_name, screenshots")
      .eq("project_id", projectId);

    const completedListings = (listings ?? []).filter((l) => l.app_name && l.app_name.trim() !== "");
    checks.hasListing = completedListings.length > 0;

    // Check screenshots — screenshots column is a JSONB array
    const hasAnyScreenshots = (listings ?? []).some((l) => {
      const s = l.screenshots;
      return Array.isArray(s) && s.length > 0;
    });
    checks.hasScreenshots = hasAnyScreenshots;

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

    // Determine current step — strictly sequential
    let currentStep: FlowStep = "scan";
    if (checks.scanned) {
      if ((checks.criticalIssues as number) > 0) {
        currentStep = "fix";
      } else if (!checks.loggedIn) {
        currentStep = "signup";
      } else if (!checks.hasListing) {
        currentStep = "listing";
      } else if (!checks.hasScreenshots) {
        currentStep = "screenshots";
      } else if (!checks.hasEas) {
        currentStep = "connect";
      } else if (!checks.hasBuild) {
        currentStep = "build";
      } else if (!checks.isSubmitted) {
        currentStep = "submit";
      } else {
        currentStep = "submit";
      }
    }

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
  }, [projectId, user, isDemo]);

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
  const hasScreenshots = !!checks.hasScreenshots;
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
      completed: hasScreenshots,
      available: scanned && loggedIn && hasListing,
    },
    {
      id: "connect" as FlowStep,
      label: "Connect",
      description: "Link your Apple and Google accounts",
      completed: hasEas,
      available: loggedIn && hasListing,
    },
    {
      id: "build" as FlowStep,
      label: "Build",
      description: "Prepare your app for the stores",
      completed: hasBuild,
      available: hasEas && hasListing,
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
