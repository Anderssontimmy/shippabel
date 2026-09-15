import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signInWithGitHub: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  githubToken: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// GitHub OAuth/PAT tokens have recognisable shapes; a Google session token is
// "ya29.…". Supabase only exposes provider_token right after an OAuth redirect,
// and app_metadata.provider reflects the *original* signup provider — so a later
// Google/Apple sign-in would otherwise overwrite the GitHub credential with the
// wrong token. Gate on the token shape instead.
const isGitHubToken = (token: string): boolean =>
  /^(gho_|ghu_|ghp_|github_pat_)/.test(token) || /^[a-f0-9]{40}$/.test(token);

const saveGitHubToken = async (s: Session) => {
  if (s.user && s.provider_token && isGitHubToken(s.provider_token)) {
    // Store via the edge function so the token is encrypted at rest.
    await supabase.functions.invoke("save-credential", {
      body: {
        provider: "github",
        credentials: { access_token: s.provider_token },
        label: "GitHub (auto)",
      },
    });
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Use onAuthStateChange as the single source of truth.
    // The INITIAL_SESSION event fires immediately with the current session,
    // avoiding the race condition between getSession() and onAuthStateChange.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Mark loading as done on initial session (whether null or valid)
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }

      // Auto-save GitHub token to user_credentials for Edge Functions.
      // Only on SIGNED_IN (fresh OAuth) — not on every TOKEN_REFRESHED — and
      // deferred out of the auth callback (supabase calls inside it can deadlock).
      if (s && event === "SIGNED_IN") {
        setTimeout(() => {
          saveGitHubToken(s).catch(() => {
            // Non-fatal: the user can still connect GitHub manually in Settings.
          });
        }, 0);
      }
    });

    // Safety timeout — if INITIAL_SESSION never fires (e.g. network issue)
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithEmail = async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo ?? window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signInWithGitHub = async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: redirectTo ?? window.location.origin,
        scopes: "repo read:user workflow",
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Always clear local state, even if the API call fails
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Network error — local state is already cleared
    }
  };

  // Extract GitHub token from session provider_token (only if it's actually a GitHub token)
  const githubToken = session?.provider_token && isGitHubToken(session.provider_token)
    ? session.provider_token
    : null;

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithEmail, signInWithGoogle, signInWithGitHub, signOut, githubToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Provider + hook intentionally co-located; hook export only breaks fast refresh, not builds.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
