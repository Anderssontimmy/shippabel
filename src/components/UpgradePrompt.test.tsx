import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ auth: { user: { id: "u" } as null | { id: string }, loading: false }, checkout: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mock.auth }));
vi.mock("@/hooks/useStripe", () => ({ useStripe: () => ({ checkout: mock.checkout, loading: false, error: null }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { UpgradePrompt } from "./UpgradePrompt";

describe("paywall", () => {
  beforeEach(() => { mock.auth = { user: { id: "u" }, loading: false }; mock.checkout.mockReset(); });

  it("starts checkout from the page that asked for it, instead of linking to the pricing page", () => {
    render(<MemoryRouter initialEntries={["/app/p1/listing"]}><UpgradePrompt feature="AI Store Page Writer" /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /Get Ship/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Get Ship/ }));
    expect(mock.checkout).toHaveBeenCalledWith("ship", "/app/p1/listing");
  });

  it("still offers the small version as a link to the plans", () => {
    render(<MemoryRouter><UpgradePrompt feature="Auto-fix" compact /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Unlock with Ship plan" }).getAttribute("href")).toBe("/pricing");
  });
});
