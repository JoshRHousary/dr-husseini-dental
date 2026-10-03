/* Adds a check-site rule: the hardcoded English inside a data-i18n element must
   match en.json. That text is the pre-JS fallback — what a crawler reads before
   the locale bundle applies, and what a visitor sees if JS fails — so when it
   drifts from the locale the page contradicts itself silently. (It did: the
   booking hero still promised "no forms" after the form was added.)

   node tools/patch-check-fallbacks.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "tools/check-site.mjs";
let c = read(FILE);

if (c.includes("stale fallback")) {
  console.log("check-site.mjs: fallback rule already present");
  process.exit(0);
}

c = must(c,
`  /* ── local asset references ────────────────────────────────────────────── */`,
`  /* ── pre-JS English fallbacks ──────────────────────────────────────────── */
  // The literal text inside a data-i18n element is what shows before (or
  // without) JS. When it drifts from en.json the page contradicts itself.
  for (const m of html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)) {
    const [, key, literal] = m;
    const expected = getByPath(dicts.en, key);
    if (typeof expected !== "string") continue;
    const norm = t => t.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\\s+/g, " ").trim();
    if (norm(literal) && norm(literal) !== norm(expected)) {
      warnings.push(\`\${page}: stale fallback for "\${key}"\\n      markup: \${norm(literal)}\\n      en.json: \${norm(expected)}\`);
    }
  }

  /* ── local asset references ────────────────────────────────────────────── */`,
  "asset reference section");

write(FILE, c);
console.log("check-site.mjs: stale-fallback rule added");
