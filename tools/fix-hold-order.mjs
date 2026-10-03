/* Fixes the order of the intro hand-over.

   The first cut added `labels-in` immediately, while #loader (z-index 9999) was
   still covering the whole viewport — so the labels animated underneath an
   opaque overlay and were simply already there by the time it cleared. Nobody
   would ever see them appear, which is the whole point of the change.

   Correct order:
     1. the mouth reaches fully open and HOLDS there, steady
     2. the loader fades out — invisible, because the frame underneath is the
        same mouth-open.jpg at the same object-fit
     3. only then do the tooth labels fade in, on the live stage

   node tools/fix-hold-order.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "assets/js/main.js";
let js = read(FILE);

js = must(js,
`  function holdThenHandOver() {
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
  }`,
`  function holdThenHandOver() {
    if (done) return;
    done = true;

    // 1. hold on the fully-open mouth — nothing moves
    setTimeout(() => {
      // 2. fade the overlay out. Invisible: the stage underneath is the same
      //    mouth-open.jpg at the same object-fit.
      loader.classList.add("loader-done");

      setTimeout(() => {
        // #loader is z-index 9999 with no pointer-events rule — every
        // interactive layer sits below it, so it MUST come out or the site is
        // unclickable.
        loader.remove();

        // 3. now that the real stage is showing, the labels arrive on the teeth
        if (stage) {
          stage.classList.remove("labels-pending");
          stage.classList.add("labels-in");
        }
      }, FADE_MS);
    }, HOLD_MS);
  }`,
  "holdThenHandOver");

js = must(js,
  "// how long the fully-open mouth is held while the labels come in\nconst HOLD_MS = 900;",
  "// how long the fully-open mouth is held, steady, before handing over\nconst HOLD_MS = 700;\n"
  + "// the overlay's fade to the identical stage image behind it\nconst FADE_MS = 380;",
  "timing constants");

write(FILE, js);
console.log("main.js: hold -> fade -> labels, in that order");
