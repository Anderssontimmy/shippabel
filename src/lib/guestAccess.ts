const KEY = "shippabel-guest-token";
export function getGuestToken(): string {
  const existing = localStorage.getItem(KEY);
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(KEY, token);
  return token;
}
