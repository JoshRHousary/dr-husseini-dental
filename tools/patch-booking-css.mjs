/* Styles for the booking page's mouth layout.

   Regions were measured against the real anatomy with
   tools/preview-booking-layout.py:
     palate  x 41.3-58.7%, y 20.2-28.9%   menu + languages
     teeth   both arches                   the 32 dates
     tongue  x 39-61%, y 52-75%            the text and form

   Specificity note: these must beat the base .mouth-window geometry and the
   min-width:901px block, so page-scoped selectors carry body.page-booking.

   node tools/patch-booking-css.mjs */

import { read, write } from "./lib/edit.mjs";

const FILE = "assets/css/style.css";
let css = read(FILE);

if (css.includes("── BOOKING: THE MOUTH IS THE CALENDAR ──")) {
  console.log("style.css: booking mouth block already present");
  process.exit(0);
}

css += `

/* ═══════════════════════════════════════════════════════════════════════════
   ── BOOKING: THE MOUTH IS THE CALENDAR ──
   The teeth stop being navigation and carry the dates; the menu moves to the
   palate; the page's text sits on the tongue. Desktop only — under 900px there
   is no stage, so the page keeps its ordinary layout (see the MOBILE block).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── the menu, on the palate ── */
.palate-nav { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.palate-nav a {
  position: absolute;
  pointer-events: auto;
  display: flex; align-items: center; justify-content: center;
  text-align: center; text-decoration: none; white-space: nowrap;
  font: 700 .62cqw/1 var(--font-body);
  letter-spacing: .02em;
  color: #FFF2EC;
  background: rgba(122, 38, 33, .32);
  border: 1px solid rgba(255, 236, 228, .28);
  border-radius: 999px;
  text-shadow: 0 1px 4px rgba(84, 14, 18, .75);
  transition: background .25s var(--ease), color .25s var(--ease), transform .25s var(--ease);
}
.palate-nav a:hover,
.palate-nav a:focus-visible,
.palate-nav a[aria-current="page"] {
  background: rgba(255, 244, 238, .92);
  color: #7A2621;
  text-shadow: none;
  transform: translateY(-1px);
}

/* ── EN / AR / FR, just above the uvula ── */
.palate-langs {
  position: absolute; inset: 0; z-index: 3;
  pointer-events: none; display: block;
  background: none; padding: 0; border-radius: 0;
}
.palate-langs button {
  position: absolute;
  pointer-events: auto; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255, 236, 228, .28);
  padding: 0;
  background: rgba(122, 38, 33, .32);
  font: 700 .58cqw/1 var(--font-body);
  letter-spacing: .06em;
  color: #FFF2EC;
  border-radius: 999px;
  text-shadow: 0 1px 4px rgba(84, 14, 18, .75);
  transition: background .25s var(--ease), color .25s var(--ease);
}
.palate-langs button:hover,
.palate-langs button.active {
  background: rgba(255, 244, 238, .92);
  color: #7A2621;
  text-shadow: none;
}

/* ── the dates, on all 32 teeth ── */
.date-teeth { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.date-tooth {
  position: absolute;
  pointer-events: auto; cursor: pointer;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: .1cqw;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 38% 38% 46% 46% / 20% 20% 40% 40%;
  color: #7A2621;
  font-family: var(--font-body);
  line-height: 1;
  transition: background .2s var(--ease), color .2s var(--ease),
              transform .2s var(--ease), box-shadow .3s var(--ease);
}
.date-tooth .dt-dow {
  font-size: .38cqw; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; opacity: .72;
}
.date-tooth .dt-num { font-size: .62cqw; font-weight: 700; }

/* the back molars are small and steeply angled — shrink their labels to fit */
.date-tooth:nth-child(-n+3) .dt-num,
.date-tooth:nth-child(n+14):nth-child(-n+19) .dt-num,
.date-tooth:nth-child(n+30) .dt-num { font-size: .5cqw; }
.date-tooth:nth-child(-n+3) .dt-dow,
.date-tooth:nth-child(n+14):nth-child(-n+19) .dt-dow,
.date-tooth:nth-child(n+30) .dt-dow { display: none; }

.date-tooth:hover:not(:disabled),
.date-tooth:focus-visible { background: rgba(178, 63, 56, .9); color: #FFF7F0; }
.date-tooth.dt-today { box-shadow: inset 0 0 0 .14cqw #B23F38; }
.date-tooth.dt-selected { background: #B23F38; color: #FFF7F0; }
.date-tooth.dt-past { opacity: .28; cursor: not-allowed; }
.date-tooth.dt-full { opacity: .4; cursor: not-allowed; text-decoration: line-through; }
.date-tooth[hidden] { display: none; }

/* ── the booking text, on the tongue ── */
@media (min-width: 901px) {
  body.page-booking .mouth-window.tongue-window {
    left: 39%; right: 39%; top: 52%; bottom: 25%;
    /* the tongue is busier than the cavity, so the text needs a little lift */
    text-shadow: 0 1px 6px rgba(84, 14, 18, .85), 0 0 2px rgba(84, 14, 18, .6);
  }
  body.page-booking .mouth-window.tongue-window::-webkit-scrollbar { width: 0; }

  /* the stepper replaces the old calendar header */
  .month-stepper {
    display: flex; align-items: center; justify-content: space-between;
    gap: .6em; margin-bottom: .5em;
  }
  .month-stepper #monthLabel {
    font-family: var(--font-display);
    font-size: 1.15em; text-align: center; flex: 1;
  }
  .pick-hint { text-align: center; font-size: .82em; opacity: .85; margin: 0 0 1em; }
}

/* ── the confirmation: the teeth shine, then the mouth smiles ── */
.date-tooth.dt-shine {
  animation: toothShine .62s ease-out var(--shine-delay, 0ms) both;
}
.date-tooth.dt-shine-strong {
  animation: toothShineStrong .5s ease-out both;
  z-index: 1;
}
@keyframes toothShine {
  0%   { background: transparent; box-shadow: none; }
  40%  { background: rgba(255, 252, 245, .95); color: #7A2621;
         box-shadow: 0 0 1.6cqw .3cqw rgba(255, 246, 230, .9); }
  100% { background: transparent; box-shadow: none; }
}
@keyframes toothShineStrong {
  0%   { background: #B23F38; }
  35%  { background: #FFFFFF; color: #7A2621;
         box-shadow: 0 0 2.6cqw .6cqw rgba(255, 255, 255, .95);
         transform: scale(1.14); }
  100% { background: #FFFFFF; color: #7A2621;
         box-shadow: 0 0 1.6cqw .3cqw rgba(255, 250, 240, .8);
         transform: scale(1.04); }
}

/* the whole arch lifts a touch while every tooth is lit */
.mouth-stage.teeth-shine-all .mouth-stage-img { filter: brightness(1.06) saturate(1.03); }

/* ── the close -> smile -> reopen clips ── */
.smile-sequence {
  position: fixed; inset: 0; z-index: 9000;
  background: #F6F1E7;
  opacity: 0;
  transition: opacity .3s linear;
  pointer-events: none;
}
.smile-sequence.seq-close,
.smile-sequence.seq-hold,
.smile-sequence.seq-open { opacity: 1; }
.smile-clip, .smile-still {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity .25s linear;
}
.smile-sequence.seq-close #smileClose { opacity: 1; }
.smile-sequence.seq-hold  #smileStill { opacity: 1; }
.smile-sequence.seq-open  #smileOpen  { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .date-tooth.dt-shine, .date-tooth.dt-shine-strong { animation: none; }
  .smile-sequence { display: none; }
}
`;

write(FILE, css);
console.log("style.css: booking mouth block added (palate, 32 date teeth, tongue, shine + smile)");
