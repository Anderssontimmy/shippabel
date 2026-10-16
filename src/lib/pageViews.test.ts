import { describe, expect, it, vi } from "vitest";
import { buildPageView, sendPageView, shouldCount, sourceFromSearch } from "./pageViews";

const real = { hostname: "shippabel.com", pathname: "/pricing", doNotTrack: false, isAdmin: false };

describe("page counting rules", () => {
  it("counts the real site and nothing else", () => {
    expect(shouldCount(real)).toBe(true);
    expect(shouldCount({ ...real, hostname: "www.shippabel.com" })).toBe(true);
    expect(shouldCount({ ...real, hostname: "localhost" })).toBe(false);
    expect(shouldCount({ ...real, hostname: "shipmyapp-git-feature-x.vercel.app" })).toBe(false);
  });

  it("does not count someone who asked not to be tracked, or the owner, or the admin page", () => {
    expect(shouldCount({ ...real, doNotTrack: true })).toBe(false);
    expect(shouldCount({ ...real, isAdmin: true })).toBe(false);
    expect(shouldCount({ ...real, pathname: "/admin" })).toBe(false);
  });

  it("reads a campaign name from the address", () => {
    expect(sourceFromSearch("?utm_source=twitter")).toBe("twitter");
    expect(sourceFromSearch("?ref=producthunt&x=1")).toBe("producthunt");
    expect(sourceFromSearch("?source=newsletter")).toBe("newsletter");
    expect(sourceFromSearch("?q=1")).toBeUndefined();
  });

  it("tells where a visit came from on its first page only", () => {
    expect(buildPageView("/", "?utm_source=hn", "https://news.ycombinator.com/", true)).toEqual({
      path: "/", entry: true, ref: "https://news.ycombinator.com/", src: "hn",
    });
    expect(buildPageView("/pricing", "?utm_source=hn", "https://shippabel.com/", false)).toEqual({ path: "/pricing", entry: false });
    expect(buildPageView("/", "", "", true).ref).toBeUndefined();
  });
});

describe("sending a page view", () => {
  it("posts plain text without cookies, so no preflight request is needed", () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    sendPageView({ path: "/", entry: true }, send);
    const [url, init] = send.mock.calls[0]!;
    expect(String(url)).toMatch(/\/functions\/v1\/track$/);
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit", headers: { "Content-Type": "text/plain;charset=UTF-8" } });
    expect(JSON.parse(init.body)).toEqual({ path: "/", entry: true });
  });

  it("never lets a failed count reach the page", () => {
    expect(() => sendPageView({ path: "/", entry: true }, vi.fn().mockRejectedValue(new Error("offline")))).not.toThrow();
    expect(() => sendPageView({ path: "/", entry: true }, vi.fn(() => { throw new Error("blocked"); }))).not.toThrow();
  });
});
