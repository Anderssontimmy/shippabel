export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  // ISO dates (2026-04-02): search engines read them from the page's structured data
  date: string;
  updated: string;
  // slugs of up to three guides to show at the end, most useful first
  related: string[];
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-long-does-google-play-review-take",
    title: "How long does Google Play app review take? (2026)",
    excerpt: "Plan for up to seven days, and longer in exceptional cases. What Google says, how to see your status, and what to do if your app is rejected.",
    category: "Google Play",
    readTime: "5 min read",
    date: "2026-11-07",
    updated: "2026-11-07",
    related: ["google-play-review-what-they-check", "google-play-12-testers-rule", "google-play-data-safety-form"],
    content: `
<p><strong>The short answer:</strong> plan for up to seven days. Google says that apps and developer accounts that get an extended review can take up to seven days, and longer in exceptional cases. You do not get a fixed time in advance, so do not promise anyone a launch date for the day after you submit.</p>

<h2>What does Google actually say?</h2>

<p>Google's help page says that certain apps may be subject to extended reviews, and that for certain developer accounts Google takes more time to review an app thoroughly. Both can mean review times of up to seven days, or longer in exceptional cases. The page does not list every reason a review takes longer, so you cannot know in advance which group your app falls into.</p>

<h2>Is review the only wait?</h2>

<p>No. For a first app on a new personal developer account there are three waits, one after the other:</p>

<ol>
<li>The closed test: at least 12 testers for 14 days. <a href="https://shippabel.com/blog/google-play-12-testers-rule">The 12-tester rule</a> explains how it works.</li>
<li>Google's answer to your request for production access.</li>
<li>The review of your app before it goes public.</li>
</ol>

<p>Plan on about three weeks in total. Most of that is the closed test, which you control, so starting it early is the best way to save time.</p>

<h2>How do I see where my app is?</h2>

<p>In Play Console, your app's latest publishing status shows under its name and package name when you select the app. The Publishing overview page lists changes that have not been sent for review yet. Google notes that your changes are not sent for review automatically, so check that page if nothing seems to be happening. Statuses you may see include In review, Update rejected and App rejected.</p>

<h2>Can I choose when it goes live?</h2>

<p>Yes. With managed publishing, once Google has approved your changes you control exactly when they go live. Google explains how to turn it on in the Play Console Help.</p>

<h2>What if my app is rejected?</h2>

<p>For an update, Google says you can fix the issue and resubmit, or submit an appeal. The status App rejected applies to an app you are publishing for the first time, while it is still a draft. You cannot publish until the errors are fixed. <a href="https://shippabel.com/blog/google-play-review-what-they-check">What Google checks during Play review</a> lists the common reasons, so you can avoid them.</p>

<h2>How do I avoid delays?</h2>

<ul>
<li>Fill in your store page, your privacy policy and the <a href="https://shippabel.com/blog/google-play-data-safety-form">Data safety form</a> before you submit.</li>
<li>Fix every error Play Console shows. Google says you cannot publish your app until errors have been resolved.</li>
<li>Run a free check first, so the usual reasons for rejection are fixed before Google sees your app.</li>
</ul>

<h2>Where does Shippabel fit in?</h2>

<p>Shippabel tracks your review status and explains a rejection in plain language. Google decides when your app goes live, and no tool can speed that up.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/9859751" target="_blank" rel="noopener noreferrer">Google Play Console Help: publish your app</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "apk-vs-aab-google-play",
    title: "APK vs AAB: which file does Google Play want?",
    excerpt: "Google Play requires an Android App Bundle (AAB) for new apps. What AAB and APK files are, which one you need, and how to get one.",
    category: "Google Play",
    readTime: "4 min read",
    date: "2026-11-07",
    updated: "2026-11-07",
    related: ["turn-a-web-app-into-an-android-app", "google-play-testing-tracks-explained", "google-play-developer-account-setup"],
    content: `
<p><strong>The short answer:</strong> Google Play wants an Android App Bundle (AAB) for new apps. An APK is a file you can install straight onto a phone, which is handy for trying your app yourself, but it is not what you upload to Google Play. Google has required app bundles for new apps since August 2021.</p>

<h2>What is an AAB?</h2>

<p>An Android App Bundle is a publishing format. It holds all of your app's code and resources, and Google Play uses it to build the files each phone needs. People download less, and you do not have to build a separate version for every kind of phone. The file ends in .aab.</p>

<h2>What is an APK?</h2>

<p>An APK is a finished Android app in a single file, ending in .apk. You can copy one to a phone and install it without Google Play, so it is a quick way to try your app on your own phone or to hand a test copy to a friend. Before Google required bundles, an APK was also what developers uploaded to the store.</p>

<h2>AAB and APK side by side</h2>

<table>
<thead>
<tr><th></th><th>AAB</th><th>APK</th></tr>
</thead>
<tbody>
<tr><td>The file ends in</td><td>.aab</td><td>.apk</td></tr>
<tr><td>Upload to Google Play for a new app</td><td>Yes, required</td><td>No</td></tr>
<tr><td>Install straight on your phone</td><td>Not directly, Google Play prepares the files</td><td>Yes</td></tr>
<tr><td>Who builds the files for each phone</td><td>Google Play</td><td>You</td></tr>
<tr><td>Good for</td><td>Releasing in Google Play</td><td>Trying the app yourself</td></tr>
</tbody>
</table>

<h2>Which one do you need?</h2>

<p>If you want your app on Google Play, you need an AAB. If you only want to try the app on a phone, an APK is quicker. You may want both: an APK to test with and an AAB to publish.</p>

