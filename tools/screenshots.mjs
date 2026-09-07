#!/usr/bin/env node
/**
 * Webdesign-Vorschau: rendert Schlüsselseiten in Desktop + Mobil als PNG.
 * Nutzung:  npm run shots
 * Voraussetzung: Playwright-Chromium (npx playwright install chromium).
 * Output: design-preview/<seite>-<viewport>.png  (werden committet, damit man das Design sieht)
 *
 * Liest die HTML-Dateien per file:// direkt aus dem Repo — kein Server nötig.
 * Relative "/..."-Links werden zur Vorschau auf das Repo-Root umgebogen.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "design-preview");
mkdirSync(outDir, { recursive: true });

const PAGES = [
  "index.html",
  "ueber-aban.html",
  "premium-briefing.html",
  "gratis-ki-tools.html",
];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, mobile: false },
  { name: "mobil", width: 390, height: 844, mobile: true },
];

/* ⚠️ Die mitgelieferte Playwright-Version sucht ein Chromium mit passender Build-Nummer
   (…_headless_shell-1223) und bricht ab, wenn nur die vorinstallierte Version daliegt.
   In dieser Umgebung darf nichts nachgeladen werden ("playwright install" ist gesperrt),
   also wird das vorhandene Chromium direkt benannt — wie in spiele-dev/tools/th-lib.mjs. */
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: CHROMIUM });
let n = 0;
for (const page of PAGES) {
  const url = pathToFileURL(resolve(root, page)).href;
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
    });
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    } catch {
      await p.goto(url, { waitUntil: "load", timeout: 20000 });
    }
    await p.waitForTimeout(400);
    const slug = page.replace(/\.html$/, "");
    const out = resolve(outDir, `${slug}-${vp.name}.png`);
    await p.screenshot({ path: out, fullPage: true });
    console.log("✓", `design-preview/${slug}-${vp.name}.png`);
    await ctx.close();
    n++;
  }
}
await browser.close();
console.log(`\n${n} Screenshots erzeugt in design-preview/`);
