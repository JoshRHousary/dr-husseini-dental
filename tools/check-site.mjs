/* Pre-deploy check across every page:
     - every data-i18n / data-i18n-html key resolves in all three locales
     - every locale key is actually used somewhere (dead strings)
     - every local src/href points at a file that exists
     - the loader markup and script order are intact
     - the placeholder domain and the [bracketed] copy placeholders are flagged

   Exits non-zero on an error. Run: node tools/check-site.mjs */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];
const LANGS = ["en", "ar", "fr"];

const errors = [];
const warnings = [];

const dicts = {};
for (const l of LANGS) dicts[l] = JSON.parse(readFileSync(`assets/locales/${l}.json`, "utf8"));

const getByPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);

const flatKeys = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? flatKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]);

const usedKeys = new Set();

/* Mobile rule: desktop (>=901px) and mobile (<=900px) are separate layouts, so a
   multi-column grid declared in a page's own <style> needs something to collapse
   it. Collect the selectors that any max-width media query touches — in the
   shared stylesheet or in the page itself — and treat those as covered. */
const sharedCss = readFileSync("assets/css/style.css", "utf8");
const mobileCovered = text => {
  const covered = new Set();
  for (const m of text.matchAll(/@media[^{]*max-width[^{]*\{/g)) {
    // walk braces from the media query's opening brace to its match
    let depth = 0, i = m.index + m[0].length - 1;
    const start = i + 1;
    do {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    } while (depth > 0 && i < text.length);
    for (const sel of text.slice(start, i).matchAll(/\.([a-zA-Z][\w-]*)/g)) covered.add(sel[1]);
  }
  return covered;
};
const sharedMobile = mobileCovered(sharedCss);

/* For each class that style.css collapses to one column inside a max-width
   block, the best specificity it does so with. A page's own <style> rule is
   plain `.class` (0,1,0) and comes later in the cascade, so anything at or
   below that loses the tiebreak on order. */
const sharedGridWeight = (() => {
  const weight = new Map();
  const spec = sel => {
    const s = sel.trim();
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:[a-z-]+(?!\()/g) || []).length;
    const elements = (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
    return ids * 100 + classes * 10 + elements;
  };
  for (const block of sharedCss.matchAll(/@media[^{]*max-width[^{]*\{([\s\S]*?)\n\}/g)) {
    for (const rule of block[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/grid-template-columns/.test(rule[2])) continue;
      for (const sel of rule[1].split(",")) {
        // the subject is the rightmost compound: that is what the page also targets
        const subject = (sel.trim().split(/[\s>+~]+/).pop() || "");
        const cls = (subject.match(/\.([a-zA-Z][\w-]*)/) || [])[1];
        if (!cls) continue;
        const w = spec(sel);
        if (!weight.has(cls) || weight.get(cls) < w) weight.set(cls, w);
      }
    }
  }
  return weight;
})();
const PAGE_RULE_WEIGHT = 10;   // a bare .class in the page's own <style>

for (const page of PAGES) {
  const html = readFileSync(page, "utf8");
  const dir = dirname(page);

  /* ── i18n keys ─────────────────────────────────────────────────────────── */
  for (const m of html.matchAll(/data-i18n(?:-html|-aria)?="([^"]+)"/g)) {
    const key = m[1];
    usedKeys.add(key);
    for (const l of LANGS) {
      if (getByPath(dicts[l], key) === undefined) {
        errors.push(`${page}: data-i18n="${key}" missing from ${l}.json`);
      }
    }
  }

  /* ── pre-JS English fallbacks ──────────────────────────────────────────── */
  // The literal text inside a data-i18n element is what shows before (or
  // without) JS. When it drifts from en.json the page contradicts itself.
  for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
    const [, key, literal] = m;
    const expected = getByPath(dicts.en, key);
    if (typeof expected !== "string") continue;
    const norm = t => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
    if (norm(literal) && norm(literal) !== norm(expected)) {
      warnings.push(`${page}: stale fallback for "${key}"\n      markup: ${norm(literal)}\n      en.json: ${norm(expected)}`);
    }
  }

  /* ── local asset references ────────────────────────────────────────────── */
  for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
    if (ref.startsWith("/")) {
      errors.push(`${page}: root-relative reference "${ref}" — breaks on file:// and in blog/`);
      continue;
    }
    const target = normalize(join(dir, ref.split("?")[0]));
    if (!existsSync(target)) errors.push(`${page}: "${ref}" -> ${target} does not exist`);
  }

  /* ── loader + script order ─────────────────────────────────────────────── */
  if (!html.includes('class="mouth-stage-video"')) errors.push(`${page}: stage intro video missing`);
  if (!html.includes('data-hq="')) warnings.push(`${page}: intro video has no data-hq (no 1080p encode)`);

  const localesAt = html.indexOf("assets/locales/locales.js");
  const mainAt = html.indexOf("assets/js/main.js");
  if (localesAt === -1) errors.push(`${page}: locales.js not loaded`);
  if (mainAt === -1) errors.push(`${page}: main.js not loaded`);
  if (localesAt > -1 && mainAt > -1 && localesAt > mainAt) {
    errors.push(`${page}: locales.js must load before main.js`);
  }
  if (page === "booking.html") {
    const cfgAt = html.indexOf("booking-config.js");
    const adapterAt = html.indexOf("booking-backend.js");
    const bookingAt = html.indexOf("assets/js/booking.js");
    if (cfgAt === -1 || adapterAt === -1) errors.push("booking.html: booking-config.js / booking-backend.js not loaded");
    else if (!(cfgAt < adapterAt && adapterAt < bookingAt)) {
      errors.push("booking.html: script order must be booking-config -> booking-backend -> booking");
    }
  }

  /* ── mobile coverage for page-local grids ──────────────────────────────── */
  const styleBlocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  if (styleBlocks) {
    const pageMobile = mobileCovered(styleBlocks);
    // rule bodies that set more than one grid column
    for (const m of styleBlocks.matchAll(/\.([a-zA-Z][\w-]*)\s*\{([^}]*)\}/g)) {
      const [, cls, body] = m;
      const cols = (body.match(/grid-template-columns:\s*([^;]+)/) || [])[1];
      if (!cols) continue;
      const count = cols.trim().split(/\s+/).length;
      const repeated = /repeat\(\s*([2-9])/.test(cols);
      if (count < 2 && !repeated) continue;
      if (pageMobile.has(cls)) continue;
      if (sharedMobile.has(cls)) {
        // Mentioned in a mobile block — but does it actually win? style.css is
        // parsed before this page's <style>, so equal weight loses on order.
        const w = sharedGridWeight.get(cls);
        if (w !== undefined && w <= PAGE_RULE_WEIGHT) {
          errors.push(`${page}: .${cls} collapses in style.css at the same specificity as the page's own rule, `
            + `so the page wins on order and the grid never collapses — give the mobile rule more weight (e.g. "body .${cls}")`);
        }
        continue;
      }
      warnings.push(`${page}: .${cls} is ${repeated ? "multi" : count}-column but has no mobile breakpoint — add it to the MOBILE block in style.css`);
    }
  }

  /* ── head completeness ─────────────────────────────────────────────────── */
  for (const needed of ['rel="canonical"', 'property="og:title"', 'application/ld+json', 'name="description"']) {
    if (!html.includes(needed)) errors.push(`${page}: head is missing ${needed}`);
  }
  if (html.includes("SITE-DOMAIN-TBD")) warnings.push(`${page}: still has the placeholder domain`);

  /* ── mobile nav must exist ─────────────────────────────────────────────── */
  // Without it the six-link desktop nav stays on screen on phones, the header
  // overflows the viewport and the language switch is pushed off the edge.
  if (!html.includes('class="nav-toggle"')) {
    errors.push(`${page}: no .nav-toggle — the mobile nav is unreachable on this page`);
  }
  if (!html.includes('id="primaryNav"')) {
    warnings.push(`${page}: .primary-nav has no id, so the toggle's aria-controls points nowhere`);
  }
}

/* ── dead locale strings ─────────────────────────────────────────────────── */
// Keys read from JS rather than markup; not dead, just not in any data-i18n.
const JS_KEYS = [
  /^meta\./, /^booking\.months$/, /^booking\.weekdaysShort$/, /^booking\.calendarPrefix$/,
  /^booking\.services/, /^booking\.servicePrompt$/, /^booking\.slotTaken$/, /^booking\.dayFull$/,
  /^booking\.saving$/, /^booking\.datePast$/, /^booking\.selectDate$/, /^booking\.err/, /^booking\.note(RequestOnly|LiveAvailability|AvailabilityOffline)$/,
  /^blog\.(readMore|empty|backToBlog|sourceLabel)$/,
  /^contact\.form\.(sending|errName|errPhone|errMessage|errSendFallback)$/
];
for (const key of flatKeys(dicts.en)) {
  const base = key.replace(/\.\d+$/, "");
  if (usedKeys.has(key) || usedKeys.has(base)) continue;
  if (JS_KEYS.some(re => re.test(key) || re.test(base))) continue;
  warnings.push(`locale key "${key}" is not used by any page or script`);
}

/* ── specificity: can each mobile rule actually win? ─────────────────────── */
// Media queries carry no weight of their own, so a base rule with higher
// specificity (and a later position) beats a max-width rule for the same
// property and the mobile layout silently never changes. This is exactly how
// the nav bug (body.home-mouth .primary-nav vs nav.primary-nav) and the footer
// bug (.mouth-window .footer-grid vs .footer-grid) happened.
//
// Only rules with the same SUBJECT — the rightmost compound selector — can
// override each other, so that is what gets compared.
{
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "");

  const specificity = sel => [
    (sel.match(/#[\w-]+/g) || []).length,
    (sel.match(/\.[\w-]+|\[[^\]]+\]|:(?:hover|focus|active|checked|disabled|not|is|where|nth-child|first-child|last-child)\b/g) || []).length,
    (sel.match(/(?:^|[\s>+~])(?:[a-zA-Z][\w-]*)/g) || []).length
  ];
  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

  // the subject is the last compound: ".mouth-window h1" -> "h1"
  const subject = sel => {
    const parts = sel.trim().split(/[\s>+~]+/).filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return last.replace(/::?[a-z-]+(\([^)]*\))?/g, "");  // drop pseudo-elements
  };

  const base = [];   // outside any media query
  const mobile = []; // inside a max-width query

  const collect = (text, into) => {
    const clean = stripComments(text);
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(clean))) {
      const selPart = m[1].trim();
      if (!selPart || selPart.startsWith("@")) continue;
      const props = [...m[2].matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)].map(p => p[1]);
      if (!props.length) continue;
      for (const sel of selPart.split(",").map(s => s.trim()).filter(Boolean)) {
        if (sel.includes("%") || /^\d/.test(sel)) continue;   // keyframe stops
        into.push({ sel, subject: subject(sel), spec: specificity(sel), props: new Set(props) });
      }
    }
  };

  // walk the file, separating @media blocks from the base cascade
  const src = sharedCss;
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf("@media", i);
    if (at === -1) { collect(src.slice(i), base); break; }
    collect(src.slice(i, at), base);
    const open = src.indexOf("{", at);
    const header = src.slice(at, open);
    let d = 0, j = open;
    do { if (src[j] === "{") d++; else if (src[j] === "}") d--; j++; } while (d > 0 && j < src.length);
    // A min-width-only block cannot overlap a max-width block, so its rules can
    // never beat a mobile rule — collecting them as "base" was the main source
    // of false positives. Discard them.
    const isMax = /max-width/.test(header);
    const isMinOnly = /min-width/.test(header) && !isMax;
    if (isMax) collect(src.slice(open + 1, j - 1), mobile);
    else if (!isMinOnly) collect(src.slice(open + 1, j - 1), base);
    i = j;
  }

  const seen = new Set();
  for (const r of mobile) {
    if (!r.subject) continue;
    for (const b of base) {
      if (b.subject !== r.subject) continue;          // different elements: no conflict
      if (b.sel === r.sel) continue;                   // same selector: later wins, fine
      if (cmp(b.spec, r.spec) <= 0) continue;          // mobile can win on its own
      const clash = [...r.props].filter(p => b.props.has(p));
      if (!clash.length) continue;

      // is some OTHER max-width rule for the same property strong enough?
      const rescued = clash.every(p =>
        mobile.some(o => o !== r && o.subject === r.subject && o.props.has(p) && cmp(o.spec, b.spec) >= 0));
      if (rescued) continue;

      const key = `${r.sel}|${b.sel}|${clash.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      warnings.push(
        `style.css: mobile rule "${r.sel}" cannot override base rule "${b.sel}" `
        + `for ${clash.join(", ")} (${b.spec.join(",")} beats ${r.spec.join(",")}) — raise the mobile selector's specificity`);
    }
  }
}

