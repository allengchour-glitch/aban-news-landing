/* merkliste_test.mjs — prüft die Merkliste-Sektion (sections/lux-merkliste.liquid) im echten Browser, ohne Netz (18.10.2026).
 *   /opt/node22/bin/node tools/merkliste_test.mjs <pfad/lux-merkliste.liquid>
 * Baut aus der Sektion eine Seite (Schema-Block entfernt), spielt /products/<handle>.js und /cart/add.js ein und prüft:
 * Handle-Filter, Entfernen toter Produkte mit Hinweis, Ausverkauft-Kennzeichen, Warenkorb-Knopf nur für Ein-Varianten-Ware
 * OHNE Tag selbst-gestalten, Zähler, Einzel-Entfernen, «Alle entfernen» in zwei Schritten, leerer Zustand, kein HTML aus Titeln.
 * Playwright liegt global (nicht im Projekt); Chromium unter /opt/pw-browsers. Exit 1 bei einem Fehler. */
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const quelle = process.argv[2];
if (!quelle) { console.error('Aufruf: node tools/merkliste_test.mjs <lux-merkliste.liquid>'); process.exit(2); }
const html = fs.readFileSync(quelle, 'utf8').replace(/\{%\s*schema\s*%\}[\s\S]*?\{%\s*endschema\s*%\}/, '');
const seite = `<!doctype html><meta charset=utf-8><body>${html}</body>`;
const P = {
  gut: { title: 'Guter Artikel', url: '/products/gut', price: 1990, compare_at_price: 2990, available: true, featured_image: '//cdn/x.jpg', tags: [], variants: [{ id: 111, available: true }] },
  eigen: { title: 'T-Shirt selbst gestalten', url: '/products/eigen', price: 2490, available: true, featured_image: null, tags: ['selbst-gestalten'], variants: [{ id: 222, available: true }] },
  weg: { title: 'Ausverkauft', url: '/products/weg', price: 900, available: false, featured_image: null, tags: [], variants: [{ id: 333, available: false }] },
  multi: { title: 'Mit Option', url: '/products/multi', price: 3000, available: true, featured_image: null, tags: [], variants: [{ id: 441, available: true }, { id: 442, available: true }] },
  xss: { title: '<img src=x onerror="window.__xss=1">Titel', url: '/products/xss', price: 500, available: true, featured_image: null, tags: [], variants: [{ id: 555, available: true }] },
};
const fehler = [];
const pruefe = (ok, was) => { if (!ok) fehler.push(was); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function lauf(speicher, aktion) {
  const ctx = await browser.newContext(); const page = await ctx.newPage(); const cartBodies = []; let cartOk = true;
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.pathname === '/test.html') return route.fulfill({ contentType: 'text/html', body: seite });
    const m = u.pathname.match(/^\/products\/([a-z0-9-]+)\.js$/);
    if (m) return P[m[1]] ? route.fulfill({ contentType: 'application/json', body: JSON.stringify(P[m[1]]) }) : route.fulfill({ status: 404, body: '' });
    if (u.pathname === '/cart/add.js') { cartBodies.push(route.request().postData()); return cartOk ? route.fulfill({ contentType: 'application/json', body: '{}' }) : route.fulfill({ status: 422, body: '{}' }); }
    return route.fulfill({ status: 204, body: '' });
  });
  await page.addInitScript(s => { if (s !== null) localStorage.setItem('lux_wish', JSON.stringify(s)); }, speicher);
  await page.goto('http://t.test/test.html'); await page.waitForTimeout(400);
  const r = await aktion(page, cartBodies, v => { cartOk = v; });
  await ctx.close(); return r;
}
const st = page => page.evaluate(() => JSON.parse(localStorage.getItem('lux_wish') || '[]'));
const txt = (page, sel) => page.locator(sel).innerText().catch(() => '');

