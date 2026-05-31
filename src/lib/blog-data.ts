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
    slug: "publish-cursor-app-to-google-play",
    title: "How to publish your Cursor app to Google Play (2026 guide)",
    excerpt: "You built an app with Cursor. Now what? This step-by-step guide shows you exactly how to get it on Google Play — no coding experience and no computer required.",
    category: "Guide",
    readTime: "8 min read",
    date: "May 2026",
    content: `
<p>So you used <strong>Cursor</strong> to build your first app. It works on your phone, it looks great, and you're ready to share it with the world. But then you hit the wall — <em>how do you actually get it on Google Play?</em></p>

<p>Publishing an app isn't hard, but there are about 40 things you need to get right. Missing even one can get your app rejected. This guide walks you through every step.</p>

<h2>What you need before you start</h2>

<p>Before we dive in, here's what you'll need:</p>

<ul>
<li><strong>A Google Play Developer account</strong> — costs $25 one-time. Sign up at <a href="https://play.google.com/console">play.google.com/console</a>. Usually approved within hours.</li>
<li><strong>Your app on GitHub</strong> — if your code isn't on GitHub yet, you'll need to push it there.</li>
</ul>

<p>That's it. You don't need a Mac, and you don't need Android Studio or any other developer tools.</p>

<h2>Step 1: Check if your app is ready</h2>

<p>Google Play has specific requirements — app icons, a privacy policy, proper configuration, and more. Most apps built with AI tools are missing several of these.</p>

<p>The fastest way to find out what's missing: use a free scanner like <a href="https://shippabel.com/scan">Shippabel's app checker</a>. Paste your GitHub link and get a report in 30 seconds.</p>

<p>Common issues found in Cursor-built apps:</p>
<ul>
<li>Missing app icon (Google Play needs a 512×512 PNG icon)</li>
<li>No privacy policy (required for every app on Google Play)</li>
<li>Default package name (needs to be unique, like <code>com.yourname.yourapp</code>)</li>
<li>No splash/loading screen</li>
<li>Hardcoded API keys in the code</li>
</ul>

<h2>Step 2: Fix the issues</h2>

<p>Most issues are simple configuration changes. Here's what you need:</p>

<ul>
<li><strong>App name</strong> — max 30 characters, this is what shows under your icon</li>
<li><strong>Package name</strong> — a unique ID like <code>com.yourname.yourapp</code></li>
<li><strong>Version code &amp; version name</strong> — start with version code <code>1</code> and version name <code>1.0</code></li>
<li><strong>App icon</strong> — a 512×512 PNG file</li>
<li><strong>Splash screen</strong> — the loading screen people see when opening your app</li>
</ul>

<p>Tools like Shippabel can auto-fix most of these with one click — they commit the changes directly to your GitHub repo.</p>

<h2>Step 3: Write your store listing</h2>

<p>Your store listing is what convinces people to download your app. On Google Play you need:</p>

<ul>
<li><strong>App name</strong> (30 chars max)</li>
<li><strong>Short description</strong> (80 chars max)</li>
<li><strong>Full description</strong> — up to 4000 characters</li>
<li><strong>Screenshots</strong> — at least 2, framed in device mockups</li>
<li><strong>Privacy policy</strong> — a hosted web page explaining data collection</li>
</ul>

<p>Writing all this from scratch takes hours. AI tools can generate it in seconds — Shippabel uses Claude AI to write 3 variants of your store listing that you can pick from.</p>

<h2>Step 4: Create screenshots</h2>

<p>Google Play requires screenshots showing what your app looks like. The rules are simple:</p>

<ul>
<li>At least 2 phone screenshots (up to 8)</li>
<li>Each side between 320px and 3840px</li>
<li>16:9 or 9:16 aspect ratio</li>
</ul>

<p>The trick: take raw screenshots on your phone, then frame them in device mockups with captions. This looks much more professional than raw screenshots.</p>

<h2>Step 5: Build and submit</h2>

<p>You can't submit the development version of your app — you need a <strong>production build</strong>. For Google Play, that's a signed <strong>Android App Bundle (AAB)</strong>.</p>

<p>You don't need Android Studio or a computer to build it. Shippabel builds your app in the cloud and produces the signed AAB that Google Play needs.</p>

<p>After building, the AAB is uploaded to your app in Google Play Console. Then you wait for review — Google usually reviews new apps in a few hours to a few days.</p>

<h2>The easy way</h2>

<p>If all of this sounds like a lot, it is. That's exactly why tools like <a href="https://shippabel.com">Shippabel</a> exist — they handle every step automatically. Scan, fix, write your store page, create screenshots, build, and submit. From "it works on my phone" to "it's on Google Play."</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "publish-bolt-app-to-google-play",
    title: "From Bolt.new to Google Play in 24 hours",
    excerpt: "Built something cool with Bolt.new? Here's exactly how to take it from a web prototype to a published Google Play app — step by step, no developer needed.",
    category: "Guide",
    readTime: "6 min read",
    date: "May 2026",
    content: `
