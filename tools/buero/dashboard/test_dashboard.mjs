// Browsertest der zusammengelegten Seite (KI-Büro + Offene Punkte + Suchanfragen) mit einer Attrappe der Dashboard-Laufzeit.
// Die Attrappe gibt wie der Dashboard-Typ jedem Skript seinen eigenen Geltungsbereich, überspringt Zeichnungen unter `hidden`
// und zeichnet eine Seite, sobald `hidden` wegfällt. Das ist ein Nachbau: dass das echte Dashboard dasselbe zeigt, belegt er nicht.
//
//   node tools/buero/dashboard/test_dashboard.mjs <Bauordner> [Bilderordner]
//
// <Bauordner> enthält: index.html und lx-*.css/.js (bauen.py), kb3d-code.js, kb3d-pack-1..3.js, kb-geldmanager.js
// (node tools/buero/3d/bauen.mjs <Bauordner>) und buero.json (python3 -I tools/buero/make_buero.py <Bauordner>/buero.json).
// DASHBOARD_DATEN=<Ordner> nimmt echte Daten (offen.json und die sieben Dateien der Suchanfragen; sie liegen ausserhalb von Git),
// sonst rechnet der Test mit synthetischen Zeilen. Alle Erwartungen stammen aus den Daten, keine Zahl steht fest im Test.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BAU = path.resolve(process.argv[2] || '');
const BILDER = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (!process.argv[2] || !fs.existsSync(path.join(BAU, 'index.html'))) {
  console.log('Aufruf: node test_dashboard.mjs <Bauordner mit index.html> [Bilderordner]');
  process.exit(2);
}
const SUCHE = ['stand', 'anfragen', 'stichwoerter', 'chancen', 'ideen', 'seiten', 'tage'];

function synthetisch() {
  const woerter = ['armband', 'uhr', 'kette', 'tasche', 'ring', 'schuhe', 'kissen', 'lampe'];
  const anfragen = [];
  for (let i = 0; i < 130; i++) {
    const w = woerter[i % woerter.length];
    anfragen.push({
      anfrage: w + ' ' + (i % 2 ? 'damen' : 'herren') + ' ' + i, klicks: i % 17 === 0 ? 1 : 0, einblendungen: 1 + (i * 7) % 40,
      position: [2.0, 6.5, 14.0, 33.0, 77.0][i % 5], klasse: ['top3', 'seite1', 'seite2', 'seite3-5', 'ab6'][i % 5], seite: '/collections/' + w, seiten: 1
    });
  }
  const stichwoerter = woerter.map((w, i) => ({ wort: w, anfragen: 30 - i, klicks: 0, einblendungen: 300 - i * 20, position: 40 + i, beispiele: w + ' damen 1', seite: '/collections/' + w }));
  const chancen = anfragen.filter((a) => a.position > 3 && a.position <= 50).map((a) => ({ anfrage: a.anfrage, einblendungen: a.einblendungen, klicks: a.klicks, position: a.position, klasse: a.klasse, seite: a.seite }));
  const ideen = [];
  for (let i = 0; i < 60; i++) ideen.push({ idee: woerter[i % 8] + ' idee ' + i, seed: woerter[i % 8] + ' damen 1', seed_info: '12 Impr., Platz 40.5', treffer: 1 + (i % 4), seite: '/collections/' + woerter[i % 8] });
  const seiten = woerter.map((w, i) => ({ seite: '/collections/' + w, einblendungen: 500 - i * 30, klicks: i % 2, anfragen: 20 - i, position: 30 + i }));
  const tage = [];
  for (let d = 0; d < 28; d++) tage.push({ datum: '2026-10-' + String(d + 1).padStart(2, '0'), klicks: d % 4, einblendungen: 300 + (d * 37) % 400, position: 50 + (d % 7) });
  const stand = [{
    von: '2026-10-01', bis: '2026-10-28', tage: 28, abgerufen: '2026-11-01T00:20:00Z', klicks_gesamt: 122, einblendungen_gesamt: 18892, position_gesamt: 51.6,
    anfragen: anfragen.length, klicks_liste: 25, einblendungen_liste: 16434, anteil_klicks: 20.5, anteil_einblendungen: 87.0, rest_klicks: 79.5,
    ch_anfragen: 100, ch_einblendungen: 15278, ch_anteil: 93.0, chancen: chancen.length, ideen: ideen.length, ideen_seeds: 8, stichwoerter: stichwoerter.length,
    n_top3: 26, e_top3: 100, n_seite1: 26, e_seite1: 100, n_seite2: 26, e_seite2: 100, n_seite3_5: 26, e_seite3_5: 100, n_ab6: 26, e_ab6: 100, n_auf_seite1: 52
  }];
  const wer = ['Du', 'Du', 'Du', 'Claude', 'Claude', 'Zeit', 'PC-Claude', 'Codex', 'Zeit'];
  const offen = wer.map((w, i) => ({
    id: 'punkt-' + i, bereich: ['Verkauf', 'Google', 'Betrieb'][i % 3], punkt: 'Punkt ' + i, detail: 'Einzelheit zu Punkt ' + i, wer: w,
    stand: '01.11. 10:0' + i + ' UTC', messung: ['heute', 'älter', 'fehlt'][i % 3], kurz: i % 3 === 0 ? 'Zählung ' + i : null,
    erledigt: i % 3 === 0 ? 3 + i : null, gesamt: i % 3 === 0 ? 40 + i : null
  }));
  return { offen, stand, anfragen, stichwoerter, chancen, ideen, seiten, tage };
}

