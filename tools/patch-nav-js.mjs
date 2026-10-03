/* JS half of the mobile nav fix, plus two related main.js defects.

   1. data-i18n-aria support — applyTranslations() only ever handled textContent
      and innerHTML, so the hamburger's aria-label could not be translated.
   2. initMobileNav() worked in principle but was never reachable (no button
      existed). Now that it is, it needs the rest of a real drawer: close on link
      click, close on Escape, and return focus to the toggle.
   3. initMouthWindow() read the breakpoint once with no listener, so an iPad
      rotated from portrait (mobile layout) into landscape (desktop fixed-mouth
      layout) never installed the wheel-forwarding handler.

   node tools/patch-nav-js.mjs */

import { read, write, must } from "./lib/edit.mjs";

const FILE = "assets/js/main.js";
let js = read(FILE);

/* ── 1. translate aria-labels ──────────────────────────────────────────────── */
if (!js.includes("data-i18n-aria")) {
  js = must(js,
`  document.querySelectorAll("[data-i18n-html]").forEach(el => {`,
`  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria");
    const val = getByPath(dict, key);
    if (val != null) el.setAttribute("aria-label", val);
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {`,
    "applyTranslations");
  console.log("main.js: data-i18n-aria support added");
}

/* ── 2. a real drawer ──────────────────────────────────────────────────────── */
if (!js.includes("closeNav")) {
  js = must(js,
`function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".primary-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}`,
`function initMobileNav() {
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
}`,
    "initMobileNav");
  console.log("main.js: nav drawer behaviour (link click, Escape, breakpoint) added");
}

/* ── 3. re-evaluate the mouth window on rotation ───────────────────────────── */
if (!js.includes("mouthWindowWheel")) {
  js = must(js,
`function initMouthWindow() {
  const win = document.getElementById("mouthWindow");
  if (!win || window.matchMedia("(max-width: 900px)").matches) return;
  window.addEventListener("wheel", (e) => {
    if (win.contains(e.target)) return;
    win.scrollTop += e.deltaY;
  }, { passive: true });
}`,
`function initMouthWindow() {
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
}`,
    "initMouthWindow");
  console.log("main.js: mouth window now re-binds on rotation");
}

write(FILE, js);
console.log("\nassets/js/main.js written.");
