// Browsertest der Seite «Suchanfragen und Keywordliste» mit einer Attrappe der Dashboard-Laufzeit (dash.data, dash.calc, dash.draw).
// Die Attrappe führt Zeichnungen aus, solange das Element nicht unter `hidden` liegt, wie die echte Laufzeit.
//
//   node seite_test.mjs                       synthetische Daten (kein Messwert, läuft überall)
//   KS_DATEN=/pfad/zu/aus node seite_test.mjs  echte Datensätze aus bauen.py (liegen ausserhalb von Git)
//   KS_BILDER=/pfad node seite_test.mjs        zusätzlich Bilder je Reiter (390 und 1280 px, hell und dunkel)
//
// Playwright muss installierbar/vorhanden sein (require('playwright')).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HIER = path.dirname(fileURLToPath(import.meta.url));
const SEITE = fs.readFileSync(process.env.SEITE_PFAD || path.join(HIER, 'seite.html'), 'utf8');

const NAMEN = ['stand', 'anfragen', 'stichwoerter', 'chancen', 'ideen', 'seiten', 'tage'];

function synthetisch() {
  const woerter = ['armband', 'uhr', 'kette', 'tasche', 'ring', 'schuhe', 'kissen', 'lampe'];
  const anfragen = [];
  for (let i = 0; i < 260; i++) {
    const w = woerter[i % woerter.length];
    const pos = [2.0, 6.5, 14.0, 33.0, 77.0][i % 5];
    anfragen.push({
      anfrage: w + ' ' + (i % 2 ? 'damen' : 'herren') + ' ' + i, klicks: i % 17 === 0 ? 1 : 0, einblendungen: 1 + (i * 7) % 40,
      position: pos, klasse: ['top3', 'seite1', 'seite2', 'seite3-5', 'ab6'][i % 5], seite: i % 3 ? '/collections/' + w : '/products/' + w + '-1', seiten: 1
    });
  }
  anfragen[3].anfrage = 'Uhr Spezial ' + 3;          // Grossschreibung in der Anfrage: die Suche muss Gross und klein gleich behandeln
  const stichw = woerter.map((w, i) => ({ wort: w, anfragen: 30 - i, klicks: 0, einblendungen: 300 - i * 20, position: 40 + i, beispiele: w + ' damen 1 · ' + w + ' herren 2', seite: '/collections/' + w }));
  const chancen = anfragen.filter((a) => a.position > 3 && a.position <= 50).map((a) => ({ anfrage: a.anfrage, einblendungen: a.einblendungen, klicks: a.klicks, position: a.position, klasse: a.klasse, seite: a.seite }));
  const ideen = [];
  for (let i = 0; i < 150; i++) ideen.push({ idee: woerter[i % 8] + ' idee ' + i, seed: woerter[i % 8] + ' damen 1', seed_info: '12 Impr., Platz 40.5', treffer: 1 + (i % 4), seite: '/collections/' + woerter[i % 8] });
  const seiten = woerter.map((w, i) => ({ seite: '/collections/' + w, einblendungen: 500 - i * 30, klicks: i % 2, anfragen: 20 - i, position: 30 + i }));
  const tage = [];
  for (let d = 0; d < 35; d++) tage.push({ datum: '2026-10-' + String(d + 1).padStart(2, '0'), klicks: d % 4, einblendungen: 300 + (d * 37) % 400, position: 50 + (d % 7) });
  tage.forEach((t, i) => { if (i >= 30) t.datum = '2026-11-0' + (i - 29); });
  const stand = [{
    von: '2026-10-04', bis: '2026-11-07', tage: 35, abgerufen: '2026-11-10T00:20:00Z', klicks_gesamt: 122, einblendungen_gesamt: 18892, position_gesamt: 51.6,
    anfragen: anfragen.length, klicks_liste: 25, einblendungen_liste: 16434, anteil_klicks: 20.5, anteil_einblendungen: 87.0, rest_klicks: 79.5,
    ch_anfragen: 200, ch_einblendungen: 15278, ch_anteil: 93.0, chancen: chancen.length, ideen: ideen.length, ideen_seeds: 8, stichwoerter: stichw.length,
    n_top3: 52, e_top3: 100, n_seite1: 52, e_seite1: 100, n_seite2: 52, e_seite2: 100, n_seite3_5: 52, e_seite3_5: 100, n_ab6: 52, e_ab6: 100, n_auf_seite1: 104
  }];
  return { stand, anfragen, stichwoerter: stichw, chancen, ideen, seiten, tage };
}

