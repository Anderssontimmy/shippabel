import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  user: null as null | { id: string; app_metadata?: Record<string, unknown> },
  checkout: vi.fn(),
  project: null as unknown,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mock.user, loading: false }) }));
vi.mock("@/hooks/useStripe", () => ({ useStripe: () => ({ checkout: mock.checkout, loading: false, error: null }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ShipFlowBar", () => ({ ShipFlowBar: () => null }));
vi.mock("@/components/ShipFlowGuide", () => ({ ShipFlowGuide: () => null }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: mock.project, error: null }) }) }) }),
    functions: { invoke: vi.fn() },
    auth: {},
  },
}));
import { ScanResults } from "./ScanResults";

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const renderReport = (id = "p1") =>
  render(
    <MemoryRouter initialEntries={[`/scan/${id}`]}>
      <Routes>
        <Route path="/scan/:id" element={<ScanResults />} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const webApp = {
  id: "p1", name: "my-app", user_id: "owner",
  scan_result: {
    score: 92, project_type: "react-web", needs_conversion: true, conversion_message: "Your app is a web app.",
    issues: [], summary: { critical: 0, warning: 0, info: 0, total: 0 },
  },
};

describe("the paid first step on the report", () => {
  beforeEach(() => { mock.user = { id: "owner", app_metadata: {} }; mock.checkout.mockReset(); mock.project = webApp; });

  it("offers a free reader the plan where the need is: what it gives, the price, one button", async () => {
    renderReport();
    const panel = (await screen.findByRole("heading", { name: "We can make your app store-ready" })).closest("div[id=conversion-section]") as HTMLElement;
    expect(panel.textContent).toContain("We convert your app and fix what Google would reject");
    expect(panel.textContent).toContain("One payment, no subscription");
    expect(screen.queryByRole("button", { name: /Make it Google Play ready/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Get Ship, $99 one-time" }));
    expect(mock.checkout).toHaveBeenCalledWith("ship", "/scan/p1");
  });

  it("no longer answers the first click with an error and a detour to the pricing page", async () => {
    renderReport();
    fireEvent.click(await screen.findByRole("button", { name: "Get Ship, $99 one-time" }));
    expect(screen.queryByTestId("where")).toBeNull(); // still on the report
    expect(mock.checkout).toHaveBeenCalledTimes(1);
  });

  it("sends a signed-out reader to log in and straight back to buying", async () => {
    mock.user = null;
    renderReport();
    fireEvent.click(await screen.findByRole("button", { name: "Get Ship, $99 one-time" }));
    expect(screen.getByTestId("where").textContent).toBe("/login?next=%2Fscan%2Fp1%3Fbuy%3Dship");
  });

  it("gives someone who has paid the conversion itself, not the offer", async () => {
    mock.user = { id: "owner", app_metadata: { plan: "ship" } };
    renderReport();
    expect(await screen.findByRole("button", { name: /Make it Google Play ready/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Get Ship/ })).toBeNull();
  });

  it("leaves the demo report as it was, since there is nothing to buy for a demo", async () => {
    renderReport("demo");
    expect(await screen.findByRole("button", { name: /Make it Google Play ready/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Get Ship/ })).toBeNull();
  });
});

describe("what the report shows right after a scan to make the next step worth taking", () => {
  const analysis = {
    app_description: "A habit tracker with daily streaks.",
    monetization_ideas: ["A free core with a paid plan for extra statistics."],
    strengths: ["Simple onboarding"],
    growth_suggestions: ["Add reminders"],
    store_preview: { title: "Habit Hero", short_description: "Build habits that stick with daily streaks." },
    earning_example: { billing: "monthly", price_usd: 4 },
  };
  const withAnalysis = { ...webApp, scan_result: { ...webApp.scan_result, potential_analysis: analysis } };
  beforeEach(() => { mock.user = { id: "owner", app_metadata: {} }; mock.checkout.mockReset(); mock.project = withAnalysis; });

  it("puts the draft of their Google Play page before the offer, so the offer is about something they have seen", async () => {
    renderReport();
    const draft = await screen.findByRole("heading", { name: "Your Google Play page, first draft" });
    const offer = screen.getByRole("heading", { name: "We can make your app store-ready" });
    expect(screen.getByText("Habit Hero")).toBeTruthy();
    expect(draft.compareDocumentPosition(offer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the earning example with Ship's price to a free reader, and without it to someone who has Ship", async () => {
    const { unmount } = renderReport();
    expect(await screen.findByText("At that price, 25 paying customers cover Ship's $99 in the first month.")).toBeTruthy();
    expect(screen.getByText(/would bring in about/)).toBeTruthy();
    unmount();
    mock.user = { id: "owner", app_metadata: { plan: "ship" } };
    renderReport();
    expect(await screen.findByText(/would bring in about/)).toBeTruthy();
    expect(screen.queryByText(/Ship's \$99/)).toBeNull();
  });

  it("shows neither for a report made before they existed", async () => {
    mock.project = { ...webApp, scan_result: { ...webApp.scan_result, potential_analysis: { ...analysis, store_preview: undefined, earning_example: undefined } } };
    renderReport();
    expect(await screen.findByRole("heading", { name: "We can make your app store-ready" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Your Google Play page, first draft" })).toBeNull();
    expect(screen.queryByText(/would bring in about/)).toBeNull();
  });

  it("shows both in the demo, which is where people look to see what they would get", async () => {
    renderReport("demo");
    expect(await screen.findByRole("heading", { name: "Your Google Play page, first draft" })).toBeTruthy();
    expect(screen.getByText(/would bring in about/)).toBeTruthy();
  });
});
