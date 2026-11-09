/** Fail-closed-Vertrag für den exakten v6.3-Rollout: data-karte-pflicht=1 darf nie auf Legacy zurückfallen. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
process.env.V6_DATEI = process.env.V6_DATEI || join(hier, '..', 'lspod-designer-v6-6.3.1.js');   // fest auf 6.3.1 (Rollout-Stand); mit V6_DATEI=…6.4.0.js und V6_VERSION=6.4.0 läuft derselbe Test gegen 6.4.0
process.env.V6_VERSION = process.env.V6_VERSION || '6.3.1';
const { playwright, starteServer, seiteOeffnen } = await import('./lib.mjs');
const { chromium } = playwright();

let n = 0;
const fehler = [];
function pruefe(name, ok, detail = '') {
  n++;
  if (!ok) { fehler.push(`${name}${detail ? ` ${detail}` : ''}`); console.log(`  ✗ ${name} ${detail}`); }
}

const srv = await starteServer();
const browser = await chromium.launch({ headless: true });
try {
  for (const kaputt of ['json', 'schema', 'leer']) {
    const s = await seiteOeffnen(browser, srv.url, { query: `karte=71&kaputt=${kaputt}&pflicht=1&mehrformen=1&shop=1001:4012` });
    try {
      const c = s.page.locator('#ed-v6');
      await c.waitFor({ state: 'attached' });
      await s.page.waitForFunction(() => document.querySelector('#ed-v6')?.getAttribute('data-init-v6') === 'blocked');
      pruefe(`${kaputt}: Pflichtkarte blockiert`, await c.getAttribute('data-lspod6-modus') === 'blockiert');
      pruefe(`${kaputt}: deutscher eindeutiger Hinweis`, /verbindlichen Druckdaten/.test(await c.innerText()));
      pruefe(`${kaputt}: kein Editor und kein Legacy-Pfad`, await c.locator('.lsp6').count() === 0 && await s.page.evaluate(() => window.LSPOD6.editors.length) === 0);
      pruefe(`${kaputt}: Warenkorbknopf gesperrt`, await s.page.locator('#theme-kaufen').isDisabled());
      pruefe(`${kaputt}: zweiter Standard-Button ohne type gesperrt`, await s.page.locator('#sticky-kaufen').isDisabled());
      const nichtGesendet = await s.page.evaluate(() => {
        const form = document.querySelector('#produkt-form');
        const result = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return result === false && !window.__themeKnopf;
      });
      pruefe(`${kaputt}: Submit wird vor dem Theme-Handler abgefangen`, nichtGesendet && s.warenkorb.length === 0);
      const stickyNichtGesendet = await s.page.evaluate(() => {
        const form = document.querySelector('#sticky-produkt-form');
        const result = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return result === false && !window.__stickyThemeKnopf;
      });
      pruefe(`${kaputt}: zweiter Submit wird vor dem Theme-Handler abgefangen`, stickyNichtGesendet && s.warenkorb.length === 0);
      pruefe(`${kaputt}: keine Seitenfehler`, s.fehler.length === 0, s.fehler.join(' | '));
    } finally { await s.schliessen(); }
  }

  const baufehler = await seiteOeffnen(browser, srv.url, {
    query: 'karte=71&pflicht=1&mehrformen=1&shop=1001:4012',
    initSkript: `(() => {
      const original = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (name === 'data-lspod6-version') throw new Error('erwarteter-test-baufehler');
        return original.call(this, name, value);
      };
    })();`,
  });
  try {
    const c = baufehler.page.locator('#ed-v6');
    await baufehler.page.waitForFunction(() => document.querySelector('#ed-v6')?.getAttribute('data-init-v6') === 'blocked');
    pruefe('Baufehler nach gültiger Karte blockiert', await c.getAttribute('data-lspod6-modus') === 'blockiert');
    pruefe('Baufehler zeigt eindeutigen Hinweis', /verbindlichen Druckdaten/.test(await c.innerText()));
    pruefe('Baufehler lässt keinen Teil-Editor stehen', await c.locator('.lsp6').count() === 0 && await baufehler.page.evaluate(() => window.LSPOD6.editors.length) === 0);
    pruefe('Baufehler sperrt alle vorhandenen Kaufknöpfe', await baufehler.page.locator('#theme-kaufen').isDisabled() && await baufehler.page.locator('#sticky-kaufen').isDisabled());
    pruefe('Baufehler wurde gezielt ausgelöst', baufehler.fehler.some((text) => /erwarteter-test-baufehler/.test(text)));
  } finally { await baufehler.schliessen(); }

  const legacy = await seiteOeffnen(browser, srv.url, { query: 'modus=legacy6' });
  try {
    await legacy.page.waitForSelector('#ed-v6[data-init-v6="1"] .lsp6');
    pruefe('ohne Pflicht-Attribut bleibt der ausdrücklich unterstützte Legacy-Rückfall erhalten', await legacy.page.locator('#ed-v6').getAttribute('data-lspod6-modus') === 'v5');
    pruefe('Legacy-Gegenprobe lässt den Theme-Kaufknopf aktiv', !(await legacy.page.locator('#theme-kaufen').isDisabled()));
  } finally { await legacy.schliessen(); }
} finally {
  await browser.close();
  await srv.stop();
}

if (fehler.length) { console.error(`\n${fehler.length} von ${n} Prüfungen fehlgeschlagen`); process.exit(1); }
console.log(`\n${n} Prüfungen bestanden`);
