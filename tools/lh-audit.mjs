#!/usr/bin/env node
/**
 * Lighthouse-Audit der Startseite (Performance, Accessibility, Best Practices, SEO).
 * Nutzung:  npm run audit
 * Voraussetzung: Playwright-Chromium (npx playwright install chromium).
 * Output: design-preview/lighthouse-index.json + Konsolen-Scores. Nur lesend, ändert keinen Seiten-Code.
 */
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "design-preview");
mkdirSync(outDir, { recursive: true });

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json", ".ico": "image/x-icon" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const data = await readFile(resolve(root, "." + p));
    res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("404"); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ["--remote-debugging-port=9222"] });
const result = await lighthouse(`http://localhost:${port}/index.html`, {
  port: 9222, output: "json", logLevel: "error",
  onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
});
const cats = result.lhr.categories;
console.log("\nLighthouse — index.html");
for (const k of Object.keys(cats)) console.log(`  ${cats[k].title.padEnd(16)} ${Math.round(cats[k].score * 100)}`);
writeFileSync(resolve(outDir, "lighthouse-index.json"), JSON.stringify(result.lhr, null, 2));
console.log("\nReport: design-preview/lighthouse-index.json");
await browser.close();
server.close();
