"""Prepares the Higgsfield dental-tool cutouts for the web.

The generated handpieces are ~750x1344 with a lot of empty canvas and a ~1:8
aspect once cropped — far too long to sit inside the mouth. The drill is cropped
to its business end (grip bottom, neck, head and burr), which reads clearly as a
drill at a sensible size. The others keep their full length; they are reference
assets rather than animated ones.

Output is WebP with alpha, which is a fraction of the PNG size and universally
supported, plus a PNG fallback for the drill only.

    python tools/process-tools.py
"""

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "assets" / "media"

# name -> (keep this fraction of the cropped height, measured from the TIP end)
PLAN = {
    "drill": 0.46,     # grip bottom + neck + head + burr
    "mirror": 1.0,
    "probe": 1.0,
    "scaler": 1.0,
}
TARGET_W = 320         # ample for a ~110px display width on a 2x screen


def main():
    for name, keep in PLAN.items():
        src = MEDIA / f"tool-{name}-cut.png"
        if not src.exists():
            print(f"{name:8} missing {src.name}")
            continue

        im = Image.open(src).convert("RGBA")
        bb = im.getbbox()
        if not bb:
            print(f"{name:8} fully transparent, skipped")
            continue
        im = im.crop(bb)
        w, h = im.size

        if keep < 1.0:
            # the tip is at the bottom of these renders
            top = int(h * (1 - keep))
            im = im.crop((0, top, w, h))
            w, h = im.size

        scale = TARGET_W / w
        if scale < 1:
            im = im.resize((TARGET_W, max(1, int(h * scale))), Image.LANCZOS)
            w, h = im.size

        webp = MEDIA / f"tool-{name}.webp"
        im.save(webp, "WEBP", quality=88, method=6)

        line = (f"{name:8} {w:4}x{h:<5} "
                f"{os.path.getsize(src)/1024:7.1f} KB png -> "
                f"{os.path.getsize(webp)/1024:6.1f} KB webp")

        if name == "drill":
            png = MEDIA / "tool-drill.png"
            im.save(png, "PNG", optimize=True)
            line += f"  (+ {os.path.getsize(png)/1024:.1f} KB png fallback)"
        print(line)


if __name__ == "__main__":
    main()
