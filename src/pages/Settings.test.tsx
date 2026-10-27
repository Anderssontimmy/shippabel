import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ signInWithGitHub: vi.fn(), connected: [] as string[] }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" }, loading: false, signInWithGitHub: mock.signInWithGitHub }) }));
vi.mock("@/hooks/useCredentials", () => ({
  useCredentials: () => ({ loading: false, saving: false, error: null, hasCredential: (p: string) => mock.connected.includes(p), saveCredential: vi.fn(), removeCredential: vi.fn() }),
}));
vi.mock("@/components/ui/Toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import { Settings } from "./Settings";

describe("settings page", () => {
  beforeEach(() => { mock.connected = []; mock.signInWithGitHub.mockReset(); mock.signInWithGitHub.mockResolvedValue({ error: null }); });

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

  it("connects GitHub with one click and comes back to Settings", () => {
    render(<MemoryRouter><Settings /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));
    expect(mock.signInWithGitHub).toHaveBeenCalledWith(`${window.location.origin}/login?next=%2Fsettings`);
    // the token form is still there for someone who wants to limit access to one repository
    expect(screen.getByRole("button", { name: "Use a token instead" })).toBeTruthy();
  });

  it("does not offer to connect GitHub again once it is connected", () => {
    mock.connected = ["github"];
    render(<MemoryRouter><Settings /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Continue with GitHub" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Update" }).length).toBeGreaterThan(0);
  });
});
