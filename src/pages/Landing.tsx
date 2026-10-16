import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useState, useRef, type ReactNode, type RefObject } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

// The animated phone is below the first screen, so it loads after the page is usable.
const PlayPhone = lazy(() => import("@/components/PlayPhone"));

const FadeIn = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const show = reduce || isInView;

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Starts false and only becomes true once the browser reports on the element, so nothing flashes at load.
const useObserved = (ref: RefObject<HTMLElement | null>, test: (entry: IntersectionObserverEntry) => boolean) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setMatches(!!entry && test(entry)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, test]);
  return matches;
};
const scrolledPast = (entry: IntersectionObserverEntry) => !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
const reached = (entry: IntersectionObserverEntry) => entry.isIntersecting || entry.boundingClientRect.top < 0;

const trustPoints = [
  {
    title: "The check is free.",
    body: "Paste a link and get your report in about 30 seconds. The check only reads your code, and you don't need an account.",
  },
  {
    title: "We change your code only when you ask.",
    body: "Fixes and builds happen when you press the button. They are ordinary commits in your GitHub, so you can review and undo them.",
  },
  {
    title: "One price, no subscription.",
    body: "$99 once for one app, or $179 for unlimited apps. Google's $25 developer fee is paid to Google.",
  },
];

const faqs = [
  { q: "Do I need to know how to code?", a: "Not at all. Shippabel is built for people who used AI tools to create their app. We handle all the technical stuff." },
  { q: "Do I need a Google Play account?", a: "Yes. Google charges a one-time $25 developer fee, paid to Google. We'll walk you through it." },
  { q: "How long does it take?", a: "The check takes about 30 seconds. Fixing and writing your store page take a few minutes. After submitting, Google usually reviews new apps in a few hours to a few days." },
  { q: "What if my app gets rejected?", a: "We track your review status. If rejected, we explain why in plain language and help you fix it." },
  { q: "What kind of apps work?", a: "Apps built with Lovable, Cursor, Bolt, v0 or Claude Code. Vite web apps are wrapped as a mobile app for you, and Expo and React Native apps are built as they are. Next.js apps need a static export first; the free check tells you." },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-200">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between py-5 text-left cursor-pointer group">
        <span className="text-base font-semibold text-surface-900 group-hover:text-green-700 transition-colors pr-4">{q}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-surface-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-5 text-base text-surface-600 leading-relaxed">{a}</p>}
    </div>
  );
};

// The one primary action of the page. Green marks "forward" everywhere it appears.
const primaryCta =
  "inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-800";

const HeroScanField = () => {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("CTA Clicked", {
      location: "landing_hero",
      action: url.trim() ? "scan_with_url" : "scan_empty",
    });
    if (url.trim()) {
      navigate(`/scan?url=${encodeURIComponent(url.trim())}`);
    } else {
      navigate("/scan");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up-delay-3 mt-8">
      <div className="flex max-w-md rounded-full border border-surface-300 bg-white p-1 focus-within:ring-2 focus-within:ring-green-700 focus-within:ring-offset-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-label="GitHub repository link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your GitHub link"
          className="min-w-0 flex-1 bg-transparent px-4 sm:px-5 py-3 text-base text-surface-900 placeholder:text-surface-500 outline-none"
        />
        <button type="submit" className={`${primaryCta} shrink-0 py-3 max-sm:px-5 cursor-pointer`}>
          Check now
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm text-surface-600">
        Free, no account needed. Or{" "}
        <Link
          to="/scan"
          onClick={() => trackEvent("CTA Clicked", { location: "landing_hero", action: "upload_zip" })}
          className="font-medium text-green-700 underline hover:text-green-800"
        >
          upload a zip file
        </Link>
        .
      </p>
    </form>
  );
};

