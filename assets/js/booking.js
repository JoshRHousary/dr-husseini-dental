/* Booking page: "Mouth of [Month]" calendar + patient details + WhatsApp handoff.

   Storage and availability go through window.DH_BOOKING_API (assets/js/booking-backend.js).
   With no backend configured that adapter is a no-op and this page behaves exactly
   as it did before: pick a slot, hand it to WhatsApp. With a backend configured the
   request is saved and taken slots are greyed out first. */

const LOCALE_MAP = { en: "en-US", ar: "ar-LB", fr: "fr-FR" };
const TIME_SLOTS = [[9,0],[10,0],[11,0],[13,0],[14,0],[15,0],[16,0]];

const bookingState = {
  today: new Date(),
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11
  selectedDay: null,
  selectedTime: null,   // display label, e.g. "9:00 AM"
  selectedSlot: null,   // 24h key, e.g. "09:00"
  taken: new Set(),     // "YYYY-MM-DD HH:MM"
  availabilityDegraded: false,
  submitting: false
};

// the 32 date-tooth buttons, built once on load
let dateTeethButtons = [];

function startOfToday() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

const pad = n => String(n).padStart(2, "0");
const slotKey = (h, m) => `${pad(h)}:${pad(m)}`;
const isoDate = (y, mo, d) => `${y}-${pad(mo + 1)}-${pad(d)}`;

function formatTimeSlot(hour, minute, lang) {
  const d = new Date(2000, 0, 1, hour, minute);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || "en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

function isTaken(y, mo, day, h, m) {
  return bookingState.taken.has(`${isoDate(y, mo, day)} ${slotKey(h, m)}`);
}

function dayFullyBooked(y, mo, day) {
  return TIME_SLOTS.every(([h, m]) => isTaken(y, mo, day, h, m));
}

/* Availability for the whole visible month, fetched once per month change. */
async function refreshAvailability() {
  const api = window.DH_BOOKING_API;
  if (!api) return;
  const { year, month } = bookingState;
  const from = isoDate(year, month, 1);
  const to = isoDate(year, month, new Date(year, month + 1, 0).getDate());
  const res = await api.fetchTaken(from, to);
  bookingState.taken = res.taken;
  bookingState.availabilityDegraded = res.degraded;
}

function renderMonthLabel(dict) {
  const label = document.getElementById("monthLabel");
  if (!label) return;
  const monthName = dict.booking.months[bookingState.month];
  label.textContent = `${dict.booking.calendarPrefix} ${monthName} ${bookingState.year}`;
}

/* The calendar is the teeth. A full adult dentition is 32 and a month is 28-31
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

        // "when clicking OR conferming the tooth shines brighter than the others"
        // — the flare plays on the choice itself, not only on confirm.
        btn.classList.remove("dt-pick");
        void btn.offsetWidth;
        btn.classList.add("dt-pick");
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

function renderTimeSlots(dict, lang) {
  const wrap = document.getElementById("timeSlots");
  if (!wrap) return;
  wrap.innerHTML = "";
  const day = bookingState.selectedDay;

  TIME_SLOTS.forEach(([h, m]) => {
    const label = formatTimeSlot(h, m, lang);
    const key = slotKey(h, m);
    const taken = day != null && isTaken(bookingState.year, bookingState.month, day, h, m);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "time-chip"
      + (bookingState.selectedSlot === key ? " time-chip-selected" : "")
      + (taken ? " time-chip-taken" : "");
    btn.textContent = label;
    btn.disabled = taken;
    if (taken) btn.title = dict.booking.slotTaken;
    btn.addEventListener("click", () => {
      bookingState.selectedTime = label;
      bookingState.selectedSlot = key;
      renderTimeSlots(dict, lang);
      updateSummary(lang, dict);
    });
    wrap.appendChild(btn);
  });
}

/* ── form ─────────────────────────────────────────────────────────────────── */

function formValues() {
  const val = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  };
  return { name: val("bkName"), phone: val("bkPhone"), service: val("bkService"), notes: val("bkNotes") };
}

function setStatus(message, kind) {
  const el = document.getElementById("bookingStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = "booking-status" + (kind ? " booking-status-" + kind : "");
  el.hidden = !message;
}

function fieldError(id, on) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle("field-invalid", !!on);
    el.setAttribute("aria-invalid", on ? "true" : "false");
  }
}

function validate(dict) {
  const { name, phone } = formValues();
  // Lebanese numbers run 7-8 national digits; accept any 6-15 digit international form.
  const digits = phone.replace(/\D/g, "");
  const nameBad = name.length < 2;
  const phoneBad = digits.length < 6 || digits.length > 15;
  fieldError("bkName", nameBad);
  fieldError("bkPhone", phoneBad);
  if (nameBad) return dict.booking.errName;
  if (phoneBad) return dict.booking.errPhone;
  if (!bookingState.selectedDay || !bookingState.selectedSlot) return dict.booking.errSlot;
  return null;
}

