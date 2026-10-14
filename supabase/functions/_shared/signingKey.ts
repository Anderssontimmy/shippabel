// Generates the Android upload key for a project: an RSA 2048 key with a self-signed
// certificate valid for 30 years, packaged as a PKCS12 keystore that Gradle and keytool
// open directly. Google Play only needs the certificate, so the subject is generic.
// The RSA key pair is made with WebCrypto (native, fast); forge only wraps it.
// @deno-types="npm:@types/node-forge@1.3.11"
import forge from "npm:node-forge@1.3.1";

export interface UploadKeystore {
  keystoreBase64: string;
  password: string;
  alias: string;
}

const ALIAS = "upload";
const VALID_YEARS = 30;

const toBinaryString = (bytes: Uint8Array): string => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

export async function generateUploadKeystore(): Promise<UploadKeystore> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const privateKey = forge.pki.privateKeyFromAsn1(
    forge.asn1.fromDer(toBinaryString(new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)))),
  );
  const publicKey = forge.pki.publicKeyFromAsn1(
    forge.asn1.fromDer(toBinaryString(new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey)))),
  );

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  // A positive serial: clear the top bit of the first random byte.
  cert.serialNumber = "00" + forge.util.bytesToHex(forge.random.getBytesSync(8)).replace(/^[89a-f]/, "7");
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + VALID_YEARS);
  const subject = [{ name: "commonName", value: "Shippabel Upload Key" }, { name: "organizationName", value: "Shippabel" }];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.sign(privateKey, forge.md.sha256.create());

  const password = btoa(toBinaryString(crypto.getRandomValues(new Uint8Array(18)))).replace(/\+/g, "-").replace(/\//g, "_");
  const p12 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], password, { algorithm: "3des", friendlyName: ALIAS });
  return { keystoreBase64: forge.util.encode64(forge.asn1.toDer(p12).getBytes()), password, alias: ALIAS };
}
