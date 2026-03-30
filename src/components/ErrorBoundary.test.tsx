import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("Test error");
  return <div>Working content</div>;
};

describe("ErrorBoundary", () => {
  // Suppress console.error from React during error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows fallback UI when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows custom fallback title", () => {
    render(
      <ErrorBoundary fallbackTitle="Custom error title">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error title")).toBeInTheDocument();
  });

  it("shows retry button in error state", async () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    const retryButton = screen.getByText("Try again");
    expect(retryButton).toBeInTheDocument();
    expect(retryButton.tagName).toBe("BUTTON");
  });
});
