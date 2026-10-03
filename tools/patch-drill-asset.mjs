/* Swaps the drill's hand-drawn SVG styling for the Higgsfield handpiece image.

   The brief (CLAUDE.md, "Design direction") specifies that motion design is
   generated via Higgsfield; the first implementation used an inline SVG, which
   was the wrong call. The asset is now assets/media/tool-drill.webp — generated
   with gpt_image_2_5, background removed with Higgsfield's remover, cropped to
   the head and burr, 14KB.

   node tools/patch-drill-asset.mjs */

import { read, write } from "./lib/edit.mjs";

const FILE = "assets/css/style.css";
let css = read(FILE);

const start = css.indexOf("/* ═══════════════════════════════════════════════════════════════════════════\n   ── DENTAL DRILL ──");
if (start === -1) throw new Error("drill block not found");

// everything from the drill banner to the end of that block
const endMarker = "@media (prefers-reduced-motion: reduce) {\n  .drill { display: none; }\n  .link-drilling::before { animation: none; transform: scaleX(1); }\n}\n";
const endIdx = css.indexOf(endMarker, start);
if (endIdx === -1) throw new Error("drill block end not found");

const replacement = `/* ═══════════════════════════════════════════════════════════════════════════
   ── DENTAL DRILL ──
   The handpiece is assets/media/tool-drill.webp, generated with Higgsfield and
   cut out with its background remover. One node is injected into .mouth-stage by
   assets/js/drill.js and moved to whichever tooth is active.

   Sized in cqw against .mouth-stage (container-type: inline-size), so the drill
   scales with the mouth rather than the viewport.
   ═══════════════════════════════════════════════════════════════════════════ */

.drill {
  position: absolute;
  z-index: 4;                      /* above .teeth-nav (3), below the header */
  width: 3.6cqw;
  pointer-events: none;
  opacity: 0;
  /* anchored at the burr tip, so it pivots about the point that touches enamel */
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%) translateY(-42%) rotate(-9deg);
  filter: drop-shadow(0 .5cqw .7cqw rgba(10, 62, 58, .5));
}
.drill-img { display: block; width: 100%; height: auto; }

/* the bite mark where the burr meets the tooth */
.drill-spark {
  position: absolute;
  left: 50%; bottom: 0;
  width: .9cqw; height: .9cqw;
  margin-left: -.45cqw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,236,210,.6) 45%, transparent 70%);
  opacity: 0;
}

@media (min-width: 901px) {
  .drill.drill-run { animation: drillIn .40s cubic-bezier(.3,.9,.3,1) forwards; }
  /* the handpiece chatters once it is in contact */
  .drill.drill-run .drill-img { animation: drillBite .07s linear .34s infinite; }
  .drill.drill-run .drill-spark { animation: drillSpark .34s ease-out .36s infinite; }
}

@keyframes drillIn {
  0%   { opacity: 0; transform: translate(-50%, -100%) translateY(-120%) rotate(-18deg); }
  60%  { opacity: 1; transform: translate(-50%, -100%) translateY(-6%)   rotate(-4deg); }
  78%  { transform: translate(-50%, -100%) translateY(3%) rotate(-1deg); }
  100% { opacity: 1; transform: translate(-50%, -100%) translateY(0%)   rotate(-2deg); }
}
@keyframes drillBite {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(.9px); }
}
@keyframes drillSpark {
  0%   { opacity: 0; transform: scale(.4); }
  30%  { opacity: .9; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.5) translateY(.3cqw); }
}

/* the tooth being worked on */
.tooth.tooth-drilled { background: #B23F38; color: #FFF7F0; }

/* ── mobile: no teeth on screen, so the drawer link does the work ── */
.link-drilling { position: relative; color: var(--primary) !important; }
.link-drilling::before {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 6px;
  height: 2px;
  background: var(--accent);
  transform-origin: left;
  animation: linkDrill .46s cubic-bezier(.3,.9,.3,1) forwards;
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

css = css.slice(0, start) + replacement + css.slice(endIdx + endMarker.length);
write(FILE, css);
console.log("style.css: drill now uses the Higgsfield handpiece image");
