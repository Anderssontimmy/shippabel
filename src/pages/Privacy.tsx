export const Privacy = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 prose prose-sm max-w-none">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-surface-500 text-sm mb-8">Last updated: October 2026</p>

      <div className="space-y-6 text-surface-600 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">What we collect</h2>
          <p>
            When you use Shippabel, we collect your email address (for authentication),
            the GitHub links or zip files you submit for scanning, your scan results, the store
            content you create (text, screenshots, privacy policy), your payment status, and basic
            usage analytics. If you connect them, we also store your GitHub access token and your
            Google Play or Expo credentials, encrypted. Stripe handles your card details; we never
            see them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">How we use your data</h2>
          <p>
            We use your project files solely to scan your app, generate store assets and, when you
            ask, build and submit it. GitHub repositories are read when needed. Zip files you
            upload are kept in private storage that only our servers can read, so we can generate
            store content for that project, and they are removed if you ask us to delete your
            account. Scan results are stored to display your report. To write store content, parts
            of your project (such as file names, configuration and code excerpts) are sent to
            Anthropic's Claude API.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Third-party services</h2>
          <p>
            We use Supabase for authentication, data and file storage, Stripe for payment
            processing, Anthropic's Claude API for AI-written content, GitHub for your repository
            (builds run in your own GitHub Actions), Google Play when you submit, Expo for Expo
            apps, and Vercel and Cloudflare to host and deliver the site. Each service has its own
            privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Your rights</h2>
          <p>
            You can request deletion of your account and all associated data at any time
            by contacting us. We will process deletion requests within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Contact</h2>
          <p>
            For privacy-related questions, email us at privacy@shippabel.com.
          </p>
        </section>
      </div>
    </div>
  );
};
