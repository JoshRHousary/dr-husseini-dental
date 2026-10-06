/* Encode the generator's masters for delivery.

   Run: node tools/make-loader-encodes.mjs [--master _attic/media/loader-1080.mp4]

   Why this exists: every clip Kling produced came out at ~9Mbps and was shipped
   exactly as rendered. A first visit to the home page transferred 3.47MB on a
   phone and 9.41MB on desktop, nearly all of it video, in front of a Lebanese
   mobile connection. tools/make-transition-clips.mjs already made this argument
   for the menu transition; the loader and the booking confirm never got the
   same pass.

   What the numbers actually are (x264 veryslow, high profile, +faststart; SSIM
   measured against each clip's own master):

     loader-720.mp4          2,839KB -> 296KB   SSIM 0.987
     mouth-close-smile.mp4   5,406KB -> 601KB   SSIM 0.991
     mouth-smile-open.mp4    5,600KB -> ~620KB  SSIM 0.990

   SSIM at that level is visually transparent on this footage - smooth skin and
   gum gradients, no fine detail to lose. The old 4.5Mbps loader-720.mp4 was
   spending ten times the bytes to sit FURTHER from the master than 296KB does,
   because it was a different take rather than a downscale (see below).

   One take, not two. The site used to serve loader-720.mp4 under 1200px and
   loader-1080.mp4 above it, on the belief that they were two sizes of one
   render. They were two separate Kling submissions: SSIM between them is 0.871
   and at t=1.0s one has already parted the teeth while the other's lips are
   still shut. Everything now derives from a single master, so the intro is the
   same animation at every width. --master swaps which take that is.

   ffmpeg: $DH_FFMPEG, else ffmpeg on PATH, else the copy imageio_ffmpeg ships
   (there is no system ffmpeg on this machine). */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OUT_DIR = "assets/media";
const ATTIC = "_attic/media";

/* The stage is at most 1344px wide (.mouth-stage in style.css), so 1280 is
   ~95% of native on a five-second animation. A second, larger tier cannot pay
   for itself here - it is what produced the double-download in the first
   place. */
const LOADER = { out: "loader-720.mp4", width: 1280, height: 716, crf: 27, budget: 500 * 1024 };

/* The booking pair keeps its full 1924x1076 frame: it plays over the whole
   viewport on confirm, and it is preload="none", so only a patient who has
   actually chosen a slot ever fetches it. That is exactly why it must not
   stall - 11.4MB on the conversion path is the worst place to spend it. */
const CONFIRM = [
  { master: "mouth-close-smile.mp4", out: "mouth-close-smile.mp4" },
  { master: "mouth-smile-open.mp4", out: "mouth-smile-open.mp4" },
];
const CONFIRM_CRF = 26;
const CONFIRM_BUDGET = 900 * 1024;

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

/* SSIM against the master, so the saving is reported with its cost attached
   rather than on trust. ffmpeg prints the summary on stderr at info level. */
function ssim(encoded, master, scale) {
  const filter = scale
    ? `[1:v]scale=${scale}:flags=bicubic[r];[0:v][r]ssim`
    : "ssim";
  /* spawnSync, not execFileSync: ffmpeg writes the SSIM summary to stderr, and
     execFileSync hands back only stdout - the first version of this read an
     empty string and reported NaN for every clip while still printing "ok". */
  const res = spawnSync(ffmpeg, [
    "-hide_banner", "-i", encoded, "-i", master, "-lavfi", filter, "-f", "null", "-",
  ], { encoding: "utf8" });
  const m = /SSIM[^\n]*All:([0-9.]+)/.exec(res.stderr || "");
  return m ? Number(m[1]) : NaN;
}

function encode(master, out, args, budget, scale) {
  if (!existsSync(master)) throw new Error(`missing master: ${master}`);
  const before = statSync(master).size;
  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", master,
    ...args, "-an", "-movflags", "+faststart", out,
  ], { stdio: "inherit" });

  const after = statSync(out).size;
  const score = ssim(out, master, scale);
  const verdict = after <= budget ? "ok" : `OVER BUDGET (${(budget / 1024).toFixed(0)}KB) - raise the CRF and re-run`;
  console.log(
    `${out.padEnd(34)} ${(before / 1024).toFixed(0).padStart(6)}KB -> ` +
    `${(after / 1024).toFixed(0).padStart(5)}KB  SSIM ${score.toFixed(3)}  ${verdict}`
  );
  if (after > budget) process.exitCode = 1;
  /* Explicit NaN guard: `NaN < 0.98` is false, so an unmeasured clip would
     otherwise sail through as though it had passed. */
  if (!Number.isFinite(score)) {
    console.log(`  ! SSIM could not be measured - not shippable unverified`);
    process.exitCode = 1;
  } else if (score < 0.98) {
    console.log(`  ! SSIM under 0.98 - look at it before shipping`);
    process.exitCode = 1;
  }
}

const argMaster = process.argv.indexOf("--master");
const master = argMaster !== -1 ? process.argv[argMaster + 1] : join(ATTIC, "loader-1080.mp4");

console.log(`ffmpeg: ${ffmpeg}`);
console.log(`master: ${master}\n`);

encode(
  master,
  join(OUT_DIR, LOADER.out),
  ["-vf", `scale=${LOADER.width}:${LOADER.height}:flags=lanczos`,
   "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
   "-preset", "veryslow", "-crf", String(LOADER.crf)],
  LOADER.budget,
  `${LOADER.width}:${LOADER.height}`
);

for (const clip of CONFIRM) {
  encode(
    join(ATTIC, clip.master),
    join(OUT_DIR, clip.out),
    ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
     "-preset", "veryslow", "-crf", String(CONFIRM_CRF)],
    CONFIRM_BUDGET,
    null
  );
}
