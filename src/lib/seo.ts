// Everything a search engine or an AI crawler reads that the browser app does not draw itself: titles, descriptions,
// structured data, the sitemap and the plain HTML of each public page. scripts/prerender.js runs this after the build.
// Kept in TypeScript so it is tested like the rest of the site, and so the front page's text comes from the same place
// the page reads it from (landingCopy).
import { blogPosts, formatPostDate, type BlogPost } from "./blog-data";
import { landingCopy } from "./landingCopy";

export const SITE = "https://shippabel.com";
export const SITE_NAME = "Shippabel";
const OG_IMAGE = `${SITE}/og-image.png`;
const ORGANIZATION_ID = `${SITE}/#organization`;
const TITLE_LIMIT = 60;

// "Title | Shippabel" when it fits in a search result, the title alone when it does not.
export const withBrand = (title: string) => {
  const full = `${title} | ${SITE_NAME}`;
  return full.length <= TITLE_LIMIT ? full : title;
};

export interface PrerenderPage {
  path: string;
  // the whole <title>, as it should be written
  title: string;
  description: string;
  canonical: string;
  type?: "website" | "article";
  noindex?: boolean;
  // plain HTML for crawlers that do not run JavaScript; identical in substance to what the page draws
  content?: string;
  jsonLd: object[];
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE,
  logo: `${SITE}/favicon.svg`,
  contactPoint: { "@type": "ContactPoint", email: "hello@shippabel.com", contactType: "customer support" },
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: SITE,
  name: SITE_NAME,
  inLanguage: "en",
  publisher: { "@id": ORGANIZATION_ID },
};

// What the product does today, in the words the rest of the site uses. Prices match the pricing page.
const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE,
  description:
    "Shippabel checks apps built with AI tools, fixes what Google Play would reject, writes the store page, frames the screenshots and publishes the app to Google Play.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  publisher: { "@id": ORGANIZATION_ID },
  offers: [
    { "@type": "Offer", name: "Free check", price: "0", priceCurrency: "USD", url: `${SITE}/scan` },
    { "@type": "Offer", name: "Ship, one app, one-time", price: "99", priceCurrency: "USD", url: `${SITE}/pricing` },
    { "@type": "Offer", name: "Unlimited apps, one-time", price: "179", priceCurrency: "USD", url: `${SITE}/pricing` },
  ],
};

// Only questions that are on the page, word for word: structured data must describe what a visitor can read.
const faqPage = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

const breadcrumbs = (trail: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
});

