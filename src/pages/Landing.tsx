import { Link } from "react-router-dom";
import { ArrowRight, Globe, Shield, Layers, Code, Scan, Wrench } from "lucide-react";
import PhoneMockup from "@/components/PhoneMockup";

const features = [
  { icon: Scan, title: "Instant scan", desc: "Paste a repo URL or upload a zip. Get a full store-readiness report in 30 seconds. No setup, no signup." },
  { icon: Wrench, title: "Auto-fix issues", desc: "One click fixes config, bundle IDs, versions, and .gitignore. We commit the changes directly to your repo." },
  { icon: Shield, title: "Security check", desc: "Catches hardcoded API keys, exposed .env files, and missing encryption before Apple or Google does." },
  { icon: Globe, title: "AI store listing", desc: "Claude generates your app name, description, keywords, and privacy policy. Pick from 3 optimized variants." },
  { icon: Layers, title: "Screenshot framing", desc: "Upload raw screenshots. We frame them in iPhone 16 Pro, Pixel 9, and iPad mockups at store-required sizes." },
  { icon: Code, title: "Vibe-code native", desc: "Built for apps from Claude Code, Cursor, Bolt, and Lovable. We don't care how you built it — we ship it." },
];

const steps = [
  { num: "01", title: "Scan your app", desc: "Paste your GitHub URL or upload a zip. Shippabel analyzes every config, asset, and security detail against App Store and Google Play requirements." },
  { num: "02", title: "Fix & generate", desc: "Auto-fix issues with one click. Generate your store listing, screenshots, and privacy policy with AI. Everything you need, ready in minutes." },
  { num: "03", title: "Ship it", desc: "Connect your developer accounts. We build via EAS, upload to both stores, and submit for review. You're live." },
];

const whyCards = [
  { title: "Made for makers", desc: "Shippabel is designed for indie hackers, vibe coders, and small teams who want to ship fast and iterate faster." },
  { title: "Not another PaaS", desc: "We're not Vercel for enterprises. We're the publish button the AI-coding era deserves." },
  { title: "Obsessively simple", desc: "No dashboards with 47 tabs. No billing surprises. No config files. Just your app, live." },
];

export const Landing = () => {
  return (
    <div className="bg-[#fafafa] text-gray-900 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/60 via-[#fafafa] to-[#fafafa]" />

        <div className="mx-auto max-w-[1400px] px-6 sm:px-12 pt-28 sm:pt-40 pb-28 sm:pb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left: Text */}
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-base text-gray-500 mb-12 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Now in public beta
              </div>

              <h1 className="animate-fade-up-delay-1 text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.04]">
                Ship your app.
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  One click.
                </span>
              </h1>

              <p className="animate-fade-up-delay-2 mt-10 text-2xl sm:text-[1.7rem] text-gray-500 leading-relaxed max-w-xl">
                From vibe-coded prototype to live product in seconds.
                No config, no devops, no friction.
              </p>

              <div className="animate-fade-up-delay-3 mt-14 flex flex-wrap items-center gap-5">
                <Link
                  to="/scan"
                  className="inline-flex items-center gap-2.5 rounded-full bg-emerald-600 px-10 py-5 text-lg font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/25"
                >
                  Start shipping free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-10 py-5 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right: Phone mockup */}
            <div className="relative lg:pl-12">
              <PhoneMockup />
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-4">Features</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Everything you need.
              <br />
              <span className="text-gray-300">Nothing you don't.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-200/60 bg-white p-10 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all"
              >
                <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                  <f.icon className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-[1.05rem] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />

      {/* How it works */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-4">How it works</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.num}>
                <div className="flex items-center gap-5 mb-6">
                  <span className="text-6xl font-extrabold text-emerald-200 italic">{step.num}</span>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block flex-1 h-px bg-gray-200" />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-[1.05rem] text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />

      {/* Why Shippabel */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-4">Why Shippabel</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Built different.{" "}
              <span className="text-gray-300">On purpose.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {whyCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-200/60 bg-white p-10"
              >
                <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                <p className="text-[1.05rem] text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32 bg-gradient-to-b from-[#fafafa] to-emerald-50/40">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Stop configuring.{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Start shipping.
            </span>
          </h2>
          <p className="mt-8 text-2xl text-gray-500 max-w-xl mx-auto">
            Join thousands of makers who publish their apps in one click.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-10 py-5 text-base font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/25"
            >
              Start shipping free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-10 py-5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
