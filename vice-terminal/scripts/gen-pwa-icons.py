#!/usr/bin/env python3
"""Generate the Vice Terminal PWA icon set from static/flamingo.png.

Outputs (all PNG, written next to this script):
  icon-192.png            192x192  any
  icon-512.png            512x512  any
  icon-maskable-512.png   512x512  maskable (safe-zone padded on #000)
  apple-touch-icon.png    180x180  iOS home screen (no transparency)

Source: static/flamingo.png (1254x1254, pink flamingo mark on near-black).
"""
from PIL import Image
from pathlib import Path

HERE = Path(__file__).resolve().parent
STATIC = HERE.parent / "static"  # icons must ship inside the SvelteKit static dir
SRC = STATIC / "flamingo.png"
BG = (0, 0, 0)  # the source mark is on pure black; keep it for maskable padding


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    src.thumbnail((1254, 1254), Image.LANCZOS)

    # Standard (any) icons: full-bleed resize of the source mark.
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png")):
        im = src.resize((size, size), Image.LANCZOS)
        im.save(STATIC / name, "PNG", optimize=True)
        print(f"wrote {name} ({size}x{size})")

    # Maskable: the OS may crop the outer ~20% for circle/squircle masks, so the
    # mark must sit inside the center safe zone. Scale to ~68% and center on the
    # same near-black background.
    maskable = Image.new("RGB", (512, 512), BG)
    inner = int(512 * 0.68)
    scaled = src.resize((inner, inner), Image.LANCZOS)
    offset = (512 - inner) // 2
    maskable.paste(scaled, (offset, offset))
    maskable.save(STATIC / "icon-maskable-512.png", "PNG", optimize=True)
    print("wrote icon-maskable-512.png (512x512, safe-zone padded)")

    # Apple touch icon: full-bleed, no alpha channel (iOS renders it rounded).
    apple = src.resize((180, 180), Image.LANCZOS)
    apple.save(STATIC / "apple-touch-icon.png", "PNG", optimize=True)
    print("wrote apple-touch-icon.png (180x180)")


if __name__ == "__main__":
    main()
