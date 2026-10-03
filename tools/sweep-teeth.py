"""Parameter sweep for tooth detection.

The first attempt merged the whole upper arch into one blob: adjacent teeth touch,
so a plain flood fill walks straight across them. Eroding the mask first breaks
those thin bridges; this finds the brightness threshold and erosion depth that
actually separate the arches into individual teeth.

    python tools/sweep-teeth.py
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "media" / "mouth-open.jpg"


def build_mask(px, w, h, min_value, max_sat):
    mask = bytearray(w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y]
            hi = max(r, g, b)
            lo = min(r, g, b)
            if hi >= min_value and (hi - lo) <= max_sat:
                mask[row + x] = 1
    return mask


def erode(mask, w, h, rounds):
    for _ in range(rounds):
        out = bytearray(w * h)
        for y in range(1, h - 1):
            row = y * w
            for x in range(1, w - 1):
                i = row + x
                if mask[i] and mask[i - 1] and mask[i + 1] and mask[i - w] and mask[i + w]:
                    out[i] = 1
        mask = out
    return mask


def components(mask, w, h, min_area, max_area):
    seen = bytearray(w * h)
    boxes = []
    for start in range(w * h):
        if not mask[start] or seen[start]:
            continue
        q = deque([start])
        seen[start] = 1
        minx = maxx = start % w
        miny = maxy = start // w
        area = 0
        while q:
            i = q.popleft()
            area += 1
            x, y = i % w, i // w
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)
            for j, ok in ((i - 1, x > 0), (i + 1, x < w - 1), (i - w, y > 0), (i + w, y < h - 1)):
                if ok and mask[j] and not seen[j]:
                    seen[j] = 1
                    q.append(j)
        if min_area <= area <= max_area:
            boxes.append((minx, miny, maxx - minx + 1, maxy - miny + 1, area))
    return boxes


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    px = im.load()

    print(f"{'value':>5} {'sat':>4} {'erode':>5} | {'upper':>5} {'lower':>5} {'total':>5}  verdict")
    print("-" * 56)

    best = []
    for min_value in (150, 170, 185, 200, 210):
        for max_sat in (40, 55, 70):
            base = build_mask(px, w, h, min_value, max_sat)
            for rounds in (0, 1, 2, 3, 4):
                m = erode(base, w, h, rounds) if rounds else base
                boxes = components(m, w, h, 60, 20000)
                boxes = [b for b in boxes
                         if 0.18 * w < b[0] + b[2] / 2 < 0.82 * w
                         and 0.05 * h < b[1] + b[3] / 2 < 0.95 * h]
                upper = [b for b in boxes if b[1] + b[3] / 2 < h * 0.5]
                lower = [b for b in boxes if b[1] + b[3] / 2 >= h * 0.5]
                total = len(upper) + len(lower)
                verdict = ""
                if 12 <= len(upper) <= 18 and 12 <= len(lower) <= 18:
                    verdict = "<-- usable"
                    best.append((abs(total - 32), min_value, max_sat, rounds, len(upper), len(lower)))
                print(f"{min_value:>5} {max_sat:>4} {rounds:>5} | "
                      f"{len(upper):>5} {len(lower):>5} {total:>5}  {verdict}")

    if best:
        best.sort()
        d, v, s, r, u, l = best[0]
        print(f"\nclosest to 32: value={v} sat={s} erode={r} -> {u} upper + {l} lower = {u + l}")
    else:
        print("\nno parameter set separated the arches; the teeth may need a "
              "projection-profile split rather than erosion")


if __name__ == "__main__":
    main()