<p>You just built an amazing app with <strong>Bolt.new</strong>. It works in the browser, it looks great, and you want the world to try it. But Bolt creates web apps — how do you get it on Google Play?</p>

<p>Good news: <strong>it's possible, and it's easier than you think.</strong></p>

<h2>The challenge with web apps</h2>

<p>Google Play doesn't accept web apps directly. It needs a "native" Android app. But you don't need to rewrite your app. You just need to <strong>wrap it</strong>.</p>

<p>Wrapping means taking your existing web app and putting it inside a thin native shell. Think of it like putting your web app inside a phone-shaped frame. The user sees a regular app, but inside it's running your web code.</p>

<h2>Step 1: Push your code to GitHub</h2>

<p>If your Bolt app isn't on GitHub yet, you'll need to put it there. In Bolt, click the GitHub icon and connect your repository. This gives tools like Shippabel access to your code.</p>

<h2>Step 2: Wrap it as a mobile app</h2>

<p>Your Bolt web app needs to be wrapped as a native Android app. This involves:</p>

<ul>
<li>Adding the mobile configuration your app needs</li>
<li>Adding the native shell that loads your web app</li>
<li>Setting a unique package name</li>
</ul>

<p><a href="https://shippabel.com/scan">Shippabel can do this automatically</a> — scan your app, and if it detects a web project, it offers a "Make it Google Play ready" button that wraps everything for you.</p>

<h2>Step 3: Add the store requirements</h2>

<p>Now you need everything Google Play requires:</p>

<ul>
<li><strong>App icon</strong> — 512×512 PNG</li>
<li><strong>Short and full description</strong> — what your app does</li>
<li><strong>Screenshots</strong> — at least 2, in device frames</li>
<li><strong>Privacy policy</strong> — a hosted web page</li>
</ul>

<p>All of these can be generated with AI in minutes.</p>

<h2>Step 4: Build and publish</h2>

<p>Shippabel builds your app in the cloud as a signed Android App Bundle (AAB), then submits it to Google Play. Google usually reviews new apps in a few hours to a few days.</p>

<h2>Timeline: 24 hours</h2>

<table>
<tr><td><strong>Hour 0-1</strong></td><td>Scan, wrap, fix issues</td></tr>
<tr><td><strong>Hour 1-2</strong></td><td>Generate store listing and screenshots</td></tr>
<tr><td><strong>Hour 2-3</strong></td><td>Build and submit</td></tr>
<tr><td><strong>Hour 3-24</strong></td><td>Wait for Google review</td></tr>
</table>

<p><strong>Total hands-on time: about 1 hour.</strong> The rest is waiting.</p>

<p><a href="https://shippabel.com/scan">Get started for free →</a></p>
`,
  },
  {
    slug: "google-play-screenshots-guide",
    title: "The complete guide to Google Play screenshots (2026)",
    excerpt: "Screenshots are the #1 factor in app downloads. Here's exactly what sizes Google Play needs, how many, and how to make them look professional without a designer.",
    category: "Design",
    readTime: "5 min read",
    date: "May 2026",
    content: `
