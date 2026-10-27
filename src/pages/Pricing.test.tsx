import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useStripe", () => ({ useStripe: () => ({ checkout: vi.fn(), loading: false, error: null }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { Pricing } from "./Pricing";

const renderPricing = () => render(<MemoryRouter><Pricing /></MemoryRouter>);

describe("pricing page", () => {
  it("does not claim a popularity the product has no data for", () => {
    renderPricing();
    expect(screen.queryByText(/most popular/i)).toBeNull();
    expect(screen.getByText("Best for one app")).toBeTruthy();
  });

  it("keeps the heading order h1, then h2 for each plan", () => {
    renderPricing();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining(["Free", "Ship", "Unlimited"]),
    );
  });

  it("says before payment when we change the customer's repository", () => {
    renderPricing();
    expect(screen.getByText(/only change your repository when you press Fix/)).toBeTruthy();
  });
});

describe("pricing page promise", () => {
  it("shows the money-back promise with the words shared with the landing page", async () => {
    const { guarantee } = await import("@/lib/guarantee");
    renderPricing();
    expect(screen.getByText(guarantee.headline)).toBeTruthy();
    expect(screen.getByText(guarantee.detail)).toBeTruthy();
  });
});
