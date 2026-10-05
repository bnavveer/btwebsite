"""Build the subpages (quote, capabilities, flyer) from scripts/pages/*.html.

index.html is the source of truth for the shared header and footer, so a change to the
navigation or footer there carries over to every page. Each file in scripts/pages has a small
front-matter block (title, description, bodyclass, current) followed by the <main> content.

Run from anywhere:  python3 scripts/build_pages.py
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "scripts" / "pages"

HEAD = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#204EC4">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="https://baytransportinc.com/assets/img/og-image.jpg">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Public+Sans:ital,wght@0,300..800;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/site.css">
  <script>document.documentElement.classList.add("js")</script>
</head>
<body class="{bodyclass}">
  <a class="skip-link" href="#main">Skip to content</a>

"""


def between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    j = text.index(end, i) + len(end)
    return text[i:j]


def parse(path: Path) -> tuple[dict, str]:
    raw = path.read_text()
    _, meta, body = raw.split("---\n", 2)
    fields = dict(line.split(": ", 1) for line in meta.strip().splitlines())
    return fields, body.rstrip() + "\n"


def main() -> None:
    index = (ROOT / "index.html").read_text()
    header = between(index, '  <header class="site-header', "  </header>")
    header = header.replace(" site-header--over", "").replace(' aria-current="page"', "")
    tail = index[index.index('  <footer class="site-footer">'):]

    for src in sorted(PAGES.glob("*.html")):
        meta, body = parse(src)
        nav = header.replace(f'<a href="{meta["current"]}">', f'<a href="{meta["current"]}" aria-current="page">', 1)
        html = HEAD.format(**meta) + nav + '\n\n  <main id="main">\n' + body + "  </main>\n\n" + tail
        (ROOT / src.name).write_text(html)
        print(f"built {src.name}")


if __name__ == "__main__":
    main()