<p>Your app's screenshots are the first thing people see on Google Play. Studies show they're the <strong>#1 factor that determines whether someone downloads your app</strong>. Yet most indie developers rush through them.</p>

<p>Here's everything you need to know.</p>

<h2>What Google Play requires</h2>

<ul>
<li><strong>Minimum:</strong> 2 phone screenshots</li>
<li><strong>Recommended:</strong> 4-8 screenshots</li>
<li><strong>Maximum:</strong> 8 per type</li>
<li><strong>Size:</strong> each side between 320px and 3840px</li>
<li><strong>Aspect ratio:</strong> 16:9 (landscape) or 9:16 (portrait)</li>
</ul>

<p>You'll also want a <strong>feature graphic</strong> (1024×500 PNG) — the banner that appears at the top of your store listing.</p>

<h2>What makes great screenshots</h2>

<h3>1. Don't just show raw screens</h3>
<p>Raw screenshots look amateurish. Instead, put them inside <strong>device frames</strong> (Android phone mockups) and add captions explaining what each screen does.</p>

<h3>2. Lead with your best feature</h3>
<p>The first 2-3 screenshots are visible without scrolling. Put your app's most impressive or unique feature first.</p>

<h3>3. Add context with captions</h3>
<p>Each screenshot should have a short caption: "Track your workouts", "See your progress", "Compete with friends". Keep it under 5 words.</p>

<h3>4. Use consistent branding</h3>
<p>Same background colors, same font, same style across all screenshots. This looks professional and trustworthy.</p>

<h2>How to create them without a designer</h2>

<ol>
<li><strong>Take screenshots</strong> on your phone (or emulator)</li>
<li><strong>Frame them</strong> in device mockups using a tool like <a href="https://shippabel.com">Shippabel's screenshot editor</a></li>
<li><strong>Add captions</strong> and background colors</li>
<li><strong>Export</strong> at the correct sizes</li>
</ol>

<p>Shippabel's built-in screenshot editor handles all of this — drag and drop your screenshots, choose a phone frame, add text, pick colors, and export at Google Play dimensions.</p>

<p><a href="https://shippabel.com/scan">Try it free →</a></p>
`,
  },
  {
    slug: "google-play-review-what-they-check",
    title: "What Google checks during Play review (and how to pass)",
    excerpt: "Google Play rejects apps that miss policy requirements. Here's what the review looks for and how to make sure your app passes on the first try.",
    category: "Google Play",
    readTime: "7 min read",
    date: "May 2026",
    content: `
<p>Google Play rejects plenty of first-time submissions — not because the apps are bad, but because developers miss small but important requirements.</p>

<p>Here's what Google's review actually checks, and how to pass on the first try.</p>

<h2>The basics that must be right</h2>

<h3>1. Your app must work</h3>
<p>This sounds obvious, but Google will reject apps that crash, have broken buttons, or show empty screens. Test every screen before submitting.</p>

<h3>2. You need a privacy policy</h3>
<p>Every app needs a privacy policy — even if you don't collect any data. It must be hosted on a public URL and linked in Google Play Console.</p>

<h3>3. Complete the required forms</h3>
<p>Google requires a <strong>Data safety</strong> form, a <strong>content rating</strong> questionnaire, and a <strong>target audience</strong> declaration before you can publish. Leaving these blank blocks your release.</p>

<h3>4. Accurate screenshots and listing</h3>
<p>Your screenshots and description must match the actual app. Don't use mockups or claims that don't reflect what the user gets.</p>

<h2>Common reasons Google blocks a release</h2>

<h3>Policy: Misleading claims or metadata</h3>
<p>Your description or screenshots promise things the app doesn't do. <strong>Fix:</strong> Keep your listing honest and up to date.</p>

<h3>Policy: Data safety mismatch</h3>
<p>Your data safety form doesn't match what the app actually collects. <strong>Fix:</strong> Declare every type of data your app collects, and have a complete privacy policy.</p>

