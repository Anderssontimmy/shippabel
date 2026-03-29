export const Privacy = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 prose prose-invert prose-sm max-w-none">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-surface-500 text-sm mb-8">Last updated: March 2026</p>

      <div className="space-y-6 text-surface-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">What we collect</h2>
          <p>
            When you use Shippabel, we collect your email address (for authentication),
            the GitHub URLs or zip files you submit for scanning, and basic usage analytics.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">How we use your data</h2>
          <p>
            We use your project files solely to perform the readiness scan and generate
            store assets. Your code is processed in memory and{" "}
            <strong className="text-white">never stored permanently</strong> on our servers.
            Scan results are stored to display your report.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Third-party services</h2>
          <p>
            We use Supabase for authentication and data storage, Stripe for payment processing,
            Anthropic Claude API for AI-powered analysis, and Expo EAS for build services.
            Each service has its own privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Your rights</h2>
          <p>
            You can request deletion of your account and all associated data at any time
            by contacting us. We will process deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Contact</h2>
          <p>
            For privacy-related questions, email us at privacy@shippabel.com.
          </p>
        </section>
      </div>
    </div>
  );
};
