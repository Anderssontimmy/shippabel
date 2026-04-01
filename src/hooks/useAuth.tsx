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
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  githubToken: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const saveGitHubToken = async (s: Session) => {
  if (s.provider_token && s.user?.app_metadata?.provider === "github") {
    await supabase.from("user_credentials").upsert(
      {
        user_id: s.user.id,
        provider: "github",
        credentials: { access_token: s.provider_token },
        label: "GitHub (auto)",
        is_valid: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );
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
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Mark loading as done on initial session (whether null or valid)
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }

      // Auto-save GitHub token to user_credentials for Edge Functions
      if (s) saveGitHubToken(s);
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

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin,
        scopes: "repo read:user",
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

  // Extract GitHub token from session provider_token
  const githubToken = session?.provider_token &&
    user?.app_metadata?.provider === "github"
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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
