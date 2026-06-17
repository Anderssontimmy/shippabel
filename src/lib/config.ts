// Central client configuration.
// Required vars are validated at module load so a misconfigured deploy fails loudly
// with a clear message — rather than crashing cryptically or silently misbehaving
// (the latter is what let a wrong Stripe price ID ship unnoticed).

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[config] Missing required environment variable: ${name}. ` +
        `Set it in the Vercel project settings (and in .env for local builds).`,
    );
  }
  return value;
}

export const config = {
  supabaseUrl: requireEnv("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: requireEnv("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  // Optional at load (free flows work without payments); validated when checkout runs.
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
};
