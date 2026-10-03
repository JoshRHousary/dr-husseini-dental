/* The loader <video> carried preload="auto", so the browser starts fetching the
   clip during HTML parse — before DOMContentLoaded, and therefore before
   initLoader() gets the chance to remove it on mobile or on an inner page that
   discards it. Mobile would still have paid for the 2.7MB.

   Ship preload="none" in the markup and let the desktop path opt in.

   node tools/patch-preload.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── markup template (patch-heads.mjs owns the <video> element) ───────────── */
{
  const FILE = "tools/patch-heads.mjs";
  let s = read(FILE);
  if (s.includes('preload="none"')) {
    console.log("patch-heads.mjs: template already uses preload=\"none\"");
  } else {
    s = must(s, 'preload="auto"', 'preload="none"', "video template");
    write(FILE, s);
    console.log("patch-heads.mjs: template now ships preload=\"none\"");
  }
}

/* ── the pages themselves ─────────────────────────────────────────────────── */
{
  const PAGES = ["index.html", "about.html", "services.html", "booking.html",
                 "contact.html", "blog.html", "blog/post.html"];
  let n = 0;
  for (const page of PAGES) {
    let html = read(page);
    if (!html.includes('class="loader-video" muted playsinline preload="auto"')) continue;
    html = html.replace('class="loader-video" muted playsinline preload="auto"',
                        'class="loader-video" muted playsinline preload="none"');
    if (write(page, html)) { n++; console.log("patched", page); }
  }
  console.log(`${n} page(s) switched to preload="none"`);
}

/* ── desktop opts back in ─────────────────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);
  if (js.includes('video.preload = "auto"')) {
    console.log("main.js: desktop already opts into preloading");
  } else {
    js = must(js,
`  if (video) upgradeLoaderQuality(video);`,
`  if (video) {
    // the markup ships preload="none" so phones and inner pages never fetch the
    // clip; the desktop intro opts back in here, once we know it will be used
    video.preload = "auto";
    upgradeLoaderQuality(video);
  }`,
      "upgradeLoaderQuality call");
    write(FILE, js);
    console.log("main.js: desktop sets preload=\"auto\" before playing");
  }
}
