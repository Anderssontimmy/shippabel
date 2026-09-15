import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({ config: { supabaseUrl: "https://project.supabase.co", supabaseAnonKey: "browser-public-key" } }));
vi.mock("@/lib/guestAccess", () => ({ getGuestToken: () => "a".repeat(64) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: (_url: string, _key: string, options: unknown) => options }));

import { supabase } from "./supabase";

const projectFetch = (supabase as unknown as { global: { fetch: typeof fetch } }).global.fetch;
async function forwarded(url: string | Request, token?: string) {
  const nativeFetch = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", nativeFetch);
  await projectFetch(url, token ? { headers: { Authorization: `Bearer ${token}`, apikey: "browser-public-key" } } : undefined);
  return new Headers(nativeFetch.mock.calls[0]![1].headers);
}
afterEach(() => vi.unstubAllGlobals());

describe("Supabase request authentication", () => {
  it("uses guest proof without presenting the browser public key as a user login", async () => {
    const headers = await forwarded("https://project.supabase.co/functions/v1/scan-project", "browser-public-key");
    expect(headers.has("authorization")).toBe(false);
    expect(headers.get("apikey")).toBe("browser-public-key");
    expect(headers.get("x-guest-token")).toBe("a".repeat(64));
  });
  it("preserves real user JWTs for private repository scans", async () => {
    const headers = await forwarded("https://project.supabase.co/functions/v1/scan-project", "signed-user-jwt");
    expect(headers.get("authorization")).toBe("Bearer signed-user-jwt");
  });
  it.each(["rest/v1/projects", "storage/v1/object/project-archives/source.zip", "functions/v1/create-checkout"])("preserves SDK authentication for %s", async (path) => {
    const headers = await forwarded(`https://project.supabase.co/${path}`, "browser-public-key");
    expect(headers.get("authorization")).toBe("Bearer browser-public-key");
  });
  it("never adds browser proof to another origin", async () => {
    const headers = await forwarded("https://other.test/functions/v1/scan-project", "browser-public-key");
    expect(headers.has("x-guest-token")).toBe(false);
    expect(headers.get("authorization")).toBe("Bearer browser-public-key");
  });
  it("preserves authentication already carried by a Request object", async () => {
    const headers = await forwarded(new Request("https://project.supabase.co/functions/v1/scan-project", { headers: { Authorization: "Bearer signed-user-jwt" } }));
    expect(headers.get("authorization")).toBe("Bearer signed-user-jwt");
  });
});
