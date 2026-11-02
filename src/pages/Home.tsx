import { Navigate } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { Landing } from "./Landing";

// Supabase keeps a signed-in person's session in the browser under a key like "sb-<project>-auth-token".
const hasSavedSession = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? "")) return true;
    }
  } catch {
    // a browser that will not say is treated as having nothing saved
  }
  return false;
};

// Someone with no saved session cannot be signed in, so there is nothing to wait for: show the front page at once.
// Waiting behind a spinner made the footer sit at the top of the screen and then jump down when the page arrived,
// which is what search engines measure as a layout shift. A person who might be signed in still waits.
export const Home = () => {
  const { user, loading } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  if (loading && hasSavedSession()) return <PageLoader />;
  return <Landing />;
};
