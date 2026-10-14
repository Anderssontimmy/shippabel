import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ invokeEdge: vi.fn(), saved: null as unknown }));
vi.mock("@/lib/invokeEdge", () => ({ invokeEdge: mock.invokeEdge }));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mock.saved, error: null }) }) }) }) }) },
}));
import { useStoreListing } from "./useStoreListing";

const variant = (full_description: string) => ({ app_name: "Habit", subtitle: "", short_description: "Build habits", full_description, keywords: "habit" });

describe("store listing text", () => {
  beforeEach(() => { mock.invokeEdge.mockReset(); mock.saved = null; });

  it("shows written store text without the HTML tags the AI may add", async () => {
    mock.invokeEdge.mockResolvedValue({
      data: { variants: [variant("<b>Build habits</b> that stick.<br><br>- Streaks"), variant("<p>Second</p>")] },
      error: null,
    });
    const { result } = renderHook(() => useStoreListing("project-1", "android"));
    await act(async () => { await result.current.generateCopy("a habit app"); });

    expect(result.current.variants.map((v) => v.full_description)).toEqual(["Build habits that stick.\n\n- Streaks", "Second"]);
    expect(result.current.listing?.full_description).toBe("Build habits that stick.\n\n- Streaks");
  });

  it("cleans a store page that was saved with tags before", async () => {
    mock.saved = { id: "1", project_id: "project-1", platform: "android", app_name: "Habit", full_description: "<b>Old</b> text", short_description: "x" };
    const { result } = renderHook(() => useStoreListing("project-1", "android"));
    await act(async () => { await result.current.load(); });
    await waitFor(() => expect(result.current.listing?.full_description).toBe("Old text"));
  });

  it("leaves a plain store page and an empty one alone", async () => {
    mock.saved = { id: "1", project_id: "project-1", platform: "android", app_name: "Habit", full_description: "Plain. R&D < 5", short_description: "x" };
    const { result } = renderHook(() => useStoreListing("project-1", "android"));
    await act(async () => { await result.current.load(); });
    expect(result.current.listing?.full_description).toBe("Plain. R&D < 5");

    mock.saved = null;
    await act(async () => { await result.current.load(); });
    expect(result.current.listing).toBeNull();
  });
});
