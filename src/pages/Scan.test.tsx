import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  githubToken: null as string | null,
  signInWithGitHub: vi.fn(),
  scanError: null as string | null,
  tracked: [] as unknown[][],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ githubToken: mock.githubToken, signInWithGitHub: mock.signInWithGitHub }) }));
vi.mock("@/hooks/useCredentials", () => ({ useCredentials: () => ({ hasCredential: () => false }) }));
vi.mock("@/hooks/useScan", () => ({
  useScan: () => ({ scanning: false, progress: 0, error: mock.scanError, scanFromUrl: vi.fn(), scanFromFile: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...args: unknown[]) => { mock.tracked.push(args); } }));
import { Scan } from "./Scan";

const renderScan = () => render(<MemoryRouter><Scan /></MemoryRouter>);
const PRIVATE = "Repository or file not found. If it is a private app, continue with GitHub so we can read it.";

describe("scan page", () => {
  beforeEach(() => {
    mock.githubToken = null;
    mock.scanError = null;
    mock.tracked = [];
    mock.signInWithGitHub.mockReset();
    mock.signInWithGitHub.mockResolvedValue({ error: null });
  });

  it("says the free check only reads the code", () => {
    renderScan();
    expect(screen.getByText(/only reads your code/)).toBeTruthy();
  });

  it("does not claim the code is never stored, because uploaded zips are kept privately", () => {
    renderScan();
    expect(screen.queryByText(/never store your code/i)).toBeNull();
    expect(screen.getByText(/If you upload a zip, we keep it in private storage/)).toBeTruthy();
  });

  it("offers one click for a private app instead of sending people to a token form in Settings", () => {
    renderScan();
    expect(screen.queryByRole("link", { name: /Connect your GitHub account/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Paste your GitHub link here"), { target: { value: "https://github.com/acme/secret-app" } });
    fireEvent.click(screen.getByRole("button", { name: "continue with GitHub" }));
    // it comes back to the scanner with what was pasted, through the login page the sign-in already uses
    const back = encodeURIComponent(`/scan?url=${encodeURIComponent("https://github.com/acme/secret-app")}`);
    expect(mock.signInWithGitHub).toHaveBeenCalledWith(`${window.location.origin}/login?next=${back}`);
    expect(mock.tracked).toContainEqual(["CTA Clicked", { location: "scan_private_repo", action: "github_oauth" }]);
  });

  it("puts the same button in the error when a private repository could not be read", () => {
    mock.scanError = PRIVATE;
    renderScan();
    fireEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));
    expect(mock.signInWithGitHub).toHaveBeenCalledTimes(1);
  });

  it("calls it reconnecting when a token is already connected but did not give access", () => {
    mock.githubToken = "github_pat_wrongscope";
    mock.scanError = PRIVATE;
    renderScan();
    expect(screen.getByRole("button", { name: "Reconnect with GitHub" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue with GitHub" })).toBeNull();
  });

  it("offers no GitHub button for a failure it would not fix", () => {
    mock.scanError = "GitHub refused access or reached its request limit. Check repository access and try again later.";
    renderScan();
    // the sentence under the field still offers it; the error itself gets no button
    expect(screen.queryByRole("button", { name: "Continue with GitHub" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reconnect with GitHub" })).toBeNull();
  });

  it("shows why GitHub sign-in could not start", async () => {
    mock.signInWithGitHub.mockResolvedValue({ error: new Error("GitHub sign-in is not available right now.") });
    renderScan();
    fireEvent.click(screen.getByRole("button", { name: "continue with GitHub" }));
    expect(await screen.findByText("GitHub sign-in is not available right now.")).toBeTruthy();
  });
});
