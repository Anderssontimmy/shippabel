import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { getGuestToken } from "@/lib/guestAccess";

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  global: {
    fetch: (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const isScanner = url.pathname === "/functions/v1/scan-project";
      if (url.origin === new URL(config.supabaseUrl).origin &&
          (/^\/(rest|storage)\/v1\//.test(url.pathname) || isScanner)) {
        headers.set("x-guest-token", getGuestToken());
        // Supabase supplies the public API key as a fallback Bearer token.
        // Guest scans use browser proof; only user JWTs belong in Authorization.
        // The deployed runtime may expose a different public key after rotation.
        if (isScanner && headers.get("authorization") === `Bearer ${config.supabaseAnonKey}`) {
          headers.delete("authorization");
        }
      }
      return fetch(input, { ...init, headers });
    },
  },
});
