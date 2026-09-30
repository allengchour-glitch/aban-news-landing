// Rendert content/etsy/<produkt>/dateien/_anleitung.html → Anleitung.pdf (A4) und löscht die Zwischendatei.
//   CH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/etsy/pdf.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const b = await chromium.launch({ executablePath: process.env.CH });
const p = await b.newPage();
for (const slug of ['budget-plan', 'schulden-plan']) {
  const dir = path.join(ROOT, 'content/etsy', slug, 'dateien');
  const quelle = path.join(dir, '_anleitung.html');
  await p.goto('file://' + quelle);
  const name = slug === 'budget-plan' ? 'Budget-Plan-Anleitung.pdf' : 'Schulden-Plan-Anleitung.pdf';
  await p.pdf({ path: path.join(dir, name), format: 'A4', printBackground: true, preferCSSPageSize: true });
  fs.unlinkSync(quelle);
  console.log('→', path.join('content/etsy', slug, 'dateien', name));
}
await b.close();
