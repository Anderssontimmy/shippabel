import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Rocket, Menu, X, LogOut, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const isLanding = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-surface-200/60 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-surface-900">
            <Rocket className="h-5 w-5 text-surface-900" />
            <span>Shippabel</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors ${
                  location.pathname === link.to
                    ? "text-surface-900 font-medium"
                    : "text-surface-500 hover:text-surface-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-900 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            )}
            {!user && (
              <Link
                to="/scan"
                className="rounded-lg bg-surface-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-800"
              >
                Get started
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="sm:hidden p-2 cursor-pointer text-surface-500 hover:text-surface-900"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-surface-100 bg-white px-6 py-5 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-surface-600 hover:text-surface-900"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="block text-sm text-surface-600 cursor-pointer"
              >
                Sign out
              </button>
            )}
            {!user && (
              <Link
                to="/scan"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg bg-surface-900 px-5 py-3 text-center text-sm font-medium text-white"
              >
                Get started
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Sticky mobile CTA — only on landing page */}
      {isLanding && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-surface-200 bg-white/95 backdrop-blur-xl px-4 py-3">
          <Link
            to="/scan"
            className="flex items-center justify-center gap-2 rounded-lg bg-surface-900 px-6 py-3.5 text-sm font-medium text-white w-full"
          >
            Check my app now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <footer className="border-t border-surface-200/60">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-surface-400">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span>Shippabel</span>
          </div>
          <div className="flex gap-6">
            <Link to="/blog" className="hover:text-surface-600 transition-colors">Guides</Link>
            <Link to="/pricing" className="hover:text-surface-600 transition-colors">Pricing</Link>
            <Link to="/privacy" className="hover:text-surface-600 transition-colors">Privacy</Link>
            <a href="mailto:anderssontimmy@outlook.com" className="hover:text-surface-600 transition-colors">hello@shippabel.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
