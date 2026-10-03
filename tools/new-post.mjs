/* Scaffolds a post entry in assets/data/posts.json so nobody has to hand-write
   JSON. It fills the structure and leaves the prose blank — per the project
   brief the body is written by the client or a hired writer, not generated.

   Usage:
     node tools/new-post.mjs "How often should you visit the dentist?"
     node tools/new-post.mjs "Title" --date 2026-10-09
     node tools/new-post.mjs "Title" --source https://www.mouthhealthy.org/all-topics-a-z/checkups

   With no --date it takes the next free Monday/Wednesday/Friday after the last
   queued post, so the Mon/Wed/Fri cadence stays intact on its own. */

import { readFileSync, writeFileSync } from "node:fs";

const FILE = "assets/data/posts.json";
const POST_DAYS = [1, 3, 5]; // Mon, Wed, Fri

const argv = process.argv.slice(2);
const title = argv.find(a => !a.startsWith("--"));
if (!title) {
  console.error('Usage: node tools/new-post.mjs "Post title" [--date YYYY-MM-DD] [--source URL] [--source-label TEXT]');
  process.exit(1);
}
const flag = name => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};

const slugify = s =>
  s.toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const iso = d => d.toISOString().slice(0, 10);

function nextPostDay(afterISO) {
  const d = new Date(`${afterISO}T00:00:00Z`);
  do { d.setUTCDate(d.getUTCDate() + 1); } while (!POST_DAYS.includes(d.getUTCDay()));
  return iso(d);
}

const posts = JSON.parse(readFileSync(FILE, "utf8"));
const slug = flag("slug") || slugify(title);

if (posts.some(p => p.slug === slug)) {
  console.error(`A post with slug "${slug}" already exists. Pass --slug to override.`);
  process.exit(1);
}

let date = flag("date");
if (!date) {
  const latest = posts.map(p => p.date).sort().pop();
  date = nextPostDay(latest && latest >= iso(new Date()) ? latest : iso(new Date()));
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`--date must be YYYY-MM-DD, got "${date}"`);
  process.exit(1);
}

const blank = { title: "", excerpt: "", body: "" };
const post = {
  slug,
  date,
  sourceUrl: flag("source") || "",
  sourceLabel: flag("source-label") || (flag("source") ? "ADA MouthHealthy" : ""),
  lang: {
    en: { ...blank, title },
    ar: { ...blank },
    fr: { ...blank }
  }
};

posts.push(post);
posts.sort((a, b) => (a.date < b.date ? -1 : 1));
writeFileSync(FILE, JSON.stringify(posts, null, 2) + "\n");

const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
console.log(`Queued "${title}"`);
console.log(`  slug: ${slug}`);
console.log(`  date: ${date} (${weekday}) — it publishes itself that morning`);
console.log(`\nNow fill in lang.en.excerpt and lang.en.body in ${FILE}`);
console.log(`(body is HTML: <p>…</p>, <h2>…</h2>. Original writing only — see assets/data/README.md)`);
console.log(`Then: node tools/validate-posts.mjs`);