function echt(dir) {
  const d = {};
  for (const n of NAMEN) d[n] = JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'));
  return d;
}

const ATTRAPPE = `
(() => {
  const DATEN = window.__DATEN__;
  const calcs = {}, draws = {}, made = new WeakMap();
  const cache = {};
  const data = (id) => {
    if (DATEN[id]) return { status: 'ok', data: DATEN[id] };
    if (calcs[id]) {
      if (!cache[id]) cache[id] = calcs[id].fn(...calcs[id].inputs.map((i) => data(i).data));
      return { status: 'ok', data: cache[id] };
    }
    return { status: 'missing', data: [] };
  };
  const sichtbar = (el) => !el.closest('[hidden]');
  const lauf = (name) => {
    const d = draws[name];
    if (!d) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      if (!sichtbar(el)) return;
      if (typeof d === 'function') d(el);
      else {
        if (!made.has(el)) { el.replaceChildren(); made.set(el, d.mount(el)); }
        d.update(el, made.get(el));
      }
    });
  };
  window.dash = {
    data,
    calc: (id, spec) => { calcs[id] = spec; },
    draw: (name, fn) => { if (fn) draws[name] = fn; else lauf(name); },
    colors: ['#3b6ea5', '#c9743a'],
    setLink: () => {},
    params: () => ({}),
    setParams: () => {}
  };
  window.__alleZeichnen = () => Object.keys(draws).forEach(lauf);
})();
`;

const TOKENS = `
:root{--color-fg:#1f1e1d;--color-fg-muted:#6b6862;--color-bg:#fff;--color-panel:#f5f4ef;--color-border-line:#e3e0d8;--color-ok:#2e7d4f;--color-warn:#b7791f;--color-bad:#b3402a;
--font-anthropic-sans:system-ui,sans-serif;--font-anthropic-serif:Georgia,serif;--cds-font-size-caption:12px;--cds-font-size-body:14px;--cds-font-size-heading:17px;--cds-font-size-title:26px;
--cds-font-weight-medium:500;--cds-gap-xs:4px;--cds-gap-sm:8px;--cds-gap-md:12px;--cds-gap-lg:20px;--cds-gap-xl:32px;--cds-radius:8px;--cds-surface-popover:#fff;--cds-border:#ccc;
--cds-shadow-popover:0 4px 12px rgba(0,0,0,.15);--cds-text-secondary:#555}
@media (prefers-color-scheme:dark){:root{--color-fg:#ece9e2;--color-fg-muted:#a39f95;--color-bg:#1d1c1a;--color-panel:#272622;--color-border-line:#3a3833;--color-ok:#6fbf8f;--color-warn:#e0a94a;--color-bad:#e8826c;--cds-surface-popover:#2b2a26;--cds-border:#4a4842;--cds-text-secondary:#c9c5bb}}
body{margin:0;background:var(--color-bg);color:var(--color-fg);font:14px var(--font-anthropic-sans)}
#dash-root{padding:16px}
`;

