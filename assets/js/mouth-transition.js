/* Dr. Jihad S. Husseini — menu transition: the tooth shines, the mouth smiles,
   the next page opens out of it.

   This is a multi-page site, so an overlay cannot survive the navigation. The
   sequence is split across the two page loads, which is also what hides the
   load itself — the landonorris mask/morph read, at menu scale:

     outgoing page   shine the clicked tooth -> ripple the light along the
                     arch -> cover with the closing clip -> navigate
     arriving page   cover before first paint -> play the opening clip ->
                     fade out onto the new page

   A one-shot sessionStorage flag carries the baton. It is read and removed by
   a tiny inline script in each page's <head>, so the cover is up before first
   paint (no flash of the new page under the smile) and a plain refresh never
   replays the opening half.

   Hard rule, borrowed from the booking confirm: the animation never gates the
   navigation. Reduced motion, a save-data connection, a refused play(), a
   missing clip or a blown cap all fall through to going to the page.

   Clips are assets/media/smile-{close,open}-fast.mp4 (~86KB / ~94KB), cut from
   the booking smile renders by tools/make-transition-clips.mjs. The 5.7MB
   originals stay where they are, for the booking confirm. */
(function () {
  "use strict";

  var FLAG = "dh_pt";            // sessionStorage baton, set on the way out
  var LEAD_MS = 260;             // shine alone, before the mouth starts closing
  var RIPPLE_MS = 26;            // per-tooth stagger, as the booking arch uses
  var OUT_CAP = 900;             // never hold the navigation longer than this
  var IN_CAP = 1200;             // never hold the new page behind the cover
  var STILL_MS = 360;            // how long the still stands in for a clip
  var FADE_MS = 200;             // matches the .page-transition opacity transition

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = false;

  function el(id) { return document.getElementById(id); }

  /* Same test chooseIntroEncode() uses for the 1080p loader: do not spend a
     Lebanese mobile connection's budget on decoration. */
  function thinPipe() {
    var c = navigator.connection;
    if (!c) return false;
    return !!c.saveData || /^(slow-)?2g$|^3g$/.test(c.effectiveType || "");
  }

  function overlay() { return el("pageTransition"); }

  function canRun() {
    return !reduced && !running && !!overlay();
  }

  /* ── the clips are fetched lazily, but not at the last moment ───────────── */
  var warmed = false;
  function warmClips() {
    if (warmed || reduced || thinPipe()) return;
    warmed = true;
    ["ptClose", "ptOpen"].forEach(function (id) {
      var v = el(id);
      if (v) { v.preload = "auto"; v.load(); }
    });
  }

  /* ── outgoing: shine, close, go ─────────────────────────────────────────── */

  /* Teeth in visual order, so the ripple runs outward from the one clicked
     even in Arabic, where applyTeethDirection() mirrors the x positions. */
  function teethInVisualOrder() {
    var list = Array.prototype.slice.call(document.querySelectorAll(".teeth-nav .tooth"));
    return list.sort(function (a, b) {
      return parseFloat(a.style.left || "0") - parseFloat(b.style.left || "0");
    });
  }

  function shine(origin) {
    var teeth = teethInVisualOrder();
    var idx = teeth.indexOf(origin);

    if (origin && origin.classList.contains("tooth") && idx !== -1) {
      origin.classList.add("tn-shine-strong");
      teeth.forEach(function (t, i) {
        if (t === origin) return;
        t.style.setProperty("--shine-delay", Math.abs(i - idx) * RIPPLE_MS + "ms");
        t.classList.add("tn-shine");
      });
      return;
    }
    // No tooth to shine (mobile drawer, palate menu): flash the link itself.
    if (origin) {
      origin.classList.remove("tn-tap");
      void origin.offsetWidth;          // restart the animation
      origin.classList.add("tn-tap");
    }
  }

  function run(href, origin) {
    if (!canRun()) { window.location.href = href; return; }
    running = true;

    var box = overlay();
    var clip = el("ptClose");
    var went = false;

    function go() {
      if (went) return;
      went = true;
      try { sessionStorage.setItem(FLAG, "1"); } catch (e) { /* private mode */ }
      window.location.href = href;
    }

    shine(origin);
    var cap = setTimeout(go, OUT_CAP);

    setTimeout(function () {
      box.hidden = false;
      box.classList.add("pt-on", "pt-closing");

      if (!clip || thinPipe()) {
        box.classList.add("pt-still-on");
        setTimeout(go, STILL_MS);
        return;
      }

      clip.addEventListener("ended", go, { once: true });
      clip.addEventListener("error", go, { once: true });

      var p = clip.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          box.classList.add("pt-still-on");
          setTimeout(go, STILL_MS);
        });
      }
    }, LEAD_MS);

    // cap is cleared only by leaving the page; keep the reference tidy anyway
    window.addEventListener("pagehide", function () { clearTimeout(cap); }, { once: true });
  }

  /* ── arriving: uncover by opening the mouth ─────────────────────────────── */
  function playArrival() {
    var root = document.documentElement;
    var box = overlay();

    if (!box) { root.classList.remove("dh-arriving"); return; }

    box.hidden = false;
    box.classList.add("pt-on");
    // The still is already showing via the html.dh-arriving rule; the body can
    // come back now that the cover is a real element on screen.
    root.classList.remove("dh-arriving");

    var clip = el("ptOpen");
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      box.classList.remove("pt-opening", "pt-still-on");
      box.classList.remove("pt-on");
      setTimeout(function () {
        box.hidden = true;
        box.classList.remove("pt-closing");
      }, FADE_MS);
    }

    var cap = setTimeout(finish, IN_CAP);
    function endAll() { clearTimeout(cap); finish(); }

    if (!clip || thinPipe()) {
      box.classList.add("pt-still-on");
      setTimeout(endAll, STILL_MS);
      return;
    }

    box.classList.add("pt-opening");
    clip.addEventListener("ended", endAll, { once: true });
    clip.addEventListener("error", endAll, { once: true });

    var p = clip.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        box.classList.add("pt-still-on");
        setTimeout(endAll, STILL_MS);
      });
    }
  }

  /* ── wiring ─────────────────────────────────────────────────────────────── */
  function sameDocumentPage(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (/^(mailto:|tel:|https?:|\/\/)/i.test(href)) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    return /\.html(\?|#|$)/i.test(href);
  }

  function onClick(e) {
    if (reduced) return;
    // modified clicks keep their normal browser behaviour
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    var link = e.target.closest ? e.target.closest("a") : null;
    if (!link || !sameDocumentPage(link)) return;
    if (!link.closest(".teeth-nav, .palate-nav, nav.primary-nav")) return;
    if (link.getAttribute("aria-current") === "page") return;   // already here
    if (!canRun()) return;

    // Capture phase + stopPropagation so drill.js's own mobile drawer handler
    // does not also try to navigate; the drill visual still plays underneath
    // during the lead.
    e.preventDefault();
    e.stopPropagation();
    run(link.href, link);
  }

  function init() {
    document.addEventListener("click", onClick, true);

    /* Warm the clips once the page is otherwise idle. Hover alone was too
       late: preload="none" means the fetch starts on the click itself, the
       260ms lead is not enough to decode it, and the sequence falls through
       to the 900ms cap every time. ~180KB for the pair, and never on a
       save-data or 2g/3g connection. */
    if ("requestIdleCallback" in window) {
      requestIdleCallback(warmClips, { timeout: 2500 });
    } else {
      setTimeout(warmClips, 1500);
    }

    ["pointerover", "focusin"].forEach(function (evt) {
      document.addEventListener(evt, function (e) {
        var t = e.target;
        if (t && t.closest && t.closest(".teeth-nav, .palate-nav, nav.primary-nav")) warmClips();
      }, { passive: true, once: true });
    });

    if (document.documentElement.classList.contains("dh-arriving")) playArrival();
  }

  /* A back-button restore must never replay the arrival. */
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    running = false;
    document.documentElement.classList.remove("dh-arriving");
    var box = overlay();
    if (box) {
      box.hidden = true;
      box.className = "page-transition";
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.DH_TRANSITION = { run: run, canRun: canRun, warm: warmClips };
})();
