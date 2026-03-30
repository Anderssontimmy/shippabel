import { Link } from "react-router-dom";
import { ArrowRight, Globe, Shield, Layers, Wand2, Scan, Wrench } from "lucide-react";
import PhoneMockup from "@/components/PhoneMockup";

const features = [
  { icon: Scan, title: "Check if you're ready", desc: "Just paste a link to your app or upload it. We'll tell you exactly what needs to be fixed before the stores will accept it." },
  { icon: Wrench, title: "We fix it for you", desc: "Most problems? One click and they're gone. We update your app's settings and push the changes automatically." },
  { icon: Shield, title: "No hidden secrets", desc: "We catch passwords and keys that are accidentally visible in your code — things that could get your app rejected or hacked." },
  { icon: Globe, title: "Write your store page", desc: "AI writes your app's name, description, and keywords for you. Pick your favorite from 3 different styles." },
  { icon: Layers, title: "Beautiful screenshots", desc: "Upload screenshots from your phone. We put them in real device frames so they look professional in the store." },
  { icon: Wand2, title: "Made for AI builders", desc: "Built your app with Claude, Cursor, Bolt, or Lovable? Perfect — Shippabel is made exactly for you." },
];

const steps = [
  { num: "01", title: "Check your app", desc: "Paste a link to your app or upload it as a zip file. We check everything the App Store and Google Play require — icons, settings, security, and more." },
  { num: "02", title: "Fix & polish", desc: "We show you what needs fixing and can auto-fix most things with one click. Then AI helps you write your store page and create beautiful screenshots." },
  { num: "03", title: "Go live", desc: "We build your app, send it to the stores, and let you know when it's approved. That's it — your app is live for the world to download." },
];

const whyCards = [
  { title: "No coding needed", desc: "You used AI to build your app. Now use Shippabel to publish it. No terminal commands, no config files, no developer jargon." },
  { title: "Someone finally gets it", desc: "Other tools assume you're a developer. We assume you're not. Every step is explained in plain language." },
  { title: "Stupidly simple", desc: "No confusing dashboards. No surprise fees. No 40-step guides. Just your app, in the store, fast." },
];

export const Landing = () => {
  return (
    <div className="bg-[#fafafa] text-gray-900 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-green-50/60 via-[#fafafa] to-[#fafafa]" />

        <div className="mx-auto max-w-[1400px] px-6 sm:px-12 pt-28 sm:pt-40 pb-28 sm:pb-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Left: Phone mockup */}
            <div className="relative order-2 lg:order-1 flex justify-center lg:justify-start">
              <PhoneMockup />
            </div>

            {/* Right: Text */}
            <div className="order-1 lg:order-2">
              <div className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-6 py-2.5 text-base text-gray-500 mb-12 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
                Now in public beta
              </div>

              <h1 className="animate-fade-up-delay-1 text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.04]">
                Get your app
                <br />
                <span className="text-green-600">
                  in the store.
                </span>
              </h1>

              <p className="animate-fade-up-delay-2 mt-10 text-2xl sm:text-[1.7rem] text-gray-500 leading-relaxed max-w-xl">
                You built an app with AI. Now let us put it on the
                App Store and Google Play — no tech skills needed.
              </p>

              <div className="animate-fade-up-delay-3 mt-14 flex flex-wrap items-center gap-5">
                <Link
                  to="/scan"
                  className="inline-flex items-center gap-2.5 rounded-full bg-green-600 px-10 py-5 text-lg font-semibold text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-600/25"
                >
                  Check my app for free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-10 py-5 text-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  How does it work?
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600 mb-4">What we do for you</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              We handle the hard part.
              <br />
              <span className="text-gray-400">You just click.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-gray-200/60 bg-white p-10 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/5 hover:-translate-y-1 transition-all duration-200"
              >
                <div className="h-16 w-16 rounded-2xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center mb-6 transition-colors">
                  <f.icon className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-200" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-[1.05rem] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* How it works */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600 mb-4">How it works</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Three steps. That's it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.num}>
                <div className="flex items-center gap-5 mb-6">
                  <span className="text-6xl font-extrabold text-green-200 italic">{step.num}</span>
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

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* Why Shippabel */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-12">
          <div className="text-center mb-16 sm:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600 mb-4">Why Shippabel</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Finally, someone{" "}
              <span className="text-gray-400">who gets it.</span>
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
      <section className="py-24 sm:py-32 bg-gradient-to-b from-[#fafafa] to-green-50/40">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Ready to{" "}
            <span className="text-green-600">
              go live?
            </span>
          </h2>
          <p className="mt-8 text-2xl text-gray-500 max-w-xl mx-auto">
            Thousands of people have already published their first app with Shippabel.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-10 py-5 text-base font-semibold text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-600/25"
            >
              Check my app for free
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
