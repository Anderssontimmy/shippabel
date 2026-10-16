import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ githubToken: null }) }));
vi.mock("@/hooks/useCredentials", () => ({ useCredentials: () => ({ hasCredential: () => false }) }));
vi.mock("@/hooks/useScan", () => ({
  useScan: () => ({ scanning: false, progress: 0, error: null, scanFromUrl: vi.fn(), scanFromFile: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { Scan } from "./Scan";

describe("scan page", () => {
  it("says the free check only reads the code", () => {
    render(<MemoryRouter><Scan /></MemoryRouter>);
    expect(screen.getByText(/only reads your code/)).toBeTruthy();
  });

  it("does not claim the code is never stored, because uploaded zips are kept privately", () => {
    render(<MemoryRouter><Scan /></MemoryRouter>);
    expect(screen.queryByText(/never store your code/i)).toBeNull();
    expect(screen.getByText(/If you upload a zip, we keep it in private storage/)).toBeTruthy();
  });
});
