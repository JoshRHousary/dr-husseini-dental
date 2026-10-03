/* Arabic RTL support for the mouth stage.

   The tooth nav is absolutely positioned by percentage, so `direction: rtl`
   alone leaves the Arabic menu reading left-to-right across the teeth. Mirror
   each tooth's x position about the centre line instead, so Home lands on the
   right-hand tooth and the menu reads right-to-left like the rest of the page.
   The teeth are near enough symmetric that a mirrored x still sits on a tooth.

   node tools/patch-rtl.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── main.js: mirror on every language change ──────────────────────────────── */
let js = read("assets/js/main.js");

if (!js.includes("applyTeethDirection")) {
  js = must(js,
`function setActiveLangButtons(lang) {`,
`/* Mirror the tooth nav for RTL. Each .tooth carries left/width as inline
   percentages; the mirrored left is 100 - left - width. The original values are
   stashed on the element the first time round so switching back and forth is
   lossless. */
function applyTeethDirection(dir) {
  document.querySelectorAll(".teeth-nav .tooth").forEach(el => {
    if (!el.dataset.ltrLeft) {
      el.dataset.ltrLeft = parseFloat(el.style.left) || 0;
      el.dataset.ltrWidth = parseFloat(el.style.width) || 0;
    }
    const left = parseFloat(el.dataset.ltrLeft);
    const width = parseFloat(el.dataset.ltrWidth);
    el.style.left = (dir === "rtl" ? 100 - left - width : left).toFixed(2) + "%";
  });
}

function setActiveLangButtons(lang) {`,
    "applyTeethDirection");

  js = must(js,
`  applyTranslations(dict);
  applyWhatsappLinks(lang);
  setActiveLangButtons(lang);`,
`  applyTranslations(dict);
  applyWhatsappLinks(lang);
  applyTeethDirection(dict.meta.dir);
  setActiveLangButtons(lang);`,
    "setLanguage body");

  write("assets/js/main.js", js);
  console.log("main.js: tooth nav mirrors for RTL");
} else {
  console.log("main.js: already has applyTeethDirection");
}

/* ── style.css: the rest of the RTL details ────────────────────────────────── */
let css = read("assets/css/style.css");

if (!css.includes("/* ── RTL (Arabic) ──")) {
  css += `

/* ── RTL (Arabic) ─────────────────────────────────────────────────────────────
   body[dir="rtl"] and the Arabic font stack are set near the top of this file;
   these are the directional details that the direction property alone misses.
   The tooth nav's x positions are mirrored in JS (applyTeethDirection). */

/* Vertical tooth labels read bottom-to-top in LTR; in RTL the mirrored column
   should still read the same way, so the rotation is unchanged — but the text
   inside each label needs its own direction or Arabic renders reversed. */
body[dir="rtl"] .tooth,
body[dir="rtl"] .lang-teeth button { direction: rtl; unicode-bidi: isolate; }

/* Anything laid out with an explicit edge rather than a logical property. */
body[dir="rtl"] .brand small { text-align: right; }
body[dir="rtl"] .nav-row { flex-direction: row-reverse; }
body[dir="rtl"] .primary-nav { flex-direction: row-reverse; }
body[dir="rtl"] .nav-actions { flex-direction: row-reverse; }
body[dir="rtl"] .footer-grid ul { padding-right: 0; }
body[dir="rtl"] .learn-more { direction: rtl; }

/* The booking form: labels, inputs and the calendar header all flip. */
body[dir="rtl"] .field input,
body[dir="rtl"] .field select,
body[dir="rtl"] .field textarea { text-align: right; }
body[dir="rtl"] .calendar-head { flex-direction: row-reverse; }
body[dir="rtl"] .weekday-row,
body[dir="rtl"] .days-grid { direction: rtl; }

/* Latin strings inside Arabic text (phone numbers, times, EN/AR/FR) need
   isolating or the digits and punctuation reorder around them. */
body[dir="rtl"] a[href^="tel:"],
body[dir="rtl"] .time-chip,
body[dir="rtl"] .slot-summary { unicode-bidi: isolate; }
`;
  write("assets/css/style.css", css);
  console.log("style.css: RTL block appended");
} else {
  console.log("style.css: already has the RTL block");
}
