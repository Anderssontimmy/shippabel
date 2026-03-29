import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface FixResult {
  fixed: number;
  failed: number;
  fixed_ids: string[];
}

export const useFix = (projectId: string) => {
  const [fixing, setFixing] = useState(false);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FixResult | null>(null);

  const fixAll = async () => {
    setFixing(true);
    setError(null);

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
