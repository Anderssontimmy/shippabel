// The words of the front page that search engines and AI crawlers must also read. The build writes them into the
// page's static HTML (scripts/prerender.js), so what a crawler reads and what a visitor sees can never drift apart.
export const landingCopy = {
  headline: ["You built it.", "We'll publish it."],
  intro: "Made an app with an AI tool? We put it in the App Store and Google Play for you. You don't need to know anything technical.",
  steps: [
    { title: "Paste your link", body: "We check your app for free and tell you, in plain words, what's in the way. It takes about 30 seconds." },
    { title: "Check your store page", body: "We fix the problems and write your app's page for the stores, with a name, a description and screenshots. You read it and change anything you like." },
    { title: "Press publish", body: "We send your app to the App Store and Google Play and keep you updated. The stores usually take a few days to approve it." },
  ],
  price: {
    line: "$99 once for one app. No subscription. The check is free, so you know what you're paying for first.",
    reassurances: ["Free check, no account needed", "We only change your app when you say so"],
    promise: "Our promise: your app goes live, or you get your money back.",
    fees: "Apple and Google charge their own fee for a developer account (Apple $99 a year, Google $25 once). We walk you through it.",
  },
  faqs: [
    { q: "Do I need to know how to code?", a: "No. If you can paste a link, you can use Shippabel. We do the technical parts." },
    { q: "What do I need before I start?", a: "An app made with an AI tool, and its link. To publish, you also need a developer account with Apple and one with Google. We walk you through both. Not every app can be published as it is. The free check tells you what yours needs." },
    { q: "How long does it take?", a: "The check takes about 30 seconds. Getting your app ready takes a few minutes of your time. After that, the stores review your app, which usually takes a few days." },
    { q: "What if the stores say no?", a: "We explain why in plain words and help you fix it. If we can't get your app live, you get your money back." },
  ],
};
