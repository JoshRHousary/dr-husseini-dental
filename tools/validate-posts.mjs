/* Checks assets/data/posts.json before it ships. Exits non-zero on an error so
   it can gate a deploy; warnings are advisory.

   Run: node tools/validate-posts.mjs */

import { readFileSync } from "node:fs";

const FILE = "assets/data/posts.json";
const POST_DAYS = { 1: "Monday", 3: "Wednesday", 5: "Friday" };
const LANGS = ["en", "ar", "fr"];

const errors = [];
const warnings = [];
const err = (slug, msg) => errors.push(`${slug}: ${msg}`);
const warn = (slug, msg) => warnings.push(`${slug}: ${msg}`);

let posts;
try {
  posts = JSON.parse(readFileSync(FILE, "utf8"));
} catch (e) {
  console.error(`${FILE} is not valid JSON: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(posts)) {
  console.error(`${FILE} must be a JSON array.`);
  process.exit(1);
}

const todayISO = new Date().toISOString().slice(0, 10);
const seenSlugs = new Set();
const seenDates = new Map();

for (const [i, p] of posts.entries()) {
  const id = p.slug || `post #${i + 1}`;

  if (!p.slug) err(id, "missing slug");
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) err(id, "slug must be lowercase letters, digits and single hyphens");
  else if (seenSlugs.has(p.slug)) err(id, "duplicate slug — the post page resolves by slug, so one of them is unreachable");
  else seenSlugs.add(p.slug);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) {
    err(id, `date must be YYYY-MM-DD, got ${JSON.stringify(p.date)}`);
  } else {
    if (Number.isNaN(Date.parse(`${p.date}T00:00:00Z`))) err(id, `date ${p.date} is not a real calendar date`);
    if (seenDates.has(p.date)) warn(id, `shares its date with "${seenDates.get(p.date)}" — both go live the same day`);
    else seenDates.set(p.date, id);

    const dow = new Date(`${p.date}T00:00:00Z`).getUTCDay();
    if (!POST_DAYS[dow]) {
      const name = new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
      warn(id, `${p.date} is a ${name}; the brief is Monday/Wednesday/Friday`);
    }
  }

  if (!p.lang || typeof p.lang !== "object") { err(id, "missing lang object"); continue; }
  if (!p.lang.en) err(id, "lang.en is required — the other languages fall back to it");

  for (const lang of LANGS) {
    const c = p.lang[lang];
    if (!c) { if (lang !== "en") warn(id, `no ${lang} translation — falls back to English`); continue; }
    const filled = ["title", "excerpt", "body"].filter(k => (c[k] || "").trim());
    if (filled.length === 0) { if (lang !== "en") warn(id, `${lang} block is empty — delete it or fill it in`); }
    else {
      for (const k of ["title", "excerpt", "body"]) {
        if (!(c[k] || "").trim()) err(id, `lang.${lang}.${k} is empty`);
      }
    }
    if (c.body && !/<(p|h2|h3|ul|ol)\b/i.test(c.body)) {
      warn(id, `lang.${lang}.body has no block markup — wrap paragraphs in <p>…</p>`);
    }
    if (c.excerpt && c.excerpt.length > 220) {
      warn(id, `lang.${lang}.excerpt is ${c.excerpt.length} chars — cards read better under ~180`);
    }
  }

  if (p.sourceUrl) {
    if (!/^https?:\/\//.test(p.sourceUrl)) err(id, "sourceUrl must be an absolute http(s) URL");
    if (!p.sourceLabel) warn(id, "sourceUrl without sourceLabel — the link shows the raw URL");
  }
}

/* Cadence gaps in the queue ahead of today. */
const upcoming = posts.map(p => p.date).filter(d => d > todayISO).sort();
if (upcoming.length) {
  for (let i = 1; i < upcoming.length; i++) {
    const gap = (Date.parse(`${upcoming[i]}T00:00:00Z`) - Date.parse(`${upcoming[i - 1]}T00:00:00Z`)) / 86400000;
    if (gap > 3) warnings.push(`schedule: ${gap} day gap between ${upcoming[i - 1]} and ${upcoming[i]}`);
  }
}

const live = posts.filter(p => p.date <= todayISO).length;
console.log(`${FILE}: ${posts.length} post(s) — ${live} live, ${posts.length - live} queued ahead of ${todayISO}`);
if (upcoming.length) console.log(`Queue runs to ${upcoming[upcoming.length - 1]}.`);
else if (posts.length) console.log("Nothing queued ahead — the blog goes quiet after today.");

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}
console.log(errors.length ? "" : "\nNo errors.");
