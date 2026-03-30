import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge severity="critical">Critical</Badge>);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("applies critical severity styles", () => {
    render(<Badge severity="critical">Test</Badge>);
    expect(screen.getByText("Test").className).toContain("text-red-400");
  });

  it("applies warning severity styles", () => {
    render(<Badge severity="warning">Test</Badge>);
    expect(screen.getByText("Test").className).toContain("text-amber-400");
  });

  it("applies info severity styles", () => {
    render(<Badge severity="info">Test</Badge>);
    expect(screen.getByText("Test").className).toContain("text-blue-400");
  });
});
