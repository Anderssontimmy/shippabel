export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "publish-cursor-app-to-app-store",
    title: "How to publish your Cursor app to the App Store (2026 guide)",
    excerpt: "You built an app with Cursor. Now what? This step-by-step guide shows you exactly how to get it on the App Store and Google Play — no coding experience needed.",
    category: "Guide",
    readTime: "8 min read",
    date: "Apr 2026",
    content: `
<p>So you used <strong>Cursor</strong> to build your first app. It works on your phone, it looks great, and you're ready to share it with the world. But then you hit the wall — <em>how do you actually get it on the App Store?</em></p>

<p>Publishing an app isn't hard, but there are about 40 things you need to get right. Missing even one can get your app rejected. This guide walks you through every step.</p>

<h2>What you need before you start</h2>

<p>Before we dive in, here's what you'll need:</p>

<ul>
<li><strong>An Apple Developer account</strong> — costs $99/year. Sign up at <a href="https://developer.apple.com">developer.apple.com</a>. Approval takes 24-48 hours.</li>
<li><strong>A Google Play Developer account</strong> — costs $25 one-time. Sign up at <a href="https://play.google.com/console">play.google.com/console</a>. Usually approved within hours.</li>
<li><strong>Your app on GitHub</strong> — if your code isn't on GitHub yet, you'll need to push it there.</li>
</ul>

<h2>Step 1: Check if your app is ready</h2>

<p>The stores have specific requirements — app icons, privacy policies, proper configuration, and more. Most apps built with AI tools are missing several of these.</p>

<p>The fastest way to find out what's missing: use a free scanner like <a href="https://shippabel.com/scan">Shippabel's app checker</a>. Paste your GitHub link and get a report in 30 seconds.</p>

<p>Common issues found in Cursor-built apps:</p>
<ul>
<li>Missing app icon (stores require 1024x1024 PNG)</li>
<li>No privacy policy (required by both Apple and Google)</li>
<li>Default bundle identifier (needs to be unique)</li>
<li>No splash/loading screen</li>
<li>Hardcoded API keys in the code</li>
</ul>

<h2>Step 2: Fix the issues</h2>

<p>Most issues are simple configuration changes in your <code>app.json</code> file. Here's what you need:</p>

<ul>
<li><strong>App name</strong> — max 30 characters, this is what shows under your icon</li>
<li><strong>Bundle identifier</strong> — a unique ID like <code>com.yourname.yourapp</code></li>
<li><strong>Version number</strong> — start with <code>1.0.0</code></li>
<li><strong>App icon</strong> — a 1024x1024 PNG file, no transparency</li>
<li><strong>Splash screen</strong> — the loading screen people see when opening your app</li>
</ul>

<p>Tools like Shippabel can auto-fix most of these with one click — they commit the changes directly to your GitHub repo.</p>

<h2>Step 3: Write your store listing</h2>

<p>Your store listing is what convinces people to download your app. You need:</p>

<ul>
<li><strong>App name</strong> (30 chars max)</li>
<li><strong>Subtitle</strong> (iOS) or <strong>Short description</strong> (Android)</li>
<li><strong>Full description</strong> — up to 4000 characters</li>
<li><strong>Keywords</strong> (iOS only) — comma-separated, 100 chars max</li>
<li><strong>Screenshots</strong> — at least 3, framed in device mockups</li>
<li><strong>Privacy policy</strong> — a hosted web page explaining data collection</li>
</ul>

<p>Writing all this from scratch takes hours. AI tools can generate it in seconds — Shippabel uses Claude AI to write 3 variants of your store listing that you can pick from.</p>

<h2>Step 4: Create screenshots</h2>

<p>Both stores require screenshots showing what your app looks like. Apple requires specific sizes:</p>

<ul>
<li>iPhone 6.7" — 1290 × 2796 pixels</li>
<li>iPhone 6.1" — 1179 × 2556 pixels</li>
</ul>

<p>The trick: take raw screenshots on your phone, then frame them in device mockups with captions. This looks much more professional than raw screenshots.</p>

<h2>Step 5: Build and submit</h2>

<p>You can't submit the development version of your app — you need a <strong>production build</strong>. This is a compiled version optimized for the stores.</p>

<p>For Expo/React Native apps, you use <strong>EAS Build</strong> from Expo. This runs in the cloud and produces the files Apple and Google need (.ipa for iOS, .apk for Android).</p>

<p>After building, you submit through Apple's App Store Connect and Google's Play Console. Then you wait for review — Apple takes 1-3 days, Google takes a few hours.</p>

<h2>The easy way</h2>

<p>If all of this sounds like a lot, it is. That's exactly why tools like <a href="https://shippabel.com">Shippabel</a> exist — they handle every step automatically. Scan, fix, write your store page, create screenshots, build, and submit. From "it works on my phone" to "it's in the App Store."</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "bolt-app-to-app-store",
    title: "From Bolt.new to App Store in 24 hours",
    excerpt: "Built something cool with Bolt.new? Here's exactly how to take it from a web prototype to a published mobile app — step by step, no developer needed.",
    category: "Guide",
    readTime: "6 min read",
    date: "Apr 2026",
    content: `