<h2>Does the file have to be signed?</h2>

<p>Yes. Android apps are signed, which shows that the app really comes from you, and Google's guidance is to build a signed bundle and upload it. After you upload, Google Play generates the final APKs from the bundle and signs them for each phone.</p>

<h2>How do I get an AAB?</h2>

<ul>
<li><strong>Android Studio.</strong> Google's developer tool can build a signed bundle. You install it on your computer and create a signing key.</li>
<li><strong>The command line.</strong> The same build, run from a terminal. This suits people who already work in one.</li>
<li><strong>A cloud build.</strong> A service builds the bundle for you, so you need no developer tools. Shippabel does this: it builds a signed AAB in the cloud, usually in 10 to 20 minutes, and uploads it to your app's internal testing track in your own Play Console.</li>
</ul>

<p>Make sure it is a release build and not a debug build. A debug build is made for testing while you develop, and it is not meant to be published.</p>

<h2>What if my tool gave me an APK?</h2>

<p>Some tools and online builders hand you an APK. It installs on your phone, so it is useful for a first look, but for Google Play you need to produce an AAB from the same project. <a href="https://shippabel.com/blog/turn-a-web-app-into-an-android-app">How to turn a web app into an Android app</a> explains the options.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://developer.android.com/guide/app-bundle" target="_blank" rel="noopener noreferrer">Android Developers: about Android App Bundles</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "google-play-testing-tracks-explained",
    title: "Internal, closed and open testing on Google Play, explained",
    excerpt: "Google Play has three test tracks: internal, closed and open. Who can join each, how many testers, and which one a new app should start with.",
    category: "Google Play",
    readTime: "5 min read",
    date: "2026-11-07",
    updated: "2026-11-07",
    related: ["google-play-12-testers-rule", "apk-vs-aab-google-play", "how-long-does-google-play-review-take"],
    content: `
<p><strong>The short answer:</strong> Google Play has three test tracks you can use before you release to everyone: internal testing for up to 100 people you add by email, closed testing for people you invite, and open testing that anyone can join. Start with internal testing to check that your app installs. New personal developer accounts must also run a closed test before they can release publicly.</p>

<h2>The three tracks side by side</h2>

<table>
<thead>
<tr><th>Track</th><th>Who can join</th><th>How many testers</th></tr>
</thead>
<tbody>
<tr><td>Internal</td><td>People you add by email address. They cannot find the app on Google Play, they need your link.</td><td>Up to 100</td></tr>
<tr><td>Closed</td><td>People you invite with an email list, a Google Group or an organization. They need your opt-in link.</td><td>Email lists of up to 2,000 each, up to 50 lists per track. Google Groups have no limit.</td></tr>
<tr><td>Open</td><td>Anyone. The app can be found on Google Play.</td><td>Unlimited, or a limit you set of at least 1,000.</td></tr>
</tbody>
</table>

<h2>Internal testing</h2>

<p>This is the quickest way to see your app on a real phone. You add up to 100 testers by email address, and they install the app from a link you send them. Google notes that internal tests might not be subject to the standard policy or security reviews. Treat that as a reason to use internal testing as a first check, not as a way around the review that comes before a public release.</p>

<h2>Closed testing</h2>

<p>A closed test is for a group you choose. You manage testers with email lists or Google Groups, or you choose an organization. Each tester has to open your opt-in link and accept, and if you use a Google Group they must join the group first. After you publish a test for the first time, the link can take several hours to start working.</p>

<p>This is the track for the testing requirement on new personal developer accounts: at least 12 testers for 14 days. <a href="https://shippabel.com/blog/google-play-12-testers-rule">The 12-tester rule</a> explains how to get through it.</p>

<h2>Open testing</h2>

<p>An open test is visible on Google Play, and anyone with the link can join, so it works like a public preview. You can leave the number of testers unlimited or set a limit of at least 1,000. Check that your app and your store page are ready for visitors before you open one.</p>

<h2>Can testers leave reviews?</h2>

<p>Not public ones. Google says testers cannot leave public reviews on Google Play for test versions, so give them another way to send feedback, such as an email address or a short form.</p>

<h2>Which track should you start with?</h2>

<ol>
<li>Upload your first build to internal testing and install it on a real phone.</li>
<li>If your account is a new personal account, run the closed test with at least 12 testers for 14 days.</li>
<li>Use open testing only if you want a public trial. It is optional.</li>
<li>Release to production. New personal accounts apply for production access first.</li>
</ol>

<p>Google's help page says you must test your app before you release it to production.</p>

<h2>Where does Shippabel fit in?</h2>

<p>Shippabel builds your app and uploads it to the internal testing track in your own Play Console, so you can install it on a phone without any developer tools. You run the closed test yourself, because the testers have to be real people you invite.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/9845334" target="_blank" rel="noopener noreferrer">Google Play Console Help: set up an open, closed, or internal test</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "google-play-data-safety-form",
    title: "Google Play Data safety form: how to fill it in",
    excerpt: "Apps on Google Play need a Data safety form and a privacy policy. What the form asks, where to find it, and how to answer it for an AI-built app.",
    category: "Google Play",
    readTime: "6 min read",
    date: "2026-11-07",
    updated: "2026-11-07",
    related: ["app-privacy-policy-guide", "google-play-review-what-they-check", "how-long-does-google-play-review-take"],
    content: `
