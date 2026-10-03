/* One-off repair: three regex literals in applyPostMeta lost their backslashes
   when the helper was injected through a shell one-liner. Run once.

   node tools/fix-blogjs-regex.mjs */

import { read, write, must } from "./lib/edit.mjs";

let s = read("assets/js/blog.js");

s = must(s,
  '  const site = origin.replace(//blog/post.html.*$/, "").replace(//$/, "");',
  '  const site = origin.replace(/\\/blog\\/post\\.html.*$/, "").replace(/\\/$/, "");',
  "site regex");

s = must(s,
  '.replace(/s+/g, " ").trim();',
  '.replace(/\\s+/g, " ").trim();',
  "whitespace regex");

s = must(s,
  '      const m = selector.match(/[(name|property|rel)="?([^"]]+)"?]/);',
  '      const m = selector.match(/\\[(name|property|rel)="?([^"\\]]+)"?\\]/);',
  "selector regex");

write("assets/js/blog.js", s);
console.log("blog.js regex literals repaired");
