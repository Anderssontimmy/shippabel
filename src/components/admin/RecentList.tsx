import { Card } from "@/components/ui/Card";

export interface RecentRow { key: string; primary: string; secondary: string; when: string }

interface RecentListProps {
  title: string;
  rows: RecentRow[];
  empty: string;
}

export const RecentList = ({ title, rows, empty }: RecentListProps) => (
  <Card>
    <h2 className="text-base font-semibold text-surface-900">{title}</h2>
    {rows.length === 0 ? (
      <p className="mt-3 text-sm text-surface-600">{empty}</p>
    ) : (
      <ul className="mt-3 divide-y divide-surface-100">
        {rows.map((row) => (
          <li key={row.key} className="flex items-start justify-between gap-4 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate text-surface-900" title={row.primary}>{row.primary}</p>
              <p className="truncate text-surface-600">{row.secondary}</p>
            </div>
            <p className="shrink-0 tabular-nums text-surface-600">{row.when}</p>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