<p><strong>The short answer:</strong> if your app is published on Google Play, you must fill in the Data safety form in Play Console. It tells people what data your app collects, whether you share it, how it is protected and whether users can ask you to delete it. You also need a privacy policy, and what it says must match your answers.</p>

<h2>What does the form ask?</h2>

<p>Google's form asks about four things:</p>

<ul>
<li><strong>What you collect.</strong> Google defines collecting as sending data from your app off the user's device.</li>
<li><strong>What you share.</strong> Sharing means passing the data your app collected to a third party.</li>
<li><strong>How it is protected.</strong> For example, whether the data is encrypted when it is sent.</li>
<li><strong>Whether people can ask for deletion.</strong> Does your app give users a way to ask you to delete their data?</li>
</ul>

<p>For each kind of data you collect, you pick from Google's categories: location, personal info, financial info, health and fitness, messages, photos and videos, audio files, files and docs, calendar, contacts, app activity, web browsing, app info and performance, and device or other IDs.</p>

<h2>Where do I find it?</h2>

<p>Open Play Console, go to the App content page, find Data safety and select Start. Add your privacy policy first, because Google requires one to complete the form.</p>

<h2>What if my app collects nothing?</h2>

<p>You still complete the form and give a link to your privacy policy. The form and the policy can then say that no user data is collected or shared.</p>

<h2>Does code from other companies count?</h2>

<p>Yes. Google says the form covers data collected and handled through any third-party libraries or SDKs in your app, and that it is your responsibility to make sure such code follows the Play policies. If you added a login service, analytics or crash reporting, what they collect belongs in your answers.</p>

<h2>What counts in an AI-built app?</h2>

<p>These are examples to help you think, not advice for your app. Only you know what your app does.</p>

<ul>
<li>If people sign in with an email address, you collect that email address, which belongs under personal info.</li>
<li>If your app saves anything to an online database, that data leaves the device, so it counts as collected.</li>
<li>If you added analytics or crash reporting, check what that service collects and include it.</li>
<li>If your app works fully on the device and never sends data anywhere, you may be able to say it collects nothing.</li>
</ul>

<h2>Keep it accurate</h2>

<p>Google says you alone are responsible for complete and accurate declarations, and that your answers must stay accurate and complete at all times. Apps that do not become compliant are subject to policy enforcement, such as blocked updates or removal from Google Play. When you add a feature that collects something new, update the form and your privacy policy.</p>

<h2>Which apps do not need the form?</h2>

<p>Google says system services and private apps do not need to complete it. An ordinary public app does.</p>

<h2>Where does Shippabel fit in?</h2>

<p>The free check looks for a privacy policy, and Shippabel can write one for you and host it at a public address you can link to. You answer the Data safety form yourself in Play Console, because only you know what your app does with data. Our guide to <a href="https://shippabel.com/blog/app-privacy-policy-guide">writing a privacy policy</a> covers the policy side.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/10787469" target="_blank" rel="noopener noreferrer">Google Play Console Help: provide information for Google Play's Data safety section</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "pwa-or-google-play-app",
    title: "Do you need Google Play? A web app, a PWA or a store app",
    excerpt: "You do not need Google Play to share a web app. When a link or a PWA is enough, when you need a store listing, and how to get from one to the other.",
    category: "Beginner",
    readTime: "5 min read",
    date: "2026-11-07",
    updated: "2026-11-07",
    related: ["turn-a-web-app-into-an-android-app", "how-much-does-it-cost-to-publish-an-app", "vibe-coding-publish-app"],
    content: `
<p><strong>The short answer:</strong> you do not need Google Play to share a web app. If people can open it from a link, or add it to their phone's home screen, that may be enough. You need a store listing when you want people to find and install your app from Google Play.</p>

<h2>What is a PWA?</h2>

<p>A PWA (progressive web app) is a website that can be added to a phone's home screen and opened like an app. It is still your web app, so when you update the site, everyone gets the update. People open your link in their browser and choose to add it to their home screen.</p>

<h2>A link or a store listing: which fits you?</h2>

<table>
<thead>
<tr><th>You want</th><th>A link or PWA</th><th>A store listing</th></tr>
</thead>
<tbody>
<tr><td>To share the app with a few people</td><td>Enough</td><td>More work than needed</td></tr>
<tr><td>To try your idea before spending money</td><td>Enough, there is no store fee</td><td>Costs a one-time $25 Google fee</td></tr>
<tr><td>People to find the app by searching Google Play</td><td>Not possible</td><td>Yes, once it is published</td></tr>
<tr><td>People to install the app from Google Play</td><td>Not possible</td><td>Yes</td></tr>
</tbody>
</table>

<h2>When a link is enough</h2>

<p>A link is enough for a prototype, a tool for your team or club, or an idea you are still testing. There is no store fee and no store review, and you can change the app whenever you like.</p>

<h2>When you need the store</h2>

<p>You need Google Play when you want to be listed there, or when you want people to get the app the way they get other apps. To get there, your web app has to be packaged as an Android app and uploaded as an app bundle. <a href="https://shippabel.com/blog/turn-a-web-app-into-an-android-app">How to turn a web app into an Android app</a> explains the options, and <a href="https://shippabel.com/blog/apk-vs-aab-google-play">APK vs AAB</a> explains the file you upload.</p>

<h2>How does a web app run inside an Android app?</h2>

<p>One way is a Trusted Web Activity, which lets an Android app open your web app using Chrome. Google says the app and the website must come from the same developer, which Android checks with Digital Asset Links, and that it needs Chrome 72 or newer on the phone. The Android app cannot read the web content directly, for example cookies and local storage.</p>

<h2>What else comes with the store?</h2>

<p>A Google Play developer account ($25, paid once, see <a href="https://shippabel.com/blog/how-much-does-it-cost-to-publish-an-app">what publishing costs</a>), a store page, a privacy policy and a <a href="https://shippabel.com/blog/google-play-data-safety-form">Data safety form</a>. If your account is a new personal account, Google also requires a closed test with at least 12 testers for 14 days: see <a href="https://shippabel.com/blog/google-play-12-testers-rule">the 12-tester rule</a>.</p>

<h2>Where does Shippabel fit in?</h2>

<p>Shippabel is for the second case. If a link is all you need, you do not need us. If you want a Google Play listing, the free check shows what your app still needs, and Shippabel can build the Android app, write the store page and upload the app to Google Play. Automatic conversion works for Vite web apps today.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://developer.chrome.com/docs/android/trusted-web-activity/" target="_blank" rel="noopener noreferrer">Chrome for Developers: Trusted Web Activities</a></li>
<li><a href="https://support.google.com/googleplay/android-developer/answer/6112435" target="_blank" rel="noopener noreferrer">Google Play Console Help: get started with Play Console</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "google-play-12-testers-rule",
    title: "Google Play's 12-tester rule: what it is and how to pass it",
    excerpt: "New personal Google Play accounts must run a closed test with at least 12 testers for 14 days before going public. What it means and how to get through it.",
    category: "Google Play",
    readTime: "6 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["google-play-testing-tracks-explained", "how-long-does-google-play-review-take", "google-play-developer-account-setup"],
    content: `
