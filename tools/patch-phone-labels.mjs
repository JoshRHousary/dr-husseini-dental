/* Label the bare tel: links, and the home trust list.
   Three locale strings were flagged unused by check-site.mjs:
   common.callClinic, common.callMobile, home.trust.title.
   They are not dead copy — they are exactly the labels the markup was
   missing. Every footer tel: link is a bare number string ("01/308206"),
   which a screen reader reads as digits with no indication of what it
   dials; on the contact page the "Clinic"/"Mobile" labels are adjacent
   spans, never programmatically tied to the link. And the home trust
   list sits under the About heading with no name of its own.
   Attribute-only — no layout change, so desktop and mobile are both covered. */
import { readFileSync, writeFileSync } from "node:fs";

const PAGES = ["index.html", "about.html", "services.html", "booking.html",
               "contact.html", "blog.html", "blog/post.html"];

const EN = JSON.parse(readFileSync("assets/locales/en.json", "utf8"));
const LABELS = [
  ["tel:+96101308206", "common.callClinic", EN.common.callClinic],
  ["tel:+96103855860", "common.callMobile", EN.common.callMobile],
];

let touched = 0;
for (const page of PAGES) {
  const before = readFileSync(page, "utf8");
  let html = before;

  for (const [href, key, text] of LABELS) {
    // Only the links that have no accessible name of their own yet.
    html = html.replace(
      new RegExp(`<a([^>]*?)href="${href.replace(/[+]/g, "[+]")}"([^>]*?)>`, "g"),
      (m, pre, post) =>
        /aria-label|data-i18n/.test(pre + post)
          ? m
          : `<a${pre}href="${href}"${post} aria-label="${text}" data-i18n-aria="${key}">`
    );
  }

  if (page === "index.html") {
    html = html.replace(
      /<ul style="list-style:none;padding:0;margin:24px 0;display:flex;flex-direction:column;gap:12px;">/,
      `<ul style="list-style:none;padding:0;margin:24px 0;display:flex;flex-direction:column;gap:12px;" aria-label="${EN.home.trust.title}" data-i18n-aria="home.trust.title">`
    );
  }

  if (html !== before) {
    writeFileSync(page, html);
    touched++;
    console.log(`${page}: labelled`);
  }
}
console.log(`${touched} page(s) updated`);
