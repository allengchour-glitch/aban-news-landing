#!/usr/bin/env node
/**
 * seiten_blick.mjs — schaut auf die Webseite wie ein Besucher: Bildschirm für
 * Bildschirm, nicht als ein 21 000 px langes Bild.
 *
 *   node tools/seiten_blick.mjs                 # Standardseiten
 *   node tools/seiten_blick.mjs index.html …    # eigene Auswahl
 *
 * ⚠️ WOZU. `tools/screenshots.mjs` macht Ganzseiten-Bilder. Die mobile Startseite ist
 *    darin 21 167 px hoch — auf dem Bildschirm sieht man davon nichts mehr, und genau
 *    die Frage „wie wirkt das beim Runterscrollen?" bleibt unbeantwortet. Dieses
 *    Werkzeug schneidet in Bildschirmhöhen und misst dazu, was die Länge erzeugt:
 *    Karten, Überschriften, Handlungsknöpfe, Farbverläufe.
 *
 * Ausgabe: design-preview/blick/<seite>-<gerät>-<n>.png + eine Tabelle in Zahlen.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "design-preview/blick");
mkdirSync(outDir, { recursive: true });

const SEITEN = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["index.html", "ki-fuer-fliesenleger.html", "gratis-ki-tools.html", "shop.html"];
const GERAETE = [
  { name: "handy", width: 390, height: 844, mobile: true },
  { name: "laptop", width: 1280, height: 900, mobile: false },
];
const SCHIRME = 3;   // wie viele Bildschirmhöhen ab oben festgehalten werden

const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: CHROMIUM });
const zeilen = [];

for (const seite of SEITEN) {
  const url = pathToFileURL(resolve(root, seite)).href;
  for (const g of GERAETE) {
    const ctx = await browser.newContext({
      viewport: { width: g.width, height: g.height },
      isMobile: g.mobile,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(400);

    const mass = await page.evaluate(() => {
      const sicht = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const alle = [...document.querySelectorAll("*")];
      const verlauf = alle.filter((el) => {
        const s = getComputedStyle(el);
        return /gradient/.test(s.backgroundImage) && sicht(el);
      });
      const rund = alle.filter((el) => {
        const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        return r >= 14 && sicht(el);
      });
      return {
        hoehe: document.documentElement.scrollHeight,
        karten: document.querySelectorAll(".card, .box, .panel, .kachel, article").length,
        h2: document.querySelectorAll("h2").length,
        knoepfe: document.querySelectorAll("a.btn, button.btn, .cta a, a.button").length,
        verlaeufe: verlauf.length,
        rund14: rund.length,
      };
    });
    const schirme = mass.hoehe / g.height;
    zeilen.push({ seite, geraet: g.name, ...mass, schirme: schirme.toFixed(1) });

    for (let i = 0; i < SCHIRME; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * g.height);
      await page.waitForTimeout(220);
      const datei = `${seite.replace(/\.html$/, "")}-${g.name}-${i + 1}.png`;
      await page.screenshot({ path: resolve(outDir, datei) });
    }
    await ctx.close();
  }
}
await browser.close();

const k = (s, n) => String(s).padEnd(n);
console.log(k("Seite", 30) + k("Gerät", 8) + "Schirme  Karten  H2  Knöpfe  Verläufe  rund≥14");
for (const z of zeilen) {
  console.log(
    k(z.seite, 30) + k(z.geraet, 8) +
    String(z.schirme).padStart(6) + String(z.karten).padStart(8) +
    String(z.h2).padStart(4) + String(z.knoepfe).padStart(8) +
    String(z.verlaeufe).padStart(10) + String(z.rund14).padStart(9));
}
console.log(`\n${zeilen.length * SCHIRME} Bilder in design-preview/blick/`);