<h3>Policy: Broken or incomplete app</h3>
<p>Crashes, placeholder content, or "coming soon" sections. <strong>Fix:</strong> Test thoroughly and make sure every part is complete.</p>

<h3>Policy: Permissions you don't use</h3>
<p>Requesting permissions (camera, location) the app never uses raises flags. <strong>Fix:</strong> Only request what you actually need.</p>

<h2>How to pass on the first try</h2>

<ol>
<li><strong>Use a scanner</strong> — tools like <a href="https://shippabel.com/scan">Shippabel</a> check your app against Google Play requirements before you submit</li>
<li><strong>Test on a real device</strong> — not just an emulator</li>
<li><strong>Write a real privacy policy</strong> — AI can generate one for you</li>
<li><strong>Fill in the data safety, content rating, and target audience forms completely</strong></li>
<li><strong>Take fresh screenshots</strong> — make sure they match the current version</li>
</ol>

<h2>What happens if you get rejected</h2>

<p>Don't panic. Google tells you what to fix. You correct the issue and resubmit — most resubmissions clear quickly.</p>

<p><a href="https://shippabel.com/scan">Check your app before submitting →</a></p>
`,
  },
  {
    slug: "app-privacy-policy-guide",
    title: "Privacy policy for your app — why you need one and how to create it free",
    excerpt: "Google Play requires a privacy policy for every app. Here's what it needs to say, where to host it, and how to create one in 60 seconds.",
    category: "Legal",
    readTime: "4 min read",
    date: "May 2026",
    content: `
<p>Every app on Google Play needs a <strong>privacy policy</strong>. No exceptions. Even if your app doesn't collect any data, you still need one.</p>

<p>Here's everything you need to know.</p>

<h2>Why you need a privacy policy</h2>

<ul>
<li><strong>Google requires it</strong> — your app can't be published, and can be removed, without one</li>
<li><strong>Laws require it</strong> — GDPR (Europe), CCPA (California), and others mandate privacy disclosure</li>
<li><strong>The data safety form depends on it</strong> — Google's Data safety section asks you to declare what you collect</li>
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

<p>It looks at your <code>package.json</code> for services like Firebase, Supabase, Stripe, analytics SDKs, and ad networks. Then it writes a policy that accurately describes your data practices — and helps you fill in Google's Data safety form to match.</p>

<h2>Important: keep it updated</h2>

<p>If you add new features that collect data (like analytics or push notifications), update your privacy policy and your Data safety form. Google can audit this at any time.</p>

<p><a href="https://shippabel.com/scan">Generate your privacy policy for free →</a></p>
`,
  },
  {
    slug: "publish-lovable-app",
    title: "How to publish your Lovable app to Google Play",
    excerpt: "Lovable makes building apps easy. But it doesn't publish them for you. Here's how to take your Lovable project from preview to published on Google Play — without touching code.",
    category: "Guide",
    readTime: "6 min read",
    date: "May 2026",
    content: `
<p><strong>Lovable</strong> is amazing for building apps fast. You describe what you want, and it builds it. But when you're done, you have a web app — and Google Play doesn't accept web apps directly.</p>

<p>Here's how to get your Lovable app onto Google Play.</p>

<h2>Why your Lovable app isn't "store ready" yet</h2>

<p>Lovable creates web applications (React apps). Google Play requires a <strong>native Android app</strong> — one that's packaged specifically for phones.</p>

<p>The good news: you don't need to rebuild anything. Your Lovable app just needs to be <strong>wrapped</strong> — packaged inside a mobile shell that makes it work as a native app.</p>

<h2>Step 1: Get your code on GitHub</h2>

<p>Lovable connects to GitHub automatically. If you haven't already, push your project to a GitHub repository. You'll need this link for the next step.</p>

<h2>Step 2: Scan and wrap it</h2>

<p>Go to <a href="https://shippabel.com/scan">shippabel.com/scan</a> and paste your GitHub link. Shippabel will:</p>

