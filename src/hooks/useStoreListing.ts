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

const demoVariants: StoreCopyVariant[] = [
  {
    app_name: "FitTrack Pro",
    subtitle: "Your Personal Fitness Companion",
    short_description: "Track workouts, set goals, and crush your fitness journey with smart AI coaching.",
    full_description: "FitTrack Pro is the smartest way to reach your fitness goals.\n\nWhether you're a beginner or a seasoned athlete, our AI-powered coaching adapts to your level and helps you improve every day.\n\nFeatures:\n- Smart workout tracking with auto-detection\n- Personalized training plans\n- Progress charts and streak tracking\n- Social challenges with friends\n- Apple Health & Google Fit integration\n\nStart your free trial today and see why 50,000+ users trust FitTrack Pro.",
    keywords: "fitness,workout,tracker,health,exercise,gym,training,coach,AI",
  },
  {
    app_name: "FitTrack Pro",
    subtitle: "Smarter Workouts, Real Results",
    short_description: "AI-powered fitness tracker that adapts to you. Log workouts, track progress, compete with friends.",
    full_description: "Ready to level up your fitness game? FitTrack Pro uses AI to create workout plans that actually work for YOU.\n\nNo more guessing. No more generic plans. Just smart, personalized coaching that gets results.\n\nWhat you get:\n- Adaptive AI that learns your strengths\n- Beautiful progress dashboards\n- Quick-log workouts in under 10 seconds\n- Weekly challenges to stay motivated\n- Sync with your favorite health apps\n\nJoin the community and start seeing results from day one.",
    keywords: "fitness,AI,workout,personal trainer,goals,progress,health,exercise",
  },
  {
    app_name: "FitTrack Pro",
    subtitle: "Crush Every Workout",
    short_description: "The fitness app that learns from you. Track, train, and transform with AI-powered coaching.",
    full_description: "FitTrack Pro isn't just another fitness app — it's your AI training partner.\n\nEvery rep counts. Every workout matters. FitTrack Pro tracks it all and uses machine learning to optimize your training plan in real time.\n\nHighlights:\n- Revolutionary AI coaching engine\n- 500+ exercises with video guides\n- Social leaderboards & challenges\n- Detailed analytics & body metrics\n- Works offline — no excuses\n\nDownload now and unlock your potential.",
    keywords: "fitness,training,AI coach,workout log,exercise tracker,gym,health",
  },
];

export const useStoreListing = (projectId: string, platform: "ios" | "android") => {
  const isDemo = projectId === "demo";
  const [listing, setListing] = useState<StoreListing | null>(null);
  const [variants, setVariants] = useState<StoreCopyVariant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setListing(null);
    setVariants([]);
    setError(null);
    if (isDemo) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("store_listings")
      .select("*")
      .eq("project_id", projectId)
      .eq("platform", platform)
      .maybeSingle();

    setListing(data ? (data as StoreListing) : null);
    setLoading(false);
  };

  const generateCopy = async (_appContext?: string) => {
    setGenerating(true);
    setError(null);

    if (isDemo) {
      // Simulate AI generation delay
      await new Promise((r) => setTimeout(r, 3000));
      setVariants(demoVariants);
      setListing({
        id: "demo",
        project_id: "demo",
        platform,
        ...demoVariants[0]!,
        category: null,
        privacy_policy_url: null,
        screenshots: null,
        icon_path: null,
      });
      setGenerating(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-copy", {
        body: { project_id: projectId, platform, app_context: _appContext },
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

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 800));
      setSaving(false);
      return;
    }

    const payload = {
      project_id: projectId,
      platform,
      app_name: listing.app_name,
      subtitle: listing.subtitle,
      short_description: listing.short_description,
      full_description: listing.full_description,
      keywords: listing.keywords,
      category: listing.category,
      privacy_policy_url: listing.privacy_policy_url,
    };

    let saveError;
    if (listing.id && listing.id !== "") {
      // Update existing
      const res = await supabase
        .from("store_listings")
        .update(payload)
        .eq("id", listing.id);
      saveError = res.error;
    } else {
      // Insert new
      const res = await supabase
        .from("store_listings")
        .insert(payload)
        .select()
        .single();
      saveError = res.error;
      if (res.data) setListing(res.data as StoreListing);
    }

    if (saveError) setError(saveError.message);
    setSaving(false);
  };

  const generatePrivacy = async (appName: string, _devName?: string, _devEmail?: string) => {
    setError(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 2000));
      updateField("privacy_policy_url", "https://shippabel.com/privacy/demo");
      return { hosted_url: "https://shippabel.com/privacy/demo" };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-privacy", {
        body: {
          project_id: projectId,
          app_name: appName,
          developer_name: _devName,
          developer_email: _devEmail,
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
