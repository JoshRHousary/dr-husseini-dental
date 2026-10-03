/* Adds the booking-form strings to en/ar/fr.json and refreshes the hero copy
   that promised "no forms" before the form existed. Idempotent.

   Run: node tools/patch-locales.mjs && node tools/build-locales.mjs */

import { readFileSync, writeFileSync } from "node:fs";

const ADD = {
  en: {
    yourDetails: "Your details",
    fieldName: "Full name",
    fieldPhone: "Phone / WhatsApp",
    fieldService: "Treatment",
    fieldNotes: "Anything we should know? (optional)",
    servicePrompt: "Not sure yet",
    services: {
      cosmetic: "Cosmetic dentistry",
      endodontic: "Endodontics (root canal)",
      implant: "Implants & prosthetics",
      checkup: "Check-up or cleaning",
      other: "Something else"
    },
    slotTaken: "Already booked",
    dayFull: "Fully booked",
    saving: "Holding your slot…",
    errName: "Please enter your name.",
    errPhone: "Please enter a phone number we can reach you on.",
    errSlot: "Please pick a day and a time.",
    errSlotGone: "Sorry — that time was just taken. Please pick another.",
    errSaveFallback: "We couldn't save your request. Message us on WhatsApp and we'll book you in.",
    openWhatsappAnyway: "Open WhatsApp anyway",
    noteRequestOnly: "This is a request, not a confirmation — the clinic confirms the exact time on WhatsApp.",
    noteLiveAvailability: "Times already taken are greyed out. Your slot is held as soon as you confirm, and the clinic confirms on WhatsApp.",
    noteAvailabilityOffline: "We can't check live availability right now, so every time is shown as free. The clinic will confirm the exact time on WhatsApp."
  },
  ar: {
    yourDetails: "بياناتك",
    fieldName: "الاسم الكامل",
    fieldPhone: "الهاتف / واتساب",
    fieldService: "العلاج",
    fieldNotes: "هل هناك ما يجب أن نعرفه؟ (اختياري)",
    servicePrompt: "لست متأكداً بعد",
    services: {
      cosmetic: "طب الأسنان التجميلي",
      endodontic: "علاج الجذور (العصب)",
      implant: "الزراعة والتركيبات",
      checkup: "فحص أو تنظيف",
      other: "شيء آخر"
    },
    slotTaken: "محجوز مسبقاً",
    dayFull: "محجوز بالكامل",
    saving: "جارٍ حجز موعدك…",
    errName: "الرجاء إدخال اسمك.",
    errPhone: "الرجاء إدخال رقم هاتف يمكننا الوصول إليك عبره.",
    errSlot: "الرجاء اختيار اليوم والوقت.",
    errSlotGone: "نعتذر — تم حجز هذا الوقت للتو. الرجاء اختيار وقت آخر.",
    errSaveFallback: "لم نتمكن من حفظ طلبك. راسلنا على واتساب وسنحجز لك الموعد.",
    openWhatsappAnyway: "المتابعة عبر واتساب",
    noteRequestOnly: "هذا طلب وليس تأكيداً — تؤكد العيادة الوقت النهائي عبر واتساب.",
    noteLiveAvailability: "الأوقات المحجوزة تظهر باللون الباهت. يُحفظ موعدك مباشرة بعد التأكيد، وتؤكده العيادة عبر واتساب.",
    noteAvailabilityOffline: "لا يمكننا التحقق من التوفر الآن، لذا تظهر جميع الأوقات متاحة. ستؤكد العيادة الوقت النهائي عبر واتساب."
  },
  fr: {
    yourDetails: "Vos coordonnées",
    fieldName: "Nom complet",
    fieldPhone: "Téléphone / WhatsApp",
    fieldService: "Traitement",
    fieldNotes: "Quelque chose à nous signaler ? (facultatif)",
    servicePrompt: "Je ne sais pas encore",
    services: {
      cosmetic: "Dentisterie esthétique",
      endodontic: "Endodontie (traitement de canal)",
      implant: "Implants et prothèses",
      checkup: "Contrôle ou détartrage",
      other: "Autre chose"
    },
    slotTaken: "Déjà réservé",
    dayFull: "Complet",
    saving: "Réservation de votre créneau…",
    errName: "Veuillez indiquer votre nom.",
    errPhone: "Veuillez indiquer un numéro où nous pouvons vous joindre.",
    errSlot: "Veuillez choisir un jour et une heure.",
    errSlotGone: "Désolé — ce créneau vient d'être pris. Veuillez en choisir un autre.",
    errSaveFallback: "Nous n'avons pas pu enregistrer votre demande. Écrivez-nous sur WhatsApp et nous vous réserverons un créneau.",
    openWhatsappAnyway: "Continuer sur WhatsApp",
    noteRequestOnly: "Ceci est une demande, pas une confirmation — la clinique confirme l'heure exacte sur WhatsApp.",
    noteLiveAvailability: "Les créneaux déjà pris sont grisés. Votre créneau est retenu dès la confirmation, et la clinique confirme sur WhatsApp.",
    noteAvailabilityOffline: "Nous ne pouvons pas vérifier les disponibilités pour l'instant, tous les créneaux apparaissent donc libres. La clinique confirmera l'heure exacte sur WhatsApp."
  }
};

/* The hero promised "no forms" — there is now a four-field form, so the copy has
   to stop contradicting the page. */
const HERO_LEAD = {
  en: "Tap a date on the calendar, choose a time that works, and leave us your name and number — we'll confirm your visit on WhatsApp. No waiting on hold.",
  ar: "اختر التاريخ المناسب من التقويم، ثم الوقت الذي يلائمك، واترك لنا اسمك ورقمك — وسنؤكد موعدك عبر واتساب. دون انتظار على الهاتف.",
  fr: "Choisissez une date sur le calendrier, l'heure qui vous convient, et laissez-nous votre nom et votre numéro — nous confirmerons votre visite sur WhatsApp. Sans attente au téléphone."
};

/* timeNote and note are no longer rendered — the page now uses the three
   availability notes above, picked according to the backend's state. */
const DROP = ["timeNote", "note"];

for (const lang of ["en", "ar", "fr"]) {
  const file = `assets/locales/${lang}.json`;
  const dict = JSON.parse(readFileSync(file, "utf8"));

  Object.assign(dict.booking, ADD[lang]);
  dict.booking.hero.lead = HERO_LEAD[lang];
  for (const key of DROP) delete dict.booking[key];

  writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
  console.log(`${file}: booking keys ->`, Object.keys(dict.booking).length);
}
