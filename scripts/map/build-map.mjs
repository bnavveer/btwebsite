// Builds the dotted lower-48 map with lanes out of Union City and Stockton and writes it to
// scripts/map/lane-map.svg. scripts/build_pages.py inlines it into index.html.
//   cd scripts/map && npm install && npm run build
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoAlbers, geoContains } from "d3-geo";
import { feature, merge } from "topojson-client";

const require = createRequire(import.meta.url);
const us = require("us-atlas/states-10m.json");
const OUT = new URL("./lane-map.svg", import.meta.url);

const W = 960, H = 590, GAP = 9;
const NOT_LOWER_48 = new Set(["02", "15", "60", "66", "69", "72", "78"]);
const lower48 = merge(us, us.objects.states.geometries.filter((g) => !NOT_LOWER_48.has(g.id)));
const projection = geoAlbers().parallels([29.5, 45.5]).fitExtent([[12, 12], [W - 12, H - 12]], lower48);

// Dot grid: keep every grid point whose inverse projection falls inside the lower 48.
let dots = "";
for (let y = GAP / 2; y < H; y += GAP) {
  for (let x = GAP / 2; x < W; x += GAP) {
    const lonLat = projection.invert([x, y]);
    if (lonLat && geoContains(lower48, lonLat)) dots += `M${x} ${y}h0`;
  }
}

const HOMES = {
  "Union City": [-122.0439, 37.5934],
  "Stockton": [-121.2908, 37.9577],
};
const HUBS = [
  ["Seattle", -122.33, 47.61], ["Portland", -122.68, 45.52], ["Los Angeles", -118.24, 34.05],
  ["Phoenix", -112.07, 33.45], ["Salt Lake City", -111.89, 40.76], ["Denver", -104.99, 39.74],
  ["Dallas", -96.8, 32.78], ["Wichita", -97.34, 37.69], ["Chicago", -87.63, 41.88],
  ["Nashville", -86.78, 36.16], ["Atlanta", -84.39, 33.75], ["Newark", -74.17, 40.74],
];

const r = (n) => Math.round(n * 10) / 10;
const arc = ([x1, y1], [x2, y2]) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  return `M${r(x1)} ${r(y1)}Q${r(mx)} ${r(my - len * 0.22)} ${r(x2)} ${r(y2)}`;
};

const uc = projection(HOMES["Union City"]);
const st = projection(HOMES["Stockton"]);
const lanes = HUBS.map(([name, lon, lat], i) => {
  const p = projection([lon, lat]);
  const from = i % 2 ? st : uc;
  return { name, p, d: arc(from, p) };
});

const svg = `<svg class="lane-map" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="map-title map-desc">
  <title id="map-title">Bay Transport lanes across the lower 48</title>
  <desc id="map-desc">A dotted map of the 48 contiguous states with routes from Union City and Stockton, California to Seattle, Portland, Los Angeles, Phoenix, Salt Lake City, Denver, Dallas, Wichita, Chicago, Nashville, Atlanta and Newark.</desc>
  <path class="lane-map__land" d="${dots}"/>
  <g class="lane-map__lanes">
${lanes.map((l, i) => `    <path pathLength="1" style="--i:${i}" d="${l.d}"/>`).join("\n")}
  </g>
  <g class="lane-map__hubs">
${lanes.map((l) => `    <circle cx="${r(l.p[0])}" cy="${r(l.p[1])}" r="3.5"/>`).join("\n")}
  </g>
  <g class="lane-map__home">
    <circle cx="${r(uc[0])}" cy="${r(uc[1])}" r="7"/>
    <circle cx="${r(st[0])}" cy="${r(st[1])}" r="5"/>
  </g>
</svg>`;

writeFileSync(OUT, svg + "\n");
console.log(`map written: ${dots.split("M").length - 1} dots, ${lanes.length} lanes`);