<ul>
<li>Detect that it's a web app built with React</li>
<li>Show you a readiness score</li>
<li>Offer to <strong>wrap it as a mobile app</strong> automatically</li>
</ul>

<p>Click "Make it Google Play ready" and Shippabel wraps your Lovable app as a native Android app — adding all the mobile configuration your app needs.</p>

<h2>Step 3: Create your store listing</h2>

<p>Every app on Google Play needs:</p>

<ul>
<li><strong>An app name</strong> — what shows under the icon (30 chars max)</li>
<li><strong>A short and full description</strong> — what your app does and why people should download it</li>
<li><strong>Screenshots</strong> — at least 2 showing your app's best features</li>
<li><strong>A privacy policy</strong> — required for every Google Play app</li>
</ul>

<p>Shippabel's AI writes all of this for you. Just describe your app in a sentence or two, and it generates 3 versions you can pick from.</p>

<h2>Step 4: Build and submit</h2>

<p>Shippabel triggers a production build in the cloud (a signed Android App Bundle), then submits it to Google Play. You just click "Start build" and wait. Google usually reviews new apps in a few hours to a few days.</p>

<h2>What you need</h2>

<ul>
<li>A <strong>Google Play Developer account</strong> ($25 one-time)</li>
<li>Your app on <strong>GitHub</strong></li>
</ul>

<p>That's it. No Android Studio, no Mac, no terminal commands.</p>

<p><a href="https://shippabel.com/scan">Check your Lovable app for free →</a></p>
`,
  },
  {
    slug: "publish-base44-app",
    title: "How to publish your Base44 app to Google Play",
    excerpt: "Built your app on Base44? Here's the complete guide to getting it published on Google Play — no developer experience required.",
    category: "Guide",
    readTime: "5 min read",
    date: "May 2026",
    content: `
<p><strong>Base44</strong> lets you build real apps just by describing them. But once your app is ready, Base44 doesn't handle publishing to Google Play.</p>

<p>That's where this guide comes in.</p>

<h2>The gap between "built" and "published"</h2>

<p>Building an app and publishing it are two completely different things. Publishing to Google Play requires:</p>

<ul>
<li>Wrapping your app as a native Android app</li>
<li>Creating a unique app identity (package name)</li>
<li>Designing store screenshots</li>
<li>Writing a store description that gets downloads</li>
<li>Setting up a privacy policy</li>
<li>Building a signed production version (AAB)</li>
<li>Submitting to Google for review</li>
</ul>

<p>That's a lot of steps. But each one can be automated.</p>

<h2>The fastest path from Base44 to Google Play</h2>

<ol>
<li><strong>Export your code</strong> to GitHub from Base44</li>
<li><strong>Scan it</strong> at <a href="https://shippabel.com/scan">shippabel.com/scan</a> — see exactly what needs fixing</li>
<li><strong>Click "Make it Google Play ready"</strong> — wraps it as a mobile app automatically</li>
<li><strong>Generate your store page</strong> — AI writes your name, short description, and full description</li>
<li><strong>Create screenshots</strong> — frame them in Android phone mockups</li>
<li><strong>Build and submit</strong> — one click to Google Play</li>
</ol>

<p>Total hands-on time: about 30 minutes. Then you wait for Google's review — usually a few hours to a few days.</p>

<h2>Cost breakdown</h2>

<table>
<tr><td>Google Play Developer account</td><td>$25 one-time</td></tr>
<tr><td>Shippabel (scan + publish)</td><td>$99 one-time</td></tr>
<tr><td><strong>Total to go live on Google Play</strong></td><td><strong>$124</strong></td></tr>
</table>

<p>Compare that to hiring a developer: $500-$2000+ just for the publishing part.</p>

<p><a href="https://shippabel.com/scan">Check your Base44 app for free →</a></p>
`,
  },
  {
    slug: "publish-chatgpt-built-app",
    title: "You built an app with ChatGPT — here's how to publish it to Google Play",
    excerpt: "ChatGPT can write your app's code. But it can't submit it to Google Play. This guide bridges the gap from 'working prototype' to 'published on Google Play.'",
    category: "Guide",
    readTime: "7 min read",
    date: "May 2026",
    content: `
