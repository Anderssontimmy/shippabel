import { timingSafeEqual } from "./callback.ts";

export async function verifyStripeSignature(body: string, header: string, secret: string, now = Date.now()): Promise<boolean> {
  const fields = header.split(",").map((field) => field.trim().split("="));
  const timestamps = fields.filter(([key]) => key === "t").map(([, value]) => value);
  const timestamp = timestamps[0] ?? "";
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamp) || !secret || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return fields.some(([key, value]) => key === "v1" && /^[a-f0-9]{64}$/.test(value ?? "") && timingSafeEqual(value, expected));
}
