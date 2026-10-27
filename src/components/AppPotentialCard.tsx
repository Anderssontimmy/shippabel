import { Card } from "@/components/ui/Card";
import { earningExample, formatUsd, SHIP_PRICE_USD, type ComputedExample } from "@/lib/earningExample";
import type { AppPotentialAnalysis } from "@/lib/types";

interface AppPotentialCardProps {
  analysis: AppPotentialAnalysis;
  isPaid?: boolean;
}

// One sentence with its basis in view: a price and a stated number of people. It says nothing about what real
// apps earn, because nobody here knows that.
const EarningLine = ({ example }: { example: ComputedExample }) => {
  const once = example.paid === "once";
  const sentence = `If an app like this succeeds, ${example.customers} people paying ${formatUsd(example.price)} ${example.paid} would bring in about ${formatUsd(example.total)} ${once ? "in total" : "a month"}.`;
  return (
    <div className="mt-4">
      <p className="text-base font-semibold leading-snug text-surface-900">{sentence}</p>
      <p className="mt-2 text-sm text-surface-600">
        An illustration, not a forecast. Nobody can tell how many people will pay, and the amount is before store fees and tax.
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

const BulletList =({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-surface-600 marker:text-surface-500">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

// What the scan understood about the app, and how it could earn money. No market sizes or revenue figures:
// the model can only guess them, and a wrong number costs us the user's trust. The one example with a dollar
// amount is a price times a stated number of people, labelled as an illustration.
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
          {ideas.length > 0 && <BulletList items={ideas} />}
          {ideas.length > 0 && !example && (
            <p className="mt-2 text-sm text-surface-600">Ideas to think about, not a forecast.</p>
          )}
          {example && <EarningLine example={example} />}
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