<p>You just built an amazing app with <strong>Bolt.new</strong>. It works in the browser, it looks great, and you want the world to try it. But Bolt creates web apps — how do you get it on the App Store?</p>

<p>Good news: <strong>it's possible, and it's easier than you think.</strong></p>

<h2>The challenge with web apps</h2>

<p>Apple and Google don't accept web apps directly. They need a "native" app — one that's been compiled specifically for phones. But you don't need to rewrite your app. You just need to <strong>wrap it</strong>.</p>

<p>Wrapping means taking your existing web app and putting it inside a thin native shell. Think of it like putting your web app inside a phone-shaped frame. The user sees a regular app, but inside it's running your web code.</p>

<h2>Step 1: Push your code to GitHub</h2>

<p>If your Bolt app isn't on GitHub yet, you'll need to put it there. In Bolt, click the GitHub icon and connect your repository. This gives tools like Shippabel access to your code.</p>

<h2>Step 2: Convert to mobile format</h2>

<p>Your Bolt app needs to be converted from a web app to an Expo project. This involves:</p>

<ul>
<li>Adding an <code>app.json</code> configuration file</li>
<li>Adding mobile dependencies</li>
<li>Creating a wrapper that loads your web app</li>
</ul>

<p><a href="https://shippabel.com/scan">Shippabel can do this automatically</a> — scan your app, and if it detects a web project, it offers a "Make it App Store ready" button that converts everything for you.</p>

<h2>Step 3: Add the store requirements</h2>

<p>Now you need everything the stores require:</p>

<ul>
<li><strong>App icon</strong> — 1024x1024 PNG</li>
<li><strong>Store description</strong> — what your app does</li>
<li><strong>Screenshots</strong> — at least 3, in device frames</li>
<li><strong>Privacy policy</strong> — a hosted web page</li>
</ul>

<p>All of these can be generated with AI in minutes.</p>

<h2>Step 4: Build and publish</h2>

<p>Use EAS Build (from Expo) to create the production files, then submit to both stores. Apple reviews in 1-3 days, Google in hours.</p>

<h2>Timeline: 24 hours</h2>

<table>
<tr><td><strong>Hour 0-1</strong></td><td>Scan, convert, fix issues</td></tr>
<tr><td><strong>Hour 1-2</strong></td><td>Generate store listing and screenshots</td></tr>
<tr><td><strong>Hour 2-3</strong></td><td>Build and submit</td></tr>
<tr><td><strong>Hour 3-24</strong></td><td>Wait for Apple review</td></tr>
</table>

<p><strong>Total hands-on time: about 1 hour.</strong> The rest is waiting.</p>

<p><a href="https://shippabel.com/scan">Get started for free →</a></p>
`,
  },
  {
    slug: "app-store-screenshots-guide",
    title: "The complete guide to App Store screenshots (2026)",
    excerpt: "Screenshots are the #1 factor in app downloads. Here's exactly what sizes you need, how many, and how to make them look professional without a designer.",
    category: "Design",
    readTime: "5 min read",
    date: "Apr 2026",
    content: `
