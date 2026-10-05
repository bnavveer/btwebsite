"""Build every HTML page.

1. scripts/pages/_index.html is the home page template. {{PLACEHOLDERS}} are filled with the
   shared pieces defined below (route shield, WhatsApp links, pictograms, distance signs) and the
   lane map from scripts/map/lane-map.svg, and the result is written to index.html.
2. Every other scripts/pages/*.html file has a small front-matter block (title, description,
   bodyclass, current) followed by its <main> content. Each one gets index.html's header and footer.

Run from anywhere:  python3 scripts/build_pages.py
"""

import hashlib
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "scripts" / "pages"
MAP = ROOT / "scripts" / "map" / "lane-map.svg"

# ---------- Shared pieces ----------

WA_URL = "https://wa.me/15102465453?text=Hi%20Bay%20Transport%2C%20I%27d%20like%20to%20ask%20about%20a%20shipment."
WA_ATTRS = f'href="{WA_URL}" target="_blank" rel="noopener"'
WA_ICON = (
    '<svg class="i-wa" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z"/></svg>'
)

SHIELD_OUTER = "M50 4C62 9 78 9 91 3C96 12 98 22 98 33C98 63 78 85 50 100C22 85 2 63 2 33C2 22 4 12 9 3C22 9 38 9 50 4Z"
SHIELD_INNER = "M50,10.28C60.32,14.58 74.08,14.58 85.26,9.42C89.56,17.16 91.28,25.76 91.28,35.22C91.28,61.02 74.08,79.94 50,92.84C25.92,79.94 8.72,61.02 8.72,35.22C8.72,25.76 10.44,17.16 14.74,9.42C25.92,14.58 39.68,14.58 50,10.28Z"
SHIELD_BAND = "M8.72,35.22C8.72,25.76 10.44,17.16 14.74,9.42C25.92,14.58 39.68,14.58 50,10.28C60.32,14.58 74.08,14.58 85.26,9.42C89.56,17.16 91.28,25.76 91.28,35.22Z"


def shield(top: str, body: str, cls: str = "shield", body_size: int = 39, top_size: int = 15) -> str:
    return (
        f'<svg class="{cls}" viewBox="0 0 100 104" aria-hidden="true">'
        f'<path d="{SHIELD_OUTER}" fill="#fff" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>'
        f'<path d="{SHIELD_INNER}" fill="#204EC4"/><path d="{SHIELD_BAND}" fill="#EE8820"/>'
        f'<text x="50" y="{20 + top_size * 0.55:.0f}" text-anchor="middle" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="{top_size}" letter-spacing="1.5" fill="#000">{top}</text>'
        f'<text x="50" y="{50 + body_size * 0.66:.0f}" text-anchor="middle" font-family="Overpass, Arial, sans-serif" font-weight="800" font-size="{body_size}" letter-spacing="-1.5" fill="#fff">{body}</text>'
        "</svg>"
    )


def icon(paths: str) -> str:
    return f'<svg class="sign__icon" viewBox="0 0 64 64" aria-hidden="true">{paths}</svg>'


ICONS = {
    "ICON_FTL": icon('<rect x="4" y="16" width="34" height="24"/><path d="M38 24h10l8 9v7H38z"/><path d="M44 24v9h12"/><circle cx="13" cy="46" r="4"/><circle cx="27" cy="46" r="4"/><circle cx="48" cy="46" r="4"/>'),
    "ICON_LTL": icon('<rect x="4" y="16" width="34" height="24"/><path d="M38 24h10l8 9v7H38z"/><rect x="9" y="29" width="9" height="11"/><rect x="19" y="24" width="9" height="16"/><circle cx="13" cy="46" r="4"/><circle cx="27" cy="46" r="4"/><circle cx="48" cy="46" r="4"/>'),
    "ICON_DROP": icon('<rect x="6" y="14" width="44" height="24"/><path d="M42 38v10M38 48h8"/><circle cx="14" cy="44" r="4"/><circle cx="25" cy="44" r="4"/><path d="M50 22h8v32M2 54h56"/>'),
    "ICON_LOCK": icon('<rect x="14" y="28" width="36" height="26" rx="2"/><path d="M21 28v-6a11 11 0 0 1 22 0v6"/><circle cx="32" cy="39" r="3.5"/><path d="M32 42.5V47"/>'),
    "ICON_EDI": icon('<path d="M8 22h44M42 12l10 10-10 10"/><path d="M56 42H12M22 32 12 42l10 10"/>'),
    "ICON_PLAN": icon('<path d="M8 54c8-2 10-12 18-14s12 6 20-2 4-18 10-22" stroke-dasharray="5 5"/><circle cx="8" cy="54" r="4"/><path d="M56 6a7 7 0 0 1 7 7c0 6-7 12-7 12s-7-6-7-12a7 7 0 0 1 7-7z"/><circle cx="56" cy="13" r="2"/>'),
    "ARROW_L": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    "ARROW_R": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
}

