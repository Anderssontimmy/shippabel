import { Card } from "@/components/ui/Card";
import { earningExample, formatUsd, SHIP_PRICE_USD, type ComputedExample } from "@/lib/earningExample";
import type { AppPotentialAnalysis } from "@/lib/types";

interface AppPotentialCardProps {
  analysis: AppPotentialAnalysis;
  isPaid?: boolean;
}

const EarningTable = ({ example }: { example: ComputedExample }) => {
  const once = example.paid === "once";
  return (
    <div>
      <p className="mb-2 text-sm text-surface-700">
        Say people pay {formatUsd(example.price)} {example.paid} for your app.
      </p>
      <table className="w-full max-w-sm text-left text-sm">
        <caption className="sr-only">What that price adds up to for different numbers of paying customers</caption>
        <thead>
          <tr className="border-b border-surface-200 text-surface-500">
            <th scope="col" className="py-1.5 pr-4 font-medium">Paying customers</th>
            <th scope="col" className="py-1.5 font-medium">You would earn</th>
          </tr>
        </thead>
        <tbody className="text-surface-700">
          {example.rows.map((row) => (
            <tr key={row.customers} className="border-b border-surface-100">
              <td className="py-1.5 pr-4">{row.customers}</td>
              <td className="py-1.5 font-medium text-surface-900">
                {formatUsd(row.total)} {once ? "in total" : "a month"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm text-surface-600">
        An illustration with a price that suits this kind of app, not a forecast. Nobody can tell how many people will pay,
        and the amounts are before store fees and tax.
      </p>
      {example.shipCovered !== null && (
        <p className="mt-2 text-sm font-medium text-surface-700">
          At that price, {example.shipCovered} {once ? "sales" : "paying customers"} cover Ship's {formatUsd(SHIP_PRICE_USD)}
          {once ? "." : " in the first month."}
        </p>
      )}
    </div>
  );
};

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-surface-600 marker:text-surface-500">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

// What the scan understood about the app, and how it could earn money. No market sizes or revenue figures:
// the model can only guess them, and a wrong number costs us the user's trust. The one example with dollar
// amounts is a price times fixed audience sizes, labelled as an illustration.
export const AppPotentialCard = ({ analysis, isPaid = false }: AppPotentialCardProps) => {
  const ideas = analysis.monetization_ideas ?? [];
  const example = earningExample(analysis.earning_example, !isPaid);
  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold text-surface-700">What we see in your app</h2>
      <p className="text-sm leading-relaxed text-surface-600">{analysis.app_description}</p>

      {(ideas.length > 0 || example) && (
        <section className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-surface-700">How it could earn money</h3>
          {ideas.length > 0 && (
            <>
              <BulletList items={ideas} />
              <p className="mt-2 text-sm text-surface-600">Ideas to think about, not a forecast.</p>
            </>
          )}
          {example && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-surface-700">What that could look like</h3>
              <EarningTable example={example} />
            </>
          )}
        </section>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {analysis.strengths?.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-surface-700">Your strengths</h3>
            <BulletList items={analysis.strengths} />
          </section>
        )}
        {analysis.growth_suggestions?.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-surface-700">Quick wins</h3>
            <BulletList items={analysis.growth_suggestions} />
          </section>
        )}
      </div>
    </Card>
  );
};
