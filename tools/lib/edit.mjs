/* Shared file-editing helpers for the tools/ scripts.

   The HTML/CSS/JS in this project is CRLF (it is edited on Windows), so every
   script normalises to LF while matching and restores CRLF on write. Without
   this, any multi-line pattern silently fails to match. */

import { readFileSync, writeFileSync } from "node:fs";

export function read(file) {
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

/** Writes back with CRLF endings; returns true when the content actually changed. */
export function write(file, text) {
  const next = text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  const prev = readFileSync(file, "utf8");
  if (prev === next) return false;
  writeFileSync(file, next);
  return true;
}

/** Replace `needle` (string or RegExp) with `repl`, throwing if it is not found. */
export function must(text, needle, repl, label) {
  const out = text.replace(needle, repl);
  if (out === text) throw new Error(`pattern not found${label ? ` (${label})` : ""}: ${needle}`);
  return out;
}
