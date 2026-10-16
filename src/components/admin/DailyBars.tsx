import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatDay, formatShortDay, niceMax } from "@/lib/adminStats";

interface DailyBarsProps {
  title: string;
  unit: string; // "visitors", "scans"
  days: { day: string; value: number }[];
}

// One series, so no legend: the title says what is plotted. Plain HTML bars keep their real size on a
// phone; the table under the chart carries every value for anyone who cannot use a pointer.
export const DailyBars = ({ title, unit, days }: DailyBarsProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = days.reduce((sum, d) => sum + d.value, 0);
  const top = niceMax(Math.max(...days.map((d) => d.value), 0));
  const peak = days.reduce((best, d) => (d.value > best.value ? d : best), days[0] ?? { day: "", value: 0 });
  const summary = total === 0
    ? `${title}: none in these ${days.length} days`
    : `${title}: ${total} in ${days.length} days, most on ${formatDay(peak.day)} with ${peak.value}`;
  const shown = hover === null ? null : days[hover];

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-base font-semibold text-surface-900">{title}</h2>
        <p className="text-sm text-surface-600">{total} in {days.length} days</p>
      </div>

      <div className="mt-4 flex gap-3">
        <div aria-hidden="true" className="flex h-40 flex-col justify-between text-right text-xs tabular-nums text-surface-600">
          <span>{top}</span>
          <span>{top % 2 === 0 ? top / 2 : ""}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-40 flex-col justify-between">
            <div className="border-t border-surface-200" />
            <div className="border-t border-surface-200" />
            <div className="border-t border-surface-200" />
          </div>
          <div role="img" aria-label={summary} className="relative flex h-40 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {days.map((d, i) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-surface-500"
                  style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          {shown && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-surface-900 px-2.5 py-1.5 text-sm text-white shadow-lg"
              style={{ left: `${Math.min(88, Math.max(12, ((hover! + 0.5) / days.length) * 100))}%` }}
            >
              {formatDay(shown.day)}: {shown.value} {unit}
            </div>
          )}
          <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-surface-600">
            <span>{days[0] ? formatShortDay(days[0].day) : ""}</span>
            <span>{days.length > 0 ? formatShortDay(days[days.length - 1]!.day) : ""}</span>
          </div>
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-surface-600 hover:text-surface-900">Show as table</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">{title} by day</caption>
          <thead>
            <tr className="text-left text-surface-600">
              <th scope="col" className="py-1 font-medium">Day</th>
              <th scope="col" className="py-1 text-right font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day} className="border-t border-surface-100">
                <th scope="row" className="py-1 text-left font-normal text-surface-700">{formatDay(d.day)}</th>
                <td className="py-1 text-right tabular-nums text-surface-900">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
};
