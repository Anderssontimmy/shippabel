import { assertEquals, assertNotEquals, assertRejects } from "jsr:@std/assert@1";
import { decryptCreds, encryptCreds } from "./crypto.ts";
import { projectCallbackToken, timingSafeEqual } from "./callback.ts";
import { verifyStripeSignature } from "./stripeSignature.ts";

Deno.test("Encryption: roundtrip, random IV and tamper detection", async () => {
  const key = btoa("k".repeat(32));
  const creds = { access_token: "test-only-secret" };
  const one = await encryptCreds(creds, key);
  const two = await encryptCreds(creds, key);
  assertNotEquals(one.enc, two.enc);
  assertEquals(await decryptCreds(one, key), creds);
  await assertRejects(() => decryptCreds(one, btoa("x".repeat(32))));
});
Deno.test("Callback: per-project tokens cannot authorize other projects", async () => {
  const one = await projectCallbackToken("test-secret", "one");
  const two = await projectCallbackToken("test-secret", "two");
  assertEquals(timingSafeEqual(one, two), false);
  assertEquals(timingSafeEqual(one, one), true);
});
Deno.test("Stripe signature: valid, rotated, tampered, stale and invalid timestamps", async () => {
  const now = 1_800_000_000_000;
  const body = '{"id":"evt_fixture"}';
  const secret = "whsec_fixture";
  const signature = await projectCallbackToken(secret, `${now / 1000}.${body}`);
  const header = `t=${now / 1000},v1=${signature}`;
  assertEquals(await verifyStripeSignature(body, header, secret, now), true);
  assertEquals(await verifyStripeSignature(body, `t=${now / 1000},v1=${"0".repeat(64)},v1=${signature}`, secret, now), true);
  assertEquals(await verifyStripeSignature(body + " ", header, secret, now), false);
  assertEquals(await verifyStripeSignature(body, header, secret, now + 301000), false);
  assertEquals(await verifyStripeSignature(body, `t=NaN,v1=${signature}`, secret, now), false);
});
