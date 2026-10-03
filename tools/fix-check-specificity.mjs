/* Replaces the first cut of the specificity rule, which produced ~50 false
   positives out of 62 warnings — a gate that noisy just gets ignored.

   Two defects in the first version:
   1. CSS comments were not stripped, so a comment preceding a rule was parsed as
      part of its selector. That is where nonsense weights like (0,1,53) came
      from — every word in the comment counted as a type selector.
   2. It compared rules targeting DIFFERENT elements. `.mouth-window { font-size }`
      and `.mouth-window h1 { font-size }` both contain ".mouth-window", but the
      second targets h1, so there is no conflict. Only rules with the same
      SUBJECT (the rightmost compound selector) can override one another.

   This version compares subjects, and suppresses a warning when some other rule
   inside a max-width block already covers the same property at a specificity
   that can beat the base rule — which is how the RTL WhatsApp float is handled.

   node tools/fix-check-specificity.mjs */

import { read, write } from "./lib/edit.mjs";

const FILE = "tools/check-site.mjs";
let c = read(FILE);

const startMarker = "/* ── specificity: can each mobile rule actually win? ─────────────────────── */";
const endMarker = "/* ── mobile text and tap targets ─────────────────────────────────────────── */";

const start = c.indexOf(startMarker);
const end = c.indexOf(endMarker);
if (start === -1 || end === -1) {
  console.error("could not locate the specificity block");
  process.exit(1);
}

const replacement = `/* ── specificity: can each mobile rule actually win? ─────────────────────── */
// Media queries carry no weight of their own, so a base rule with higher
// specificity (and a later position) beats a max-width rule for the same
// property and the mobile layout silently never changes. This is exactly how
// the nav bug (body.home-mouth .primary-nav vs nav.primary-nav) and the footer
// bug (.mouth-window .footer-grid vs .footer-grid) happened.
//
// Only rules with the same SUBJECT — the rightmost compound selector — can
// override each other, so that is what gets compared.
{
  const stripComments = s => s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");

  const specificity = sel => [
    (sel.match(/#[\\w-]+/g) || []).length,
    (sel.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:(?:hover|focus|active|checked|disabled|not|is|where|nth-child|first-child|last-child)\\b/g) || []).length,
    (sel.match(/(?:^|[\\s>+~])(?:[a-zA-Z][\\w-]*)/g) || []).length
  ];
  const cmp = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);

  // the subject is the last compound: ".mouth-window h1" -> "h1"
  const subject = sel => {
    const parts = sel.trim().split(/[\\s>+~]+/).filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return last.replace(/::?[a-z-]+(\\([^)]*\\))?/g, "");  // drop pseudo-elements
  };

  const base = [];   // outside any media query
  const mobile = []; // inside a max-width query

  const collect = (text, into) => {
    const clean = stripComments(text);
    const re = /([^{}]+)\\{([^{}]*)\\}/g;
    let m;
    while ((m = re.exec(clean))) {
      const selPart = m[1].trim();
      if (!selPart || selPart.startsWith("@")) continue;
      const props = [...m[2].matchAll(/(?:^|;)\\s*([a-z-]+)\\s*:/g)].map(p => p[1]);
      if (!props.length) continue;
      for (const sel of selPart.split(",").map(s => s.trim()).filter(Boolean)) {
        if (sel.includes("%") || /^\\d/.test(sel)) continue;   // keyframe stops
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
    collect(src.slice(open + 1, j - 1), /max-width/.test(header) ? mobile : base);
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

      const key = \`\${r.sel}|\${b.sel}|\${clash.join(",")}\`;
      if (seen.has(key)) continue;
      seen.add(key);
      warnings.push(
        \`style.css: mobile rule "\${r.sel}" cannot override base rule "\${b.sel}" \`
        + \`for \${clash.join(", ")} (\${b.spec.join(",")} beats \${r.spec.join(",")}) — raise the mobile selector's specificity\`);
    }
  }
}

`;

c = c.slice(0, start) + replacement + c.slice(end);
write(FILE, c);
console.log("check-site.mjs: specificity rule rewritten (comments stripped, subjects compared, rescues honoured)");
