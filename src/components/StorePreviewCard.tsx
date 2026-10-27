import { Card } from "@/components/ui/Card";
import type { StorePreview } from "@/lib/types";

interface StorePreviewCardProps {
  preview: StorePreview;
  isPaid: boolean;
}

// A first look at the person's own Google Play page, written from their code. Deliberately plain: no invented
// logo, rating or screenshots, and no button, because the real next step is already on the page.
export const StorePreviewCard = ({ preview, isPaid }: StorePreviewCardProps) => (
  <Card>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-surface-700">Your Google Play page, first draft</h2>
      <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">Draft</span>
    </div>
    <div className="flex items-center gap-4 rounded-xl border border-surface-200 p-4">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-100 text-xl font-semibold text-surface-600"
      >
        {preview.title.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="break-words text-base font-semibold text-surface-900">{preview.title}</p>
        <p className="break-words text-sm text-surface-600">{preview.short_description}</p>
      </div>
    </div>
    <p className="mt-3 text-sm text-surface-600">
      {isPaid
        ? "A draft written from your code. The store page editor writes the full version."
        : "A draft written from your code. Ship writes the full page, frames your screenshots and publishes it."}
    </p>
  </Card>
);