<p><strong>The short answer:</strong> if you created a personal Google Play developer account after November 2023, Google makes you run a closed test with at least 12 testers for 14 days before you can apply to release your app to everyone. Until then, only the people you invite can install it.</p>

<p>This catches many first-time publishers by surprise. You finish your app, pay the $25 fee, upload the build, and then find that releasing to production is locked. This guide explains why, and how to get through it without losing weeks.</p>

<h2>Who has to do the 12-tester test?</h2>

<p>The rule applies to personal (individual) developer accounts created after November 2023. Older personal accounts and organization accounts are not asked to do it. You can see whether it applies to you in Play Console: the dashboard lists the steps you must finish before you can release to production, and the testing step is on that list if it applies to you.</p>

<p>Google can change the rule at any time, so read <a href="https://support.google.com/googleplay/android-developer/answer/14151465" target="_blank" rel="noopener noreferrer">Google's own help page</a> before you plan around it.</p>

<h2>What is a closed test?</h2>

<p>A closed test is a version of your app that only the people you invite can install. You add their email addresses (or a Google Group) in Play Console, then send them a link. Each person has to accept the invitation, which Google calls opting in, and then install the app from Google Play.</p>

<h2>How do I run the test, step by step?</h2>

<ol>
<li>Build your app as an Android App Bundle (AAB) and upload it to a closed testing track in Play Console.</li>
<li>Add your testers. Invite more than 12, for example 15 to 20, because some people never opt in and some drop out.</li>
<li>Send each tester the opt-in link and ask them to install the app.</li>
<li>Keep at least 12 testers opted in for 14 days in a row.</li>
<li>After 14 days, apply for production access from the Play Console dashboard. Google asks about your test and what you learned from it.</li>
<li>Wait for Google's answer. When production access is granted, you can release your app to everyone.</li>
</ol>

<h2>Who can be a tester?</h2>

<p>Anyone with a Google account and an Android phone: friends, family, colleagues, classmates, or people from a community you belong to. Ask them to open the app once or twice during the 14 days. Real use gives you real feedback, and Google asks what you learned.</p>

<p>Do not pay a service to supply fake testers. The test is meant to show that real people used the app, and testing that is not real will not help you answer Google's questions.</p>

<h2>How long does it all take?</h2>

<p>Plan on about three weeks from your first upload to a public release: a few days to find testers, 14 days of testing, and then Google's review of your application. The exact time depends on how fast you find testers and how long Google takes to answer.</p>

<h2>What goes wrong most often?</h2>

<ul>
<li><strong>Too few testers opt in.</strong> Inviting people is not enough. They must accept the invitation and install the app.</li>
<li><strong>Testers drop out.</strong> If your count falls below 12, you may have to keep testing for longer. Start with a few extra.</li>
<li><strong>The app crashes on install.</strong> Try it on a real phone first, so your testers do not give up on day one.</li>
<li><strong>You forget to apply.</strong> Production access is not automatic. You have to apply when the 14 days are over.</li>
</ul>

<h2>Can I skip the test?</h2>

<p>An organization account is not asked to run this test. But an organization account needs a registered business and a D-U-N-S number, and setting one up can take weeks, so it is not a quick way around the rule. For most people with a first app, running the closed test is the simpler path.</p>

<h2>Where does Shippabel fit in?</h2>

