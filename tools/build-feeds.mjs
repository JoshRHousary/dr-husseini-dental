/* Generates sitemap.xml and feed.xml from the static pages plus the posts that
   are live as of today. Run it on each deploy (and ideally daily, since posts
   publish themselves by date — see tools/README.md).

   Run: node tools/build-feeds.mjs */

import { readFileSync, writeFileSync } from "node:fs";

const SITE_URL = (readFileSync("robots.txt", "utf8").match(/Sitemap: (https?:\/\/\S+?)\/sitemap\.xml/) || [, "https://SITE-DOMAIN-TBD"])[1];
const BRAND = "Dr. Jihad S. Husseini";

const STATIC_PAGES = [
  { loc: "/",              priority: "1.0", changefreq: "monthly" },
  { loc: "/about.html",    priority: "0.8", changefreq: "yearly" },
  { loc: "/services.html", priority: "0.9", changefreq: "yearly" },
  { loc: "/booking.html",  priority: "0.9", changefreq: "monthly" },
  { loc: "/contact.html",  priority: "0.8", changefreq: "yearly" },
  { loc: "/blog.html",     priority: "0.7", changefreq: "weekly" }
];

const xmlEscape = s =>
  String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

const todayISO = new Date().toISOString().slice(0, 10);
const posts = JSON.parse(readFileSync("assets/data/posts.json", "utf8"))
  .filter(p => p.date <= todayISO)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

/* ── sitemap ───────────────────────────────────────────────────────────────── */
// Every page serves all three languages off one URL (the switcher is client
// side), so each entry carries the three hreflang alternates rather than
// separate per-language URLs.
const alternates = loc =>
  ["en", "ar", "fr", "x-default"]
    .map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${loc}"/>`)
    .join("\n");

const urlEntry = ({ loc, priority, changefreq, lastmod }) =>
  `  <url>
    <loc>${SITE_URL}${loc}</loc>
    <lastmod>${lastmod || todayISO}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternates(loc)}
  </url>`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[
  ...STATIC_PAGES.map(p => urlEntry({ ...p, lastmod: posts.length && p.loc === "/blog.html" ? posts[0].date : todayISO })),
  ...posts.map(p => urlEntry({
    loc: `/blog/post.html?slug=${encodeURIComponent(p.slug)}`,
    priority: "0.6",
    changefreq: "yearly",
    lastmod: p.date
  }))
].join("\n")}
</urlset>
`;
writeFileSync("sitemap.xml", sitemap);

/* ── RSS ───────────────────────────────────────────────────────────────────── */
const rssDate = iso => new Date(`${iso}T08:00:00Z`).toUTCString();
const items = posts.map(p => {
  const c = p.lang.en || Object.values(p.lang)[0] || {};
  const link = `${SITE_URL}/blog/post.html?slug=${encodeURIComponent(p.slug)}`;
  return `    <item>
      <title>${xmlEscape(c.title || p.slug)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${rssDate(p.date)}</pubDate>
      <description>${xmlEscape(c.excerpt || "")}</description>
    </item>`;
}).join("\n");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(BRAND)} — Blog</title>
    <link>${SITE_URL}/blog.html</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Dental topics explained simply — new posts every Monday, Wednesday, and Friday.</description>
    <language>en</language>
    <lastBuildDate>${rssDate(posts[0] ? posts[0].date : todayISO)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
writeFileSync("feed.xml", feed);

console.log(`sitemap.xml — ${STATIC_PAGES.length} page(s) + ${posts.length} post(s)`);
console.log(`feed.xml    — ${posts.length} item(s)`);
if (SITE_URL.includes("SITE-DOMAIN-TBD")) {
  console.log("\n! Still using the placeholder domain. Run: node tools/set-domain.mjs https://yourdomain.com");
}
