/* Teaches check-site.mjs the order half of the cascade.

   The existing rule asks whether a page-local grid is *mentioned* in a mobile
   block. That is not enough: a page's <style> block is parsed after style.css,
   so at equal specificity the page's multi-column rule wins on order and the
   breakpoint does nothing. Three grids (.booking-layout, .contact-grid,
   .service-list) passed the old check and were still two-column at 390px.

   New rule: when a page-local grid's only mobile override lives in style.css,
   that override must be *more specific* than the bare `.class` selector the
   page uses. Equal weight is an error, not a warning — it is invisible in the
   source and only shows up on a phone.

   node tools/patch-check-grid-order.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "tools/check-site.mjs";
let js = read(FILE);

if (js.includes("sharedGridWeight")) {
  console.log("check-site.mjs: grid-order rule already present");
} else {
  /* ── the helper ─────────────────────────────────────────────────────────── */
  js = must(js,
    "const sharedMobile = mobileCovered(sharedCss);",
    `const sharedMobile = mobileCovered(sharedCss);

/* For each class that style.css collapses to one column inside a max-width
   block, the best specificity it does so with. A page's own <style> rule is
   plain \`.class\` (0,1,0) and comes later in the cascade, so anything at or
   below that loses the tiebreak on order. */
const sharedGridWeight = (() => {
  const weight = new Map();
  const spec = sel => {
    const s = sel.trim();
    const ids = (s.match(/#[\\w-]+/g) || []).length;
    const classes = (s.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:[a-z-]+(?!\\()/g) || []).length;
    const elements = (s.match(/(^|[\\s>+~])[a-zA-Z][\\w-]*/g) || []).length;
    return ids * 100 + classes * 10 + elements;
  };
  for (const block of sharedCss.matchAll(/@media[^{]*max-width[^{]*\\{([\\s\\S]*?)\\n\\}/g)) {
    for (const rule of block[1].matchAll(/([^{}]+)\\{([^{}]*)\\}/g)) {
      if (!/grid-template-columns/.test(rule[2])) continue;
      for (const sel of rule[1].split(",")) {
        // the subject is the rightmost compound: that is what the page also targets
        const subject = (sel.trim().split(/[\\s>+~]+/).pop() || "");
        const cls = (subject.match(/\\.([a-zA-Z][\\w-]*)/) || [])[1];
        if (!cls) continue;
        const w = spec(sel);
        if (!weight.has(cls) || weight.get(cls) < w) weight.set(cls, w);
      }
    }
  }
  return weight;
})();
const PAGE_RULE_WEIGHT = 10;   // a bare .class in the page's own <style>`,
    "mobileCovered tail");

  /* ── the check ──────────────────────────────────────────────────────────── */
  js = must(js,
    `      if (sharedMobile.has(cls) || pageMobile.has(cls)) continue;
      warnings.push(\`\${page}: .\${cls} is \${repeated ? "multi" : count}-column but has no mobile breakpoint — add it to the MOBILE block in style.css\`);`,
    `      if (pageMobile.has(cls)) continue;
      if (sharedMobile.has(cls)) {
        // Mentioned in a mobile block — but does it actually win? style.css is
        // parsed before this page's <style>, so equal weight loses on order.
        const w = sharedGridWeight.get(cls);
        if (w !== undefined && w <= PAGE_RULE_WEIGHT) {
          errors.push(\`\${page}: .\${cls} collapses in style.css at the same specificity as the page's own rule, \`
            + \`so the page wins on order and the grid never collapses — give the mobile rule more weight (e.g. "body .\${cls}")\`);
        }
        continue;
      }
      warnings.push(\`\${page}: .\${cls} is \${repeated ? "multi" : count}-column but has no mobile breakpoint — add it to the MOBILE block in style.css\`);`,
    "page-local grid check");

  /* ── booking.selectDate is read from JS, like the other calendar strings ── */
  js = must(js,
    `/^booking\\.saving$/, /^booking\\.datePast$/,`,
    `/^booking\\.saving$/, /^booking\\.datePast$/, /^booking\\.selectDate$/,`,
    "JS_KEYS");

  write(FILE, js);
  console.log("check-site.mjs: grid-order rule added");
}
