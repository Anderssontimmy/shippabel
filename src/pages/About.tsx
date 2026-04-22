import { Link } from "react-router-dom";
import { Rocket, Scan, Wrench, Globe, Layers, Shield, ArrowRight } from "lucide-react";

export const About = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-6 w-6 text-surface-900" />
          <span className="text-sm font-medium text-surface-500 uppercase tracking-wide">About Shippabel</span>
        </div>
        <h1 className="text-4xl font-bold text-surface-900 mb-4 leading-tight">
          Get your app in the stores — without the headache
        </h1>
        <p className="text-lg text-surface-500 leading-relaxed">
          Shippabel is built for people who used AI to build their app. You wrote the code (or had Claude do it).
          We handle everything it takes to get from "it works on my machine" to "live on the App Store and Google Play."
        </p>
      </div>

      <div className="border-t border-surface-100 pt-12 mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-3">Why we built this</h2>
        <div className="space-y-4 text-surface-500 leading-relaxed">
          <p>
            Publishing an app sounds simple. It isn't. App Store and Google Play have hundreds of requirements —
            icons in 12 sizes, privacy manifests, permission strings, metadata limits, screenshot dimensions,
            and a review process that rejects apps for reasons most developers have never heard of.
          </p>
          <p>
            Most tools assume you already know all of this. Shippabel doesn't. We assume you built something
            great and just want people to use it. We take care of the technical maze so you don't have to learn it.
          </p>
        </div>
      </div>

      <div className="border-t border-surface-100 pt-12 mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-8">What Shippabel does</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            { icon: Scan, title: "Readiness check", desc: "We scan your app against App Store and Google Play requirements and show you exactly what needs fixing." },
            { icon: Wrench, title: "Auto-fix issues", desc: "Most problems are one click away from being solved. We push fixes automatically." },
            { icon: Shield, title: "Security scan", desc: "We catch exposed API keys, passwords, and secrets in your code before the stores do." },
            { icon: Globe, title: "AI-written store page", desc: "We generate your app name, description, and keywords in three styles. Pick your favourite." },
            { icon: Layers, title: "Professional screenshots", desc: "Upload screenshots from your device. We frame them in store-ready device mockups." },
            { icon: Rocket, title: "Submission & tracking", desc: "We submit to the stores and keep you updated in plain language until you're approved." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-50 border border-surface-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-surface-700" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-900 mb-1">{title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-surface-100 pt-12 mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-4">Who is it for?</h2>
        <p className="text-surface-500 leading-relaxed mb-4">
          Shippabel is made for indie developers, solo founders, and AI-assisted builders — anyone who built
          something with tools like Claude, Cursor, Bolt, or Lovable and wants to ship it without hiring a
          mobile developer just to get through the stores.
        </p>
        <p className="text-surface-500 leading-relaxed">
          If you've ever stared at an App Store rejection email wondering what "ITMS-90683" means,
          Shippabel is for you.
        </p>
      </div>

      <div className="bg-surface-50 border border-surface-100 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-surface-900 mb-2">Ready to ship?</h2>
        <p className="text-surface-500 mb-6 text-sm">
          Paste a link to your app and we'll tell you exactly what it needs to get approved.
        </p>
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 bg-surface-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-surface-700 transition-colors"
        >
          Check my app <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
