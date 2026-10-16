import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/admin/StatTile";
import { DailyBars } from "@/components/admin/DailyBars";
import { Funnel } from "@/components/admin/Funnel";
import { RankedTable } from "@/components/admin/RankedTable";
import { RecentList, type RecentRow } from "@/components/admin/RecentList";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { change, formatShortDay, formatWhen, revenue, type AdminOverview } from "@/lib/adminStats";
import { NotFound } from "./NotFound";

const RANGES = [7, 30, 90];

const repoName = (url: string | null) => url?.replace(/^https?:\/\/github\.com\//, "") ?? null;

const recentRows = (data: AdminOverview) => ({
  signups: data.recent_signups.map<RecentRow>((s, i) => ({
    key: `${s.at}-${i}`,
    primary: s.email ?? "(no email)",
    secondary: `${s.provider ?? "unknown"} · ${s.plan}`,
    when: formatWhen(s.at, data.range.tz),
  })),
  scans: data.recent_scans.map<RecentRow>((s, i) => ({
    key: `${s.at}-${i}`,
    primary: repoName(s.repo_url) ?? s.name ?? "Zip upload",
    secondary: [s.score ? `score ${s.score}` : null, s.type, s.signed_in ? "signed in" : "guest"].filter(Boolean).join(" · "),
    when: formatWhen(s.at, data.range.tz),
  })),
  builds: data.recent_builds.map<RecentRow>((b, i) => ({
    key: `${b.at}-${i}`,
    primary: b.name ?? "Unnamed app",
    secondary: `${b.platform} · build ${b.build_status ?? "unknown"} · ${b.review_status ?? "not submitted"}`,
    when: formatWhen(b.at, data.range.tz),
  })),
});

export const Admin = () => {
  useDocumentHead({ title: "Admin" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.app_metadata?.is_admin === true;
  const [days, setDays] = useState(30);
  const { data, loading, error, loadedAt, reload } = useAdminStats(days, isAdmin);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?next=%2Fadmin");
  }, [authLoading, user, navigate]);

  // Not for search engines, and not worth a place in anyone's history.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (authLoading || !user) return <div role="status" className="py-32 text-center text-sm text-surface-600">Loading…</div>;
  // To anyone else this page does not exist.
  if (!isAdmin) return <NotFound />;

  // Supabase does not pass the visitor's country on to edge functions, so today every visit is "Unknown".
  // A card that can only say that is clutter; it comes back by itself if a country ever arrives.
  const hasCountries = !!data?.countries.some((c) => c.name !== "Unknown");
  const visitsCoverRange = !!data?.tracking_since && data.tracking_since.slice(0, 10) <= data.range.from;
  const recent = data ? recentRows(data) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900">Admin</h1>
          <p className="mt-1 text-sm text-surface-600">How Shippabel is doing. Only you can see this page.</p>
        </div>
        <div className="flex items-center gap-3">
          <div role="group" aria-label="Time range" className="flex rounded-xl border border-surface-200 bg-white p-1">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                aria-pressed={days === range}
                onClick={() => setDays(range)}
                className={`min-h-9 rounded-lg px-3 text-sm font-medium cursor-pointer ${days === range ? "bg-surface-900 text-white" : "text-surface-600 hover:text-surface-900"}`}
              >
                {range} days
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => void reload()} disabled={loading} aria-label="Refresh the numbers" className="gap-1.5">
            <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loadedAt ? loadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {!data && loading && (
        <div role="status" className="flex items-center justify-center gap-2 py-24 text-sm text-surface-600">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Loading the numbers…
        </div>
      )}

      {data && recent && (
        <div className="space-y-6">
          {!data.tracking_since ? (
            <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-700">
              No visits have been counted yet. Counting starts the first time someone opens the site after this version is live. Until then you see scans, signups and payments only.
            </p>
          ) : !visitsCoverRange ? (
            <p className="rounded-xl bg-surface-50 px-4 py-3 text-sm text-surface-700">
              Visitors have been counted since {formatShortDay(data.tracking_since.slice(0, 10))}. Earlier days show zero visitors because nobody was counting, not because nobody came.
            </p>
          ) : null}

          <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Visitors"
              value={String(data.current.visitors)}
              delta={change(data.current.visitors, data.previous.visitors)}
              against={`vs the previous ${data.range.days} days`}
              note={`${data.current.pageviews} page views. A visitor is counted once a day.`}
            />
            <StatTile
              label="Scans"
              value={String(data.current.scans)}
              delta={change(data.current.scans, data.previous.scans)}
              against={`vs the previous ${data.range.days} days`}
              note={`${data.current.scanners} different people`}
            />
            <StatTile
              label="Signups"
              value={String(data.current.signups)}
              delta={change(data.current.signups, data.previous.signups)}
              against={`vs the previous ${data.range.days} days`}
              note={`${data.all_time.users} accounts in total`}
            />
            <StatTile
              label="Paying customers"
              value={String(data.current.paid)}
              delta={change(data.current.paid, data.previous.paid)}
              against={`vs the previous ${data.range.days} days`}
              note={`$${revenue(data.current)} at list price. Test payments are not counted.`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <DailyBars title="Visitors per day" unit="visitors" days={data.by_day.map((d) => ({ day: d.day, value: d.visitors }))} />
            <DailyBars title="Scans per day" unit="scans" days={data.by_day.map((d) => ({ day: d.day, value: d.scans }))} />
          </div>

          <Funnel
            showShare={visitsCoverRange}
            steps={[
              { label: "Visited the site", value: data.current.visitors },
              { label: "Opened the scanner", value: data.current.scanner_visitors },
              { label: "Ran a scan", value: data.current.scanners },
              { label: "Signed up", value: data.current.signups },
              { label: "Paid", value: data.current.paid },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <RankedTable
              title="Pages"
              column="Views"
              extraColumn="Visitors"
              rows={data.top_pages.map((p) => ({ name: p.path, value: p.views, extra: p.visitors }))}
              empty="No page views yet."
            />
            <RankedTable
              title="Where visitors come from"
              column="Visitors"
              rows={data.sources.map((s) => ({ name: s.name, value: s.visitors }))}
              empty="No visits yet."
            />
            {hasCountries && (
              <RankedTable
                title="Countries"
                column="Visitors"
                rows={data.countries.map((c) => ({ name: c.name, value: c.visitors }))}
                empty="No visits yet."
              />
            )}
            <RankedTable
              title="Devices"
              column="Visitors"
              rows={data.devices.map((d) => ({ name: d.name, value: d.visitors }))}
              empty="No visits yet."
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <RecentList title="Latest signups" rows={recent.signups} empty="No signups yet." />
            <RecentList title="Latest scans" rows={recent.scans} empty="No scans yet." />
            <RecentList title="Latest builds" rows={recent.builds} empty="No builds yet." />
          </div>

          <p className="text-sm text-surface-600">
            All time: {data.all_time.users} accounts, {data.all_time.projects} apps scanned, {data.all_time.scans} scans started,
            {" "}{data.all_time.builds} builds, {data.all_time.paid} paying customers. Days are cut in {data.range.tz} time.
          </p>
        </div>
      )}
    </div>
  );
};
