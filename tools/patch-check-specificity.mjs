/* Adds the three mobile rules to check-site.mjs.

   The specificity rule is the valuable one: it is what would have caught both
   the nav bug and the footer bug. Media queries carry no specificity weight, so
   a desktop base rule like `body.home-mouth .primary-nav { display: flex }`
   (0,2,1) silently defeats the `@media (max-width: 680px)` rule written to
   override it (`nav.primary-nav { display: none }`, 0,1,1). Nothing warns you;
   the mobile layout just never changes.

   node tools/patch-check-specificity.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "tools/check-site.mjs";
let c = read(FILE);

if (c.includes("outranked by the base rule")) {
  console.log("check-site.mjs: specificity rule already present");
  process.exit(0);
}

/* ── 1. every page needs the nav toggle ───────────────────────────────────── */
c = must(c,
  `  if (html.includes("SITE-DOMAIN-TBD")) warnings.push(\`\${page}: still has the placeholder domain\`);`,
`  if (html.includes("SITE-DOMAIN-TBD")) warnings.push(\`\${page}: still has the placeholder domain\`);

  /* ── mobile nav must exist ─────────────────────────────────────────────── */
  // Without it the six-link desktop nav stays on screen on phones, the header
  // overflows the viewport and the language switch is pushed off the edge.
  if (!html.includes('class="nav-toggle"')) {
    errors.push(\`\${page}: no .nav-toggle — the mobile nav is unreachable on this page\`);
  }
  if (!html.includes('id="primaryNav"')) {
    warnings.push(\`\${page}: .primary-nav has no id, so the toggle's aria-controls points nowhere\`);
  }`,
  "placeholder domain line");

/* ── 2. the specificity rule + small-text rule, after the dead-key check ──── */
c = must(c,
  `/* ── outstanding client copy ─────────────────────────────────────────────── */`,
`/* ── specificity: can each mobile rule actually win? ─────────────────────── */
// Media queries carry no weight of their own. A base rule with a higher
// specificity and a later position beats a max-width rule for the same property,
// so the mobile layout silently never changes. This is exactly how the nav
// (body.home-mouth .primary-nav vs nav.primary-nav) and the footer
// (.mouth-window .footer-grid vs .footer-grid) bugs happened.
{
  const spec = sel => {
    const s = sel.trim();
    return [
      (s.match(/#[\\w-]+/g) || []).length,
      (s.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:[a-z-]+\\(/g) || []).length,
      (s.match(/(^|[\\s>+~])[a-zA-Z][\\w-]*/g) || []).length
    ];
  };
  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

  // strip media blocks to get the base cascade, and collect the media ones
  const rules = [];      // { sel, prop, inMedia, pos }
  const ruleRe = /([^{}]+)\\{([^}]*)\\}/g;
  let depth = 0, inMedia = false, mediaIsMax = false;

  // simple scanner: track @media blocks by brace depth
  const src = sharedCss;
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf("@media", i);
    const chunkEnd = at === -1 ? src.length : at;
    collect(src.slice(i, chunkEnd), false, false);
    if (at === -1) break;
    const open = src.indexOf("{", at);
    const header = src.slice(at, open);
    let d = 0, j = open;
    do { if (src[j] === "{") d++; else if (src[j] === "}") d--; j++; } while (d > 0 && j < src.length);
    collect(src.slice(open + 1, j - 1), true, /max-width/.test(header));
    i = j;
  }

  function collect(text, inMediaFlag, isMax) {
    let m;
    const re = /([^{}]+)\\{([^}]*)\\}/g;
    while ((m = re.exec(text))) {
      const selectors = m[1].split(",").map(s => s.trim()).filter(Boolean);
      if (!selectors.length || selectors[0].startsWith("@")) continue;
      const props = [...m[2].matchAll(/([a-z-]+)\\s*:/g)].map(p => p[1]);
      for (const sel of selectors) {
        for (const prop of props) {
          rules.push({ sel, prop, inMedia: inMediaFlag, isMax, spec: spec(sel) });
        }
      }
    }
  }

  // for each max-width rule, is there a base rule for the same property whose
  // selector targets the same class and outranks it?
  const baseRules = rules.filter(r => !r.inMedia);
  for (const r of rules.filter(r => r.inMedia && r.isMax)) {
    const classes = (r.sel.match(/\\.[\\w-]+/g) || []);
    if (!classes.length) continue;
    const key = classes[classes.length - 1]; // the targeted element
    for (const b of baseRules) {
      if (b.prop !== r.prop) continue;
      if (!b.sel.includes(key)) continue;
      if (b.sel.trim() === r.sel.trim()) continue;
      if (cmp(b.spec, r.spec) > 0) {
        warnings.push(
          \`style.css: "\${r.sel} { \${r.prop} }" inside a max-width query is outranked by the base rule \`
          + \`"\${b.sel} { \${b.prop} }" (\${b.spec.join(",")} beats \${r.spec.join(",")}) — the mobile rule never applies\`);
      }
    }
  }
}

/* ── mobile text and tap targets ─────────────────────────────────────────── */
{
  for (const m of sharedCss.matchAll(/@media[^{]*max-width[^{]*\\{/g)) {
    let d = 0, i = m.index + m[0].length - 1;
    const start = i + 1;
    do { if (sharedCss[i] === "{") d++; else if (sharedCss[i] === "}") d--; i++; } while (d > 0 && i < sharedCss.length);
    const body = sharedCss.slice(start, i);
    for (const f of body.matchAll(/font-size:\\s*([\\d.]+)px/g)) {
      if (Number(f[1]) < 13) warnings.push(\`style.css: font-size \${f[1]}px inside a max-width block — under the 13px mobile floor\`);
    }
  }
}

/* ── outstanding client copy ─────────────────────────────────────────────── */`,
  "client copy marker");

write(FILE, c);
console.log("check-site.mjs: added");
console.log("  - every page must have .nav-toggle (error)");
console.log("  - max-width rules outranked by a base rule (warning)");
console.log("  - font-size under 13px inside a max-width block (warning)");
