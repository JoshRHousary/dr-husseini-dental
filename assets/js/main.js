/* Dr. Jihad S. Husseini — shared site behavior: i18n, loader, nav, WhatsApp */

// site root (works from file:// and http, from any page depth)
window.DH_BASE = (document.currentScript && document.currentScript.src ? document.currentScript.src : location.href).replace(/assets\/js\/main\.js.*$/, "");

const SITE = {
  // Lebanon numbers as given by the client. Country code assumed +961 (Lebanon) —
  // confirm with client before launch if this assumption is wrong.
  clinicPhoneDisplay: "01/308206",
  clinicPhoneTel: "+96101308206",
  mobilePhoneDisplay: "03/855860",
  whatsappNumber: "9613855860", // international format, no leading 0, no +
  defaultLang: "en",
  supportedLangs: ["en", "ar", "fr"]
};

function buildWhatsappLink(lang) {
  const msgByLang = {
    en: "Hello, I'd like to book an appointment with Dr. Husseini.",
    ar: "مرحباً، أرغب في حجز موعد مع الدكتور الحسيني.",
    fr: "Bonjour, je souhaite prendre rendez-vous avec le Dr Husseini."
  };
  const text = encodeURIComponent(msgByLang[lang] || msgByLang.en);
  return `https://wa.me/${SITE.whatsappNumber}?text=${text}`;
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

async function loadLocale(lang) {
  if (window.DH_LOCALES && window.DH_LOCALES[lang]) return window.DH_LOCALES[lang];
  const res = await fetch(`${window.DH_BASE}assets/locales/${lang}.json`);
  if (!res.ok) throw new Error(`Failed to load locale: ${lang}`);
  return res.json();
}

function applyTranslations(dict) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = getByPath(dict, key);
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria");
    const val = getByPath(dict, key);
    if (val != null) el.setAttribute("aria-label", val);
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    const val = getByPath(dict, key);
    if (val != null) el.innerHTML = val;
  });
}

function applyWhatsappLinks(lang) {
  const href = buildWhatsappLink(lang);
  document.querySelectorAll("[data-whatsapp-link]").forEach(el => {
    el.setAttribute("href", href);
  });
}

/* Mirror the tooth nav for RTL. Each .tooth carries left/width as inline
   percentages; the mirrored left is 100 - left - width. The original values are
   stashed on the element the first time round so switching back and forth is
   lossless. */
function applyTeethDirection(dir) {
  document.querySelectorAll(".teeth-nav .tooth").forEach(el => {
    if (!el.dataset.ltrLeft) {
      el.dataset.ltrLeft = parseFloat(el.style.left) || 0;
      el.dataset.ltrWidth = parseFloat(el.style.width) || 0;
    }
    const left = parseFloat(el.dataset.ltrLeft);
    const width = parseFloat(el.dataset.ltrWidth);
    el.style.left = (dir === "rtl" ? 100 - left - width : left).toFixed(2) + "%";
  });
}

function setActiveLangButtons(lang) {
  document.querySelectorAll(".lang-switch button").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });
}

window.DH_STATE = { lang: null, dict: null };

async function setLanguage(lang) {
  if (!SITE.supportedLangs.includes(lang)) lang = SITE.defaultLang;
  const dict = await loadLocale(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = dict.meta.dir;
  document.body.dir = dict.meta.dir;
  applyTranslations(dict);
  applyWhatsappLinks(lang);
  applyTeethDirection(dict.meta.dir);
  setActiveLangButtons(lang);
  try { localStorage.setItem("dh_lang", lang); } catch (e) { /* private mode, ignore */ }
  window.DH_STATE.lang = lang;
  window.DH_STATE.dict = dict;
  document.dispatchEvent(new CustomEvent("dh:langchange", { detail: { lang, dict } }));
}

function initLangSwitch() {
  document.querySelectorAll(".lang-switch button").forEach(btn => {
    btn.addEventListener("click", () => setLanguage(btn.getAttribute("data-lang")));
  });
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".primary-nav");
  if (!toggle || !nav) return;

  function closeNav(returnFocus) {
    if (!nav.classList.contains("nav-open")) return;
    nav.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // tapping a link navigates; the drawer must not be left open behind it
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav(true);
  });

  // growing past the breakpoint turns the drawer back into an inline row
  const wide = window.matchMedia("(min-width: 901px)");
  const onChange = () => { if (wide.matches) closeNav(false); };
  wide.addEventListener ? wide.addEventListener("change", onChange) : wide.addListener(onChange);
}

/* ── The intro ───────────────────────────────────────────────────────────────
   Identical on every page and at every width: same clip, same frames, same
   timing. The only thing that varies is which encode is fetched, because that
   changes file size rather than what you see.

   The clip is part of the stage, not an overlay over it, so there is no
   hand-over and nothing can shift. */
