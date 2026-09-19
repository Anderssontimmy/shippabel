import { supabase } from "@/lib/supabase";

export const MIN_SCREENSHOTS = 2;
export const hasEnoughScreenshots = (images: unknown): boolean =>
  Array.isArray(images) && images.filter((image) => typeof image === "string" && image.trim()).length >= MIN_SCREENSHOTS;

export async function loadScreenshots(projectId: string): Promise<string[]> {
  const { data, error } = await supabase.from("store_listings")
    .select("screenshots").eq("project_id", projectId).eq("platform", "android").maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.screenshots) ? data.screenshots : [];
}

// Upload a new batch before replacing the listing. Failed uploads must never
// overwrite images from the previous successful save or publish a partial set.
export async function saveScreenshots(projectId: string, images: (Blob | string)[]): Promise<string[]> {
  const batch = crypto.randomUUID();
  const uploaded: string[] = [];
  const urls: string[] = [];
  try {
    for (const [index, image] of images.entries()) {
      if (typeof image === "string") { urls.push(image); continue; }
      const path = `screenshots/${projectId}/${batch}_${index + 1}.png`;
      const { error } = await supabase.storage.from("projects").upload(path, image, { contentType: "image/png" });
      if (error) throw error;
      uploaded.push(path);
      urls.push(supabase.storage.from("projects").getPublicUrl(path).data.publicUrl);
    }
    const { error } = await supabase.from("store_listings")
      .upsert({ project_id: projectId, platform: "android", screenshots: urls }, { onConflict: "project_id,platform" });
    if (error) throw error;
    return urls;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("projects").remove(uploaded).catch(() => undefined);
    throw error;
  }
}
