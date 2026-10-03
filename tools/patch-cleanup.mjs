/* Removes dead code and the regressions introduced earlier on 2026-10-01.

   DEAD (P3): #mouthHero / .mouth-scene / .mouth-hero-panel / .hero-after /
   .mouth-scroll-cue appear in zero HTML files — index.html was rewritten to the
   #mouthStage + #mouthWindow model and the old hero markup went with it. So
   style.css's "Home: the page opens inside the mouth" section and
   initMouthHero() in main.js are unreachable everywhere, not just on mobile.
   That section also held the file's only 700px breakpoint, inconsistent with the
   900/960/680 set used elsewhere.

   REGRESSIONS (P1), all mine, from the mobile block added the same day:
   - `#loader .loader-stage { width:100%; height:100% }` is a no-op: the element
     is already `position:absolute; inset:0`. The comment claiming it prevents
     overflow was wrong, so it goes too.
   - `.mouth-window { font-size: 15px }` was declared twice in the same band.
   - `body[dir="rtl"] .nav-row { flex-direction: row-reverse }` was duplicated.

   node tools/patch-cleanup.mjs */

import { read, write } from "./lib/edit.mjs";

/* ── style.css: drop the dead hero section ────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  const lines = css.split("\n");

  const start = lines.findIndex(l => l.includes("/* ---------- Home: the page opens inside the mouth ---------- */"));
  if (start === -1) {
    console.log("style.css: dead hero section already removed");
  } else {
    // ends where the next top-level section comment begins
    let end = start + 1;
    while (end < lines.length && !/^\/\* =====/.test(lines[end])) end++;

    const removed = lines.slice(start, end);
    // safety: refuse if anything in the block is still referenced in markup
    const guard = ["mouth-stage", "mouth-window", "teeth-nav", "lang-teeth", "tooth"];
    const touchesLive = removed.some(l => guard.some(g => l.includes("." + g + " ") || l.startsWith("." + g)));
    if (touchesLive) {
      console.error("style.css: ABORT — the block references live classes, inspect by hand");
      process.exit(1);
    }

    lines.splice(start, end - start,
      "/* The old scroll-zoom home hero (.mouth-hero / .mouth-scene / .mouth-hero-panel",
      "   / .hero-after / .mouth-scroll-cue) was removed on 2026-10-01: index.html was",
      "   rewritten to the #mouthStage + #mouthWindow model and that markup no longer",
      "   exists in any page, so ~60 lines of CSS and initMouthHero() were unreachable.",
      "   The file's only 700px breakpoint went with it. */",
      "");
    css = lines.join("\n");
    write(FILE, css);
    console.log(`style.css: removed ${end - start} dead lines (the .mouth-hero section)`);
  }
}

/* ── style.css: my duplicates and the no-op ───────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  const before = css;

  // the no-op loader rule and its wrong comment
  css = css.replace(
`/* ── MOBILE: the mouth banner ──
   The stage image is a 42vh banner here, so the loader's 1080p master is never
   needed — main.js already caps the upgrade at 1200px wide. The reveal still
   plays, so keep it from overflowing a short viewport. */
@media (max-width: 900px) {
  #loader .loader-stage { width: 100%; height: 100%; }
  .mouth-window { font-size: 15px; }
}
`, "");

  // the duplicated RTL nav-row (keep the first, in the desktop RTL block)
  css = css.replace(
`@media (max-width: 900px) {
  body[dir="rtl"] .site-header .nav-row { flex-direction: row-reverse; }
  body[dir="rtl"] .site-header .lang-switch { flex-direction: row-reverse; }
  body[dir="rtl"] .mouth-window { text-align: right; }
}
`, "");

  if (css !== before) { write(FILE, css); console.log("style.css: removed the no-op loader rule, the duplicate font-size and the duplicate RTL nav-row"); }
  else console.log("style.css: duplicates already removed");
}

/* ── main.js: drop initMouthHero ──────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);

  if (!js.includes("initMouthHero")) {
    console.log("main.js: initMouthHero already removed");
  } else {
    const lines = js.split("\n");
    const start = lines.findIndex(l => l.startsWith("function initMouthHero()"));
    if (start === -1) { console.error("main.js: could not locate initMouthHero"); process.exit(1); }
    let depth = 0, end = start;
    for (let i = start; i < lines.length; i++) {
      depth += (lines[i].match(/\{/g) || []).length;
      depth -= (lines[i].match(/\}/g) || []).length;
      if (depth === 0 && i > start) { end = i + 1; break; }
    }
    lines.splice(start, end - start,
      "/* initMouthHero() was removed on 2026-10-01 — the #mouthHero markup it drove no",
      "   longer exists in any page, so it returned immediately everywhere. */");
    js = lines.join("\n").replace(/^\s*initMouthHero\(\);\s*$\n/m, "");
    write(FILE, js);
    console.log(`main.js: removed initMouthHero (${end - start} lines) and its call site`);
  }
}