<p>You did it. You used <strong>ChatGPT</strong> to write your app — prompt by prompt, feature by feature. It works. It looks good. Now you want people to actually use it.</p>

<p>But when you ask ChatGPT "how do I publish this to Google Play?" you get a wall of technical instructions about Android Studio, signing keys, Gradle, and terminal commands. <em>That's not what you signed up for.</em></p>

<h2>Why ChatGPT can't help you publish</h2>

<p>ChatGPT is great at writing code. But publishing an app requires:</p>

<ul>
<li>Building your code into a signed app bundle (AAB)</li>
<li>Signing it with the right credentials</li>
<li>Uploading it to Google Play Console</li>
<li>Filling out store metadata and the data safety form</li>
<li>Creating correctly-sized screenshots</li>
<li>Passing Google's review</li>
</ul>

<p>These are <em>actions</em>, not code. ChatGPT can explain them but can't do them for you.</p>

<h2>The solution: let a tool do it</h2>

<p><a href="https://shippabel.com">Shippabel</a> picks up exactly where ChatGPT leaves off. You have working code — Shippabel turns it into a published Google Play app.</p>

<h3>What ChatGPT does</h3>
<p>Writes your app code, helps you debug, creates components and features.</p>

<h3>What Shippabel does</h3>
<p>Scans your code for Google Play requirements, fixes issues, wraps it as a mobile app, writes your store page, creates screenshots, builds the AAB in the cloud, and submits to Google Play.</p>

<h2>How to go from ChatGPT code to Google Play</h2>

<ol>
<li><strong>Put your code on GitHub</strong> — create a repo and push your files</li>
<li><strong>Scan at shippabel.com</strong> — paste your GitHub link, get a readiness report</li>
<li><strong>Fix and wrap</strong> — auto-fix issues, wrap as a mobile app if needed</li>
<li><strong>Write store listing</strong> — AI generates your app name, short and full description</li>
<li><strong>Build and publish</strong> — automated cloud build and submission to Google Play</li>
</ol>

<h2>Common ChatGPT app issues we find</h2>

<ul>
<li><strong>API keys in the code</strong> — ChatGPT often hardcodes keys that should be hidden</li>
<li><strong>No error handling</strong> — the app crashes when things go wrong</li>
<li><strong>Missing mobile config</strong> — no package name, no icons, no version code</li>
<li><strong>Web-only code</strong> — needs wrapping to work as a mobile app</li>
</ul>

<p>All of these are fixable — most automatically.</p>

