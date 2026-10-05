"""Build the web images from the originals in source/images.

- Dithered "poster" versions (ordered Bayer dither, per channel) for the hero and
  the family-business plate. Pixels are dithered at a low resolution and scaled up
  with nearest-neighbour so the dot pattern stays crisp.
- Plain, resized JPEGs for everywhere else.

Run from the repo root:  python3 scripts/process_images.py
"""

from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source" / "images"
OUT = ROOT / "assets" / "img"

BAYER_4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def ordered_dither(img: Image.Image, levels: int = 4) -> Image.Image:
    """Quantise each RGB channel to `levels` steps using a 4x4 Bayer matrix."""
    img = img.convert("RGB")
    w, h = img.size
    px = img.load()
    step = 255 / (levels - 1)
    for y in range(h):
        row = BAYER_4[y % 4]
        for x in range(w):
            t = (row[x % 4] + 0.5) / 16 - 0.5  # -0.5 .. 0.5
            r, g, b = px[x, y]
            px[x, y] = tuple(
                max(0, min(255, round(round(c / step + t) * step))) for c in (r, g, b)
            )
    return img


def poster(name: str, out: str, crop: tuple[int, int, int, int], dot_width: int, scale: int,
           levels: int = 5, saturation: float = 1.25, contrast: float = 1.1) -> None:
    img = Image.open(SRC / name).convert("RGB").crop(crop)
    img = ImageEnhance.Color(img).enhance(saturation)
    img = ImageEnhance.Contrast(img).enhance(contrast)
    small = img.resize((dot_width, round(dot_width * img.height / img.width)), Image.LANCZOS)
    dithered = ordered_dither(small, levels)
    big = dithered.resize((dithered.width * scale, dithered.height * scale), Image.NEAREST)
    big.save(OUT / out, optimize=True)
    print(f"{out}: {big.size}, {(OUT / out).stat().st_size // 1024} KB")


def photo(name: str, out: str, width: int, crop=None) -> None:
    img = Image.open(SRC / name).convert("RGB")
    if crop:
        img = img.crop(crop)
    if img.width > width:
        img = img.resize((width, round(width * img.height / img.width)), Image.LANCZOS)
    img.save(OUT / out, quality=82, optimize=True, progressive=True)
    print(f"{out}: {img.size}, {(OUT / out).stat().st_size // 1024} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    # Hero: the red Cascadia and the lettered trailer, sky trimmed so the CSS sky takes over.
    poster("truck-photo-2022.jpg", "hero-truck-dither.png",
           crop=(0, 560, 2560, 1920), dot_width=640, scale=3)
    # Plate: white truck under the palms.
    poster("instagram-photo.jpg", "plate-palms-dither.png",
           crop=(0, 0, 1440, 1440), dot_width=420, scale=3, levels=5, saturation=1.15)
    # Full-bleed band: the lettered trailer side.
    poster("truck-photo-2022.jpg", "band-trailer-dither.png",
           crop=(1180, 380, 2560, 1180), dot_width=520, scale=3, levels=5, saturation=1.2)
    # Hero, taller crop that keeps more sky for the poster layout.
    poster("truck-photo-2022.jpg", "hero-poster-dither.png",
           crop=(0, 0, 2560, 1920), dot_width=720, scale=3, levels=5, saturation=1.3)
    photo("flyer.jpg", "flyer.jpg", 1545)
    photo("truck-photo-2022.jpg", "trailer-detail.jpg", 1100, crop=(1480, 470, 2560, 1330))
    photo("truck-photo-2022.jpg", "og-image.jpg", 1200, crop=(0, 240, 2560, 1584))
