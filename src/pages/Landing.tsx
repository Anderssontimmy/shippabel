import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";
import { lazy, Suspense, useEffect, useState, useRef, type ReactNode, type RefObject } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ScanField } from "@/components/ScanField";
import { primaryCta } from "@/components/ui/styles";
import { trackEvent } from "@/lib/analytics";
import { guarantee } from "@/lib/guarantee";

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

// The times are the ones the product states elsewhere (the FAQ and the build page), not promises made up for this strip.
const steps = [
  { title: "Check", time: "About 30 seconds", body: "Paste your GitHub link. It's free and needs no account." },
  { title: "Fix and write", time: "A few minutes", body: "Fix problems with one click, then AI drafts your store page." },
  { title: "Build and upload", time: "About 10 to 20 minutes", body: "We build and sign your app and upload it to Google Play's testing track." },
  { title: "Google's review", time: "A few hours to a few days", body: "We track the status and explain any rejection in plain language." },
];

const included = [
  "One-click fixes for what Google would reject",
  "Your web app wrapped as an Android app, if it needs it",
  "Your store page, written by AI in three styles",
  "Screenshots in professional device frames",
  "A privacy policy, written and hosted for you",
  "A signed build, uploaded to Google Play's testing track",
  "Review status tracked, with rejections explained in plain language",
];

const notIncluded = [
  "Google's $25 developer fee, paid to Google",
  "Google's closed test with at least 12 testers for 14 days, which new personal developer accounts run in their own Play Console",
  "Your own backend or hosting costs, if your app has any",
  "New features or a redesign: we publish the app you built",
];

const faqs = [
  { q: "Do I need to know how to code?", a: "Not at all. Shippabel is built for people who used AI tools to create their app. We handle all the technical stuff." },
  { q: "Do I need a Google Play account?", a: "Yes. Google charges a one-time $25 developer fee, paid to Google. We'll walk you through it." },
  { q: "How long does it take?", a: "The check takes about 30 seconds. Fixing and writing your store page take a few minutes. After submitting, Google usually reviews new apps in a few hours to a few days." },
  { q: "What if my app gets rejected?", a: "We track your review status. If rejected, we explain why in plain language and help you fix it." },
  { q: "What kind of apps work?", a: "Apps built with ChatGPT, Claude, Gemini, Cursor, Lovable, Bolt, Replit or v0. Vite web apps are wrapped as a mobile app for you, and Expo and React Native apps are built as they are. Next.js apps need a static export first; the free check tells you." },
  { q: "Can I publish to the App Store?", a: "Not yet. Today Shippabel builds and submits to Google Play only. App Store publishing is coming, and we'll say so on this page when it works." },
  { q: "Is there a guarantee?", a: `${guarantee.headline} ${guarantee.detail}` },
  { q: "Why does Google ask for 12 testers?", a: "Google requires developer accounts created as personal accounts after November 2023 to run a closed test with at least 12 testers for 14 days before an app can be released publicly. We upload your build to Google Play's internal testing track. The closed test happens in your Play Console." },
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
              You built an app with AI. We take it the rest of the way: onto the App Store and Google Play, with no tech skills needed.
            </p>

            <ScanField location="landing_hero" className="animate-fade-up-delay-3 mt-8" />
          </div>

          <SampleReport />
        </div>

        <p className="mt-14 text-sm text-surface-600">
          Made for apps built with ChatGPT, Claude, Gemini, Cursor, Lovable, Bolt, Replit and v0.
        </p>

        <div className="mt-16">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            From your link to Google Play, step by step.
          </h2>
          <ol aria-label="How long each step takes" className="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-surface-300 pt-4">
                <p className="text-sm font-semibold text-green-700">
                  {i + 1}. {step.time}
                </p>
                <h3 className="mt-1.5 text-lg font-semibold text-surface-900">{step.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-surface-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
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

      {/* What the price covers, and what it does not */}
      <section id="whats-included" className="bg-surface-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">
              What $99 gets you, and what it doesn't.
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-surface-600">
              One payment for one app, no subscription. Have more than one app?{" "}
              <Link to="/pricing" className="font-medium text-green-700 underline hover:text-green-800">Unlimited is $179</Link>.
            </p>
          </FadeIn>

          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <FadeIn>
              <h3 id="included-heading" className="text-lg font-semibold text-surface-900">Included</h3>
              <ul aria-labelledby="included-heading" className="mt-4 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base leading-relaxed text-surface-700">
                    <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-green-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h3 id="not-included-heading" className="text-lg font-semibold text-surface-900">Not included</h3>
              <ul aria-labelledby="not-included-heading" className="mt-4 space-y-3">
                {notIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base leading-relaxed text-surface-600">
                    <Minus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-surface-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          <FadeIn className="mt-12">
            <div className="max-w-2xl rounded-2xl border border-green-200 bg-green-50 px-6 py-5">
              <p className="text-base font-semibold text-green-900">{guarantee.headline}</p>
              <p className="mt-1 text-base text-green-800">{guarantee.detail}</p>
              <a href="mailto:hello@shippabel.com" className="mt-2 inline-block text-base font-medium text-green-800 underline hover:text-green-900">
                hello@shippabel.com
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What stays true */}
      <section className="py-20 md:py-28">
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
      <section className="bg-surface-50 py-20 md:py-28">
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
      <section ref={closingRef} className="py-20 md:py-28">
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
            <p className="mt-6 text-base text-surface-600">
              Questions first? Email{" "}
              <a href="mailto:hello@shippabel.com" className="font-medium text-green-700 underline hover:text-green-800">hello@shippabel.com</a>.
            </p>
          </FadeIn>
        </div>
      </section>

      <StickyCheckBar visible={heroScrolledPast && !closingReached} />
    </div>
  );
};
