/* Swaps the SITE-DOMAIN-TBD placeholder for the real domain everywhere it
   appears: canonical and Open Graph tags on every page, robots.txt, the
   notification email's From address, and the generated feeds.

   Run once, when the domain is registered:
     node tools/set-domain.mjs https://drhusseinidental.com */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PLACEHOLDER = "SITE-DOMAIN-TBD";

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: node tools/set-domain.mjs https://yourdomain.com");
  console.error("       node tools/set-domain.mjs https://user.github.io/repo   (project page)");
  process.exit(1);
}
let url;
try {
  url = new URL(raw);
} catch {
  console.error(`"${raw}" is not a valid URL. Include the scheme, e.g. https://example.com`);
  process.exit(1);
}
if (url.protocol !== "https:") {
  console.error("Use https:// — canonical and Open Graph URLs should not be http.");
  process.exit(1);
}
const host = url.host;              // e.g. drhusseinidental.com
// The base may carry a sub-path: a GitHub Pages project site lives at
// https://user.github.io/repo/. Every URL in the markup is written as
// "https://SITE-DOMAIN-TBD/<path>", so the base is the origin plus that
// sub-path, with no trailing slash.
const origin = (`https://${host}` + url.pathname).replace(/\/+$/, "");

const FILES = [
  "index.html", "about.html", "services.html", "booking.html", "contact.html",
  "blog.html", "blog/post.html",
  "robots.txt", "sitemap.xml", "feed.xml",
  "backend/supabase/functions/notify-booking/index.ts",
  "tools/patch-heads.mjs"
];

let touched = 0;
for (const file of FILES) {
  if (!existsSync(file)) continue;
  const before = readFileSync(file, "utf8");
  // "https://SITE-DOMAIN-TBD" -> origin, and bare "SITE-DOMAIN-TBD"
  // (the email From domain) -> host.
  const after = before
    .replaceAll(`https://${PLACEHOLDER}`, origin)
    .replaceAll(PLACEHOLDER, host);
  if (after !== before) { writeFileSync(file, after); touched++; console.log("updated", file); }
}

console.log(`\n${touched} file(s) updated to ${origin}`);
if (!touched) console.log("Nothing left to replace — the domain is already set.");
else console.log("Next: node tools/build-feeds.mjs");