function echt(dir) {
  const d = { offen: JSON.parse(fs.readFileSync(path.join(dir, 'offen.json'), 'utf8')) };
  for (const n of SUCHE) d[n] = JSON.parse(fs.readFileSync(path.join(dir, n + '.json'), 'utf8'));
  return d;
}

const daten = process.env.DASHBOARD_DATEN ? echt(process.env.DASHBOARD_DATEN) : synthetisch();
daten.buero = JSON.parse(fs.readFileSync(path.join(BAU, 'buero.json'), 'utf8'));
// «Jetzt» der Seite: zwei Minuten nach der jüngsten Messung der Büro-Daten (wie tools/buero/pruefung/harness.py)
const stempel = daten.buero.map((r) => Date.parse(r.gemessen)).filter((t) => Number.isFinite(t));
const JETZT = new Date((stempel.length ? Math.max(...stempel) : Date.parse('2026-11-05T20:28:00Z')) + 120000).toISOString();

const TOKENS = `
:root{color-scheme:light;--color-fg:#1f2328;--color-fg-muted:#59636e;--color-bg:#ffffff;--color-panel:#f6f8fa;--color-border-line:#d1d9e0;--color-ok:#1a7f37;--color-warn:#9a6700;--color-bad:#cf222e;
--cds-gap-xs:4px;--cds-gap-sm:8px;--cds-gap-md:12px;--cds-gap-lg:20px;--cds-gap-xl:32px;--cds-pad-xs:4px;--cds-pad-sm:8px;--cds-pad-md:12px;--cds-pad-lg:16px;--cds-radius:8px;
--cds-font-size-caption:12px;--cds-font-size-body:14px;--cds-font-size-heading:16px;--cds-font-size-title:24px;--cds-font-weight-medium:500;--cds-surface-popover:#fff;--cds-border:#ccc;
--cds-shadow-popover:0 4px 12px rgba(0,0,0,.15);--cds-text-secondary:#555;--font-anthropic-sans:system-ui,-apple-system,'Segoe UI',sans-serif;--font-anthropic-serif:Georgia,'Times New Roman',serif}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--color-fg:#e6edf3;--color-fg-muted:#9aa4af;--color-bg:#0d1117;--color-panel:#151b23;--color-border-line:#30363d;--color-ok:#3fb950;--color-warn:#d29922;--color-bad:#f85149;--cds-surface-popover:#2b2a26;--cds-border:#4a4842;--cds-text-secondary:#c9c5bb}}
body{margin:0;background:var(--color-bg);color:var(--color-fg);font-family:var(--font-anthropic-sans);font-size:14px}
#dash-root{padding:16px}
`;

