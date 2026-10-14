import { assert, assertEquals, assertNotEquals, assertThrows } from "jsr:@std/assert@1";
// @deno-types="npm:@types/node-forge@1.3.11"
import forge from "npm:node-forge@1.3.1";
import { generateUploadKeystore } from "./signingKey.ts";

function open(keystoreBase64: string, password: string) {
  return forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(keystoreBase64)), password);
}

Deno.test("Upload keystore: opens with its password and holds one RSA 2048 key and a long-lived certificate", async () => {
  const { keystoreBase64, password, alias } = await generateUploadKeystore();
  assertEquals(alias, "upload");
  const p12 = open(keystoreBase64, password);

  const keys = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  assertEquals(keys.length, 1);
  assertEquals(keys[0]!.attributes.friendlyName, [alias]);
  const privateKey = keys[0]!.key as forge.pki.rsa.PrivateKey;
  assertEquals(privateKey.n.bitLength(), 2048);

  const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  assertEquals(certs.length, 1);
  const cert = certs[0]!.cert!;
  // Google Play requires certificates to stay valid past 22 October 2033.
  assert(cert.validity.notAfter.getTime() > Date.UTC(2040, 0, 1));
  assertEquals(cert.subject.getField("CN").value, "Shippabel Upload Key");
  // The certificate belongs to the stored private key.
  assertEquals((cert.publicKey as forge.pki.rsa.PublicKey).n.toString(16), privateKey.n.toString(16));
});

Deno.test("Upload keystore: rejects a wrong password and every key is unique", async () => {
  const one = await generateUploadKeystore();
  const two = await generateUploadKeystore();
  assertThrows(() => open(one.keystoreBase64, "wrong-password"));
  assertNotEquals(one.password, two.password);
  assertNotEquals(one.keystoreBase64, two.keystoreBase64);
  assert(one.password.length >= 20);
});
