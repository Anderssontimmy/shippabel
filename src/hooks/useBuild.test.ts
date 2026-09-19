import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Submission } from "./useBuild";

const mock = vi.hoisted(() => ({ rows: [] as unknown[], loadError: null as { message: string } | null, invoke: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: mock.rows, error: mock.loadError }) }) }) }),
  functions: { invoke: mock.invoke },
} }));
import { useBuild } from "./useBuild";
const submission = (updates: Partial<Submission> = {}): Submission => ({ id: "build", project_id: "project", platform: "android", eas_build_id: null, build_status: "completed", review_status: "not_submitted", rejection_reason: null, submitted_at: null, reviewed_at: null, created_at: "2026-09-19", ...updates });

describe("build journey", () => {
  beforeEach(() => { mock.rows = [submission()]; mock.loadError = null; mock.invoke.mockReset(); });

  it("reopening a pending build resumes checks and reads callback updates even if the status request fails", async () => {
    mock.rows = [submission({ build_status: "queued" })];
    mock.invoke.mockImplementation(async () => { mock.rows = [submission()]; return { data: null, error: new Error("Provider unavailable") }; });
    const { result, unmount } = renderHook(() => useBuild("project"));
    await waitFor(() => expect(mock.invoke).toHaveBeenCalledWith("check-review", expect.objectContaining({ body: { submission_id: "build" } })));
    await waitFor(() => expect(result.current.latestByPlatform("android")?.build_status).toBe("completed"));
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("a successful HTTP response with success:false never reports a completed submission", async () => {
    mock.invoke.mockResolvedValue({ data: { success: false, status: "pending_credentials", details: "Google Play service account not configured." }, error: null });
    const { result } = renderHook(() => useBuild("project"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let saved;
    await act(async () => { saved = await result.current.submitToStore("build"); });
    expect(saved).toBe(false);
    expect(result.current.error).toBe("Google Play service account not configured.");
  });

  it("temporary database failures preserve the last known build", async () => {
    const { result } = renderHook(() => useBuild("project"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.loadError = { message: "Temporary failure" };
    mock.rows = [];
    await act(async () => { await result.current.reload(); });
    expect(result.current.latestByPlatform("android")?.build_status).toBe("completed");
  });
});
