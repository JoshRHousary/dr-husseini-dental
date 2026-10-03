/* §4 — the booking calendar gets a mobile layout.

   The 2026-10-02 session built the calendar as the 32 teeth, but every rule and
   every coordinate was desktop-only: the tooth geometry is written as inline
   `left/top/width/height` percentages of the stage, and inline styles beat any
   media query. On a phone the stage is a 42vh banner, so the 32 cells measured
   13-34px wide and floated over the month stepper and the time-slot card.
   Verified in Chromium at 390x844 before this patch (preview/verify).

   The fix keeps the same 32 buttons in the same day order — the click handlers,
   paintMonth and the confirm sequence are untouched — and only changes how they
   are laid out:

     desktop (>=901px)  absolute on the arches, as built
     mobile  (<=900px)  a 7-column weekday grid in normal flow, 48px minimum
                        cells, still tooth-shaped

   Weekday alignment is done by setting `grid-column-start` on day 1 only; the
   rest flow after it, and the spare teeth at the end are [hidden] already.

   node tools/patch-booking-mobile.mjs */

import { read, write, must } from "./lib/edit.mjs";

/* ── 1. a mount point in the flow ─────────────────────────────────────────── */
{
  const FILE = "booking.html";
  let html = read(FILE);
  if (html.includes('id="teethMount"')) {
    console.log("booking.html: mount already present");
  } else {
    html = must(html,
      '<p class="pick-hint" data-i18n="booking.pickOnTeeth">Pick a date on the teeth.</p>',
      '<p class="pick-hint" data-i18n="booking.pickOnTeeth">Pick a date on the teeth.</p>\n'
      + '      <!-- Under 900px the teeth move out of the stage and into here as a\n'
      + '           7-column grid; on desktop this stays empty. -->\n'
      + '      <div id="teethMount"></div>',
      "pick-hint");
    write(FILE, html);
  }
}

/* ── 2. the renderer learns the two layouts ───────────────────────────────── */
{
  const FILE = "assets/js/booking-teeth.js";
  let js = read(FILE);
  if (js.includes("DH_TEETH_GRID")) {
    console.log("booking-teeth.js: already has the grid layout");
  } else {
    js = must(js,
      "(function () {\n  const MIN_TEETH = 31;   // a long month",
      `(function () {
  const MIN_TEETH = 31;   // a long month

  /* DH_TEETH_GRID — the mobile layout.

     The arches only work where the stage is the page. Below 900px the stage is
     a banner, so the teeth leave it and become an ordinary 7-column calendar
     that still reads as teeth: same buttons, same order, same state classes. */
  const MOBILE = "(max-width: 900px)";
  function isGrid() {
    return !!(window.matchMedia && window.matchMedia(MOBILE).matches);
  }

  /* Move the container between the stage and the in-flow mount. */
  function placeContainer(container, grid) {
    const mount = document.getElementById("teethMount");
    const stage = document.getElementById("mouthStage");
    const window_ = document.getElementById("mouthWindow");
    if (grid) {
      if (mount && container.parentNode !== mount) mount.appendChild(container);
    } else if (stage && container.parentNode !== stage) {
      // back onto the arches, before the scrolling window it sits under
      if (window_) stage.insertBefore(container, window_);
      else stage.appendChild(container);
    }
  }

  /* The weekday header, rebuilt on every paint so it follows the language. */
  function renderDows(container, dict, grid) {
    let head = document.getElementById("dateTeethDows");
    if (!grid) { if (head) head.remove(); return; }
    if (!head) {
      head = document.createElement("div");
      head.id = "dateTeethDows";
      head.className = "dt-dows";
      head.setAttribute("aria-hidden", "true");
      container.parentNode.insertBefore(head, container);
    }
    head.innerHTML = dict.booking.weekdaysShort
      .map(d => "<span>" + d + "</span>").join("");
  }`,
      "booking-teeth IIFE head");

    // buildTeeth: no stage geometry in grid mode
    js = must(js,
      `    container.innerHTML = "";
    return map.map((t, i) => {`,
      `    const grid = isGrid();
    container.classList.toggle("dt-grid", grid);
    container.dataset.layout = grid ? "grid" : "stage";
    placeContainer(container, grid);
    container.innerHTML = "";
    return map.map((t, i) => {`,
      "buildTeeth head");

    js = must(js,
      `      btn.className = "date-tooth date-tooth-" + t.arch;
      btn.style.left = t.left + "%";`,
      `      btn.className = "date-tooth date-tooth-" + t.arch;
      if (grid) {
        // flow layout: the cells are sized by the grid, all labels full size
        btn.dataset.toothIndex = String(i);
        btn.dataset.ltrLeft = String(t.left);
        btn.dataset.ltrWidth = String(t.width);
        btn.dataset.size = "md";
        btn.innerHTML = '<span class="dt-dow"></span><span class="dt-num"></span>';
        container.appendChild(btn);
        return btn;
      }
      btn.style.left = t.left + "%";`,
      "buildTeeth geometry");

    // paintMonth: align day 1 to its weekday column
    js = must(js,
      `    const container = buttons.length ? buttons[0].parentNode : null;
    if (container) container.classList.toggle("has-selection", selectedDay != null);`,
      `    const container = buttons.length ? buttons[0].parentNode : null;
    if (container) container.classList.toggle("has-selection", selectedDay != null);

    const grid = container && container.dataset.layout === "grid";
    if (container) {
      renderDows(container, dict, grid);
      container.setAttribute("aria-label", dict.booking.selectDate);
    }
    // One column start, on day 1: every later day flows after it, so the whole
    // month lands under the right weekday without a single spacer element.
    if (grid && buttons[0]) {
      buttons[0].style.gridColumnStart = String(new Date(year, month, 1).getDay() + 1);
    }`,
      "paintMonth head");

    js = must(js,
      `  window.DH_BOOKING_TEETH = { buildTeeth, paintMonth, playConfirmSequence };`,
      `  window.DH_BOOKING_TEETH = { buildTeeth, paintMonth, playConfirmSequence, isGrid };`,
      "export");
    write(FILE, js);
  }
}

