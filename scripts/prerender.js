/**
 * Post-build prerender script
 *
 * Writes a static HTML file for each public route, and the sitemap, so search engines and AI crawlers can read the
 * content without running JavaScript. React draws the real page on top.
 *
 * The content and the rules live in src/lib/seo.ts (tested by src/lib/seo.test.ts); this file only runs them against
 * the built dist folder. Run after `vite build`: node scripts/prerender.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "dist");

// esbuild comes with Vite. It bundles the TypeScript module and what it imports into one file that Node can load.
const bundle = buildSync({
  entryPoints: [join(root, "src", "lib", "seo.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  logLevel: "silent",
});
const { prerenderPages, renderPage, buildSitemap } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const template = readFileSync(join(DIST, "index.html"), "utf-8");

let count = 0;
for (const page of prerenderPages()) {
  const html = renderPage(template, page);

  let outPath;
  if (page.path === "/") {
    // the home page is dist/index.html itself
    outPath = join(DIST, "index.html");
  } else {
    const dir = join(DIST, page.path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    outPath = join(dir, "index.html");
  }
  writeFileSync(outPath, html, "utf-8");
  count++;
}

writeFileSync(join(DIST, "sitemap.xml"), buildSitemap(), "utf-8");

console.log(`Prerendered ${count} pages and the sitemap for search engines`);
