/* Stop the intro clip from being fetched before anyone has decided it will play.

   Run: node tools/patch-intro-preload.mjs

   Two edits to the stage <video> on all 7 pages:

     preload="auto" -> preload="none"
       The browser used to start the 2.8MB fetch at parse time, on every page,
       including the five-out-of-six loads where initStageIntro() removes the
       element a moment later because the intro already played this session.
       Nothing is requested now until main.js sets preload="auto" and calls
       load(), which it does only when the intro is actually going to run.

     data-hq="..." removed
       It pointed at a second, larger encode that chooseIntroEncode() swapped in
       at DOMContentLoaded - after the first fetch was already under way, so
       desktop downloaded both and watched one (9.41MB for a first visit). The
       two files were also different Kling takes rather than two sizes of one
       render, so the animation changed at 1200px. One encode now.

   lib/edit.mjs, not a hand-rolled regex: the files are CRLF and a multi-line
   pattern silently matches nothing otherwise - the lesson from the tel:+961
   patch that reported success on 6 pages it never touched. */
import { read, write } from "./lib/edit.mjs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

let touched = 0;
for (const page of PAGES) {
  const html = read(page);
  const tag = /<video class="mouth-stage-video"[^>]*>/.exec(html);
  if (!tag) { console.log(`${page}: no stage video found`); process.exitCode = 1; continue; }

  let next = tag[0]
    .replace(/\spreload="[^"]*"/, ' preload="none"')
    .replace(/\sdata-hq="[^"]*"/, "");

  if (!/preload="none"/.test(next)) {
    console.log(`${page}: could not set preload`); process.exitCode = 1; continue;
  }
  if (next === tag[0]) { console.log(`${page}: already patched`); continue; }

  if (write(page, html.replace(tag[0], next))) {
    touched++;
    console.log(`${page}: preload="none", data-hq dropped`);
  }
}
console.log(`${touched} page(s) updated`);
