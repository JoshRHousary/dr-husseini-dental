/* The last three specificity findings from check-site.

   `.mouth-window .grid-3, .mouth-window .grid-2` (style.css:497) and
   `.mouth-window .cta-band` (:499) are base-cascade rules, so they outrank the
   bare `.grid-2` / `.grid-3` / `.cta-band` rules in the Responsive section.

   No visible bug today, because those base rules happen to set the same values
   the mobile rules were asking for — every page's content sits inside
   .mouth-window, so the base rule is what actually applies. But the mobile
   rules are dead, and they would quietly stop working the moment either value
   diverged. Raise them to matching specificity so they hold either way.

   node tools/patch-responsive-specificity.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "assets/css/style.css";
let css = read(FILE);

if (css.includes(".mouth-window .hero-grid")) {
  console.log("style.css: responsive rules already specificity-matched");
  process.exit(0);
}

css = must(css,
`@media (max-width: 960px) {
  .hero-grid, .grid-2 { grid-template-columns: 1fr; }
  .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: 1fr 1fr; }
}`,
`@media (max-width: 960px) {
  /* .mouth-window-prefixed variants included so these are not outranked by the
     base rules at the top of the "FIT INSIDE THE MOUTH" section — every page's
     content sits inside .mouth-window. */
  .hero-grid, .grid-2,
  .mouth-window .hero-grid, .mouth-window .grid-2 { grid-template-columns: 1fr; }
  .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .footer-grid, .mouth-window .footer-grid { grid-template-columns: 1fr 1fr; }
}`,
  "960px block");

css = must(css,
`@media (max-width: 680px) {
  .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .cta-band { flex-direction: column; text-align: center; }
  .footer-grid { grid-template-columns: 1fr; }
}`,
`@media (max-width: 680px) {
  .grid-3, .grid-4,
  .mouth-window .grid-3, .mouth-window .grid-4 { grid-template-columns: 1fr; }
  .cta-band, .mouth-window .cta-band { flex-direction: column; text-align: center; }
  .footer-grid, .mouth-window .footer-grid { grid-template-columns: 1fr; }
}`,
  "680px block");

write(FILE, css);
console.log("style.css: Responsive section rules now match .mouth-window specificity");
