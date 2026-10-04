/* Interim launch copy, so the client can review the design without reading
   bracketed instructions to himself.

   node tools/set-interim-copy.mjs on    -> apply the interim strings
   node tools/set-interim-copy.mjs off   -> restore the bracketed placeholders

   The strings live in tools/interim-copy.json, in all three locales. Two rules
   shaped them:

     - Nothing verifiable is invented. There is no dental school, graduation
       year, membership or street address anywhere in here, because none of
       those has been supplied and a plausible-looking wrong one is worse than
       a blank. The copy says only what the brief establishes: the three
       specialties, one practitioner, Lebanon.
     - Where the missing fact IS the content (address, hours, map), the copy
       routes to WhatsApp instead of pretending. That is the site's primary
       CTA anyway, so an unknown address becomes a conversion path rather than
       an empty field. The map block is hidden outright.

   about.credentials.title moves from "Credentials & training" to "Areas of
   practice": the three items are specialties from the brief, and listing them
   under a credentials heading would imply certifications nobody has stated.

   What "on" writes is recorded in assets/locales/.interim-copy-active.json so
   "off" restores the exact originals. check-site.mjs reads that file too, and
   warns for as long as it exists - the reminder that real copy is still owed
   outlives this session.

   Both the locale JSON and the hardcoded English in the markup are updated:
   that literal is what crawlers see before the bundle applies and what shows
   if JS fails, and check-site.mjs gates on the two matching. */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";

const mode = process.argv[2];
if (mode !== "on" && mode !== "off") {
  console.error("usage: node tools/set-interim-copy.mjs on|off");
  process.exit(1);
}

const LANGS = ["en", "ar", "fr"];
const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];
const STATE = "assets/locales/.interim-copy-active.json";
const MAP_BLOCK = /<div class="map-placeholder"( hidden)?( data-i18n="contact\.info\.mapPlaceholder")/;

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const set = (obj, path, val) => {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = val;
};
const readJson = p => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

/* --- work out what to write, and what the English was before ------------- */
let table;          // { lang: { key: newString } }
let priorEnglish;   // { key: oldEnglishString } - for the markup swap

if (mode === "on") {
  if (existsSync(STATE)) {
    console.error("interim copy is already on - run `off` first");
    process.exit(1);
  }
  table = readJson("tools/interim-copy.json");
  const en = readJson("assets/locales/en.json");
  priorEnglish = {};
  const saved = {};
  for (const lang of LANGS) {
    saved[lang] = {};
    for (const key of Object.keys(table.en)) {
      saved[lang][key] = get(readJson(`assets/locales/${lang}.json`), key);
    }
  }
  for (const key of Object.keys(table.en)) priorEnglish[key] = get(en, key);
  writeJson(STATE, { appliedOn: new Date().toISOString().slice(0, 10), original: saved });
} else {
  if (!existsSync(STATE)) {
    console.error("interim copy is not on - nothing to restore");
    process.exit(1);
  }
  const state = readJson(STATE);
  table = state.original;
  priorEnglish = {};
  const en = readJson("assets/locales/en.json");
  for (const key of Object.keys(table.en)) priorEnglish[key] = get(en, key);
}

/* --- locale JSON --------------------------------------------------------- */
for (const lang of LANGS) {
  const p = `assets/locales/${lang}.json`;
  const dict = readJson(p);
  for (const [key, val] of Object.entries(table[lang])) set(dict, key, val);
  writeJson(p, dict);
}

/* --- the hardcoded English in the markup --------------------------------- */
let touched = 0;
for (const page of PAGES) {
  const before = readFileSync(page, "utf8");
  let html = before;

  for (const [key, oldText] of Object.entries(priorEnglish)) {
    const newText = table.en[key];
    if (oldText === newText) continue;
    // Only inside the element that carries this exact key.
    const re = new RegExp(`(data-i18n="${key.replace(/\./g, "\.")}"[^>]*>)([^<]*)(<)`, "g");
    html = html.replace(re, (m, open, text, close) =>
      text.trim() === oldText.trim() ? open + newText + close : m);
  }

  if (page === "contact.html") {
    html = mode === "on"
      ? html.replace(MAP_BLOCK, (m, hidden, rest) => hidden ? m : `<div class="map-placeholder" hidden${rest}`)
      : html.replace(MAP_BLOCK, (m, hidden, rest) => `<div class="map-placeholder"${rest}`);
  }

  if (html !== before) { writeFileSync(page, html); touched++; }
}

if (mode === "off") unlinkSync(STATE);

console.log(`interim copy ${mode}: ${Object.keys(table.en).length} string(s) x 3 locales, ${touched} page(s) retexted`);
console.log(mode === "on"
  ? "Client copy is still owed. Restore with: node tools/set-interim-copy.mjs off"
  : "Bracketed placeholders are back.");
console.log("Now run: node tools/build-locales.mjs");
