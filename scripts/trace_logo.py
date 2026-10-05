"""Trace the original raster logo (source/images/logo.png) into crisp SVGs.

Each colour layer (blue name, orange tagline, black rules) is upscaled, thresholded and traced with
potrace, then reassembled. Writes:
  assets/img/logo.svg        original colours
  assets/img/logo-white.svg  for dark or photo backgrounds (white name and rules, light-orange tagline)
Needs potrace (brew install potrace).
"""
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "images" / "logo.png"
OUT = ROOT / "assets" / "img"
SCALE = 8

LAYERS = {  # name: (reference colour, tolerance)
    "rules": ((0, 0, 0), 150),
    "name": ((32, 78, 196), 120),
    "tag": ((238, 136, 32), 120),
}


def trace(mask: Image.Image) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        bmp = Path(tmp) / "m.bmp"
        svg = Path(tmp) / "m.svg"
        mask.save(bmp)
        subprocess.run(["potrace", str(bmp), "-s", "-o", str(svg), "--turdsize", "8", "--alphamax", "1.0", "--opttolerance", "0.4"], check=True)
        text = svg.read_text()
    group = re.search(r"<g transform=\"([^\"]+)\"[^>]*>(.*?)</g>", text, re.S)
    return group.group(1), re.sub(r"\s+", " ", group.group(2)).strip()


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    big = src.resize((w * SCALE, h * SCALE), Image.LANCZOS)
    px = big.load()
    layers = {}
    for name, (ref, tol) in LAYERS.items():
        mask = Image.new("1", big.size, 1)  # potrace traces black
        mp = mask.load()
        for y in range(big.height):
            for x in range(big.width):
                r, g, b, a = px[x, y]
                if a > 110 and sum((c - rc) ** 2 for c, rc in zip((r, g, b), ref)) ** 0.5 < tol:
                    mp[x, y] = 0
        layers[name] = trace(mask)

    def svg(colors: dict, label: str) -> str:
        parts = "".join(
            f'<g transform="{tf}" fill="{colors[n]}">{paths}</g>' for n, (tf, paths) in layers.items()
        )
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w * SCALE} {h * SCALE}" role="img" aria-label="{label}">'
            f"{parts}</svg>\n"
        )

    label = "Bay Transport Inc. Dock to dock around the clock"
    (OUT / "logo.svg").write_text(svg({"rules": "#000", "name": "#204EC4", "tag": "#EE8820"}, label))
    (OUT / "logo-white.svg").write_text(svg({"rules": "#fff", "name": "#fff", "tag": "#FFC285"}, label))
    print("wrote logo.svg and logo-white.svg", f"({(OUT / 'logo.svg').stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
