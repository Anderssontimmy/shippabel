import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("./Landing", () => ({ Landing: () => <h1>The front page</h1> }));
import { Home } from "./Home";

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<p>The dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe("the home route", () => {
  beforeEach(() => { auth.user = null; auth.loading = false; localStorage.clear(); });
  afterEach(() => vi.restoreAllMocks());

  it("shows the front page at once to a visitor with no saved session, instead of a spinner the whole page then jumps over", () => {
    auth.loading = true;
    renderHome();
    expect(screen.getByRole("heading", { name: "The front page" })).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull();
  });

  it("waits for the answer when a session is saved, because that person may be signed in", () => {
    auth.loading = true;
    localStorage.setItem("sb-abcdefgh-auth-token", "{}");
    renderHome();
    expect(screen.getByRole("status", { name: "Loading page" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "The front page" })).toBeNull();
  });

  it("sends a signed-in person to the dashboard", () => {
    auth.user = { id: "u1" };
    renderHome();
    expect(screen.getByText("The dashboard")).toBeTruthy();
  });

  it("keeps showing the front page once it is known that nobody is signed in", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: "The front page" })).toBeTruthy();
  });

  it("treats a browser that refuses to say as having no saved session, so the page is never stuck behind a spinner", () => {
    auth.loading = true;
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    renderHome();
    expect(screen.getByRole("heading", { name: "The front page" })).toBeTruthy();
  });
});
