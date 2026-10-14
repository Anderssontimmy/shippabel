import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const flow = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("@/hooks/useShipFlow", () => ({ useShipFlow: () => flow.state }));
import { ShipFlowGuide } from "./ShipFlowGuide";

const ids = ["scan", "fix", "signup", "listing", "screenshots", "connect", "build", "submit"];
const setFlow = (currentStep: string, extra: Record<string, unknown> = {}) => {
  flow.state = { currentStep, steps: ids.map((id) => ({ id, completed: false })), needsConversion: false, criticalIssues: 0, ...extra };
};
const renderGuide = () => render(<MemoryRouter><ShipFlowGuide projectId="p1" /></MemoryRouter>);

describe("ship flow guide", () => {
  beforeEach(() => setFlow("fix"));

  it("points a problem-free web app at the conversion, and scrolls to it", () => {
    setFlow("fix", { needsConversion: true });
    const target = document.createElement("div");
    target.id = "conversion-section";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    renderGuide();
    expect(screen.getByRole("heading", { name: "Make your app ready for Google Play" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Show me where/ }));
    expect(target.scrollIntoView).toHaveBeenCalled();
    target.remove();
  });

  it("does not send people to an 'Auto-fix' button that does not exist", () => {
    setFlow("fix", { criticalIssues: 2 });
    renderGuide();
    expect(screen.getByRole("heading", { name: "Fix the problems we found" })).toBeTruthy();
    expect(screen.queryByText(/Auto-fix/)).toBeNull();
  });

  it("does not ask web-app owners to get an Expo token", () => {
    setFlow("connect");
    renderGuide();
    expect(screen.queryByText(/EAS|Expo/)).toBeNull();
    expect(screen.getByText(/Google Play service account/)).toBeTruthy();
  });

  it("says the last step is a test release, as the flow bar does", () => {
    setFlow("submit");
    renderGuide();
    expect(screen.getByRole("heading", { name: "Upload to Google Play testing" })).toBeTruthy();
  });
});
