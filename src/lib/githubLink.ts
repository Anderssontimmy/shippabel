// What people paste into the scanner is rarely the exact address we want: no https, a ".git" on the end,
// a link to a folder or a file. All of those are the same project, so they are accepted and cleaned up here.

export const NOT_A_LINK = "(not a link)";

export type GitHubLink =
  | { ok: true; url: string }
  // `site` is all that is ever remembered about a link that was turned away: the name of the website
  // (replit.com, lovable.app), never the path, the query or the account name in front of it.
  | { ok: false; site: string };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const WEBSITE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/;
const MAX_SITE = 40;

const siteOf = (hostname: string): string => {
  if (!WEBSITE.test(hostname)) return NOT_A_LINK;
  const site = hostname.split(".").slice(-2).join(".");
  return site.length > MAX_SITE ? NOT_A_LINK : site;
};

export const parseGitHubLink = (pasted: string): GitHubLink => {
  const text = pasted.trim();
  if (!text || /\s/.test(text)) return { ok: false, site: NOT_A_LINK };

  let url: URL;
  try {
    url = new URL(HAS_SCHEME.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, site: NOT_A_LINK };
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const site = siteOf(hostname);
  if (hostname !== "github.com" || !["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    return { ok: false, site };
  }

  const [owner, repository] = url.pathname.split("/").filter(Boolean);
  const repo = repository?.replace(/\.git$/i, "");
  if (!owner || !repo || ![owner, repo].every((part) => /^[\w.-]+$/.test(part))) return { ok: false, site };
  return { ok: true, url: `https://github.com/${owner}/${repo}` };
};
