// Browser-Test für den Variantenwechsel der Lieferpille (Ereignis «variant:update») und für das Fallback-Skript aus snippets/meta-tags.liquid.
// Läuft in Chromium (Playwright) gegen lokale Seiten, die der Test selbst baut; kein Netz, kein Shopify, kein Theme-Zugriff.
//   node dropship/lagerbestand-0511/wechsel_browser_test.mjs                  (Block lux_delivery.neu.liquid)
//   node …/wechsel_browser_test.mjs --block <Datei> [--schnell]               (anderer Blocktext, z. B. ein Mutant; --schnell = beim ersten Fehler abbrechen)
// Der Block wird mit LiquidJS (LIQUIDJS_DIR) für vier Zustände gerendert: A «Nur noch 2», B «Auf Lager» (27 Stück), C «Diese Ausführung ist ausverkauft»,
// D «Momentan ausverkauft» (dazu X: ein anderes Produkt). Playwright: PLAYWRIGHT_DIR oder das globale node_modules.
// Das Fallback-Skript aus snippets/meta-tags.liquid liegt wörtlich in meta-tags-fallback.js (Quelle: Zeilen 195-230 des Theme-Stands vom 05.11.2026).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/lager';
const args = process.argv.slice(2);
const argWert = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const SCHNELL = args.includes('--schnell');
const BLOCK_PFAD = argWert('--block') || path.join(HIER, 'lux_delivery.neu.liquid');

