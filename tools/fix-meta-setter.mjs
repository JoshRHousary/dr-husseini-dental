/* Repair: the `set` helper in applyPostMeta only copied the FIRST attribute out
   of its selector, so a newly created link[rel="alternate"][hreflang="ar"] came
   out as a bare <link rel="alternate"> — the four hreflang alternates all
   collapsed onto one element and none of them carried an hreflang. Copy every
   attribute pair instead.

   node tools/fix-meta-setter.mjs */

import { read, write, must } from "./lib/edit.mjs";

let s = read("assets/js/blog.js");

s = must(s,
`  const set = (selector, attr, value) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith("link") ? "link" : "meta");
      const m = selector.match(/\\[(name|property|rel)="?([^"\\]]+)"?\\]/);
      if (m) el.setAttribute(m[1], m[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };`,
`  const set = (selector, attr, value) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith("link") ? "link" : "meta");
      // Copy EVERY attribute out of the selector, not just the first — otherwise
      // link[rel="alternate"][hreflang="ar"] is created without its hreflang and
      // the next lookup misses it again.
      for (const m of selector.matchAll(/\\[([a-z-]+)="([^"]+)"\\]/g)) {
        el.setAttribute(m[1], m[2]);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };`,
  "set helper");

write("assets/js/blog.js", s);
console.log("blog.js: meta setter now copies all selector attributes");
