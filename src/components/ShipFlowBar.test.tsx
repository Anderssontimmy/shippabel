import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const flow = vi.hoisted(() => ({
  state: {
    currentStep: "screenshots",
    steps: [
      { id: "scan", label: "Check", completed: true, available: true },
      { id: "fix", label: "Fix", completed: true, available: true },
      { id: "listing", label: "Store Page", completed: true, available: true },
      { id: "screenshots", label: "Screenshots", completed: false, available: true },
      { id: "build", label: "Build", completed: false, available: false },
    ],
  },
}));
vi.mock("@/hooks/useShipFlow", () => ({ useShipFlow: () => flow.state }));
import { ShipFlowBar } from "./ShipFlowBar";

describe("ship flow bar", () => {
  it("scrolls the current step into view, so a phone does not open on the first step", () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this); };
    render(<MemoryRouter><ShipFlowBar projectId="p1" /></MemoryRouter>);
    expect(scrolled).toHaveLength(1);
    expect(scrolled[0]!.textContent).toBe("Screenshots");
  });

  it("makes every step, locked or not, at least 36px tall and readable", () => {
    render(<MemoryRouter><ShipFlowBar projectId="p1" /></MemoryRouter>);
    for (const name of ["Check", "Screenshots"]) {
      expect(screen.getByRole("link", { name }).className).toContain("min-h-9");
    }
    const locked = screen.getByText("Build");
    expect(locked.className).toContain("min-h-9");
    expect(locked.className).toContain("text-surface-500");
    expect(locked.className).not.toContain("text-surface-300");
  });
});
