/**
 * tools/kaufleiste_pruefen.mjs — misst am Handy (390 × 844), ob die klebende Kaufleiste auf einer Produktseite
 * SCHON IM ERSTEN BILDSCHIRM steht (data-stuck="true") und wo der Kaufknopf liegt. 25.11.2026 (Kaufweg-Analyse:
 * Knopf lag bei 1'222–1'790 px, Leiste erschien erst nach dem Vorbeiscrollen).
 *   /opt/node22/bin/node tools/kaufleiste_pruefen.mjs <url> [<url> …]   → je URL eine Zeile, am Ende «KAUFLEISTE n/m sichtbar»
 */
import { starte } from './browser.mjs';
const urls = process.argv.slice(2);
if (!urls.length) { console.log('Aufruf: node tools/kaufleiste_pruefen.mjs <url> …'); process.exit(2); }
const browser = await starte();
let ok = 0;
for (const url of urls) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const seite = await ctx.newPage();
  try {
    await seite.goto(url, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(3500);
    const r = await seite.evaluate(() => {
      const bar = document.querySelector('.sticky-add-to-cart__bar');
      const knopf = document.querySelector('.buy-buttons-block');
      const hilfe = document.querySelector('#luxas');
      return { stuck: bar?.dataset.stuck ?? 'keine-leiste', knopfTop: knopf ? Math.round(knopf.getBoundingClientRect().top) : null,
               hilfeSeite: hilfe?.dataset.seite ?? null, breite: document.documentElement.scrollWidth };
    });
    if (r.stuck === 'true') ok++;
    console.log(`${r.stuck === 'true' ? 'SICHTBAR' : 'NICHT   '} stuck=${r.stuck} knopf@${r.knopfTop}px hilfe=${r.hilfeSeite} seitenbreite=${r.breite} ${url}`);
  } catch (e) { console.log(`FEHLER ${url} ${String(e).slice(0, 120)}`); }
  await ctx.close();
}
await browser.close();
console.log(`KAUFLEISTE ${ok}/${urls.length} sichtbar`);
