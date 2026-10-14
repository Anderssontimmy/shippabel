import { describe, expect, it } from "vitest";
import { signInEmailError } from "./authErrors";

const error = (message: string, extra: { status?: number; code?: string } = {}) => Object.assign(new Error(message), extra);

describe("sign-in email errors", () => {
  it("explains the project-wide email limit and points to Google and GitHub", () => {
    const message = signInEmailError(error("email rate limit exceeded", { status: 429, code: "over_email_send_rate_limit" }));
    expect(message).toMatch(/Google or GitHub/);
    expect(message).not.toMatch(/rate limit/i);
  });

  it("treats a bare 429 the same way", () => {
    expect(signInEmailError(error("Too many requests", { status: 429 }))).toMatch(/Google or GitHub/);
  });

  it("tells the user to wait a minute for the per-address limit", () => {
    const message = signInEmailError(error("For security purposes, you can only request this after 42 seconds.", { status: 429, code: "over_email_send_rate_limit" }));
    expect(message).toBe("Please wait a minute before asking for another sign-in link.");
  });

  it("leaves every other error untouched", () => {
    expect(signInEmailError(error("Email address \"x\" is invalid", { status: 400, code: "email_address_invalid" }))).toBe("Email address \"x\" is invalid");
    expect(signInEmailError(new Error("Network error"))).toBe("Network error");
  });
});