function whatsappMessage(lang, dict) {
  const { name, phone, service, notes } = formValues();
  const monthName = dict.booking.months[bookingState.month];
  const dateStr = `${bookingState.selectedDay} ${monthName} ${bookingState.year}`;
  const serviceLabel = service ? (dict.booking.services[service] || service) : "—";

  const t = {
    en: `Hello, I'd like to book an appointment on ${dateStr} at ${bookingState.selectedTime}.\nName: ${name}\nPhone: ${phone}\nTreatment: ${serviceLabel}` + (notes ? `\nNotes: ${notes}` : ""),
    ar: `مرحباً، أرغب في حجز موعد بتاريخ ${dateStr} الساعة ${bookingState.selectedTime}.\nالاسم: ${name}\nالهاتف: ${phone}\nالعلاج: ${serviceLabel}` + (notes ? `\nملاحظات: ${notes}` : ""),
    fr: `Bonjour, je souhaite prendre rendez-vous le ${dateStr} à ${bookingState.selectedTime}.\nNom : ${name}\nTéléphone : ${phone}\nTraitement : ${serviceLabel}` + (notes ? `\nNotes : ${notes}` : "")
  };
  return t[lang] || t.en;
}

function updateSummary(lang, dict) {
  const confirmBtn = document.getElementById("confirmBtn");
  if (!confirmBtn) return;
  const ready = bookingState.selectedDay && bookingState.selectedSlot;
  const blocked = !ready || bookingState.submitting;
  confirmBtn.classList.toggle("btn-disabled", blocked);
  confirmBtn.disabled = blocked;

  const summary = document.getElementById("slotSummary");
  if (summary) {
    if (ready) {
      const monthName = dict.booking.months[bookingState.month];
      summary.textContent = `${bookingState.selectedDay} ${monthName} ${bookingState.year} · ${bookingState.selectedTime}`;
      summary.hidden = false;
    } else {
      summary.hidden = true;
    }
  }
}

/* The chosen tooth shines, then every tooth, then the mouth closes into a smile
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

async function handleConfirm(lang, dict) {
  if (bookingState.submitting) return;

  const problem = validate(dict);
  if (problem) { setStatus(problem, "error"); return; }

  const api = window.DH_BOOKING_API;
  const waUrl = `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(whatsappMessage(lang, dict))}`;

  // No backend: the request is not stored, but the confirmation still plays —
  // the patient has still chosen a slot and is still being handed to WhatsApp.
  if (!api || !api.enabled()) {
    await runConfirmSequence();
    window.location.assign(waUrl);
    return;
  }

  bookingState.submitting = true;
  setStatus(dict.booking.saving, "busy");
  updateSummary(lang, dict);

  const { name, phone, service, notes } = formValues();
  const res = await api.submit({
    slot_date: isoDate(bookingState.year, bookingState.month, bookingState.selectedDay),
    slot_time: bookingState.selectedSlot,
    name, phone,
    service: service || null,
    notes: notes || null,
    lang
  });

  bookingState.submitting = false;

  if (res.ok) {
    await runConfirmSequence();
    window.location.assign(waUrl);
    return;
  }

  if (res.reason === "slot_taken") {
    await refreshAvailability();
    bookingState.selectedTime = null;
    bookingState.selectedSlot = null;
    renderAll(lang, dict);
    setStatus(dict.booking.errSlotGone, "error");
    return;
  }

  // Saving failed for some other reason — never trap the patient. Offer WhatsApp.
  setStatus(dict.booking.errSaveFallback, "error");
  updateSummary(lang, dict);
  const fallback = document.getElementById("fallbackWhatsapp");
  if (fallback) { fallback.href = waUrl; fallback.hidden = false; }
}

/* ── wiring ───────────────────────────────────────────────────────────────── */

function renderNotes(dict) {
  const note = document.getElementById("availabilityNote");
  if (!note) return;
  const api = window.DH_BOOKING_API;
  if (!api || !api.enabled()) note.textContent = dict.booking.noteRequestOnly;
  else if (bookingState.availabilityDegraded) note.textContent = dict.booking.noteAvailabilityOffline;
  else note.textContent = dict.booking.noteLiveAvailability;
}

function renderServiceOptions(dict) {
  const select = document.getElementById("bkService");
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = dict.booking.servicePrompt;
  select.appendChild(blank);
  Object.entries(dict.booking.services).forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = current;
}

function changeMonth(delta) {
  bookingState.month += delta;
  if (bookingState.month < 0) { bookingState.month = 11; bookingState.year -= 1; }
  if (bookingState.month > 11) { bookingState.month = 0; bookingState.year += 1; }
  bookingState.selectedDay = null;
  bookingState.selectedTime = null;
  bookingState.selectedSlot = null;
  refreshAvailability().then(() => renderAll(window.DH_STATE.lang, window.DH_STATE.dict));
}

function renderAll(lang, dict) {
  if (!dict) return;
  renderMonthLabel(dict);
  renderDateTeeth(dict, lang);
  renderTimeSlots(dict, lang);
  renderServiceOptions(dict);
  renderNotes(dict);
  updateSummary(lang, dict);
}

document.addEventListener("dh:langchange", (e) => {
  renderAll(e.detail.lang, e.detail.dict);
});

document.addEventListener("DOMContentLoaded", async () => {
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  if (prevBtn) prevBtn.addEventListener("click", () => changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeMonth(1));

  const confirmBtn = document.getElementById("confirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () =>
      handleConfirm(window.DH_STATE.lang, window.DH_STATE.dict));
  }
  ["bkName", "bkPhone"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { fieldError(id, false); setStatus(""); });
  });

  await refreshAvailability();
  if (window.DH_STATE.dict) renderAll(window.DH_STATE.lang, window.DH_STATE.dict);
});