<p>Shippabel checks your app, fixes what Google would reject, writes your store page, and builds and uploads your app to Google Play's internal testing track. The closed test with 12 testers is a step you run in your own Play Console, because the testers have to be real people you invite. Start it as early as you can, because the 14 days are the longest wait in the whole process.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/14151465" target="_blank" rel="noopener noreferrer">Google Play Console Help: testing requirements for new personal developer accounts</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "how-much-does-it-cost-to-publish-an-app",
    title: "How much does it cost to publish an app? (2026)",
    excerpt: "Google Play costs $25 once and the App Store $99 a year. The full list of what you pay, what is free, and what to budget for. Updated November 2026.",
    category: "Costs",
    readTime: "5 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["google-play-developer-account-setup", "google-play-12-testers-rule", "vibe-coding-publish-app"],
    content: `
<p><strong>The short answer:</strong> a Google Play developer account costs $25, paid once. An Apple Developer Program membership costs $99 a year. Publishing to both stores in your first year costs $124 in store fees. After that, neither store charges you per app, and your account covers as many apps as you like.</p>

<h2>The two fees side by side</h2>

<table>
<thead>
<tr><th></th><th>Google Play</th><th>Apple App Store</th></tr>
</thead>
<tbody>
<tr><td>Account fee</td><td>$25</td><td>$99</td></tr>
<tr><td>How often you pay</td><td>Once</td><td>Every year</td></tr>
<tr><td>Number of apps</td><td>As many as you like</td><td>As many as you like</td></tr>
<tr><td>Free apps allowed</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Computer needed to build</td><td>Any computer, or a cloud build</td><td>A Mac for Apple's official tools, or a cloud build</td></tr>
</tbody>
</table>

<p>If your Apple membership runs out, your apps can be removed from the App Store until you renew. Google's fee does not renew.</p>

<h2>What else might you pay for?</h2>

<ul>
<li><strong>Your AI tool.</strong> You already pay for it, and it is not part of publishing.</li>
<li><strong>A backend.</strong> If your app stores data online, for example logins or a database, the hosting can cost money. Many services have a free plan to start with.</li>
<li><strong>A domain name.</strong> Useful for a website or a privacy policy page. It usually costs a few dollars a year.</li>
<li><strong>Help with publishing.</strong> Freelancers, agencies and tools all charge different amounts. When you compare, check what is included: the build, the signing, the store page, and help when a store rejects your app. Also ask whether you keep ownership of your own store account.</li>
</ul>

<h2>What about the share the stores take from sales?</h2>

<p>If you sell a paid app, a subscription or in-app purchases, Google and Apple keep a share of each sale. For small developers it is usually 15 percent, and 30 percent above a yearly revenue limit. A free app with no purchases pays nothing. The rules change from time to time, so check both stores' current terms before you set prices.</p>

<h2>How much does Shippabel cost?</h2>

<p>The check is free. Publishing one app to Google Play with Shippabel costs $99, paid once, and $179 covers unlimited apps. The $25 Google fee and Apple's $99 yearly fee are paid to the stores, not to us.</p>

<h2>What does a first launch cost in total?</h2>

<p>For a first Android app that is $25 for the Google account plus $99 for Shippabel, so $124. If you add the App Store later, add Apple's $99 a year.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/6112435" target="_blank" rel="noopener noreferrer">Google Play Console Help: get started with Play Console</a></li>
<li><a href="https://developer.apple.com/programs/" target="_blank" rel="noopener noreferrer">Apple Developer Program</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "google-play-developer-account-setup",
    title: "How to create a Google Play developer account in 2026",
    excerpt: "Step by step: sign up for Play Console, pay the $25 fee, verify your identity, and choose between a personal and an organization account.",
    category: "Google Play",
    readTime: "5 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["google-play-12-testers-rule", "how-much-does-it-cost-to-publish-an-app", "app-privacy-policy-guide"],
    content: `
<p><strong>The short answer:</strong> open Google Play Console, sign in with a Google account, choose an account type, pay the $25 registration fee, and verify your identity. Approval can take a few days, so do it before your app is finished.</p>

<h2>What you need before you start</h2>

<ul>
<li>A Google account you will keep for years. Do not use one that belongs to an employer or one you might lose.</li>
<li>A government-issued ID.</li>
<li>A payment card for the $25 fee.</li>
<li>A phone number and an email address you can reach, so Google can verify them.</li>
<li>For an organization account: a registered business and a D-U-N-S number.</li>
</ul>

<h2>Personal or organization account?</h2>

<p><strong>Personal</strong> is for one person with their own app. It is the fastest to set up. If you create it after November 2023, Google asks you to run a closed test with 12 testers for 14 days before your first public release. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how that rule works</a>.</p>

<p><strong>Organization</strong> is for a registered business. It needs a D-U-N-S number and takes longer to set up. It is not asked to run the 12-tester test. Choose it only if you really do publish for a business.</p>

<p>Google may show your developer name and some contact details on your store page. Check what will be shown before you choose.</p>

<h2>How do I sign up, step by step?</h2>

<ol>
<li>Open Play Console at play.google.com/console and sign in with your Google account.</li>
<li>Choose personal or organization.</li>
<li>Enter your details: name, address and contact information. Use your real legal details, because they have to match your ID.</li>
<li>Pay the $25 fee. You pay it once.</li>
<li>Verify your identity as Google asks, with your ID and your phone number and email.</li>
<li>Wait for approval. Google tells you by email. It can take from a few hours to several days.</li>
<li>Create your first app in Play Console.</li>
</ol>

<h2>What comes after the account?</h2>

<p>Before your app can go public you need a store page, screenshots, a privacy policy, a content rating, and a build uploaded as an Android App Bundle. These guides cover each part:</p>

<ul>
<li><a href="https://shippabel.com/blog/google-play-screenshots-guide">Google Play screenshots</a></li>
<li><a href="https://shippabel.com/blog/app-privacy-policy-guide">Privacy policy for your app</a></li>
<li><a href="https://shippabel.com/blog/google-play-review-what-they-check">What Google checks in review</a></li>
</ul>

<h2>Mistakes to avoid</h2>