// ---------- Bibliotheken laden ----------
function ladeLiquid() {
  for (const k of [process.env.LIQUIDJS_DIR, SCRATCH + '/liquidjs', '.'].filter(Boolean)) {
    try { return createRequire(path.resolve(k) + '/')('liquidjs').Liquid; } catch { /* nächster */ }
  }
  console.error('LiquidJS nicht gefunden (LIQUIDJS_DIR).'); process.exit(2);
}
function ladePlaywright() {
  const kandidaten = [process.env.PLAYWRIGHT_DIR, '/opt/node22/lib/node_modules/'].filter(Boolean);
  try { kandidaten.push(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/'); } catch { /* egal */ }
  for (const k of kandidaten) {
    try { return createRequire(path.resolve(k) + '/')('playwright'); } catch { /* nächster */ }
  }
  console.error('Playwright nicht gefunden (PLAYWRIGHT_DIR).'); process.exit(2);
}
const Liquid = ladeLiquid();
const { chromium } = ladePlaywright();
const engine = new Liquid({ timezoneOffset: -60, strictFilters: true, strictVariables: false });

// ---------- Rendern der Zustände (Uhr nur beim Rendern festgelegt, Playwright läuft mit der echten Uhr) ----------
const JETZT_MS = Date.UTC(2026, 10, 5, 8, 30, 0); // Do 05.11.2026 08:30 UTC
const iso = (sekundenVorJetzt) => new Date(JETZT_MS - sekundenVorJetzt * 1000).toISOString().replace('.000Z', 'Z');
const BLOCK = fs.readFileSync(BLOCK_PFAD, 'utf8');
const tpl = engine.parse(BLOCK);
function ctx(f) {
  const v = f.variante;
  return {
    closest: { product: { id: f.id ?? 123, tags: f.tags ?? ['fortura'], available: f.produktOk ?? true,
      selected_or_first_available_variant: { available: v.ok, inventory_quantity: v.qty, inventory_management: 'shopify', inventory_policy: 'deny' } } },
    product: { price_min: 2990 },
    shop: { metafields: { luxe: { fortura_bestand_stand: { value: iso(3600) } } } },
    localization: { country: { iso_code: f.land ?? 'CH' } },
  };
}
function rendere(f) {
  const echt = Date.now; Date.now = () => JETZT_MS;
  try { return engine.renderSync(tpl, ctx(f)); } finally { Date.now = echt; }
}
const ZUSTAND = {
  A: { variante: { ok: true, qty: 2 } },
  B: { variante: { ok: true, qty: 27 } },
  C: { variante: { ok: false, qty: 0 } },
  D: { produktOk: false, variante: { ok: false, qty: 0 } },
  X: { id: 999, variante: { ok: true, qty: 2 } }, // anderes Produkt (Schnellkauf-Auswahl o. ä.) in einem ANDEREN Zustand als B, sonst fiele ein falsches Tauschen nicht auf
  LI: { land: 'LI', variante: { ok: true, qty: 27 } },
};
const BLOECKE = Object.fromEntries(Object.entries(ZUSTAND).map(([k, f]) => [k, rendere(f)]));
const SOLL = {
  A: { text: 'Nur noch 2 auf Lager · versandbereit', farbe: '#9a5b00', box: true, span: false },
  B: { text: 'Auf Lager · versandbereit', farbe: '#1e7a2e', box: true, span: false },
  C: { text: 'Diese Ausführung ist ausverkauft', farbe: '#b3261e', box: false, span: true },
  D: { text: 'Momentan ausverkauft', farbe: '#b3261e', box: false, span: true },
};
const SPAN_TEXT = 'Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.';
const FALLBACK = fs.readFileSync(path.join(HIER, 'meta-tags-fallback.js'), 'utf8');

// ---------- Prüfgerüst ----------
class Erkannt extends Error {}
const R = { n: 0, fehler: [], teile: {} };
let teil = '';
const beginne = (name) => { teil = name; R.teile[name] = 0; };
const pruefe = (name, ok, detail) => {
  R.n++; R.teile[teil]++;
  if (!ok) { R.fehler.push(`[${teil}] ${name}${detail !== undefined ? ' :: ' + detail : ''}`); if (SCHNELL) throw new Erkannt(name); }
};
const gleich = (name, ist, soll) => pruefe(name, JSON.stringify(ist) === JSON.stringify(soll), `ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

// ---------- Seiten ----------
const URL_SEITE = 'http://lx.test/';
function seite(blockHtml, { fallback = true } = {}) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Test</title>${fallback ? '<script>' + FALLBACK + '</script>' : ''}</head>`
    + `<body><main><div class="product-details"><h1>Produkt</h1><p>Lieferzeit 10-20 Werktage ab Bestellung.</p>`
    + `<div id="kaufbox">${blockHtml}</div></div></main></body></html>`;
}
async function oeffne(browser, html, extra = {}) {
  const context = await browser.newContext({ locale: 'de-CH', viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    window.__regs = 0;
    const orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (t, ...rest) { if (t === 'variant:update' && this === document) window.__regs++; return orig.call(this, t, ...rest); };
  });
  const s = { netz: [], seitenfehler: [], konsole: [] };
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u === URL_SEITE) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    s.netz.push(u); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => s.seitenfehler.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') s.konsole.push(m.text().slice(0, 160)); });
  await page.goto(URL_SEITE, { waitUntil: 'load' });
  await page.waitForTimeout(60);
  return { context, page, s, ...extra };
}
// Zustand der Seite lesen
const lesen = (page) => page.evaluate(() => {
  const c = [...document.querySelectorAll('[data-lx-delivery]')];
  const w = c[0];
  const pille = w ? w.firstElementChild : null;
  const stil = (pille && pille.getAttribute('style')) || '';
  const sp = w ? w.querySelector('[data-lx-kein-liefertermin]') : null;
  const wt = w ? w.textContent : '';
  return {
    container: c.length, pid: w ? w.getAttribute('data-lx-delivery') : null,
    text: pille ? pille.textContent.replace(/\s+/g, ' ').trim() : null, farbe: (stil.match(/color:(#[0-9a-f]{6})/) || [])[1] || null,
    box: (wt.match(/🚚/g) || []).length, liefer: (wt.replace(sp ? sp.textContent : '\u0000', '').match(/Lieferung voraussichtlich/g) || []).length,
    span: sp ? { hidden: sp.hidden, anzeige: getComputedStyle(sp).display, text: sp.textContent } : null,
    innen: w ? w.innerHTML : null, nurNochSeite: (document.body.textContent.match(/Nur noch/g) || []).length,
    fallbackBoxen: document.querySelectorAll('.ls-lieferdatum').length, skripteImContainer: w ? w.querySelectorAll('script').length : 0,
    regs: window.__regs,
  };
});
// Wie das Theme: Ereignis am Element (steigt zum document auf)
const feuere = (page, art, html) => page.evaluate(({ art, html }) => {
  const doc = html == null ? null : new DOMParser().parseFromString(html, 'text/html');
  const ev = new Event('variant:update', { bubbles: true });
  const norm = { resource: { id: 1, available: true }, sourceId: 'x', data: { html: doc, productId: '123' } };
  if (art === 'normal') ev.detail = norm;
  else if (art === 'detailNull') ev.detail = null;
  else if (art === 'detailLeer') ev.detail = {};
  else if (art === 'dataLeer') ev.detail = { data: {} };
  else if (art === 'dataNull') ev.detail = { data: null };
  else if (art === 'htmlNull') ev.detail = { data: { html: null } };
  else if (art === 'leeresDokument') ev.detail = { data: { html: document.implementation.createHTMLDocument('') } };
  else if (art === 'ohneContainer') ev.detail = { data: { html: new DOMParser().parseFromString('<p>nichts</p>', 'text/html') } };
  else if (art === 'zahl') ev.detail = { data: { html: 42 } };
  else if (art === 'objekt') ev.detail = { data: { html: {} } };
  else if (art === 'text') ev.detail = { data: { html } };
  else if (art === 'neuesProdukt') ev.detail = { resource: null, sourceId: 'x', data: { html: doc, productId: '999', newProduct: { id: '999', url: '/products/x' } } };
  // 'keinDetail': ev.detail bleibt undefiniert
  (document.querySelector('#kaufbox') || document).dispatchEvent(ev);
}, { art, html });
// Soll-Innenleben, so wie der Browser es aus dem serverseitig gerenderten Block liest
const sollInnen = (page, html) => page.evaluate((h) => { const e = new DOMParser().parseFromString(h, 'text/html').querySelector('[data-lx-delivery]'); return e ? e.innerHTML : null; }, seite(html));
const zeigt = (z, soll) => z.text === soll.text && z.farbe === soll.farbe && (z.box === 1) === soll.box && (z.liefer === 1) === soll.box && !!z.span === soll.span;

// ---------- Lauf ----------
async function lauf() {
  const browser = await chromium.launch({ headless: true });
  try {
    // ===== 1. Aufbau der Ausgabe =====
    beginne('1 Aufbau');
    for (const [k, h] of Object.entries(BLOECKE)) {
      if (k === 'X' || k === 'LI') continue;
      const m = h.match(/^<div data-lx-delivery="([^"]*)" aria-live="polite">([\s\S]*)<\/div>\n<script>([\s\S]*)<\/script>$/);
      pruefe(`${k}: Container vorn, Skript hinten, nichts sonst`, m !== null, h.slice(0, 80));
      pruefe(`${k}: genau ein Container und ein Skript`, (h.match(/<div data-lx-delivery/g) || []).length === 1 && (h.match(/<script/g) || []).length === 1 && (h.match(/<\/script>/g) || []).length === 1);
      pruefe(`${k}: Produkt-ID im Container`, m !== null && m[1] === '123', m && m[1]);
      pruefe(`${k}: Skript liegt ausserhalb des Containers`, m !== null && !m[2].includes('<script'));
    }
    const skripte = Object.values(BLOECKE).map((h) => (h.match(/<script>([\s\S]*)<\/script>/) || [])[1]);
    pruefe('Skript ist in allen Zuständen derselbe Text (keine Liquid-Werte darin)', skripte.every((s) => s && s === skripte[0]));
    const skript = skripte[0] || '';
    pruefe('Skript ohne Liquid-Zeichen', !/\{\{|\{%|%\}|\}\}\s*\{/.test(skript) && !skript.includes('{{'));
    pruefe('Skript ES5 (kein =>, let, const, async, ?., ??, Backtick, Spread, class)', !/=>|\blet\b|\bconst\b|\basync\b|\bawait\b|\?\.|\?\?|`|\.\.\.|\bclass\b/.test(skript));
    pruefe('Skript ohne Netz und ohne Fremdbibliothek', !/fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|\bimport\b|jQuery|\$\(|src\s*=|href\s*=/.test(skript));
    let syntaxOk = true; try { new Function(skript); } catch { syntaxOk = false; }
    pruefe('Skript ist gültiges JavaScript', syntaxOk);
    pruefe('Skript hört auf variant:update am document', /document\.addEventListener\(\s*'variant:update'/.test(skript));

    // ===== 2. Zustände direkt geladen + Fallback-Skript aus meta-tags.liquid =====
    beginne('2 Fallback');
    for (const k of ['A', 'B', 'C', 'D']) {
      const t = await oeffne(browser, seite(BLOECKE[k]));
      const z = await lesen(t.page);
      pruefe(`${k} geladen: Pille «${SOLL[k].text}»`, zeigt(z, SOLL[k]), JSON.stringify({ text: z.text, farbe: z.farbe, box: z.box, liefer: z.liefer, span: z.span }));
      gleich(`${k} geladen: Fallback fügt KEINE Box «Voraussichtliche Lieferung» ein`, z.fallbackBoxen, 0);
      if (SOLL[k].span) {
        pruefe(`${k}: versteckter Span trägt den Satz, ist hidden und unsichtbar`, !!z.span && z.span.hidden === true && z.span.anzeige === 'none' && z.span.text === SPAN_TEXT, JSON.stringify(z.span));
        gleich(`${k}: Pille ohne Lieferbox`, z.box, 0);
      } else {
        pruefe(`${k}: kein versteckter Span`, z.span === null);
      }
      gleich(`${k} geladen: ein Eintrag für variant:update`, z.regs, 1);
      pruefe(`${k} geladen: keine Seitenfehler, kein Netz`, t.s.seitenfehler.length === 0 && t.s.konsole.length === 0 && t.s.netz.length === 0, JSON.stringify(t.s));
      await t.context.close();
    }
    {
      // Kontrollen: ohne den Span würde der Fallback eine Box einfügen (der Test hat also Zähne)
      const ohneSpan = BLOECKE.C.replace(/<span hidden data-lx-kein-liefertermin>[\s\S]*?<\/span>/, '');
      pruefe('Kontrolle: Prüfmuster «C ohne Span» ist wirklich ohne Span', !ohneSpan.includes('data-lx-kein-liefertermin'));
      const t = await oeffne(browser, seite(ohneSpan));
      gleich('Kontrolle: C ohne Span → der Fallback fügt eine Box ein (Datum für Nicht-Lieferbares)', (await lesen(t.page)).fallbackBoxen, 1);
      await t.context.close();
      const t2 = await oeffne(browser, seite(''));
      gleich('Kontrolle: Seite ganz ohne Block → der Fallback fügt eine Box ein (Fallback läuft in dieser Testseite)', (await lesen(t2.page)).fallbackBoxen, 1);
      await t2.context.close();
      // Liechtenstein (vorbestehend, nur zur Kenntnis): der Kassentext enthält «Lieferung voraussichtlich» nicht
      const t3 = await oeffne(browser, seite(BLOECKE.LI));
      const zl = await lesen(t3.page);
      console.log(`  Hinweis (vorbestehend, kein Prüfpunkt): Liechtenstein-Zustand, Fallback-Box vorhanden: ${zl.fallbackBoxen === 1}`);
      await t3.context.close();
    }

    // ===== 3. Wechsel A -> B -> C -> A =====
    beginne('3 Wechsel');
    {
      const t = await oeffne(browser, seite(BLOECKE.A));
      const { page } = t;
      let z = await lesen(page);
      pruefe('Start A: «Nur noch 2», orange, Lieferbox', zeigt(z, SOLL.A));
      const innen = {}; for (const k of ['A', 'B', 'C', 'D']) innen[k] = await sollInnen(page, BLOECKE[k]);
      gleich('Start A: Innenleben gleich dem serverseitigen Soll', z.innen, innen.A);
      // B
      await feuere(page, 'normal', seite(BLOECKE.B)); z = await lesen(page);
      pruefe('Nach Ereignis B: «Auf Lager · versandbereit», grün, Lieferbox', zeigt(z, SOLL.B), JSON.stringify({ text: z.text, farbe: z.farbe, box: z.box }));
      gleich('Nach B: kein «Nur noch» mehr auf der Seite', z.nurNochSeite, 0);
      gleich('Nach B: Innenleben gleich dem serverseitigen Soll', z.innen, innen.B);
      gleich('Nach B: genau ein Container, Skript nicht doppelt', [z.container, z.skripteImContainer], [1, 0]);
      // C
      await feuere(page, 'normal', seite(BLOECKE.C)); z = await lesen(page);
      pruefe('Nach Ereignis C: rot «Diese Ausführung ist ausverkauft», ohne Lieferbox, mit versteckter Span', zeigt(z, SOLL.C), JSON.stringify({ text: z.text, farbe: z.farbe, box: z.box, span: z.span }));
      pruefe('Nach C: Span hidden und unsichtbar', !!z.span && z.span.hidden && z.span.anzeige === 'none' && z.span.text === SPAN_TEXT);
      gleich('Nach C: Innenleben gleich dem serverseitigen Soll', z.innen, innen.C);
      gleich('Nach C: keine Fallback-Box', z.fallbackBoxen, 0);
      // zurück zu A
      await feuere(page, 'normal', seite(BLOECKE.A)); z = await lesen(page);
      pruefe('Zurück zu A: «Nur noch 2», orange, Lieferbox, Span weg', zeigt(z, SOLL.A));
      gleich('Zurück zu A: Innenleben gleich dem serverseitigen Soll', z.innen, innen.A);
      // D
      await feuere(page, 'normal', seite(BLOECKE.D)); z = await lesen(page);
      pruefe('Ereignis D: «Momentan ausverkauft», rot, ohne Lieferbox', zeigt(z, SOLL.D));
      gleich('Nach D: Innenleben gleich dem serverseitigen Soll', z.innen, innen.D);
      // mehrere hintereinander in EINEM Zug, Endzustand = letzter
      await page.evaluate(() => { window.__rest = true; });
      for (const folge of [['B', 'C', 'B', 'A', 'A', 'C'], ['C', 'D', 'B'], ['A', 'B', 'A', 'B', 'A', 'B', 'C', 'A']]) {
        for (const k of folge) await feuere(page, 'normal', seite(BLOECKE[k]));
        z = await lesen(page);
        pruefe(`Folge ${folge.join('')}: Endzustand ${folge.at(-1)}`, zeigt(z, SOLL[folge.at(-1)]) && z.innen === innen[folge.at(-1)], z.text);
      }
      // Text statt Document (ältere Theme-Fassungen)
      await feuere(page, 'text', seite(BLOECKE.B)); z = await lesen(page);
      pruefe('Ereignis mit Text statt Document (data.html als String): Zustand B', zeigt(z, SOLL.B) && z.innen === innen.B, z.text);
      await feuere(page, 'normal', seite(BLOECKE.C)); z = await lesen(page);
      // Der Zuhörer des Blocks lässt das Ereignis weiterlaufen (Prüfer 3, 05.11.): ein SPÄTER am document registrierter Zuhörer (Analyse, App-Skript) bekommt es ebenfalls
      await page.evaluate(() => { window.__spaet = 0; window.__spaetAbgebrochen = null; document.addEventListener('variant:update', (e) => { window.__spaet++; window.__spaetAbgebrochen = e.defaultPrevented; }); });
      await feuere(page, 'normal', seite(BLOECKE.B));
      gleich('Ereignis erreicht einen später am document registrierten Zuhörer (der Block verschluckt es nicht, bricht es nicht ab)', await page.evaluate(() => [window.__spaet, window.__spaetAbgebrochen]), [1, false]);
      z = await lesen(page);
      pruefe('… und der Block hat den Zustand B trotzdem übernommen', zeigt(z, SOLL.B), z.text);
      await feuere(page, 'normal', seite(BLOECKE.C));
      gleich('nach dem Wechsel: Seite hat keinen Fehler und kein Netz verursacht', [t.s.seitenfehler, t.s.konsole, t.s.netz], [[], [], []]);
      await t.context.close();
    }

    // ===== 4. Unerwartete Ereignisse: nichts ändern, nichts werfen =====
    beginne('4 Unerwartetes');
    {
      const t = await oeffne(browser, seite(BLOECKE.B));
      const { page } = t;
      const vor = await lesen(page);
      const faelle = ['keinDetail', 'detailNull', 'detailLeer', 'dataLeer', 'dataNull', 'htmlNull', 'leeresDokument', 'ohneContainer', 'zahl', 'objekt'];
      for (const art of faelle) {
        await feuere(page, art, null);
        const nach = await lesen(page);
        pruefe(`Ereignis «${art}»: Pille unverändert`, nach.innen === vor.innen && nach.pid === vor.pid && nach.container === 1, nach.text);
      }
      // anderes Produkt: unverändert
      await feuere(page, 'normal', seite(BLOECKE.X));
      let z = await lesen(page);
      pruefe('Ereignis eines anderen Produkts (Container-Wert 999, anderer Zustand): Pille unverändert', z.innen === vor.innen && z.pid === '123' && z.text === SOLL.B.text, z.pid + ' ' + z.text);
      await feuere(page, 'normal', seite(BLOECKE.C)); // der eigene Wechsel geht danach weiter
      z = await lesen(page);
      pruefe('nach den Störereignissen funktioniert der Wechsel (C)', zeigt(z, SOLL.C));
      await page.evaluate(() => { /* leer */ });
      gleich('keine Seitenfehler und keine Konsolenfehler durch die Störereignisse', [t.s.seitenfehler, t.s.konsole], [[], []]);
      await t.context.close();
    }
    {
      // gleicher Zustand: der DOM wird nicht angefasst (Knoten bleibt), ein anderer Zustand ersetzt ihn
      const t = await oeffne(browser, seite(BLOECKE.A));
      const { page } = t;
      await page.evaluate(() => { const w = document.querySelector('[data-lx-delivery]'); if (w && w.firstElementChild) w.firstElementChild.__marke = 'da'; });
      await feuere(page, 'normal', seite(BLOECKE.A));
      const marke = () => page.evaluate(() => { const w = document.querySelector('[data-lx-delivery]'); return (w && w.firstElementChild && w.firstElementChild.__marke) || null; });
      gleich('gleicher Zustand A: Pillenknoten bleibt (nichts neu gesetzt)', await marke(), 'da');
      await feuere(page, 'normal', seite(BLOECKE.B));
      gleich('anderer Zustand B: Pillenknoten ist ersetzt', await marke(), null);
      await t.context.close();
    }
    {
      // Ereignis eines FREMDEN Produkts (newProduct gesetzt, z. B. Schnellkauf auf einer Produktseite): die Hauptpille bleibt unverändert
      // (05.11. Prüferbefund: ein früherer Rückfallzweig überschrieb sie mit dem Zustand des fremden Produkts; der Zweig ist entfernt)
      const t = await oeffne(browser, seite(BLOECKE.B));
      await feuere(t.page, 'neuesProdukt', seite(BLOECKE.X));
      const z = await lesen(t.page);
      pruefe('Ereignis mit newProduct eines fremden Produkts: Hauptpille bleibt (Zustand B, eigene Produkt-ID), nicht «Nur noch 2» des fremden', zeigt(z, SOLL.B) && z.pid === '123', JSON.stringify({ t: z.text, pid: z.pid }));
      await t.context.close();
    }

    // ===== 5. Einmal pro Seite =====
    beginne('5 Einmalig');
    {
      // zwei Blöcke (zwei Skripte) auf einer Seite
      const t = await oeffne(browser, seite(BLOECKE.A + BLOECKE.A));
      const { page } = t;
      let z = await lesen(page);
      gleich('zwei Blöcke auf der Seite: zwei Container, zwei Skripte', [z.container, await page.evaluate(() => document.querySelectorAll('#kaufbox script').length)], [2, 2]);
      gleich('zwei Skripte: nur EIN Zuhörer für variant:update', z.regs, 1);
      await page.evaluate((s) => { new Function(s)(); new Function(s)(); }, skript);
      gleich('Skript nochmals zweimal ausgeführt: weiterhin ein Zuhörer', (await lesen(page)).regs, 1);
      await feuere(page, 'normal', seite(BLOECKE.B));
      const beide = await page.evaluate(() => [...document.querySelectorAll('[data-lx-delivery]')].map((w) => (w.firstElementChild ? w.firstElementChild.textContent : '').replace(/\s+/g, ' ').trim()));
      gleich('Ereignis B: beide Container (gleiches Produkt) zeigen B', beide, [SOLL.B.text, SOLL.B.text]);
      await t.context.close();
    }
    {
      // der Wächter steht im Fenster: ein zweites Laden (neue Seite) darf wieder registrieren
      const t = await oeffne(browser, seite(BLOECKE.A));
      gleich('frische Seite: Wächter gesetzt und ein Zuhörer', [await t.page.evaluate(() => window.__lxLiefer === 1 || window.__lxLiefer === true), (await lesen(t.page)).regs], [true, 1]);
      await t.context.close();
    }
  } finally {
    await browser.close();
  }
}

const t0 = performance.now();
try { await lauf(); } catch (e) {
  if (!(e instanceof Erkannt)) { R.n++; R.fehler.push(`[${teil}] Testlauf abgebrochen: ${String(e && e.message).split('\n')[0].slice(0, 200)}`); }
}
const bestanden = R.n - R.fehler.length;
if (!SCHNELL || !R.fehler.length) {
  console.log(`wechsel_browser_test · ${path.basename(BLOCK_PFAD)} · Chromium`);
  for (const [k, n] of Object.entries(R.teile)) console.log(`  ${k.padEnd(18)} ${String(n).padStart(4)} Prüfungen`);
}
console.log(`ERGEBNIS: ${bestanden} von ${R.n} Prüfungen bestanden, ${R.fehler.length} Fehler`);
for (const f of R.fehler.slice(0, 12)) console.log('  FEHLER ' + f);
console.log(`Dauer ${((performance.now() - t0) / 1000).toFixed(1)} s`);
process.exitCode = R.fehler.length ? 1 : 0;