# Main interstate and approximate driving miles from Union City, CA.
MILES = [
    ("Los Angeles", "CA", "5", 370),
    ("Portland", "OR", "5", 620),
    ("Salt Lake City", "UT", "80", 730),
    ("Phoenix", "AZ", "10", 750),
    ("Seattle", "WA", "5", 800),
    ("Denver", "CO", "80", 1250),
    ("Wichita", "KS", "70", 1620),
    ("Dallas", "TX", "40", 1710),
    ("Chicago", "IL", "80", 2120),
    ("Nashville", "TN", "40", 2290),
    ("Atlanta", "GA", "40", 2460),
    ("Newark", "NJ", "80", 2890),
]


def mile_signs() -> str:
    out = []
    for city, state, route, miles in MILES:
        out.append(
            '<li class="mile">'
            + shield("I", route, "mile__shield", 40 if len(route) < 2 else 36)
            + f'<span class="mile__city">{city}<small>{state}</small></span>'
            + f'<span class="mile__num">{miles:,}</span>'
            + "</li>"
        )
    return "\n        ".join(out)


def webp_pictures(html: str) -> str:
    """Wrap <img> tags in <picture> with a WebP source when a .webp twin exists."""
    def wrap(m: re.Match) -> str:
        tag, src = m.group(0), m.group(1)
        webp = re.sub(r"\.(png|jpg)$", ".webp", src)
        if webp == src or not (ROOT / webp).exists():
            return tag
        return f'<picture><source srcset="{webp}" type="image/webp">{tag}</picture>'
    html = re.sub(r'<img\s[^>]*?src="(assets/img/[^"]+)"[^>]*>', wrap, html, flags=re.S)
    # The hero lens and its preload can use WebP directly
    html = html.replace('data-src="assets/img/hero-photo.jpg"', 'data-src="assets/img/hero-photo.webp"')
    html = html.replace('<link rel="preload" as="image" href="assets/img/hero-poster-dither.png">',
                        '<link rel="preload" as="image" href="assets/img/hero-poster-dither.webp" type="image/webp">')
    return html


def fill(template: str) -> str:
    parts = {
        "SHIELD": shield("BAY", "BT", "shield"),
        "SHIELD_BIG": shield("BAY", "BT", "shield pagehead__shield"),
        "WA_ATTRS": WA_ATTRS,
        "WA_ICON": WA_ICON,
        "MILE_SIGNS": mile_signs(),
        **ICONS,
    }
    html = re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: parts[m.group(1)], template)
    lane_map = MAP.read_text().rstrip()
    html = re.sub(r"<!-- map:start -->[\s\S]*?<!-- map:end -->", lambda m: f"<!-- map:start -->\n{lane_map}\n<!-- map:end -->", html)
    html = webp_pictures(html)
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", html)
    if leftover:
        raise SystemExit(f"unfilled placeholders: {leftover}")
    return html


# ---------- Subpages ----------

SITE = "https://baytransportinc.com/"  # canonical home for every page, even while previewing elsewhere

