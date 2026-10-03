/* Rewires booking.js onto the teeth.

   Replaced: renderWeekdayHeader + renderDays (the 7-column grid) -> the 32 date
   teeth. Everything else is reused unchanged — bookingState, refreshAvailability,
   isTaken, dayFullyBooked, TIME_SLOTS, validate, whatsappMessage, the backend
   submit and the #fallbackWhatsapp escape hatch.

   Added to handleConfirm: the shine -> close -> smile -> reopen sequence, which
   runs AFTER the request is stored and never gates the WhatsApp hand-off on an
   error path.

   node tools/patch-booking-js.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "assets/js/booking.js";
let js = read(FILE);

if (js.includes("DH_BOOKING_TEETH")) {
  console.log("booking.js: already wired to the teeth");
  process.exit(0);
}

/* ── 1. a handle for the built tooth buttons ──────────────────────────────── */
js = must(js,
  "  submitting: false\n};",
  "  submitting: false\n};\n\n// the 32 date-tooth buttons, built once on load\nlet dateTeethButtons = [];",
  "state object");

/* ── 2. the grid renderers become the tooth renderer ──────────────────────── */
const weekdayStart = js.indexOf("function renderWeekdayHeader(dict) {");
const daysEnd = js.indexOf("function renderTimeSlots(dict, lang) {");
if (weekdayStart === -1 || daysEnd === -1) throw new Error("renderers not found");

js = js.slice(0, weekdayStart) +
`/* The calendar is the teeth. A full adult dentition is 32 and a month is 28-31
   days, so the month maps onto the mouth with the wisdom teeth left spare.
   Rendering lives in assets/js/booking-teeth.js. */
function renderDateTeeth(dict, lang) {
  const container = document.getElementById("dateTeeth");
  const api = window.DH_BOOKING_TEETH;
  if (!container || !api) return;

  if (!dateTeethButtons.length) {
    dateTeethButtons = api.buildTeeth(container);
    dateTeethButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const day = Number(btn.dataset.toothIndex) + 1;
        bookingState.selectedDay = day;
        // a time chosen for another day may already be taken on this one
        if (bookingState.selectedSlot) {
          const [h, m] = bookingState.selectedSlot.split(":").map(Number);
          if (isTaken(bookingState.year, bookingState.month, day, h, m)) {
            bookingState.selectedTime = null;
            bookingState.selectedSlot = null;
          }
        }
        renderAll(window.DH_STATE.lang, window.DH_STATE.dict);
      });
    });
  }

  api.paintMonth(dateTeethButtons, {
    year: bookingState.year,
    month: bookingState.month,
    dict, lang,
    today: startOfToday(),
    selectedDay: bookingState.selectedDay,
    isTaken,
    dayFull: (y, mo, d) => dayFullyBooked(y, mo, d)
  });
}

` + js.slice(daysEnd);

/* ── 3. renderAll calls the new renderer ──────────────────────────────────── */
js = must(js,
`  renderMonthLabel(dict);
  renderWeekdayHeader(dict);
  renderDays(dict);
  renderTimeSlots(dict, lang);`,
`  renderMonthLabel(dict);
  renderDateTeeth(dict, lang);
  renderTimeSlots(dict, lang);`,
  "renderAll");

/* ── 4. the confirmation sequence ─────────────────────────────────────────── */
js = must(js,
`  if (res.ok) { window.location.assign(waUrl); return; }`,
`  if (res.ok) {
    await runConfirmSequence();
    window.location.assign(waUrl);
    return;
  }`,
  "stored-ok branch");

js = must(js,
`  // No backend: straight to WhatsApp, same as before.
  if (!api || !api.enabled()) { window.location.assign(waUrl); return; }`,
`  // No backend: the request is not stored, but the confirmation still plays —
  // the patient has still chosen a slot and is still being handed to WhatsApp.
  if (!api || !api.enabled()) {
    await runConfirmSequence();
    window.location.assign(waUrl);
    return;
  }`,
  "no-backend branch");

/* the sequence itself, placed just before handleConfirm */
js = must(js,
"async function handleConfirm(lang, dict) {",
`/* The chosen tooth shines, then every tooth, then the mouth closes into a smile
   and reopens. Never allowed to strand the patient: it is capped internally, and
   on any error path handleConfirm goes straight to WhatsApp without it. */
async function runConfirmSequence() {
  const api = window.DH_BOOKING_TEETH;
  if (!api) return;
  const selected = dateTeethButtons.find(b => b.classList.contains("dt-selected"));
  try {
    await api.playConfirmSequence(selected);
  } catch (err) {
    console.warn("[booking] confirmation sequence failed:", err && err.message);
  }
}

async function handleConfirm(lang, dict) {`,
  "handleConfirm");

write(FILE, js);
console.log("booking.js: rendering on the teeth, confirmation sequence wired");
