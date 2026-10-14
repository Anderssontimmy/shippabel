import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, signInWithEmail: vi.fn(), signInWithGoogle: vi.fn(), signInWithGitHub: vi.fn() }),
}));
import { Login } from "./Login";

describe("login page", () => {
  it("tells people what GitHub sign-in gives us, before they press it", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    const github = screen.getByRole("button", { name: /Continue with GitHub/ });
    const note = document.getElementById(github.getAttribute("aria-describedby") ?? "");
    expect(note?.textContent).toMatch(/read and update your repositories/);
    expect(note?.textContent).toMatch(/stored encrypted/);
  });

  it("points to where the access can be removed and to the way of sharing less", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "your GitHub settings" }).getAttribute("href")).toBe(
      "https://github.com/settings/applications",
    );
    expect(screen.getByText(/limited to one repository/)).toBeTruthy();
  });
});