HEAD = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#204EC4">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bay Transport Inc.">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="https://baytransportinc.com/assets/img/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Overpass:ital,wght@0,300..900;1,600..900&family=Public+Sans:ital,wght@0,300..800;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/site.css">
  <script>document.documentElement.classList.add("js")</script>{breadcrumb_ld}
</head>
<body class="{bodyclass}">
  <a class="skip-link" href="#main">Skip to content</a>

"""


def page_url(filename: str) -> str:
    slug = "" if filename == "index.html" else filename.removesuffix(".html")
    return SITE + slug


def breadcrumb_ld(meta: dict, filename: str) -> str:
    """BreadcrumbList structured data: Home > optional parent > this page."""
    if filename == "404.html":
        return ""
    items = [("Home", SITE)]
    if "crumbs" in meta:
        label, href = meta["crumbs"].split("|")
        items.append((label, page_url(href)))
    items.append((meta.get("name", meta["title"].split(" | ")[0]), page_url(filename)))
    elements = ",".join(
        f'{{"@type":"ListItem","position":{i},"name":"{n}","item":"{u}"}}' for i, (n, u) in enumerate(items, 1)
    )
    return f'\n  <script type="application/ld+json">{{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{elements}]}}</script>'


def between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    return text[i:text.index(end, i) + len(end)]


def parse(path: Path) -> tuple[dict, str]:
    _, meta, body = path.read_text().split("---\n", 2)
    fields = dict(line.split(": ", 1) for line in meta.strip().splitlines())
    return fields, body.rstrip() + "\n"


def bust(html: str) -> str:
    """Append a content hash to the CSS and JS links so each deploy is fetched fresh."""
    for rel in ("assets/css/site.css", "assets/js/site.js"):
        digest = hashlib.sha1((ROOT / rel).read_bytes()).hexdigest()[:10]
        html = re.sub(rf'{re.escape(rel)}(\?v=[0-9a-f]+)?"', f'{rel}?v={digest}"', html)
    return html


def main() -> None:
    # Chunkier variant for the pixel entrance, so the band label survives the coarse grid.
    pixel = shield("BAY", "BT", "shield", body_size=40, top_size=21).replace(' aria-hidden="true"', ' xmlns="http://www.w3.org/2000/svg"')
    (ROOT / "assets" / "img" / "shield-pixel.svg").write_text(pixel + "\n")

    index = fill((PAGES / "_index.html").read_text())
    index = bust(index)
    (ROOT / "index.html").write_text(index)
    print("built index.html")

    header = between(index, '  <header class="site-header', "  </header>")
    header = header.replace(" site-header--over", "").replace(' aria-current="page"', "")
    tail = index[index.index('  <footer class="site-footer">'):]

    built = []
    for src in sorted(PAGES.glob("[!_]*.html")):
        meta, body = parse(src)
        nav = header.replace(f'<a href="{meta["current"]}">', f'<a href="{meta["current"]}" aria-current="page">', 1)
        body = fill(body)
        head = HEAD.format(canonical=page_url(src.name), breadcrumb_ld=breadcrumb_ld(meta, src.name), **meta)
        if src.name == "404.html":
            # Served at any missing path, so resolve relative links from the site root
            head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <base href="/">')
            head = head.replace('<link rel="canonical"', '<meta name="robots" content="noindex">\n  <link rel="canonical"')
        html = head + nav + '\n\n  <main id="main">\n' + body + "  </main>\n\n" + tail
        (ROOT / src.name).write_text(bust(html))
        built.append(src.name)
        print(f"built {src.name}")

    # Sitemap and robots.txt for search engines
    today = date.today().isoformat()
    urls = ["index.html"] + [n for n in built if n != "404.html"]
    priority = {"index.html": "1.0", "quote.html": "0.9", "services.html": "0.9"}
    entries = "".join(
        f"  <url><loc>{page_url(n)}</loc><lastmod>{today}</lastmod><priority>{priority.get(n, '0.7')}</priority></url>\n"
        for n in urls
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries + "</urlset>\n"
    )
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")
    print(f"built sitemap.xml ({len(urls)} pages) and robots.txt")


if __name__ == "__main__":
    main()
