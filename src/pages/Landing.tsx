import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { lazy, Suspense, useEffect, useState, useRef, type ReactNode, type RefObject } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ScanField } from "@/components/ScanField";
import { primaryCta } from "@/components/ui/styles";
import { trackEvent } from "@/lib/analytics";
import { guarantee } from "@/lib/guarantee";

// The moving phone loads after the page is usable, in a box that already has its height so nothing jumps.
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

// The page is written for people who have never published an app and know no developer words: what they do, what we do,
// one price. Keep it short; anything technical belongs in the free check, which tells each person what their own app needs.
const steps = [
  { title: "Paste your link", body: "We check your app for free and tell you, in plain words, what's in the way. It takes about 30 seconds." },
  { title: "Check your store page", body: "We fix the problems and write your app's page for the stores, with a name, a description and screenshots. You read it and change anything you like." },
  { title: "Press publish", body: "We send your app to the App Store and Google Play and keep you updated. The stores usually take a few days to approve it." },
];

const reassurances = [
  "Free check, no account needed",
  "We only change your app when you say so",
  guarantee.headline,
];

const faqs = [
  { q: "Do I need to know how to code?", a: "No. If you can paste a link, you can use Shippabel. We do the technical parts." },
  { q: "What do I need before I start?", a: "An app made with an AI tool, and its link. To publish, you also need a developer account with Apple and one with Google. We walk you through both. Not every app can be published as it is. The free check tells you what yours needs." },
  { q: "How long does it take?", a: "The check takes about 30 seconds. Getting your app ready takes a few minutes of your time. After that, the stores review your app, which usually takes a few days." },
  { q: "What if the stores say no?", a: "We explain why in plain words and help you fix it. If we can't get your app live, you get your money back." },
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

// The page's story once, as a phone: an app is checked, fixed, sent to both stores and goes live. The app is made up.
const ExamplePhone = () => (
  <div className="animate-fade-up-delay-2 flex flex-col items-center">
    <div
      role="img"
      aria-label="An example: an app is checked, fixed, sent to both stores and goes live."
      className="flex min-h-[560px] items-center justify-center"
    >
      <Suspense fallback={null}>
        <PlayPhone />
      </Suspense>
    </div>
    <p className="mt-2 text-center text-sm text-surface-600">An example app, made up for this page.</p>
  </div>
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
      <section className="mx-auto max-w-6xl px-6 pt-16 md:pt-24 pb-16 md:pb-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div ref={heroFieldRef}>
            <h1 className="animate-fade-up font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              You built it.
              <br />
              <span className="text-green-700">We'll publish it.</span>
            </h1>

            <p className="animate-fade-up-delay-1 mt-6 max-w-md text-lg leading-relaxed text-surface-600">
              Made an app with an AI tool? We put it in the App Store and Google Play for you. You don't need to know anything technical.
            </p>

            <ScanField location="landing_hero" className="animate-fade-up-delay-3 mt-8" />

            <details className="mt-4 max-w-md text-sm text-surface-600">
              <summary className="cursor-pointer font-medium text-green-700 underline hover:text-green-800">What's a GitHub link?</summary>
              <p className="mt-2 leading-relaxed">
                It's the web address where your app's files are saved online. Tools like Lovable and Bolt have a GitHub button that
                makes one for you. No link? Choose "upload a zip file" instead.
              </p>
            </details>
          </div>

          <ExamplePhone />
        </div>

        <p className="mt-14 text-sm text-surface-600">
          Made for apps built with ChatGPT, Claude, Gemini, Cursor, Lovable, Bolt, Replit and v0.
        </p>
      </section>

      {/* How it goes */}
      <section id="how-it-works" className="bg-surface-50 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">How it goes</h2>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-surface-600">You do three things. We do the rest.</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <ol aria-label="The three steps">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-6 border-t border-surface-200 py-7 first:border-t-0 first:pt-0">
                  <span aria-hidden="true" className="font-display text-4xl font-extrabold leading-none text-green-700">{i + 1}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-surface-900">{step.title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-surface-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </FadeIn>
        </div>
      </section>

      {/* The price */}
      <section className="py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.15]">One price. No surprises.</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="max-w-lg text-lg leading-relaxed text-surface-700">
              $99 once for one app. No subscription. The check is free, so you know what you're paying for first.
            </p>
            <ul className="mt-6 space-y-3">
              {reassurances.map((item) => (
                <li key={item} className="flex items-start gap-3 text-base leading-relaxed text-surface-700">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-green-700" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-surface-600">
              Apple and Google charge their own fee for a developer account (Apple $99 a year, Google $25 once). We walk you through it.
            </p>
            <Link
              to="/scan"
              onClick={() => trackEvent("CTA Clicked", { location: "landing_price", action: "scan_empty" })}
              className={`${primaryCta} mt-8`}
            >
              Check my app for free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
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
              Paste your link. The check is free and takes about 30 seconds.
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
              <Link to="/scan/demo" className="text-base font-medium text-surface-700 underline hover:text-surface-900">
                See an example report
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