// 1) gemischte Liste: Duplikat, ungültiger Handle, totes Produkt
await lauf(['gut', 'weg', 'tot', 'eigen', 'multi', 'gut', 'BAD<script>', 'xss'], async (page, bodies) => {
  pruefe((await page.locator('#lux-wl-grid > div').count()) === 5, 'Karten: gut, weg, eigen, multi, xss = 5');
  pruefe((await txt(page, '#lux-wl-count')) === '5 Artikel gemerkt', 'Zähler 5');
  pruefe((await txt(page, '#lux-wl-note')).startsWith('1 Artikel gibt es nicht mehr'), 'Hinweis tote Produkte');
  pruefe(JSON.stringify(await st(page)) === JSON.stringify(['gut', 'weg', 'eigen', 'multi', 'xss']), 'Speicher bereinigt: ' + JSON.stringify(await st(page)));
  pruefe((await page.locator('[data-h=gut] button:has-text("In den Warenkorb")').count()) === 1, 'gut: Warenkorb-Knopf');
  pruefe((await page.locator('[data-h=eigen] button:has-text("In den Warenkorb")').count()) === 0 && (await txt(page, '[data-h=eigen] a:last-of-type')).includes('Gestalten'), 'eigen: nur «Gestalten»');
  pruefe((await page.locator('[data-h=weg] button:has-text("In den Warenkorb")').count()) === 0 && (await txt(page, '#lux-wl-grid > [data-h=weg]')).includes('Aktuell ausverkauft'), 'weg: ausverkauft ohne Knopf');
  pruefe((await txt(page, '[data-h=multi] a:last-of-type')).includes('Option wählen'), 'multi: «Option wählen»');
  pruefe((await txt(page, '#lux-wl-grid > [data-h=gut]')).includes('CHF 29.90') && (await txt(page, '#lux-wl-grid > [data-h=gut]')).includes('CHF 19.90'), 'Preis + durchgestrichener Preis');
  pruefe((await page.evaluate(() => window.__xss)) === undefined && (await page.locator('[data-h=xss] img[alt=""][src*="x"]').count()) === 0, 'Titel nie als HTML');
  await page.locator('[data-h=gut] button:has-text("In den Warenkorb")').click(); await page.waitForTimeout(200);
  pruefe(bodies.length === 1 && JSON.parse(bodies[0]).items[0].id === 111, 'Warenkorb-POST mit Variante 111');
  pruefe((await txt(page, '[data-h=gut] button:not(.lux-wl-rm)')).includes('Im Warenkorb'), 'Knopf nach Erfolg');
  await page.locator('[data-h=multi] .lux-wl-rm').click();
  pruefe((await txt(page, '#lux-wl-count')) === '4 Artikel gemerkt' && JSON.stringify(await st(page)) === JSON.stringify(['gut', 'weg', 'eigen', 'xss']), 'Einzel-Entfernen');
  await page.click('#lux-wl-clear'); pruefe((await txt(page, '#lux-wl-clear')) === 'Wirklich alle entfernen?', 'Alle entfernen: erster Klick fragt');
  pruefe((await page.locator('#lux-wl-grid > div').count()) === 4, 'erster Klick entfernt noch nichts');
  await page.click('#lux-wl-clear'); await page.waitForTimeout(100);
  pruefe((await page.locator('#lux-wl-grid > div').count()) === 0 && (await st(page)).length === 0 && await page.locator('#lux-wl-empty').isVisible(), 'Alle entfernen: zweiter Klick leert, leerer Zustand sichtbar');
});
// 2) Warenkorb lehnt ab → Rückfall auf Produktseite, Knopf wieder bedienbar
await lauf(['gut'], async (page, bodies, setOk) => {
  setOk(false); await page.locator('[data-h=gut] button:has-text("In den Warenkorb")').click(); await page.waitForTimeout(250);
  pruefe((await txt(page, '[data-h=gut] button:not(.lux-wl-rm)')).includes('Produktseite'), 'Warenkorb-Fehler: Rückfall-Text');
});
// 3) leerer Speicher, kaputter Speicher
await lauf(null, async page => { pruefe(await page.locator('#lux-wl-empty').isVisible() && !(await page.locator('#lux-wl-head').isVisible()), 'leer: Hinweis sichtbar, Kopf aus'); });
await lauf({ nicht: 'liste' }, async page => { pruefe(await page.locator('#lux-wl-empty').isVisible(), 'Speicher kein Array → leer'); });
await browser.close();
console.log(fehler.length ? 'MERKLISTE-TEST: FEHLER\n - ' + fehler.join('\n - ') : 'MERKLISTE-TEST: OK (Handle-Filter, tote Produkte, Ausverkauft, Warenkorb nur Ein-Varianten ohne Editor, Zähler, Entfernen, Alle entfernen, leer, XSS)');
process.exit(fehler.length ? 1 : 0);
