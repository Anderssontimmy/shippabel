import { supabase } from "@/lib/supabase";

/**
 * Invoke an edge function and surface the server's real error message.
 * supabase-js collapses non-2xx responses into a generic
 * "Edge Function returned a non-2xx status code" — the actual message the
 * function wrote (e.g. "Connect your GitHub account first") is in the
 * response body, reachable only via error.context.
 */
export async function invokeEdge<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error: fnError } = await supabase.functions.invoke(name, { body });

  if (!fnError) {
    const errInBody = (data as { error?: string } | null)?.error;
    return errInBody ? { data: null, error: errInBody } : { data: data as T, error: null };
  }

  let message = "";
  try {
    if (typeof data?.error === "string") {
      message = data.error;
    } else if ("context" in fnError) {
      const ctx = (fnError as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx?.json) message = (await ctx.json())?.error ?? "";
    }
  } catch {
    // fall through to the generic message
  }
  return { data: null, error: message || fnError.message || "Something went wrong. Please try again." };
}
