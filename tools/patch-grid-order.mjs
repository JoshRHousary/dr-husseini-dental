/* §5 — page-local grids were never actually collapsing on mobile.

   `.booking-layout`, `.contact-grid` and `.service-list` are declared in each
   page's own <style> block, and the mobile overrides in style.css match them at
   the same specificity (0,1,0). The page's <style> comes after the stylesheet
   link, so the page wins on order and all three stayed multi-column at 390px.
   This is the order twin of the specificity bug recorded on 2026-10-01 — same
   outcome, different tiebreak.

   The 2026-10-01 fix added the breakpoints but not the weight, so the bug
   survived it; it only became visible when the booking calendar grew real
   content in the left column and pushed the form card off-screen.

   A `body` prefix is the smallest change that wins on specificity instead of
   order (0,1,1 beats 0,1,0 regardless of position).

   Also removes the dead calendar CSS from booking.html — .weekday-row,
   .days-grid, .tooth-* and .weekday-cell belonged to the 7-column grid the
   date teeth replaced on 2026-10-02; nothing references them any more.

   node tools/patch-grid-order.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── 1. weight, not order ─────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  if (css.includes("body .booking-layout")) {
    console.log("style.css: page-local grids already weighted");
  } else {
    css = must(css,
      `/* ── Page-local grids ──
   Grids declared in a page's own <style> block, which had no breakpoint at all
   until 2026-10-01. Keep new ones in step with this list. */
@media (max-width: 900px) {
  .booking-layout { grid-template-columns: 1fr; gap: 24px; }
  .calendar-wrap { padding: 20px 14px; }
  .booking-side { padding: 22px 18px; }
  .contact-grid { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 680px) {
  .service-block { grid-template-columns: 1fr; gap: 16px; padding: 36px 0; }
  body[dir="rtl"] .service-block { grid-template-columns: 1fr; }
  .service-list { grid-template-columns: 1fr; gap: 10px; }
}`,
      `/* ── Page-local grids ──
   Grids declared in a page's own <style> block, which had no breakpoint at all
   until 2026-10-01. Keep new ones in step with this list.

   Every one of these carries a \`body\` prefix on purpose. The page's <style>
   block is parsed after this file, so at equal specificity the page's
   multi-column rule wins on order and the breakpoint does nothing — which is
   exactly what happened between 2026-10-01 and 2026-10-03. tools/check-site.mjs
   now fails the build if a page-local grid is only matched at equal weight. */
@media (max-width: 900px) {
  body .booking-layout { grid-template-columns: 1fr; gap: 24px; }
  .calendar-wrap { padding: 20px 14px; }
  .booking-side { padding: 22px 18px; }
  body .contact-grid { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 680px) {
  .service-block { grid-template-columns: 1fr; gap: 16px; padding: 36px 0; }
  body[dir="rtl"] .service-block { grid-template-columns: 1fr; }
  body .service-list { grid-template-columns: 1fr; gap: 10px; }
}`,
      "page-local grid block");

    // the tap-target block for the grid calendar the teeth replaced
    css = must(css,
      `/* ── Booking calendar tap targets ──
   Seven columns at 360px with the desktop 8px gaps gave ~37px cells, under the
   44px minimum. */
@media (max-width: 900px) {
  .weekday-row, .days-grid { gap: 4px; }
  .days-grid { padding: 14px 6px 10px; }
  .tooth-cell { aspect-ratio: auto; min-height: 44px; font-size: 14px; }
  .weekday-cell { font-size: 13px; }
  .time-chip { padding: 12px 16px; min-height: 44px; }
  .calendar-nav-btn { width: 44px; height: 44px; }
}`,
      `/* ── Booking tap targets ──
   The 7-column grid calendar these sized was replaced by the date teeth on
   2026-10-02; what is left is the controls around them. The teeth's own mobile
   sizing lives in the BOOKING: THE CALENDAR ON A PHONE block. */
@media (max-width: 900px) {
  .time-chip { padding: 12px 16px; min-height: 44px; }
  .calendar-nav-btn { width: 44px; height: 44px; }
}`,
      "calendar tap-target block");
    write(FILE, css);
  }
}

/* ── 2. drop the dead calendar CSS from booking.html ──────────────────────── */
{
  const FILE = "booking.html";
  let html = read(FILE);
  if (!html.includes(".tooth-cell")) {
    console.log("booking.html: dead calendar CSS already removed");
  } else {
    const start = html.indexOf("  .weekday-row, .days-grid {");
    const endMark = "  .tooth-selected { background: var(--primary); color: #fff; border-color: var(--primary-dark); }\n";
    const end = html.indexOf(endMark);
    if (start === -1 || end === -1) throw new Error("dead calendar CSS block not found");
    html = html.slice(0, start)
      + "  /* The 7-column grid calendar that used to live here was replaced by the\n"
      + "     32 date teeth (assets/js/booking-teeth.js) on 2026-10-02. */\n"
      + html.slice(end + endMark.length);
    write(FILE, html);
  }
}

console.log("done — run: node tools/check-site.mjs");
