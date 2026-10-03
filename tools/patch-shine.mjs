/* §3 — the shine, as specified.

   The spec: "when clicking or conferming the tooth shines brighter than the
   others and then all the teeth shine then the mouth closes and gives a
   beautiful smile then the mouth reopened".

   Two things were wrong:
   1. The shine only ran on CONFIRM. The trigger is "clicking OR confirming", so
      choosing a date must light that tooth immediately.
   2. The selected state did the opposite of the spec — .dt-selected painted the
      chosen tooth dark red (#B23F38) when it is supposed to shine BRIGHTER than
      the others.

   Now: clicking lights the tooth to bright enamel with a warm glow and dims the
   rest, so it reads as brighter *than the others* rather than merely different.
   Confirming ripples the shine across all 32, then the mouth closes and smiles.

   node tools/patch-shine.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── CSS ──────────────────────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  css = must(css,
`.date-tooth:hover:not(:disabled),
.date-tooth:focus-visible { background: rgba(178, 63, 56, .9); color: #FFF7F0; }
.date-tooth.dt-today { box-shadow: inset 0 0 0 .14cqw #B23F38; }
.date-tooth.dt-selected { background: #B23F38; color: #FFF7F0; }
.date-tooth.dt-past { opacity: .28; cursor: not-allowed; }
.date-tooth.dt-full { opacity: .4; cursor: not-allowed; text-decoration: line-through; }
.date-tooth[hidden] { display: none; }`,
`.date-tooth:hover:not(:disabled),
.date-tooth:focus-visible { background: rgba(255, 252, 245, .55); color: #5E1C18; }
.date-tooth.dt-today { box-shadow: inset 0 0 0 .14cqw #B23F38; }

/* THE SELECTED TOOTH SHINES BRIGHTER THAN THE OTHERS.
   Bright enamel with a warm halo — not a dark fill. The spec is comparative
   ("brighter than the others"), so the rest of the arch dims to make it read. */
.date-tooth.dt-selected {
  background: #FFFFFF;
  color: #5E1C18;
  box-shadow: 0 0 1.5cqw .32cqw rgba(255, 246, 225, .95),
              0 0 .5cqw .1cqw rgba(255, 255, 255, 1);
  transform: scale(1.06);
  z-index: 2;
}
.date-teeth.has-selection .date-tooth:not(.dt-selected):not(.dt-shine) {
  opacity: .55;
  filter: saturate(.85);
}
.date-tooth.dt-past { opacity: .28; cursor: not-allowed; }
.date-tooth.dt-full { opacity: .4; cursor: not-allowed; text-decoration: line-through; }
.date-tooth[hidden] { display: none; }

/* the moment of choosing: a brief flare, then it settles into the lit state */
.date-tooth.dt-pick { animation: toothPick .5s cubic-bezier(.3,.9,.3,1); }
@keyframes toothPick {
  0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(255,255,255,0); }
  45%  { transform: scale(1.22); box-shadow: 0 0 2.6cqw .7cqw rgba(255,255,255,.95); }
  100% { transform: scale(1.06); box-shadow: 0 0 1.5cqw .32cqw rgba(255,246,225,.95); }
}`,
    "date-tooth states");

  // the confirm ripple has to beat the dimming rule above
  css = must(css,
`.date-tooth.dt-shine {
  animation: toothShine .62s ease-out var(--shine-delay, 0ms) both;
}`,
`.date-teeth .date-tooth.dt-shine {
  animation: toothShine .62s ease-out var(--shine-delay, 0ms) both;
  opacity: 1;
}`,
    "dt-shine");

  css = must(css,
`@media (prefers-reduced-motion: reduce) {
  .date-tooth.dt-shine, .date-tooth.dt-shine-strong { animation: none; }
  .smile-sequence { display: none; }
}`,
`@media (prefers-reduced-motion: reduce) {
  .date-tooth.dt-shine, .date-tooth.dt-shine-strong, .date-tooth.dt-pick { animation: none; }
  /* the chosen tooth still reads as chosen, just without the motion */
  .date-tooth.dt-selected { transform: none; }
  .smile-sequence { display: none; }
}`,
    "reduced motion");

  write(FILE, css);
  console.log("style.css: selected tooth now shines bright; others dim; pick flare added");
}

/* ── JS: light it on click, and survive a repaint ─────────────────────────── */
{
  const FILE = "assets/js/booking-teeth.js";
  let js = read(FILE);

  // paintMonth reassigns className wholesale, which would strip dt-shine mid-ripple
  js = must(js,
`      btn.hidden = false;
      btn.disabled = isPast || full;
      btn.className = "date-tooth"`,
`      btn.hidden = false;
      btn.disabled = isPast || full;
      // a repaint must not strip an animation that is mid-flight
      const keepShine = btn.classList.contains("dt-shine") ? " dt-shine" : "";
      const keepStrong = btn.classList.contains("dt-shine-strong") ? " dt-shine-strong" : "";
      btn.className = "date-tooth"`,
    "paintMonth className");

  js = must(js,
`        + (isToday ? " dt-today" : "");`,
`        + (isToday ? " dt-today" : "")
        + keepShine + keepStrong;`,
    "className tail");

  // mark the container so the unselected teeth can dim
  js = must(js,
`    buttons.forEach((btn, i) => {`,
`    const container = buttons.length ? buttons[0].parentNode : null;
    if (container) container.classList.toggle("has-selection", selectedDay != null);

    buttons.forEach((btn, i) => {`,
    "paintMonth head");

  write(FILE, js);
  console.log("booking-teeth.js: shine survives repaint; container tracks selection");
}

/* ── JS: the click itself ─────────────────────────────────────────────────── */
{
  const FILE = "assets/js/booking.js";
  let js = read(FILE);

  js = must(js,
`        renderAll(window.DH_STATE.lang, window.DH_STATE.dict);
      });
    });
  }`,
`        renderAll(window.DH_STATE.lang, window.DH_STATE.dict);

        // "when clicking OR conferming the tooth shines brighter than the others"
        // — the flare plays on the choice itself, not only on confirm.
        btn.classList.remove("dt-pick");
        void btn.offsetWidth;
        btn.classList.add("dt-pick");
      });
    });
  }`,
    "tooth click handler");

  write(FILE, js);
  console.log("booking.js: clicking a date flares the tooth");
}
