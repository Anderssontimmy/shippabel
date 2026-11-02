import { Loader2 } from "lucide-react";

export const PageLoader = () => (
  <div role="status" aria-label="Loading page" className="flex items-center justify-center py-32">
    <Loader2 aria-hidden="true" className="h-8 w-8 text-primary-400 animate-spin" />
  </div>
);
