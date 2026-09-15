import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Landing } from "./pages/Landing";
import { useAuth } from "./hooks/useAuth";
import { Loader2 } from "lucide-react";

// Lazy-load all routes except landing (keep first paint fast)
const Scan = lazy(() => import("./pages/Scan").then((m) => ({ default: m.Scan })));
const ScanResults = lazy(() => import("./pages/ScanResults").then((m) => ({ default: m.ScanResults })));
const Listing = lazy(() => import("./pages/Listing").then((m) => ({ default: m.Listing })));
const Screenshots = lazy(() => import("./pages/Screenshots").then((m) => ({ default: m.Screenshots })));
const Submit = lazy(() => import("./pages/Submit").then((m) => ({ default: m.Submit })));
const Status = lazy(() => import("./pages/Status").then((m) => ({ default: m.Status })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Pricing = lazy(() => import("./pages/Pricing").then((m) => ({ default: m.Pricing })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const BlogIndex = lazy(() => import("./pages/Blog").then((m) => ({ default: m.BlogIndex })));
const BlogPostPage = lazy(() => import("./pages/Blog").then((m) => ({ default: m.BlogPost })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

const PageLoader = () => (
  <div role="status" aria-label="Loading page" className="flex items-center justify-center py-32">
    <Loader2 aria-hidden="true" className="h-8 w-8 text-primary-400 animate-spin" />
  </div>
);

// Keep canonical + og:url in sync during client-side navigation.
// (Crawlers get correct values from the prerendered static HTML.)
const CanonicalSync = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const href = `https://shippabel.com${pathname}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", href);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", href);
  }, [pathname]);
  return null;
};

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

const App = () => {
  return (
    <ErrorBoundary fallbackTitle="The app encountered an error">
      <CanonicalSync />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<ErrorBoundary fallbackTitle="Scanner error"><Scan /></ErrorBoundary>} />
            <Route path="/scan/:id" element={<ErrorBoundary fallbackTitle="Could not load scan results"><ScanResults /></ErrorBoundary>} />
            <Route path="/app/:id/listing" element={<ErrorBoundary fallbackTitle="Could not load listing editor"><Listing /></ErrorBoundary>} />
            <Route path="/app/:id/screenshots" element={<ErrorBoundary fallbackTitle="Could not load screenshots"><Screenshots /></ErrorBoundary>} />
            <Route path="/app/:id/submit" element={<ErrorBoundary fallbackTitle="Could not load submission"><Submit /></ErrorBoundary>} />
            <Route path="/app/:id/status" element={<ErrorBoundary fallbackTitle="Could not load status"><Status /></ErrorBoundary>} />
            <Route path="/dashboard" element={<ErrorBoundary fallbackTitle="Could not load dashboard"><Dashboard /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary fallbackTitle="Could not load settings"><Settings /></ErrorBoundary>} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