const INTRO = {
  HOLD_MS: 600,      // hold on the final frame, fully open and steady
  FADE_MS: 500,      // cross-fade to the identical still — same box, so invisible
  LABELS_MS: 150,    // a beat before the labels arrive
  MAX_WAIT_MS: 9000, // never let a stalled clip hold the page hostage
  // Re-running a 5s animation on every navigation would make the site unusable,
  // so it plays once per visit; later pages open on the final frame. Flip this
  // if the intro should replay on every page.
  REPLAY_EVERY_PAGE: false
};

/* Pick the encode to fetch. Same frames and timing either way — only the file
   size differs, so this does not break "identical on every page". */
function chooseIntroEncode(video) {
  const hq = video.getAttribute("data-hq");
  if (!hq) return;
  if (window.innerWidth < 1200) return;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c && (c.saveData || /^(slow-)?2g$|^3g$/.test(c.effectiveType || ""))) return;
  const source = video.querySelector("source");
  if (source) source.setAttribute("src", hq); else video.src = hq;
  video.load();
}

function initStageIntro() {
  const stage = document.getElementById("mouthStage");
  if (!stage) return;
  const video = stage.querySelector(".mouth-stage-video");

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skip = location.href.indexOf("intro=off") !== -1;   // preview switch: ?intro=off
  let seen = false;
  try { seen = sessionStorage.getItem("dh_intro") === "1"; } catch (e) { /* private mode */ }

  function showLabels() {
    stage.classList.remove("labels-pending");
    stage.classList.add("labels-in");
  }

  // No intro: the stage is simply the open mouth, and the labels are just there.
  if (!video || reduce || skip || (seen && !INTRO.REPLAY_EVERY_PAGE)) {
    if (video) video.remove();
    showLabels();
    return;
  }

  try { sessionStorage.setItem("dh_intro", "1"); } catch (e) { /* ignore */ }
  stage.classList.add("labels-pending");
  chooseIntroEncode(video);

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    // hold on the open mouth, then cross-fade to the identical still beneath
    setTimeout(() => {
      video.classList.add("stage-video-done");
      setTimeout(() => {
        video.remove();
        setTimeout(showLabels, INTRO.LABELS_MS);
      }, INTRO.FADE_MS);
    }, INTRO.HOLD_MS);
  }

  // If the clip cannot play at all, drop it and show the stage — no stills
  // cross-fade, because that would be a different animation on some devices.
  function bail() {
    if (finished) return;
    finished = true;
    video.remove();
    showLabels();
  }

  video.addEventListener("ended", finish);
  video.addEventListener("error", bail);
  const src = video.querySelector("source");
  if (src) src.addEventListener("error", bail);

  const play = video.play();
  if (play && play.catch) play.catch(bail);

  setTimeout(() => { if (!finished) finish(); }, INTRO.MAX_WAIT_MS);
}


/* Home hero: scrolling dives into the mouth (scene zooms toward the throat, panel fades) */
/* Home: the wheel scrolls the content inside the mouth even when the pointer is over the teeth/margins */
function initMouthWindow() {
  const win = document.getElementById("mouthWindow");
  if (!win) return;

  // Forwarding only makes sense in the desktop stage, where the pointer is often
  // over the teeth or the cream margins rather than over the scrollable window.
  function mouthWindowWheel(e) {
    if (win.contains(e.target)) return;
    win.scrollTop += e.deltaY;
  }

  const desktop = window.matchMedia("(min-width: 901px)");
  let bound = false;
  function sync() {
    if (desktop.matches && !bound) {
      window.addEventListener("wheel", mouthWindowWheel, { passive: true });
      bound = true;
    } else if (!desktop.matches && bound) {
      window.removeEventListener("wheel", mouthWindowWheel);
      bound = false;
    }
  }
  // a tablet rotated between portrait and landscape crosses the breakpoint
  desktop.addEventListener ? desktop.addEventListener("change", sync) : desktop.addListener(sync);
  sync();
}

/* initMouthHero() was removed on 2026-10-01 — the #mouthHero markup it drove no
   longer exists in any page, so it returned immediately everywhere. */

document.addEventListener("DOMContentLoaded", () => {
  initStageIntro();
  initMouthWindow();
  initLangSwitch();
  initMobileNav();
  if (window.DH_DRILL) window.DH_DRILL.init();
  let saved = SITE.defaultLang;
  try { saved = localStorage.getItem("dh_lang") || SITE.defaultLang; } catch (e) { /* ignore */ }
  setLanguage(saved);
});
