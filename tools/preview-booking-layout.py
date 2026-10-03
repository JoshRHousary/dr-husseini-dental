"""Draws the proposed booking-page regions onto the mouth so placement can be
checked against the actual anatomy before any markup is written.

  palate  -> the six menu links + EN/AR/FR
  teeth   -> the 32 dates (read from assets/data/teeth.json)
  tongue  -> the booking text and form

    python tools/preview-booking-layout.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "media" / "mouth-open.jpg"
TEETH = ROOT / "assets" / "data" / "teeth.json"
OUT = ROOT / "preview" / "booking-layout.png"

# ── proposed regions, % of the stage image ──────────────────────────────────
# The ridged hard palate sits lower and narrower than it first looks — above
# y~19% is upper teeth and gum, which now carry dates.
PALATE_LINKS = [
    ("Home",     41.3, 20.2, 5.8, 4.1),
    ("About",    47.1, 20.2, 5.8, 4.1),
    ("Services", 52.9, 20.2, 5.8, 4.1),
    ("Booking",  41.3, 24.8, 5.8, 4.1),
    ("Blog",     47.1, 24.8, 5.8, 4.1),
    ("Contact",  52.9, 24.8, 5.8, 4.1),
]
# just above the uvula, which starts around y 33%
PALATE_LANGS = [
    ("EN", 44.6, 29.4, 3.5, 3.0),
    ("AR", 48.3, 29.4, 3.5, 3.0),
    ("FR", 52.0, 29.4, 3.5, 3.0),
]
# the lower front teeth start at y~77.9%, so the panel stops short of them
TONGUE = (39.0, 52.0, 22.0, 23.0)   # left, top, width, height


def box(d, w, h, rect, colour, label=None, width=3):
    left, top, bw, bh = rect
    x0, y0 = left / 100 * w, top / 100 * h
    x1, y1 = x0 + bw / 100 * w, y0 + bh / 100 * h
    d.rectangle([x0, y0, x1, y1], outline=colour, width=width)
    if label:
        d.text((x0 + 4, y0 + 3), label, fill=colour)


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    d = ImageDraw.Draw(im)

    # teeth: the dates
    teeth = json.loads(TEETH.read_text(encoding="utf-8"))["teeth"]
    for i, t in enumerate(teeth, start=1):
        box(d, w, h, (t["left"], t["top"], t["width"], t["height"]),
            (0, 150, 90), str(i), width=2)

    # palate: menu + languages
    for label, *rect in PALATE_LINKS:
        box(d, w, h, rect, (220, 30, 30), label)
    for label, *rect in PALATE_LANGS:
        box(d, w, h, rect, (235, 120, 0), label)

    # tongue: the booking text
    box(d, w, h, TONGUE, (0, 90, 230), "TONGUE: booking text + form", width=4)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT)

    sw, sh = TONGUE[2] / 100 * w, TONGUE[3] / 100 * h
    print(f"teeth   {len(teeth)} cells (green)")
    print(f"palate  {len(PALATE_LINKS)} links + {len(PALATE_LANGS)} languages (red / orange)")
    print(f"tongue  {TONGUE[2]}% x {TONGUE[3]}%  = {sw:.0f} x {sh:.0f}px at full stage size")
    print(f"        on a 2560px-wide stage that is {TONGUE[2]/100*2560:.0f} x "
          f"{TONGUE[3]/100*(2560/1.7872):.0f}px of usable panel")
    print(f"\nwrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
