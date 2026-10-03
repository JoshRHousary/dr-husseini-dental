/* The hardcoded English text inside a data-i18n element is the pre-JS fallback —
   it is what a crawler reads before the locale bundle applies, and what shows if
   JS fails. The booking hero's fallback still promised "no forms" after the form
   was added, so it contradicted the page it sits on. Sync it with en.json.

   node tools/patch-hero-fallback.mjs */

import { read, write, must } from "./lib/edit.mjs";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync("assets/locales/en.json", "utf8"));

const FILE = "booking.html";
let h = read(FILE);

h = must(h,
  `<p class="lead" data-i18n="booking.hero.lead">Tap a date on the calendar, choose a time that works, and we'll confirm your visit on WhatsApp — no forms, no waiting on hold.</p>`,
  `<p class="lead" data-i18n="booking.hero.lead">${en.booking.hero.lead}</p>`,
  "booking hero lead");

write(FILE, h) ? console.log("booking.html: hero fallback synced with en.json") : console.log("unchanged");
