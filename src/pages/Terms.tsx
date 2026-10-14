const sections: { title: string; body: string }[] = [
  {
    title: "About these terms",
    body: "Shippabel is operated by TK innovations AB, Sweden (\"we\"). By using shippabel.com you agree to these terms. If you have questions, email hello@shippabel.com.",
  },
  {
    title: "What Shippabel does",
    body: "Shippabel checks whether your app is ready for Google Play. Checking is free. On a paid plan we also help you fix issues, write your store page, prepare screenshots and a privacy policy, build your app and send it to Google Play. We provide the tools. You publish your own app from your own Google Play developer account.",
  },
  {
    title: "Your account",
    body: "You can sign in with email, Google or GitHub. You are responsible for keeping your account secure and for what happens under it.",
  },
  {
    title: "Your app and your code",
    body: "You keep all rights to your app, your code and your content. You give us permission to read and process them, and to change your repository only when you start an action that does so, solely to provide the service. You confirm that you have the right to submit what you submit, and that your app follows Google Play's policies and the law.",
  },
  {
    title: "AI-generated content",
    body: "Store text and privacy policies are written with AI. They are a starting point, not legal advice. Read them before you publish. You are responsible for what you publish.",
  },
  {
    title: "Plans and payment",
    body: "Ship ($99) and Unlimited ($179) are one-time payments in US dollars, processed by Stripe. Ship is for one app. Unlimited is for as many apps as you want. There is no subscription and nothing renews automatically. If we change prices, the change applies to future purchases only.",
  },
  {
    title: "Our money-back promise",
    body: "If we can't get your app onto Google Play because of a limitation in our service, we refund the full amount you paid. Email hello@shippabel.com within 30 days of your purchase and tell us which app it concerns. We can't refund when Google rejects an app for breaking its policies, or when the delay comes from accounts or information that only you can provide.",
  },
  {
    title: "Acceptable use",
    body: "Don't use Shippabel for apps or content that are illegal or harmful, to attack or overload our service, or to access anything that isn't yours.",
  },
  {
    title: "Availability and changes",
    body: "We work to keep Shippabel running, but we can't promise it will always be available. Parts of the service depend on GitHub, Google, Stripe and other providers that we don't control. We may change or retire features.",
  },
  {
    title: "Liability",
    body: "To the extent the law allows, our total liability for any claim is limited to the amount you paid us in the 12 months before the claim, and we are not liable for indirect losses such as lost revenue or lost data. Nothing in these terms limits liability that can't be limited by law, or your rights as a consumer under mandatory law.",
  },
  {
    title: "Ending your use",
    body: "You can stop using Shippabel at any time and ask us to delete your account (see the Privacy Policy). We may suspend an account that breaks these terms.",
  },
  {
    title: "Governing law",
    body: "Swedish law applies. Disputes are handled by Swedish courts. If you are a consumer, you keep the protection of the mandatory laws of the country where you live, including any right to bring a claim in your home courts.",
  },
  {
    title: "Changes to these terms",
    body: "If we make a material change, we'll update this page and its date.",
  },
];

export const Terms = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 prose prose-sm max-w-none">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-surface-500 text-sm mb-8">Last updated: October 2026</p>

      <div className="space-y-6 text-surface-600 text-sm leading-relaxed">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-surface-900 mb-2">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};