function html(daten) {
  const teile = SEITE.split(/<script>/);
  const markup = teile[0];
  const skript = teile[1].replace(/<\/script>\s*$/, '');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${TOKENS}</style></head>
<body><div id="dash-root">${markup}</div>
<script>window.__DATEN__ = ${JSON.stringify(daten)};</script><script>${ATTRAPPE}</script>
<script>${skript}</script><script>window.__alleZeichnen();</script></body></html>`;
}

let fehler = 0;
function pruefe(bed, text) {
  if (!bed) { fehler++; console.log('FEHLER: ' + text); }
}

const daten = process.env.KS_DATEN ? echt(process.env.KS_DATEN) : synthetisch();
const browser = await chromium.launch();

async function neueSeite(breite, hoehe, farbe) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, colorScheme: farbe || 'light' });
  const p = await ctx.newPage();
  const meldungen = [];
  p.on('pageerror', (e) => meldungen.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') meldungen.push('console: ' + m.text()); });
  await p.setContent(html(daten));
  return { p, ctx, meldungen };
}

const { p, ctx, meldungen } = await neueSeite(1280, 900);
const A = daten.anfragen.length;

// Übersicht
const zahlen = await p.$$eval('.ks-head [data-draw="zahl"], #ks-sec-uebersicht [data-draw="zahl"]', (els) => els.map((e) => e.textContent));
pruefe(zahlen.length === 12 && zahlen.every((t) => t !== '—' && t !== ''), 'Kopf und Übersicht: alle zwölf Zahlen gefüllt: ' + JSON.stringify(zahlen));
pruefe((await p.textContent('#ks-lead')).includes('4.10.2026'), 'Kopfsatz nennt das Startdatum im Format 4.10.2026');
pruefe((await p.$$('#ks-klassen .ks-bar')).length === 5, 'fünf Balken je Platzklasse');
pruefe((await p.$$('#ks-tage .ks-day')).length === daten.tage.length, 'ein Balken je Tag');
const hoehen = await p.$$eval('#ks-tage .ks-day', (e) => e.map((x) => parseFloat(x.style.height)));
const maxTag = Math.max(...daten.tage.map((t) => t.einblendungen));
const idxMax = daten.tage.findIndex((t) => t.einblendungen === maxTag);
pruefe(Math.abs(hoehen[idxMax] - 100) < 0.01 && hoehen.some((h) => h < 99), 'Tagesbalken: der höchste Tag hat 100 %, andere sind niedriger: ' + hoehen.slice(0, 4));
const breiten = await p.$$eval('#ks-klassen .ks-fill', (e) => e.map((x) => parseFloat(x.style.width)));
const ns = ['top3', 'seite1', 'seite2', 'seite3_5', 'ab6'].map((c) => daten.stand[0]['n_' + c]);
const maxN = Math.max(...ns);
pruefe(breiten.length === 5 && breiten.every((w, i) => Math.abs(w - 100 * ns[i] / maxN) < 0.01), 'Klassenbalken proportional zur Anfragenzahl: ' + breiten);
pruefe((await p.$$('[data-draw="seiten-tabelle"] tr')).length === Math.min(10, daten.seiten.length), 'zehn Seiten in der Tabelle');
pruefe((await p.$$eval('#ks-sec-anfragen', (e) => e[0].hidden)) === true, 'Reiter Anfragen ist anfangs verborgen');

// Tippen auf einen Tagesbalken zeigt den Tageswert
await p.click('#ks-tage .ks-day:nth-child(3)');
const tip = await p.textContent('#ks-tage .ks-tip');
pruefe(/Impressionen, \d+ Klicks, Platz/.test(tip) && !(await p.$eval('#ks-tage .ks-tip', (e) => e.hidden)), 'Tagesbalken zeigt Tooltip: ' + tip);
pruefe(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), 'kein seitliches Scrollen (Desktop, Übersicht)');

// Anfragen
await p.click('#ks-tab-anfragen');
pruefe((await p.$eval('#ks-sec-anfragen', (e) => e.hidden)) === false && (await p.$eval('#ks-sec-uebersicht', (e) => e.hidden)) === true, 'Reiterwechsel zeigt Anfragen, verbirgt Übersicht');
pruefe((await p.getAttribute('#ks-tab-anfragen', 'aria-selected')) === 'true', 'aria-selected gesetzt');
let zeilen = await p.$$('[data-draw="anfragen-tabelle"] tr');
pruefe(zeilen.length === Math.min(100, A), 'erste 100 Anfragen: ' + zeilen.length);
let zaehler = await p.textContent('[data-draw="zaehler-anfragen"]');
pruefe(zaehler.startsWith(A + ' Anfragen'), 'Zähler nennt alle Anfragen: ' + zaehler);
if (A > 100) {
  pruefe(!(await p.$eval('#ks-mehr-anfragen', (e) => e.hidden)), 'Mehr-Knopf sichtbar');
  await p.click('#ks-mehr-anfragen');
  pruefe((await p.$$('[data-draw="anfragen-tabelle"] tr')).length === Math.min(200, A), 'Mehr-Knopf zeigt 100 weitere');
}
// Suche
await p.fill('#ks-suche-anfragen', 'UHR');
const erwartet = daten.anfragen.filter((r) => r.anfrage.toLowerCase().includes('uhr')).length;
zaehler = await p.textContent('[data-draw="zaehler-anfragen"]');
pruefe(erwartet > 0 && (zaehler.startsWith(erwartet + ' von ' + A + ' Anfragen') || (erwartet === A && zaehler.startsWith(A + ' Anfragen'))), 'Suche (Gross/klein egal): ' + zaehler + ' erwartet ' + erwartet);
const ersteSpalte = await p.$$eval('[data-draw="anfragen-tabelle"] tr .ks-q', (e) => e.map((x) => x.textContent.toLowerCase()));
pruefe(ersteSpalte.length > 0 && ersteSpalte.every((t) => t.includes('uhr')), 'jede angezeigte Zeile enthält das Suchwort');
await p.fill('#ks-suche-anfragen', 'zzzzzzzz');
pruefe((await p.textContent('[data-draw="anfragen-tabelle"]')).includes('Keine Anfrage passt'), 'leere Suche zeigt Hinweis');
await p.fill('#ks-suche-anfragen', '');
// Klassenfilter
await p.click('#ks-chips-anfragen [data-klasse="seite2"]');
const nSeite2 = daten.anfragen.filter((r) => r.klasse === 'seite2').length;
zaehler = await p.textContent('[data-draw="zaehler-anfragen"]');
pruefe(zaehler.startsWith(nSeite2 + ' von ' + A + ' Anfragen'), 'Klassenfilter Platz 11–20: ' + zaehler + ' erwartet ' + nSeite2);
pruefe((await p.getAttribute('#ks-chips-anfragen [data-klasse="seite2"]', 'aria-pressed')) === 'true' && (await p.getAttribute('#ks-chips-anfragen [data-klasse="alle"]', 'aria-pressed')) === 'false', 'Chip-Zustand');
await p.click('#ks-chips-anfragen [data-klasse="alle"]');
// Reihenfolge nach Platz
await p.selectOption('#ks-sort-anfragen', 'pos');
const pos = await p.$$eval('[data-draw="anfragen-tabelle"] tr td:nth-child(4)', (e) => e.map((x) => Number(x.textContent)));
pruefe(pos.length > 1 && pos.every((v, i) => i === 0 || pos[i - 1] <= v), 'Reihenfolge nach Platz aufsteigend');
await p.selectOption('#ks-sort-anfragen', 'az');
const az = await p.$$eval('[data-draw="anfragen-tabelle"] tr .ks-q', (e) => e.map((x) => x.textContent.toLowerCase()));
pruefe(az.every((v, i) => i === 0 || az[i - 1] <= v), 'Reihenfolge A bis Z');
await p.selectOption('#ks-sort-anfragen', 'klicks');
const kl = await p.$$eval('[data-draw="anfragen-tabelle"] tr td:nth-child(3)', (e) => e.map((x) => Number(x.textContent)));
pruefe(kl.length > 1 && kl[0] >= 1 && kl.every((v, i) => i === 0 || kl[i - 1] >= v), 'Reihenfolge nach Klicks absteigend');
await p.selectOption('#ks-sort-anfragen', 'einbl');
// Mindest-Impressionen
await p.selectOption('#ks-min-anfragen', '10');
const nMin = daten.anfragen.filter((r) => r.einblendungen >= 10).length;
zaehler = await p.textContent('[data-draw="zaehler-anfragen"]');
pruefe(zaehler.startsWith(nMin + ' von ' + A + ' Anfragen') || (nMin === A && zaehler.startsWith(A + ' Anfragen')), 'Mindest-Impressionen: ' + zaehler + ' erwartet ' + nMin);
await p.selectOption('#ks-min-anfragen', '1');
// Zellmarken: jede Zeile trägt data-key; Kopfzellen nennen Spalten der Daten
const schluessel = await p.$$eval('[data-draw="anfragen-tabelle"] tr', (e) => e.map((x) => x.getAttribute('data-key')));
pruefe(schluessel.every((k) => k) && new Set(schluessel).size === schluessel.length, 'data-key je Zeile, eindeutig');
const felder = await p.$$eval('#ks-tab-anfragenliste th', (e) => e.map((x) => x.getAttribute('data-field')));
pruefe(felder.every((f) => f in daten.anfragen[0]), 'th data-field nennt echte Spalten: ' + felder.join(','));
// Kopieren
await p.evaluate(() => { window.__kopiert = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__kopiert = t; return Promise.resolve(); } }, configurable: true }); });
await p.click('#ks-kopie-anfragen');
await p.waitForFunction(() => window.__kopiert !== null);
const tsv = await p.evaluate(() => window.__kopiert);
const tz = tsv.split('\n');
pruefe(tz[0] === 'Suchanfrage\tImpressionen\tKlicks\tPlatz\tSeite' && tz.length === A + 1, 'Kopie: Kopfzeile und alle Zeilen (' + tz.length + ' von ' + (A + 1) + ')');
pruefe(!(await p.$eval('#ks-ok-anfragen', (e) => e.hidden)), 'Kopiert-Hinweis sichtbar');

// Stichwörter
await p.click('#ks-tab-stichwoerter');
zeilen = await p.$$('[data-draw="stichwoerter-tabelle"] tr');
pruefe(zeilen.length === Math.min(100, daten.stichwoerter.length), 'Stichwörter angezeigt: ' + zeilen.length);
await p.fill('#ks-suche-stichwoerter', daten.stichwoerter[1].wort);
const ersteZeile = await p.$eval('[data-draw="stichwoerter-tabelle"] tr .ks-q', (e) => e.textContent);
pruefe(ersteZeile.toLowerCase().includes(daten.stichwoerter[1].wort.toLowerCase()), 'Stichwort-Suche findet das Wort');
await p.fill('#ks-suche-stichwoerter', '');
await p.selectOption('#ks-sort-stichwoerter', 'anfragen');
const anz = await p.$$eval('[data-draw="stichwoerter-tabelle"] tr td:nth-child(2)', (e) => e.map((x) => Number(x.textContent)));
pruefe(anz.every((v, i) => i === 0 || anz[i - 1] >= v), 'Stichwörter nach Anfragen absteigend');
// "Anfragen dazu zeigen" wechselt in die Anfragen und setzt die Suche
const wort = await p.$eval('[data-draw="stichwoerter-tabelle"] tr .ks-q', (e) => e.textContent);
await p.click('[data-draw="stichwoerter-tabelle"] tr .ks-link');
pruefe((await p.$eval('#ks-sec-anfragen', (e) => e.hidden)) === false && (await p.inputValue('#ks-suche-anfragen')) === wort, 'Stichwort springt zu den Anfragen mit gesetzter Suche: ' + wort);
const inh = await p.$$eval('[data-draw="anfragen-tabelle"] tr .ks-q', (e) => e.map((x) => x.textContent.toLowerCase()));
pruefe(inh.length > 0 && inh.every((t) => t.includes(wort.toLowerCase())), 'danach zeigt die Anfragenliste nur Treffer zum Stichwort');

// Chancen
await p.click('#ks-tab-chancen');
const C = daten.chancen.length;
zaehler = await p.textContent('[data-draw="zaehler-chancen"]');
pruefe(zaehler.startsWith(C + ' Chancen'), 'Chancen-Zähler: ' + zaehler);
await p.click('#ks-chips-chancen [data-klasse="seite1"]');
const nC1 = daten.chancen.filter((r) => r.klasse === 'seite1').length;
pruefe((await p.textContent('[data-draw="zaehler-chancen"]')).startsWith(nC1 + ' von ' + C + ' Chancen'), 'Chancen: Filter Platz 4–10');
const hinweise = await p.$$eval('[data-draw="chancen-tabelle"] tr', (e) => e.map((x) => x.textContent));
pruefe(hinweise.length > 0 && hinweise.every((t) => t.includes('Fast ganz oben')), 'Chancen: Hinweis zur Klasse');

// Ideen
await p.click('#ks-tab-ideen');
const I = daten.ideen.length;
zaehler = await p.textContent('[data-draw="zaehler-ideen"]');
pruefe(I === 0 ? zaehler.startsWith('0 Ideen') : zaehler.startsWith(I + ' Ideen'), 'Ideen-Zähler: ' + zaehler);
if (I > 0) {
  const z1 = await p.textContent('[data-draw="ideen-tabelle"] tr');
  pruefe(z1.includes(daten.ideen[0].seed) && z1.includes(daten.ideen[0].seed_info), 'Ideen-Zeile nennt Suchanfrage und Sichtbarkeit: ' + z1);
}

// Zurück zur Übersicht
await p.click('#ks-tab-uebersicht');
pruefe((await p.$eval('#ks-sec-uebersicht', (e) => e.hidden)) === false, 'zurück zur Übersicht');
pruefe(meldungen.length === 0, 'keine Seitenfehler oder Konsolenfehler: ' + meldungen.join(' | '));
await ctx.close();

// Robustheit: fehlen Elemente (von Hand gelöscht), darf nichts abstürzen und der Rest muss weiter gehen
{
  const muster = [
    /<button type="button" class="ks-btn" id="ks-kopie-ideen">[^<]*<\/button>/,
    /<button type="button" class="ks-btn" id="ks-mehr-chancen" hidden>[^<]*<\/button>/,
    /<input type="search" class="ks-input" id="ks-suche-chancen"[^>]*>/,
    /<select class="ks-select" id="ks-min-anfragen">[\s\S]*?<\/select>/,
    /<section class="ks-sec" id="ks-sec-ideen"[\s\S]*?<\/section>/,
    /<span class="ks-ok" id="ks-ok-anfragen"[^>]*>[^<]*<\/span>/,
    /<span class="ks-bad" id="ks-bad-anfragen"[^>]*>[^<]*<\/span>/
  ];
  let seite = SEITE;
  for (const re of muster) {
    pruefe(re.test(seite), 'Testvorbereitung: Muster gefunden ' + re);
    seite = seite.replace(re, '');
  }
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const q = await ctx2.newPage();
  const fe = [];
  q.on('pageerror', (e) => fe.push('pageerror: ' + e.message));
  const teile = seite.split(/<script>/);
  const skript = teile[1].replace(/<\/script>\s*$/, '');
  await q.setContent('<!doctype html><html lang="de"><head><meta charset="utf-8"><style>' + TOKENS + '</style></head><body><div id="dash-root">' + teile[0] + '</div><script>window.__DATEN__ = ' + JSON.stringify(daten) + ';</script><script>' + ATTRAPPE + '</script><script>' + skript + '</script><script>window.__alleZeichnen();</script></body></html>');
  await q.click('#ks-tab-anfragen');
  await q.fill('#ks-suche-anfragen', 'uhr');
  pruefe((await q.$$('[data-draw="anfragen-tabelle"] tr')).length > 0, 'ohne Mindest-Auswahl: Anfragenliste funktioniert weiter');
  await q.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); });
  await q.click('#ks-kopie-anfragen');
  await q.waitForTimeout(300);
  await q.click('#ks-tab-chancen');
  pruefe((await q.$$('[data-draw="chancen-tabelle"] tr')).length > 0, 'ohne Suchfeld und Mehr-Knopf: Chancen funktionieren weiter');
  await q.click('#ks-tab-ideen');
  pruefe(fe.length === 0, 'fehlende Elemente führen zu keinem Seitenfehler: ' + fe.join(' | '));
  await ctx2.close();
}

// Handy: kein seitliches Scrollen auf jedem Reiter; Bilder
const bilder = process.env.KS_BILDER;
if (bilder) fs.mkdirSync(bilder, { recursive: true });
for (const farbe of ['light', 'dark']) {
  const h = await neueSeite(390, 844, farbe);
  for (const t of ['uebersicht', 'anfragen', 'stichwoerter', 'chancen', 'ideen']) {
    await h.p.click('#ks-tab-' + t);
    const breiter = await h.p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    pruefe(!breiter, 'Handy ' + farbe + ' ' + t + ': kein seitliches Scrollen');
    if (bilder) await h.p.screenshot({ path: path.join(bilder, 'handy-' + farbe + '-' + t + '.png'), fullPage: false });
  }
  pruefe(h.meldungen.length === 0, 'Handy ' + farbe + ': keine Fehler: ' + h.meldungen.join(' | '));
  await h.ctx.close();
}
if (bilder) {
  const d = await neueSeite(1280, 900, 'light');
  for (const t of ['uebersicht', 'anfragen', 'stichwoerter', 'chancen', 'ideen']) {
    await d.p.click('#ks-tab-' + t);
    await d.p.screenshot({ path: path.join(bilder, 'desktop-' + t + '.png'), fullPage: false });
  }
  await d.ctx.close();
}
await browser.close();
console.log(fehler === 0 ? 'Seitentest: ALLE OK' : 'Seitentest: ' + fehler + ' Fehler');
process.exit(fehler === 0 ? 0 : 1);
