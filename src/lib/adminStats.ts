// Shapes and small helpers for the owner's /admin page. The numbers come from the admin_overview
// database function through the admin-stats edge function.

export interface Period {
  visitors: number;
  pageviews: number;
  scanner_visitors: number;
  scans: number;
  scanners: number;
  signups: number;
  paid: number;
  paid_ship: number;
  paid_unlimited: number;
}

export interface DayCounts { day: string; visitors: number; pageviews: number; scans: number; signups: number }
export interface Ranked { name: string; visitors: number }

export interface AdminOverview {
  range: { days: number; from: string; to: string; tz: string };
  tracking_since: string | null;
  current: Period;
  previous: Period;
  by_day: DayCounts[];
  top_pages: { path: string; views: number; visitors: number }[];
  sources: Ranked[];
  countries: Ranked[];
  devices: Ranked[];
  recent_signups: { at: string; email: string | null; provider: string | null; plan: string }[];
  recent_scans: { at: string; name: string | null; repo_url: string | null; score: string | null; type: string | null; signed_in: boolean }[];
  recent_builds: { at: string; name: string | null; platform: string; build_status: string | null; review_status: string | null }[];
  all_time: { users: number; projects: number; scans: number; builds: number; paid: number };
}

// What the plans cost, for the revenue line. Same prices as the pricing page.
export const LIST_PRICE = { ship: 99, unlimited: 179 } as const;

export const revenue = (p: Pick<Period, "paid_ship" | "paid_unlimited">) =>
  p.paid_ship * LIST_PRICE.ship + p.paid_unlimited * LIST_PRICE.unlimited;

export type Tone = "up" | "down" | "flat" | "new";

// The change against the period before, in words (the tile adds "vs the previous 30 days").
// With nothing before, a percentage would say nothing.
export const change = (current: number, previous: number): { text: string; tone: Tone } => {
  if (current === previous) return { text: "no change", tone: "flat" };
  if (previous === 0) return { text: `${current} more (none before)`, tone: "new" };
  const diff = current - previous;
  const pct = Math.round((Math.abs(diff) / previous) * 100);
  return { text: `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} (${pct}%)`, tone: diff > 0 ? "up" : "down" };
};

export const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

export const compact = (n: number): string => {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}K`;
};

// A top of 1, 2, 5, 10, 20, 50 ... so the gridlines land on round numbers.
export const niceMax = (max: number): number => {
  if (max <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= max)!;
  return step * magnitude;
};

export const formatDay = (day: string): string =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const formatShortDay = (day: string): string =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatWhen = (iso: string, timeZone: string): string =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone });
