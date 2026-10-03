/* The dental drill.

   On desktop, hovering a tooth in the menu brings the handpiece down onto it,
   the burr bites into the enamel, and it lifts away. On mobile the tooth menu is
   hidden entirely (.teeth-nav is display:none under 900px), so the same thing
   plays on the nav drawer links when tapped, then navigation follows.

   The handpiece is assets/media/tool-drill.webp — generated with Higgsfield
   (gpt_image_2_5), background removed with Higgsfield's remover, then cropped to
   its business end and optimised to ~14KB. Per the project brief, motion design
   and the dental tools are Higgsfield assets rather than hand-drawn.

   Honours prefers-reduced-motion by doing nothing; the tooth's own :hover
   styling still gives the feedback. */

(function () {
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // how long the mobile tap animation may delay navigation
  const TAP_MS = 460;

  function buildDrill(base) {
    const wrap = document.createElement("div");
    wrap.className = "drill";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      `<img class="drill-img" src="${base}assets/media/tool-drill.webp" alt="" draggable="false">`
      + `<span class="drill-spark"></span>`;
    return wrap;
  }

  function ensureDrill(stage) {
    let el = stage.querySelector(".drill");
    if (!el) {
      // DH_BASE lets this work from file:// and from the blog/ subdirectory
      el = buildDrill(window.DH_BASE || "");
      stage.appendChild(el);
    }
    return el;
  }

  /* Park the handpiece over a tooth and run the cut. */
  function drillTooth(stage, tooth) {
    if (REDUCED) return;
    const drill = ensureDrill(stage);

    // teeth carry their geometry as inline percentages of the stage
    const left = parseFloat(tooth.style.left) || 0;
    const width = parseFloat(tooth.style.width) || 0;
    const top = parseFloat(tooth.style.top) || 0;
    const height = parseFloat(tooth.style.height) || 0;

    // the burr tip should meet the biting surface, so aim at the tooth's middle
    drill.style.left = (left + width / 2) + "%";
    drill.style.top = (top + height * 0.55) + "%";

    drill.classList.remove("drill-run");
    void drill.offsetWidth;            // restart the animation
    drill.classList.add("drill-run");
    tooth.classList.add("tooth-drilled");
  }

  function clearDrill(stage, tooth) {
    const drill = stage.querySelector(".drill");
    if (drill) drill.classList.remove("drill-run");
    if (tooth) tooth.classList.remove("tooth-drilled");
  }

  function initDrill() {
    const stage = document.getElementById("mouthStage");
    if (stage && !REDUCED) {
      // Date teeth on the booking page are deliberately excluded: choosing a
      // date has its own feedback, and drilling the day you are booking reads
      // badly.
      stage.querySelectorAll(".teeth-nav .tooth").forEach(tooth => {
        tooth.addEventListener("mouseenter", () => drillTooth(stage, tooth));
        tooth.addEventListener("focus", () => drillTooth(stage, tooth));
        tooth.addEventListener("mouseleave", () => clearDrill(stage, tooth));
        tooth.addEventListener("blur", () => clearDrill(stage, tooth));
      });
    }

    /* ── mobile: the nav drawer ───────────────────────────────────────────── */
    // No teeth exist under 900px, so the drill plays on the tapped link and
    // navigation is held just long enough to see it.
    const drawer = document.querySelector(".primary-nav");
    if (!drawer || REDUCED) return;
    drawer.addEventListener("click", (e) => {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
      const link = e.target.closest("a");
      if (!link || link.dataset.drilled === "1") return;
      // modified clicks keep their normal browser behaviour
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      link.dataset.drilled = "1";
      link.classList.add("link-drilling");
      setTimeout(() => { window.location.href = link.href; }, TAP_MS);
    });
  }

  window.DH_DRILL = { init: initDrill, drillTooth, clearDrill };
})();
