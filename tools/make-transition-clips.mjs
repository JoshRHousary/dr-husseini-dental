/* Re-encode the two booking smile clips into short cuts for the page
   transition.

   Run: node tools/make-transition-clips.mjs

   Why this exists: the originals are ~5.7MB each, 5.04s, 1924x1076 at ~9Mbps.
   On booking they are preload="none" and only a patient who actually confirms
   ever downloads them, so the weight is bought with intent. The menu
   transition fires on every navigation, where 11.4MB would be indefensible on
   a Lebanese mobile connection.

   Same footage, no new renders (the Higgsfield balance is 0, and these were
   approved as they are). Only the useful motion is kept:

     mouth-close-smile.mp4  open until ~2.0s, closes 2.0-4.0, settles after
     mouth-smile-open.mp4   smile until ~1.0s, opens 1.0-3.2, held after

   Each 2.3s window is sped up ~4.6x to ~0.5s, so the pair plays in about a
   second — the pace the transition was specced at.

   ffmpeg: $DH_FFMPEG, else ffmpeg on PATH, else the copy imageio_ffmpeg
   ships (there is no system ffmpeg on this machine). */
import { execFileSync } from "node:child_process";
import { existsSync, statSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/* The 9Mbps masters moved to _attic/media on 2026-10-06, when the served copies
   were re-encoded (tools/make-loader-encodes.mjs). Cut from the masters, never
   from the served file - a cut of a re-encode loses a generation for nothing. */
const SRC = "_attic/media";
const OUT = "assets/media";
const CUTS = [
  { from: "mouth-close-smile.mp4", to: "smile-close-fast.mp4", ss: "1.90", end: "4.20" },
  { from: "mouth-smile-open.mp4",  to: "smile-open-fast.mp4",  ss: "1.00", end: "3.30" },
];
const SPEED = 4.6;      // 2.3s window -> ~0.50s
const WIDTH = 1280;     // 1924x1076 is 1.788:1, so 1280x716 keeps it exactly
const HEIGHT = 716;
const CRF = 26;
const BUDGET = 250 * 1024;

function findFfmpeg() {
  if (process.env.DH_FFMPEG && existsSync(process.env.DH_FFMPEG)) return process.env.DH_FFMPEG;
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return "ffmpeg";
  } catch { /* not on PATH */ }
  const dir = join(homedir(), "AppData", "Roaming", "Python", "Python312",
                   "site-packages", "imageio_ffmpeg", "binaries");
  if (existsSync(dir)) {
    const exe = readdirSync(dir).find(f => /^ffmpeg.*\.exe$/i.test(f));
    if (exe) return join(dir, exe);
  }
  throw new Error("no ffmpeg found - set DH_FFMPEG to its path");
}

const ffmpeg = findFfmpeg();
console.log(`ffmpeg: ${ffmpeg}`);

for (const cut of CUTS) {
  const src = join(SRC, cut.from);
  const out = join(OUT, cut.to);
  if (!existsSync(src)) throw new Error(`missing source: ${src}`);

  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", cut.ss, "-to", cut.end, "-i", src,
    "-vf", `setpts=(PTS-STARTPTS)/${SPEED},fps=30,scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    "-an",
    "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
    "-preset", "slow", "-crf", String(CRF),
    "-movflags", "+faststart",
    out,
  ], { stdio: "inherit" });

  const bytes = statSync(out).size;
  const verdict = bytes <= BUDGET ? "ok" : "OVER BUDGET - drop to 960x538 and re-run";
  console.log(`${cut.to}  ${(bytes / 1024).toFixed(1)}KB  ${verdict}`);
}