/* ── mobile text and tap targets ─────────────────────────────────────────── */
{
  for (const m of sharedCss.matchAll(/@media[^{]*max-width[^{]*\{/g)) {
    let d = 0, i = m.index + m[0].length - 1;
    const start = i + 1;
    do { if (sharedCss[i] === "{") d++; else if (sharedCss[i] === "}") d--; i++; } while (d > 0 && i < sharedCss.length);
    const body = sharedCss.slice(start, i);
    for (const f of body.matchAll(/font-size:\s*([\d.]+)px/g)) {
      if (Number(f[1]) < 13) warnings.push(`style.css: font-size ${f[1]}px inside a max-width block — under the 13px mobile floor`);
    }
  }
}

/* ── outstanding client copy ─────────────────────────────────────────────── */
const placeholders = flatKeys(dicts.en)
  .filter(k => typeof getByPath(dicts.en, k) === "string" && /^\[.*\]$/.test(getByPath(dicts.en, k).trim()));
if (placeholders.length) {
  warnings.push(`${placeholders.length} locale string(s) still bracketed placeholders awaiting client copy: ${placeholders.join(", ")}`);
}

/* ── report ──────────────────────────────────────────────────────────────── */
console.log(`Checked ${PAGES.length} pages, ${LANGS.length} locales, ${usedKeys.size} i18n keys in markup.`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}
console.log("\nNo errors.");
