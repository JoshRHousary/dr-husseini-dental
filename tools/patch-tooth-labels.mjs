/* §4 — date labels centred on every tooth, molars included.

   Two defects:

   1. The label size and the weekday symbol were driven by hard-coded
      :nth-child ranges — guesses about which children are molars. They stripped
      the weekday symbol from TWELVE teeth (children 1-3, 14-19 and 30-32), which
      is why most of the arch showed a bare number. The tooth map already records
      each tooth's arch and index, so size is now driven by the cell's measured
      width, set as a data attribute at build time. Data beats guessing.

   2. Back molars are steeply foreshortened, so a horizontal label sits across a
      slanted crown. Each molar label now rotates toward the arch.

   The button itself already centres its content (flex, align/justify center), so
   a label that looks off-centre means the CELL is off the tooth — that is fixed
   in tools/build-teeth-map.py, not here.

   node tools/patch-tooth-labels.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── 1. drop the guessed nth-child rules ──────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);

  css = must(css,
`/* the back molars are small and steeply angled — shrink their labels to fit */
.date-tooth:nth-child(-n+3) .dt-num,
.date-tooth:nth-child(n+14):nth-child(-n+19) .dt-num,
.date-tooth:nth-child(n+30) .dt-num { font-size: .5cqw; }
.date-tooth:nth-child(-n+3) .dt-dow,
.date-tooth:nth-child(n+14):nth-child(-n+19) .dt-dow,
.date-tooth:nth-child(n+30) .dt-dow { display: none; }`,
`/* Label size follows the cell's measured width rather than a guessed child
   index. data-size is set from the tooth map when the buttons are built.
   The previous :nth-child ranges stripped the weekday symbol from twelve teeth. */
.date-tooth[data-size="sm"] .dt-num { font-size: .52cqw; }
.date-tooth[data-size="sm"] .dt-dow { font-size: .3cqw; letter-spacing: 0; }
.date-tooth[data-size="xs"] .dt-num { font-size: .44cqw; }
.date-tooth[data-size="xs"] .dt-dow { display: none; }   /* genuinely no room */

/* Back molars recede at an angle; a horizontal label reads as sliding off the
   crown, so each one tilts toward the arch. The sign flips across the midline. */
.date-tooth[data-tilt] { transform: rotate(var(--tilt, 0deg)); }
.date-tooth[data-tilt].dt-selected { transform: rotate(var(--tilt, 0deg)) scale(1.06); }`,
    "nth-child label rules");

  write(FILE, css);
  console.log("style.css: label sizing driven by data, molar labels tilt");
}

/* ── 2. set the attributes from the map ───────────────────────────────────── */
{
  const FILE = "assets/js/booking-teeth.js";
  let js = read(FILE);

  js = must(js,
`      btn.dataset.toothIndex = String(i);
      btn.dataset.ltrLeft = String(t.left);
      btn.dataset.ltrWidth = String(t.width);`,
`      btn.dataset.toothIndex = String(i);
      btn.dataset.ltrLeft = String(t.left);
      btn.dataset.ltrWidth = String(t.width);

      // Size class from the cell's real width, so narrow molars shrink and only
      // the very narrowest lose the weekday symbol.
      btn.dataset.size = t.width >= 2.6 ? "md" : (t.width >= 1.7 ? "sm" : "xs");

      // Tilt the back molars toward the arch. Teeth near the midline stay level;
      // the further out, the more they lean, mirrored across the centre.
      const centre = t.left + t.width / 2;
      const offset = centre - 50;
      if (Math.abs(offset) > 9) {
        const tilt = Math.max(-26, Math.min(26, offset * 1.25));
        btn.dataset.tilt = "1";
        btn.style.setProperty("--tilt", tilt.toFixed(1) + "deg");
      }`,
    "buildTeeth attributes");

  write(FILE, js);
  console.log("booking-teeth.js: data-size and molar tilt set from the map");
}
