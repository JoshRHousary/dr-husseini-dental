/* P0: mobile navigation.

   The hamburger was designed and styled but never built. `.nav-toggle` appeared
   in zero of the seven pages and `.nav-open` had zero CSS rules, so
   initMobileNav() in assets/js/main.js had always hit its
   `if (!toggle || !nav) return` guard — a permanent no-op at every width.

   With no toggle, the six-link desktop nav stayed on screen on phones (the
   @media (max-width: 680px) rule meant to hide it is outranked — see
   patch-specificity.mjs), the header overflowed below ~705px, and at 390px the
   language switch sat entirely off the right edge, making Arabic and French
   unreachable.

   This adds the button to every page and the locale string for its label.

   node tools/patch-nav.mjs && node tools/build-locales.mjs */

import { read, write } from "./lib/edit.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

/* The button goes first in .nav-actions so the tab order is
   brand -> menu -> language -> CTA, and it sits next to the switch it rescues. */
const BUTTON = `      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="primaryNav" aria-label="Menu" data-i18n-aria="common.nav.menu">
        <span class="nav-toggle-bars" aria-hidden="true"></span>
      </button>
`;

let changed = 0;
for (const page of PAGES) {
  let html = read(page);

  if (html.includes('class="nav-toggle"')) { console.log("skip  ", page, "(already has the toggle)"); continue; }

  // give the nav an id so aria-controls points at something
  const navOpen = html.indexOf('<nav class="primary-nav">');
  if (navOpen === -1) { console.log("WARN  ", page, "- no .primary-nav found"); continue; }
  html = html.replace('<nav class="primary-nav">', '<nav class="primary-nav" id="primaryNav">');

  // insert the button as the first child of .nav-actions
  const marker = '    <div class="nav-actions">\n';
  if (!html.includes(marker)) { console.log("WARN  ", page, "- no .nav-actions found"); continue; }
  html = html.replace(marker, marker + BUTTON);

  if (write(page, html)) { changed++; console.log("patched", page); }
}

/* Locale string for the aria-label. applyTranslations() only handles
   textContent and innerHTML, so main.js needs a data-i18n-aria pass too —
   added in patch-nav-js.mjs. */
const LABEL = { en: "Menu", ar: "القائمة", fr: "Menu" };
for (const lang of ["en", "ar", "fr"]) {
  const file = `assets/locales/${lang}.json`;
  const dict = JSON.parse(readFileSync(file, "utf8"));
  if (dict.common.nav.menu === LABEL[lang]) continue;
  dict.common.nav.menu = LABEL[lang];
  writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
  console.log(`${file}: common.nav.menu = "${LABEL[lang]}"`);
}

console.log(`\n${changed} page(s) written. Next: node tools/build-locales.mjs`);
