import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { getGuestToken } from "@/lib/guestAccess";

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  global: {
    fetch: (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const headers = new Headers(init?.headers);
      if (url.origin === new URL(config.supabaseUrl).origin &&
          (/^\/(rest|storage)\/v1\//.test(url.pathname) || url.pathname.endsWith("/functions/v1/scan-project"))) {
        headers.set("x-guest-token", getGuestToken());
      }
      return fetch(input, { ...init, headers });
    },
  },
});
