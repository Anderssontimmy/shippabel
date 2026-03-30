import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    render(<Button>Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-primary-600");
  });

  it("applies secondary variant", () => {
    render(<Button variant="secondary">Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-surface-800");
  });

  it("applies ghost variant", () => {
    render(<Button variant="ghost">Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-surface-400");
  });

  it("applies size classes", () => {
    const { rerender } = render(<Button size="sm">S</Button>);
    expect(screen.getByRole("button").className).toContain("px-3");

    rerender(<Button size="lg">L</Button>);
    expect(screen.getByRole("button").className).toContain("px-6");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Button className="my-custom">Test</Button>);
    expect(screen.getByRole("button").className).toContain("my-custom");
  });
});