const SampleReport = () => (
  <figure className="animate-fade-up-delay-2">
    <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
      <img
        src="/landing/report.jpg"
        width={1560}
        height={1350}
        fetchPriority="high"
        alt="A sample report from the free check: a score of 73 out of 100, the verdict 'Your app can be on Google Play', and the problems to fix first."
        className="block h-auto w-full"
      />
    </div>
    <figcaption className="mt-3 text-sm text-surface-600">
      A sample report from the free check.{" "}
      <Link to="/scan/demo" className="font-medium text-green-700 underline hover:text-green-800">
        See the whole report
      </Link>
    </figcaption>
  </figure>
);

const StickyCheckBar = ({ visible }: { visible: boolean }) => (
  <div
    aria-hidden={!visible}
    className={`fixed bottom-0 left-0 right-0 z-50 border-t border-surface-200 bg-white/95 px-4 py-3 backdrop-blur-xl transition-transform duration-200 sm:hidden ${
      visible ? "translate-y-0" : "translate-y-full"
    }`}
  >
    <Link
      to="/scan"
      tabIndex={visible ? 0 : -1}
      onClick={() => trackEvent("CTA Clicked", { location: "landing_sticky", action: "scan_empty" })}
      className={`${primaryCta} w-full py-3`}
    >
      Check my app now
      <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  </div>
);

export const Landing = () => {
  const heroFieldRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLElement>(null);
  const heroScrolledPast = useObserved(heroFieldRef, scrolledPast);
  const closingReached = useObserved(closingRef, reached);

  return (
    <div className="bg-white text-surface-900 min-h-screen">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-24 pb-16 md:pb-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div ref={heroFieldRef}>
            <h1 className="animate-fade-up font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              You built it.
              <br />
              <span className="text-green-700">We'll publish it.</span>
            </h1>

            <p className="animate-fade-up-delay-1 mt-6 max-w-md text-lg leading-relaxed text-surface-600">
              You built an app with AI. We take it the rest of the way: onto Google Play, with no tech skills needed.
            </p>

            <HeroScanField />
          </div>

          <SampleReport />
        </div>

        <p className="mt-14 text-sm text-surface-600">
          Made for apps built with Lovable, Cursor, Bolt, v0 and Claude Code.
        </p>
      </section>

      {/* Fix, then the store page */}
      <section id="how-it-works" className="bg-surface-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
              We fix what Google would reject, then write your store page.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-surface-600">
              Many problems in the report can be fixed with one click. After that, AI drafts your app name,
              description and keywords in three styles. You pick the one you like and change anything you want.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
              <img
                src="/landing/listing.jpg"
                width={1560}
                height={1050}
                loading="lazy"
                alt="The store page editor: three written versions to choose from, the app name, the short description and a Google Play preview."
                className="block h-auto w-full"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Build and send */}
      <section className="py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <FadeIn className="flex justify-center lg:order-first">
            <div className="min-h-[560px]">
              <Suspense fallback={null}>
                <PlayPhone />
              </Suspense>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
              We build it and send it to Google Play.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-surface-600">
              We build your app, sign it and upload it to Google Play, and show you every step on the way.
              Google's own review decides when it goes public.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* What stays true */}
      <section className="bg-surface-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
              You stay in control.
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <ul>
              {trustPoints.map((point) => (
                <li key={point.title} className="border-t border-surface-200 py-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-surface-900">{point.title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-surface-600">{point.body}</p>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <FadeIn className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
                You're probably wondering
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              {faqs.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Closing action */}
      <section ref={closingRef} className="bg-surface-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
              Find out what's in the way.
            </h2>
            <p className="mt-4 max-w-md text-lg text-surface-600">
              Paste your GitHub link. The check is free and takes about 30 seconds.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                to="/scan"
                onClick={() => trackEvent("CTA Clicked", { location: "landing_footer", action: "scan_empty" })}
                className={primaryCta}
              >
                Check my app now
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className="text-base font-medium text-surface-700 underline hover:text-surface-900">
                See pricing
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <StickyCheckBar visible={heroScrolledPast && !closingReached} />
    </div>
  );
};
