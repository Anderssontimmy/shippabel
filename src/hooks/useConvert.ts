import { useState } from "react";
import { invokeEdge } from "@/lib/invokeEdge";

export const useConvert = (projectId: string) => {
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ files_pushed: string[]; message: string } | null>(null);

  const convert = async () => {
    setConverting(true);
    setError(null);

    try {
      const { data, error: fnError } = await invokeEdge<{ files_pushed: string[]; message: string }>(
        "convert-project",
        { project_id: projectId },
      );

      if (fnError || !data) {
        throw new Error(fnError || "Failed to connect to the service");
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