<p><a href="https://shippabel.com/scan">Scan your ChatGPT app for free →</a></p>
`,
  },
  {
    slug: "publish-claude-code-app",
    title: "How to publish an app built with Claude Code to Google Play",
    excerpt: "Claude Code can build entire apps from a conversation. Here's how to take that code and get it published on Google Play — the non-technical way.",
    category: "Guide",
    readTime: "6 min read",
    date: "May 2026",
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

<p>What it <em>doesn't</em> set up: Google Play configuration, icons, screenshots, store descriptions, privacy policies, build pipelines, or submission credentials.</p>

<h2>From Claude Code to Google Play</h2>

<h3>1. Check what's missing</h3>
<p>Paste your GitHub link at <a href="https://shippabel.com/scan">shippabel.com/scan</a>. You'll get a detailed report of everything Google Play requires that your app doesn't have yet.</p>

<p>Typical Claude Code projects score 60-85/100 on first scan — good foundation, but missing store-specific requirements.</p>

<h3>2. Auto-fix and wrap</h3>
<p>If your app is a web app (React, Next.js, Vue), Shippabel wraps it as a native Android app automatically. If it's already React Native or Expo, even better — just fix the config issues.</p>

<h3>3. Generate store assets</h3>
<p>AI writes your store listing (Shippabel uses Claude for this — fitting, right?). It reads your code, your README, and your package.json to understand what your app does, then writes optimized store copy.</p>

<h3>4. Build and ship</h3>
<p>One-click cloud build that produces a signed Android App Bundle, then submits it to Google Play.</p>

<h2>Why this matters</h2>

<p>Claude Code is democratizing app creation. But the "last mile" — getting from working code to a published app — has been a blocker. Not because it's technically hard, but because it involves dozens of steps across GitHub, build tooling, Google Play Console, and your code.</p>

<p>Shippabel automates every single one of those steps.</p>

<p><a href="https://shippabel.com/scan">Check your Claude Code app for free →</a></p>
`,
  },
  {
    slug: "vibe-coding-publish-app",
    title: "The vibe coder's guide to publishing your first app on Google Play",
    excerpt: "You built an app using AI. You're not a developer. You don't know what Android Studio is. This guide is for you — plain language, no jargon, start to finish.",
    category: "Beginner",
    readTime: "9 min read",
    date: "May 2026",
    content: `
<p>You had an idea for an app. You used an AI tool — maybe <strong>Cursor, Bolt, Lovable, Claude Code, ChatGPT, or Base44</strong> — and you actually built it. It works. It's real. That's amazing.</p>

<p>Now you want to put it on Google Play so other people can download it. But you have no idea where to start. You're not a developer. You don't know what Android Studio is. The word "terminal" makes you nervous.</p>

<p><strong>This guide is for you.</strong></p>

<h2>What "publishing an app" actually means</h2>

<p>Right now, your app lives on your computer (or in the cloud). Publishing means:</p>

<ol>
<li><strong>Preparing your app</strong> — making sure it meets all the rules Google Play has</li>
<li><strong>Creating a store page</strong> — the page people see when they find your app</li>
<li><strong>Building a special version</strong> — turning your code into a file Google Play can accept (a signed AAB)</li>
<li><strong>Submitting for review</strong> — Google checks your app before allowing it</li>
<li><strong>Going live</strong> — your app appears on Google Play and people can download it</li>
</ol>

<h2>What you need (and what it costs)</h2>

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

<p><strong>Total to go live: about $124.</strong> No yearly fees.</p>

<h2>The step-by-step process</h2>

<h3>Step 1: Put your code on GitHub (5 minutes)</h3>
<p>GitHub is like Google Drive for code. Most AI tools already put your code there. If not, you'll need to create a free account at github.com and upload your project.</p>

<h3>Step 2: Check your app (30 seconds)</h3>
<p>Go to <a href="https://shippabel.com/scan">shippabel.com/scan</a> and paste your GitHub link. You'll get a score from 0-100 showing how ready your app is, plus a list of everything that needs fixing.</p>

<h3>Step 3: Fix problems (1 click)</h3>
<p>Most problems can be fixed automatically. Click "Auto-fix" and Shippabel updates your code directly. No terminal, no config files, no copy-pasting.</p>

<h3>Step 4: Write your store page (2 minutes)</h3>
<p>Your "store page" is what people see when they find your app. It includes your app's name, short description, and full description. Shippabel's AI writes 3 versions for you — pick the one you like.</p>

<h3>Step 5: Create screenshots (5 minutes)</h3>
<p>Take screenshots of your app on your phone. Upload them to Shippabel, and we frame them in professional Android phone mockups with captions.</p>

<h3>Step 6: Publish (1 click + wait)</h3>
<p>Click "Start build." Shippabel builds your app in the cloud and submits it to Google Play. Google usually reviews new apps in a few hours to a few days.</p>

<h2>That's it</h2>

<p>Total time: about <strong>30 minutes of your time</strong>, plus a few hours to a few days for Google's review.</p>

<p>Total cost: <strong>$124</strong> (Google Play $25 one-time + Shippabel $99).</p>

<p>No coding. No terminal. No Android Studio. No developer jargon.</p>

<p><strong>You built an app with AI. Now publish it with AI.</strong></p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
];
