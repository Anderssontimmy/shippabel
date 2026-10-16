import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminOverview } from "@/lib/adminStats";

const mock = vi.hoisted(() => ({
  auth: { user: null as null | { id: string; app_metadata?: Record<string, unknown> }, loading: false },
  stats: { data: null as unknown, loading: false, error: null as string | null, loadedAt: null as Date | null, reload: vi.fn() },
  requested: [] as { days: number; enabled: boolean }[],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mock.auth }));
vi.mock("@/hooks/useAdminStats", () => ({
  useAdminStats: (days: number, enabled: boolean) => { mock.requested.push({ days, enabled }); return mock.stats; },
}));
import { Admin } from "./Admin";

const period = { visitors: 12, pageviews: 30, scanner_visitors: 5, scans: 4, scanners: 3, signups: 2, paid: 1, paid_ship: 1, paid_unlimited: 0 };
const overview = (patch: Partial<AdminOverview> = {}): AdminOverview => ({
  range: { days: 7, from: "2026-10-10", to: "2026-10-16", tz: "Europe/Stockholm" },
  tracking_since: "2026-10-01T08:00:00Z",
  current: period,
  previous: { ...period, visitors: 8, scans: 4, signups: 0, paid: 0, paid_ship: 0 },
  by_day: ["10", "11", "12", "13", "14", "15", "16"].map((d, i) => ({ day: `2026-10-${d}`, visitors: i, pageviews: i * 2, scans: i % 2, signups: 0 })),
  top_pages: [{ path: "/", views: 20, visitors: 10 }, { path: "/pricing", views: 6, visitors: 4 }],
  sources: [{ name: "news.ycombinator.com", visitors: 6 }, { name: "Direct", visitors: 4 }],
  countries: [{ name: "SE", visitors: 7 }],
  devices: [{ name: "desktop", visitors: 9 }, { name: "mobile", visitors: 3 }],
  recent_signups: [{ at: "2026-10-15T10:00:00Z", email: "new@example.com", provider: "github", plan: "free" }],
  recent_scans: [{ at: "2026-10-15T09:00:00Z", name: "my-app", repo_url: "https://github.com/acme/my-app", score: "81", type: "expo", signed_in: false }],
  recent_builds: [],
  all_time: { users: 9, projects: 21, scans: 25, builds: 1, paid: 1 },
  ...patch,
});

const renderAdmin = () =>
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("admin page", () => {
  beforeEach(() => {
    mock.auth = { user: { id: "owner", app_metadata: { is_admin: true } }, loading: false };
    mock.stats = { data: overview(), loading: false, error: null, loadedAt: null, reload: vi.fn() };
    mock.requested = [];
  });

  it("sends a signed-out visitor to the login page", () => {
    mock.auth = { user: null, loading: false };
    renderAdmin();
    expect(screen.getByText("Login page")).toBeTruthy();
  });

  it("is a page that does not exist for a signed-in user who is not the owner, and asks for no numbers", () => {
    mock.auth = { user: { id: "customer", app_metadata: { plan: "ship" } }, loading: false };
    renderAdmin();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.queryByText("Visitors per day")).toBeNull();
    expect(mock.requested.every((r) => r.enabled === false)).toBe(true);
  });

  it("shows the key numbers with the change against the period before", () => {
    renderAdmin();
    const tiles = screen.getByRole("region", { name: "Key numbers" });
    expect(within(tiles).getByText("Visitors").nextElementSibling?.textContent).toBe("12");
    expect(within(tiles).getByText("4 more (50%)")).toBeTruthy();
    expect(within(tiles).getByText(/\$99 at list price/)).toBeTruthy();
    expect(within(tiles).getAllByText(/vs the previous 7 days/).length).toBe(4);
  });

  it("asks for another range when a button is pressed", () => {
    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(mock.requested.at(-1)).toEqual({ days: 90, enabled: true });
    expect(screen.getByRole("button", { name: "90 days" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("gives every chart a table with every day, and a summary for screen readers", () => {
    renderAdmin();
    const chart = screen.getByRole("img", { name: /Visitors per day: 21 in 7 days, most on Fri 16 Oct with 6/ });
    expect(chart).toBeTruthy();
    const table = screen.getByRole("table", { name: "Visitors per day by day" });
    expect(within(table).getAllByRole("row")).toHaveLength(8);
  });

  it("shows the share of visitors per step only when visitors were counted for the whole range", () => {
    renderAdmin();
    expect(screen.getByText("42% of visitors")).toBeTruthy();
    mock.stats = { ...mock.stats, data: overview({ tracking_since: "2026-10-14T08:00:00Z" }) };
    renderAdmin();
    expect(screen.getByText(/Visitors have been counted since 14 Oct/)).toBeTruthy();
  });

  it("says counting has not started instead of showing zero as if it were a result", () => {
    mock.stats = { ...mock.stats, data: overview({ tracking_since: null, current: { ...period, visitors: 0, pageviews: 0, scanner_visitors: 0 } }) };
    renderAdmin();
    expect(screen.getByText(/No visits have been counted yet/)).toBeTruthy();
    expect(screen.queryByText(/% of visitors/)).toBeNull();
  });

  it("leaves out the countries card while no visit has a country, and shows it once one does", () => {
    mock.stats = { ...mock.stats, data: overview({ countries: [{ name: "Unknown", visitors: 7 }] }) };
    const first = renderAdmin();
    expect(screen.queryByRole("heading", { name: "Countries" })).toBeNull();
    first.unmount();
    mock.stats = { ...mock.stats, data: overview({ countries: [{ name: "SE", visitors: 5 }, { name: "Unknown", visitors: 2 }] }) };
    renderAdmin();
    expect(screen.getByRole("heading", { name: "Countries" })).toBeTruthy();
  });

  it("lists what happened last and where visitors came from", () => {
    renderAdmin();
    expect(screen.getByText("new@example.com")).toBeTruthy();
    expect(screen.getByText("acme/my-app")).toBeTruthy();
    expect(screen.getByText("news.ycombinator.com")).toBeTruthy();
    expect(screen.getByText("No builds yet.")).toBeTruthy();
  });

  it("shows a failure with the server's words", () => {
    mock.stats = { ...mock.stats, data: null, error: "Could not load the numbers." };
    renderAdmin();
    expect(screen.getByText("Could not load the numbers.")).toBeTruthy();
  });
});
