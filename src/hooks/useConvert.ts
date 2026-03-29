import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const useConvert = (projectId: string) => {
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ files_pushed: string[]; message: string } | null>(null);

  const convert = async () => {
    setConverting(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("convert-project", {
        body: { project_id: projectId },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to connect to the service");
      }

      // Edge functions return error in data body when status is non-2xx
      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion failed";
      // Make errors user-friendly
      const friendlyMsg = msg.includes("GitHub")
        ? "Please connect your GitHub account in Settings first, so we can update your code."
        : msg.includes("sign in")
        ? "Please sign in first to use this feature."
        : msg;
      setError(friendlyMsg);
      return null;
    } finally {
      setConverting(false);
    }
  };

  return { converting, error, result, convert };
};
