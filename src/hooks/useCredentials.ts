import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type Provider = "apple" | "google" | "eas" | "github";

export interface Credential {
  id: string;
  user_id: string;
  provider: Provider;
  credentials: Record<string, string>;
  label: string | null;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

async function validateCredentials(
  provider: Provider,
  creds: Record<string, string>
): Promise<{ valid: boolean; error?: string }> {
  switch (provider) {
    case "github": {
      const token = creds.access_token;
      if (!token || token.length < 10) return { valid: false, error: "Token is too short" };
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return { valid: false, error: "Invalid token — GitHub rejected it" };
        if (!res.ok) return { valid: false, error: `GitHub returned ${res.status}` };
        return { valid: true };
      } catch {
        return { valid: false, error: "Could not reach GitHub — check your connection" };
      }
    }

    case "eas": {
      const token = creds.access_token;
      if (!token || token.length < 10) return { valid: false, error: "Token is too short" };
      try {
        const res = await fetch("https://api.expo.dev/v2/auth/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return { valid: false, error: "Invalid token — Expo rejected it" };
        if (!res.ok) return { valid: false, error: `Expo returned ${res.status}` };
        return { valid: true };
      } catch {
        return { valid: false, error: "Could not reach Expo — check your connection" };
      }
    }

    case "apple": {
      const keyId = creds.key_id ?? "";
      const issuerId = creds.issuer_id ?? "";
      const privateKey = creds.private_key ?? "";

      if (!keyId || keyId.length !== 10) {
        return { valid: false, error: "API Key ID must be exactly 10 characters" };
      }
      if (!issuerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuerId)) {
        return { valid: false, error: "Issuer ID must be a valid UUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)" };
      }
      if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        return { valid: false, error: "Private key must start with -----BEGIN PRIVATE KEY-----" };
      }
      return { valid: true };
    }

    case "google": {
      const json = creds.service_account_json ?? "";
      try {
        const parsed = JSON.parse(json);
        if (parsed.type !== "service_account") {
          return { valid: false, error: "JSON must have \"type\": \"service_account\"" };
        }
        if (!parsed.client_email) {
          return { valid: false, error: "JSON is missing \"client_email\" field" };
        }
        if (!parsed.private_key) {
          return { valid: false, error: "JSON is missing \"private_key\" field" };
        }
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid JSON — paste the entire service account key file" };
      }
    }

    default:
      return { valid: true };
  }
}

export const useCredentials = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_credentials")
      .select("*")
      .eq("user_id", user.id);

    setCredentials((data ?? []) as Credential[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const getCredential = (provider: Provider): Credential | null =>
    credentials.find((c) => c.provider === provider) ?? null;

  const hasCredential = (provider: Provider): boolean =>
    credentials.some((c) => c.provider === provider && c.is_valid);

  const saveCredential = async (
    provider: Provider,
    creds: Record<string, string>,
    label?: string
  ) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    try {
      // Validate credentials before saving
      const validation = await validateCredentials(provider, creds);
      if (!validation.valid) {
        throw new Error(validation.error ?? "Invalid credentials");
      }

      const { error: upsertError } = await supabase
        .from("user_credentials")
        .upsert(
          {
            user_id: user.id,
            provider,
            credentials: creds,
            label: label ?? provider,
            is_valid: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider" }
        );

      if (upsertError) throw new Error(upsertError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }

    setSaving(false);
  };

  const removeCredential = async (provider: Provider) => {
    if (!user) return;
    await supabase
      .from("user_credentials")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);
    await load();
  };

  return {
    credentials,
    loading,
    saving,
    error,
    getCredential,
    hasCredential,
    saveCredential,
    removeCredential,
  };
};
