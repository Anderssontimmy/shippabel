import { Card } from "@/components/ui/Card";
import { percent } from "@/lib/adminStats";

export interface FunnelStep { label: string; value: number }

interface FunnelProps {
  steps: FunnelStep[];
  // Visitors are only counted from the day counting started. Until it covers the whole range, a share of
  // visitors would compare a short period with a long one, so it is left out.
  showShare: boolean;
}

export const Funnel = ({ steps, showShare }: FunnelProps) => {
  const widest = Math.max(...steps.map((s) => s.value), 1);
  const visitors = steps[0]?.value ?? 0;
  return (
    <Card>
      <h2 className="text-base font-semibold text-surface-900">From visit to payment</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => {
          const share = showShare && i > 0 ? percent(step.value, visitors) : null;
          return (
            <li key={step.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-surface-700">{step.label}</span>
                <span className="tabular-nums text-surface-900">
                  <span className="font-medium">{step.value}</span>
                  {share !== null && <span className="ml-2 text-surface-600">{share}% of visitors</span>}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 rounded-full bg-surface-100">
                <div className="h-full rounded-full bg-surface-500" style={{ width: `${(step.value / widest) * 100}%`, minWidth: step.value > 0 ? 4 : 0 }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm text-surface-600">
        Scans, signups and payments come from the database for the whole range. Signups include people who never scanned.
      </p>
    </Card>
  );
};
