/**
 * Post-build prerender script
 *
 * Generates static HTML files for each public route so Google can index
 * the content without executing JavaScript. React hydrates on top.
 *
 * Run after `vite build`: node scripts/prerender.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const template = readFileSync(join(DIST, "index.html"), "utf-8");

// ---------------------------------------------------------------------------
// Blog data (extracted at build time — keeps this script dependency-free)
// ---------------------------------------------------------------------------
// We dynamically import the blog data from the TypeScript source.
// Since this runs after build, we parse the TS file directly.

const blogDataPath = join(__dirname, "..", "src", "lib", "blog-data.ts");
const blogDataRaw = readFileSync(blogDataPath, "utf-8");

function extractBlogPosts(raw) {
  const posts = [];
  const slugRe = /slug:\s*"([^"]+)"/g;
  const titleRe = /title:\s*"([^"]+)"/g;
  const excerptRe = /excerpt:\s*"([^"]+)"/g;
  const contentRe = /content:\s*`([\s\S]*?)`/g;

  let slugMatch, titleMatch, excerptMatch, contentMatch;
  while (
    (slugMatch = slugRe.exec(raw)) &&
    (titleMatch = titleRe.exec(raw)) &&
    (excerptMatch = excerptRe.exec(raw)) &&
    (contentMatch = contentRe.exec(raw))
  ) {
    posts.push({
      slug: slugMatch[1],
      title: titleMatch[1],
      excerpt: excerptMatch[1],
      content: contentMatch[1].trim(),
    });
  }
  return posts;
}

const blogPosts = extractBlogPosts(blogDataRaw);

// ---------------------------------------------------------------------------
// Page definitions — all public routes that should be prerendered
// ---------------------------------------------------------------------------

const pages = [
  {
    path: "/",
    title: "Shippabel — Publish Your AI-Built App to the App Store",
    description:
      "Built an app with AI? Shippabel gets it on the App Store and Google Play — no coding needed. Scan, auto-fix, generate store listings, and submit in one click.",
    canonical: "https://shippabel.com/",
  },
  {
    path: "/scan",
    title: "Free App Store Readiness Scanner — Shippabel",
    description:
      "Check if your app is ready for the App Store in 30 seconds. Paste your GitHub link and get a detailed report with issues, fixes, and a readiness score.",
    canonical: "https://shippabel.com/scan",
  },
  {
    path: "/pricing",
    title: "Pricing — Shippabel",
    description:
      "Free scan. $99 to publish one app. $179 for unlimited apps. No subscription, no hidden fees. Compare to hiring a developer for $500-$2000+.",
    canonical: "https://shippabel.com/pricing",
  },
  {
    path: "/login",
    title: "Log in — Shippabel",
    description: "Log in to your Shippabel account to manage your apps.",
    canonical: "https://shippabel.com/login",
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Shippabel",
    description: "Shippabel privacy policy. How we handle your data.",
    canonical: "https://shippabel.com/privacy",
  },
  {
    path: "/blog",
    title: "Blog — Learn how to publish your AI-built app | Shippabel",
    description:
      "Step-by-step guides for getting your AI-built app on the App Store and Google Play. No technical knowledge required.",
    canonical: "https://shippabel.com/blog",
    extraContent: `<h1>Learn how to publish your app</h1>
<p>Step-by-step guides for getting your AI-built app on the App Store and Google Play. No technical knowledge required.</p>
<ul>${blogPosts.map((p) => `<li><a href="/blog/${p.slug}">${p.title}</a> — ${p.excerpt}</li>`).join("\n")}</ul>`,
  },
  {
    path: "/scan/demo",
    title: "Demo Scan Results — Shippabel",
    description:
      "See an example scan report showing how Shippabel checks your app for App Store readiness.",
    canonical: "https://shippabel.com/scan/demo",
  },
  // Blog posts
  ...blogPosts.map((post) => ({
    path: `/blog/${post.slug}`,
    title: `${post.title} | Shippabel`,
    description: post.excerpt,
    canonical: `https://shippabel.com/blog/${post.slug}`,
    extraContent: `<article><h1>${post.title}</h1>${post.content}</article>`,
  })),
];

// ---------------------------------------------------------------------------
// Generate HTML for each page
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generatePage(page) {
  let html = template;

  // Replace <title>
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(page.title)}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escapeHtml(page.description)}"`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${page.canonical}"`
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${escapeHtml(page.title)}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${escapeHtml(page.description)}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${page.canonical}"`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}"`
  );

  // Inject page content into noscript (for crawlers) + a hidden div
  // This gives Google real content to index even without JS
  if (page.extraContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div>
    <div id="prerender-content" style="display:none">${page.extraContent}</div>`
    );
  }

  return html;
}

let count = 0;
for (const page of pages) {
  const html = generatePage(page);

  // Determine output path
  let outPath;
  if (page.path === "/") {
    // Homepage — already exists as dist/index.html, overwrite it
    outPath = join(DIST, "index.html");
  } else {
    // Create dist/blog/slug/index.html etc.
    const dir = join(DIST, page.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    outPath = join(dir, "index.html");
  }

  writeFileSync(outPath, html, "utf-8");
  count++;
}

console.log(`✅ Prerendered ${count} pages for SEO`);
