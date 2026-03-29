import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface StoreCopyVariant {
  app_name: string;
  subtitle: string;
  short_description: string;
  full_description: string;
  keywords: string;
}

export interface StoreListing {
  id: string;
  project_id: string;
  platform: "ios" | "android";
  app_name: string | null;
  subtitle: string | null;
  short_description: string | null;
  full_description: string | null;
  keywords: string | null;
  category: string | null;
  privacy_policy_url: string | null;
  screenshots: string[] | null;
  icon_path: string | null;
}

export const useStoreListing = (projectId: string, platform: "ios" | "android") => {
  const [listing, setListing] = useState<StoreListing | null>(null);
  const [variants, setVariants] = useState<StoreCopyVariant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("store_listings")
      .select("*")
      .eq("project_id", projectId)
      .eq("platform", platform)
      .single();

    if (data) setListing(data as StoreListing);
    setLoading(false);
  };

  const generateCopy = async (appContext?: string) => {
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-copy", {
        body: { project_id: projectId, platform, app_context: appContext },
      });

      if (fnError) throw new Error(fnError.message);
      setVariants(data.variants ?? []);

      // Auto-select first variant
      if (data.variants?.[0]) {
        setListing((prev) => ({
          ...prev!,
          ...data.variants[0],
          project_id: projectId,
          platform,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }

    setGenerating(false);
  };

  const selectVariant = (index: number) => {
    const variant = variants[index];
    if (!variant) return;
    setListing((prev) => ({
      ...(prev ?? { id: "", project_id: projectId, platform, category: null, privacy_policy_url: null, screenshots: null, icon_path: null }),
      app_name: variant.app_name,
      subtitle: variant.subtitle,
      short_description: variant.short_description,
      full_description: variant.full_description,
      keywords: variant.keywords,
    }));
  };

  const updateField = (field: keyof StoreListing, value: string) => {
    setListing((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const save = async () => {
    if (!listing) return;
    setSaving(true);

    const { error: saveError } = await supabase
      .from("store_listings")
      .upsert({
        project_id: projectId,
        platform,
        app_name: listing.app_name,
        subtitle: listing.subtitle,
        short_description: listing.short_description,
        full_description: listing.full_description,
        keywords: listing.keywords,
        category: listing.category,
        privacy_policy_url: listing.privacy_policy_url,
      });

    if (saveError) setError(saveError.message);
    setSaving(false);
  };

  const generatePrivacy = async (appName: string, devName?: string, devEmail?: string) => {
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-privacy", {
        body: {
          project_id: projectId,
          app_name: appName,
          developer_name: devName,
          developer_email: devEmail,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.hosted_url) {
        updateField("privacy_policy_url", data.hosted_url);
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate privacy policy");
      return null;
    }
  };

  return {
    listing,
    variants,
    generating,
    saving,
    loading,
    error,
    load,
    generateCopy,
    selectVariant,
    updateField,
    save,
    generatePrivacy,
  };
};
