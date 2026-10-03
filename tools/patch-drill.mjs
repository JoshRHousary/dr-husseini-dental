/* §2 — the dental drill.

   Adds the drill stylesheet block, loads assets/js/drill.js on every page, and
   calls its init from main.js.

   node tools/patch-drill.mjs */

import { read, write, must } from "./lib/edit.mjs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

/* ── 1. stylesheet ────────────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  if (css.includes("── DENTAL DRILL ──")) {
    console.log("style.css: drill block already present");
  } else {
    css += `

/* ═══════════════════════════════════════════════════════════════════════════
   ── DENTAL DRILL ──
   Hovering a tooth brings a handpiece down onto it. The SVG is injected once
   into .mouth-stage by assets/js/drill.js and moved to whichever tooth is
   active, so there is one node rather than one per tooth.

   Sized in cqw against .mouth-stage (which is container-type: inline-size), so
   the drill scales with the mouth rather than with the viewport.
   ═══════════════════════════════════════════════════════════════════════════ */

.drill {
  position: absolute;
  z-index: 4;                     /* above .teeth-nav (3), below the header */
  width: 4.2cqw;
  height: auto;
  pointer-events: none;
  opacity: 0;
  /* the handpiece hangs above the tooth and swings down onto it */
  transform: translate(-50%, -100%) translateY(-14%) rotate(-7deg);
  transform-origin: 50% 0;
  filter: drop-shadow(0 .4cqw .6cqw rgba(10, 62, 58, .45));
}

.drill .drill-spray circle { fill: #CFE9F5; opacity: 0; }

@media (min-width: 901px) {
  .drill.drill-run {
    animation: drillIn .42s cubic-bezier(.3,.9,.3,1) forwards;
  }
  .drill.drill-run .drill-burr {
    animation: drillBurr .09s linear .34s infinite;
    transform-origin: 20px 96px;
  }
  .drill.drill-run .drill-spray circle {
    animation: drillSpray .5s ease-out .4s infinite;
  }
}

@keyframes drillIn {
  0%   { opacity: 0; transform: translate(-50%, -100%) translateY(-55%) rotate(-14deg); }
  55%  { opacity: 1; transform: translate(-50%, -100%) translateY(-4%)  rotate(-2deg); }
  70%  { transform: translate(-50%, -100%) translateY(2%) rotate(0deg); }
  100% { opacity: 1; transform: translate(-50%, -100%) translateY(0%)  rotate(-1deg); }
}
/* the burr chatters against the enamel rather than spinning visibly */
@keyframes drillBurr {
  0%, 100% { transform: translateY(0) scaleX(1); }
  50%      { transform: translateY(.6px) scaleX(.88); }
}
@keyframes drillSpray {
  0%   { opacity: 0; transform: translate(0, 0) scale(.5); }
  35%  { opacity: .85; }
  100% { opacity: 0; transform: translate(0, 6px) scale(1.25); }
}

/* the tooth being worked on */
.tooth.tooth-drilled { background: #B23F38; color: #FFF7F0; }

/* ── mobile: no teeth on screen, so the drawer link does the work ── */
.link-drilling {
  position: relative;
  color: var(--primary) !important;
}
.link-drilling::before {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 6px;
  height: 2px;
  background: var(--accent);
  transform-origin: left;
  animation: linkDrill .42s cubic-bezier(.3,.9,.3,1) forwards;
}
@keyframes linkDrill {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .drill { display: none; }
  .link-drilling::before { animation: none; transform: scaleX(1); }
}
`;
    write(FILE, css);
    console.log("style.css: drill block added");
  }
}

/* ── 2. load drill.js on every page, after main.js ────────────────────────── */
{
  let n = 0;
  for (const page of PAGES) {
    let html = read(page);
    if (html.includes("assets/js/drill.js") || html.includes("../assets/js/drill.js")) continue;

    const depth = (page.match(/\//g) || []).length;
    const base = "../".repeat(depth);
    const mainTag = `<script src="${base}assets/js/main.js"></script>`;
    if (!html.includes(mainTag)) { console.log("WARN", page, "- main.js tag not found"); continue; }

    html = html.replace(mainTag, `${mainTag}\n<script src="${base}assets/js/drill.js"></script>`);
    if (write(page, html)) { n++; console.log("patched", page); }
  }
  console.log(`${n} page(s) now load drill.js`);
}

/* ── 3. init it ───────────────────────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);
  if (js.includes("DH_DRILL")) {
    console.log("main.js: drill already initialised");
  } else {
    js = must(js,
`  initLangSwitch();
  initMobileNav();`,
`  initLangSwitch();
  initMobileNav();
  if (window.DH_DRILL) window.DH_DRILL.init();`,
      "DOMContentLoaded body");
    write(FILE, js);
    console.log("main.js: drill init added");
  }
}
