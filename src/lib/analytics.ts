// Plausible analytics — custom event tracking
// Only fires when Plausible script is loaded (production)

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
  }
}

type EventName =
  | "Scan Started"
  | "Scan Completed"
  | "Fix Applied"
  | "Listing Generated"
  | "Build Triggered"
  | "Checkout Started"
  | "Signup";

export const trackEvent = (event: EventName, props?: Record<string, string | number>) => {
  if (window.plausible) {
    window.plausible(event, props ? { props } : undefined);
  }
};
