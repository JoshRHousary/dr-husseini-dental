/* Give the sticky WhatsApp CTA an accessible name of its own.

   On phones the float is now an icon-only circle - the ~195px pill was
   sitting on top of the hero's own buttons - so its visible text is
   display:none and the link would otherwise have no accessible name at all
   for a screen reader. The label is the same string the span carries. */
import { read, write } from "./lib/edit.mjs";
import { readFileSync } from "node:fs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html"];
const label = JSON.parse(readFileSync("assets/locales/en.json", "utf8")).common.whatsapp;

let touched = 0;
for (const page of PAGES) {
  const html = read(page);
  if (/class="whatsapp-float"[^>]*aria-label/.test(html)) {
    console.log(`${page}: already labelled`);
    continue;
  }
  const next = html.replace(
    /(<a href="#" class="whatsapp-float")/,
    `$1 aria-label="${label}" data-i18n-aria="common.whatsapp"`
  );
  if (next === html) { console.log(`${page}: no float found`); continue; }
  if (write(page, next)) { touched++; console.log(`${page}: labelled`); }
}
console.log(`${touched} page(s) updated`);
