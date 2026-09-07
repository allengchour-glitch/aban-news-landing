#!/usr/bin/env node
/**
 * kopfleiste.mjs — misst, wie stark Seiteninhalt durch die klebende Kopfleiste schlägt.
 *
 *   node tools/kopfleiste.mjs [seite.html …]
 *
 * ⚠️ WOZU. Beim Durchblättern der Bildschirme (tools/seiten_blick.mjs) lief die
 *    Startseiten-Überschrift sichtbar durch die Navigation. Ursache gemessen:
 *    `header{background:rgba(255,250,242,.85);backdrop-filter:blur(10px)}` — 15 %
 *    Transparenz, und ein 10-px-Weichzeichner ist gegen eine 60-px-Schlagzeile nichts.
 *
 * WIE GEMESSEN (selbstkontrollierend, ohne Schwellenwert-Raterei):
 *    Zwei Aufnahmen DERSELBEN Kopfleiste bei zwei verschiedenen Scrollständen. Die
 *    Leiste selbst zeigt beide Male dasselbe (Logo, Navigation) — jeder Unterschied
 *    kommt also aus dem, was dahinter durchscheint. Der mittlere Pixelunterschied ist
 *    damit direkt das Mass für den Durchschlag: 0 = deckend, >3 = sichtbar.
 *    Gegenprobe eingebaut: dieselbe Messung mit künstlich auf 50 % gesetzter Deckkraft
 *    muss deutlich AUSSCHLAGEN, sonst misst das Werkzeug nichts.
 */
import { chromium } from "playwright";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEITEN = process.argv.slice(2).length ? process.argv.slice(2)
  : ["index.html", "ki-fuer-fliesenleger.html", "geld-und-ki.html", "shop.html"];
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const browser = await chromium.launch({ executablePath: CHROMIUM });
/* Eigene, leere Seite als Rechenknecht: dort werden die zwei Aufnahmen in ein
   Canvas gelegt und Pixel für Pixel verglichen — kein zusätzliches Paket nötig. */
const rechner = await browser.newPage();
await rechner.setContent("<canvas id=a></canvas><canvas id=b></canvas>");

async function unterschied(png1, png2) {
  return rechner.evaluate(async ([d1, d2]) => {
    const lade = (d) => new Promise((ok) => {
      const i = new Image(); i.onload = () => ok(i); i.src = "data:image/png;base64," + d;
    });
    const [i1, i2] = await Promise.all([lade(d1), lade(d2)]);
    const w = Math.min(i1.width, i2.width), h = Math.min(i1.height, i2.height);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(i1, 0, 0); const a = x.getImageData(0, 0, w, h).data;
    x.clearRect(0, 0, w, h); x.drawImage(i2, 0, 0); const b = x.getImageData(0, 0, w, h).data;
    let summe = 0, n = 0;
    for (let i = 0; i < a.length; i += 4) {
      summe += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      n += 3;
    }
    return summe / n;
  }, [png1, png2]);
}

async function messen(seite, deckkraftUeberschreiben) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(resolve(root, seite)).href, { waitUntil: "load" });
  if (deckkraftUeberschreiben) {
    await page.addStyleTag({ content: `header{background:${deckkraftUeberschreiben} !important}` });
  }
  const kopf = await page.evaluate(() => {
    const h = document.querySelector("header");
    if (!h) return null;
    const s = getComputedStyle(h);
    if (s.position !== "sticky" && s.position !== "fixed") return null;
    return { h: Math.round(h.getBoundingClientRect().height), bg: s.backgroundColor, bf: s.backdropFilter };
  });
  if (!kopf) { await ctx.close(); return null; }
  /* ⚠️ Die Seite scrollt weich (scroll-behavior). Ein fester Wartewert trifft die
     Zielhöhe mal und mal nicht — dann zeigen beide Aufnahmen dasselbe und der
     Durchschlag käme fälschlich als 0 heraus. Also hart scrollen und WARTEN, bis
     der Stand wirklich erreicht ist. */
  await page.addStyleTag({ content: "html,body{scroll-behavior:auto !important}" });
  const bilder = [];
  for (const y of [700, 1400]) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForFunction((v) => Math.abs(window.scrollY - v) < 2, y, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
    /* ⚠️ NICHT page.screenshot({clip}) nehmen: `clip` rechnet in DOKUMENT-Koordinaten.
       Bei zwei Scrollständen liefert {y:0} zweimal denselben Seitenkopf, die Differenz
       ist dann immer 0 — die eingebaute Gegenprobe hat genau das aufgedeckt. Das
       Element selbst aufnehmen trifft die Leiste dort, wo sie gerade klebt. */
    bilder.push((await page.locator("header").first().screenshot()).toString("base64"));
  }
  await ctx.close();
  return { ...kopf, durchschlag: await unterschied(bilder[0], bilder[1]) };
}

console.log("Seite                          Höhe  Hintergrund                     Durchschlag");
let schlimm = 0;
for (const s of SEITEN) {
  const m = await messen(s);
  if (!m) { console.log(s.padEnd(30) + "  (keine klebende Kopfleiste)"); continue; }
  const flag = m.durchschlag > 3 ? "  ← Inhalt scheint durch" : "";
  if (m.durchschlag > 3) schlimm++;
  console.log(s.padEnd(30) + String(m.h).padStart(5) + "  " + m.bg.padEnd(32) + m.durchschlag.toFixed(2) + flag);
}

/* Gegenprobe: mit halb durchsichtiger Leiste MUSS die Zahl hochgehen — sonst misst
   das Werkzeug nur Rauschen und sein „0" wäre wertlos. */
const probe = await messen(SEITEN[0], "rgba(255,250,242,.5)");
const ohne = await messen(SEITEN[0], "rgb(255,250,242)");
console.log(`\nGegenprobe an ${SEITEN[0]}:`);
console.log(`  künstlich 50 % durchsichtig : ${probe.durchschlag.toFixed(2)}  (muss deutlich > 3 sein)`);
console.log(`  künstlich ganz deckend      : ${ohne.durchschlag.toFixed(2)}  (muss ~0 sein)`);
const gueltig = probe.durchschlag > 3 && ohne.durchschlag < 1;
console.log(gueltig ? "  ✅ das Messgerät schlägt aus und ruht — die Zahlen oben zählen"
                    : "  ❌ Gegenprobe gescheitert — den Zahlen oben nicht glauben");
await browser.close();
process.exit(gueltig ? (schlimm ? 1 : 0) : 2);
