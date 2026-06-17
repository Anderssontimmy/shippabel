// AES-256-GCM envelope encryption for stored credentials.
// Key is base64 of 32 random bytes, provided via the CREDENTIALS_ENC_KEY secret.
// Stored shape: { enc: "<base64(iv(12) || ciphertext+tag)>", v: 1 }

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = b64ToBytes(keyB64);
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCreds(
  obj: Record<string, string>,
  keyB64: string,
): Promise<{ enc: string; v: number }> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const ct = new Uint8Array(ctBuf);
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return { enc: bytesToB64(combined), v: 1 };
}

// Backward compatible: decrypts { enc } blobs; returns legacy plaintext objects unchanged.
export async function decryptCreds(
  stored: Record<string, unknown> | null | undefined,
  keyB64: string,
): Promise<Record<string, string>> {
  if (!stored) return {};
  if (typeof stored.enc !== "string") {
    // Legacy plaintext row (pre-encryption) — return as-is.
    return stored as Record<string, string>;
  }
  const key = await importKey(keyB64);
  const combined = b64ToBytes(stored.enc);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(ptBuf)));
}
