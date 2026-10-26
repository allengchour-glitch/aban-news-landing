#!/usr/bin/env node
// Kuenstliche Randfaelle: nur 6 Fotos, 14 Fotos, langer Titel «Küchenmaschinen & Elektrogeräte», dazu 7, 10 und ein Titel mit Bindestrich.
// Schreibt out/faelle/<name>.jpg (2000x1000) + _4x3.jpg + _1x1.jpg und gibt die Messwerte aus. Aufruf: node render_faelle.mjs
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bannerHtml, anzahlText } from './banner.mjs';
const require = createRequire(import.meta.url);
const HIER = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || `${HIER}/out/faelle`;
mkdirSync(OUT, { recursive: true });
const foto = (kat, i) => `file:///tmp/banner_samples/${kat}/${String(i).padStart(2, '0')}.jpg`;
export const FAELLE = {
  'nur-6-fotos': { titel: 'Schmuck', anzahl: 2653, bilder: [6, 4, 13, 9, 3, 12].map(i => foto('schmuck', i)) },
  'nur-7-fotos': { titel: 'Kissen', anzahl: 458, bilder: [6, 8, 9, 5, 14, 1, 12].map(i => foto('kissen', i)) },
  '10-fotos': { titel: 'Damen-Mode', anzahl: 12881, bilder: [3, 1, 2, 4, 10, 14, 9, 5, 6, 8].map(i => foto('damen-mode', i)) },
  '14-fotos': { titel: 'Damen-Mode', anzahl: 12881, bilder: Array.from({ length: 14 }, (_, i) => foto('damen-mode', i + 1)) },
  'langer-titel': { titel: 'Küchenmaschinen & Elektrogeräte', anzahl: 1844, bilder: [12, 9, 14, 3, 6, 8, 2, 13].map(i => foto('sub-kueche', i)) },
};
export async function rendereFaelle({ nur, jpg = true } = {}) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const seite = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
  const erg = {};
  for (const [name, f] of Object.entries(FAELLE)) {
    if (nur && !nur.includes(name)) continue;
    const html = bannerHtml(f.titel, f.bilder, anzahlText(f.anzahl));
    writeFileSync(`${OUT}/${name}.html`, html);
    await seite.goto(`file://${OUT}/${name}.html`, { waitUntil: 'load' });
    await seite.waitForFunction(() => window.__fertig === true, null, { timeout: 15000 });
    erg[name] = await seite.evaluate(() => window.__bericht);
    if (jpg) {
      const t = `${OUT}/_t.png`;
      for (const [suffix, clip] of [['', undefined], ['_4x3', { x: 333, y: 0, width: 1333, height: 1000 }], ['_1x1', { x: 500, y: 0, width: 1000, height: 1000 }]]) {
        await seite.screenshot({ path: t, ...(clip ? { clip } : {}) });
        execFileSync('/usr/bin/python3', [`${HIER}/tojpeg.py`, t, `${OUT}/${name}${suffix}.jpg`]); rmSync(t);
      }
    }
  }
  await browser.close();
  return erg;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const e = await rendereFaelle();
  for (const [n, b] of Object.entries(e)) console.log(n, `| Titel ${b.titelPx}px ${b.titelZeilen} Z. x ${b.titelLinks}..${b.titelRechts} | Fuss ${b.fuss} ${b.fussLinks}..${b.fussRechts} | Freisteller ${b.freisteller.length} | fehlend ${b.fehlend}${b.fehler ? ' FEHLER ' + b.fehler : ''}`);
}
