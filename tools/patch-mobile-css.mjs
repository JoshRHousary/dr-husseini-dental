/* Rewrites the mobile CSS block as one coherent section.

   THE ROOT CAUSE this fixes: media queries carry no specificity weight, so a
   desktop base rule written `body.home-mouth .primary-nav` (0,2,1) or
   `.mouth-window .footer-grid` (0,2,0) outranks the responsive rule meant to
   override it (`nav.primary-nav`, 0,1,1 / `.footer-grid`, 0,1,0) — and, being
   later in the file, wins twice over. Every mobile rule below therefore matches
   or exceeds the specificity of the desktop rule it has to beat. Keep that up
   when adding to this block.

   node tools/patch-mobile-css.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "assets/css/style.css";
let css = read(FILE);

/* ── remove the now-dead responsive nav rule ──────────────────────────────── */
// nav.primary-nav (0,1,1) could never beat body.home-mouth .primary-nav (0,2,1),
// so this line has never done anything on this site. The drawer below replaces it.
css = css.replace("  nav.primary-nav { display: none; }\n", "");

/* ── hover-only effects ───────────────────────────────────────────────────── */
// Without @media (hover: hover) a tapped card or button keeps its lifted
// transform on touch, because :hover sticks until the next tap elsewhere.
for (const [sel, decl] of [
  [".card:hover", "transform: translateY(-6px);"],
  [".btn:hover", "transform: translateY(-2px);"],
  [".whatsapp-float:hover", "transform: translateY(-3px) scale(1.03);"]
]) {
  const re = new RegExp(`(^|\\n)(${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\})`, "m");
  const m = css.match(re);
  if (m && !css.includes(`@media (hover: hover) {\n  ${m[2]}`)) {
    css = css.replace(re, `$1@media (hover: hover) {\n  $2\n}`);
  }
}

/* ── replace the mobile block ─────────────────────────────────────────────── */
const MARKER = "/* ═══════════════════════════════════════════════════════════════════════════\n   ── MOBILE: page-local layouts ──";
const idx = css.indexOf(MARKER);
if (idx === -1) throw new Error("mobile block marker not found");
css = css.slice(0, idx);

