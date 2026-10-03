/* §1 — the intro stops being a transition.

   Before: the mouth opened, then the loader played a 1.1s "reveal" — a radial
   mask expanding from the throat while the whole stage scaled to 2.4x — which
   read as a hand-off from an intro animation to a separate website.

   After: the animation holds on the fully-open mouth, the tooth labels fade in,
   and the loader is removed with no animation at all. Because `.mouth-stage-img`
   is the same mouth-open.jpg at the same object-fit, the swap is invisible —
   the intro's last frame IS the site.

   The held-open state already existed: stillOpen/stillClose end with
   .loader-open at opacity 1 / scale 1, and the old code simply waited 200ms
   before throwing it away.

   #loader is position:fixed z-index:9999 with no pointer-events rule, and every
   interactive layer sits below it (.teeth-nav z3, .mouth-window z2, header z500,
   float z600). It must still be REMOVED — just without animating. Holding it
   forever would make the entire site unclickable.

   node tools/patch-intro-hold.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── CSS ──────────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  if (css.includes("loader-hold")) {
    console.log("style.css: intro hold already applied");
  } else {
    // drop @property --r, the mask, and both reveal/zoom animations
    css = must(css,
`@property --r { syntax: "<percentage>"; inherits: false; initial-value: 0%; }
#loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #F6F1E7;
  --r: 0%;
  --loader-zoom: 2.4;
  -webkit-mask-image: radial-gradient(ellipse var(--r) var(--r) at 50% 45%, transparent 98%, #000 100%);
          mask-image: radial-gradient(ellipse var(--r) var(--r) at 50% 45%, transparent 98%, #000 100%);
}
#loader.loader-reveal { animation: loaderReveal 1.1s cubic-bezier(.7,0,.2,1) forwards; }
@keyframes loaderReveal { from { --r: 0%; } to { --r: 150%; } }
.loader-stage {
  position: absolute; inset: 0;
  transform-origin: 50% 45%;
}
#loader.loader-reveal .loader-stage { animation: loaderZoom 1.1s cubic-bezier(.7,0,.2,1) forwards; }
@keyframes loaderZoom { from { transform: scale(1); } to { transform: scale(var(--loader-zoom, 2.4)); } }`,
`/* The intro does not transition into the site — it holds on the fully-open
   mouth, which is the same image the stage itself shows, so handing over is
   invisible. No mask, no zoom. */
#loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #F6F1E7;
  transition: opacity .35s linear;
}
/* the held frame: nothing moves, the labels come in over the top */
#loader.loader-hold { opacity: 1; }
/* a short fade only to cover the swap to the identical stage image */
#loader.loader-done { opacity: 0; pointer-events: none; }
.loader-stage {
  position: absolute; inset: 0;
  transform-origin: 50% 45%;
}`,
      "loader block");

    // the @supports fallback was only for the mask
    css = must(css,
`/* browsers without @property/mask animation: plain fade */
@supports not (mask-image: radial-gradient(#000, #000)) and not (-webkit-mask-image: radial-gradient(#000, #000)) {
  #loader.loader-reveal { animation: none; opacity: 0; transition: opacity .7s; }
}`,
`/* (the @supports mask fallback went with the mask itself) */`,
      "supports fallback");

    // the mobile --loader-zoom override has nothing left to drive
    css = css.replace(
      "  .loader-still { object-position: 50% 42%; }\n  #loader { --loader-zoom: 1.6; }\n",
      "  .loader-still { object-position: 50% 42%; }\n");

    /* ── labels appear on the held mouth ──────────────────────────────────── */
    css += `

/* ═══════════════════════════════════════════════════════════════════════════
   ── TOOTH LABELS APPEAR ──
   The intro holds on the open mouth and the labels arrive afterwards, so the
   teeth read as empty enamel first and then as a menu. .labels-in is added to
   .mouth-stage by initLoader once the mouth is fully open.
   ═══════════════════════════════════════════════════════════════════════════ */

@media (min-width: 901px) {
  /* start hidden only when JS is driving the sequence, so a no-JS or
     reduced-motion visitor never loses the menu */
  .mouth-stage.labels-pending .tooth,
  .mouth-stage.labels-pending .lang-teeth button {
    opacity: 0;
    transform: translateY(4px);
  }
  .mouth-stage.labels-in .tooth,
  .mouth-stage.labels-in .lang-teeth button {
    opacity: 1;
    transform: translateY(0);
    transition: opacity .45s var(--ease), transform .45s var(--ease);
  }
  /* staggered from the centre outwards, so the smile "fills in" */
  .mouth-stage.labels-in .tooth:nth-child(3),
  .mouth-stage.labels-in .tooth:nth-child(4) { transition-delay: .00s; }
  .mouth-stage.labels-in .tooth:nth-child(2),
  .mouth-stage.labels-in .tooth:nth-child(5) { transition-delay: .07s; }
  .mouth-stage.labels-in .tooth:nth-child(1),
  .mouth-stage.labels-in .tooth:nth-child(6) { transition-delay: .14s; }
  .mouth-stage.labels-in .lang-teeth button { transition-delay: .20s; }
}

@media (prefers-reduced-motion: reduce) {
  .mouth-stage.labels-pending .tooth,
  .mouth-stage.labels-pending .lang-teeth button { opacity: 1; transform: none; }
  .mouth-stage.labels-in .tooth,
  .mouth-stage.labels-in .lang-teeth button { transition: none; transition-delay: 0s; }
}
`;

    write(FILE, css);
    console.log("style.css: reveal/zoom removed, hold + label reveal added");
  }
}

/* ── JS ───────────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);

  if (js.includes("holdThenHandOver")) {
    console.log("main.js: intro hold already applied");
  } else {
    js = must(js,
`  let done = false;
  function reveal() {
    if (done) return;
    done = true;
    loader.classList.add("loader-reveal");
    setTimeout(() => loader.remove(), 1300);
  }`,
`  const stage = document.getElementById("mouthStage");
  // Hide the labels up front ONLY when we are going to animate them in, so a
  // failure anywhere in this function can never leave the menu invisible.
  if (stage) stage.classList.add("labels-pending");

  let done = false;

  /* The mouth is fully open. Hold it there, bring the labels in over the top,
     then hand over to the identical stage image underneath. */
  function holdThenHandOver() {
    if (done) return;
    done = true;

    // labels arrive on the held frame
    if (stage) {
      stage.classList.remove("labels-pending");
      stage.classList.add("labels-in");
    }

    // #loader is z-index 9999 with no pointer-events rule — every interactive
    // layer sits below it, so it MUST come out or the site is unclickable.
    setTimeout(() => {
      loader.classList.add("loader-done");
      setTimeout(() => loader.remove(), 400);
    }, HOLD_MS);
  }
  const reveal = holdThenHandOver;`,
      "reveal function");

    // hold duration, and the reduced-motion / skip paths must clear labels-pending
    js = must(js,
`function initLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;`,
`// how long the fully-open mouth is held while the labels come in
const HOLD_MS = 900;

function initLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;`,
      "initLoader head");

    js = must(js,
`  if ((seen && !replayOnHome) || reduce || skip) { loader.remove(); return; }`,
`  if ((seen && !replayOnHome) || reduce || skip) {
    // no intro: the labels must simply be there
    const s = document.getElementById("mouthStage");
    if (s) { s.classList.remove("labels-pending"); s.classList.add("labels-in"); }
    loader.remove();
    return;
  }`,
      "skip guard");

    write(FILE, js);
    console.log("main.js: reveal replaced with hold-then-hand-over");
  }
}
