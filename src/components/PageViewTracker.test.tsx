import { render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  auth: { user: null as null | { app_metadata?: Record<string, unknown> }, loading: false },
  counts: true,
  sent: [] as unknown[],
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mock.auth }));
vi.mock("@/lib/pageViews", async (original) => ({
  ...(await original<typeof import("@/lib/pageViews")>()),
  shouldCount: () => mock.counts,
  sendPageView: (view: unknown) => { mock.sent.push(view); },
}));
import { PageViewTracker } from "./PageViewTracker";

// Moves around the app the way a visitor does.
const Walk = ({ path }: { path: string }) => {
  const navigate = useNavigate();
  useEffect(() => { navigate(path); }, [navigate, path]);
  return null;
};

describe("page view tracker", () => {
  beforeEach(() => { mock.auth = { user: null, loading: false }; mock.counts = true; mock.sent = []; });

  it("counts the first page as the start of a visit, and later pages as pages", () => {
    const { rerender } = render(<MemoryRouter initialEntries={["/?utm_source=hn"]}><PageViewTracker /><Walk path="/" /></MemoryRouter>);
    expect(mock.sent).toEqual([{ path: "/", entry: true, ref: undefined, src: "hn" }]);
    rerender(<MemoryRouter initialEntries={["/?utm_source=hn"]}><PageViewTracker /><Walk path="/pricing" /></MemoryRouter>);
    expect(mock.sent).toHaveLength(2);
    expect(mock.sent[1]).toEqual({ path: "/pricing", entry: false });
  });

  it("does not count the same page twice, or a change of query string", () => {
    const { rerender } = render(<MemoryRouter initialEntries={["/pricing"]}><PageViewTracker /></MemoryRouter>);
    rerender(<MemoryRouter initialEntries={["/pricing"]}><PageViewTracker /></MemoryRouter>);
    expect(mock.sent).toHaveLength(1);
  });

  it("counts nothing when the rules say no (preview, do not track, the owner)", () => {
    mock.counts = false;
    render(<MemoryRouter initialEntries={["/"]}><PageViewTracker /></MemoryRouter>);
    expect(mock.sent).toEqual([]);
  });

  it("waits until it knows who is looking, so the owner's first page is not counted by mistake", () => {
    mock.auth = { user: null, loading: true };
    const { rerender } = render(<MemoryRouter initialEntries={["/"]}><PageViewTracker /></MemoryRouter>);
    expect(mock.sent).toEqual([]);
    mock.auth = { user: null, loading: false };
    rerender(<MemoryRouter initialEntries={["/"]}><PageViewTracker /></MemoryRouter>);
    expect(mock.sent).toHaveLength(1);
  });
});
