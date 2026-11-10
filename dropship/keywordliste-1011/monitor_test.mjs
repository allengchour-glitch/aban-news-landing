// Browsertest der erweiterten Vorlage tools/buero/seo_monitor.html (Suche, Mehr-Knopf, Deckung der Website-Summe).
// Nur synthetische Daten: die Vorlage enthält keine realen Messwerte, dieser Test auch nicht.
//   node monitor_test.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HIER = path.dirname(fileURLToPath(import.meta.url));
const VORLAGE = fs.readFileSync(process.env.VORLAGE_PFAD || path.join(HIER, '..', '..', 'tools', 'buero', 'seo_monitor.html'), 'utf8');

function tage(von, n) {
  const out = [];
  const t0 = Date.parse(von + 'T00:00:00Z');
  for (let i = 0; i < n; i++) {
    out.push({ keys: [new Date(t0 + i * 86400000).toISOString().slice(0, 10)], clicks: i % 3, impressions: 100 + i * 5, ctr: 0.01, position: 40 + (i % 5) });
  }
  return out;
}

function anfragen(n, wortreihe) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ keys: [wortreihe[i % wortreihe.length] + ' ' + i], clicks: i % 10 === 0 ? 1 : 0, impressions: 2 + (i % 7), ctr: 0.0, position: 10 + (i % 60) });
  }
  return out;
}

const gross = anfragen(300, ['uhr', 'armband', 'kette']);
gross[7].keys[0] = 'Holz ARMBAND Sonderedition';          // Grossschreibung in der Anfrage selbst
gross[8].keys[0] = 'holz armband sonderedition 2';
const gesamtImp = gross.reduce((a, r) => a + r.impressions, 0);
const gesamtKl = gross.reduce((a, r) => a + r.clicks, 0);
const snap = {
  von: '2026-10-12', bis: '2026-11-08', gemessen: '2026-11-10T00:00:00Z', prompt: 'Test',
  sites: [
    { domain: 'beispiel-a.test', total: { clicks: gesamtKl * 2, impressions: gesamtImp * 2, ctr: 0.01, position: 50 }, days: tage('2026-10-12', 28), queries: gross, truncated: false, finalThrough: '2026-11-06' },
    { domain: 'beispiel-b.test', total: { clicks: 100, impressions: 1000, ctr: 0.1, position: 20 }, days: tage('2026-10-12', 28), queries: anfragen(15, ['hose']), truncated: true, finalThrough: '2026-11-06' }
  ]
};

