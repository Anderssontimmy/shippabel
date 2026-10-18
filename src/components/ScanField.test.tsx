import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent: track }));
import { ScanField } from "./ScanField";

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const renderField = (location = "blog_top") =>
  render(
    <MemoryRouter initialEntries={["/blog/x"]}>
      <Routes>
        <Route path="/blog/x" element={<ScanField location={location} />} />
        <Route path="/scan" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("scan field", () => {
  beforeEach(() => track.mockClear());

  it("takes the pasted link to the scanner and says where it was pasted", () => {
    renderField();
    fireEvent.change(screen.getByLabelText("GitHub repository link"), { target: { value: " https://github.com/acme/app " } });
    fireEvent.click(screen.getByRole("button", { name: /Check now/ }));
    expect(screen.getByTestId("where").textContent).toBe("/scan?url=https%3A%2F%2Fgithub.com%2Facme%2Fapp");
    expect(track).toHaveBeenCalledWith("CTA Clicked", { location: "blog_top", action: "scan_with_url" });
  });

  it("opens the scanner empty when nothing was pasted", () => {
    renderField("landing_hero");
    fireEvent.click(screen.getByRole("button", { name: /Check now/ }));
    expect(screen.getByTestId("where").textContent).toBe("/scan");
    expect(track).toHaveBeenCalledWith("CTA Clicked", { location: "landing_hero", action: "scan_empty" });
  });

  it("offers a zip upload as the other way in", () => {
    renderField();
    fireEvent.click(screen.getByRole("link", { name: "upload a zip file" }));
    expect(screen.getByTestId("where").textContent).toBe("/scan");
    expect(track).toHaveBeenCalledWith("CTA Clicked", { location: "blog_top", action: "upload_zip" });
  });
});