const ATTRAPPE = `
(() => {
  const DATEN = window.__DATEN__;
  const NOW = Date.parse(window.__JETZT__);
  Date.now = () => NOW;
  const calcs = {}, draws = {}, made = new WeakMap(), cache = {}, onData = [];
  window.__GELESEN__ = []; window.__LINKS__ = []; window.__DOPPELT__ = [];
  const data = (id) => {
    if (window.__GELESEN__.indexOf(id) === -1) window.__GELESEN__.push(id);
    if (Object.prototype.hasOwnProperty.call(DATEN, id)) return { status: 'ok', data: DATEN[id], columns: [], meta: [] };
    if (calcs[id]) {
      if (!(id in cache)) cache[id] = calcs[id].fn(...calcs[id].inputs.map((i) => data(i).data));
      return { status: 'ok', data: cache[id] };
    }
    return { status: 'missing', data: [] };
  };
  const lauf = (name) => {
    const d = draws[name];
    if (!d) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      if (el.closest('[hidden]')) return;
      if (typeof d === 'function') { d(el); return; }
      if (!made.has(el)) { el.replaceChildren(); made.set(el, d.mount(el)); }
      d.update(el, made.get(el));
    });
  };
  window.dash = {
    data,
    calc: (id, spec) => { if (calcs[id]) window.__DOPPELT__.push('calc ' + id); calcs[id] = spec; },
    draw: (name, fn) => { if (fn) { if (draws[name]) window.__DOPPELT__.push('draw ' + name); draws[name] = fn; } else lauf(name); },
    onData: (fn) => { onData.push(fn); },
    colors: ['#3b6fd8', '#c0562b', '#2f9e6a', '#8a5bd6', '#c79a1b', '#1f9fb8', '#c4488a', '#6a7280'],
    setLink: (n) => { window.__LINKS__.push(n); },
    params: () => ({}), setParams: () => {}, resetParams: () => {}, refresh: () => {}
  };
  window.__alleZeichnen = () => { onData.forEach((f) => f()); Object.keys(draws).forEach(lauf); };
})();
`;

function harness() {
  let seite = fs.readFileSync(path.join(BAU, 'index.html'), 'utf8');
  const eigen = (code) => '<script>(function(){\n' + code + '\n}).call(window);</script>';
  seite = seite.replace(/<script src="(lx-[a-z]+\.js)"><\/script>/g, (_, f) => eigen(fs.readFileSync(path.join(BAU, f), 'utf8')));
  seite = seite.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => (m.startsWith('<script>(function(){\n') ? m : eigen(code)));
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${TOKENS}</style></head>
<body><div id="dash-root">
<script>window.__DATEN__ = ${JSON.stringify(daten).replace(/</g, '\\u003c')}; window.__JETZT__ = '${JETZT}';</script><script>${ATTRAPPE}</script>
${seite}
<script>
  window.__alleZeichnen();
  document.querySelectorAll('.lx-seite').forEach((s) => new MutationObserver(() => window.__alleZeichnen()).observe(s, { attributes: true, attributeFilter: ['hidden'] }));
