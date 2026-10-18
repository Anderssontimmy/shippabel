import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ toast: vi.fn(), refresh: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: mock.toast }) }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { refreshSession: mock.refresh } } }));
import { CheckoutReturn } from "./CheckoutReturn";

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><CheckoutReturn /><Where /></MemoryRouter>);
const withPlan = (plan?: string) => ({ data: { user: { app_metadata: plan ? { plan } : {} } } });

describe("back from checkout", () => {
  beforeEach(() => { mock.toast.mockReset(); mock.refresh.mockReset(); });

  it("confirms the plan on the page the buyer paid from, and cleans the address", async () => {
    mock.refresh.mockResolvedValue(withPlan("ship"));
    renderAt("/scan/abc?checkout=success&keep=1");
    await waitFor(() => expect(mock.toast).toHaveBeenCalledWith("success", "Payment confirmed. You're on the Ship plan!"));
    expect(screen.getByTestId("where").textContent).toBe("/scan/abc?keep=1");
    expect(mock.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps asking until a late webhook has written the plan", async () => {
    mock.refresh.mockResolvedValueOnce(withPlan()).mockResolvedValue(withPlan("unlimited"));
    renderAt("/app/p1/listing?checkout=success");
    await waitFor(() => expect(mock.toast).toHaveBeenCalledWith("success", "Payment confirmed. You're on the Unlimited plan!"), { timeout: 5000 });
    expect(mock.refresh).toHaveBeenCalledTimes(2);
  });

  it("says nothing was charged when the buyer comes back without paying", async () => {
    renderAt("/scan/abc?checkout=cancelled");
    await waitFor(() => expect(mock.toast).toHaveBeenCalledWith("info", "No payment was made. Nothing was charged."));
    expect(screen.getByTestId("where").textContent).toBe("/scan/abc");
    expect(mock.refresh).not.toHaveBeenCalled();
  });

  it("leaves the dashboard to its own confirmation, and does nothing without a checkout in the address", () => {
    renderAt("/dashboard?checkout=success");
    renderAt("/scan/abc?other=1");
    expect(mock.refresh).not.toHaveBeenCalled();
    expect(mock.toast).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("where")[0]!.textContent).toBe("/dashboard?checkout=success");
  });
});
