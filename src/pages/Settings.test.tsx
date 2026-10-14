import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" }, loading: false }) }));
vi.mock("@/hooks/useCredentials", () => ({
  useCredentials: () => ({ loading: false, saving: false, error: null, hasCredential: () => false, saveCredential: vi.fn(), removeCredential: vi.fn() }),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import { Settings } from "./Settings";

describe("settings page", () => {
  it("says Expo is only for Expo and React Native apps", () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.getByText(/Only needed if your app is built with Expo or React Native/)).toBeTruthy();
    expect(screen.queryByText(/Required for building your app/)).toBeNull();
  });

  it("says GitHub is needed to fix and build, not only to scan private apps", () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.getByText(/Needed to scan private apps and to fix and build your app/)).toBeTruthy();
  });

  it("uses plain words for what is ready", () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.getByText("What's ready")).toBeTruthy();
    expect(screen.queryByText(/Pipeline|Client-side/)).toBeNull();
  });
});
