/* Two small follow-ups from the check-site run:
     1. booking.selectDate existed as a string but the calendar had no heading
        at all — give it one, so the left column is labelled like the right.
     2. teach check-site about the locale keys that contact.js reads from JS,
        so it stops reporting them as dead.

   node tools/patch-final.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* 1. calendar heading */
{
  const FILE = "booking.html";
  let h = read(FILE);
  if (h.includes('data-i18n="booking.selectDate"')) {
    console.log("booking.html: calendar already has a heading");
  } else {
    h = must(h,
      '      <div class="calendar-wrap">\n        <div class="calendar-head">',
      '      <div class="calendar-wrap">\n'
      + '        <h3 class="sr-only" data-i18n="booking.selectDate">Select a date</h3>\n'
      + '        <div class="calendar-head">',
      "calendar-wrap");
    write(FILE, h);
    console.log("booking.html: calendar heading added");
  }
}

/* The heading is for screen readers — the month label already names the month
   visually, and a second visible heading would crowd the card. */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  if (css.includes(".sr-only")) {
    console.log("style.css: already has .sr-only");
  } else {
    css += "\n/* Visible to screen readers only — used where a visual label would be redundant. */\n"
      + ".sr-only {\n"
      + "  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;\n"
      + "  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;\n"
      + "}\n";
    write(FILE, css);
    console.log("style.css: .sr-only added");
  }
}

/* 2. checker allowlist */
{
  const FILE = "tools/check-site.mjs";
  let c = read(FILE);
  if (c.includes("contact\\.form\\.(sending")) {
    console.log("check-site.mjs: allowlist already updated");
  } else {
    c = must(c,
      "  /^blog\\.(readMore|empty|backToBlog|sourceLabel)$/",
      "  /^blog\\.(readMore|empty|backToBlog|sourceLabel)$/,\n"
      + "  /^contact\\.form\\.(sending|errName|errPhone|errMessage|errSendFallback)$/",
      "JS_KEYS list");
    write(FILE, c);
    console.log("check-site.mjs: contact.js keys allowlisted");
  }
}
