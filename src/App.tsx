import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

const PageLoader = () => (
  <div className="flex items-center justify-center py-32">
    <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
  </div>
);

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

const App = () => {
  return (
    <ErrorBoundary fallbackTitle="The app encountered an error">
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
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