</script>
</div></body></html>`;
  const ziel = path.join(BAU, 'harness_dashboard.html');
  fs.writeFileSync(ziel, html);
  return ziel;
}

let fehler = 0, geprueft = 0;
function pruefe(bed, text, info) {
  geprueft++;
  if (!bed) { fehler++; console.log('FEHLER: ' + text + (info !== undefined ? '\n        ' + JSON.stringify(info).slice(0, 400) : '')); }
}

// Bildschirmfotos sind eine Sehhilfe, keine Prüfung der Seite. Chromium mit Software-WebGL meldet direkt nach dem Schliessen
// eines Fensters mit 3D-Fläche manchmal «Unable to capture screenshot» (gemessen 11.11.2026: 3 von 5 Läufen mit Bildern, jedes Mal
// das erste Handy-Bild, mit echten wie mit synthetischen Daten; ohne Bilder nie). Darum bis zu drei Versuche. Gelingt auch der
// dritte nicht, zählt das als Fehler, bricht den Lauf aber nicht mehr mitten in den Prüfungen ab.
async function bild(p, datei) {
  if (!BILDER) return;
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      await p.screenshot({ path: path.join(BILDER, datei) });
      if (versuch > 1) console.log('Hinweis: Bildschirmfoto ' + datei + ' gelang erst im ' + versuch + '. Versuch');
      return;
    } catch (e) {
      if (versuch === 3) { pruefe(false, 'Bildschirmfoto ' + datei + ' gelang auch im dritten Versuch nicht', String(e.message).split('\n')[0]); return; }
      await p.waitForTimeout(800);
    }
  }
}

const ZIEL = harness();
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function oeffne(breite, hoehe, hash) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const meldungen = [];
  p.on('pageerror', (e) => meldungen.push('pageerror: ' + String(e.message).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') meldungen.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('file://' + ZIEL + (hash ? '#' + hash : ''));
  await p.waitForTimeout(400);
  return { p, ctx, meldungen };
}
const lage = (p) => p.evaluate(() => ({
  offen: [...document.querySelectorAll('.lx-seite')].filter((s) => !s.hidden).map((s) => s.dataset.lxSeite),
  offenIds: [...document.querySelectorAll('.lx-seite')].filter((s) => !s.hidden).map((s) => s.id),
  aktiv: [...document.querySelectorAll('.lx-tab')].filter((t) => t.getAttribute('aria-current') === 'page').map((t) => t.dataset.lxZiel),
  breite: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
  links: window.__LINKS__.slice(), gelesen: window.__GELESEN__.slice(), doppelt: window.__DOPPELT__.slice()
}));
const zahl = (t) => Number(String(t).replace(/[^0-9.-]/g, ''));
// Die Büro-Liste lässt die Zeile «social_linkedin» bewusst weg (wie tools/buero/pruefung/rauchprobe.js).
const BUERO_ZEILEN = daten.buero.filter((r) => r.id !== 'social_linkedin').length;

for (const [name, breite, hoehe] of [['desktop', 1280, 900], ['handy', 390, 844]]) {
  const { p, ctx, meldungen } = await oeffne(breite, hoehe);
  const T = (text) => '[' + name + '] ' + text;

  // ---- Start: das Büro ist offen, die zwei anderen Seiten sind zu und unberührt ----
  let l = await lage(p);
  pruefe(l.offen.join() === 'buero' && l.aktiv.join() === 'buero', T('Start: nur das Büro ist offen und sein Knopf markiert'), l);
  pruefe(l.doppelt.length === 0, T('Keine Zeichnung und keine Berechnung ist doppelt angemeldet'), l.doppelt);
  pruefe(l.links.length === 0, T('Beim Start setzt die Seite keinen Link'), l.links);
  const start = await p.evaluate(() => ({
    knoepfe: [...document.querySelectorAll('.lx-tab')].map((t) => t.textContent.trim()),
    stand: (document.querySelector('[data-draw="stand"]') || {}).textContent,
    opZeilen: document.querySelectorAll('#op-tabelle tbody tr').length,
    opZahl: (document.querySelector('[data-draw="op-zahl"]') || {}).textContent,
    ksZahl: (document.querySelector('#suche [data-draw="zahl"]') || {}).textContent,
    ids: (() => { const z = {}; document.querySelectorAll('[id]').forEach((e) => { z[e.id] = (z[e.id] || 0) + 1; }); return Object.keys(z).filter((k) => z[k] > 1); })(),
    haupt: document.querySelectorAll('.lx-seite').length
  }));
  pruefe(start.knoepfe.join('|') === 'KI-Büro|Offene Punkte|Suchanfragen' && start.haupt === 3, T('Drei Knöpfe und drei Abschnitte in fester Reihenfolge'), start.knoepfe);
  pruefe(start.stand && start.stand.trim() !== '—', T('Das Büro hat gezeichnet (Messstand steht da)'), start.stand);
  pruefe(start.opZeilen === 0 && start.opZahl === '—' && start.ksZahl === '—', T('Die geschlossenen Seiten sind nicht gezeichnet'), start);
  pruefe(start.ids.length === 0, T('Keine id kommt doppelt vor'), start.ids);
  pruefe(l.gelesen.every((g) => g === 'buero'), T('Vor dem ersten Wechsel liest die Seite nur die Büro-Daten'), l.gelesen);
  pruefe(l.breite[0] <= l.breite[1] + 1, T('Büro: kein seitliches Scrollen'), l.breite);
  await bild(p, name + '-1-buero.png');

  // Büro: Liste zeigt jede Zeile der Daten
  await p.locator('#kb-tab-liste').click();
  await p.evaluate(() => window.__alleZeichnen());
  const liste = await p.evaluate(() => document.querySelectorAll('#kb-pane-liste .kb-row').length);
  pruefe(liste === BUERO_ZEILEN && liste > 0, T('Büro, Ansicht «Liste»: so viele Zeilen wie die Daten haben'), [liste, BUERO_ZEILEN]);

  // ---- Offene Punkte ----
  await p.locator('#lx-tab-offen').click();
  await p.waitForTimeout(150);
  l = await lage(p);
  pruefe(l.offen.join() === 'offen' && l.aktiv.join() === 'offen', T('Klick «Offene Punkte»: nur diese Seite ist offen'), l);
  pruefe(l.links[l.links.length - 1] === 'offen', T('Der Wechsel setzt den Link «offen»'), l.links);
  pruefe(l.offenIds.join() === 'offen', T('Der Link «offen» ist die id des offenen Abschnitts (so kann das Dashboard den Ort nennen)'), l.offenIds);
  const op = await p.evaluate(() => ({
    zeilen: document.querySelectorAll('#op-tabelle tbody tr').length,
    gesamt: document.querySelector('#op-lead [data-field="gesamt"]').textContent,
    du: document.querySelector('#op-lead [data-field="du"]').textContent,
    fremd: document.querySelector('#op-lead [data-field="fremd"]').textContent,
    balken: document.querySelectorAll('#op-balken .op-bar').length,
    ersteZeile: (document.querySelector('#op-tabelle tbody tr') || {}).textContent
  }));
  const soll = (w) => daten.offen.filter((r) => r.wer === w).length;
  pruefe(op.zeilen === daten.offen.length && zahl(op.gesamt) === daten.offen.length, T('Offene Punkte: Tabelle und Kopfzahl zeigen alle Zeilen'), op);
  pruefe(zahl(op.du) === soll('Du') && zahl(op.fremd) === soll('PC-Claude') + soll('Codex'), T('Offene Punkte: Zahlen «Du» und «PC-Claude oder Codex» stimmen mit den Daten'), op);
  pruefe(op.balken === daten.offen.filter((r) => Number(r.gesamt) > 0).length, T('Offene Punkte: ein Balken je Zeile mit echter Zählung'), op.balken);
  await p.locator('#op-chip-du').click();
  const nurDu = await p.evaluate(() => document.querySelectorAll('#op-tabelle tbody tr').length);
  pruefe(nurDu === soll('Du'), T('Offene Punkte: der Filter «Du» zeigt nur dessen Zeilen'), [nurDu, soll('Du')]);
  await p.locator('#op-chip-alle').click();
  l = await lage(p);
  pruefe(l.breite[0] <= l.breite[1] + 1, T('Offene Punkte: kein seitliches Scrollen'), l.breite);
  pruefe(!l.gelesen.some((g) => SUCHE.indexOf(g) !== -1), T('Die Suchanfragen sind noch nicht geladen (ihre Seite war nie offen)'), l.gelesen);
  await bild(p, name + '-2-offen.png');

  // ---- Suchanfragen ----
  await p.locator('#lx-tab-suche').click();
  await p.waitForTimeout(200);
  l = await lage(p);
  pruefe(l.offen.join() === 'suche' && l.aktiv.join() === 'suche', T('Klick «Suchanfragen»: nur diese Seite ist offen'), l);
  pruefe(l.links[l.links.length - 1] === 'suche', T('Der Wechsel setzt den Link «suche»'), l.links);
  pruefe(l.offenIds.join() === 'suche', T('Der Link «suche» ist die id des offenen Abschnitts (so kann das Dashboard den Ort nennen)'), l.offenIds);
  const ks = await p.evaluate(() => ({
    zahlen: [...document.querySelectorAll('#ks-sec-uebersicht [data-draw="zahl"]')].map((e) => e.textContent.trim()),
    seiten: document.querySelectorAll('#ks-tab-seiten tbody tr').length
  }));
  pruefe(ks.zahlen.length > 0 && ks.zahlen.every((z) => z !== '—'), T('Suchanfragen, Übersicht: jede Zahl ist gezeichnet'), ks.zahlen.slice(0, 6));
  pruefe(ks.seiten > 0 && ks.seiten <= daten.seiten.length, T('Suchanfragen, Übersicht: die Seitentabelle hat Zeilen'), [ks.seiten, daten.seiten.length]);
  await p.locator('#ks-tab-anfragen').click();
  await p.waitForTimeout(150);
  const anf = await p.evaluate(() => ({
    zeilen: document.querySelectorAll('#ks-tab-anfragenliste tbody tr').length,
    offenSek: [...document.querySelectorAll('.ks-sec')].filter((s) => !s.hidden).map((s) => s.id),
    links: window.__LINKS__.slice(-1)[0]
  }));
  pruefe(anf.zeilen > 0 && anf.zeilen <= daten.anfragen.length && anf.offenSek.join() === 'ks-sec-anfragen', T('Suchanfragen: der Reiter «Anfragen» zeigt Zeilen'), anf);
  pruefe(anf.links === 'anfragen', T('Suchanfragen: der Unter-Reiter setzt seinen eigenen Link'), anf.links);
  l = await lage(p);
  pruefe(l.breite[0] <= l.breite[1] + 1, T('Suchanfragen: kein seitliches Scrollen'), l.breite);
  await bild(p, name + '-3-suche.png');

  // ---- zurück ins Büro ----
  await p.locator('#lx-tab-buero').click();
  await p.waitForTimeout(300);
  l = await lage(p);
  pruefe(l.offen.join() === 'buero' && l.links[l.links.length - 1] === 'buero', T('Zurück ins Büro: nur das Büro ist offen, Link «buero»'), l);
  const zurueck = await p.evaluate(() => ({
    liste: document.querySelectorAll('#kb-pane-liste .kb-row').length,
    flaeche: (() => { const c = document.querySelector('#kb-pane-3d canvas'); return c ? [c.clientWidth, c.clientHeight] : null; })()
  }));
  pruefe(zurueck.liste === BUERO_ZEILEN, T('Zurück im Büro steht die Liste noch vollständig da'), zurueck);
  if (name === 'desktop') {
    await p.locator('#kb-tab-3d').click();
    await p.evaluate(() => window.__alleZeichnen());
    await p.waitForTimeout(600);
    const drei = await p.evaluate(() => { const c = document.querySelector('#kb-pane-3d canvas'); return c ? [c.clientWidth, c.clientHeight] : null; });
    pruefe(drei && drei[0] > 200 && drei[1] > 100, T('Büro 3D: die Zeichenfläche hat nach dem Hin und Her wieder ihre Grösse'), drei);
  }
  // Ein Knopf mit unbekanntem Ziel (jemand hat ihn von Hand verändert) führt ins Büro, nicht auf eine leere Seite
  await p.locator('#lx-tab-offen').click();
  await p.evaluate(() => { document.querySelector('#lx-tab-suche').dataset.lxZiel = 'gibt-es-nicht'; });
  await p.locator('#lx-tab-suche').click();
  await p.waitForTimeout(150);
  l = await lage(p);
  pruefe(l.offen.join() === 'buero', T('Ein Knopf mit unbekanntem Ziel öffnet das Büro (nie eine leere Seite)'), l.offen);
  pruefe(meldungen.length === 0, T('Keine Seitenfehler im ganzen Ablauf'), meldungen.slice(0, 4));
  await ctx.close();
}

// ---- Der Link am Ende der Adresse öffnet die richtige Seite ----
for (const [hash, seite, reiter] of [['offen', 'offen', null], ['suche', 'suche', 'ks-sec-uebersicht'], ['chancen', 'suche', 'ks-sec-chancen'], ['buero', 'buero', null], ['gibt-es-nicht', 'buero', null]]) {
  const { p, ctx, meldungen } = await oeffne(1280, 900, hash);
  const l = await lage(p);
  const sek = await p.evaluate(() => [...document.querySelectorAll('.ks-sec')].filter((s) => !s.hidden).map((s) => s.id));
  pruefe(l.offen.join() === seite && l.aktiv.join() === seite, 'Adresse endet auf #' + hash + ': Seite «' + seite + '» ist offen', l);
  if (reiter) pruefe(sek.join() === reiter, 'Adresse endet auf #' + hash + ': Unter-Reiter ' + reiter, sek);
  pruefe(l.links.length === 0, 'Adresse endet auf #' + hash + ': das Öffnen aus dem Link setzt keinen neuen Link', l.links);
  pruefe(meldungen.length === 0, 'Adresse endet auf #' + hash + ': keine Seitenfehler', meldungen.slice(0, 3));
  await ctx.close();
}

await browser.close();
if (fehler) { console.log(`\n${fehler} von ${geprueft} Prüfungen FEHLGESCHLAGEN`); process.exit(1); }
console.log(`dashboard: ${geprueft} Prüfungen bestanden`);
