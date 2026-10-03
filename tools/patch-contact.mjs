/* Wires up the Contact page form, which was a dead stub (onsubmit="return false")
   carrying a visible "[Form is front-end only…]" note to the public.

   It now: validates, stores the message when a backend is configured, and either
   way hands the message to WhatsApp — so the form works whether or not Supabase
   is set up, in keeping with the site's WhatsApp-first strategy.

   node tools/patch-contact.mjs */

import { read, write, must } from "./lib/edit.mjs";
import { readFileSync, writeFileSync } from "node:fs";

/* ── 1. adapter: submitContact ─────────────────────────────────────────────── */
{
  const FILE = "assets/js/booking-backend.js";
  let a = read(FILE);
  if (a.includes("submitContact")) {
    console.log("booking-backend.js: already has submitContact");
  } else {
    const anchor = [
      "  window.DH_BOOKING_API = {",
      "    enabled: () => isSupabase,",
      "    fetchTaken,",
      "    submit",
      "  };"
    ].join("\n");

    const replacement = [
      "  /* Contact page message. payload: { name, phone, message, lang } */",
      "  async function submitContact(payload) {",
      "    if (!isSupabase) return { ok: true, stored: false };",
      "    try {",
      '      const res = await fetch(restUrl("contact_messages"), {',
      '        method: "POST",',
      '        headers: headers({ Prefer: "return=minimal" }),',
      "        body: JSON.stringify([payload])",
      "      });",
      "      if (!res.ok) {",
      "        const body = await res.text();",
      "        throw new Error(res.status + ' ' + body.slice(0, 200));",
      "      }",
      "      return { ok: true, stored: true };",
      "    } catch (err) {",
      '      console.warn("[contact] submit failed:", err.message);',
      '      return { ok: false, stored: false, reason: "network" };',
      "    }",
      "  }",
      "",
      "  window.DH_BOOKING_API = {",
      "    enabled: () => isSupabase,",
      "    fetchTaken,",
      "    submit,",
      "    submitContact",
      "  };"
    ].join("\n");

    a = must(a, anchor, replacement, "adapter api block");
    write(FILE, a);
    console.log("booking-backend.js: submitContact added");
  }
}

/* ── 2. contact.js ─────────────────────────────────────────────────────────── */
writeFileSync("assets/js/contact.js", [
  "/* Contact page form.",
  "",
  "   Stores the message when a backend is configured (see assets/js/booking-config.js)",
  "   and in every case hands it to WhatsApp, so the form is never a dead end. Before",
  "   this the form was inert and said so on the page. */",
  "",
  "function contactValues() {",
  "  const get = name => {",
  '    const el = document.querySelector(`.contact-form [name="${name}"]`);',
  '    return el ? el.value.trim() : "";',
  "  };",
  '  return { name: get("name"), phone: get("phone"), message: get("message") };',
  "}",
  "",
  "function contactStatus(text, kind) {",
  '  const el = document.getElementById("contactStatus");',
  "  if (!el) return;",
  '  el.textContent = text || "";',
  '  el.className = "booking-status" + (kind ? " booking-status-" + kind : "");',
  "  el.hidden = !text;",
  "}",
  "",
  "function contactMark(name, bad) {",
  '  const el = document.querySelector(`.contact-form [name="${name}"]`);',
  "  if (!el) return;",
  '  el.classList.toggle("field-invalid", !!bad);',
  '  el.setAttribute("aria-invalid", bad ? "true" : "false");',
  "}",
  "",
  "function contactMessageText(lang, values) {",
  "  const t = {",
  '    en: `Hello, a message from your website:\\nName: ${values.name}\\nPhone: ${values.phone}\\n\\n${values.message}`,',
  '    ar: `مرحباً، رسالة من موقعكم:\\nالاسم: ${values.name}\\nالهاتف: ${values.phone}\\n\\n${values.message}`,',
  '    fr: `Bonjour, un message depuis votre site :\\nNom : ${values.name}\\nTéléphone : ${values.phone}\\n\\n${values.message}`',
  "  };",
  "  return t[lang] || t.en;",
  "}",
  "",
  "async function handleContactSubmit(event, lang, dict) {",
  "  event.preventDefault();",
  "  const values = contactValues();",
  '  const digits = values.phone.replace(/\\D/g, "");',
  "",
  "  const nameBad = values.name.length < 2;",
  "  const phoneBad = digits.length < 6 || digits.length > 15;",
  "  const messageBad = values.message.length < 2;",
  '  contactMark("name", nameBad);',
  '  contactMark("phone", phoneBad);',
  '  contactMark("message", messageBad);',
  "",
  "  if (nameBad) { contactStatus(dict.contact.form.errName, \"error\"); return; }",
  "  if (phoneBad) { contactStatus(dict.contact.form.errPhone, \"error\"); return; }",
  "  if (messageBad) { contactStatus(dict.contact.form.errMessage, \"error\"); return; }",
  "",
  "  const api = window.DH_BOOKING_API;",
  "  const waUrl = `https://wa.me/${SITE.whatsappNumber}?text=` +",
  "    encodeURIComponent(contactMessageText(lang, values));",
  "",
  "  if (api && api.enabled()) {",
  '    contactStatus(dict.contact.form.sending, "busy");',
  "    const res = await api.submitContact({",
  "      name: values.name,",
  "      phone: values.phone,",
  "      message: values.message,",
  "      lang",
  "    });",
  "    if (!res.ok) {",
  '      contactStatus(dict.contact.form.errSendFallback, "error");',
  '      const fallback = document.getElementById("contactFallback");',
  "      if (fallback) { fallback.href = waUrl; fallback.hidden = false; }",
  "      return;",
  "    }",
  "  }",
  "",
  "  window.location.assign(waUrl);",
  "}",
  "",
  'document.addEventListener("DOMContentLoaded", () => {',
  '  const form = document.querySelector(".contact-form");',
  "  if (!form) return;",
  '  form.removeAttribute("onsubmit");',
  '  form.addEventListener("submit", (e) =>',
  "    handleContactSubmit(e, window.DH_STATE.lang, window.DH_STATE.dict));",
  '  ["name", "phone", "message"].forEach(n => {',
  '    const el = form.querySelector(`[name="${n}"]`);',
  '    if (el) el.addEventListener("input", () => { contactMark(n, false); contactStatus(""); });',
  "  });",
  "});",
  ""
].join("\n").replace(/\n/g, "\r\n"));
console.log("assets/js/contact.js written");

