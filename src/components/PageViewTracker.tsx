import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { buildPageView, sendPageView, shouldCount } from "@/lib/pageViews";

// Counts a page view on every route change. Renders nothing.
export const PageViewTracker = () => {
  const { pathname, search } = useLocation();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.is_admin === true;
  const counted = useRef<string | null>(null);
  const firstOfVisit = useRef(true);

  useEffect(() => {
    // Wait until we know whether this is the owner, so their own first page is not counted.
    if (loading || counted.current === pathname) return;
    counted.current = pathname;
    if (!shouldCount({ hostname: window.location.hostname, pathname, doNotTrack: navigator.doNotTrack === "1", isAdmin })) return;
    sendPageView(buildPageView(pathname, search, document.referrer, firstOfVisit.current));
    firstOfVisit.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new page counts, not a new query string
  }, [pathname, loading, isAdmin]);

  return null;
};
