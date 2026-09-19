import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type BuildStatus = "idle" | "queued" | "in_progress" | "completed" | "failed";
export type ReviewStatus =
  | "not_submitted"
  | "pending_credentials"
  | "internal_testing"
  | "waiting_for_review"
  | "in_review"
  | "approved"
  | "rejected";

export interface Submission {
  id: string;
  project_id: string;
  platform: "ios" | "android";
  eas_build_id: string | null;
  build_status: BuildStatus;
  review_status: ReviewStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const useBuild = (projectId: string) => {
  const isDemo = projectId === "demo";
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("submissions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (loadError) setError(loadError.message);
    else setSubmissions((data ?? []) as Submission[]);
    setLoading(false);
  }, [projectId, isDemo]);

  useEffect(() => {
    if (projectId) loadSubmissions();
  }, [projectId, loadSubmissions]);

  const triggerBuild = async (platform: "ios" | "android") => {
    setBuilding(true);
    setError(null);

    if (isDemo) {
      // Simulate build: queued -> in_progress -> completed
      const demoSub: Submission = {
        id: "demo-sub",
        project_id: "demo",
        platform,
        eas_build_id: null,
        build_status: "queued",
        review_status: "not_submitted",
        rejection_reason: null,
        submitted_at: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      };
      setSubmissions([demoSub]);
      await new Promise((r) => setTimeout(r, 1500));
      setSubmissions([{ ...demoSub, build_status: "in_progress" }]);
      await new Promise((r) => setTimeout(r, 3000));
      setSubmissions([{ ...demoSub, build_status: "completed" }]);
      setBuilding(false);
      return "demo-sub";
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("trigger-build", {
        body: { project_id: projectId, platform },
      });

      if (fnError) {
        // Supabase puts the response body in data even on error, or in fnError.context
        let realError = "";
        try {
          // Try to get error from response data first
          if (data?.error) {
            realError = data.error;
          } else if (fnError && "context" in fnError) {
            const ctx = (fnError as { context?: { json?: () => Promise<{ error?: string }> } }).context;
            if (ctx?.json) {
              const body = await ctx.json();
              realError = body?.error ?? fnError.message;
            }
          }
        } catch {
          realError = fnError.message;
        }
        if (!realError) realError = fnError.message;

        // Map technical errors to friendly messages
        const friendlyError = realError.includes("app.json")
          ? "Your app needs to be converted to a mobile app first. Go back to your scan results and click 'Make it Google Play ready'."
          : realError.includes("EAS token")
          ? "Please connect your Expo account in Settings first."
          : realError.includes("Unauthorized")
          ? "Please sign in again to continue."
          : realError.includes("EAS Build failed")
          ? "The build service returned an error. This usually means your app needs additional setup. Please check that your Expo account is connected in Settings."
          : realError.includes("non-2xx")
          ? "Something went wrong while building. Please try again or check your Settings."
          : realError;
        throw new Error(friendlyError);
      }

      const submissionId = data.submission_id as string;

      await loadSubmissions();
      return submissionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
      return null;
    } finally {
      setBuilding(false);
    }
  };

  const submitToStore = async (submissionId: string): Promise<boolean> => {
    setSubmitting(true);
    setError(null);

    if (isDemo) {
      const base = submissions[0]!;
      setSubmissions([{ ...base, review_status: "waiting_for_review", submitted_at: new Date().toISOString() }]);
      await new Promise((r) => setTimeout(r, 2000));
      setSubmissions([{ ...base, review_status: "in_review", submitted_at: new Date().toISOString() }]);
      await new Promise((r) => setTimeout(r, 3000));
      setSubmissions([{ ...base, review_status: base.platform === "android" ? "internal_testing" : "approved", submitted_at: new Date().toISOString(), reviewed_at: new Date().toISOString() }]);
      setSubmitting(false);
      return true;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-store", {
        body: { submission_id: submissionId },
      });

      if (fnError) throw new Error(data?.error ?? fnError.message);

      await loadSubmissions();
      if (!data?.success) throw new Error(data?.details ?? "Submission could not be completed. Check your connected accounts.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = useCallback(async (submissionId: string) => {
    try {
      await supabase.functions.invoke("check-review", { body: { submission_id: submissionId }, timeout: 15000 });
    } catch {
      // The build callback can still have updated the database.
    } finally {
      await loadSubmissions();
    }
  }, [loadSubmissions]);

  // Resume a pending build when the user reopens the page. Database callbacks
  // remain visible even when a status-provider request temporarily fails.
  const pendingId = submissions.find(s => ["queued", "in_progress"].includes(s.build_status)
    || ["waiting_for_review", "in_review"].includes(s.review_status))?.id;
  useEffect(() => {
    if (isDemo || !pendingId) return;
    let busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try { await checkStatus(pendingId); } finally { busy = false; }
    };
    void poll();
    const timer = setInterval(poll, 15000);
    return () => clearInterval(timer);
  }, [pendingId, isDemo, checkStatus]);

  const latestByPlatform = (platform: "ios" | "android") =>
    submissions.find((s) => s.platform === platform) ?? null;

  return {
    submissions,
    loading,
    building,
    submitting,
    error,
    triggerBuild,
    submitToStore,
    checkStatus,
    latestByPlatform,
    reload: loadSubmissions,
  };
};
