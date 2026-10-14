import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ refresh: vi.fn(), auth: { user: { id: "user", email: "buyer@example.com" }, loading: false } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mock.auth }));
vi.mock("@/lib/supabase", () => {
  // Any query chain resolves to "no rows"; only auth.refreshSession is under test.
  const chain: unknown = new Proxy(() => chain, {
    get: (_target, key) => (key === "then" ? (resolve: (value: unknown) => void) => resolve({ data: [], error: null }) : () => chain),
    apply: () => chain,
  });
  return { supabase: { from: () => chain, rpc: () => chain, auth: { refreshSession: mock.refresh } } };
});
import { Dashboard } from "./Dashboard";

const renderAfterCheckout = () => render(<MemoryRouter initialEntries={["/dashboard?checkout=success"]}><Dashboard /></MemoryRouter>);
const session = (plan?: string) => ({ data: { user: { app_metadata: plan ? { plan } : {} } } });

describe("returning from Stripe checkout", () => {
  beforeEach(() => mock.refresh.mockReset());

  it("confirms the purchased plan when the webhook has already landed", async () => {
    mock.refresh.mockResolvedValue(session("ship"));
    renderAfterCheckout();
    expect(await screen.findByText(/Payment confirmed — you're on the Ship plan!/)).toBeTruthy();
  });

  it("keeps refreshing until a late webhook has written the plan", async () => {
    mock.refresh.mockResolvedValueOnce(session()).mockResolvedValue(session("unlimited"));
    renderAfterCheckout();
    expect(await screen.findByText(/Payment confirmed — you're on the Unlimited plan!/, {}, { timeout: 5000 })).toBeTruthy();
    expect(mock.refresh).toHaveBeenCalledTimes(2);
  });
});
