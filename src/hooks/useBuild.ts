import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type BuildStatus = "idle" | "queued" | "in_progress" | "completed" | "failed";
export type ReviewStatus =
  | "not_submitted"
  | "pending_credentials"
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSubmissions = useCallback(async () => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setSubmissions((data ?? []) as Submission[]);
    setLoading(false);
  }, [projectId, isDemo]);

  useEffect(() => {
    if (projectId) loadSubmissions();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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

      if (fnError) throw new Error(data?.error ?? fnError.message);

      const submissionId = data.submission_id as string;
      startPolling(submissionId);

      await loadSubmissions();
      return submissionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Build failed");
      return null;
    } finally {
      setBuilding(false);
    }
  };

  const submitToStore = async (submissionId: string) => {
    setSubmitting(true);
    setError(null);

    if (isDemo) {
      const base = submissions[0]!;
      setSubmissions([{ ...base, review_status: "waiting_for_review", submitted_at: new Date().toISOString() }]);
      await new Promise((r) => setTimeout(r, 2000));
      setSubmissions([{ ...base, review_status: "in_review", submitted_at: new Date().toISOString() }]);
      await new Promise((r) => setTimeout(r, 3000));
      setSubmissions([{ ...base, review_status: "approved", submitted_at: new Date().toISOString(), reviewed_at: new Date().toISOString() }]);
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-store", {
        body: { submission_id: submissionId },
      });

      if (fnError) throw new Error(data?.error ?? fnError.message);

      startPolling(submissionId);
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async (submissionId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-review", {
        body: { submission_id: submissionId },
      });

      if (fnError) return;

      // Reload submissions to get updated status
      await loadSubmissions();

      const status = data.status;
      // Stop polling if build is done and review is complete
      if (
        (status.build_status === "completed" || status.build_status === "failed") &&
        status.review_status !== "waiting_for_review" &&
        status.review_status !== "in_review"
      ) {
        stopPolling();
      }
    } catch {
      // Silent fail on polling
    }
  };

  const startPolling = (submissionId: string) => {
    stopPolling();
    pollRef.current = setInterval(() => checkStatus(submissionId), 15000);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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
