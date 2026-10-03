/* Adds a check-site rule for the standing project rule "every edit lands on
   mobile too".

   Desktop and mobile are two different layouts here, not one responsive one, so
   a multi-column grid declared in a page's own <style> block does not reach
   mobile unless something collapses it. Every page-local grid was in exactly
   that state before 2026-10-01. This flags any new one.

   node tools/patch-check-mobile.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "tools/check-site.mjs";
let c = read(FILE);

if (c.includes("no mobile breakpoint")) {
  console.log("check-site.mjs: mobile rule already present");
  process.exit(0);
}

/* Read style.css once, before the per-page loop. */
c = must(c,
  "const usedKeys = new Set();",
`const usedKeys = new Set();

/* Mobile rule: desktop (>=901px) and mobile (<=900px) are separate layouts, so a
   multi-column grid declared in a page's own <style> needs something to collapse
   it. Collect the selectors that any max-width media query touches — in the
   shared stylesheet or in the page itself — and treat those as covered. */
const sharedCss = readFileSync("assets/css/style.css", "utf8");
const mobileCovered = text => {
  const covered = new Set();
  for (const m of text.matchAll(/@media[^{]*max-width[^{]*\\{/g)) {
    // walk braces from the media query's opening brace to its match
    let depth = 0, i = m.index + m[0].length - 1;
    const start = i + 1;
    do {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    } while (depth > 0 && i < text.length);
    for (const sel of text.slice(start, i).matchAll(/\\.([a-zA-Z][\\w-]*)/g)) covered.add(sel[1]);
  }
  return covered;
};
const sharedMobile = mobileCovered(sharedCss);`,
  "usedKeys declaration");

/* Per-page check, inserted alongside the head completeness check. */
c = must(c,
  "  /* ── head completeness ─────────────────────────────────────────────────── */",
`  /* ── mobile coverage for page-local grids ──────────────────────────────── */
  const styleBlocks = [...html.matchAll(/<style>([\\s\\S]*?)<\\/style>/g)].map(m => m[1]).join("\\n");
  if (styleBlocks) {
    const pageMobile = mobileCovered(styleBlocks);
    // rule bodies that set more than one grid column
    for (const m of styleBlocks.matchAll(/\\.([a-zA-Z][\\w-]*)\\s*\\{([^}]*)\\}/g)) {
      const [, cls, body] = m;
      const cols = (body.match(/grid-template-columns:\\s*([^;]+)/) || [])[1];
      if (!cols) continue;
      const count = cols.trim().split(/\\s+/).length;
      const repeated = /repeat\\(\\s*([2-9])/.test(cols);
      if (count < 2 && !repeated) continue;
      if (sharedMobile.has(cls) || pageMobile.has(cls)) continue;
      warnings.push(\`\${page}: .\${cls} is \${repeated ? "multi" : count}-column but has no mobile breakpoint — add it to the MOBILE block in style.css\`);
    }
  }

  /* ── head completeness ─────────────────────────────────────────────────── */`,
  "head completeness marker");

write(FILE, c);
console.log("check-site.mjs: page-local grids now checked for a mobile breakpoint");