css += `/* ═══════════════════════════════════════════════════════════════════════════
   ── MOBILE (<= 900px) ──

   Desktop (>= 901px) puts the whole page inside the mouth; mobile drops the
   stage, shows the mouth as a banner and reverts to normal flow. They are two
   layouts, so every edit has to land in both.

   SPECIFICITY: a desktop rule prefixed \`body.home-mouth\` or \`.mouth-window\`
   outranks a bare responsive selector regardless of the media query. Mobile
   rules here must match or exceed the specificity of what they override —
   tools/check-site.mjs enforces this.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Horizontal overflow backstop ──
   The header used to push the page ~315px sideways at 390px. The drawer below
   fixes the cause; this makes any future overflow non-destructive. */
@media (max-width: 900px) {
  html, body { overflow-x: hidden; max-width: 100%; }
}

/* ── Navigation drawer ──
   .nav-toggle exists in the markup as of 2026-10-01; before that it was styled
   but never built, so initMobileNav() was a permanent no-op and the six-link
   desktop nav stayed on screen at every width. */
@media (max-width: 900px) {
  /* 0,2,1 — matches body.home-mouth .primary-nav so it actually wins */
  body.home-mouth .nav-toggle,
  .site-header .nav-toggle {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; flex: none;
    border: 1px solid var(--line); border-radius: 12px;
    background: var(--enamel); cursor: pointer; padding: 0;
  }
  .nav-toggle-bars, .nav-toggle-bars::before, .nav-toggle-bars::after {
    content: ""; display: block; width: 18px; height: 2px;
    background: var(--primary-dark); border-radius: 2px;
    transition: transform .25s var(--ease), opacity .2s linear;
  }
  .nav-toggle-bars { position: relative; }
  .nav-toggle-bars::before { position: absolute; top: -6px; }
  .nav-toggle-bars::after  { position: absolute; top: 6px; }
  .nav-toggle[aria-expanded="true"] .nav-toggle-bars { background: transparent; }
  .nav-toggle[aria-expanded="true"] .nav-toggle-bars::before { transform: translateY(6px) rotate(45deg); }
  .nav-toggle[aria-expanded="true"] .nav-toggle-bars::after  { transform: translateY(-6px) rotate(-45deg); }

  /* collapse the inline row into a drawer. 0,2,1 to beat line ~505's
     body.home-mouth .primary-nav { display: flex } */
  body.home-mouth .primary-nav,
  .site-header .primary-nav {
    display: none;
    position: absolute; left: 0; right: 0; top: 100%;
    flex-direction: column; align-items: stretch; gap: 0;
    background: var(--bg); border-bottom: 1px solid var(--line);
    box-shadow: 0 18px 40px -24px rgba(10,62,58,.45);
    padding: 8px 16px 14px;
  }
  body.home-mouth .primary-nav.nav-open,
  .site-header .primary-nav.nav-open { display: flex; }

  nav.primary-nav a {
    display: flex; align-items: center; min-height: 48px;
    font-size: 16px; padding: 6px 2px;
    border-bottom: 1px solid var(--line);
  }
  nav.primary-nav a:last-child { border-bottom: 0; }
  /* the sliding underline reads as a stray line in a vertical list */
  nav.primary-nav a::after { display: none; }
  nav.primary-nav a[aria-current="page"] { color: var(--primary); font-weight: 700; }

  .site-header .nav-row { position: relative; gap: 10px; padding: 10px 0; }
  .nav-actions { gap: 8px; }

  /* the language switch is the control that used to sit off-screen entirely */
  .lang-switch button { min-width: 44px; min-height: 44px; font-size: 14px; padding: 6px 8px; }

  /* 11px uppercase under a 20px brand is unreadable on a phone */
  .brand { font-size: 17px; }
  .brand small { font-size: 13px; letter-spacing: .06em; }
}

/* ── Footer ──
   .mouth-window .footer-grid (0,2,0) outranks the <=680px .footer-grid (0,1,0),
   so the footer stayed two columns at 390px. Matched specificity here. */
@media (max-width: 680px) {
  .mouth-window .footer-grid,
  .footer-grid { grid-template-columns: 1fr; gap: 22px; }
}
@media (max-width: 900px) {
  footer.site-footer a { display: inline-flex; align-items: center; min-height: 44px; }
  .footer-bottom { font-size: 13px; }
}

/* ── Page-local grids ──
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
}

/* ── Booking calendar tap targets ──
   Seven columns at 360px with the desktop 8px gaps gave ~37px cells, under the
   44px minimum. */
@media (max-width: 900px) {
  .weekday-row, .days-grid { gap: 4px; }
  .days-grid { padding: 14px 6px 10px; }
  .tooth-cell { aspect-ratio: auto; min-height: 44px; font-size: 14px; }
  .weekday-cell { font-size: 13px; }
  .time-chip { padding: 12px 16px; min-height: 44px; }
  .calendar-nav-btn { width: 44px; height: 44px; }
}

/* ── Form fields ──
   iOS Safari zooms the whole page when a focused input is under 16px, and the
   layout does not reliably recover. */
@media (max-width: 900px) {
  .field input, .field select, .field textarea,
  form.contact-form input, form.contact-form textarea {
    font-size: 16px; padding: 12px 14px;
  }
  .field textarea, form.contact-form textarea { min-height: 96px; }
  #confirmBtn, #fallbackWhatsapp, #contactFallback,
  form.contact-form button[type="submit"] { min-height: 48px; }
  /* booking.html sets padding:10px inline on these, giving ~38px */
  .booking-side a[href^="tel:"] { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
}

/* ── Sticky WhatsApp CTA ──
   ~195x48px fixed bottom-right, about half the screen width at 390px, with no
   compensating page padding — it covered the booking page's own Confirm button
   (the same action), the tel: buttons and the copyright line. */
@media (max-width: 900px) {
  .whatsapp-float { bottom: 14px; right: 14px; padding: 12px 16px; font-size: 14px; }
  body[dir="rtl"] .whatsapp-float { right: auto; left: 14px; }
  /* clear the float so it never sits on top of real content */
  .site-footer .footer-bottom { padding-bottom: 72px; }
  /* on the booking page the float duplicates #confirmBtn, so drop it there */
  body.page-booking .whatsapp-float { display: none; }
}

/* ── Intro on mobile ──
   The clip is 16:9; in a 390x844 portrait viewport object-fit: cover crops ~74%
   of the frame away and loaderZoom then scales 2.4x on top, leaving the
   mouth-opening unrecognisable. main.js skips the video under 900px and runs the
   stills path instead; these frame the stills for portrait. */
@media (max-width: 900px) {
  .loader-still { object-position: 50% 42%; }
  #loader { --loader-zoom: 1.6; }
}

/* ── RTL on mobile ──
   The desktop RTL rules flip rows that only exist on desktop. On mobile it is
   the sticky header's own nav and language switch that need flipping.
   NOTE: an earlier blanket \`body[dir="rtl"] .mouth-window { text-align: right }\`
   outranked the centred blocks and flattened them — hence the explicit
   re-assertions below. */
@media (max-width: 900px) {
  body[dir="rtl"] .site-header .nav-row { flex-direction: row-reverse; }
  body[dir="rtl"] .site-header .lang-switch { flex-direction: row-reverse; }
  body[dir="rtl"] .primary-nav { align-items: stretch; }
  body[dir="rtl"] nav.primary-nav a { text-align: right; justify-content: flex-end; }

  body[dir="rtl"] .mouth-window { text-align: right; }
  /* 0,3,0+ so these survive the line above */
  body[dir="rtl"] .mouth-window .window-hero,
  body[dir="rtl"] .mouth-window .section-head.center,
  body[dir="rtl"] .mouth-window .cta-band,
  body[dir="rtl"] .mouth-window .hero { text-align: center; }
}

/* ── Mouth banner trim ──
   The window keeps a 12px inset and a 22px radius on mobile, which left a faint
   off-tone frame and let the dark footer's square corners poke out. */
@media (max-width: 900px) {
  .mouth-window { font-size: 15px; }
  .mouth-window .site-footer { margin-left: -12px; margin-right: -12px; }
}
`;

write(FILE, css);
console.log("style.css: mobile block rewritten");
console.log("  - nav drawer with matched specificity (0,2,1)");
console.log("  - footer collapse with matched specificity (0,2,0)");
console.log("  - overflow-x backstop, 44px targets, >=13px text");
console.log("  - WhatsApp float cleared / hidden on booking");
console.log("  - hover effects gated behind @media (hover: hover)");
