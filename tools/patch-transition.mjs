/* Wire the shine-and-smile menu transition into all 7 pages.

   Run: node tools/patch-transition.mjs

   Three insertions per page:

   1. An inline <head> script. It reads and immediately REMOVES the one-shot
      sessionStorage baton and sets html.dh-arriving, so the cover is up
      before first paint. Inline and in the head on purpose: an external file
      would paint the new page first and the smile would arrive over a flash
      of it. Removing the flag on read is what stops a plain refresh from
      replaying the opening half.

   2. The overlay, first thing in <body> so it parses before the stage. It
      carries no `hidden` attribute: the arriving page has to be able to show
      it from CSS alone, before any JS runs.

   3. assets/js/mouth-transition.js, after drill.js.

   blog/post.html sits one level down, so its paths are prefixed ../ — same
   convention the rest of the page already uses. */
import { read, write, must } from "./lib/edit.mjs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

const headScript = `<script>/* cover before first paint if we arrived through the smile */(function(){try{if(sessionStorage.getItem("dh_pt")){sessionStorage.removeItem("dh_pt");if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.className+=" dh-arriving";}}}catch(e){}})();</script>`;

const overlay = (base) => `<div class="page-transition" id="pageTransition" aria-hidden="true">
  <img class="pt-still" id="ptStill" src="${base}assets/media/mouth-smile.jpg" alt="">
  <video class="pt-clip" id="ptClose" muted playsinline preload="none"><source src="${base}assets/media/smile-close-fast.mp4" type="video/mp4"></video>
  <video class="pt-clip" id="ptOpen" muted playsinline preload="none"><source src="${base}assets/media/smile-open-fast.mp4" type="video/mp4"></video>
  <div class="pt-gleam"></div>
</div>`;

let touched = 0;
for (const page of PAGES) {
  const base = page.includes("/") ? "../" : "";
  let html = read(page);

  if (html.includes("mouth-transition.js")) {
    console.log(`${page}: already wired`);
    continue;
  }

  html = must(html, "</head>", `${headScript}\n</head>`, `${page} head`);

  html = must(html, /(<body[^>]*>\n)/, `$1${overlay(base)}\n`, `${page} body`);

  html = must(
    html,
    new RegExp(`(<script src="${base}assets/js/drill\\.js"></script>)`),
    `$1\n<script src="${base}assets/js/mouth-transition.js"></script>`,
    `${page} scripts`
  );

  if (write(page, html)) { touched++; console.log(`${page}: wired`); }
}
console.log(`${touched} page(s) updated`);