<ul>
<li><strong>Using the wrong Google account.</strong> Moving an app between accounts later is hard.</li>
<li><strong>Details that do not match your ID.</strong> Verification fails and you lose days.</li>
<li><strong>Signing up last.</strong> Verification and the testing rule take time, so sign up while you finish the app.</li>
</ul>

<h2>Sources</h2>

<ul>
<li><a href="https://support.google.com/googleplay/android-developer/answer/6112435" target="_blank" rel="noopener noreferrer">Google Play Console Help: get started with Play Console</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "turn-a-web-app-into-an-android-app",
    title: "How to turn a web app into an Android app",
    excerpt: "Four ways to put a web app on Google Play: wrap it, use a trusted web activity, rebuild it, or hire help. What each costs you and what Google expects.",
    category: "Guide",
    readTime: "7 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["apk-vs-aab-google-play", "pwa-or-google-play-app", "publish-lovable-app"],
    content: `
<p><strong>The short answer:</strong> the fastest way to turn a web app into an Android app is to wrap it. Your web app is packaged inside a small native app that shows it full screen, and the result is an Android App Bundle (AAB), the file format Google Play requires for new apps. Wrapping works well when your web app already looks and works well on a phone.</p>

<h2>Option 1: wrap it</h2>

<p>A wrapper such as Capacitor puts your built web app inside a native shell. Your code stays almost the same. You get a real Android project, you can add phone features like the camera or notifications with plugins, and you upload the AAB to Google Play.</p>

<p><strong>Best for:</strong> web apps made with AI tools that already run well in a phone browser. Shippabel uses this option for Vite web apps: it adds the Capacitor setup and builds the AAB for you.</p>

<h2>Option 2: a trusted web activity</h2>

<p>A trusted web activity shows your website in full-screen Chrome inside an Android app. Your site has to be a progressive web app (PWA), and you prove you own it by putting a verification file on your domain. Tools such as Bubblewrap and PWABuilder generate the Android project.</p>

<p><strong>Best for:</strong> websites that are already well-made PWAs on a domain you control. The app depends on your website being online.</p>

<h2>Option 3: rebuild it as a native app</h2>

<p>You can rewrite the app in React Native, Flutter or Kotlin. It is the most work. In return you get the best speed and full access to the phone. It makes sense when the app is a serious product and not a first version.</p>

<h2>Option 4: pay someone to do it</h2>

<p>Agencies, freelancers and services will do the packaging and publishing for you. When you compare, check what is included: the build, the signing, the store page, and help when Google rejects the app. Ask whether you keep ownership of your Google Play account and your signing keys.</p>

<h2>Will Google Play accept a wrapped web app?</h2>

<p>Yes, if it is a real app. Google expects an app to offer more than a link to a website. An app that only shows a website you do not own, or that is a thin shell with nothing useful of its own, can be rejected. Apple has a similar rule for the App Store, called minimum functionality.</p>

<p>Make your app feel like an app:</p>

<ul>
<li>It fits a phone screen and works with touch.</li>
<li>The back button does what people expect.</li>
<li>It shows something helpful when the connection drops.</li>
<li>It has a real purpose beyond a landing page.</li>
</ul>

<h2>What your web app needs first</h2>

<ul>
<li>It is built into plain files that can run without a server.</li>
<li>If it uses a backend, the backend is online at its own public address. An app cannot include your server.</li>
<li>It has an icon and a name.</li>
<li>It has a privacy policy at a public web address.</li>
</ul>

<h2>How does Shippabel handle it?</h2>

<p>Paste your GitHub link and the free check tells you whether your app can be wrapped as it is. For Vite web apps, Shippabel adds the Capacitor setup, fixes what Google would reject and builds the AAB. Next.js and Nuxt apps need a static export and a Capacitor setup first. <a href="https://shippabel.com/blog/publish-v0-app-to-google-play">This guide shows how for a v0 app</a>.</p>

<h2>Sources</h2>

<ul>
<li><a href="https://developer.android.com/guide/app-bundle" target="_blank" rel="noopener noreferrer">Android Developers: Android App Bundle</a></li>
<li><a href="https://developer.apple.com/app-store/review/guidelines/" target="_blank" rel="noopener noreferrer">Apple: App Store Review Guidelines</a></li>
</ul>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "publish-v0-app-to-google-play",
    title: "How to publish a v0 app to Google Play",
    excerpt: "v0 builds Next.js apps. How to prepare one for Google Play: a static export, a Capacitor setup, a free check, and the steps after.",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["turn-a-web-app-into-an-android-app", "publish-lovable-app", "google-play-12-testers-rule"],
    content: `
<p><strong>The short answer:</strong> v0 by Vercel creates Next.js projects, and Google Play needs an Android app, so you need two changes first. Turn your project into a static export, and add a Capacitor setup that packages it as an Android app. You can ask your AI tool to do both. Then run the free Shippabel check and continue from there.</p>

<h2>Why does a v0 app need extra steps?</h2>

<p>Many AI tools create apps with Vite, which Shippabel can wrap as an Android app automatically. v0 creates Next.js projects. A Next.js project can run code on a server, and an Android app has no server. So anything that needs a server has to move online on its own or be removed, and the rest has to be exported as plain files.</p>

<h2>Step 1: put your project on GitHub</h2>

<p>Connect your v0 project to a GitHub repository. Shippabel reads your app from GitHub, or from a zip file if you prefer. If your tool cannot push to GitHub, download the code and upload it yourself.</p>

<h2>Step 2: make it a static export</h2>

<p>Copy this into v0 or the AI tool you use:</p>

