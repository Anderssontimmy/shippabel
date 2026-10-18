import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false },
  checkout: vi.fn(),
  stripe: { loading: false, error: null as string | null },
  tracked: [] as unknown[][],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mock.auth }));
vi.mock("@/hooks/useStripe", () => ({ useStripe: () => ({ checkout: mock.checkout, ...mock.stripe }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...args: unknown[]) => { mock.tracked.push(args); } }));
import { BuyShipButton } from "./BuyShipButton";

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/scan/:id" element={<><BuyShipButton returnPath="/scan/abc">Get Ship, $99 one-time</BuyShipButton><Where /></>} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("buy button", () => {
  beforeEach(() => {
    mock.auth = { user: null, loading: false };
    mock.stripe = { loading: false, error: null };
    mock.checkout.mockReset();
    mock.tracked = [];
  });

  it("sends a signed-out buyer to log in and back to the same page with the intent in the address", () => {
    renderAt("/scan/abc");
    fireEvent.click(screen.getByRole("button", { name: "Get Ship, $99 one-time" }));
    expect(screen.getByTestId("where").textContent).toBe("/login?next=%2Fscan%2Fabc%3Fbuy%3Dship");
    expect(mock.checkout).not.toHaveBeenCalled();
    expect(mock.tracked).toContainEqual(["CTA Clicked", { location: "upgrade", action: "login_first" }]);
  });

  it("goes straight to checkout for a signed-in buyer, and says which page to come back to", () => {
    mock.auth = { user: { id: "u" }, loading: false };
    renderAt("/scan/abc");
    fireEvent.click(screen.getByRole("button", { name: "Get Ship, $99 one-time" }));
    expect(mock.checkout).toHaveBeenCalledWith("ship", "/scan/abc");
    expect(mock.tracked).toContainEqual(["CTA Clicked", { location: "upgrade", action: "checkout" }]);
  });

  it("finishes what a buyer started before logging in: checkout opens by itself, once, and the address is cleaned", () => {
    mock.auth = { user: { id: "u" }, loading: false };
    renderAt("/scan/abc?buy=ship&keep=1");
    expect(mock.checkout).toHaveBeenCalledTimes(1);
    expect(mock.checkout).toHaveBeenCalledWith("ship", "/scan/abc");
    expect(screen.getByTestId("where").textContent).toBe("/scan/abc?keep=1");
  });

  it("does not start a payment nobody asked for", () => {
    renderAt("/scan/abc?buy=ship"); // signed out: the buyer has to log in first
    expect(mock.checkout).not.toHaveBeenCalled();
    mock.auth = { user: { id: "u" }, loading: false };
    renderAt("/scan/abc"); // signed in, but never asked
    expect(mock.checkout).not.toHaveBeenCalled();
    mock.auth = { user: { id: "u" }, loading: true };
    renderAt("/scan/abc?buy=ship"); // not yet known who this is
    expect(mock.checkout).not.toHaveBeenCalled();
  });

  it("shows why checkout could not start, and cannot be pressed twice while it is opening", () => {
    mock.auth = { user: { id: "u" }, loading: false };
    mock.stripe = { loading: true, error: "Payments are temporarily unavailable." };
    renderAt("/scan/abc");
    expect(screen.getByRole("alert").textContent).toBe("Payments are temporarily unavailable.");
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