<p>Your app's screenshots are the first thing people see in the store. Studies show they're the <strong>#1 factor that determines whether someone downloads your app</strong>. Yet most indie developers rush through them.</p>

<p>Here's everything you need to know.</p>

<h2>What Apple requires</h2>

<ul>
<li><strong>Minimum:</strong> 1 screenshot per device size</li>
<li><strong>Recommended:</strong> 3-5 screenshots</li>
<li><strong>Maximum:</strong> 10 per device size</li>
<li><strong>iPhone 6.7":</strong> 1290 × 2796 pixels</li>
<li><strong>iPhone 6.1":</strong> 1179 × 2556 pixels</li>
<li><strong>iPad 12.9":</strong> 2048 × 2732 pixels (if you support iPad)</li>
</ul>

<h2>What Google Play requires</h2>

<ul>
<li><strong>Minimum:</strong> 2 screenshots</li>
<li><strong>Recommended:</strong> 4-8 screenshots</li>
<li><strong>Size:</strong> minimum 1080px on shortest side</li>
</ul>

<h2>What makes great screenshots</h2>

<h3>1. Don't just show raw screens</h3>
<p>Raw screenshots look amateurish. Instead, put them inside <strong>device frames</strong> (iPhone or Android mockups) and add captions explaining what each screen does.</p>

<h3>2. Lead with your best feature</h3>
<p>The first 2-3 screenshots are visible without scrolling. Put your app's most impressive or unique feature first.</p>

<h3>3. Add context with captions</h3>
<p>Each screenshot should have a short caption: "Track your workouts", "See your progress", "Compete with friends". Keep it under 5 words.</p>

<h3>4. Use consistent branding</h3>
<p>Same background colors, same font, same style across all screenshots. This looks professional and trustworthy.</p>

<h2>How to create them without a designer</h2>

<ol>
<li><strong>Take screenshots</strong> on your phone (or simulator)</li>
<li><strong>Frame them</strong> in device mockups using a tool like <a href="https://shippabel.com">Shippabel's screenshot editor</a></li>
<li><strong>Add captions</strong> and background colors</li>
<li><strong>Export</strong> at the correct sizes</li>
</ol>

<p>Shippabel's built-in screenshot editor handles all of this — drag and drop your screenshots, choose a phone frame, add text, pick colors, and export at exact App Store dimensions.</p>

<p><a href="https://shippabel.com/scan">Try it free →</a></p>
`,
  },
  {
    slug: "apple-review-what-they-check",
    title: "What Apple actually checks during app review (and how to pass)",
    excerpt: "Apple rejects about 40% of first-time submissions. Here's what they look for and how to make sure your app passes on the first try.",
    category: "App Store",
    readTime: "7 min read",
    date: "Apr 2026",
    content: `
<p>Apple rejects roughly <strong>40% of app submissions</strong> on the first try. That's not because the apps are bad — it's because developers miss small but important requirements.</p>

<p>Here's what Apple's review team actually checks, and how to pass every time.</p>

<h2>The basics that must be right</h2>

<h3>1. Your app must work</h3>
<p>This sounds obvious, but Apple will reject apps that crash, have broken buttons, or show empty screens. Test every screen before submitting.</p>

<h3>2. You need a privacy policy</h3>
<p>Every app needs a privacy policy — even if you don't collect any data. It must be hosted on a public URL and linked in App Store Connect.</p>

<h3>3. No placeholder content</h3>
<p>"Lorem ipsum" text, missing icons, or "Coming soon" sections will get you rejected. Every part of your app must be complete.</p>

<h3>4. Accurate screenshots</h3>
<p>Your screenshots must show the actual app. Don't use mockups or renders that don't match what the user will see.</p>

<h2>Common rejection reasons</h2>

<h3>Guideline 2.1 — Performance: App Completeness</h3>
<p>Your app has bugs, crashes, or placeholder content. <strong>Fix:</strong> Test thoroughly before submitting.</p>

