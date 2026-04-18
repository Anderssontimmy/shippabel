import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Layers, Wand2, Scan, Wrench, ChevronDown, Globe } from "lucide-react";
import { useState, useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import PhoneMockup from "@/components/PhoneMockup";

const FadeIn = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const StaggerChildren = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {},
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

const steps = [
  { num: "01", title: "Check your app", desc: "Paste a link to your app or upload it as a zip file. We check everything the App Store and Google Play require." },
  { num: "02", title: "Fix & polish", desc: "We show you what needs fixing and can auto-fix most things with one click. Then AI writes your store page." },
  { num: "03", title: "Go live", desc: "We build your app, send it to the stores, and let you know when it's approved. That's it — you're live." },
];

const features = [
  { icon: Scan, title: "Check if you're ready", desc: "Paste a link or upload your app. We tell you exactly what needs fixing." },
  { icon: Wrench, title: "We fix it for you", desc: "Most problems? One click and they're gone. We push the changes automatically." },
  { icon: Shield, title: "We keep your app safe", desc: "We catch passwords and keys that are visible in your code." },
  { icon: Globe, title: "Write your store page", desc: "AI writes your app name, description, and keywords. Pick from 3 styles." },
  { icon: Layers, title: "Beautiful screenshots", desc: "Upload screenshots from your phone. We frame them professionally." },
  { icon: Wand2, title: "Made for AI builders", desc: "Built with Claude, Cursor, Bolt, or Lovable? This is made for you." },
];

const whyCards = [
  { title: "No coding needed", desc: "You used AI to build your app. Now use Shippabel to publish it. No terminal, no config, no jargon." },
  { title: "Someone finally gets it", desc: "Other tools assume you're a developer. We assume you're not. Plain language, every step." },
  { title: "Stupidly simple", desc: "No confusing dashboards. No surprise fees. No 40-step guides. Just your app, in the store, fast." },
];

const faqs = [
  { q: "Do I need to know how to code?", a: "Not at all. Shippabel is built for people who used AI tools to create their app. We handle all the technical stuff." },
  { q: "Do I need an Apple Developer account?", a: "Yes, Apple requires a $99/year developer account. Google Play requires a one-time $25 fee. We'll walk you through it." },
  { q: "How long does it take?", a: "The scan takes 30 seconds. Fixing takes a few minutes. After submitting, Apple reviews in 1-3 days, Google in hours." },
  { q: "What if my app gets rejected?", a: "We track your review status. If rejected, we explain why in plain language and help you fix it." },
  { q: "What kind of apps work?", a: "Any app built with Lovable, Cursor, Bolt, v0, or Claude Code. React, Next.js, Expo, and React Native." },
  { q: "How long is the special offer?", a: "The $49 launch price is time-limited. Once the offer ends it goes back to $99." },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200/60">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left cursor-pointer group">
        <span className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors pr-4">{q}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-5 text-sm text-gray-500 leading-relaxed">{a}</p>}
    </div>
  );
};

const HeroScanField = () => {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      navigate(`/scan?url=${encodeURIComponent(url.trim())}`);
    } else {
      navigate("/scan");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up-delay-3 mt-8">
      <div className="flex rounded-full border border-gray-200 bg-white shadow-lg shadow-green-600/5 overflow-hidden max-w-md">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your GitHub link..."
          className="flex-1 px-5 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent min-w-0"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors m-1 shrink-0 cursor-pointer"
        >
          Check now
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-400 px-1">
        <span>or</span>
        <Link to="/scan" className="text-green-600 hover:text-green-500 font-medium">upload a zip file</Link>
        <span className="text-gray-300">·</span>
        <a href="#how-it-works" className="hover:text-gray-600">How does it work?</a>
      </div>
    </form>
  );
};

export const Landing = () => {
  return (
    <div className="bg-[#fafafa] text-gray-900 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-green-50/60 via-[#fafafa] to-[#fafafa]" />

        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28 pb-16 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-medium text-green-700 mb-5">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Free to try — no account needed
              </div>

              <h1 className="animate-fade-up-delay-1 font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
                You built it.
                <br />
                <span className="text-green-600">We'll publish it.</span>
              </h1>

              <p className="animate-fade-up-delay-2 mt-6 text-sm text-gray-500 leading-relaxed max-w-md">
                You built an app with AI. Now let us put it on the
                App Store and Google Play — no tech skills needed.
              </p>

              <HeroScanField />

              <div className="animate-fade-up-delay-3 mt-5 flex items-center gap-2 text-xs text-gray-400">
                <span>Free to check</span>
                <span className="text-gray-300">·</span>
                <span className="text-green-400 font-medium">$49 to publish</span>
                <span className="text-gray-300">·</span>
                <span>50% off — limited time</span>
              </div>
            </div>

            {/* Right: Phone mockup */}
            <div className="relative flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Works with logos */}
        <div className="border-t border-gray-200/60 bg-white/50">
          <div className="mx-auto max-w-6xl px-6 py-6">
            <FadeIn>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8">
                <span className="text-xs font-medium tracking-widest uppercase text-gray-400">Works with</span>
                <div className="flex items-center gap-5 sm:gap-8">
                  {["Lovable", "Cursor", "Bolt", "Claude Code", "v0"].map((tool) => (
                    <span key={tool} className="text-xs font-semibold text-gray-400/80 hover:text-gray-600 transition-colors">{tool}</span>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="text-center mb-12 md:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-green-600 mb-3">How it works</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Three steps. That's it.
            </h2>
          </FadeIn>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <StaggerItem key={step.num}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-2xl border border-gray-200/60 bg-white flex items-center justify-center">
                    <span className="font-display text-2xl font-extrabold text-green-300 italic">{step.num}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block flex-1 h-px bg-gray-200" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* Features */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="text-center mb-12 md:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-green-600 mb-3">Features</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
              We handle the hard part.
              <br />
              <span className="text-gray-300">You just click.</span>
            </h2>
          </FadeIn>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <StaggerItem key={f.title}>
                <div className="group rounded-2xl border border-gray-200/60 bg-white p-6 hover:border-green-200 hover:shadow-lg hover:shadow-green-500/5 transition-all duration-200 h-full">
                  <div className="h-12 w-12 rounded-xl bg-green-50 group-hover:bg-green-100 flex items-center justify-center mb-4 transition-colors">
                    <f.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* Why Shippabel */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="text-center mb-12 md:mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-green-600 mb-3">Why Shippabel</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Finally, someone{" "}
              <span className="text-gray-300">who gets it.</span>
            </h2>
          </FadeIn>

          <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {whyCards.map((card) => (
              <StaggerItem key={card.title}>
                <div className="rounded-2xl border border-gray-200/60 bg-white p-6 h-full">
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

      {/* FAQ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-6">
          <FadeIn className="text-center mb-10">
            <p className="text-xs font-medium tracking-widest uppercase text-green-600 mb-3">Questions</p>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              You're probably wondering...
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            {faqs.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-[#fafafa] to-green-50/40">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Ready to{" "}
              <span className="text-green-600">go live?</span>
            </h2>
            <p className="mt-5 text-sm text-gray-500 max-w-md mx-auto">
              Be one of the first to publish your AI-built app with Shippabel.
            </p>
          </FadeIn>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>Free to check</span>
            <span className="text-gray-300">·</span>
            <span>$99 to publish</span>
            <span className="text-gray-300">·</span>
            <span>14-day money-back guarantee</span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-600/25"
            >
              Check my app now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