<pre><code>Change this Next.js project so it works as a static export. Set output to "export" in next.config, remove or replace anything that needs a server (API routes, server actions and middleware), set images to unoptimized, and run the build to check that it works. If a page needs data from a server, make it fetch the data from a hosted API instead.</code></pre>

<p>What usually breaks is code that reads a database directly, sign-in handled by server code, and API routes. These have to move to a hosted service. Your AI tool can help you choose one.</p>

<h2>Step 3: add Capacitor</h2>

<p>Capacitor is the tool that packages your web app as an Android app. Copy this:</p>

<pre><code>Add Capacitor to this project for Android. Install @capacitor/core, @capacitor/cli and @capacitor/android, and create a capacitor.config.json with an appId like com.yourname.yourapp, an appName, and webDir set to "out". Do not change anything else.</code></pre>

<h2>Step 4: run the free check</h2>

<p>Paste your GitHub link into the Shippabel check. It tells you in plain words what Google would reject and how to fix it. If something from steps 2 or 3 is missing, it says so.</p>

<h2>Step 5: set up your developer account</h2>

<p>You need a Google Play developer account, which costs $25 once. <a href="https://shippabel.com/blog/google-play-developer-account-setup">This guide walks through the sign-up</a>. If the account is new and personal, plan for <a href="https://shippabel.com/blog/google-play-12-testers-rule">Google's 12-tester rule</a> as well, which adds about two weeks.</p>

<h2>Step 6: store page, build and publish</h2>

<p>After the check, Shippabel fixes what it can, writes your store page, frames your screenshots, builds your app and uploads it to Google Play.</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "publish-replit-app-to-google-play",
    title: "How to publish a Replit app to Google Play",
    excerpt: "Replit apps often include a server. How to tell what you have, what an Android app can and cannot contain, and how to get it to Google Play.",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-11-02",
    updated: "2026-11-02",
    related: ["turn-a-web-app-into-an-android-app", "publish-chatgpt-built-app", "google-play-12-testers-rule"],
    content: `
<p><strong>The short answer:</strong> an Android app can only contain your front end, the screens people see. If your Replit app also has a server or a database, that part has to run online on its own, and your app has to talk to it. Find out what your Replit app is made of, fix it if needed, then run the free check.</p>

<h2>What is in your Replit app?</h2>

<ul>
<li><strong>A front end only,</strong> for example React built with Vite. It can be wrapped as an Android app as it is.</li>
<li><strong>A front end and a server in the same project,</strong> for example with Express or Flask. The server has to be deployed online. The app then calls the server's public address. A localhost address or a relative link will not work inside an Android app.</li>
<li><strong>Pages created by the server,</strong> such as templates. There is no separate front end to package. Ask your AI tool to split the front end out first.</li>
</ul>

<h2>Step 1: deploy the server part</h2>

<p>Deploy it with Replit's deployment feature or another host, so it has a public web address that stays online.</p>

<h2>Step 2: point your app at that address</h2>

<p>Copy this into your AI tool, and replace the address with your own:</p>

<pre><code>Change this project so the front end calls my server at https://my-server.example.com instead of a relative or localhost address. Put the address in one setting and keep everything else the same.</code></pre>

<h2>Step 3: connect your project to GitHub</h2>

<p>Replit can push your project to GitHub from its Git tool. Shippabel reads your app from GitHub, or from a zip file.</p>

<h2>Step 4: run the free check</h2>

<p>Paste your GitHub link into the Shippabel check. Shippabel wraps Vite front ends as Android apps automatically. If your project is built another way, the check says what is missing.</p>

<h2>Problems people run into</h2>

<ul>
<li><strong>The app cannot reach the server.</strong> Look for addresses that only work inside Replit.</li>
<li><strong>Sign-in works in the browser but not in the app.</strong> Sign-in that relies on cookies from your own site can behave differently inside an app. Ask your AI tool to test it in an Android build.</li>
<li><strong>Secrets in the code.</strong> Passwords and API keys must not sit in files that ship with your app. The Shippabel check looks for exposed keys.</li>
</ul>

<h2>What comes next</h2>

<p>You need a Google Play developer account, which costs $25 once. <a href="https://shippabel.com/blog/google-play-developer-account-setup">Here is how to create one</a>. If it is a new personal account, <a href="https://shippabel.com/blog/google-play-12-testers-rule">Google's 12-tester rule</a> applies before your first public release.</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "publish-cursor-app-to-google-play",
    title: "How to publish your Cursor app to Google Play (2026 guide)",
    excerpt: "You built an app with Cursor. Now what? This step-by-step guide shows you exactly how to get it on Google Play — no coding experience and no computer required.",
    category: "Guide",
    readTime: "8 min read",
    date: "2026-05-31",
    updated: "2026-11-02",
    related: ["publish-claude-code-app", "google-play-12-testers-rule", "google-play-review-what-they-check"],
    content: `
<p>So you used <strong>Cursor</strong> to build your first app. It works on your phone, it looks great, and you're ready to share it with the world. But then you hit the wall — <em>how do you actually get it on Google Play?</em></p>

<p>Publishing an app isn't hard, but there are about 40 things you need to get right. Missing even one can get your app rejected. This guide walks you through every step.</p>

<h2>What you need before you start</h2>

<p>Before we dive in, here's what you'll need:</p>

