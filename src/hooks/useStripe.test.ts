import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ invokeEdge: vi.fn() }));
vi.mock("@/lib/invokeEdge", () => ({ invokeEdge: mock.invokeEdge }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import { useStripe } from "./useStripe";

const origin = window.location.origin;
const run = async (returnPath?: string) => {
  const hook = renderHook(() => useStripe());
  await act(async () => { await hook.result.current.checkout("ship", returnPath); });
  return hook;
};
const sentUrls = () => mock.invokeEdge.mock.calls[0]![1] as { success_url: string; cancel_url: string; plan: string };

describe("checkout", () => {
  beforeEach(() => {
    mock.invokeEdge.mockReset();
    mock.invokeEdge.mockResolvedValue({ data: { url: "https://checkout.stripe.com/c/pay/cs_test_1" }, error: null });
  });

  it("sends the buyer to the dashboard after paying and to pricing after cancelling, as it always did", async () => {
    await run();
    expect(sentUrls()).toMatchObject({ plan: "ship", success_url: `${origin}/dashboard?checkout=success`, cancel_url: `${origin}/pricing?checkout=cancelled` });
  });

  it("sends the buyer back to the page they paid from, whether they paid or not", async () => {
    await run("/scan/abc");
    expect(sentUrls()).toMatchObject({ success_url: `${origin}/scan/abc?checkout=success`, cancel_url: `${origin}/scan/abc?checkout=cancelled` });
  });

  it("ignores a return path that is not a path on this site", async () => {
    for (const bad of ["//evil.example/x", "https://evil.example/x", "scan/abc"]) {
      mock.invokeEdge.mockClear();
      await run(bad);
      expect(sentUrls().success_url).toBe(`${origin}/dashboard?checkout=success`);
    }
  });

  it("only follows a link to Stripe's own checkout", async () => {
    mock.invokeEdge.mockResolvedValue({ data: { url: "https://evil.example/pay" }, error: null });
    const hook = await run("/scan/abc");
    expect(hook.result.current.error).toBe("Invalid checkout URL. Please try again.");
  });

  it("shows the server's words when checkout cannot start", async () => {
    mock.invokeEdge.mockResolvedValue({ data: null, error: "Payments are temporarily unavailable." });
    const hook = await run();
    expect(hook.result.current.error).toBe("Payments are temporarily unavailable.");
  });
});
