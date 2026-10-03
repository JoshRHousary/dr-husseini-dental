/* §3 — the booking page becomes the mouth.

   The teeth stop being navigation and become the calendar: all 32 of them carry
   the dates of the month with the weekday symbol above each number. The menu
   moves to the palate (the ridged roof), the languages sit just above the uvula,
   and the page's text and form sit on the tongue.

   Regions were checked against the real anatomy with
   tools/preview-booking-layout.py — the first attempt put the menu on the upper
   teeth and the tongue panel over the lower ones.

   node tools/patch-booking-mouth.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "booking.html";
let html = read(FILE);

if (html.includes("palate-nav")) {
  console.log("booking.html: already converted");
  process.exit(0);
}

/* ── 1. teeth-nav + lang-teeth  ->  palate-nav + palate-langs + date teeth ── */
const oldStart = html.indexOf('    <nav class="teeth-nav" aria-label="Main">');
const oldEnd = html.indexOf('    <div class="mouth-window"', oldStart);
if (oldStart === -1 || oldEnd === -1) throw new Error("stage block not found");

const PALATE = [
  ["index.html",    "common.nav.home",     "Home",     41.3, 20.2, 5.8, 4.1],
  ["about.html",    "common.nav.about",    "About",    47.1, 20.2, 5.8, 4.1],
  ["services.html", "common.nav.services", "Services", 52.9, 20.2, 5.8, 4.1],
  ["booking.html",  "common.nav.booking",  "Booking",  41.3, 24.8, 5.8, 4.1],
  ["blog.html",     "common.nav.blog",     "Blog",     47.1, 24.8, 5.8, 4.1],
  ["contact.html",  "common.nav.contact",  "Contact",  52.9, 24.8, 5.8, 4.1],
];
const LANGS = [
  ["en", "EN", 44.6, 29.4, 3.5, 3.0],
  ["ar", "AR", 48.3, 29.4, 3.5, 3.0],
  ["fr", "FR", 52.0, 29.4, 3.5, 3.0],
];

const pos = (l, t, w, h) => `style="left:${l}%;top:${t}%;width:${w}%;height:${h}%"`;

const block =
`    <!-- On this page the teeth are the calendar, so the menu moves to the palate. -->
    <nav class="palate-nav" aria-label="Main">
${PALATE.map(([href, key, text, l, t, w, h]) =>
  `      <a href="${href}" data-i18n="${key}" ${pos(l, t, w, h)}${href === "booking.html" ? ' aria-current="page"' : ""}>${text}</a>`).join("\n")}
    </nav>
    <div class="lang-switch palate-langs" aria-label="Language">
${LANGS.map(([lang, text, l, t, w, h]) =>
  `      <button type="button" data-lang="${lang}" ${pos(l, t, w, h)}>${text}</button>`).join("\n")}
    </div>
    <!-- 32 date teeth, generated from assets/data/teeth-data.js by booking.js -->
    <div class="date-teeth" id="dateTeeth" role="group"></div>
`;

html = html.slice(0, oldStart) + block + html.slice(oldEnd);

/* ── 2. the content window moves onto the tongue ──────────────────────────── */
html = must(html,
  '    <div class="mouth-window" id="mouthWindow">',
  '    <div class="mouth-window tongue-window" id="mouthWindow">',
  "mouth-window");

/* ── 3. the grid calendar is gone; the month stepper moves into the tongue ── */
const calStart = html.indexOf('      <div class="calendar-wrap">');
const calEnd = html.indexOf('      <div class="booking-side">', calStart);
if (calStart === -1 || calEnd === -1) throw new Error("calendar block not found");

html = html.slice(0, calStart) +
`      <div class="month-stepper">
        <button type="button" id="prevMonth" class="calendar-nav-btn" aria-label="Previous month">&#8592;</button>
        <div id="monthLabel">Mouth of October 2026</div>
        <button type="button" id="nextMonth" class="calendar-nav-btn" aria-label="Next month">&#8594;</button>
      </div>
      <p class="pick-hint" data-i18n="booking.pickOnTeeth">Pick a date on the teeth.</p>

` + html.slice(calEnd);

/* ── 4. the tooth map has to load before booking.js ───────────────────────── */
html = must(html,
  '<script src="assets/js/booking-config.js"></script>',
  '<script src="assets/data/teeth-data.js"></script>\n<script src="assets/js/booking-config.js"></script>',
  "script order");

/* ── 5. the confirmation sequence needs the mouth frames ──────────────────── */
html = must(html,
  '<div class="mouth-stage-wrap">',
`<!-- Frames for the booking confirmation: the mouth closes into a smile and
     reopens. Generated with Higgsfield (Kling v3.0, keyframed from the same
     mouth stills), lazily loaded — nothing is fetched until a booking is made. -->
<div class="smile-sequence" id="smileSequence" aria-hidden="true" hidden>
  <video class="smile-clip" id="smileClose" muted playsinline preload="none"><source src="assets/media/mouth-close-smile.mp4" type="video/mp4"></video>
  <video class="smile-clip" id="smileOpen" muted playsinline preload="none"><source src="assets/media/mouth-smile-open.mp4" type="video/mp4"></video>
  <img class="smile-still" id="smileStill" src="assets/media/mouth-smile.jpg" alt="">
</div>
<div class="mouth-stage-wrap">`,
  "stage wrap");

write(FILE, html);
console.log("booking.html: palate nav, 32 date teeth, tongue window, smile sequence");
