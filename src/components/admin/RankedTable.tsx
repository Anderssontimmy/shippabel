import { Card } from "@/components/ui/Card";

interface RankedTableProps {
  title: string;
  column: string;
  rows: { name: string; value: number; extra?: number }[];
  extraColumn?: string;
  empty: string;
}

export const RankedTable = ({ title, column, rows, extraColumn, empty }: RankedTableProps) => {
  const widest = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Card>
      <h2 className="text-base font-semibold text-surface-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-surface-600">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-surface-600">
              <th scope="col" className="py-1 font-medium"><span className="sr-only">Name</span></th>
              {extraColumn && <th scope="col" className="py-1 pl-3 text-right font-medium">{extraColumn}</th>}
              <th scope="col" className="py-1 pl-3 text-right font-medium">{column}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-surface-100 align-top">
                <th scope="row" className="max-w-0 truncate py-2 text-left font-normal text-surface-700" title={row.name}>
                  <span className="block truncate">{row.name}</span>
                  <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-surface-100">
                    <span className="block h-full rounded-full bg-surface-300" style={{ width: `${(row.value / widest) * 100}%` }} />
                  </span>
                </th>
                {extraColumn && <td className="py-2 pl-3 text-right tabular-nums text-surface-600">{row.extra}</td>}
                <td className="py-2 pl-3 text-right tabular-nums font-medium text-surface-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};
