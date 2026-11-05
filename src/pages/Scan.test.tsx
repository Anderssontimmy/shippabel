import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  githubToken: null as string | null,
  authLoading: false,
  signInWithGitHub: vi.fn(),
  scanError: null as string | null,
  scanFromUrl: vi.fn(),
  tracked: [] as unknown[][],
  counting: true,
  isAdmin: false,
  reported: [] as string[],
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { app_metadata: { is_admin: mock.isAdmin } },
    githubToken: mock.githubToken,
    signInWithGitHub: mock.signInWithGitHub,
    loading: mock.authLoading,
  }),
}));
vi.mock("@/lib/pageViews", () => ({
  shouldCount: ({ isAdmin }: { isAdmin: boolean }) => mock.counting && !isAdmin,
  sendRejectedLink: (site: string) => { mock.reported.push(site); },
}));
vi.mock("@/hooks/useCredentials", () => ({ useCredentials: () => ({ hasCredential: () => false }) }));
vi.mock("@/hooks/useScan", () => ({
  useScan: () => ({ scanning: false, progress: 0, error: mock.scanError, scanFromUrl: mock.scanFromUrl, scanFromFile: vi.fn() }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...args: unknown[]) => { mock.tracked.push(args); } }));
import { Scan } from "./Scan";

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const page = (url: string) => <MemoryRouter initialEntries={[url]}><Scan /><Where /></MemoryRouter>;
const renderScan = (url = "/scan") => render(page(url));
const PRIVATE = "Repository or file not found. If it is a private app, continue with GitHub so we can read it.";
const field = () => screen.getByLabelText("Paste your GitHub link here") as HTMLInputElement;
const check = (pasted: string) => {
  renderScan();
  fireEvent.change(field(), { target: { value: pasted } });
  fireEvent.click(screen.getByRole("button", { name: /check my app/i }));
};

describe("scan page", () => {
  beforeEach(() => {
    mock.githubToken = null;
    mock.authLoading = false;
    mock.scanError = null;
    mock.tracked = [];
    mock.counting = true;
    mock.isAdmin = false;
    mock.reported = [];
    mock.signInWithGitHub.mockReset();
    mock.signInWithGitHub.mockResolvedValue({ error: null });
    mock.scanFromUrl.mockReset();
    mock.scanFromUrl.mockResolvedValue(null);
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

  describe("a link pasted on the landing page or in a guide", () => {
    it("is scanned straight away, because pressing Check now already asked for that, and the address is cleaned", () => {
      renderScan("/scan?url=https%3A%2F%2Fgithub.com%2Facme%2Fapp");
      expect(field().value).toBe("https://github.com/acme/app");
      expect(mock.scanFromUrl).toHaveBeenCalledTimes(1);
      expect(mock.scanFromUrl).toHaveBeenCalledWith("https://github.com/acme/app");
      expect(screen.getByTestId("where").textContent).toBe("/scan");
    });

    it("is shown in the field with a reason when it is not a GitHub link, and not scanned", () => {
      renderScan("/scan?url=not-a-link");
      expect(field().value).toBe("not-a-link");
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
      expect(screen.getByText(/That doesn't look like a GitHub link/)).toBeTruthy();
    });

    it("waits until it is known who is signed in, so a private app is scanned as its owner", () => {
      mock.authLoading = true;
      const { rerender } = renderScan("/scan?url=https%3A%2F%2Fgithub.com%2Facme%2Fapp");
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
      mock.authLoading = false;
      rerender(page("/scan?url=https%3A%2F%2Fgithub.com%2Facme%2Fapp"));
      expect(mock.scanFromUrl).toHaveBeenCalledTimes(1);
    });

    it("does nothing when nothing was pasted", () => {
      renderScan("/scan");
      expect(field().value).toBe("");
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
    });
  });

  describe("a link in any of the usual forms", () => {
    it("is scanned as the plain project address, whatever was around it", () => {
      for (const pasted of ["github.com/acme/app", "https://github.com/acme/app.git", "https://github.com/acme/app/tree/main/src"]) {
        mock.scanFromUrl.mockClear();
        check(pasted);
        expect(mock.scanFromUrl, pasted).toHaveBeenCalledWith("https://github.com/acme/app");
        cleanup();
      }
    });

    it("from the landing page is cleaned up in the same way", () => {
      renderScan("/scan?url=github.com%2Facme%2Fapp.git");
      expect(mock.scanFromUrl).toHaveBeenCalledWith("https://github.com/acme/app");
    });
  });

  describe("a link that is not a GitHub project", () => {
    it("says what a link should look like, scans nothing, and tells the owner only the website's name", () => {
      check("https://my-secret-app.lovable.app/preview?token=abc");
      expect(screen.getByText(/doesn't look like a GitHub link. It should look like github.com\/your-name\/your-app/)).toBeTruthy();
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
      expect(mock.reported).toEqual(["lovable.app"]);
    });

    it("does the same when the link came from the landing page", () => {
      renderScan("/scan?url=https%3A%2F%2Freplit.com%2F%40someone%2FDaily-Habits");
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
      expect(mock.reported).toEqual(["replit.com"]);
    });

    it("reports text that is not a link at all with a label, not with the text", () => {
      check("my daily habits app");
      expect(mock.reported).toEqual(["(not a link)"]);
    });

    it("reports nothing for someone who asked not to be counted, nor for the owner testing the page", () => {
      mock.counting = false;
      check("https://replit.com/@someone/app");
      expect(mock.reported).toEqual([]);
      expect(screen.getByText(/doesn't look like a GitHub link/)).toBeTruthy();
      cleanup();
      mock.counting = true;
      mock.isAdmin = true;
      check("https://replit.com/@someone/app");
      expect(mock.reported).toEqual([]);
    });

    it("reports nothing when nothing was pasted", () => {
      check("   ");
      expect(mock.reported).toEqual([]);
    });
  });

  describe("back from signing in with GitHub", () => {
    it("fills the field again and lets the person press the button, with a line that says so", () => {
      renderScan("/scan?url=https%3A%2F%2Fgithub.com%2Facme%2Fsecret-app&github=connected");
      expect(field().value).toBe("https://github.com/acme/secret-app");
      expect(screen.getByRole("status").textContent).toContain("signed in with GitHub");
      expect(mock.scanFromUrl).not.toHaveBeenCalled();
      expect(screen.getByTestId("where").textContent).toBe("/scan");
    });
  });

  describe("a private app", () => {
    it("offers one click instead of sending people to a token form in Settings, and comes back with the link", () => {
      renderScan();
      expect(screen.queryByRole("link", { name: /Connect your GitHub account/ })).toBeNull();
      fireEvent.change(field(), { target: { value: "https://github.com/acme/secret-app" } });
      fireEvent.click(screen.getByRole("button", { name: "continue with GitHub" }));
      const back = encodeURIComponent(`/scan?url=${encodeURIComponent("https://github.com/acme/secret-app")}&github=connected`);
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
});
