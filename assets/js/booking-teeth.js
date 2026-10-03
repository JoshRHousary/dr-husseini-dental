/* The booking calendar, rendered onto the teeth.

   All 32 teeth carry the dates of the month — a full adult dentition is 32 and a
   month is 28-31 days, so a month maps onto the mouth almost exactly, with the
   wisdom teeth left over. Each tooth shows the weekday symbol above the date.

   Order: upper arch left-to-right (1-16), then lower arch left-to-right (17-32),
   so the month reads top-down like a calendar.

   Coordinates come from window.DH_TEETH (assets/data/teeth-data.js), generated
   by tools/build-teeth-map.py.

   This file replaces the grid renderers in booking.js; the state object, the
   availability lookup and the whole submit flow are unchanged. */

(function () {
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
  }

  function teethMap() {
    const t = window.DH_TEETH;
    if (!Array.isArray(t) || t.length < MIN_TEETH) {
      console.warn("[booking] tooth map missing or too small; falling back to the list view");
      return null;
    }
    return t;
  }

  /* Build the 32 tooth buttons once; re-rendering only updates their contents. */
  function buildTeeth(container) {
    const map = teethMap();
    if (!map) return [];
    const grid = isGrid();
    container.classList.toggle("dt-grid", grid);
    container.dataset.layout = grid ? "grid" : "stage";
    placeContainer(container, grid);
    container.innerHTML = "";
    return map.map((t, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-tooth date-tooth-" + t.arch;
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
      btn.style.left = t.left + "%";
      btn.style.top = t.top + "%";
      btn.style.width = t.width + "%";
      btn.style.height = t.height + "%";
      btn.dataset.toothIndex = String(i);
      btn.dataset.ltrLeft = String(t.left);
      btn.dataset.ltrWidth = String(t.width);

      // Size class from the cell's real width, so narrow molars shrink and only
      // the very narrowest lose the weekday symbol.
      // Thresholds tuned to the real cell widths: only the two wisdom-tooth
      // cells are narrow enough to lose the weekday symbol, and those are the
      // spares in most months anyway.
      btn.dataset.size = t.width >= 2.6 ? "md" : (t.width >= 1.1 ? "sm" : "xs");

      // Tilt the back molars toward the arch. Teeth near the midline stay level;
      // the further out, the more they lean, mirrored across the centre.
      // Ramps from level at the midline to a lean at the molars, rather than
      // snapping on at a threshold — the front incisors stay upright.
      const centre = t.left + t.width / 2;
      const offset = centre - 50;
      const away = Math.min(1, Math.max(0, (Math.abs(offset) - 12) / 10));
      if (away > 0) {
        const tilt = Math.sign(offset) * away * 20;
        btn.dataset.tilt = "1";
        btn.style.setProperty("--tilt", tilt.toFixed(1) + "deg");
      }
      btn.innerHTML = '<span class="dt-dow"></span><span class="dt-num"></span>';
      container.appendChild(btn);
      return btn;
    });
  }

  /* Fill the teeth with a month. Day N goes on tooth N; the leftover teeth at
     the back of the lower arch sit empty, which is where the wisdom teeth are. */
  function paintMonth(buttons, ctx) {
    const { year, month, dict, lang, today, selectedDay, isTaken, dayFull } = ctx;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dows = dict.booking.weekdaysShort;

    const container = buttons.length ? buttons[0].parentNode : null;
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
    }

    buttons.forEach((btn, i) => {
      const day = i + 1;
      const dow = btn.querySelector(".dt-dow");
      const num = btn.querySelector(".dt-num");

      if (day > daysInMonth) {
        btn.hidden = true;
        btn.disabled = true;
        btn.className = "date-tooth date-tooth-spare";
        dow.textContent = "";
        num.textContent = "";
        btn.removeAttribute("aria-label");
        return;
      }

      const date = new Date(year, month, day);
      const isPast = date < today;
      const full = dayFull(year, month, day);
      const selected = selectedDay === day;
      const isToday = date.getTime() === today.getTime();

      btn.hidden = false;
      btn.disabled = isPast || full;
      // a repaint must not strip an animation that is mid-flight
      const keepShine = btn.classList.contains("dt-shine") ? " dt-shine" : "";
      const keepStrong = btn.classList.contains("dt-shine-strong") ? " dt-shine-strong" : "";
      btn.className = "date-tooth"
        + " date-tooth-" + (window.DH_TEETH[i].arch)
        + (isPast ? " dt-past" : "")
        + (full ? " dt-full" : "")
        + (selected ? " dt-selected" : "")
        + (isToday ? " dt-today" : "")
        + keepShine + keepStrong;

      dow.textContent = dows[date.getDay()];
      num.textContent = String(day);

      const monthName = dict.booking.months[month];
      btn.setAttribute("aria-label",
        `${dows[date.getDay()]} ${day} ${monthName} ${year}`
        + (full ? " — " + dict.booking.dayFull : "")
        + (isPast ? " — " + (dict.booking.datePast || "") : ""));
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      if (full) btn.title = dict.booking.dayFull;
      else btn.removeAttribute("title");
    });
  }

  /* ── the confirmation sequence ───────────────────────────────────────────
     chosen tooth shines -> every tooth shines -> the mouth closes into a smile
     -> it reopens and browsing continues.

     The two mouth clips are Higgsfield renders (Kling v3.0, keyframed from the
     same stills the intro uses). They are preload="none" and only fetched here,
     so nobody pays for them unless they actually book.

     Returns a promise that resolves when the mouth is open again. Under reduced
     motion it resolves immediately without playing anything. */
  function playConfirmSequence(selectedButton) {
    const reduce = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seq = document.getElementById("smileSequence");
    if (reduce || !seq) return Promise.resolve();

    const closeClip = document.getElementById("smileClose");
    const openClip = document.getElementById("smileOpen");
    const still = document.getElementById("smileStill");
    const stage = document.getElementById("mouthStage");
    const all = Array.from(document.querySelectorAll(".date-tooth:not([hidden])"));

    return new Promise(resolve => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        seq.hidden = true;
        seq.classList.remove("seq-close", "seq-hold", "seq-open");
        if (stage) stage.classList.remove("teeth-shine-all");
        all.forEach(b => b.classList.remove("dt-shine"));
        if (selectedButton) selectedButton.classList.remove("dt-shine-strong");
        resolve();
      };
      // never strand the patient if a clip fails to load or stalls
      const hardCap = setTimeout(done, 7000);

      // 1. the chosen tooth shines brighter than the rest
      if (selectedButton) selectedButton.classList.add("dt-shine-strong");

      setTimeout(() => {
        // 2. then every tooth shines, rippling out from the choice
        const chosen = selectedButton ? all.indexOf(selectedButton) : 0;
        all.forEach((b, i) => {
          b.style.setProperty("--shine-delay", Math.abs(i - chosen) * 26 + "ms");
          b.classList.add("dt-shine");
        });
        if (stage) stage.classList.add("teeth-shine-all");
      }, 420);

      setTimeout(() => {
        // 3. the mouth closes into a smile
        seq.hidden = false;
        seq.classList.add("seq-close");
        const playClose = closeClip && closeClip.play();
        if (playClose && playClose.catch) {
          // no video: hold the smile still instead, so the beat still lands
          playClose.catch(() => {
            seq.classList.add("seq-hold");
            if (still) still.style.opacity = "1";
          });
        }
      }, 1150);

      if (closeClip) {
        closeClip.addEventListener("ended", () => {
          // 4. hold the smile for a beat, then reopen
          seq.classList.add("seq-hold");
          setTimeout(() => {
            seq.classList.remove("seq-hold");
            seq.classList.add("seq-open");
            const p = openClip && openClip.play();
            if (p && p.catch) p.catch(done);
          }, 650);
        }, { once: true });
      }
      if (openClip) {
        openClip.addEventListener("ended", () => {
          clearTimeout(hardCap);
          done();
        }, { once: true });
      }
    });
  }

  window.DH_BOOKING_TEETH = { buildTeeth, paintMonth, playConfirmSequence, isGrid };
})();
