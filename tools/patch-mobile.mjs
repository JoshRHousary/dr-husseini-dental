/* Mobile layout for the page-local grids.

   The global grids (.grid-2/3/4, .footer-grid, .hero-grid) already collapse at
   960/680px, but every grid declared in a page's own <style> block had no
   breakpoint at all, so booking, contact and services stayed multi-column on a
   phone. The booking form added on 2026-10-01 inherited the same problem: four
   fields squeezed into the narrow .9fr column.

   These rules live here rather than in each page's <style> so there is one place
   to maintain them — per the project rule that an edit lands on all pages and on
   both layouts.

   node tools/patch-mobile.mjs */

import { read, write } from "./lib/edit.mjs";

const FILE = "assets/css/style.css";
let css = read(FILE);

if (css.includes("── MOBILE: page-local layouts ──")) {
  console.log("style.css: mobile block already present");
  process.exit(0);
}

css += `

/* ═══════════════════════════════════════════════════════════════════════════
   ── MOBILE: page-local layouts ──
   Grids declared inside a page's own <style> block, collapsed for phones.
   Keep new page-local grids in step with this block.
   ═══════════════════════════════════════════════════════════════════════════ */

@media (max-width: 900px) {
  /* booking: calendar above, details below — side by side leaves the form
     about 150px wide on a phone */
  .booking-layout { grid-template-columns: 1fr; gap: 24px; }
  .calendar-wrap { padding: 20px 14px; }
  .booking-side { padding: 22px 18px; }

  /* contact: form under the details rather than beside them */
  .contact-grid { grid-template-columns: 1fr; gap: 32px; }
}

@media (max-width: 680px) {
  /* services: the 90px number gutter and the two-column treatment list both
     collapse */
  .service-block { grid-template-columns: 1fr; gap: 16px; padding: 36px 0; }
  body[dir="rtl"] .service-block { grid-template-columns: 1fr; }
  .service-list { grid-template-columns: 1fr; gap: 10px; }
}

/* ── MOBILE: the booking calendar's tooth grid ──
   Seven columns on a 360px screen with the desktop 8px gaps leaves ~37px cells,
   under the 44px minimum tap target. Tighten the gaps and give the cells a floor
   instead. */
@media (max-width: 900px) {
  .weekday-row, .days-grid { gap: 4px; }
  .days-grid { padding: 14px 6px 10px; }
  .tooth-cell { aspect-ratio: auto; min-height: 44px; font-size: 14px; }
  .time-chip { padding: 12px 16px; }        /* 44px tall with the 13.5px label */
  .calendar-nav-btn { width: 44px; height: 44px; }
}

/* ── MOBILE: form fields ──
   iOS Safari zooms the whole page when a focused input's font-size is below
   16px, which throws the layout off and is hard to recover from. The desktop
   14.5px is fine; on touch it has to be 16px. */
@media (max-width: 900px) {
  .field input, .field select, .field textarea,
  form.contact-form input, form.contact-form textarea {
    font-size: 16px;
    padding: 12px 14px;
  }
  .field textarea, form.contact-form textarea { min-height: 96px; }
  #confirmBtn, #fallbackWhatsapp, #contactFallback,
  form.contact-form button[type="submit"] { min-height: 48px; }
}

/* ── MOBILE: the mouth banner ──
   The stage image is a 42vh banner here, so the loader's 1080p master is never
   needed — main.js already caps the upgrade at 1200px wide. The reveal still
   plays, so keep it from overflowing a short viewport. */
@media (max-width: 900px) {
  #loader .loader-stage { width: 100%; height: 100%; }
  .mouth-window { font-size: 15px; }
}

/* ── MOBILE + RTL ──
   The desktop RTL block flips rows that only exist on desktop; on mobile the
   sticky header's own language switch and nav are what need flipping. */
@media (max-width: 900px) {
  body[dir="rtl"] .site-header .nav-row { flex-direction: row-reverse; }
  body[dir="rtl"] .site-header .lang-switch { flex-direction: row-reverse; }
  body[dir="rtl"] .mouth-window { text-align: right; }
}
`;

write(FILE, css);
console.log("style.css: mobile block for page-local layouts appended");
