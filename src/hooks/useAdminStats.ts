import { useCallback, useEffect, useState } from "react";
import { invokeEdge } from "@/lib/invokeEdge";
import type { AdminOverview } from "@/lib/adminStats";

export const useAdminStats = (days: number, enabled: boolean) => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const { data: overview, error: failure } = await invokeEdge<AdminOverview>("admin-stats", { days });
    if (failure || !overview) setError(failure ?? "Could not load the numbers.");
    else { setData(overview); setLoadedAt(new Date()); }
    setLoading(false);
  }, [days, enabled]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, loadedAt, reload: load };
};