let fehler = 0;
const pruefe = (bed, text) => { if (!bed) { fehler++; console.log('FEHLER: ' + text); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const meldungen = [];
const anfragenNetz = [];
p.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') meldungen.push('console: ' + m.text()); });
p.on('request', (r) => { if (!r.url().startsWith('about:') && !r.url().startsWith('data:')) anfragenNetz.push(r.url()); });
await p.setContent(VORLAGE.replace('__SNAPSHOT__', JSON.stringify(snap)));

// Seite A: 300 Anfragen
const zeilen = async () => (await p.$$('#queries tr')).length;
pruefe((await zeilen()) === 50, 'zunächst 50 Zeilen: ' + (await zeilen()));
pruefe(!(await p.$eval('#qtools', (e) => e.hidden)) && (await p.isVisible('#qsearch')), 'Suche sichtbar bei langer Liste');
pruefe(!(await p.$eval('#qmore', (e) => e.hidden)), 'Mehr-Knopf sichtbar');
let scope = await p.textContent('#scope');
pruefe(scope.startsWith('300 angezeigte Anfragen · von Google gelieferter Auszug.'), 'Kopf nennt Zahl und Quelle: ' + scope);
pruefe(scope.includes('Sie machen 50 % der Impressionen und 50 % der Klicks der Website aus'), 'Deckung 50 % (die Summe ist doppelt so gross): ' + scope);
pruefe(!scope.includes('Auszug gekürzt'), 'ohne Teilauszug kein Hinweis auf gekürzten Auszug');
pruefe(scope.includes('Keine vollständige Keywordliste.'), 'ehrlicher Satz bleibt');
pruefe(scope.includes('50 sichtbar'), 'Zähler nennt sichtbare Zeilen: ' + scope);
await p.click('#qmore');
pruefe((await zeilen()) === 100, 'Mehr-Knopf zeigt 50 weitere');
for (let i = 0; i < 5; i++) { if (!(await p.$eval('#qmore', (e) => e.hidden))) await p.click('#qmore'); }
pruefe((await zeilen()) === 300 && (await p.$eval('#qmore', (e) => e.hidden)) && !(await p.isVisible('#qmore')), 'am Ende alle 300 Zeilen, Knopf verschwindet (auch optisch): ' + (await zeilen()));
await p.fill('#qsearch', 'ARMBAND');
const erwartet = gross.filter((r) => r.keys[0].toLowerCase().includes('armband')).length;
pruefe((await zeilen()) === Math.min(50, erwartet), 'Suche (Gross/klein egal) zeigt höchstens 50: ' + (await zeilen()));
scope = await p.textContent('#scope');
pruefe(scope.includes('Suche: ' + erwartet + ' Treffer.'), 'Suche nennt Trefferzahl ' + erwartet + ': ' + scope);
const texte = await p.$$eval('#queries tr td:first-child', (e) => e.map((x) => x.textContent));
pruefe(texte.length > 0 && texte.every((t) => t.toLowerCase().includes('armband')), 'alle Zeilen enthalten das Suchwort');
await p.fill('#qsearch', 'sonderedition');
pruefe((await zeilen()) === 2, 'Suche findet auch Anfragen mit Grossbuchstaben: ' + (await zeilen()));
await p.fill('#qsearch', 'ARMBAND');
await p.fill('#qsearch', 'zzzz');
pruefe((await zeilen()) === 0 && (await p.$eval('#qmore', (e) => e.hidden)) && !(await p.isVisible('#qmore')), 'keine Treffer: leer, kein Knopf');
// Messwert wechseln setzt die Suche nicht zurück
await p.selectOption('#metric', 'clicks');
pruefe((await p.inputValue('#qsearch')) === 'zzzz', 'Messwert-Wechsel behält die Suche');
await p.fill('#qsearch', 'uhr');
// Karten und Balken wie bisher
pruefe((await p.$$('#cards .card')).length === 4 && (await p.$$('#bars .bar')).length === 28, 'Karten und Tagesbalken unverändert');

// Seite B: Teilauszug mit 15 Zeilen
await p.selectOption('#site', 'beispiel-b.test');
pruefe((await p.inputValue('#qsearch')) === '', 'Seitenwechsel setzt die Suche zurück');
pruefe((await zeilen()) === 15, 'Teilauszug: 15 Zeilen');
pruefe((await p.$eval('#qtools', (e) => e.hidden)) && !(await p.isVisible('#qtools')) && !(await p.isVisible('#qmore')), 'kurze Liste: weder Suche noch Knopf (auch optisch)');
scope = await p.textContent('#scope');
pruefe(scope.startsWith('15 angezeigte Anfragen · Teilauszug, weitere Top-Zeilen vorhanden.'), 'Teilauszug-Satz bleibt: ' + scope);
pruefe(scope.includes('oder der Auszug gekürzt ist') && scope.includes('Keine vollständige Keywordliste.'), 'Teilauszug: gekürzt und ehrlicher Satz: ' + scope);

// Anderes Zeitfenster: die Tagesbalken folgen der Zahl der Tage (nicht fest 28 Spalten)
{
  const lang = { ...snap, von: '2026-10-04', bis: '2026-11-07', sites: [{ ...snap.sites[0], days: tage('2026-10-04', 35) }] };
  const q = await ctx.newPage();
  await q.setContent(VORLAGE.replace('__SNAPSHOT__', JSON.stringify(lang)));
  const spalten = await q.$eval('#bars', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length);
  pruefe((await q.$$('#bars .bar')).length === 35 && spalten === 35, '35 Tage: 35 Balken in 35 Spalten (nicht 28): Spalten ' + spalten);
  await q.close();
}

// Handy: kein seitliches Scrollen
await p.setViewportSize({ width: 390, height: 844 });
await p.selectOption('#site', 'beispiel-a.test');
pruefe(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'Handy: kein seitliches Scrollen');
pruefe(meldungen.length === 0, 'keine Fehler: ' + meldungen.join(' | '));
pruefe(anfragenNetz.length === 0, 'keine Netzzugriffe (CSP): ' + anfragenNetz.join(', '));
const csp = await p.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
pruefe(csp && csp.includes("connect-src 'none'") && csp.includes("default-src 'none'"), 'Content-Security-Policy unverändert streng');
await browser.close();
console.log(fehler === 0 ? 'Monitor-Test: ALLE OK' : 'Monitor-Test: ' + fehler + ' Fehler');
process.exit(fehler === 0 ? 0 : 1);
