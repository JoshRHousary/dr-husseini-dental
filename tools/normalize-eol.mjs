/* The HTML/CSS/JS in this project was already a mix of CRLF and LF before any
   tooling existed, which makes multi-line patterns fail to match and produces
   noisy diffs. This settles on CRLF for markup/styles/scripts (it is a
   Windows-authored project) and LF for the JSON data files.

   node tools/normalize-eol.mjs */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const CRLF = new Set([".html", ".css", ".js", ".mjs", ".sql", ".ts", ".md", ".txt", ".xml", ".svg"]);
const LF = new Set([".json"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "assets/media"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name).replace(/\\/g, "/");
    if (SKIP_DIRS.has(path) || SKIP_DIRS.has(name)) continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

let changed = 0;
for (const file of walk(".")) {
  const ext = extname(file);
  const wantCRLF = CRLF.has(ext);
  const wantLF = LF.has(ext);
  if (!wantCRLF && !wantLF) continue;

  const before = readFileSync(file, "utf8");
  const lf = before.replace(/\r\n/g, "\n");
  const after = wantCRLF ? lf.replace(/\n/g, "\r\n") : lf;
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
    console.log(`${wantCRLF ? "CRLF" : "LF  "}  ${file}`);
  }
}
console.log(`\n${changed} file(s) normalized.`);
