#!/usr/bin/env node
// Rendert die 6 Beispielkategorien nach out/<handle>.jpg (2000 x 1000, JPEG q86 progressiv) und die Theme-Zuschnitte
// (4:3 = x 333..1667, Quadrat = x 500..1500) nach out/crops/<handle>_4x3.jpg und _1x1.jpg, dazu out/<handle>.html.
// Aufruf: node render_samples.mjs      NUR=schmuck,kissen (Auswahl) · BAND=marine (Vergleichsfarbe) · OUT=/pfad · STRENG=1 (unter 8 Fotos = Fehler)
import { readFileSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bannerHtml, anzahlText, MIN_FOTOS } from './banner.mjs';
import { AUSWAHL, MAKEL, MANIFEST, beispielBilder } from './beispiele.mjs';

const require = createRequire(import.meta.url);
const HIER = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || `${HIER}/out`;
const PY = process.env.PYTHON || '/usr/bin/python3';

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
mkdirSync(`${OUT}/crops`, { recursive: true });
const nur = (process.env.NUR || '').split(',').filter(Boolean);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // noetig, damit die Seite die Pixel lokaler Fotos lesen darf (Freisteller-Erkennung)
const seite = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
const kb = f => Math.round(statSync(f).size / 1024);
const jpeg = (png, jpg) => { execFileSync(PY, [`${HIER}/tojpeg.py`, png, jpg]); rmSync(png); };
for (const [handle, k] of Object.entries(manifest)) {
  if (nur.length && !nur.includes(handle)) continue;
  const idx = AUSWAHL[handle] || k.fotos.map((_, i) => i + 1);
  const bilder = beispielBilder(handle, k);
  const html = bannerHtml(k.titel, bilder, anzahlText(k.anzahl), { band: process.env.BAND, streng: process.env.STRENG === '1' });
  writeFileSync(`${OUT}/${handle}.html`, html);
  await seite.goto('file://' + `${OUT}/${handle}.html`, { waitUntil: 'load' });
  await seite.waitForFunction(() => window.__fertig === true, null, { timeout: 15000 });
  const b = await seite.evaluate(() => window.__bericht);
  const tmp = `${OUT}/_t.png`;
  await seite.screenshot({ path: tmp }); jpeg(tmp, `${OUT}/${handle}.jpg`);
  await seite.screenshot({ path: tmp, clip: { x: 333, y: 0, width: 1333, height: 1000 } }); jpeg(tmp, `${OUT}/crops/${handle}_4x3.jpg`);
  await seite.screenshot({ path: tmp, clip: { x: 500, y: 0, width: 1000, height: 1000 } }); jpeg(tmp, `${OUT}/crops/${handle}_1x1.jpg`);
  const warn = [];
  if (idx.length < MIN_FOTOS) warn.push(`NUR ${idx.length} FOTOS`);
  if (b.fehlend) warn.push(`FEHLEND ${b.fehlend}`);
  if (b.fehler) warn.push(`FEHLER ${b.fehler}`);
  const mk = Object.entries(MAKEL[handle] || {}).map(([i, w]) => `Foto ${i}: ${w}`);
  console.log(`${handle} | ${idx.length} Fotos | ${k.titel} | ${anzahlText(k.anzahl)} | Titel ${b.titelPx}px ${b.titelZeilen} Z. x ${b.titelLinks}..${b.titelRechts} | Fuss ${b.fuss} x ${b.fussLinks}..${b.fussRechts} | Freisteller ${b.freisteller.length} (Pixel lesbar bei ${b.messbar} von ${idx.length}) | ${kb(`${OUT}/${handle}.jpg`)} KB ${warn.join(' ')}${mk.length ? ' | Makel: ' + mk.join('; ') : ''}`);
}
await browser.close();
