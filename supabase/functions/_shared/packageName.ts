// The Android package name from a Capacitor config. Accepts the quoted JSON that Shippabel writes
// (`"appId": "com.x.y"`) as well as hand-written TypeScript or JavaScript (`appId: 'com.x.y'`).
export function capacitorAppId(config: string | null | undefined): string | null {
  return config?.match(/["']?appId["']?\s*[:=]\s*['"]([^'"]+)['"]/)?.[1] ?? null;
}
