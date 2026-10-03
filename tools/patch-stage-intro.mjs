/* §1+§2 — the animation becomes the stage, identically on every page.

   THE BUG: the intro was a full-viewport overlay (#loader, position:fixed,
   inset:0, object-fit:cover) handing over to the stage, which is a letterboxed
   box (min(100vw, 100vh*1.7872)) showing the whole image. Those are different
   scales and positions, so the mouth popped and shifted at hand-over. Measured:

       2560x1310 viewport ->  +9.3% scale, -61px shift
       1920x1000 viewport ->  +7.4% scale, -37px shift
       2560x1400 viewport ->  +2.3% scale, -16px shift

   Cross-fading two differently-scaled copies of the same picture is exactly what
   reads as a cut. Timing was never the problem.

   THE FIX: there is no overlay. The video lives INSIDE .mouth-stage, in the same
   box as .mouth-stage-img, so there is nothing to hand over and nothing can pop.
   It plays, holds on its last frame, then cross-fades to the identical still at
   identical geometry — imperceptible — and the labels arrive on the live stage.

   Also removes every per-page and per-device difference: one code path, same
   clip, same timing, all 7 pages, desktop and mobile.

   node tools/patch-stage-intro.mjs */

import { read, write, must } from "./lib/edit.mjs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

/* ── 1. markup: delete #loader, put the video in the stage ────────────────── */
{
  let n = 0;
  for (const page of PAGES) {
    let html = read(page);
    if (html.includes("mouth-stage-video")) { console.log("skip  ", page); continue; }

    const depth = (page.match(/\//g) || []).length;
    const base = "../".repeat(depth);

    // drop the overlay entirely
    const lStart = html.indexOf('<div id="loader" aria-hidden="true">');
    if (lStart !== -1) {
      const lEnd = html.indexOf("</div>\n", html.indexOf("</div>", html.indexOf("</video>", lStart))) + "</div>\n".length;
      html = html.slice(0, lStart) + html.slice(lEnd);
    }

    // the video becomes part of the stage, directly over the identical still
    html = must(html,
      `    <img class="mouth-stage-img" src="${base}assets/media/mouth-open.jpg" alt="">`,
      `    <img class="mouth-stage-img" src="${base}assets/media/mouth-open.jpg" alt="">\n`
      + `    <!-- The intro is not an overlay: it is the stage. Same box, same scale as\n`
      + `         the still above, so there is nothing to hand over and nothing can pop. -->\n`
      + `    <video class="mouth-stage-video" muted playsinline preload="auto" poster="${base}assets/media/mouth-closed.jpg" data-hq="${base}assets/media/loader-1080.mp4" aria-hidden="true"><source src="${base}assets/media/loader-720.mp4" type="video/mp4"></video>`,
      `${page}: stage img`);

    if (write(page, html)) { n++; console.log("patched", page); }
  }
  console.log(`${n} page(s) converted\n`);
}

/* ── 2. CSS ───────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  // remove the whole former loader block
  const start = css.indexOf("/* ---------- Loader (mouth-opening intro -> expands into the page) ---------- */");
  const end = css.indexOf("/* ---------- Hero ---------- */");
  if (start !== -1 && end !== -1) {
    css = css.slice(0, start)
      + `/* The intro used to be a full-viewport overlay that handed over to the stage.
   Those were different boxes — a cover-cropped viewport versus a letterboxed
   stage — so the mouth popped and shifted by up to 9% at the swap. The video now
   lives inside .mouth-stage instead; see "THE INTRO IS THE STAGE" below. */

`
      + css.slice(end);
  }

  if (!css.includes("── THE INTRO IS THE STAGE ──")) {
    css += `

/* ═══════════════════════════════════════════════════════════════════════════
   ── THE INTRO IS THE STAGE ──
   The clip sits in the same box as .mouth-stage-img, pixel for pixel, so there
   is no hand-over and nothing can shift. It plays, holds on its last frame, then
   cross-fades to the still underneath at identical geometry.

   Both elements must resolve their box the SAME way at every breakpoint — that
   identity is the entire fix, so keep them in step.
   ═══════════════════════════════════════════════════════════════════════════ */

.mouth-stage-video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: fill;              /* stage aspect == source aspect, so no distortion */
  display: block;
  z-index: 1;                    /* over the still, under .teeth-nav (3) */
  opacity: 1;
  transition: opacity .5s linear;
  pointer-events: none;
}
/* matches .mouth-stage-img exactly at this breakpoint */
@media (max-width: 900px) {
  .mouth-stage-video { object-fit: cover; object-position: 50% 45%; }
}
.mouth-stage-video.stage-video-done { opacity: 0; }

/* ── the labels arrive once the mouth is open and steady ── */
@media (min-width: 901px) {
  .mouth-stage.labels-pending .tooth,
  .mouth-stage.labels-pending .lang-teeth button,
  .mouth-stage.labels-pending .palate-nav a,
  .mouth-stage.labels-pending .palate-langs button,
  .mouth-stage.labels-pending .date-tooth {
    opacity: 0;
    transform: translateY(4px);
  }
  .mouth-stage.labels-in .tooth,
  .mouth-stage.labels-in .lang-teeth button,
  .mouth-stage.labels-in .palate-nav a,
  .mouth-stage.labels-in .palate-langs button,
  .mouth-stage.labels-in .date-tooth {
    opacity: 1;
    transform: translateY(0);
    /* slow and warm rather than snapping — the ousmaneballondor note in the brief */
    transition: opacity .6s var(--ease), transform .6s var(--ease);
  }
  /* staggered from the centre outwards, so the smile fills in */
  .mouth-stage.labels-in .tooth:nth-child(3),
  .mouth-stage.labels-in .tooth:nth-child(4) { transition-delay: .00s; }
  .mouth-stage.labels-in .tooth:nth-child(2),
  .mouth-stage.labels-in .tooth:nth-child(5) { transition-delay: .09s; }
  .mouth-stage.labels-in .tooth:nth-child(1),
  .mouth-stage.labels-in .tooth:nth-child(6) { transition-delay: .18s; }
  .mouth-stage.labels-in .lang-teeth button { transition-delay: .26s; }
}

@media (prefers-reduced-motion: reduce) {
  .mouth-stage-video { display: none; }
  .mouth-stage.labels-pending .tooth,
  .mouth-stage.labels-pending .lang-teeth button,
  .mouth-stage.labels-pending .palate-nav a,
  .mouth-stage.labels-pending .palate-langs button,
  .mouth-stage.labels-pending .date-tooth { opacity: 1; transform: none; }
  .mouth-stage.labels-in .tooth,
  .mouth-stage.labels-in .lang-teeth button,
  .mouth-stage.labels-in .palate-nav a,
  .mouth-stage.labels-in .palate-langs button,
  .mouth-stage.labels-in .date-tooth { transition: none; transition-delay: 0s; }
}
`;
  }

  write(FILE, css);
  console.log("style.css: loader block removed, stage-video block added");
}

/* ── 3. JS: one intro, same everywhere ────────────────────────────────────── */
{
  const FILE = "assets/js/main.js";
  let js = read(FILE);

  const start = js.indexOf("// how long the fully-open mouth is held, steady, before handing over");
  const end = js.indexOf("/* Home hero: scrolling dives into the mouth");
  if (start === -1 || end === -1) throw new Error("initLoader block not found");

  js = js.slice(0, start) + `/* ── The intro ───────────────────────────────────────────────────────────────
   Identical on every page and at every width: same clip, same frames, same
   timing. The only thing that varies is which encode is fetched, because that
   changes file size rather than what you see.

   The clip is part of the stage, not an overlay over it, so there is no
   hand-over and nothing can shift. */
const INTRO = {
  HOLD_MS: 600,      // hold on the final frame, fully open and steady
  FADE_MS: 500,      // cross-fade to the identical still — same box, so invisible
  LABELS_MS: 150,    // a beat before the labels arrive
  MAX_WAIT_MS: 9000, // never let a stalled clip hold the page hostage
  // Re-running a 5s animation on every navigation would make the site unusable,
  // so it plays once per visit; later pages open on the final frame. Flip this
  // if the intro should replay on every page.
  REPLAY_EVERY_PAGE: false
};

/* Pick the encode to fetch. Same frames and timing either way — only the file
   size differs, so this does not break "identical on every page". */
function chooseIntroEncode(video) {
  const hq = video.getAttribute("data-hq");
  if (!hq) return;
  if (window.innerWidth < 1200) return;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c && (c.saveData || /^(slow-)?2g$|^3g$/.test(c.effectiveType || ""))) return;
  const source = video.querySelector("source");
  if (source) source.setAttribute("src", hq); else video.src = hq;
  video.load();
}

function initStageIntro() {
  const stage = document.getElementById("mouthStage");
  if (!stage) return;
  const video = stage.querySelector(".mouth-stage-video");

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skip = location.href.indexOf("intro=off") !== -1;   // preview switch: ?intro=off
  let seen = false;
  try { seen = sessionStorage.getItem("dh_intro") === "1"; } catch (e) { /* private mode */ }

  function showLabels() {
    stage.classList.remove("labels-pending");
    stage.classList.add("labels-in");
  }

  // No intro: the stage is simply the open mouth, and the labels are just there.
  if (!video || reduce || skip || (seen && !INTRO.REPLAY_EVERY_PAGE)) {
    if (video) video.remove();
    showLabels();
    return;
  }

  try { sessionStorage.setItem("dh_intro", "1"); } catch (e) { /* ignore */ }
  stage.classList.add("labels-pending");
  chooseIntroEncode(video);

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    // hold on the open mouth, then cross-fade to the identical still beneath
    setTimeout(() => {
      video.classList.add("stage-video-done");
      setTimeout(() => {
        video.remove();
        setTimeout(showLabels, INTRO.LABELS_MS);
      }, INTRO.FADE_MS);
    }, INTRO.HOLD_MS);
  }

  // If the clip cannot play at all, drop it and show the stage — no stills
  // cross-fade, because that would be a different animation on some devices.
  function bail() {
    if (finished) return;
    finished = true;
    video.remove();
    showLabels();
  }

  video.addEventListener("ended", finish);
  video.addEventListener("error", bail);
  const src = video.querySelector("source");
  if (src) src.addEventListener("error", bail);

  const play = video.play();
  if (play && play.catch) play.catch(bail);

  setTimeout(() => { if (!finished) finish(); }, INTRO.MAX_WAIT_MS);
}


` + js.slice(end);

  js = must(js, "  initLoader();", "  initStageIntro();", "DOMContentLoaded call");

  write(FILE, js);
  console.log("main.js: initLoader replaced by initStageIntro (one path, all pages)");
}

/* ── 4. the build gate now looks for the stage video ──────────────────────── */
{
  const FILE = "tools/check-site.mjs";
  let c = read(FILE);
  c = c.replace(
    `  if (!html.includes('class="loader-video"')) errors.push(\`\${page}: loader video element missing\`);`,
    `  if (!html.includes('class="mouth-stage-video"')) errors.push(\`\${page}: stage intro video missing\`);`);
  c = c.replace(
    `  if (!html.includes('data-hq="')) warnings.push(\`\${page}: loader has no data-hq (no 1080p upgrade)\`);`,
    `  if (!html.includes('data-hq="')) warnings.push(\`\${page}: intro video has no data-hq (no 1080p encode)\`);`);
  if (c.includes("loader-video")) console.log("! check-site still references loader-video");
  write(FILE, c);
  console.log("check-site.mjs: retargeted to the stage video");
}
