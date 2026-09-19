import { hasEnoughScreenshots } from "@/lib/screenshots";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  type FlowStep,
  type FlowStepState,
  type ShipFacts,
  deriveSteps,
  getCurrentStep,
} from "@/lib/shipFlow";

export type { FlowStep };

export interface FlowState {
  currentStep: FlowStep;
  steps: FlowStepState[];
  projectId: string | null;
  score: number | null;
  criticalIssues: number;
  hasListing: boolean;
  hasCredentials: { eas: boolean; apple: boolean; google: boolean };
  hasBuild: boolean;
  isSubmitted: boolean;
}

const EMPTY_FACTS: ShipFacts = {
  scanned: false,
  criticalIssues: 0,
  loggedIn: false,
  hasListing: false,
  hasScreenshots: false,
  hasBuildConnection: false,
  hasBuild: false,
  isSubmitted: false,
  isLive: false,
};

export const useShipFlow = (projectId?: string) => {
  const { user } = useAuth();
  const isDemo = projectId === "demo";
  const [state, setState] = useState<FlowState>({
    currentStep: "scan",
    steps: deriveSteps(EMPTY_FACTS),
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
      const facts: ShipFacts = {
        scanned: true,
        criticalIssues: 0,
        loggedIn: true,
        hasListing: true,
        hasScreenshots: true,
        hasBuildConnection: true,
        hasBuild: false,
        isSubmitted: false,
        isLive: false,
      };
      setState({
        currentStep: getCurrentStep(facts),
        steps: deriveSteps(facts),
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

    // Fetch project. On a transient query error, keep the previous state
    // instead of rendering the flow as "not scanned" (visible progress regression).
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (projectError) return;

    let scanned = false;
    let score: number | null = null;
    let criticalIssues = 0;
    if (project?.scan_result) {
      const scan = project.scan_result as { score: number; summary: { critical: number } };
      scanned = true;
      score = scan.score;
      criticalIssues = scan.summary.critical;
    }
    const isLive = project?.status === "live";

    // Listings + screenshots
    const { data: listings } = await supabase
      .from("store_listings")
      .select("id, platform, app_name, screenshots").eq("platform", "android")
      .eq("project_id", projectId);

    const hasListing = (listings ?? []).some((l) => l.app_name && l.app_name.trim() !== "");
    const hasScreenshots = (listings ?? []).some((l) => hasEnoughScreenshots(l.screenshots));

    // Credentials
    let hasEas = false;
    let hasGitHub = false;
    let hasApple = false;
    let hasGoogle = false;
    if (user) {
      const { data: creds } = await supabase
        .from("user_credentials")
        .select("provider").eq("is_valid", true)
        .eq("user_id", user.id);
      const providers = (creds ?? []).map((c) => c.provider);
      hasEas = providers.includes("eas");
      hasGitHub = providers.includes("github");
      hasApple = providers.includes("apple");
      hasGoogle = providers.includes("google");
    }

    // Latest submission
    const { data: subs } = await supabase
      .from("submissions")
      .select("build_status, review_status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);

    let hasBuild = false;
    let isSubmitted = false;
    if (subs && subs.length > 0) {
      const latest = subs[0]!;
      hasBuild = latest.build_status === "completed";
      isSubmitted = ["waiting_for_review", "in_review", "internal_testing", "approved"].includes(latest.review_status);
    }

    const facts: ShipFacts = {
      scanned,
      criticalIssues,
      loggedIn: !!user,
      hasListing,
      hasScreenshots,
      hasBuildConnection: hasGitHub && (project?.scan_result?.project_type === "capacitor" || hasEas),
      hasBuild,
      isSubmitted,
      isLive,
    };

    setState({
      currentStep: getCurrentStep(facts),
      steps: deriveSteps(facts),
      projectId,
      score,
      criticalIssues,
      hasListing,
      hasCredentials: { eas: hasEas, apple: hasApple, google: hasGoogle },
      hasBuild,
      isSubmitted,
    });
  }, [projectId, user, isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
};
