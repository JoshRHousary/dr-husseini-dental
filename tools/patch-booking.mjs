/* Rebuilds the booking page's side panel: patient fields, live slot summary,
   status line, real submit button, and the backend scripts.
   Idempotent — re-running it detects the new markup and does nothing.

   Run: node tools/patch-booking.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "booking.html";
let s = read(FILE);

if (s.includes('id="bkName"')) {
  console.log("booking.html already has the patient form — nothing to do.");
  process.exit(0);
}

/* 1. side panel */
const sideStart = s.indexOf('      <div class="booking-side">');
const sideEnd = s.indexOf("\n      </div>", sideStart);
if (sideStart === -1 || sideEnd === -1) throw new Error("booking-side block not found");

const newSide = `      <div class="booking-side">
        <h3 data-i18n="booking.selectTime">Select a time</h3>
        <div id="timeSlots" class="time-row"></div>
        <p id="slotSummary" class="slot-summary" hidden></p>

        <h3 style="margin-top:26px;" data-i18n="booking.yourDetails">Your details</h3>
        <div class="booking-form">
          <label class="field">
            <span data-i18n="booking.fieldName">Full name</span>
            <input id="bkName" type="text" name="name" autocomplete="name" required maxlength="120">
          </label>
          <label class="field">
            <span data-i18n="booking.fieldPhone">Phone / WhatsApp</span>
            <input id="bkPhone" type="tel" name="phone" autocomplete="tel" inputmode="tel" required maxlength="40" placeholder="03 855 860">
          </label>
          <label class="field">
            <span data-i18n="booking.fieldService">Treatment</span>
            <select id="bkService" name="service"></select>
          </label>
          <label class="field">
            <span data-i18n="booking.fieldNotes">Anything we should know? (optional)</span>
            <textarea id="bkNotes" name="notes" rows="3" maxlength="1000"></textarea>
          </label>
        </div>

        <p id="bookingStatus" class="booking-status" role="status" aria-live="polite" hidden></p>

        <button type="button" id="confirmBtn" class="btn btn-whatsapp btn-disabled" disabled style="width:100%; margin-top:18px;" data-i18n="booking.confirmWhatsapp">Confirm on WhatsApp</button>
        <a id="fallbackWhatsapp" class="btn btn-outline" href="#" target="_blank" rel="noopener" hidden style="width:100%; margin-top:10px;" data-i18n="booking.openWhatsappAnyway">Open WhatsApp anyway</a>

        <p class="booking-note" style="margin-top:20px;" data-i18n="booking.prefersCall">Prefer to call instead?</p>
        <div style="display:flex; gap:10px; margin-top:8px;">
          <a href="tel:+96101308206" class="btn btn-outline" style="flex:1; padding:10px;">01/308206</a>
          <a href="tel:+96103855860" class="btn btn-outline" style="flex:1; padding:10px;">03/855860</a>
        </div>

        <p id="availabilityNote" class="booking-note" style="margin-top:24px;"></p>`;

s = s.slice(0, sideStart) + newSide + s.slice(sideEnd);

/* 2. config + adapter load before booking.js */
s = must(s,
  '<script src="assets/js/booking.js"></script>',
  '<script src="assets/js/booking-config.js"></script>\n'
  + '<script src="assets/js/booking-backend.js"></script>\n'
  + '<script src="assets/js/booking.js"></script>',
  "booking.js script tag");

/* 3. page-local styles for the form and the new slot states */
s = must(s,
  "  .booking-note { font-size: 12.5px; color: var(--ink-soft); margin-top: 18px; }",
`  .booking-note { font-size: 12.5px; color: var(--ink-soft); margin-top: 18px; }

  .tooth-full { background: var(--bg-soft); color: var(--ink-soft); text-decoration: line-through; }
  .time-chip-taken { opacity: .38; text-decoration: line-through; }
  .time-chip:disabled { cursor: not-allowed; }

  .slot-summary {
    margin-top: 16px; padding: 10px 14px; border-radius: var(--radius-sm);
    background: var(--primary-light); color: var(--primary-dark);
    font-weight: 600; font-size: 13.5px;
  }

  .booking-form { display: grid; gap: 14px; margin-top: 4px; }
  .field { display: grid; gap: 6px; }
  .field > span { font-size: 12.5px; font-weight: 600; color: var(--ink-soft); }
  .field input, .field select, .field textarea {
    width: 100%; padding: 11px 13px; border-radius: var(--radius-sm);
    border: 1px solid var(--line); background: var(--bg);
    font-family: inherit; font-size: 14.5px; color: var(--ink);
  }
  .field input:focus-visible, .field select:focus-visible, .field textarea:focus-visible {
    outline: 2px solid var(--primary); outline-offset: 1px; border-color: var(--primary);
  }
  .field textarea { resize: vertical; min-height: 72px; }
  .field-invalid { border-color: var(--accent) !important; background: var(--accent-soft); }

  .booking-status { margin-top: 16px; font-size: 13px; font-weight: 600; }
  .booking-status-error { color: #A32F1C; }
  .booking-status-busy { color: var(--ink-soft); }

  #confirmBtn:disabled { opacity: .4; pointer-events: none; }`,
  "booking-note style");

write(FILE, s) ? console.log("booking.html patched") : console.log("booking.html unchanged");