export const articleJsonLd = (post: BlogPost) => {
  const url = `${SITE}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url,
    datePublished: post.date,
    dateModified: post.updated,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    image: OG_IMAGE,
    articleSection: post.category,
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const homeContent = () => {
  const { headline, intro, steps, price, faqs } = landingCopy;
  return `<h1>${headline.map(escapeHtml).join(" ")}</h1>
<p>${escapeHtml(intro)}</p>
<p>Made for apps built with ChatGPT, Claude, Gemini, Cursor, Lovable, Bolt, Replit and v0.</p>
<h2>How it goes</h2>
<p>You do three things. We do the rest.</p>
<ol>${steps.map((s) => `<li><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></li>`).join("")}</ol>
<h2>One price. No surprises.</h2>
<p>${escapeHtml(price.line)}</p>
<ul>${[...price.reassurances, price.promise].map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
<p>${escapeHtml(price.fees)}</p>
<h2>You're probably wondering</h2>
${faqs.map((f) => `<h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`).join("\n")}
<h2>Find out what's in the way.</h2>
<p>Paste your link. The check is free and takes about 30 seconds.</p>
<p><a href="${SITE}/scan">Check my app now</a></p>`;
};

const postContent = (post: BlogPost) => `<article><h1>${escapeHtml(post.title)}</h1>
<p>Published <time datetime="${post.date}">${formatPostDate(post.date)}</time>. Updated <time datetime="${post.updated}">${formatPostDate(post.updated)}</time>.</p>
${post.content}</article>`;

export const prerenderPages = (posts: BlogPost[] = blogPosts): PrerenderPage[] => [
  {
    path: "/",
    title: "Shippabel — Publish Your AI-Built App to Google Play",
    description:
      "Built an app with an AI tool? Shippabel checks it for free, fixes what Google Play would reject, writes your store page and publishes it. No coding needed.",
    canonical: `${SITE}/`,
    content: homeContent(),
    jsonLd: [organization, website, softwareApplication, faqPage(landingCopy.faqs)],
  },
  {
    path: "/scan",
    title: "Free Google Play Readiness Scanner — Shippabel",
    description:
      "Check if your app is ready for Google Play in 30 seconds. Paste your GitHub link and get a report with the problems, the fixes and a readiness score.",
    canonical: `${SITE}/scan`,
    jsonLd: [],
  },
  {
    path: "/about",
    title: "About — Shippabel",
    description: "Shippabel helps people who built an app with AI tools get it onto Google Play, without the technical headache.",
    canonical: `${SITE}/about`,
    // the same words the About page draws (src/pages/About.tsx)
    content: `<h1>Get your app on the App Store and Google Play — without the headache</h1>
<p>Shippabel is built for people who used AI to build their app. We handle everything from scan to submission.</p>
<h2>Why we built this</h2>
<p>Publishing an app sounds simple. It isn't. The App Store and Google Play have hundreds of requirements. Shippabel handles the entire technical maze so you don't have to.</p>
<h2>What Shippabel does</h2>
<p>We scan your app, auto-fix issues, write your store listing with AI, frame your screenshots, build it in the cloud, and submit it to Google Play.</p>`,
    jsonLd: [organization],
  },
  {
    path: "/pricing",
    title: "Pricing — Shippabel",
    description: "Free scan. $99 to publish one app. $179 for unlimited apps. No subscription, no hidden fees.",
    canonical: `${SITE}/pricing`,
    jsonLd: [],
  },
  {
    path: "/login",
    title: "Log in — Shippabel",
    description: "Log in to your Shippabel account to manage your apps.",
    canonical: `${SITE}/login`,
    noindex: true,
    jsonLd: [],
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Shippabel",
    description: "Shippabel privacy policy. How we handle your data.",
    canonical: `${SITE}/privacy`,
    jsonLd: [],
  },
  {
    path: "/blog",
    title: "Guides: how to publish your AI-built app | Shippabel",
    description: "Step-by-step guides for getting your AI-built app on Google Play. No technical knowledge required.",
    canonical: `${SITE}/blog`,
    content: `<h1>Learn how to publish your app</h1>
<p>Step-by-step guides for getting your AI-built app on Google Play. No technical knowledge required.</p>
<ul>${posts.map((p) => `<li><a href="${SITE}/blog/${p.slug}">${escapeHtml(p.title)}</a>: ${escapeHtml(p.excerpt)}</li>`).join("\n")}</ul>`,
    jsonLd: [breadcrumbs([{ name: "Home", url: `${SITE}/` }, { name: "Guides", url: `${SITE}/blog` }])],
  },
  {
    path: "/scan/demo",
    title: "Demo Scan Results — Shippabel",
    description: "See an example scan report showing how Shippabel checks your app for Google Play readiness.",
    canonical: `${SITE}/scan/demo`,
    jsonLd: [],
  },
  ...posts.map<PrerenderPage>((post) => ({
    path: `/blog/${post.slug}`,
    title: withBrand(post.title),
    description: post.excerpt,
    canonical: `${SITE}/blog/${post.slug}`,
    type: "article",
    content: postContent(post),
    jsonLd: [
      articleJsonLd(post),
      breadcrumbs([
        { name: "Home", url: `${SITE}/` },
        { name: "Guides", url: `${SITE}/blog` },
        { name: post.title, url: `${SITE}/blog/${post.slug}` },
      ]),
    ],
  })),
];

// ---------------------------------------------------------------------------
// The page's own HTML: the app's index.html with this page's head and content filled in
// ---------------------------------------------------------------------------

// JSON inside a <script> must not be able to close it
const jsonLdScript = (data: object) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

export const renderPage = (template: string, page: PrerenderPage): string => {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${page.canonical}"`)
    .replace(/<meta property="og:type" content="[^"]*"/, `<meta property="og:type" content="${page.type ?? "website"}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${page.canonical}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${description}"`);

  if (page.noindex) {
    html = html.replace(/<meta name="robots" content="[^"]*"/, `<meta name="robots" content="noindex, follow"`);
  }
  if (page.jsonLd.length > 0) {
    html = html.replace("</head>", `${page.jsonLd.map(jsonLdScript).join("\n")}\n</head>`);
  }
  if (page.content) {
    // hidden so the page does not flash before the app draws itself; crawlers still read it from the HTML
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <div id="prerender-content" style="display:none">${page.content}</div>`,
    );
  }
  return html;
};

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

// lastmod only where the date is real: a guide's own last update. A date invented for the other pages would teach
// search engines to ignore it.
export const buildSitemap = (posts: BlogPost[] = blogPosts): string => {
  const entry = (loc: string, lastmod?: string) =>
    `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
  const pages = ["/", "/scan", "/about", "/pricing", "/privacy", "/blog"].map((path) => entry(`${SITE}${path}`));
  const guides = posts.map((p) => entry(`${SITE}/blog/${p.slug}`, p.updated));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...pages, ...guides].join("\n")}\n</urlset>\n`;
};
