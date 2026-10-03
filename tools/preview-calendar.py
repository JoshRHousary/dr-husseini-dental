"""Renders the booking calendar as it will appear, to check that every date
label is centred on its own tooth — including the molars.

This mirrors what booking-teeth.js does: day N on tooth N, weekday symbol above
the number, label size from the cell width, molars tilted toward the arch.

    python tools/preview-calendar.py            # October 2026 (31 days)
    python tools/preview-calendar.py 2 2027     # February 2027 (28 days)
"""

import calendar
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "media" / "mouth-open.jpg"
TEETH = ROOT / "assets" / "data" / "teeth.json"
OUT = ROOT / "preview" / "calendar.png"

DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]


def font(px):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default()


def size_class(width_pct):
    # must match the thresholds in assets/js/booking-teeth.js, or this preview
    # lies about what will ship
    if width_pct >= 2.6:
        return "md"
    return "sm" if width_pct >= 1.1 else "xs"


def tilt_deg(left, width):
    centre = left + width / 2
    off = centre - 50
    away = min(1.0, max(0.0, (abs(off) - 12) / 10))
    return math.copysign(away * 20, off) if away > 0 else 0.0


def main():
    month = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    year = int(sys.argv[2]) if len(sys.argv) > 2 else 2026

    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    teeth = json.loads(TEETH.read_text(encoding="utf-8"))["teeth"]
    days = calendar.monthrange(year, month)[1]

    # label sizes scaled to this render; .62cqw of 1344 ~= 8.3px, too small to
    # judge, so everything is scaled up uniformly for legibility
    SCALE = 2.6
    f_num = {"md": font(int(8.3 * SCALE)), "sm": font(int(7.0 * SCALE)), "xs": font(int(5.9 * SCALE))}
    f_dow = {"md": font(int(5.1 * SCALE)), "sm": font(int(4.0 * SCALE)), "xs": font(int(4.0 * SCALE))}

    d = ImageDraw.Draw(im)
    placed = 0

    for i, t in enumerate(teeth):
        day = i + 1
        if day > days:
            # spare teeth at the back of the arch — a short month leaves them bare
            x0 = t["left"] / 100 * w
            y0 = t["top"] / 100 * h
            x1 = x0 + t["width"] / 100 * w
            y1 = y0 + t["height"] / 100 * h
            d.rectangle([x0, y0, x1, y1], outline=(150, 150, 150), width=1)
            continue

        cls = size_class(t["width"])
        deg = tilt_deg(t["left"], t["width"])

        cx = (t["left"] + t["width"] / 2) / 100 * w
        cy = (t["top"] + t["height"] / 2) / 100 * h

        dow = DOW[calendar.weekday(year, month, day) if False else
                  (calendar.weekday(year, month, day) + 1) % 7]

        # draw the label on its own layer so it can be rotated about its centre
        pad = 60
        lab = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lab)
        ink = (94, 28, 24)
        yoff = 0
        if cls != "xs":
            ld.text((pad, pad - 10 * SCALE / 2.6), dow, font=f_dow[cls],
                    fill=ink + (205,), anchor="mm")
            yoff = 7 * SCALE / 2.6
        ld.text((pad, pad + yoff), str(day), font=f_num[cls], fill=ink + (255,), anchor="mm")

        if deg:
            lab = lab.rotate(-deg, resample=Image.BICUBIC, center=(pad, pad))
        im.paste(lab, (int(cx - pad), int(cy - pad)), lab)

        # the cell outline, to show whether the label sits inside its own tooth
        x0 = t["left"] / 100 * w
        y0 = t["top"] / 100 * h
        d.rectangle([x0, y0, x0 + t["width"] / 100 * w, y0 + t["height"] / 100 * h],
                    outline=(0, 160, 110), width=1)
        placed += 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT)

    counts = {"md": 0, "sm": 0, "xs": 0}
    for t in teeth:
        counts[size_class(t["width"])] += 1
    print(f"{calendar.month_name[month]} {year}: {days} days on {len(teeth)} teeth "
          f"({len(teeth) - days} spare)")
    print(f"label sizes  md {counts['md']}  sm {counts['sm']}  xs {counts['xs']} (no weekday symbol)")
    print(f"placed {placed} dates")
    print(f"\nwrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
