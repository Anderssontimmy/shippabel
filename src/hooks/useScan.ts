import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { invokeEdge } from "@/lib/invokeEdge";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@/lib/types";

interface ScanState {
  scanning: boolean;
  progress: string;
  error: string | null;
  projectId: string | null;
}

export const useScan = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ScanState>({
    scanning: false,
    progress: "",
    error: null,
    projectId: null,
  });

  const scanFromUrl = async (repoUrl: string) => {
    setState({ scanning: true, progress: "Creating project...", error: null, projectId: null });
    trackEvent("Scan Started", { source: "url" });

    try {
      // 1. Create project record
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          name: extractRepoName(repoUrl),
          repo_url: repoUrl,
          status: "scanning",
          ...(user ? { user_id: user.id } : {}),
        })
        .select()
        .single();

      if (insertError || !project) {
        throw new Error(insertError?.message ?? "Failed to create project");
      }

      setState((s) => ({ ...s, progress: "Scanning project..." }));

      // 2. Call scan edge function (with 90s timeout — invoke() can't be
      // aborted reliably across supabase-js versions, so race it instead)
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Scan took too long. Please try again.")), 90_000);
      });
      try {
        const { error: fnError } = await Promise.race([
          invokeEdge("scan-project", { project_id: project.id, repo_url: repoUrl }),
          timeoutPromise,
        ]);
        if (fnError) throw new Error(fnError);
      } finally {
        clearTimeout(timeoutId);
      }

      trackEvent("Scan Completed");

      setState({
        scanning: false,
        progress: "",
        error: null,
        projectId: project.id,
      });

      return project.id as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setState({ scanning: false, progress: "", error: message, projectId: null });
      return null;
    }
  };

  const scanFromFile = async (file: File) => {
    setState({ scanning: true, progress: "Uploading project...", error: null, projectId: null });

    try {
      if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Please upload a .zip file.");
      if (file.size > 20 * 1024 * 1024) throw new Error("ZIP files must be 20 MB or smaller.");
      const name = file.name.replace(/\.zip$/i, "");

      // 1. Create project record
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({ name, status: "scanning", ...(user ? { user_id: user.id } : {}) })
        .select()
        .single();

      if (insertError || !project) {
        throw new Error(insertError?.message ?? "Failed to create project");
      }

      // 2. Upload file to storage
      const filePath = `scans/${project.id}/source.zip`;
      const { error: uploadError } = await supabase.storage
        .from("project-archives")
        .upload(filePath, file, { contentType: "application/zip" });

      if (uploadError) {
        throw new Error(uploadError.message ?? "Upload failed");
      }

      setState((s) => ({ ...s, progress: "Scanning project..." }));

      // 3. Call scan edge function
      const { error: fnError } = await invokeEdge("scan-project", { project_id: project.id, file_path: filePath });

      if (fnError) {
        throw new Error(fnError);
      }

      setState({
        scanning: false,
        progress: "",
        error: null,
        projectId: project.id,
      });

      return project.id as string;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setState({ scanning: false, progress: "", error: message, projectId: null });
      return null;
    }
  };

  return { ...state, scanFromUrl, scanFromFile };
};

export const useProject = (id: string | undefined) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProject(data as Project);
    }
    setLoading(false);
  };

  return { project, loading, error, load };
};

const extractRepoName = (url: string): string => {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return (parts[parts.length - 1] ?? "my-app").replace(/\.git$/, "");
  } catch {
    return "my-app";
  }
};
