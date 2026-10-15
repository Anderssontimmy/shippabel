import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, signOut: vi.fn() }) }));
import { Layout } from "./Layout";

const renderLayout = (path = "/pricing") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route element={<Layout />}><Route path="*" element={<h1>Page</h1>} /></Route></Routes>
    </MemoryRouter>,
  );

describe("page layout", () => {
  beforeEach(() => { auth.user = null; });

  it("lets keyboard users skip the menu: the skip link is first and lands on the main content", () => {
    const { container } = renderLayout();
    const first = container.querySelector("a, button");
    expect(first?.textContent).toBe("Skip to content");
    expect(first?.getAttribute("href")).toBe("#main-content");
    expect(container.querySelector("main")?.id).toBe("main-content");
  });

  it("has one way into the scanner for a visitor, not a text link and a button for the same page", () => {
    renderLayout();
    const toScanner = screen.getAllByRole("link").filter((a) => a.getAttribute("href") === "/scan");
    expect(toScanner.map((a) => a.textContent)).toEqual(["Check your app"]);
  });

  it("keeps the scanner link in the menu for a signed-in user, who has no such button", () => {
    auth.user = { id: "u" };
    renderLayout();
    expect(screen.getByRole("link", { name: "Check App" }).getAttribute("href")).toBe("/scan");
    expect(screen.queryByRole("link", { name: "Check your app" })).toBeNull();
  });

  it("opens the phone menu with a button big enough to hit", () => {
    renderLayout();
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu.className).toContain("p-3");
    fireEvent.click(menu);
    expect(screen.getByRole("button", { name: "Close menu" })).toBeTruthy();
  });
});
