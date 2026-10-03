/* Contact page form.

   Stores the message when a backend is configured (see assets/js/booking-config.js)
   and in every case hands it to WhatsApp, so the form is never a dead end. Before
   this the form was inert and said so on the page. */

function contactValues() {
  const get = name => {
    const el = document.querySelector(`.contact-form [name="${name}"]`);
    return el ? el.value.trim() : "";
  };
  return { name: get("name"), phone: get("phone"), message: get("message") };
}

function contactStatus(text, kind) {
  const el = document.getElementById("contactStatus");
  if (!el) return;
  el.textContent = text || "";
  el.className = "booking-status" + (kind ? " booking-status-" + kind : "");
  el.hidden = !text;
}

function contactMark(name, bad) {
  const el = document.querySelector(`.contact-form [name="${name}"]`);
  if (!el) return;
  el.classList.toggle("field-invalid", !!bad);
  el.setAttribute("aria-invalid", bad ? "true" : "false");
}

function contactMessageText(lang, values) {
  const t = {
    en: `Hello, a message from your website:\nName: ${values.name}\nPhone: ${values.phone}\n\n${values.message}`,
    ar: `مرحباً، رسالة من موقعكم:\nالاسم: ${values.name}\nالهاتف: ${values.phone}\n\n${values.message}`,
    fr: `Bonjour, un message depuis votre site :\nNom : ${values.name}\nTéléphone : ${values.phone}\n\n${values.message}`
  };
  return t[lang] || t.en;
}

async function handleContactSubmit(event, lang, dict) {
  event.preventDefault();
  const values = contactValues();
  const digits = values.phone.replace(/\D/g, "");

  const nameBad = values.name.length < 2;
  const phoneBad = digits.length < 6 || digits.length > 15;
  const messageBad = values.message.length < 2;
  contactMark("name", nameBad);
  contactMark("phone", phoneBad);
  contactMark("message", messageBad);

  if (nameBad) { contactStatus(dict.contact.form.errName, "error"); return; }
  if (phoneBad) { contactStatus(dict.contact.form.errPhone, "error"); return; }
  if (messageBad) { contactStatus(dict.contact.form.errMessage, "error"); return; }

  const api = window.DH_BOOKING_API;
  const waUrl = `https://wa.me/${SITE.whatsappNumber}?text=` +
    encodeURIComponent(contactMessageText(lang, values));

  if (api && api.enabled()) {
    contactStatus(dict.contact.form.sending, "busy");
    const res = await api.submitContact({
      name: values.name,
      phone: values.phone,
      message: values.message,
      lang
    });
    if (!res.ok) {
      contactStatus(dict.contact.form.errSendFallback, "error");
      const fallback = document.getElementById("contactFallback");
      if (fallback) { fallback.href = waUrl; fallback.hidden = false; }
      return;
    }
  }

  window.location.assign(waUrl);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  form.removeAttribute("onsubmit");
  form.addEventListener("submit", (e) =>
    handleContactSubmit(e, window.DH_STATE.lang, window.DH_STATE.dict));
  ["name", "phone", "message"].forEach(n => {
    const el = form.querySelector(`[name="${n}"]`);
    if (el) el.addEventListener("input", () => { contactMark(n, false); contactStatus(""); });
  });
});
