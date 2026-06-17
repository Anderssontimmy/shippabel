import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable mock state (hoisted so the vi.mock factory can close over it safely).
const state = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user }),
}));

import { usePlan } from "./usePlan";

describe("usePlan", () => {
  beforeEach(() => {
    state.user = null;
  });

  it("treats signed-out users as free", () => {
    const { result } = renderHook(() => usePlan());
    expect(result.current.tier).toBe("free");
    expect(result.current.isPaid).toBe(false);
  });

  it("grants Ship from app_metadata.plan", () => {
    state.user = { app_metadata: { plan: "ship" } };
    const { result } = renderHook(() => usePlan());
    expect(result.current.tier).toBe("ship");
    expect(result.current.isPaid).toBe(true);
    expect(result.current.isShip).toBe(true);
  });

  it("grants Unlimited from app_metadata.plan", () => {
    state.user = { app_metadata: { plan: "unlimited" } };
    const { result } = renderHook(() => usePlan());
    expect(result.current.tier).toBe("unlimited");
    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.isPaid).toBe(true);
  });

  // Security regression test for C2: app_metadata is server-only; user_metadata is
  // writable by the user via supabase.auth.updateUser(). Entitlement must NOT come
  // from user_metadata, or a user could self-grant a paid plan for free.
  it("does NOT grant access from user-writable user_metadata.plan", () => {
    state.user = { user_metadata: { plan: "unlimited" }, app_metadata: {} };
    const { result } = renderHook(() => usePlan());
    expect(result.current.tier).toBe("free");
    expect(result.current.isPaid).toBe(false);
  });

  it("treats unknown plan values as free", () => {
    state.user = { app_metadata: { plan: "garbage" } };
    const { result } = renderHook(() => usePlan());
    expect(result.current.isPaid).toBe(false);
  });
});
