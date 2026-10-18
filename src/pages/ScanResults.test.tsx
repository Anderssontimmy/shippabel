import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: () => ({}), functions: { invoke: vi.fn() }, auth: {} } }));
import { ScanResults } from "./ScanResults";

const renderDemo = () =>
  render(
    <MemoryRouter initialEntries={["/scan/demo"]}>
      <Routes>
        <Route path="/scan/:id" element={<ScanResults />} />
      </Routes>
    </MemoryRouter>,
  );

describe("scan results page", () => {
  it("lists what must be fixed before it describes the app", async () => {
    renderDemo();
    const mustFix = await screen.findByRole("heading", { level: 2, name: /Must fix before publishing/ });
    const potential = screen.getByRole("heading", { level: 2, name: "What we see in your app" });
    expect(mustFix.compareDocumentPosition(potential) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("tells the reader what it takes to reach the top score, right under the verdict", async () => {
    renderDemo();
    const goal = await screen.findByText("Fix the 10 items below and your score can reach 100. Auto-fix can do 5 of them.");
    const verdict = screen.getByRole("heading", { level: 1 });
    expect(verdict.compareDocumentPosition(goal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has exactly one primary action while the app still needs conversion", async () => {
    renderDemo();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByRole("button", { name: /Make it Google Play ready/ })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Get started/ })).toBeNull();
  });
});
