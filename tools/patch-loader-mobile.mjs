/* Wires up the two hooks the mobile block referenced but that did not exist yet,
   and makes the intro behave on phones.

   1. --loader-zoom: the reveal's scale was hardcoded at 2.4 inside
      @keyframes loaderZoom, so it could not be toned down per breakpoint. On a
      portrait screen the 16:9 source is already upscaled ~3.85x by object-fit:
      cover before the 2.4x zoom compounds it.
   2. body.page-booking: needed so the sticky WhatsApp float can be suppressed on
      the one page whose own primary CTA is the same action.
   3. initLoader(): under 900px skip the <video> entirely and run the existing,
      already-tested .loader-fallback stills path; and honour the per-session
      guard on mobile even on the home page, which deliberately bypasses it.

   node tools/patch-loader-mobile.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── 1. make the zoom a variable ──────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  if (css.includes("--loader-zoom: 2.4")) {
    console.log("style.css: --loader-zoom already defined");
  } else {
    css = must(css,
      "  --r: 0%;\n",
      "  --r: 0%;\n  --loader-zoom: 2.4;\n",
      "#loader custom properties");
    css = must(css,
      "@keyframes loaderZoom { from { transform: scale(1); } to { transform: scale(2.4); } }",
      "@keyframes loaderZoom { from { transform: scale(1); } to { transform: scale(var(--loader-zoom, 2.4)); } }",
      "loaderZoom keyframes");
    write(FILE, css);
    console.log("style.css: loader zoom is now --loader-zoom (2.4 desktop, 1.6 mobile)");
  }
}

/* ── 2. body.page-booking ─────────────────────────────────────────────────── */
{
  const FILE = "booking.html";
  let html = read(FILE);
  if (html.includes("page-booking")) {
    console.log("booking.html: already has page-booking");
  } else {
    html = must(html, '<body class="home-mouth">', '<body class="home-mouth page-booking">', "booking body tag");
    write(FILE, html);
    console.log("booking.html: body.page-booking added");
  }
}

/* ── 3. initLoader on mobile ──────────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);

  if (js.includes("mobileIntro")) {
    console.log("main.js: initLoader already mobile-aware");
  } else {
    // (a) session guard: the is-home bypass is a desktop choice
    js = must(js,
`  const isHome = document.body.classList.contains("is-home");
  // the home page always opens with the mouth intro; inner pages only when they are the first page of the visit
  if ((seen && !isHome) || reduce || skip) { loader.remove(); return; }`,
`  const isHome = document.body.classList.contains("is-home");
  // On a phone the clip is 2.7MB and the stills carry the reveal just as well,
  // so mobile uses the stills path and never fetches the video.
  const mobileIntro = window.innerWidth <= 900;
  // The home page always reopens with the intro by design — but only where
  // bandwidth is cheap. On mobile it would re-download the clip every visit, so
  // the per-session guard applies there too.
  const replayOnHome = isHome && !mobileIntro;
  if ((seen && !replayOnHome) || reduce || skip) { loader.remove(); return; }`,
      "initLoader guards");

    // (b) skip the video element on mobile
    js = must(js,
`  const video = loader.querySelector(".loader-video");
  if (video) upgradeLoaderQuality(video);`,
`  const video = mobileIntro ? null : loader.querySelector(".loader-video");
  if (mobileIntro) {
    // drop the <video> so no network request is made at all
    const el = loader.querySelector(".loader-video");
    if (el) el.remove();
  }
  if (video) upgradeLoaderQuality(video);`,
      "video selection");

    write(FILE, js);
    console.log("main.js: mobile uses the stills path, skips the video, honours the session guard");
  }
}
