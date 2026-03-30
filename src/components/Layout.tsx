import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Rocket, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLanding = location.pathname === "/";

  const navLinks = [
    ...(user ? [{ to: "/dashboard", label: "My Apps" }] : []),
    { to: "/scan", label: "Check App" },
    { to: "/pricing", label: "Pricing" },
    ...(user ? [{ to: "/settings", label: "Settings" }] : []),
    ...(!user ? [{ to: "/login", label: "Log in" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl ${
          isLanding
            ? "border-gray-200/50 bg-white/80"
            : "border-surface-800/50 bg-surface-950/80"
        }`}
      >
        <nav className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 sm:px-12">
          <Link to="/" className={`flex items-center gap-2.5 font-bold text-xl ${isLanding ? "text-gray-900" : "text-white"}`}>
            <Rocket className={`h-5 w-5 ${isLanding ? "text-emerald-600" : "text-primary-400"}`} />
            <span>Shippabel</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  isLanding
                    ? location.pathname === link.to ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
                    : location.pathname === link.to ? "text-white" : "text-surface-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  isLanding ? "text-gray-500 hover:text-gray-900" : "text-surface-400 hover:text-white"
                }`}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            )}
            <Link
              to="/scan"
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Get started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className={`sm:hidden p-2 cursor-pointer ${isLanding ? "text-gray-500 hover:text-gray-900" : "text-surface-400 hover:text-white"}`}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className={`sm:hidden border-t backdrop-blur-xl px-4 py-4 space-y-3 ${
            isLanding ? "border-gray-200 bg-white/95" : "border-surface-800 bg-surface-950/95"
          }`}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm font-medium ${isLanding ? "text-gray-600 hover:text-gray-900" : "text-surface-300 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className={`block text-sm font-medium cursor-pointer ${isLanding ? "text-gray-600" : "text-surface-300"}`}
              >
                Sign out
              </button>
            )}
            <Link
              to="/scan"
              onClick={() => setMobileOpen(false)}
              className="block rounded-full bg-emerald-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 pt-20">
        <Outlet />
      </main>

      <footer className={`border-t ${isLanding ? "border-gray-100 bg-white" : "border-surface-800/50 bg-surface-950"}`}>
        <div className={`mx-auto max-w-[1400px] px-6 sm:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${
          isLanding ? "text-gray-400" : "text-surface-500"
        }`}>
          <div className="flex items-center gap-2">
            <Rocket className={`h-4 w-4 ${isLanding ? "text-emerald-500" : "text-primary-500"}`} />
            <span>Shippabel</span>
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className={`transition-colors ${isLanding ? "hover:text-gray-600" : "hover:text-surface-300"}`}>
              Privacy
            </Link>
            <Link to="/pricing" className={`transition-colors ${isLanding ? "hover:text-gray-600" : "hover:text-surface-300"}`}>
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
