// Vorne/Hinten: Ebenen bleiben je Seite getrennt, Rückgängig wirkt über den Seitenwechsel, Druckdatei je Seite.
import fs from 'node:fs';
import path from 'node:path';
import { starte } from '/home/user/aban-news-landing/tools/browser.mjs';
const WIDGET = path.resolve(process.argv[2]);
const OUT = path.resolve('./out_seiten'); fs.mkdirSync(OUT, { recursive: true });
const svg = (c) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='${c}'/></svg>`);
const fx = path.join(OUT, 'fixture.html');
fs.writeFileSync(fx, `<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body>
<form action="/cart/add"><input type="hidden" name="id" value="1"></form>
<div class="lspod-designer" data-img-front="${svg('#eeeeee')}" data-img-back="${svg('#dddddd')}" data-variant="1"></div>
<script src="${WIDGET}" defer></script></body></html>`);
let ok = 0, n = 0; const fehler = [];
const pruefe = (name, b, info = '') => { n++; if (b) ok++; console.log(`${b ? 'OK  ' : 'FEHL'} ${name}${info ? '  — ' + info : ''}`); };
const browser = await starte();
try {
  const s = await browser.newPage({ viewport: { width: 390, height: 844 } });
  s.on('pageerror', (e) => fehler.push(e.message));
  await s.goto('file://' + fx); await s.waitForSelector('.lspod-designer[data-init="1"]');
  const sicht = () => s.evaluate(() => [...document.querySelectorAll('[data-lid]')].map((x) => x.querySelector('div').textContent));
  await s.click('button:has-text("Text")'); await s.fill('textarea', 'VORNE'); await s.locator('textarea').press('Tab');
  await s.click('button[data-s="back"]');
  pruefe('Rückseite zeigt keine Vorder-Ebene', (await sicht()).length === 0, JSON.stringify(await sicht()));
  await s.click('button:has-text("Text")'); await s.fill('textarea', 'HINTEN'); await s.locator('textarea').press('Tab');
  pruefe('Rückseite hat eigene Ebene', JSON.stringify(await sicht()) === '["HINTEN"]', JSON.stringify(await sicht()));
  // Rückgängig bis die Rückseite leer ist (Text tippen + Ebene anlegen = Schritte)
  for (let i = 0; i < 2; i++) await s.click('button[title^="Rückg"]');
  const nachUndo = await sicht();
  pruefe('Rückgängig entfernt die Rückseiten-Ebene', nachUndo.length === 0, JSON.stringify(nachUndo));
  await s.click('button[data-s="front"]');
  pruefe('Vorderseite unverändert', JSON.stringify(await sicht()) === '["VORNE"]', JSON.stringify(await sicht()));
  await s.click('button[title^="Wiederh"]'); await s.click('button[title^="Wiederh"]');
  await s.click('button[data-s="back"]');
  pruefe('Wiederholen bringt die Rückseiten-Ebene zurück', JSON.stringify(await sicht()) === '["HINTEN"]', JSON.stringify(await sicht()));
  await s.click('button:has-text("Druck-Vorschau")'); await s.waitForSelector('img[src^="blob:"]');
  const w = await s.evaluate(() => document.querySelector('img[src^="blob:"]').naturalWidth);
  pruefe('Druckdatei Rückseite entsteht', w === 1200, 'Breite ' + w);
} finally { await browser.close(); }
console.log(`Ergebnis: ${ok}/${n}, Browserfehler: ${fehler.length ? fehler.join(' | ') : 'keine'}`);
process.exit(ok === n && !fehler.length ? 0 : 1);
