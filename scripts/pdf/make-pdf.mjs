// Prints the capabilities page (its one-page print layout) to the downloadable PDF.
//   python3 scripts/build_pages.py && cd scripts/pdf && npm install && npm run build
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, "assets/docs/bay-transport-capabilities-statement.pdf");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  try {
    const body = await readFile(join(ROOT, path === "/" ? "index.html" : path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);

const { port } = server.address();
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/capabilities.html`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: OUT, format: "Letter", printBackground: true, preferCSSPageSize: true });
await browser.close();
server.close();
console.log("wrote", OUT);
