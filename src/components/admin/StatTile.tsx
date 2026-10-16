import type { Tone } from "@/lib/adminStats";

const tones: Record<Tone, string> = {
  up: "text-green-700",
  down: "text-amber-700",
  flat: "text-surface-600",
  new: "text-surface-600",
};

interface StatTileProps {
  label: string;
  value: string;
  delta?: { text: string; tone: Tone };
  against?: string;
  note?: string;
}

export const StatTile = ({ label, value, delta, against, note }: StatTileProps) => (
  <div className="rounded-2xl border border-surface-200 bg-white p-5">
    <p className="text-sm text-surface-600">{label}</p>
    <p className="mt-1 text-3xl font-semibold tracking-tight text-surface-900">{value}</p>
    {delta && (
      <p className="mt-1 text-sm text-surface-600">
        <span className={`font-medium ${tones[delta.tone]}`}>{delta.text}</span>
        {against && <span> {against}</span>}
      </p>
    )}
    {note && <p className="mt-1 text-sm text-surface-600">{note}</p>}
  </div>
);
