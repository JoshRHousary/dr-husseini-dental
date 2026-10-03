/* Removes what the stage-intro change orphaned:

   1. upgradeLoaderQuality() in main.js — superseded by chooseIntroEncode().
   2. The mobile .loader-still rule, whose element no longer exists, and whose
      comment describes a stills path that has been deleted (mobile now plays the
      same clip as desktop — that was the point of "same everything").
   3. The older "TOOTH LABELS APPEAR" block, now duplicated by the labels rules
      inside the stage-intro block. Two copies of the same selectors is how the
      next person introduces a specificity bug.

   node tools/patch-intro-cleanup.mjs */

import { read, write } from "./lib/edit.mjs";

/* ── main.js ──────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);
  const before = js;

  js = js.replace(
`/* The loader ships the 720p cut (2.7MB) so it starts fast everywhere, and swaps
   in the 1080p master (5.7MB) only on a wide screen with a connection that can
   take it. data-hq on the <video> holds the 1080p path. */
function upgradeLoaderQuality(video) {
  const hq = video.getAttribute("data-hq");
  if (!hq) return;
  if (window.innerWidth < 1200 || window.devicePixelRatio < 1) return;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c && (c.saveData || /^(slow-)?2g$|^3g$/.test(c.effectiveType || ""))) return;
  const source = video.querySelector("source");
  if (source) source.setAttribute("src", hq); else video.src = hq;
  video.load();
}

`, "");

  if (js !== before) { write(FILE, js); console.log("main.js: upgradeLoaderQuality removed (chooseIntroEncode replaces it)"); }
  else console.log("main.js: already clean");
}

/* ── style.css ────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  const before = css;

  // 2. the orphaned mobile stills rule
  css = css.replace(
`/* ── Intro on mobile ──
   The clip is 16:9; in a 390x844 portrait viewport object-fit: cover crops ~74%
   of the frame away, leaving the mouth-opening unrecognisable. main.js skips the
   video under 900px and runs the stills path instead; this frames the stills for
   portrait. The old 2.4x reveal zoom no longer exists — the intro now holds on
   the open mouth rather than transitioning into the page. */
@media (max-width: 900px) {
  .loader-still { object-position: 50% 42%; }
}

`,
`/* The intro on mobile is the same clip, the same frames and the same timing as
   desktop — the mouth-stage-video rules handle its framing, matching
   .mouth-stage-img exactly at this breakpoint. */

`);

  // 3. the duplicated labels block
  const dupStart = css.indexOf(`/* ═══════════════════════════════════════════════════════════════════════════
   ── TOOTH LABELS APPEAR ──`);
  if (dupStart !== -1) {
    // it ends at the next top-level banner comment
    const next = css.indexOf("/* ═══════════════════════════════════════════════════════════════════════════", dupStart + 10);
    const end = next === -1 ? css.length : next;
    css = css.slice(0, dupStart) + css.slice(end);
    console.log("style.css: duplicated TOOTH LABELS APPEAR block removed");
  }

  if (css !== before) { write(FILE, css); console.log("style.css: orphans cleaned"); }
  else console.log("style.css: already clean");
}