<ul>
<li><strong>A Google Play Developer account</strong> — costs $25 one-time. Sign up at <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer">play.google.com/console</a>. Usually approved within hours.</li>
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
  {
    slug: "publish-bolt-app-to-google-play",
    title: "From Bolt.new to Google Play in 24 hours",
    excerpt: "Built something cool with Bolt.new? Here's exactly how to take it from a web prototype to a published Google Play app — step by step, no developer needed.",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-05-31",
    updated: "2026-11-02",
    related: ["turn-a-web-app-into-an-android-app", "google-play-12-testers-rule", "google-play-screenshots-guide"],
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Get started for free →</a></p>
`,
  },
  {
    slug: "google-play-screenshots-guide",
    title: "The complete guide to Google Play screenshots (2026)",
    excerpt: "Screenshots help people decide to download your app. Here are the sizes Google Play needs, how many to add, and how to make them look professional.",
    category: "Design",
    readTime: "5 min read",
    date: "2026-05-31",
    updated: "2026-05-31",
    related: ["google-play-review-what-they-check", "app-privacy-policy-guide", "publish-lovable-app"],
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
    date: "2026-05-31",
    updated: "2026-05-31",
    related: ["how-long-does-google-play-review-take", "google-play-data-safety-form", "app-privacy-policy-guide"],
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
    title: "App privacy policy: why you need one and how to create it free",
    excerpt: "Google Play requires a privacy policy for every app. Here's what it needs to say, where to host it, and how to create one in 60 seconds.",
    category: "Legal",
    readTime: "4 min read",
    date: "2026-04-02",
    updated: "2026-05-31",
    related: ["google-play-data-safety-form", "google-play-review-what-they-check", "google-play-developer-account-setup"],
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
    excerpt: "Lovable makes building apps easy but doesn't publish them for you. Here's how to take a Lovable project from preview to Google Play without touching code.",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-04-02",
    updated: "2026-11-02",
    related: ["turn-a-web-app-into-an-android-app", "google-play-12-testers-rule", "publish-bolt-app-to-google-play"],
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Check your Lovable app for free →</a></p>
`,
  },
  {
    slug: "publish-base44-app",
    title: "How to publish your Base44 app to Google Play",
    excerpt: "Built your app on Base44? Here's the complete guide to getting it published on Google Play — no developer experience required.",
    category: "Guide",
    readTime: "5 min read",
    date: "2026-04-02",
    updated: "2026-11-02",
    related: ["publish-lovable-app", "turn-a-web-app-into-an-android-app", "google-play-12-testers-rule"],
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Check your Base44 app for free →</a></p>
`,
  },
  {
    slug: "publish-chatgpt-built-app",
    title: "Built an app with ChatGPT? How to publish it to Google Play",
    excerpt: "ChatGPT can write your app's code. But it can't submit it to Google Play. This guide bridges the gap from 'working prototype' to 'published on Google Play.'",
    category: "Guide",
    readTime: "7 min read",
    date: "2026-04-02",
    updated: "2026-11-02",
    related: ["publish-replit-app-to-google-play", "how-much-does-it-cost-to-publish-an-app", "google-play-12-testers-rule"],
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Scan your ChatGPT app for free →</a></p>
`,
  },
  {
    slug: "publish-claude-code-app",
    title: "How to publish an app built with Claude Code to Google Play",
    excerpt: "Claude Code can build entire apps from a conversation. Here's how to take that code and get it published on Google Play — the non-technical way.",
    category: "Guide",
    readTime: "6 min read",
    date: "2026-04-02",
    updated: "2026-11-02",
    related: ["publish-cursor-app-to-google-play", "publish-v0-app-to-google-play", "google-play-12-testers-rule"],
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
<p>If your app is a Vite web app, which many AI tools produce, Shippabel wraps it as a native Android app automatically. Expo apps are built as they are. Next.js and Nuxt apps need a static export first. The free check tells you which kind you have.</p>

<h3>3. Generate store assets</h3>
<p>AI writes your store listing (Shippabel uses Claude for this — fitting, right?). It reads your code, your README, and your package.json to understand what your app does, then writes optimized store copy.</p>

<h3>4. Build and ship</h3>
<p>One-click cloud build that produces a signed Android App Bundle, then submits it to Google Play.</p>

<h2>Why this matters</h2>

<p>Claude Code is democratizing app creation. But the "last mile" — getting from working code to a published app — has been a blocker. Not because it's technically hard, but because it involves dozens of steps across GitHub, build tooling, Google Play Console, and your code.</p>

<p>Shippabel automates every single one of those steps.</p>

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Check your Claude Code app for free →</a></p>
`,
  },
  {
    slug: "vibe-coding-publish-app",
    title: "Vibe coding: how to publish your first app to Google Play",
    excerpt: "You built an app using AI. You're not a developer. You don't know what Android Studio is. This guide is for you — plain language, no jargon, start to finish.",
    category: "Beginner",
    readTime: "9 min read",
    date: "2026-04-02",
    updated: "2026-11-02",
    related: ["how-much-does-it-cost-to-publish-an-app", "google-play-developer-account-setup", "google-play-12-testers-rule"],
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

<h2>One rule that catches first-time publishers</h2>

<p>If you created your Google Play developer account as a personal account after November 2023, Google requires a closed test with at least 12 testers for 14 days before you can release your app publicly. That adds about two weeks to a first launch. <a href="https://shippabel.com/blog/google-play-12-testers-rule">Here is how the rule works and how to get through it</a>.</p>

<p><a href="https://shippabel.com/scan">Check your app for free →</a></p>
`,
  },
];

// "2026-11-02" -> "November 2, 2026". The date is read as UTC so it never slides to another day.
export const formatPostDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
