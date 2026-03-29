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