/* ── 3. rebuild when the breakpoint is crossed ────────────────────────────── */
{
  const FILE = "assets/js/booking.js";
  let js = read(FILE);
  if (js.includes("dh:teethlayout")) {
    console.log("booking.js: already rebuilds on breakpoint change");
  } else {
    js = must(js,
      `document.addEventListener("dh:langchange", (e) => {
  renderAll(e.detail.lang, e.detail.dict);
});`,
      `document.addEventListener("dh:langchange", (e) => {
  renderAll(e.detail.lang, e.detail.dict);
});

/* dh:teethlayout — the teeth are built once and reused, and the two layouts
   build different buttons, so crossing 900px (rotation, a resized window) has
   to throw the cached set away and build again. */
(function watchTeethLayout() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia("(max-width: 900px)");
  const rebuild = () => {
    const container = document.getElementById("dateTeeth");
    if (!container) return;
    dateTeethButtons = [];
    container.innerHTML = "";
    const state = window.DH_STATE || {};
    if (state.dict) renderAll(state.lang, state.dict);
    document.dispatchEvent(new CustomEvent("dh:teethlayout"));
  };
  if (mq.addEventListener) mq.addEventListener("change", rebuild);
  else if (mq.addListener) mq.addListener(rebuild);
})();`,
      "langchange listener");
    write(FILE, js);
  }
}

/* ── 4. the mobile styles ─────────────────────────────────────────────────── */
{
  const FILE = "assets/css/style.css";
  let css = read(FILE);
  if (css.includes("BOOKING: THE CALENDAR ON A PHONE")) {
    console.log("style.css: booking mobile block already present");
  } else {
    css += `
/* ═══════════════════════════════════════════════════════════════════════════
   ── BOOKING: THE CALENDAR ON A PHONE ──
   The teeth are the calendar only where the stage is the page. Under 900px the
   stage is a banner, so the teeth leave it (booking-teeth.js moves them to
   #teethMount) and lay out as a 7-column month grid — still tooth-shaped, but
   at a size a thumb can hit. Every rule carries body.page-booking so it outranks
   the top-level stage rules it has to undo.
   ═══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 900px) {
  /* the palate menu and language pills are unreadable in a banner; the header
     nav and its own language switch cover both */
  body.page-booking .palate-nav,
  body.page-booking .palate-langs { display: none; }

  body.page-booking .date-teeth.dt-grid {
    position: static;
    inset: auto;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    pointer-events: auto;
    margin: 0 0 1.4em;
  }
  body.page-booking .dt-dows {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin: 0 0 6px;
  }
  body.page-booking .dt-dows span {
    text-align: center;
    font: 700 13px/1 var(--font-body);
    letter-spacing: .04em;
    text-transform: uppercase;
    opacity: .68;
  }

  body.page-booking .date-teeth.dt-grid .date-tooth {
    position: static;
    width: auto;
    height: auto;
    min-height: 48px;          /* above the 44px tap minimum */
    gap: 2px;
    padding: 6px 2px;
    background: rgba(255, 252, 245, .92);
    border: 1px solid rgba(122, 38, 33, .16);
    /* a crown: square shoulders, rounded biting edge */
    border-radius: 34% 34% 46% 46% / 20% 20% 34% 34%;
    transform: none;
    box-shadow: none;
  }
  /* the stage labels are sized in cqw, which means nothing outside the stage */
  body.page-booking .date-teeth.dt-grid .date-tooth .dt-dow {
    font-size: 11.5px;
    letter-spacing: .02em;
    display: block;
    opacity: .6;
  }
  body.page-booking .date-teeth.dt-grid .date-tooth .dt-num { font-size: 16px; }

  body.page-booking .date-teeth.dt-grid .date-tooth.dt-today {
    box-shadow: inset 0 0 0 2px #B23F38;
  }
  body.page-booking .date-teeth.dt-grid .date-tooth.dt-selected {
    background: #FFFFFF;
    color: #5E1C18;
    border-color: rgba(122, 38, 33, .5);
    box-shadow: 0 0 0 2px rgba(178, 63, 56, .9), 0 6px 18px rgba(122, 38, 33, .22);
    transform: none;           /* a scaled cell would break the grid rhythm */
  }
  body.page-booking .date-teeth.dt-grid .date-tooth.dt-past,
  body.page-booking .date-teeth.dt-grid .date-tooth.dt-full {
    background: rgba(240, 232, 226, .6);
    border-color: transparent;
  }
  /* the pick flare scales the cell on desktop; in a grid it just jitters */
  body.page-booking .date-teeth.dt-grid .date-tooth.dt-pick { animation: none; }
}
`;
    write(FILE, css);
  }
}

console.log("done — run: node tools/check-site.mjs");
