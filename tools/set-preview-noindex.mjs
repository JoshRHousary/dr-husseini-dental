/* Keep the client preview out of search engines, and lift it at launch.

   node tools/set-preview-noindex.mjs on    -> noindex while copy is placeholder
   node tools/set-preview-noindex.mjs off   -> indexable, for launch

   Two layers, because either alone leaks:
     - meta robots on all 7 pages (what a crawler that already has the URL reads)
     - robots.txt Disallow (what stops the fetch in the first place)
   The robots.txt Sitemap line is left in place either way: build-feeds.mjs and
   set-domain.mjs both read the site base back out of it.

   blog.js sets noindex,nofollow at runtime for an unknown slug; it never sets
   an index directive, so it cannot undo "on". */
import { readFileSync, writeFileSync } from "node:fs";

const mode = process.argv[2];
if (mode !== "on" && mode !== "off") {
  console.error("usage: node tools/set-preview-noindex.mjs on|off");
  process.exit(1);
}

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];
const WANT = mode === "on" ? "noindex,nofollow" : "index,follow";

let touched = 0;
for (const page of PAGES) {
  const before = readFileSync(page, "utf8");
  const html = before.replace(
    /<meta name="robots" content="[^"]*">/,
    `<meta name="robots" content="${WANT}">`
  );
  if (!/<meta name="robots"/.test(html)) {
    console.error(`${page}: no robots meta found — not touched`);
    continue;
  }
  if (html !== before) { writeFileSync(page, html); touched++; }
}

const rt = readFileSync("robots.txt", "utf8");
const eol = rt.includes("\r\n") ? "\r\n" : "\n";
const rule = mode === "on" ? "Disallow: /" : "Allow: /";
const next = rt.replace(/^(?:Allow|Disallow): \/$/m, rule);
if (next !== rt) writeFileSync("robots.txt", next);

console.log(`robots: ${WANT} on ${touched} page(s); robots.txt "${rule}"`);
if (mode === "on") {
  console.log("Lift at launch: node tools/set-preview-noindex.mjs off");
}
