import { timingSafeEqual } from "./callback.ts";
import { ScanError } from "./scanSource.ts";

export async function guestTokenHash(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function canScanProject(project: { user_id: string | null; guest_token_hash?: string | null } | null, userId: string | null, guestToken: string): Promise<boolean> {
  if (!project) return false;
  if (project.user_id) return project.user_id === userId;
  const hash = await guestTokenHash(guestToken);
  return !!hash && !!project.guest_token_hash && timingSafeEqual(hash, project.guest_token_hash);
}

export function validateScanRequest(input: unknown): { project_id: string; repo_url?: string; file_path?: string } {
  if (!input || typeof input !== "object") throw new ScanError("Invalid scan request.", 400);
  const { project_id, repo_url, file_path } = input as Record<string, unknown>;
  if (typeof project_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project_id)) throw new ScanError("A valid project_id is required.", 400);
  if ((typeof repo_url === "string" && !!repo_url) === (typeof file_path === "string" && !!file_path)) throw new ScanError("Provide either a repository URL or a ZIP file.", 400);
  if (file_path && (typeof file_path !== "string" || file_path !== `scans/${project_id}/source.zip`)) throw new ScanError("Invalid project upload path.", 400);
  return { project_id, repo_url: repo_url as string | undefined, file_path: file_path as string | undefined };
}