<h3>Guideline 2.3 — Performance: Accurate Metadata</h3>
<p>Your description, screenshots, or preview don't match the actual app. <strong>Fix:</strong> Make sure everything is up to date.</p>

<h3>Guideline 4.0 — Design</h3>
<p>Your app doesn't feel like a native iOS app, or it's essentially a website in an app wrapper without enough native functionality. <strong>Fix:</strong> Add native features like push notifications or offline support.</p>

<h3>Guideline 5.1.1 — Legal: Privacy - Data Collection</h3>
<p>You're collecting data without proper disclosure. <strong>Fix:</strong> Declare all data collection in App Store Connect's privacy section and have a complete privacy policy.</p>

<h2>How to pass on the first try</h2>

<ol>
<li><strong>Use a scanner</strong> — tools like <a href="https://shippabel.com/scan">Shippabel</a> check your app against store requirements before you submit</li>
<li><strong>Test on a real device</strong> — not just a simulator</li>
<li><strong>Write a real privacy policy</strong> — AI can generate one for you</li>
<li><strong>Take fresh screenshots</strong> — make sure they match the current version</li>
<li><strong>Fill out App Store Connect completely</strong> — don't leave any fields blank</li>
</ol>

<h2>What happens if you get rejected</h2>

<p>Don't panic. You can fix the issue and resubmit. Apple tells you exactly why you were rejected and what to fix. Most resubmissions are approved within 24 hours.</p>

<p><a href="https://shippabel.com/scan">Check your app before submitting →</a></p>
`,
  },
  {
    slug: "app-privacy-policy-guide",
    title: "Privacy policy for your app — why you need one and how to create it free",
    excerpt: "Both Apple and Google require a privacy policy. Here's what it needs to say, where to host it, and how to create one in 60 seconds.",
    category: "Legal",
    readTime: "4 min read",
    date: "Apr 2026",
    content: `
<p>Every app on the App Store and Google Play needs a <strong>privacy policy</strong>. No exceptions. Even if your app doesn't collect any data, you still need one.</p>

<p>Here's everything you need to know.</p>

<h2>Why you need a privacy policy</h2>

<ul>
<li><strong>Apple requires it</strong> — your app will be rejected without one</li>
<li><strong>Google requires it</strong> — your app can be removed if it's missing</li>
<li><strong>Laws require it</strong> — GDPR (Europe), CCPA (California), and others mandate privacy disclosure</li>
<li><strong>Users expect it</strong> — it builds trust</li>
</ul>

<h2>What your privacy policy must include</h2>

<ul>
<li>What data your app collects (even if the answer is "nothing")</li>
<li>How the data is used</li>
<li>Whether data is shared with third parties</li>
<li>How users can request data deletion</li>
<li>Your contact information</li>
<li>If you use analytics, ads, or third-party services — name them</li>
</ul>

<h2>Where to host it</h2>

<p>Your privacy policy needs to be on a public URL that anyone can access. Options:</p>

<ul>
<li><strong>Your own website</strong> — add a /privacy page</li>
<li><strong>GitHub Pages</strong> — free hosting for a simple HTML page</li>
<li><strong>Shippabel</strong> — generates and hosts it for you automatically</li>
</ul>

<h2>How to create one in 60 seconds</h2>

<p>You don't need a lawyer. AI can write a privacy policy that covers all the requirements. <a href="https://shippabel.com">Shippabel</a> analyzes your app's code to detect what data you collect and which third-party services you use, then generates a complete privacy policy and hosts it for you.</p>

<p>It looks at your <code>package.json</code> for services like Firebase, Supabase, Stripe, analytics SDKs, and ad networks. Then it writes a policy that accurately describes your data practices.</p>

<h2>Important: keep it updated</h2>

<p>If you add new features that collect data (like analytics or push notifications), update your privacy policy. Both stores can audit this at any time.</p>

<p><a href="https://shippabel.com/scan">Generate your privacy policy for free →</a></p>
`,
  },
];
