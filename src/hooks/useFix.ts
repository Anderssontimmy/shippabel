import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface FixResult {
  fixed: number;
  failed: number;
  fixed_ids: string[];
}

export const useFix = (projectId: string) => {
  const isDemo = projectId === "demo";
  const [fixing, setFixing] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FixResult | null>(null);

  const fixAll = async () => {
    setFixing(true);
    setError(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 2000));
      const result: FixResult = { fixed: 4, failed: 0, fixed_ids: ["2", "3", "4", "5"] };
      setLastResult(result);
      setFixing(false);
      return result;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fix-issues", {
        body: { project_id: projectId },
      });

      if (fnError) throw new Error(fnError.message);
      setLastResult(data as FixResult);
      return data as FixResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
      return null;
    } finally {
      setFixing(false);
    }
  };

  const fixOne = async (issueId: string) => {
    setFixingIssueId(issueId);
    setError(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 1500));
      const result: FixResult = { fixed: 1, failed: 0, fixed_ids: [issueId] };
      setLastResult(result);
      setFixingIssueId(null);
      return result;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fix-issues", {
        body: { project_id: projectId, issue_ids: [issueId] },
      });

      if (fnError) throw new Error(fnError.message);
      setLastResult(data as FixResult);
      return data as FixResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
      return null;
    } finally {
      setFixingIssueId(null);
    }
  };

  return { fixing, fixingIssueId, error, lastResult, fixAll, fixOne };
};
