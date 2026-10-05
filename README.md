# Bay Transport Inc. website

A redesign of [baytransportinc.com](https://baytransportinc.com/) for Bay Transport, Inc., a
family-owned, asset-based trucking company in Union City, California (MC 521732, USDOT 1361987).

It's a static site with no build step: plain HTML, CSS and JavaScript that any host can serve.

## What changed from the old site

| Old GoDaddy site | New site |
| --- | --- |
| Long SEO-style paragraphs repeating "asset based logistics in California" | Plain-language copy: what they haul, why owning the trucks matters, how a load moves |
| One basic estimate form | 4-step quote form with validation, a review step and a saved draft |
| Credentials only inside a PDF | MC, USDOT, SCAC, CAGE, UEI and NAICS on the page, with copy buttons and an FMCSA verify link |
| "Open today" text | Live open/closed status in Pacific time |
| No coverage info | Dotted 48-state lane map from Union City and Stockton |
| Capabilities statement as a PDF only | Printable HTML version plus the original PDF |
| Not built for phones | Responsive, with a sticky Call / Get a quote bar on mobile |

Design: the colors come from the logo (Bay Blue `#204EC4`, Clock Orange `#EE8820`, black rules).
Headlines use Archivo Expanded Italic, echoing the lettering painted on the trailers. Body text
uses Public Sans, the US government's typeface. Photos get a dithered, poster-style treatment,
and the red-and-white trailer conspicuity tape is used as the section divider.

## Structure

```
index.html              Main page
capabilities.html       Printable capabilities statement
assets/css/site.css     All styles
assets/js/site.js       Quote form, open/closed status, copy buttons, nav, map animation
assets/img/             Web images (generated) and favicon
assets/docs/            Original capabilities statement PDF
source/                 Everything pulled from the old site: original images, PDF, CONTENT.md
scripts/process_images.py   Rebuilds assets/img from source/images (needs Pillow)
scripts/map/            Rebuilds the lane map and inlines it into index.html (Node)
```

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Before going live

1. **Hook up the quote form.** Right now, with no endpoint set, submitting opens the visitor's email
   app with the request filled in, addressed to Dispatch@baytransportinc.com. To receive requests
   directly, create a free form at [Formspree](https://formspree.io) (or a similar service that
   accepts JSON), then paste its URL into `data-endpoint` on the `<form>` in `index.html`:
   ```html
   <form ... data-endpoint="https://formspree.io/f/xxxxxxx" ...>
   ```
2. **Confirm the hours.** The old site listed 7 am to 5 pm, and the new site treats that as every day.
   If weekends differ, edit `HOURS` near the top of `assets/js/site.js` (use `null` for closed days)
   and the `openingHoursSpecification` block in `index.html`.
3. **Add more photos.** The old site had only two usable photos. Real shots of the yard, the fleet,
   drivers and the Stockton facility would make the site stronger. Put originals in `source/images`
   and add them to `scripts/process_images.py`.
4. **Point the domain.** Host the folder on GitHub Pages, Netlify or Cloudflare Pages, then point
   baytransportinc.com's DNS at it.

## Rebuilding generated assets

```sh
python3 scripts/process_images.py          # dithered posters and resized photos
cd scripts/map && npm install && npm run build   # lane map, inlined into index.html
```
