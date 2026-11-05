/**
 * Bildschirmfotos des Editors v6 (Chromium, deviceScaleFactor 1) für die Sichtprüfung: Rechner 1440 px und Handy 390 px, die fünf Test-Modelle,
 * Sperren, Auflösungswarnung, Stickerei, Schnittteile, v5-Modus. Aufruf: node aufnahmen.mjs <Zielordner>
 * Umgebung: V6_BILDCACHE (Vorlagenbilder, sonst Attrappen).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { playwright, starteServer, seiteOeffnen, editorBereit, pngErzeugen } from './lib.mjs';

const ziel = process.argv[2];
if (!ziel) { console.error('Aufruf: node aufnahmen.mjs <Zielordner>'); process.exit(2); }
mkdirSync(ziel, { recursive: true });
const { chromium } = playwright();
const srv = await starteServer();
const b = await chromium.launch();
const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };
const SHOP71 = 'shop=1001:4012,1002:4013,1003:4014';
const liste = [];

async function frisch(opt, query) {
  const s = await seiteOeffnen(b, srv.url, { ...opt, query });
  await editorBereit(s.page);
  await s.page.waitForTimeout(400);
  return s;
}
async function foto(s, name, ganz = false) {
  const datei = join(ziel, `${name}.png`);
  if (ganz) await s.page.screenshot({ path: datei, fullPage: true });
  else await s.page.locator('.lsp6').screenshot({ path: datei });
  liste.push(name);
  console.log('Aufnahme', name);
}
const text = async (p, t) => { await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill(t); };
const tab = (p, n) => p.locator('.lsp6-tab', { hasText: n });
const sticker = async (p) => { await p.getByRole('button', { name: '⭐ Sticker' }).click(); await p.locator('.lsp6-emoji').nth(1).click(); };

// T-Shirt Rechner
let s = await frisch(PC, `karte=71&${SHOP71}`);
await foto(s, '01-tshirt-pc-start-seite', true);
await foto(s, '02-tshirt-pc-start');
await text(s.page, 'Hallo Schweiz'); await sticker(s.page);
await s.page.locator('.lsp6-chip', { hasText: 'Hallo' }).click();
await foto(s, '03-tshirt-pc-text-gewaehlt');
await s.page.getByRole('button', { name: 'Ganze Vorlage zeigen' }).click();
await foto(s, '04-tshirt-pc-ganze-vorlage');
await s.page.getByRole('button', { name: 'Auf Druckfläche zoomen' }).click();
await tab(s.page, 'Rückseite').click(); await text(s.page, 'Rücken');
await tab(s.page, 'Etikett aussen').click({ force: true });
await foto(s, '05-tshirt-pc-rueckseite-sperre-aufpreis');
await tab(s.page, 'Ärmel links').click(); await text(s.page, 'CH');
await foto(s, '06-tshirt-pc-aermel');
await s.page.getByRole('button', { name: /Druck-Vorschau/ }).click();
await s.page.waitForSelector('.lsp6-modal img');
await s.page.waitForTimeout(300);
await s.page.screenshot({ path: join(ziel, '07-tshirt-pc-druckvorschau.png') }); liste.push('07-tshirt-pc-druckvorschau');
await s.page.keyboard.press('Escape');
await s.schliessen();

// Auflösung
s = await frisch(PC, `karte=71&${SHOP71}`);
await s.page.locator('input[type=file]').setInputFiles({ name: 'klein.png', mimeType: 'image/png', buffer: pngErzeugen(300, 400) });
await s.page.waitForFunction(() => !document.querySelector('[data-feld="dpi"]').hidden);
await s.page.waitForTimeout(300);
await foto(s, '08-tshirt-pc-aufloesung-warnung');
await s.schliessen();

// T-Shirt Handy
s = await frisch(MOBIL, `karte=71&${SHOP71}`);
await foto(s, '09-tshirt-mobil-start', true);
await text(s.page, 'Mobil');
await foto(s, '10-tshirt-mobil-text');
await s.schliessen();

// Tasse
s = await frisch(PC, 'karte=19&shop=1001:1320,1002:4830,1003:16586&varianten=1001:11 oz,1002:15 oz,1003:20 oz');
await text(s.page, 'Tasse');
await foto(s, '11-tasse-pc-11oz');
await s.page.locator('input[name="id"][value="1002"]').check();
await s.page.waitForTimeout(800);
await foto(s, '12-tasse-pc-15oz-andere-druckdatei');
await s.schliessen();

// Poster
s = await frisch(PC, 'karte=268');
await text(s.page, 'Poster');
await foto(s, '13-poster-pc');
await s.schliessen();

// Dad-Cap
s = await frisch(PC, 'karte=206');
await s.page.locator('input[type=file]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: pngErzeugen(900, 300, [30, 90, 160]) });
await s.page.waitForTimeout(500);
await foto(s, '14-dadcap-pc-stickerei-hinweise');
await s.schliessen();
s = await frisch(MOBIL, 'karte=206');
await foto(s, '15-dadcap-mobil', true);
await s.schliessen();

// Hoodie
s = await frisch(PC, 'karte=388');
await tab(s.page, 'Kapuze').click(); await text(s.page, 'Kapuze');
await foto(s, '16-hoodie-pc-schnittteil-kapuze');
await s.schliessen();
s = await frisch(MOBIL, 'karte=388');
await foto(s, '17-hoodie-mobil', true);
await s.schliessen();

// v5-Modus
s = await frisch(PC, 'modus=legacy6');
await text(s.page, 'Wie v5');
await foto(s, '18-v5-modus-pc');
await s.schliessen();

// Kartenbündel: T-Shirt-Produkt aus zwei Modellen, Motiv auf «Vorderseite gross», dann Wechsel auf die Variante des Modells 586 (dort gibt es die Platzierung nicht)
s = await frisch(PC, 'karte=buendel&m=71,586&shop=1001:4012:71,1002:15124:586&varianten=1001:T-Shirt 71,1002:T-Shirt 586');
await tab(s.page, 'Vorderseite gross').click(); await text(s.page, 'Gross');
await s.page.locator('input[name="id"][value="1002"]').check();
await s.page.waitForFunction(() => !document.querySelector('[data-feld="modellhinweis"]').hidden);
await s.page.waitForTimeout(300);
await foto(s, '19-buendel-pc-fremde-platzierung-sperrt-kauf');
await s.schliessen();
// aktiver Reiter im Sichtfeld der Leiste (8 Reiter, letzter gewählt)
s = await frisch(PC, `karte=71&${SHOP71}`);
await s.page.locator('.lsp6-tab[data-p="label_inside_dtf"]').click();
await s.page.waitForTimeout(300);
await foto(s, '20-tshirt-pc-letzter-reiter-sichtbar');
await s.schliessen();

await b.close(); await srv.stop();
console.log(liste.length, 'Aufnahmen in', ziel);
