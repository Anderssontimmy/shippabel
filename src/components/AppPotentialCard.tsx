import { Card } from "@/components/ui/Card";
import type { AppPotentialAnalysis } from "@/lib/types";

interface AppPotentialCardProps {
  analysis: AppPotentialAnalysis;
}

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-surface-600 marker:text-surface-400">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

// What the scan understood about the app. Deliberately no market sizes or revenue
// figures: the model can only guess them, and a wrong number costs us the user's trust.
export const AppPotentialCard = ({ analysis }: AppPotentialCardProps) => (
  <Card>
    <h2 className="mb-2 text-sm font-semibold text-surface-700">What we see in your app</h2>
    <p className="text-sm leading-relaxed text-surface-600">{analysis.app_description}</p>

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
