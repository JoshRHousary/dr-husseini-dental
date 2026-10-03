"""Builds the 32-tooth coordinate map for assets/media/mouth-open.jpg.

Sampling real pixels showed why naive thresholding failed:

    teeth          value 158-242, saturation 17-61  (back molars are the 43-61)
    tongue/gum/    value 170-181, saturation  99-108
      palate/throat
    lower lip      value 248,     saturation  59
    background     value 244,     saturation  20

So saturation separates teeth from tissue cleanly, but NOT from the lips or the
cream background — those are excluded geometrically instead.

Adjacent teeth touch, so the mask comes out as two merged arcs rather than 32
blobs. Rather than fight that with erosion (which shreds the small back molars),
this measures the arc BAND per column and then distributes teeth along it. The
cells do not need to be pixel-perfect anatomical outlines — they need to sit on
the teeth and be comfortably clickable.

Spacing uses a cosine distribution so cells are wide at the front and narrow at
the back, matching the foreshortening of a frontal view.

    python tools/measure-teeth.py --write --preview
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "media" / "mouth-open.jpg"
OUT = ROOT / "assets" / "data" / "teeth.json"

MIN_VALUE = 150
MAX_SATURATION = 72        # tissue starts at 99, so this clears it with margin
PER_ARCH = 16              # 16 upper + 16 lower = a full adult dentition

# mouth interior, as fractions of the image — keeps out the lips and the
# cream background, both of which pass the colour test
X_MIN, X_MAX = 0.27, 0.73
UPPER_Y = (0.06, 0.36)
LOWER_Y = (0.46, 0.88)


def tooth_columns(px, w, h, y0, y1):
    """For each column, the first and last tooth-coloured pixel in the band."""
    top = [None] * w
    bot = [None] * w
    for x in range(int(X_MIN * w), int(X_MAX * w)):
        for y in range(int(y0 * h), int(y1 * h)):
            r, g, b = px[x, y]
            hi = max(r, g, b)
            if hi >= MIN_VALUE and (hi - min(r, g, b)) <= MAX_SATURATION:
                if top[x] is None:
                    top[x] = y
                bot[x] = y
    return top, bot


def arch_extent(top):
    xs = [x for x, v in enumerate(top) if v is not None]
    return (min(xs), max(xs)) if xs else (0, 0)


def build_arch(px, w, h, band, arch, per_arch):
    top, bot = tooth_columns(px, w, h, *band)
    x0, x1 = arch_extent(top)
    span = x1 - x0
    if span <= 0:
        return []

    teeth = []
    for i in range(per_arch):
        # cosine spacing: cells widen toward the centre of the arch
        def f(t):
            # pure cosine makes the end cells vanishingly thin; blending with a
            # linear ramp keeps the back molars clickable
            return 0.45 * t + 0.55 * ((1 - math.cos(math.pi * t)) / 2)
        fx0 = f(i / per_arch)
        fx1 = f((i + 1) / per_arch)
        cx0 = int(x0 + fx0 * span)
        cx1 = int(x0 + fx1 * span)
        if cx1 <= cx0:
            continue

        cols = [x for x in range(cx0, cx1) if top[x] is not None]
        if not cols:
            continue
        # The arch curves steeply at the sides, so the band from the highest top
        # to the lowest bottom in a cell spans several receding teeth. Use the
        # median column's own thickness instead, anchored to that column.
        tops = sorted(top[x] for x in cols)
        bots = sorted(bot[x] for x in cols)
        mid_top = tops[len(tops) // 2]
        mid_bot = bots[len(bots) // 2]
        thickness = max(1, mid_bot - mid_top)
        thickness = min(thickness, int(0.11 * h))   # no tooth is taller than this
        ys0, ys1 = mid_top, mid_top + thickness

        # a small inset keeps neighbouring cells from overlapping on hover
        pad = max(1, int((cx1 - cx0) * 0.06))
        bx0, bx1 = cx0 + pad, cx1 - pad
        if bx1 <= bx0:
            bx0, bx1 = cx0, cx1

        teeth.append({
            "arch": arch,
            "index": i,
            "left": round(bx0 / w * 100, 2),
            "top": round(ys0 / h * 100, 2),
            "width": round((bx1 - bx0) / w * 100, 2),
            "height": round((ys1 - ys0) / h * 100, 2),
        })
    return teeth


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    px = im.load()

    upper = build_arch(px, w, h, UPPER_Y, "upper", PER_ARCH)
    lower = build_arch(px, w, h, LOWER_Y, "lower", PER_ARCH)
    teeth = upper + lower

    print(f"image {w}x{h}  threshold value>={MIN_VALUE} sat<={MAX_SATURATION}")
    print(f"upper {len(upper)}   lower {len(lower)}   total {len(teeth)}\n")
    for t in teeth:
        print(f"  {t['arch']:5} #{t['index']:2}  left {t['left']:6.2f}  top {t['top']:6.2f}  "
              f"w {t['width']:5.2f}  h {t['height']:5.2f}")

    if "--write" in sys.argv:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps({
            "source": "assets/media/mouth-open.jpg",
            "imageWidth": w, "imageHeight": h,
            "note": ("Percentages of the stage image, the same unit .tooth uses. "
                     "Generated by tools/measure-teeth.py — re-run if the mouth art changes."),
            "teeth": teeth,
        }, indent=2) + "\n", encoding="utf-8")
        print(f"\nwrote {OUT.relative_to(ROOT)}")

    if "--preview" in sys.argv:
        from PIL import ImageDraw
        pv = im.copy()
        d = ImageDraw.Draw(pv)
        for t in teeth:
            x0 = t["left"] / 100 * w
            y0 = t["top"] / 100 * h
            x1 = x0 + t["width"] / 100 * w
            y1 = y0 + t["height"] / 100 * h
            colour = (220, 30, 30) if t["arch"] == "upper" else (0, 110, 255)
            d.rectangle([x0, y0, x1, y1], outline=colour, width=3)
            d.text((x0 + 3, y0 + 3), str(t["index"] + 1), fill=colour)
        path = ROOT / "preview" / "teeth-detected.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        pv.save(path)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
