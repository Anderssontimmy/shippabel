import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredentials } from "@/hooks/useCredentials";
import type { Project } from "@/lib/types";

interface ScanState {
  scanning: boolean;
  progress: string;
  error: string | null;
  projectId: string | null;
}

export const useScan = () => {
  const { githubToken } = useAuth();
  const { getCredential } = useCredentials();
  const [state, setState] = useState<ScanState>({
    scanning: false,
    progress: "",
    error: null,
    projectId: null,
  });

  // Prefer OAuth token, fall back to stored PAT
  const getGitHubToken = () => {
    if (githubToken) return githubToken;
    const cred = getCredential("github");
    return cred?.credentials?.access_token ?? null;
  };

  const scanFromUrl = async (repoUrl: string) => {
    setState({ scanning: true, progress: "Creating project...", error: null, projectId: null });

    try {
      // 1. Create project record
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          name: extractRepoName(repoUrl),
          repo_url: repoUrl,
          status: "scanning",
        })
        .select()
        .single();

      if (insertError || !project) {
        throw new Error(insertError?.message ?? "Failed to create project");
      }

      setState((s) => ({ ...s, progress: "Scanning project..." }));

      // 2. Call scan edge function
      const { error: fnError } = await supabase.functions.invoke("scan-project", {
        body: { project_id: project.id, repo_url: repoUrl, github_token: getGitHubToken() },
      });

      if (fnError) {
        throw new Error(fnError.message ?? "Scan failed");
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

  const scanFromFile = async (file: File) => {
    setState({ scanning: true, progress: "Uploading project...", error: null, projectId: null });

    try {
      const name = file.name.replace(/\.(zip|tar\.gz)$/, "");

      // 1. Create project record
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({ name, status: "scanning" })
        .select()
        .single();

      if (insertError || !project) {
        throw new Error(insertError?.message ?? "Failed to create project");
      }

      // 2. Upload file to storage
      const filePath = `scans/${project.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("projects")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message ?? "Upload failed");
      }

      setState((s) => ({ ...s, progress: "Scanning project..." }));

      // 3. Call scan edge function
      const { error: fnError } = await supabase.functions.invoke("scan-project", {
        body: { project_id: project.id, file_path: filePath },
      });

      if (fnError) {
        throw new Error(fnError.message ?? "Scan failed");
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
