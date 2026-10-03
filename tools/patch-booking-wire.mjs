/* Loads booking-teeth.js on the booking page and adds the two new strings.

   node tools/patch-booking-wire.mjs && node tools/build-locales.mjs */

import { read, write, must } from "./lib/edit.mjs";
import { readFileSync, writeFileSync } from "node:fs";

/* ── script tag ───────────────────────────────────────────────────────────── */
{
  const FILE = "booking.html";
  let html = read(FILE);
  if (html.includes("booking-teeth.js")) {
    console.log("booking.html: booking-teeth.js already loaded");
  } else {
    // must come before booking.js, which calls into it
    html = must(html,
      '<script src="assets/js/booking.js"></script>',
      '<script src="assets/js/booking-teeth.js"></script>\n<script src="assets/js/booking.js"></script>',
      "booking.js tag");
    write(FILE, html);
    console.log("booking.html: booking-teeth.js loaded before booking.js");
  }
}

/* ── strings ──────────────────────────────────────────────────────────────── */
const ADD = {
  en: {
    pickOnTeeth: "Pick a date on the teeth.",
    datePast: "This date has passed"
  },
  ar: {
    pickOnTeeth: "اختر التاريخ من الأسنان.",
    datePast: "هذا التاريخ قد مضى"
  },
  fr: {
    pickOnTeeth: "Choisissez une date sur les dents.",
    datePast: "Cette date est passée"
  }
};

for (const lang of ["en", "ar", "fr"]) {
  const file = `assets/locales/${lang}.json`;
  const dict = JSON.parse(readFileSync(file, "utf8"));
  let changed = false;
  for (const [k, v] of Object.entries(ADD[lang])) {
    if (dict.booking[k] !== v) { dict.booking[k] = v; changed = true; }
  }
  if (changed) {
    writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
    console.log(`${file}: + booking.pickOnTeeth, booking.datePast`);
  }
}

/* ── booking.datePast is read from JS only, so the dead-string check needs it ─ */
{
  const FILE = "tools/check-site.mjs";
  let c = read(FILE);
  if (c.includes("datePast")) {
    console.log("check-site.mjs: datePast already allowlisted");
  } else {
    c = must(c,
      "  /^booking\\.saving$/,",
      "  /^booking\\.saving$/, /^booking\\.datePast$/,",
      "JS_KEYS");
    write(FILE, c);
    console.log("check-site.mjs: booking.datePast allowlisted (read from JS)");
  }
}
