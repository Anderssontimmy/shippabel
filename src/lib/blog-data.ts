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
  {
    slug: "publish-lovable-app",
    title: "How to publish your Lovable app to the App Store and Google Play",
    excerpt: "Lovable makes building apps easy. But it doesn't publish them for you. Here's how to take your Lovable project from preview to published — without touching code.",
    category: "Guide",
    readTime: "6 min read",
    date: "Apr 2026",
    content: `
<p><strong>Lovable</strong> is amazing for building apps fast. You describe what you want, and it builds it. But when you're done, you have a web app — and Apple and Google don't accept web apps directly.</p>

<p>Here's how to get your Lovable app into both stores.</p>

<h2>Why your Lovable app isn't "store ready" yet</h2>

<p>Lovable creates web applications (React apps). The App Store and Google Play require <strong>native mobile apps</strong> — apps that are compiled specifically for phones.</p>

<p>The good news: you don't need to rebuild anything. Your Lovable app just needs to be <strong>wrapped</strong> — packaged inside a mobile shell that makes it work as a native app.</p>

<h2>Step 1: Get your code on GitHub</h2>

<p>Lovable connects to GitHub automatically. If you haven't already, push your project to a GitHub repository. You'll need this link for the next step.</p>

<h2>Step 2: Scan and convert</h2>

<p>Go to <a href="https://shippabel.com/scan">shippabel.com/scan</a> and paste your GitHub link. Shippabel will:</p>

<ul>
<li>Detect that it's a web app built with React</li>
<li>Show you a readiness score</li>
<li>Offer to <strong>convert it to mobile format</strong> automatically</li>
</ul>

<p>Click "Make it App Store ready" and Shippabel converts your Lovable app to an Expo project — adding all the mobile configuration files your app needs.</p>

<h2>Step 3: Create your store listing</h2>

<p>Every app in the store needs:</p>

<ul>
<li><strong>An app name</strong> — what shows under the icon (30 chars max)</li>
<li><strong>A description</strong> — what your app does and why people should download it</li>
<li><strong>Screenshots</strong> — at least 3 showing your app's best features</li>
<li><strong>A privacy policy</strong> — required by both Apple and Google</li>
</ul>

<p>Shippabel's AI writes all of this for you. Just describe your app in a sentence or two, and it generates 3 versions you can pick from.</p>

<h2>Step 4: Build and submit</h2>

<p>Shippabel triggers a production build through GitHub Actions, then submits to both stores. You just click "Start build" and wait.</p>

<ul>
<li><strong>Android:</strong> usually approved in a few hours</li>
<li><strong>iOS:</strong> Apple reviews in 1-3 days</li>
</ul>

<h2>What you need</h2>

<ul>
<li>An <strong>Apple Developer account</strong> ($99/year) for the App Store</li>
<li>A <strong>Google Play Developer account</strong> ($25 one-time) for Google Play</li>
<li>A free <strong>Expo account</strong> for building</li>
</ul>

<p>That's it. No Xcode, no Android Studio, no terminal commands.</p>

<p><a href="https://shippabel.com/scan">Check your Lovable app for free →</a></p>
`,
  },
  {
    slug: "publish-base44-app",
    title: "How to publish your Base44 app to the App Store",
    excerpt: "Built your app on Base44? Here's the complete guide to getting it published on the App Store and Google Play — no developer experience required.",
    category: "Guide",
    readTime: "5 min read",
    date: "Apr 2026",
    content: `
<p><strong>Base44</strong> lets you build real apps just by describing them. But once your app is ready, Base44 doesn't handle publishing to the App Store or Google Play.</p>

<p>That's where this guide comes in.</p>

<h2>The gap between "built" and "published"</h2>

<p>Building an app and publishing it are two completely different things. Publishing requires:</p>

<ul>
<li>Converting your app to a mobile-native format</li>
<li>Creating a unique app identity (bundle ID)</li>
<li>Designing store screenshots</li>
<li>Writing a store description that gets downloads</li>
<li>Setting up a privacy policy</li>
<li>Building a production version</li>
<li>Submitting to Apple and Google for review</li>
</ul>

<p>That's a lot of steps. But each one can be automated.</p>

<h2>The fastest path from Base44 to the stores</h2>

<ol>
<li><strong>Export your code</strong> to GitHub from Base44</li>
<li><strong>Scan it</strong> at <a href="https://shippabel.com/scan">shippabel.com/scan</a> — see exactly what needs fixing</li>
<li><strong>Click "Make it App Store ready"</strong> — converts to mobile format automatically</li>
<li><strong>Generate your store page</strong> — AI writes your name, description, and keywords</li>
<li><strong>Create screenshots</strong> — frame them in iPhone mockups</li>
<li><strong>Build and submit</strong> — one click, both stores</li>
</ol>

<p>Total hands-on time: about 30 minutes. Then you wait for Apple (1-3 days) and Google (a few hours).</p>

<h2>Cost breakdown</h2>

<table>
<tr><td>Apple Developer account</td><td>$99/year</td></tr>
<tr><td>Google Play Developer account</td><td>$25 one-time</td></tr>
<tr><td>Shippabel (scan + publish)</td><td>$99 one-time</td></tr>
<tr><td><strong>Total to go live on both stores</strong></td><td><strong>$223</strong></td></tr>
</table>

<p>Compare that to hiring a developer: $500-$2000+ just for the publishing part.</p>

<p><a href="https://shippabel.com/scan">Check your Base44 app for free →</a></p>
`,
  },
  {
    slug: "publish-chatgpt-built-app",
    title: "You built an app with ChatGPT — here's how to actually publish it",
    excerpt: "ChatGPT can write your app's code. But it can't submit it to the App Store. This guide bridges the gap from 'working prototype' to 'published in the store.'",
    category: "Guide",
    readTime: "7 min read",
    date: "Apr 2026",
    content: `
<p>You did it. You used <strong>ChatGPT</strong> to write your app — prompt by prompt, feature by feature. It works. It looks good. Now you want people to actually use it.</p>

<p>But when you ask ChatGPT "how do I publish this to the App Store?" you get a wall of technical instructions about Xcode, certificates, provisioning profiles, and terminal commands. <em>That's not what you signed up for.</em></p>

<h2>Why ChatGPT can't help you publish</h2>

<p>ChatGPT is great at writing code. But publishing an app requires:</p>

<ul>
<li>Compiling your code into a binary file</li>
<li>Signing it with Apple or Google credentials</li>
<li>Uploading it to the stores' servers</li>
<li>Filling out store metadata</li>
<li>Creating correctly-sized screenshots</li>
<li>Passing automated and human reviews</li>
</ul>

<p>These are <em>actions</em>, not code. ChatGPT can explain them but can't do them for you.</p>

<h2>The solution: let a tool do it</h2>

<p><a href="https://shippabel.com">Shippabel</a> picks up exactly where ChatGPT leaves off. You have working code — Shippabel turns it into a published app.</p>

<h3>What ChatGPT does</h3>
<p>Writes your app code, helps you debug, creates components and features.</p>

<h3>What Shippabel does</h3>
<p>Scans your code for store requirements, fixes issues, converts to mobile format, writes your store page, creates screenshots, builds, and submits to both stores.</p>

<h2>How to go from ChatGPT code to App Store</h2>

<ol>
<li><strong>Put your code on GitHub</strong> — create a repo and push your files</li>
<li><strong>Scan at shippabel.com</strong> — paste your GitHub link, get a readiness report</li>
<li><strong>Fix and convert</strong> — auto-fix issues, convert to mobile if needed</li>
<li><strong>Write store listing</strong> — AI generates your app name, description, keywords</li>
<li><strong>Build and publish</strong> — automated build and submission</li>
</ol>

<h2>Common ChatGPT app issues we find</h2>

<ul>
<li><strong>API keys in the code</strong> — ChatGPT often hardcodes keys that should be hidden</li>
<li><strong>No error handling</strong> — the app crashes when things go wrong</li>
<li><strong>Missing mobile config</strong> — no app.json, no bundle ID, no icons</li>
<li><strong>Web-only code</strong> — needs conversion to work as a mobile app</li>
</ul>

<p>All of these are fixable — most automatically.</p>

<p><a href="https://shippabel.com/scan">Scan your ChatGPT app for free →</a></p>
`,
  },
  {
    slug: "publish-claude-code-app",
    title: "How to publish an app built with Claude Code to the App Store",
    excerpt: "Claude Code can build entire apps from a conversation. Here's how to take that code and get it published on both app stores — the non-technical way.",
    category: "Guide",
    readTime: "6 min read",
    date: "Apr 2026",
    content: `
<p><strong>Claude Code</strong> from Anthropic is one of the most powerful AI coding tools available. It can build complete applications from a conversation — frontend, backend, database, the whole thing.</p>

<p>But when it's time to publish, you're on your own. Here's how to bridge that gap.</p>

<h2>What Claude Code gives you</h2>

<p>Claude Code typically creates:</p>

<ul>
<li>A React or React Native application</li>
<li>Backend logic with Supabase, Firebase, or similar</li>
<li>A complete project structure pushed to GitHub</li>
</ul>

<p>What it <em>doesn't</em> set up: app store configuration, icons, screenshots, store descriptions, privacy policies, build pipelines, or submission credentials.</p>

<h2>From Claude Code to App Store</h2>

<h3>1. Check what's missing</h3>
<p>Paste your GitHub link at <a href="https://shippabel.com/scan">shippabel.com/scan</a>. You'll get a detailed report of everything the stores require that your app doesn't have yet.</p>

<p>Typical Claude Code projects score 60-85/100 on first scan — good foundation, but missing store-specific requirements.</p>

<h3>2. Auto-fix and convert</h3>
<p>If your app is a web app (React, Next.js, Vue), Shippabel converts it to a mobile-compatible format automatically. If it's already React Native or Expo, even better — just fix the config issues.</p>

<h3>3. Generate store assets</h3>
<p>AI writes your store listing (Shippabel uses Claude for this — fitting, right?). It reads your code, your README, and your package.json to understand what your app does, then writes optimized store copy.</p>

<h3>4. Build and ship</h3>
<p>One-click build through GitHub Actions. Builds for both iOS and Android. Submits to both stores.</p>

<h2>Why this matters</h2>

<p>Claude Code is democratizing app creation. But the "last mile" — getting from working code to published app — has been a blocker. Not because it's technically hard, but because it involves 40+ steps across 5 different platforms (GitHub, Expo, Apple, Google, and your code).</p>

<p>Shippabel automates every single one of those steps.</p>

<p><a href="https://shippabel.com/scan">Check your Claude Code app for free →</a></p>
`,
  },
  {
    slug: "vibe-coding-publish-app",
    title: "The vibe coder's guide to publishing your first app",
    excerpt: "You built an app using AI. You're not a developer. You don't know what Xcode is. This guide is for you — plain language, no jargon, start to finish.",
    category: "Beginner",
    readTime: "10 min read",
    date: "Apr 2026",
    content: `
<p>You had an idea for an app. You used an AI tool — maybe <strong>Cursor, Bolt, Lovable, Claude Code, ChatGPT, or Base44</strong> — and you actually built it. It works. It's real. That's amazing.</p>

<p>Now you want to put it on the App Store so other people can download it. But you have no idea where to start. You're not a developer. You don't know what Xcode is. The word "terminal" makes you nervous.</p>

<p><strong>This guide is for you.</strong></p>

<h2>What "publishing an app" actually means</h2>

<p>Right now, your app lives on your computer (or in the cloud). Publishing means:</p>

<ol>
<li><strong>Preparing your app</strong> — making sure it meets all the rules Apple and Google have</li>
<li><strong>Creating a store page</strong> — the page people see when they find your app</li>
<li><strong>Building a special version</strong> — converting your code into a file Apple/Google can accept</li>
<li><strong>Submitting for review</strong> — Apple and Google check your app before allowing it</li>
<li><strong>Going live</strong> — your app appears in the store and people can download it</li>
</ol>

<h2>What you need (and what it costs)</h2>

<h3>Apple App Store</h3>
<ul>
<li><strong>Apple Developer account:</strong> $99/year — sign up at developer.apple.com</li>
<li>Takes 24-48 hours to get approved</li>
<li>You need an iPhone or Mac for the account (not for building)</li>
</ul>

<h3>Google Play Store</h3>
<ul>
<li><strong>Google Play Developer account:</strong> $25 one-time — sign up at play.google.com/console</li>
<li>Usually approved within hours</li>
<li>You just need a Google account</li>
</ul>

<h3>Shippabel</h3>
<ul>
<li><strong>Scanning:</strong> Free — check as many apps as you want</li>
<li><strong>Publishing:</strong> $99 one-time — includes everything: auto-fix, store page, screenshots, build, submit</li>
</ul>

<h2>The step-by-step process</h2>

<h3>Step 1: Put your code on GitHub (5 minutes)</h3>
<p>GitHub is like Google Drive for code. Most AI tools already put your code there. If not, you'll need to create a free account at github.com and upload your project.</p>

<h3>Step 2: Check your app (30 seconds)</h3>
<p>Go to <a href="https://shippabel.com/scan">shippabel.com/scan</a> and paste your GitHub link. You'll get a score from 0-100 showing how ready your app is, plus a list of everything that needs fixing.</p>

<h3>Step 3: Fix problems (1 click)</h3>
<p>Most problems can be fixed automatically. Click "Auto-fix" and Shippabel updates your code directly. No terminal, no config files, no copy-pasting.</p>

<h3>Step 4: Write your store page (2 minutes)</h3>
<p>Your "store page" is what people see when they find your app. It includes your app's name, description, and keywords. Shippabel's AI writes 3 versions for you — pick the one you like.</p>

<h3>Step 5: Create screenshots (5 minutes)</h3>
<p>Take screenshots of your app on your phone. Upload them to Shippabel, and we frame them in professional iPhone/Android mockups with captions.</p>

<h3>Step 6: Publish (1 click + wait)</h3>
<p>Click "Start build." Shippabel builds your app and submits it to both stores. Android goes live in hours. Apple takes 1-3 days to review.</p>

<h2>That's it</h2>

<p>Total time: about <strong>30 minutes of your time</strong>, plus 1-3 days waiting for Apple.</p>

<p>Total cost: <strong>$223</strong> (Apple $99/year + Google $25 + Shippabel $99).</p>

<p>No coding. No terminal. No Xcode. No developer jargon.</p>

<p><strong>You built an app with AI. Now publish it with AI.</strong></p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
];