/* ── 3. contact.html ───────────────────────────────────────────────────────── */
{
  const FILE = "contact.html";
  let h = read(FILE);

  if (h.includes("contactStatus")) {
    console.log("contact.html: already wired");
  } else {
    // Drop the public "this form doesn't work" note; it does now.
    h = must(h,
      '        <p class="form-note" data-i18n="contact.form.note">[Form is front-end only for now — needs a backend/email service connected before it can actually send.]</p>\n',
      "",
      "form-note paragraph");

    h = must(h, '<form class="contact-form" onsubmit="return false;">', '<form class="contact-form" novalidate>', "form tag");

    h = must(h,
      '          <button type="submit" class="btn btn-primary" data-i18n="contact.form.submit">Send message</button>',
      [
        '          <p id="contactStatus" class="booking-status" role="status" aria-live="polite" hidden></p>',
        '          <button type="submit" class="btn btn-primary" data-i18n="contact.form.submit">Send message</button>',
        '          <a id="contactFallback" class="btn btn-outline" href="#" target="_blank" rel="noopener" hidden data-i18n="contact.form.openWhatsapp">Send on WhatsApp instead</a>',
        '          <p class="booking-note" data-i18n="contact.form.viaWhatsapp">Your message opens in WhatsApp so you have a copy of it too.</p>'
      ].join("\n"),
      "submit button");

    // field styling + status colours, reused from the booking page
    h = must(h,
      "  .form-note { font-size: 12.5px; color: var(--accent); margin-top: -6px; }",
      [
        "  .form-note { font-size: 12.5px; color: var(--accent); margin-top: -6px; }",
        "  .booking-note { font-size: 12.5px; color: var(--ink-soft); }",
        "  .booking-status { font-size: 13px; font-weight: 600; }",
        "  .booking-status-error { color: #A32F1C; }",
        "  .booking-status-busy { color: var(--ink-soft); }",
        "  .field-invalid { border-color: var(--accent) !important; background: var(--accent-soft); }",
        "  form.contact-form input:focus-visible, form.contact-form textarea:focus-visible {",
        "    outline: 2px solid var(--primary); outline-offset: 1px; border-color: var(--primary);",
        "  }"
      ].join("\n"),
      "form-note style");

    h = must(h,
      '<script src="assets/js/main.js"></script>',
      '<script src="assets/js/main.js"></script>\n'
      + '<script src="assets/js/booking-config.js"></script>\n'
      + '<script src="assets/js/booking-backend.js"></script>\n'
      + '<script src="assets/js/contact.js"></script>',
      "main.js script tag");

    write(FILE, h);
    console.log("contact.html: form wired");
  }
}

/* ── 4. locale strings ─────────────────────────────────────────────────────── */
const CONTACT_STRINGS = {
  en: {
    sending: "Sending…",
    errName: "Please enter your name.",
    errPhone: "Please enter a phone number we can reach you on.",
    errMessage: "Please write your message.",
    errSendFallback: "We couldn't send that. Try WhatsApp instead and we'll get straight back to you.",
    openWhatsapp: "Send on WhatsApp instead",
    viaWhatsapp: "Your message opens in WhatsApp so you have a copy of it too."
  },
  ar: {
    sending: "جارٍ الإرسال…",
    errName: "الرجاء إدخال اسمك.",
    errPhone: "الرجاء إدخال رقم هاتف يمكننا الوصول إليك عبره.",
    errMessage: "الرجاء كتابة رسالتك.",
    errSendFallback: "لم نتمكن من إرسال الرسالة. جرّب واتساب وسنعود إليك فوراً.",
    openWhatsapp: "الإرسال عبر واتساب",
    viaWhatsapp: "تُفتح رسالتك في واتساب لتبقى نسخة منها لديك أيضاً."
  },
  fr: {
    sending: "Envoi…",
    errName: "Veuillez indiquer votre nom.",
    errPhone: "Veuillez indiquer un numéro où nous pouvons vous joindre.",
    errMessage: "Veuillez écrire votre message.",
    errSendFallback: "Nous n'avons pas pu envoyer ce message. Essayez WhatsApp, nous vous répondrons aussitôt.",
    openWhatsapp: "Envoyer via WhatsApp",
    viaWhatsapp: "Votre message s'ouvre dans WhatsApp afin que vous en gardiez une copie."
  }
};

for (const lang of ["en", "ar", "fr"]) {
  const file = `assets/locales/${lang}.json`;
  const dict = JSON.parse(readFileSync(file, "utf8"));
  Object.assign(dict.contact.form, CONTACT_STRINGS[lang]);
  delete dict.contact.form.note; // the form works now; the disclaimer is gone
  writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
}
console.log("locales: contact.form strings added, contact.form.note removed");
console.log("\nNow run: node tools/build-locales.mjs && node tools/check-site.mjs");
