import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
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

const App = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/scan/:id" element={<ScanResults />} />
          <Route path="/app/:id/listing" element={<Listing />} />
          <Route path="/app/:id/screenshots" element={<Screenshots />} />
          <Route path="/app/:id/submit" element={<Submit />} />
          <Route path="/app/:id/status" element={<Status />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
