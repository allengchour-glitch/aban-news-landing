// KOPIE von katalog-texte-de-0611/test_texte.cjs (Original unverändert), angepasst auf den GEMEINSAMEN Stand «nur bestellbar + deutsche Texte».
// Der Live-Shop bleibt UNVERÄNDERT: JS, CSS, Daten, Textdatei und Section-Konfiguration werden nur im Browser per route() aus ziel/ ersetzt.
// Aufruf: NODE_PATH=$(/opt/node22/bin/npm root -g) /opt/node22/bin/node test_texte_kombi.cjs [schnell|voll|szenarien|alles]
// Umgebung: PRUEFSUMME_IGNORIEREN=1 (statt ziel/ den aus kombi.mjs berechneten Stand prüfen, nur Mutationsprobe) · MINIFIZIERT=1 ESBUILD=<Pfad> (JS/CSS wie der Shopify-CDN ausliefern)
//           SCHALEN_DIR=<Ordner> (Lesekopien von Index und 51 Datenschalen: Theme-Dateien assets__luxe-clothing-index.json, assets__luxe-clothing-details-sNNN.json; Vorgabe: Scratch) · CACHE_DIR
// Änderungen gegenüber dem Original (alle begründet):
//  1. Der Stand ist der gemeinsame (ziel/). Das Dokument trägt die Konfiguration, die der Server nach dem Einspielen liefert (Manifest, Etiketten von (A) und (B), textsAsset).
//  2. Das Fenster zeigt jetzt nur BESTELLBARE Modelle (22 von 572). Die Übersetzungen der übrigen Modelle werden trotzdem geprüft: das Dokument bekommt künstliche Angebote für die geprüften Modelle
//     (alle Varianten, wie es eine Fabrik später macht) und die Ausblenden-Datei ist leer. Der Test prüft hier die Texte, nicht die Bestellbarkeit (die prüfen test_bestellbar_kombi.cjs und test_kombi.cjs).
//  3. Die Zeile der Detailansicht heisst jetzt «N bestellbare Ausführung(en)» statt «N Originalvarianten»: Singular-Prüfung entsprechend (bewusste Änderung durch die Kollision, siehe README).
//  4. Basislinie für die Rückfall-Szenarien ist (A) allein (gleiche Daten, gleiche künstliche Angebote), nicht mehr das Original-JS mit allen 572 Modellen.
const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const HIER = __dirname + '/';
const A_ORDNER = HIER + '../katalog-nur-bestellbar-0511/';
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/';
const TH = (process.env.SCHALEN_DIR || SCRATCH + 'theme') + '/';
const CACHE = process.env.CACHE_DIR || SCRATCH + 'work/fenster/cache';
fs.mkdirSync(CACHE, { recursive: true });
const SEITE = 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const SEITE_FR = 'https://luxestyle.ch/fr/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MODUS = process.argv[2] || 'schnell';
const md5h = (s) => crypto.createHash('md5').update(s).digest('hex');
const MINIFIZIERT = process.env.MINIFIZIERT === '1';
const miniMemo = new Map();
const mini = (text, loader) => {
  if (!MINIFIZIERT) return text;
  const k = loader + md5h(text);
  if (!miniMemo.has(k)) {
    if (!process.env.ESBUILD) throw new Error('MINIFIZIERT=1 braucht ESBUILD=<Pfad zu esbuild>');
    const r = spawnSync(process.env.ESBUILD, ['--minify-whitespace', '--minify-syntax', '--loader=' + loader, '--log-level=error'], { input: text, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status !== 0 || !r.stdout) throw new Error('esbuild schlug fehl: ' + (r.stderr || '').slice(0, 300));
    miniMemo.set(k, r.stdout);
  }
  return miniMemo.get(k);
};

// ---- Stand (gemeinsam, aus ziel/), Ausgangsstand, (A) allein ----
let ST, patchedJs, origJs, textsRoh, T, deLocale, NOTE_DE, NOTE_ALT, LOCALE_DE, BESTELLBAR = [];
const NEUE_ETIKETTEN = ['original_variants_one', 'supplier_out_of_stock', 'stocked_on_demand', 'status_unknown'];
async function vorbereiten() {
  const K = await import(HIER + 'kombi.mjs'), A = await import(A_ORDNER + 'patches.mjs'), { sprachJson } = await import(A_ORDNER + 'liquid_helfer.mjs');
  const alt = Object.fromEntries(Object.values(K.DATEIEN).map((f) => [f, fs.readFileSync(HIER + 'sicherung/' + f.replace('/', '__') + '.vor', 'utf8')]));
  const daten = K.lesenDaten(), berechnet = K.anwendenKombi(alt, daten), nurA = A.anwenden(alt, { ausblenden: daten.ausblenden, karte: daten.karte });
  let kombi = berechnet;
  if (process.env.PRUEFSUMME_IGNORIEREN !== '1') {
    const pf = JSON.parse(fs.readFileSync(HIER + 'daten/pruefstand.json', 'utf8')).md5;
    const ziel = Object.fromEntries(Object.keys(pf).map((f) => [f, fs.readFileSync(HIER + 'ziel/' + f.replace('/', '__'), 'utf8')]));
    for (const f of Object.keys(pf)) { ok(md5h(ziel[f]) === pf[f] && md5h(berechnet[f]) === pf[f], 'Stand: ' + f + ' gleich daten/pruefstand.json (ziel/ und kombi.mjs)'); }
    if (fail) { console.log('Nachbildung weicht vom Prüfstand ab: abgebrochen'); process.exit(2); }
    kombi = ziel;
  }
  ST = { K, A, alt, kombi, nurA, sprachJson, karte: JSON.parse(kombi[K.NEUE_DATEIEN.KARTE]) };
  patchedJs = kombi[K.DATEIEN.JS]; origJs = alt[K.DATEIEN.JS]; textsRoh = kombi[K.NEUE_DATEIEN.TEXTE]; T = JSON.parse(textsRoh);
  deLocale = kombi[K.DATEIEN.DE];
  NOTE_DE = /"original_note_translated":\s*"([^"]+)"/.exec(deLocale)[1];
  NOTE_ALT = /"original_note":\s*"([^"]+)"/.exec(deLocale)[1];
  LOCALE_DE = sprachJson(deLocale).luxe_clothing;
  STATUS_DE = { in_stock: LOCALE_DE.in_stock, out_of_stock: LOCALE_DE.out_of_stock, not_available: LOCALE_DE.not_available, supplier_out_of_stock: LOCALE_DE.supplier_out_of_stock, stocked_on_demand: LOCALE_DE.stocked_on_demand };
}
const LABEL = { position_front: 'Vorderseite', position_back: 'Rückseite', position_left_sleeve: 'Linker Ärmel', position_right_sleeve: 'Rechter Ärmel', position_left_chest: 'Linke Brust', position_center_chest: 'Brust mittig', tech_dtg: 'DTG-Direktdruck', tech_dtf: 'DTF-Druck', tech_embroidery: 'Stickerei', tech_flat: 'Flachstickerei', tech_puff: '3D-Stickerei', tech_sublimation: 'Sublimationsdruck', tech_allover: 'Allover-Druck' };
const posNames = { front: 'position_front', 'front print': 'position_front', back: 'position_back', 'back print': 'position_back', 'left sleeve': 'position_left_sleeve', 'right sleeve': 'position_right_sleeve', 'left chest': 'position_left_chest', 'center chest': 'position_center_chest' };
const techNames = { DTG: 'tech_dtg', DTFILM: 'tech_dtf', DTF: 'tech_dtf', EMBROIDERY: 'tech_embroidery', EMBROIDERY_FLAT: 'tech_flat', EMBROIDERY_PUFF: 'tech_puff', SUBLIMATION: 'tech_sublimation', 'CUT-SEW': 'tech_allover' };

// ---- Daten (lokale Lesekopien, Frische gegen Live in pruefeFrische()) ----
const index = JSON.parse(fs.readFileSync(TH + 'assets__luxe-clothing-index.json', 'utf8'));
const modelle = new Map(); // id -> {titel, shard}
for (const p of index.products) modelle.set(p.id, { id: p.id, titel: p.title, shard: p.detailShardKey });
const detail = new Map();
for (let i = 1; i <= 51; i++) {
  const d = JSON.parse(fs.readFileSync(TH + 'assets__luxe-clothing-details-s' + String(i).padStart(3, '0') + '.json', 'utf8'));
  const rows = Array.isArray(d.products) ? d.products : Object.values(d.products);
  for (const r of rows) detail.set(r.id, r);
}
const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, '');
const ws = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const normal = (v) => String(v ?? '').toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replaceAll('ß', 'ss');
function soll(id, deutsch) {
  // spiegelt die Logik des Patches unabhängig nach (Wörterbuch / Original)
  const p = detail.get(id);
  const tr = (bereich, w, mid) => {
    if (!deutsch) return w;
    const ex = mid === undefined ? undefined : own(own(own(T.ausnahmen, bereich), w), String(mid));
    const hit = ex ?? own(T[bereich], w);
    return typeof hit === 'string' && hit ? hit : w;
  };
  const uniq = (a) => [...new Set(a.filter(Boolean))];
  const techniken = uniq((p.techniques || []).map((t) => (techNames[String(t.key)] ? LABEL[techNames[t.key]] : tr('techniken', String(t.display_name || t.displayName || t.key)))));
  const positionen = uniq((p.files || []).filter((f) => !['preview', 'mockup'].includes(String(f.type)) && String(f.id) !== 'preview')
    .map((f) => (posNames[normal(f.title)] ? LABEL[posNames[normal(f.title)]] : tr('positionen', String(f.title || f.type), id))));
  const optionen = [];
  for (const o of p.options || []) {
    if (typeof o.title !== 'string' || !((o.values && typeof o.values === 'object') || o.type === 'single_line_text')) continue;
    const vals = Array.isArray(o.values) ? o.values : o.values && typeof o.values === 'object' ? Object.values(o.values) : [];
    const texte = vals.map((v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : String(v?.title || v?.name || ''))).filter(Boolean);
    const frei = o.type === 'single_line_text' && !texte.length;
    if (!texte.length && !frei) continue;
    optionen.push([tr('optionstitel', plain(o.title)), frei ? null : texte.map((x) => tr('optionswerte', plain(x))).join(' · ')]);
  }
  return { techniken, positionen, optionen, beschreibung: deutsch ? own(T.beschreibungen, String(id)) : p.description };
}

const IMP = /(?<![A-Za-zÄÖÜäöü])(?:oz|ounces?|lbs?|pounds?|inch(?:es)?|yds?|ft|feet|gal(?:lons?)?)(?![A-Za-zÄÖÜäöü])|[″”]|\d\s*"|[¼½⅛⅜⅝⅞]|¾(?!-Ärmel|-Arm)|°\s*F\b|\d\s*in\b/i; // «¾-Ärmel» ist die Ärmellänge (Dreiviertelarm), keine Zollangabe
const ENGL = /\b(?:the|and|with|your|this|that|from|are|you|can|will|made|wash|cold|water|bleach|soft(?!-touch)|fabric|weight|blank|product|sourced|regular|neck|sleeve|cotton)\b/gi;

// ---- Zähler ----
let pass = 0, fail = 0; const fehlerListe = []; const overflowEingefasst = [];
function ok(bed, name, info) { if (bed) pass++; else { fail++; fehlerListe.push(name + (info ? ' | ' + info : '')); console.log('  FAIL', name, info || ''); } }

// ---- Dokumente: einmal vom Live-Shop holen (de und fr), dann im Speicher ----
const dokCache = new Map();
async function holeDoc(url) {
  if (dokCache.has(url)) return dokCache.get(url);
  const datei = CACHE + '/doc_' + md5h(url) + '.html';
  let html;
  if (process.env.LOKAL === '1' && fs.existsSync(datei)) html = fs.readFileSync(datei, 'utf8');
  else {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': /\/fr\//.test(url) ? 'fr-CH,fr;q=0.9' : 'de-CH,de;q=0.9' } });
    html = await r.text();
    if (r.status !== 200 || !/data-lcl-config/.test(html)) { console.log('BOT-SPERRE oder Fehler', r.status, url); process.exit(2); }
    fs.writeFileSync(datei, html);
  }
  dokCache.set(url, html);
  return html;
}
const konfigRegex = /(<script type="application\/json" data-lcl-config>)([\s\S]*?)(<\/script>)/;
// Das Dokument so, wie der Server es nach dem Einspielen liefern würde: variante 'kombi' (gemeinsamer Stand), 'a' ((A) allein), 'alt' (heute, unverändert)
function dokumentFuer(html, variante, sprachSeite, opt) {
  if (variante === 'alt') return html;
  const stand = variante === 'a' ? ST.nurA : ST.kombi, K = ST.K;
  const lc = (f) => ST.sprachJson(stand[f]).luxe_clothing;
  const luxe = { ...lc(K.DATEIEN.EN), ...lc(sprachSeite === 'fr' ? K.DATEIEN.FR : K.DATEIEN.DE) }; // Shopify fällt bei fehlendem Schlüssel auf die Standardsprache zurück
  const m = html.match(konfigRegex); if (!m) throw new Error('Konfiguration nicht gefunden');
  const cfg = JSON.parse(m[2]);
  const basis = cfg.assets.index.split('luxe-clothing-index.json')[0];
  cfg.assets = { index: cfg.assets.index, ausblenden: basis + 'luxe-clothing-ausblenden.json?v=lxtest', variantenkarte: basis + 'luxe-clothing-variantenkarte.json?v=lxtest', details: cfg.assets.details };
  const schluessel = ['notice', 'intro', ...K.NEUE_SCHLUESSEL_A, ...(variante === 'kombi' ? K.NEUE_SCHLUESSEL_B : [])];
  if (variante === 'kombi') cfg.textsAsset = basis + 'luxe-clothing-texts-de.json?v=lxtest';
  for (const k of schluessel) if (luxe[k] !== undefined) cfg.labels[k] = luxe[k];
  if (variante === 'kombi') {
    if (opt.etikettFehlt) { delete cfg.labels.original_note_translated; for (const k of NEUE_ETIKETTEN) delete cfg.labels[k]; }
    if (opt.etikettMissing) { for (const k of ['original_note_translated', ...NEUE_ETIKETTEN]) cfg.labels[k] = 'translation missing: de.luxe_clothing.' + k; }
  }
  if (opt.sprache) cfg.locale = opt.sprache;
  // Künstliche Angebote für die geprüften Modelle (alle Varianten): der Test prüft hier die Texte, nicht die Bestellbarkeit
  const ids = opt.bestellbar || BESTELLBAR;
  if (ids === 'alle' || ids.length) {
    const vorlage = { ...cfg.shopVariantOffers[0], available: true }, bereits = new Set(cfg.shopVariantOffers.map((o) => String(o.printfulVariantId)));
    for (const pid of ids === 'alle' ? Object.keys(ST.karte.modelle) : ids.map(String)) for (const z of ST.karte.modelle[pid] || []) { const v = String(z[0]); if (!bereits.has(v)) { bereits.add(v); cfg.shopVariantOffers.push({ ...vorlage, printfulVariantId: v }); } }
  }
  return html.replace(konfigRegex, (_x, a, _b, c) => a + JSON.stringify(cfg) + c);
}

// ---- Browser-Aufbau ----
async function neuerKontext(browser, vp, opt) {
  const variante = opt.js === 'alt' ? 'alt' : opt.js === 'a' ? 'a' : 'kombi';
  const stand = variante === 'a' ? ST.nurA : variante === 'alt' ? ST.alt : ST.kombi, K = ST.K;
  const ctx = await browser.newContext({ viewport: vp, userAgent: UA, locale: opt.locale || 'de-CH' });
  const zaehler = { texte: 0, js: 0 };
  ctx.on('request', (r) => { if (/luxe-clothing-texts-de\.json/.test(r.url())) zaehler.texte++; });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing|pinterest|snap|sentry/i.test(u.hostname)) return route.abort();
    if (/\/assets\/luxe-clothing\.js$/.test(u.pathname)) { zaehler.js++; return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: mini(stand[K.DATEIEN.JS], 'js') }); }
    if (/\/assets\/luxe-clothing\.css$/.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: mini(stand[K.DATEIEN.CSS], 'css') });
    if (/\/assets\/luxe-clothing-ausblenden\.json$/.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: opt.ausblendenEcht ? stand[K.NEUE_DATEIEN.AUSBLENDEN] : '{"schemaVersion":1,"modelle":[],"varianten":{}}' });
    if (/\/assets\/luxe-clothing-variantenkarte\.json$/.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: stand[K.NEUE_DATEIEN.KARTE] });
    if (/\/assets\/luxe-clothing-texts-de\.json$/.test(u.pathname)) {
      const m = opt.texte || 'datei';
      if (variante !== 'kombi') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'nicht da' });
      if (m === 'abbruch') return route.abort();
      if (m === '404') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'nicht da' });
      if (m === 'ungueltig') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"schema":1,"beschreibungen":' });
      if (m === 'schema2') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schema: 2, beschreibungen: { 294: 'X' } }) });
      if (m === 'ohne294') { const c = JSON.parse(textsRoh); delete c.beschreibungen['294']; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(c) }); }
      if (m === 'verzoegert') { await new Promise((r) => setTimeout(r, 1500)); }
      if (m === 'haengt') { await new Promise((r) => setTimeout(r, 11000)); }
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: textsRoh });
    }
    if (opt.beschrAendern && /\/assets\/luxe-clothing-details-s\d+\.json$/.test(u.pathname)) {
      const resp = await route.fetch(); const d = JSON.parse(await resp.text());
      const rows = Array.isArray(d.products) ? d.products : Object.values(d.products);
      for (const r of rows) if (String(r.id) === '294') r.description = r.description + ' (geändert)';
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(d) });
    }
    // nur die Seite selbst (Hauptdokument, genau dieser Pfad): ein Shopify-Pixel lädt in einem Iframe einen Pfad, der auf denselben Namen endet (…/sandbox/modern/fr/collections/…)
    if ((u.pathname === '/collections/selbst-gestalten-1' || u.pathname === '/fr/collections/selbst-gestalten-1') && route.request().resourceType() === 'document' && !route.request().frame().parentFrame() && opt.konfig !== false) {
      const fr = /^\/fr\//.test(u.pathname);
      const html = dokumentFuer(await holeDoc(fr ? SEITE_FR : SEITE), variante, fr ? 'fr' : 'de', opt);
      zaehler.locale = JSON.parse(html.match(konfigRegex)[2]).locale;
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  const logs = { fehler: [], konsole: [] };
  logs.fremd = [];
  page.on('pageerror', (e) => { const rel = /luxe-clothing|lcl-/i.test((e.stack || '') + e.message); (rel ? logs.fehler : logs.fremd).push(e.message.slice(0, 160)); });
  page.on('console', (m) => { if (m.type() !== 'error') return; const rel = /luxe-clothing|Catalogue|lcl-/i.test(m.text() + (m.location().url || '')); (rel ? logs.konsole : logs.fremd).push(m.text().slice(0, 160)); });
  return { ctx, page, logs, zaehler };
}
async function laden(page, url) {
  await page.goto(url || SEITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-luxe-clothing]')?.dataset.loadState === 'ready', null, { timeout: 60000 });
}
async function oeffne(page, id) {
  const titel = modelle.get(id).titel;
  await page.fill('[data-lcl-search]', titel);
  await page.waitForTimeout(320);
  let gefunden = false;
  for (let versuch = 0; versuch < 3 && !gefunden; versuch++) {
    if (versuch) { await page.fill('[data-lcl-search]', ''); await page.waitForTimeout(400); await page.fill('[data-lcl-search]', titel); await page.waitForTimeout(700); } // Nachlauf unter Last: Suche neu auslösen
    for (let k = 0; k < 8; k++) {
      const knopf = page.locator('.lcl-card[data-product-id="' + id + '"] .lcl-card-cta');
      if (await knopf.count()) { await knopf.first().click(); gefunden = true; break; }
      const weiter = page.locator('[data-lcl-next]');
      if (!(await weiter.isVisible()) || !(await weiter.isEnabled())) break;
      await weiter.click(); await page.waitForTimeout(150);
    }
  }
  if (!gefunden) throw new Error('Karte nicht gefunden: ' + id + ' ' + titel);
  await page.waitForFunction((i) => { const d = document.querySelector('[data-lcl-dialog]'); return d.open && d.dataset.productId === String(i) && d.querySelector('.lcl-model-info'); }, id, { timeout: 30000 });
}
async function lies(page) {
  return page.evaluate(() => {
    const d = document.querySelector('[data-lcl-dialog]');
    d.querySelectorAll('details').forEach((x) => { x.open = true; });
    const facts = [...d.querySelectorAll('.lcl-model-info > .lcl-fact')].map((f) => ({ h: f.querySelector('h4')?.textContent || '', p: f.querySelector('p')?.textContent || '' }));
    const beschr = d.querySelector('.lcl-description-text');
    const notiz = beschr ? beschr.parentElement.querySelector('p.lcl-small')?.textContent || '' : '';
    const optionen = [...d.querySelectorAll('.lcl-option-reference')].map((r) => [r.querySelector('h4')?.textContent || '', r.querySelector('p')?.textContent || '']);
    const dr = d.getBoundingClientRect();
    const eingefasst = (e) => { for (let a = e.parentElement; a && a !== d; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return true; } return false; };
    const ueberAlle = [...d.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > dr.right + 1; });
    const ueber = ueberAlle.filter((e) => !eingefasst(e)).length;
    const ueberEingefasst = ueberAlle.length - ueber;
    const q = (sel) => [...d.querySelectorAll(sel)].map((e) => e.textContent.trim());
    const karte = document.querySelector('.lcl-card[data-product-id="' + d.dataset.productId + '"]');
    const kleinTexte = q('p.lcl-small');
    return {
      titel: d.querySelector('[data-lcl-detail-title]')?.textContent || '', facts, beschr: beschr ? beschr.textContent : null, notiz, optionen,
      kartenTitel: karte?.querySelector('h3')?.textContent || '', kartenGroessen: karte?.querySelector('.lcl-card-sizes')?.textContent || '',
      meta: q('.lcl-detail-meta'), kleinTexte, groessen: q('.lcl-size'), farben: q('.lcl-color-choice'), materialOptionen: q('.lcl-material-select option'),
      materialDiese: (d.querySelector('.lcl-fact h4') ? [...d.querySelectorAll('.lcl-fact')].filter((f) => /^Material/.test(f.textContent)).map((f) => f.querySelector('p')?.textContent || '') : []),
      regionen: q('.lcl-regions li'), dialogText: d.textContent, variantId: d.dataset.variantId || '',
      scrollD: d.scrollWidth - d.clientWidth, ueber, ueberEingefasst, seiteScroll: document.documentElement.scrollWidth - innerWidth,
    };
  });
}
async function schliesse(page) { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-lcl-dialog]').open, null, { timeout: 5000 }).catch(() => {}); }
const faktenText = (d, kopf) => (d.facts.find((f) => f.h === kopf) || {}).p || null;

// ---- Zusatzprüfungen der Korrekturrunde 2 (Titel, Grössen, Modellzeile, Regionen, Status, Material) ----
const ENG_GROESSE = /\b(?:one size|small|medium|large|circle|circular|rectangle|square|heart|star|snowflake|round|bell|tree|scalloped|pet paw|tag|bone shape|fish shape|unscented|pieces|pcs|pages|sheets|magnetic)\b/i;
const ENG_REGION = /\b(?:United States|Europe|Latvia|United Kingdom|Australia|Canada|Spain|Brazil)\b/;
const ENG_MATERIAL = /\b(?:cotton|combed|spun|organic|recycled|carded|pique|resistant|blend|garment|dyed|washed|paper|wire|coton)\b/i;
const MATNAMES = { cotton: 'material_cotton', 'organic cotton': 'material_organic_cotton', polyester: 'material_polyester', 'recycled polyester': 'material_recycled_polyester', elastane: 'material_elastane', spandex: 'material_elastane', viscose: 'material_viscose', rayon: 'material_rayon', nylon: 'material_nylon', wool: 'material_wool', acrylic: 'material_acrylic', linen: 'material_linen', 'recycled cotton': 'material_recycled_cotton', 'combed cotton': 'material_combed_cotton', 'combed ring spun cotton': 'material_combed_ring_spun_cotton', 'combed ring-spun cotton': 'material_combed_ring_spun_cotton', 'ring spun cotton': 'material_ring_spun_cotton', 'ring-spun cotton': 'material_ring_spun_cotton' };
let STATUS_DE; // wird in vorbereiten() gesetzt (braucht die Sprachdatei des gemeinsamen Stands)
const matKey = (n) => normal(n).replace(/\s+/g, ' ').trim().replace(/[\s,;.]+$/, '');
function sollRegionen(v) {
  const reg = v.availability_regions && typeof v.availability_regions === 'object' ? v.availability_regions : {};
  const rde = (x) => own(T.regionen, x) ?? x;
  const st = Array.isArray(v.availability_status) ? v.availability_status : [];
  if (st.length) return st.map((s) => rde(String(reg[s.region] || s.region)) + ': ' + (own(STATUS_DE, s.status) ?? LOCALE_DE.status_unknown));
  return Object.entries(reg).map(([k, nm]) => rde(typeof nm === 'string' ? nm : k));
}
function sollMaterial(v) {
  const parts = (Array.isArray(v.material) ? v.material : []).filter((x) => typeof x.name === 'string' && x.name.trim());
  if (!parts.length) return LOCALE_DE.material_unknown;
  return parts.map((part) => {
    const n = matKey(part.name); const name = MATNAMES[n] ? LOCALE_DE[MATNAMES[n]] : (own(T.material, n) ?? part.name);
    const pc = Number(part.percentage);
    return part.percentage !== null && part.percentage !== undefined && part.percentage !== '' && Number.isFinite(pc) && pc >= 0 && pc <= 100 ? pc + '% ' + name : name;
  }).join(' · ');
}
function pruefeNeu(id, d, n, anzSoll) {
  const p = detail.get(id);
  ok(!IMP.test(d.titel) && !IMP.test(d.kartenTitel), n + ' Titel (Detail, Karte) ohne imperiale Einheit', d.titel + ' | ' + d.kartenTitel);
  ok(d.titel === d.kartenTitel, n + ' Titel in Detail und Karte gleich', d.titel + ' | ' + d.kartenTitel);
  ok(!IMP.test(d.kartenGroessen) && !ENG_GROESSE.test(d.kartenGroessen), n + ' Grössen auf der Karte deutsch, ohne imperiale Einheit', d.kartenGroessen.slice(0, 80));
  ok(d.groessen.every((x) => !IMP.test(x) && !ENG_GROESSE.test(x)), n + ' Grössenknöpfe deutsch, ohne imperiale Einheit', d.groessen.join(' ; '));
  ok(d.meta.every((x) => !IMP.test(x) && !x.includes('|')), n + ' Modellzeile ohne imperiale Einheit und ohne englische Trennstrich-Kette', d.meta.join(' ; '));
  const orig = d.kleinTexte.find((x) => x.startsWith('Originalmodell')); ok(!orig || !IMP.test(orig), n + ' «Originalmodell» ohne imperiale Einheit', orig || '');
  ok(d.farben.every((x) => !IMP.test(x)), n + ' Farbnamen ohne imperiale Einheit', d.farben.join(' ; '));
  const v = (p.variants || []).find((x) => String(x.id) === d.variantId);
  if (v) {
    ok(JSON.stringify(d.regionen) === JSON.stringify(sollRegionen(v)), n + ' Regionen und Status wie berechnet (deutsch, keine Rohschlüssel)', 'ist ' + d.regionen.join(' | ') + ' soll ' + sollRegionen(v).join(' | '));
    ok(!d.regionen.some((x) => ENG_REGION.test(x) || /[a-z]_[a-z]/.test(x)), n + ' Regionen ohne englische Ländernamen und Rohschlüssel', d.regionen.join(' | '));
    ok(d.materialDiese[0] === sollMaterial(v), n + ' Material dieser Variante wie berechnet', 'ist ' + d.materialDiese[0] + ' soll ' + sollMaterial(v));
    ok(!ENG_MATERIAL.test(d.materialDiese[0] || '') && d.materialOptionen.every((x) => !ENG_MATERIAL.test(x)), n + ' Material deutsch', (d.materialDiese[0] || '') + ' | ' + d.materialOptionen.join(' ; '));
  }
  // Kollision (siehe README): die Zeile zählt jetzt die BESTELLBAREN Ausführungen; im Test sind alle Varianten des Modells künstlich bestellbar, also gleich der Variantenzahl
  const zeile = d.kleinTexte.find((x) => /bestellbare Ausführung/.test(x)); const anz = anzSoll ?? (p.variants || []).length;
  ok(!!zeile && !/Originalvariante/.test(d.dialogText), n + ' Zeile «N bestellbare Ausführung(en)» statt «Originalvarianten»', zeile || '');
  if (zeile) ok(zeile === (anz === 1 ? '1 bestellbare Ausführung' : anz + ' bestellbare Ausführungen'), n + ' Einzahl/Mehrzahl der bestellbaren Ausführungen (' + anz + ')', zeile);
  ok(!/translation missing/i.test(d.dialogText), n + ' kein «translation missing» im Fenster');
}

// ---- Prüfung eines Modells im Zustand «Deutsch mit Textdatei» ----
function pruefeDeutsch(id, d, vpName, anzSoll) {
  const n = 'M' + id + ' ' + vpName;
  const s = soll(id, true), en = detail.get(id).description;
  ok(d.beschr !== null && ws(d.beschr) === ws(s.beschreibung), n + ' Beschreibung = deutscher Text', d.beschr === null ? 'keine Beschreibung' : ws(d.beschr).slice(0, 80));
  ok(d.beschr !== null && ws(d.beschr) !== ws(en), n + ' Beschreibung ist nicht mehr das Original');
  ok(!IMP.test(d.beschr || ''), n + ' Beschreibung ohne imperiale Einheit', (IMP.exec(d.beschr || '') || [''])[0]);
  ok(((d.beschr || '').match(ENGL) || []).length <= 1, n + ' Beschreibung ohne englische Wörter', ((d.beschr || '').match(ENGL) || []).join(','));
  ok(d.notiz === NOTE_DE, n + ' Hinweis «übersetzt»', d.notiz.slice(0, 60));
  const pos = faktenText(d, 'Positionen laut Modellangaben'), tec = faktenText(d, 'Techniken laut Modellangaben');
  ok(pos === (s.positionen.length ? s.positionen.join(' · ') : 'Nicht angegeben'), n + ' Positionen deutsch', 'ist: ' + pos + ' | soll: ' + s.positionen.join(' · '));
  ok(tec === (s.techniken.length ? s.techniken.join(' · ') : 'Nicht angegeben'), n + ' Techniken deutsch', 'ist: ' + tec + ' | soll: ' + s.techniken.join(' · '));
  ok(!IMP.test(pos || '') && !IMP.test(tec || ''), n + ' Positionen/Techniken ohne imperiale Einheit');
  const optIst = d.optionen.map((o) => o[0] + '=>' + o[1]);
  const optSoll = s.optionen.map((o) => o[0] + '=>' + (o[1] === null ? 'Vom Hersteller vorgesehene Textangabe' : o[1]));
  // Freitext-Optionen zeigen ein Label aus dem Locale: nur Titel vergleichen
  const gleich = optIst.length === optSoll.length && optIst.every((x, i) => { const a = x.split('=>'), b = optSoll[i].split('=>'); return a[0] === b[0] && (s.optionen[i][1] === null || a[1] === b[1]); });
  ok(gleich, n + ' Optionen deutsch', optIst.slice(0, 2).join(' || ') + ' ... soll ' + optSoll.slice(0, 2).join(' || '));
  ok(!IMP.test(optIst.join(' ')), n + ' Optionen ohne imperiale Einheit', (IMP.exec(optIst.join(' ')) || [''])[0]);
  ok(d.scrollD <= 1 && d.ueber === 0 && d.seiteScroll <= 1, n + ' kein seitliches Scrollen', 'dialog ' + d.scrollD + ' ueber ' + d.ueber + ' seite ' + d.seiteScroll);
  pruefeNeu(id, d, n, anzSoll);
}
const TESTMODELLE = [
  [294, 'Hoodie Bella+Canvas 3719'], [692, 'Zip Hoodie Gildan 18600'], [19, 'Tasse'], [1, 'Poster'], [99, 'Mütze Snapback bestickbar'], [458, 'Allover Beanie'],
  [919, 'Allover Sport-Hoodie'], [181, 'iPhone-Hülle'], [883, 'Handtuch'], [574, 'Schuhe'], [307, 'Kindermodell Youth Tee'], [234, 'Baby-Body'],
  [749, 'Hundehalsband (Ausnahme Halsband)'], [668, 'Bikini-Oberteil (Ausnahme Druck Oberteil)'], [669, 'Bikini-Unterteil (Ausnahme Druck Unterteil)'], [909, 'Tumbler 20 oz'],
  [1564, 'Fotobuch (Seiten)'], [1656, 'Kalender (Monate)'], [389, 'Rucksack mit Laptop-Zoll'], [645, 'Kerze'],
  [81, 'Beanie mit supplier_out_of_stock'], [751, 'Tumbler 16 oz ohne Mengenangabe'], [678, 'Tiernapf oz'], [745, 'Leine ft'], [1013, 'Notizbuch Farbe als Mass'], [886, 'Duvet King/Queen'], [1677, 'Beanie 12 Zoll im Titel'], [653, 'Pint-Glas mit titleDe'], [861, 'Kerze mit titleDe'], [906, 'Aufkleber mit pcs'],
];

async function pruefeFrische(browser) {
  // Lesekopien gegen Live: JS, Index und zwei Schalen
  const ctx = await browser.newContext({ userAgent: UA }); const page = await ctx.newPage();
  const crypto = require('crypto'); const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
  await page.goto(SEITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const cfg = await page.evaluate(() => JSON.parse(document.querySelector('[data-lcl-config]').textContent));
  const jsUrl = await page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => /luxe-clothing\.js/.test(s)));
  const get = async (u) => page.evaluate(async (x) => (await fetch(x)).text(), u);
  const liveJs = await get(jsUrl);
  // Das CDN liefert die Datei minifiziert: Byte-Vergleich geht nicht, darum die Menge aller Zeichenketten-Literale (>= 4 Zeichen) vergleichen
  const lits = (s) => new Set([...s.matchAll(/["']([A-Za-z][A-Za-z0-9_-]{3,})["']/g)].map((m) => m[1]));
  const la = lits(liveJs), lb = lits(origJs);
  const nurLive = [...la].filter((x) => !lb.has(x)), nurOrig = [...lb].filter((x) => !la.has(x));
  console.log('  Frische JS: einfache Literale live', la.size, 'orig', lb.size, '| nur live', nurLive.length, nurLive.slice(0, 5), '| nur orig', nurOrig.length, nurOrig.slice(0, 5));
  const echtFehlt = nurOrig.filter((x) => !new RegExp('\\b' + x + '\\b').test(liveJs)); // der Minifier entfernt die Anführungszeichen um Objektschlüssel
  ok(nurLive.length === 0 && echtFehlt.length === 0, 'Frische: Live-JS entspricht der Lesekopie (Literalmengen, CDN minifiziert)', 'nur live ' + nurLive.slice(0, 5).join(' ; ') + ' | nur orig ' + nurOrig.slice(0, 5).join(' ; '));
  for (const k of ['s010', 's046']) {
    const live = await get(cfg.assets.details[k]);
    ok(md5(live) === md5(fs.readFileSync(TH + 'assets__luxe-clothing-details-' + k + '.json', 'utf8')), 'Frische: Schale ' + k + ' gleich Lesekopie');
  }
  const liveIdx = await get(cfg.assets.index);
  ok(md5(liveIdx) === md5(fs.readFileSync(TH + 'assets__luxe-clothing-index.json', 'utf8')), 'Frische: Index gleich Lesekopie');
  console.log('  Locale der Seite im Live-HTML:', cfg.locale);
  await ctx.close();
}

async function laufeSchnell(browser) {
  for (const vp of [{ name: '1280', w: 1280, h: 900 }, { name: '390', w: 390, h: 844 }]) {
    console.log('== Deutsch mit Textdatei,', vp.name, 'px');
    const { ctx, page, logs, zaehler } = await neuerKontext(browser, { width: vp.w, height: vp.h }, {});
    await laden(page);
    ok(zaehler.texte === 0, vp.name + ' Textdatei wird beim Seitenaufbau NICHT geladen', 'Anfragen: ' + zaehler.texte);
    { const opts = await page.evaluate(() => [...document.querySelectorAll('[data-lcl-size-filter] option')].map((o) => o.textContent.trim()));
      ok(opts.length > 10 && opts.every((x) => !IMP.test(x) && !ENG_GROESSE.test(x)), vp.name + ' Grössenfilter ohne imperiale Einheit und ohne englische Grössenwörter (' + opts.length + ' Einträge)', opts.filter((x) => IMP.test(x) || ENG_GROESSE.test(x)).join(' ; ')); }
    for (const [id, name] of TESTMODELLE) {
      await oeffne(page, id); const d = await lies(page);
      pruefeDeutsch(id, d, vp.name);
      if (d.ueberEingefasst) overflowEingefasst.push(vp.name + ' M' + id + ': ' + d.ueberEingefasst);
      if (id === 294 && vp.name === '1280') { console.log('  Beispiel 294 Position:', faktenText(d, 'Positionen laut Modellangaben')); console.log('  Beispiel 294 Optionen:', d.optionen.slice(0, 2).map((o) => o.join(': ').slice(0, 110))); }
      if (id === 294 && vp.name === '1280') ok(zaehler.texte === 1, 'Textdatei nach dem ersten Öffnen genau 1x geladen', 'Anfragen: ' + zaehler.texte);
      await schliesse(page);
    }
    ok(zaehler.texte === 1, vp.name + ' Textdatei nur einmal geladen (im Speicher gehalten)', 'Anfragen: ' + zaehler.texte);
    const echteFehler = logs.fehler;
    ok(echteFehler.length === 0, vp.name + ' keine Seitenfehler', echteFehler.join(' | '));
    ok(logs.konsole.length === 0, vp.name + ' keine Konsolenfehler des Katalogfensters', logs.konsole.join(' | '));
    console.log('  Fremdmeldungen (Drittanbieter/Shop-Seite, nicht das Katalogfenster):', logs.fremd.length, [...new Set(logs.fremd.map((x) => x.slice(0, 70)))].slice(0, 4));
    await ctx.close(); await new Promise((r) => setTimeout(r, 5000));
  }
}

async function laufeVoll(browser) {
  console.log('== Vollscan aller Modelle, 1280 px, Deutsch');
  const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, {});
  await laden(page);
  let n = 0; const nichtGeoeffnet = [];
  for (const id of modelle.keys()) {
    try { await oeffne(page, id); } catch (e) { nichtGeoeffnet.push(id + ' ' + e.message.slice(0, 60)); await page.keyboard.press('Escape'); continue; }
    const d = await lies(page); n++;
    const mit = !!detail.get(id).description;
    if (mit) pruefeDeutsch(id, d, 'voll'); else { ok(d.beschr === null, 'M' + id + ' ohne Beschreibung bleibt ohne'); pruefeNeu(id, d, 'M' + id + ' voll'); }
    await schliesse(page);
    if (n % 100 === 0) console.log('  ', n, 'Modelle geprüft, Fehler bisher', fail);
  }
  ok(nichtGeoeffnet.length === 0, 'Vollscan: alle Modelle öffnen sich', nichtGeoeffnet.slice(0, 5).join(' ; '));
  ok(logs.fehler.length === 0, 'Vollscan: keine Seitenfehler', logs.fehler.slice(0, 3).join(' | '));
  console.log('  geöffnet und geprüft:', n, 'von', modelle.size);
  await ctx.close();
}

// Basislinie: so zeigt das Fenster die Modelle HEUTE (Original-JS, ohne Textdatei) - Vergleichswert für alle Rückfall-Szenarien
async function basislinie(browser, ids, opt) {
  const { ctx, page } = await neuerKontext(browser, { width: 1280, height: 900 }, { js: 'a', locale: opt.locale, bestellbar: ids });
  await laden(page, opt.url);
  const m = {};
  for (const id of ids) {
    await oeffne(page, id); const d = await lies(page);
    m[id] = { beschr: ws(d.beschr), notiz: d.notiz, pos: faktenText(d, d.facts[1]?.h || ''), tec: faktenText(d, d.facts[0]?.h || ''), opt: d.optionen.map((o) => o.join('=>')).join(' || ') };
    await schliesse(page);
  }
  await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  return m;
}
const liesFakten = (d) => ({ pos: d.facts[1]?.p ?? null, tec: d.facts[0]?.p ?? null, opt: d.optionen.map((o) => o.join('=>')).join(' || ') });

async function laufeSzenarien(browser) {
  const IDS = [294, 19, 749, 1];
  console.log('== Basislinie (Original-JS) auf der deutschen Seite');
  const basis = await basislinie(browser, IDS, {});
  ok(IDS.every((id) => basis[id].beschr && /[A-Za-z]/.test(basis[id].beschr)), 'Basislinie: alle Modelle zeigen heute eine (englische) Beschreibung');
  ok(basis[294].notiz === NOTE_ALT, 'Basislinie: Hinweis heute «Originalangaben»', basis[294].notiz.slice(0, 40));

  const pruefeRueckfall = async (name, opt) => {
    console.log('== Rückfall:', name);
    const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, opt);
    await laden(page);
    for (const id of IDS) {
      await oeffne(page, id); const d = await lies(page); const f = liesFakten(d);
      ok(ws(d.beschr) === basis[id].beschr && ws(d.beschr) !== '', name + ' M' + id + ' Beschreibung = heutiger Originaltext (nicht leer)', ws(d.beschr).slice(0, 50));
      ok(d.notiz === NOTE_ALT, name + ' M' + id + ' Hinweis bleibt «Originalangaben»', d.notiz.slice(0, 50));
      ok(f.pos === basis[id].pos && f.tec === basis[id].tec && f.opt === basis[id].opt, name + ' M' + id + ' Positionen/Techniken/Optionen wie heute (Original)');
      ok(d.scrollD <= 1 && d.ueber === 0, name + ' M' + id + ' kein seitliches Scrollen');
      await schliesse(page);
    }
    const konsole = logs.konsole.filter((x) => !/Failed to load resource|ERR_FAILED|texts-de/i.test(x));
    ok(logs.fehler.length === 0, name + ' keine Seitenfehler', logs.fehler.join(' | '));
    ok(konsole.length === 0, name + ' keine Konsolenfehler ausser der erwarteten Netzmeldung', konsole.join(' | '));
    console.log('  Konsole (erwartete Netzmeldung der gesperrten Datei):', logs.konsole.length);
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  };
  await pruefeRueckfall('Datei gesperrt (abort)', { texte: 'abbruch' });
  await pruefeRueckfall('Datei 404', { texte: '404' });
  await pruefeRueckfall('Datei ungültiges JSON', { texte: 'ungueltig' });
  await pruefeRueckfall('Datei falsches Schema', { texte: 'schema2' });
  // Eintrag fehlt nur für 294: Beschreibung Englisch mit altem Hinweis, Rest deutsch
  {
    console.log('== Eintrag für 294 fehlt');
    const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, { texte: 'ohne294' });
    await laden(page);
    await oeffne(page, 294); let d = await lies(page);
    ok(ws(d.beschr) === basis[294].beschr, 'ohne294: M294 Beschreibung Englisch (Original)');
    ok(d.notiz === NOTE_ALT, 'ohne294: M294 Hinweis «Originalangaben»', d.notiz.slice(0, 50));
    ok(faktenText(d, 'Positionen laut Modellangaben') === soll(294, true).positionen.join(' · '), 'ohne294: M294 Positionen trotzdem deutsch');
    await schliesse(page);
    await oeffne(page, 692); d = await lies(page);
    ok(ws(d.beschr) === ws(soll(692, true).beschreibung) && d.notiz === NOTE_DE, 'ohne294: M692 weiter deutsch mit Hinweis «übersetzt»');
    await schliesse(page);
    ok(logs.fehler.length === 0, 'ohne294: keine Seitenfehler', logs.fehler.join(' | '));
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Langsame Textdatei: Fenster zeigt zuerst «wird geladen», dann den deutschen Text
  {
    console.log('== Langsame Textdatei (1,5 s, unter der Wartegrenze von 2,5 s)');
    const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, { texte: 'verzoegert' });
    await laden(page);
    await page.fill('[data-lcl-search]', modelle.get(294).titel); await page.waitForTimeout(320);
    await page.locator('.lcl-card[data-product-id="294"] .lcl-card-cta').first().click();
    await page.waitForTimeout(600);
    const waehrend = await page.evaluate(() => document.querySelector('[data-lcl-detail]').textContent.trim().slice(0, 60));
    ok(!/A soft and comfy/.test(waehrend) && waehrend.length > 0, 'langsam: während des Ladens steht der Ladehinweis, nicht Englisch', waehrend);
    await page.waitForFunction(() => document.querySelector('[data-lcl-dialog]').querySelector('.lcl-model-info'), null, { timeout: 30000 });
    const d = await lies(page);
    ok(ws(d.beschr) === ws(soll(294, true).beschreibung), 'langsam: danach deutscher Text');
    ok(logs.fehler.length === 0, 'langsam: keine Seitenfehler');
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Textdatei hängt: Details erscheinen nach höchstens ~2,5 s (Originaltext), die Datei lädt weiter und gilt beim nächsten Öffnen
  {
    console.log('== Textdatei hängt (11 s)');
    const { ctx, page, logs, zaehler } = await neuerKontext(browser, { width: 1280, height: 900 }, { texte: 'haengt' });
    await laden(page);
    await page.fill('[data-lcl-search]', modelle.get(294).titel); await page.waitForTimeout(320);
    await page.locator('.lcl-card[data-product-id="294"] .lcl-card-cta').first().click();
    const t0 = Date.now();
    await page.waitForFunction(() => document.querySelector('[data-lcl-dialog]').querySelector('.lcl-model-info'), null, { timeout: 20000 });
    const dauer = Date.now() - t0;
    ok(dauer < 4500, 'hängt: Details nach höchstens 4,5 s sichtbar (Grenze 2,5 s)', dauer + ' ms');
    let d = await lies(page);
    ok(ws(d.beschr) === basis[294].beschr && d.notiz === NOTE_ALT, 'hängt: Originaltext mit altem Hinweis');
    ok(logs.fehler.length === 0, 'hängt: keine Seitenfehler');
    await schliesse(page);
    await page.waitForTimeout(10500);
    await oeffne(page, 294); d = await lies(page);
    ok(ws(d.beschr) === ws(soll(294, true).beschreibung) && d.notiz === NOTE_DE, 'hängt: nach Ankunft der Datei beim nächsten Öffnen deutsch');
    ok(zaehler.texte === 1, 'hängt: nur eine Anfrage', 'Anfragen: ' + zaehler.texte);
    await schliesse(page);
    await ctx.close().catch(() => {}); await new Promise((r) => setTimeout(r, 4000));
  }
  // Fehler der Textdatei: innerhalb von 60 s keine Wiederholung bei jedem Öffnen
  {
    console.log('== Textdatei 404: keine Wiederholung innerhalb von 60 s');
    const { ctx, page, logs, zaehler } = await neuerKontext(browser, { width: 1280, height: 900 }, { texte: '404' });
    await laden(page);
    for (const id of [294, 19, 1, 294]) { await oeffne(page, id); await lies(page); await schliesse(page); }
    ok(zaehler.texte === 1, '404: genau eine Anfrage bei vier Öffnungen', 'Anfragen: ' + zaehler.texte);
    ok(logs.fehler.length === 0, '404: keine Seitenfehler');
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Etiketten der Section/Locale fehlen oder liefern «translation missing»
  for (const [name, opt] of [['Etiketten fehlen', { etikettFehlt: true }], ['Etiketten «translation missing»', { etikettMissing: true }]]) {
    console.log('==', name);
    const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, opt);
    await laden(page);
    await oeffne(page, 294); let d = await lies(page);
    ok(ws(d.beschr) === ws(soll(294, true).beschreibung), name + ': Beschreibung trotzdem deutsch');
    ok(d.notiz === NOTE_ALT, name + ': Hinweis fällt auf «Originalangaben» zurück, nie «translation missing»', d.notiz.slice(0, 70));
    ok(!/translation missing/i.test(d.dialogText), name + ': kein «translation missing» im Fenster (294)');
    await schliesse(page);
    await oeffne(page, 81); d = await lies(page);
    ok(!/translation missing|supplier_out_of_stock|stocked_on_demand/i.test(d.dialogText), name + ': kein Rohschlüssel und kein «translation missing» (81)');
    ok(d.regionen.some((x) => /Vereinigtes Königreich: Status unbekannt/.test(x)), name + ': unbekannter Status heisst «Status unbekannt»', d.regionen.join(' | '));
    await schliesse(page);
    await oeffne(page, 653); d = await lies(page);
    ok(!/translation missing/i.test(d.dialogText), name + ': kein «translation missing» bei einer Variante (653)');
    ok(logs.fehler.length === 0, name + ': keine Seitenfehler');
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Herstellertext hat sich seit der Übersetzung geändert (Quellenhash): Originaltext statt veralteter Übersetzung
  {
    console.log('== Herstellertext geändert (Quellenhash)');
    const { ctx, page, logs } = await neuerKontext(browser, { width: 1280, height: 900 }, { beschrAendern: true });
    await laden(page);
    await oeffne(page, 294); let d = await lies(page);
    ok(/\(geändert\)/.test(d.beschr || '') && d.notiz === NOTE_ALT, 'Quellenhash: geänderter Herstellertext von 294 wird im Original gezeigt, nicht die alte Übersetzung', ws(d.beschr).slice(-40));
    await schliesse(page);
    await oeffne(page, 692); d = await lies(page);
    ok(ws(d.beschr) === ws(soll(692, true).beschreibung) && d.notiz === NOTE_DE, 'Quellenhash: unveränderte Modelle bleiben deutsch (692)');
    await schliesse(page);
    ok(logs.fehler.length === 0, 'Quellenhash: keine Seitenfehler');
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Andere Sprache: Textdatei wird nie angefragt, Anzeige wie heute.
  // /fr = echte französische Seite. /en: die Sammlung hat im englischen Shop keine Adresse (HTTP 404, gemessen), darum wird die Seitensprache «en» in der deutschen Seite nachgestellt.
  for (const sprache of ['fr', 'en-simuliert']) {
    console.log('== Sprache', sprache);
    const echt = sprache === 'fr';
    const url = echt ? 'https://luxestyle.ch/fr/collections/selbst-gestalten-1?view=luxe-gestalten' : SEITE;
    const base = echt ? await basislinie(browser, [294, 19], { url, locale: 'fr' }) : null;
    const { ctx, page, logs, zaehler } = await neuerKontext(browser, { width: 1280, height: 900 }, { locale: echt ? 'fr' : 'de-CH', sprache: echt ? undefined : 'en' });
    try { await laden(page, url); } catch (e) { ok(false, sprache + ' Seite lädt', e.message.slice(0, 100)); await ctx.close(); continue; }
    ok(zaehler.locale === (echt ? 'fr' : 'en'), sprache + ' Seitensprache im Config', String(zaehler.locale));
    for (const id of [294, 19]) {
      await oeffne(page, id); const d = await lies(page); const f = liesFakten(d);
      const ref = echt ? base[id] : basis[id];
      ok(ws(d.beschr) === ref.beschr, sprache + ' M' + id + ' Beschreibung bleibt Original (Englisch)');
      ok(d.notiz !== NOTE_DE, sprache + ' M' + id + ' kein deutscher Hinweis «übersetzt»', d.notiz.slice(0, 50));
      if (echt) ok(f.pos === ref.pos && f.opt === ref.opt, sprache + ' M' + id + ' Positionen/Optionen wie heute');
      else ok(f.opt === ref.opt && !/Garnfarben/.test(f.opt), sprache + ' M' + id + ' Optionen bleiben Englisch (wie heute)');
      await schliesse(page);
    }
    ok(zaehler.texte === 0, sprache + ' Textdatei wird nie angefragt', 'Anfragen: ' + zaehler.texte);
    ok(logs.fehler.length === 0, sprache + ' keine Seitenfehler', logs.fehler.join(' | '));
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }
  // Vorher-Zustand (Original-JS) zum Vergleich: zeigt, dass die Prüfung wirklich Englisch erkennt, und Layout alt gegen neu
  {
    console.log('== Vorher (Original-JS) Hoodie 294 und Layout-Vergleich');
    const { ctx, page } = await neuerKontext(browser, { width: 1280, height: 900 }, { js: 'alt', konfig: false });
    await laden(page); await oeffne(page, 294); const d = await lies(page);
    console.log('  VORHER Beschreibung:', ws(d.beschr).slice(0, 110));
    console.log('  VORHER Positionen:', faktenText(d, 'Positionen laut Modellangaben'));
    ok(/oz\/yd/.test(d.beschr) && (d.beschr.match(ENGL) || []).length > 3, 'Vorher: Original-JS zeigt englische Beschreibung mit oz/yd² (Prüfung erkennt Englisch)');
    const s = soll(294, true);
    ok(faktenText(d, 'Positionen laut Modellangaben') !== s.positionen.join(' · '), 'Vorher: Positionen waren englisch');
    await schliesse(page);
    const messung = {};
    for (const bez of ['alt', 'neu']) {
      const k = bez === 'alt' ? { ctx, page } : await neuerKontext(browser, { width: 390, height: 844 }, { js: 'neu' });
      if (bez === 'alt') await page.setViewportSize({ width: 390, height: 844 }); else await laden(k.page);
      messung[bez] = [];
      for (const id of [1, 181, 99]) {
        await oeffne(k.page, id); const m = await lies(k.page);
        messung[bez].push({ id, scrollD: m.scrollD, ueber: m.ueber, eingefasst: m.ueberEingefasst, seite: m.seiteScroll });
        await schliesse(k.page);
      }
      if (bez === 'neu') await k.ctx.close();
    }
    console.log('  Layout alt:', JSON.stringify(messung.alt)); console.log('  Layout neu:', JSON.stringify(messung.neu));
    ok(messung.alt.every((x, i) => x.scrollD <= 1 && x.ueber === 0 && messung.neu[i].scrollD <= 1 && messung.neu[i].ueber === 0 && x.eingefasst === messung.neu[i].eingefasst), 'Layout wie vorher: gleiche Zahl eingefasster Elemente, kein Überlauf mit Original-JS und Patch');
    await ctx.close();
  }
}


// ============================ KOMBI-FALL ============================
// Echte Verfügbarkeit: die Angebote des Live-Dokuments (heute 17 Shopprodukte, 22 Modelle), die echte Ausblenden-Datei, KEINE künstlichen Angebote.
// Deutsche Seite, Detailansicht aller sichtbaren Modelle (mit SCHNELL=1 die ersten 8): Beschreibung/Positionen/Techniken/Optionen deutsch UND nur bestellbare Farben/Grössen UND Einzahl/Mehrzahl richtig.
// Dazu: /fr und «en» (Seitensprache simuliert) unverändert gegenüber (A) allein; Textdatei gesperrt/404: (A) funktioniert weiter.
async function erwartungEcht() {
  const html = await holeDoc(SEITE), cfg = JSON.parse(html.match(konfigRegex)[2]);
  const ausb = JSON.parse(ST.kombi[ST.K.NEUE_DATEIEN.AUSBLENDEN]);
  const hideM = new Set(ausb.modelle.map(String)), hideV = new Set(Object.values(ausb.varianten).flat().map(String));
  const proVar = {}; for (const o of cfg.shopVariantOffers) (proVar[o.printfulVariantId] = proVar[o.printfulVariantId] || []).push(o);
  const modelle = {};
  for (const [pid, zeilen] of Object.entries(ST.karte.modelle)) {
    if (hideM.has(pid)) continue;
    for (const [vid, farbe, groesse] of zeilen) {
      const os = proVar[String(vid)];
      if (!os || hideV.has(String(vid)) || !os.some((o) => o.available !== false)) continue;
      const m = (modelle[pid] = modelle[pid] || { vids: new Set(), farben: new Set(), groessen: new Set(), proFarbe: {} });
      m.vids.add(String(vid)); if (farbe) m.farben.add(farbe); if (groesse) m.groessen.add(groesse);
      (m.proFarbe[farbe || ''] = m.proFarbe[farbe || ''] || new Set()).add(String(vid));
    }
  }
  return modelle;
}
const liesAuswahl = (page) => page.evaluate(() => {
  const dlg = document.querySelector('[data-lcl-dialog]'), q = (s) => [...dlg.querySelectorAll(s)];
  return { farben: q('.lcl-color-choice').map((b) => b.dataset.colorKey.split('|')[0]), groessenIds: q('.lcl-size').map((b) => b.dataset.variantId), daumenIds: q('.lcl-detail-thumbnail').map((b) => b.dataset.variantId).filter(Boolean),
    anzahl: (dlg.querySelector('[data-lcl-original-variants]')?.textContent || '').trim(), anzahlAttr: dlg.querySelector('[data-lcl-original-variants]')?.dataset.lclOriginalVariants || '',
    knopf: q('[data-lcl-design-cta]').length, knopfHref: dlg.querySelector('[data-lcl-design-cta]')?.getAttribute('href') || '' };
});
const einzahlText = (n) => (n === 1 ? '1 bestellbare Ausführung' : n + ' bestellbare Ausführungen');
const normStatus = (s) => String(s).replace(/supplier_out_of_stock|stocked_on_demand|currently unavailable from the supplier|ordered from the supplier when needed|beim Lieferanten derzeit nicht verfügbar|wird bei Bedarf beim Lieferanten bestellt/g, '<STATUS>');
const kernFelder = (d) => ({ titel: d.titel, kartenTitel: d.kartenTitel, beschr: d.beschr === null ? null : ws(d.beschr), notiz: d.notiz, facts: d.facts.map((f) => [f.h, normStatus(f.p)]), optionen: d.optionen, meta: d.meta, kleinTexte: d.kleinTexte, groessen: d.groessen, farben: d.farben, regionen: d.regionen.map(normStatus), materialOptionen: d.materialOptionen });

async function laufeKombi(browser) {
  const E = await erwartungEcht(), sichtbar = Object.keys(E).sort((a, b) => Number(a) - Number(b));
  ok(sichtbar.length >= 6, 'Kombi: mindestens 6 sichtbare Modelle im Live-Dokument (gerechnet ' + sichtbar.length + ')');
  console.log('== Kombi-Fall: sichtbare Modelle', sichtbar.length, '(bestellbare Ausführungen', sichtbar.reduce((s, p) => s + E[p].vids.size, 0) + ')');
  const SCHNELL = process.env.SCHNELL === '1';
  const geprueft = SCHNELL ? sichtbar.slice(0, 8) : sichtbar;
  const einzel = sichtbar.find((p) => E[p].vids.size === 1), mehr = sichtbar.find((p) => E[p].vids.size >= 2);
  ok(!!einzel && !!mehr, 'Kombi: Testvoraussetzung: ein Modell mit genau einer und eins mit mehreren bestellbaren Ausführungen (' + einzel + ', ' + mehr + ')');
  if (einzel && !geprueft.includes(einzel)) geprueft.push(einzel);

  // ---- Deutsche Seite mit Textdatei ----
  for (const vp of [{ name: '1280', w: 1280, h: 900 }, { name: '390', w: 390, h: 844 }]) {
    const ids = vp.name === '1280' ? geprueft : geprueft.slice(0, 6);
    console.log('== Kombi, deutsch mit Textdatei,', vp.name, 'px,', ids.length, 'Modelle');
    const { ctx, page, logs } = await neuerKontext(browser, { width: vp.w, height: vp.h }, { bestellbar: [], ausblendenEcht: true });
    await laden(page);
    const kopf = await page.evaluate(() => ({ n: document.querySelector('[data-luxe-clothing]').dataset.filteredCount, karten: document.querySelectorAll('.lcl-card').length }));
    ok(kopf.n === String(sichtbar.length), vp.name + ' Kombi: Treffer = Zahl der bestellbaren Modelle (' + kopf.n + ' / ' + sichtbar.length + ')');
    for (const pid of ids) {
      const id = Number(pid), m = E[pid];
      await oeffne(page, id); const d = await lies(page); const a = await liesAuswahl(page);
      const n = 'K' + id + ' ' + vp.name;
      if (detail.get(id).description) pruefeDeutsch(id, d, 'Kombi ' + vp.name, m.vids.size);
      else { ok(d.beschr === null, n + ' ohne Beschreibung bleibt ohne'); pruefeNeu(id, d, n, m.vids.size); }
      // nur bestellbare Farben und Grössen
      ok(JSON.stringify([...a.farben].sort()) === JSON.stringify([...m.farben].sort()), n + ' Details zeigen genau die bestellbaren Farben', a.farben.join(',') + ' | ' + [...m.farben].join(','));
      ok(a.daumenIds.every((v) => m.vids.has(v)), n + ' Vorschaubilder nur von bestellbaren Ausführungen');
      ok(a.knopf === 1 && /\/products\/[^?#]+\?variant=\d+#lspod-start$/.test(a.knopfHref), n + ' genau ein Knopf «Jetzt selbst gestalten» mit Editor-Ziel', a.knopfHref);
      ok(a.anzahl === einzahlText(m.vids.size) && a.anzahlAttr === String(m.vids.size), n + ' Zeile «' + einzahlText(m.vids.size) + '» (Einzahl/Mehrzahl, nur bestellbare)', a.anzahl);
      const farbenListe = a.farben.length ? a.farben.slice(0, 3) : [''];
      for (let i = 0; i < farbenListe.length; i++) {
        if (a.farben.length) { await page.evaluate((idx) => document.querySelectorAll('[data-lcl-dialog] .lcl-color-choice')[idx].click(), i); await page.waitForTimeout(120); }
        const a2 = await liesAuswahl(page);
        ok(JSON.stringify([...a2.groessenIds].sort()) === JSON.stringify([...(m.proFarbe[farbenListe[i]] || [])].sort()), n + ' Grössen der Farbe «' + farbenListe[i] + '» sind genau die bestellbaren', a2.groessenIds.join(',') + ' | ' + [...(m.proFarbe[farbenListe[i]] || [])].join(','));
        if (a.farben.length) { const d2 = await lies(page); ok(d2.farben.every((x) => !IMP.test(x) && !ENG_GROESSE.test(x)) && d2.groessen.every((x) => !IMP.test(x) && !ENG_GROESSE.test(x)), n + ' Farb- und Grössennamen deutsch, ohne imperiale Einheit', d2.farben.concat(d2.groessen).filter((x) => IMP.test(x) || ENG_GROESSE.test(x)).join(' ; ')); }
      }
      await schliesse(page);
    }
    ok(logs.fehler.length === 0, vp.name + ' Kombi: keine Seitenfehler', logs.fehler.join(' | '));
    ok(logs.konsole.length === 0, vp.name + ' Kombi: keine Konsolenfehler des Katalogfensters', logs.konsole.join(' | '));
    await ctx.close(); await new Promise((r) => setTimeout(r, 4000));
  }

  // ---- Vergleichsstand (A) allein, deutsche Seite, für die Rückfälle ----
  const IDV = [einzel, mehr, ...sichtbar.filter((p) => p !== einzel && p !== mehr).slice(0, 2)].filter(Boolean).slice(0, 4).map(Number);
  const lieseFuer = async (opt, url, ids) => {
    const { ctx, page, logs, zaehler } = await neuerKontext(browser, { width: 1280, height: 900 }, { bestellbar: [], ausblendenEcht: true, ...opt });
    await laden(page, url);
    const kopf = await page.evaluate(() => ({ n: document.querySelector('[data-luxe-clothing]').dataset.filteredCount, designKnoepfe: document.querySelectorAll('.lcl-card .lcl-card-design').length, karten: document.querySelectorAll('.lcl-card').length, hinweis: (document.querySelector('.lcl-notice') || {}).textContent }));
    const m = {};
    for (const id of ids) { await oeffne(page, id); m[id] = { d: await lies(page), a: await liesAuswahl(page) }; await schliesse(page); }
    await ctx.close(); await new Promise((r) => setTimeout(r, 3000));
    return { kopf, m, logs, zaehler };
  };
  const ohneKarte = (x) => x; void ohneKarte;

  // ---- /fr (echte französische Seite) und «en» (Seitensprache simuliert): unverändert gegenüber (A) allein ----
  for (const sprache of ['fr', 'en-simuliert']) {
    const echt = sprache === 'fr', url = echt ? SEITE_FR : SEITE;
    console.log('== Kombi, Sprache', sprache, ': gemeinsamer Stand gegen (A) allein');
    const optK = { locale: echt ? 'fr' : 'de-CH', sprache: echt ? undefined : 'en' };
    const A = await lieseFuer({ ...optK, js: 'a' }, url, IDV), K = await lieseFuer({ ...optK }, url, IDV);
    ok(K.zaehler.texte === 0, sprache + ' Kombi: Textdatei wird nie angefragt', 'Anfragen: ' + K.zaehler.texte);
    ok(K.zaehler.locale === (echt ? 'fr' : 'en') && A.zaehler.locale === K.zaehler.locale, sprache + ' Kombi: Seitensprache im Config', String(K.zaehler.locale));
    gleichKern(K.kopf, A.kopf, sprache + ' Kombi: Kopf (Treffer, Karten, Knöpfe, Hinweis) wie (A) allein');
    for (const id of IDV) {
      const k = K.m[id], a = A.m[id];
      gleichKern(kernFelder(k.d), kernFelder(a.d), sprache + ' Kombi M' + id + ': Details unverändert gegenüber (A) allein (Beschreibung bleibt Original, Hinweis bleibt «Originalangaben»)');
      gleichKern(k.a, a.a, sprache + ' Kombi M' + id + ': bestellbare Farben, Grössen, Zeile und Knopf wie (A) allein');
      ok(ws(k.d.beschr || '') === ws(detail.get(id).description ? kernFelder(a.d).beschr || '' : ''), sprache + ' Kombi M' + id + ': Beschreibung = Herstellertext (Original)');
      ok(k.d.notiz !== NOTE_DE, sprache + ' Kombi M' + id + ': kein deutscher Hinweis «übersetzt»');
    }
    ok(K.logs.fehler.length === 0, sprache + ' Kombi: keine Seitenfehler', K.logs.fehler.join(' | '));
  }

  // ---- Textdatei gesperrt (abort) oder 404: (A) funktioniert weiter ----
  console.log('== Kombi, Textdatei gesperrt/404 (deutsche Seite): (A) funktioniert weiter');
  const AD = await lieseFuer({ js: 'a' }, SEITE, IDV);
  for (const modus of ['abbruch', '404']) {
    const X = await lieseFuer({ texte: modus }, SEITE, IDV);
    const n = 'Textdatei ' + modus;
    gleichKern(X.kopf.n, String(sichtbar.length), n + ': alle ' + sichtbar.length + ' bestellbaren Modelle erscheinen');
    ok(X.kopf.designKnoepfe === X.kopf.karten && X.kopf.karten > 0, n + ': jede Karte trägt den Knopf «Jetzt selbst gestalten» (' + X.kopf.designKnoepfe + '/' + X.kopf.karten + ')');
    for (const id of IDV) {
      const x = X.m[id], m = E[String(id)];
      ok(x.d.notiz === NOTE_ALT && x.d.beschr !== null && ws(x.d.beschr) === ws(AD.m[id].d.beschr), n + ' M' + id + ': Beschreibung = Originaltext wie bei (A) allein, Hinweis «Originalangaben»', x.d.notiz.slice(0, 40));
      gleichKern(x.d.facts.map((f) => [f.h, f.p]).filter(([h]) => /Positionen|Techniken/.test(h)), AD.m[id].d.facts.map((f) => [f.h, f.p]).filter(([h]) => /Positionen|Techniken/.test(h)), n + ' M' + id + ': Positionen/Techniken wie bei (A) allein (Original)');
      ok(JSON.stringify([...x.a.farben].sort()) === JSON.stringify([...m.farben].sort()) && x.a.anzahl === einzahlText(m.vids.size) && x.a.knopf === 1, n + ' M' + id + ': nur bestellbare Farben, Zeile «' + einzahlText(m.vids.size) + '», Knopf');
      ok(x.d.scrollD <= 1 && x.d.ueber === 0, n + ' M' + id + ': kein seitliches Scrollen');
    }
    ok(X.logs.fehler.length === 0, n + ': keine Seitenfehler', X.logs.fehler.join(' | '));
    const konsole = X.logs.konsole.filter((x) => !/Failed to load resource|ERR_FAILED|texts-de/i.test(x));
    ok(konsole.length === 0, n + ': keine Konsolenfehler ausser der erwarteten Netzmeldung', konsole.join(' | '));
  }
}
function gleichKern(ist, soll, name) { ok(JSON.stringify(ist) === JSON.stringify(soll), name, JSON.stringify(ist).slice(0, 160) + ' <> ' + JSON.stringify(soll).slice(0, 160)); }

(async () => {
  await vorbereiten();
  BESTELLBAR = MODUS === 'voll' ? 'alle' : [...new Set([...TESTMODELLE.map((x) => x[0]), 1, 181, 99, 294, 19, 749, 692])];
  const browser = await chromium.launch();
  const t0 = Date.now();
  if (MODUS === 'schnell' || MODUS === 'alles') { await pruefeFrische(browser); await laufeSchnell(browser); }
  if (MODUS === 'szenarien' || MODUS === 'alles') { await laufeSzenarien(browser); }
  if (MODUS === 'kombi' || MODUS === 'alles') { await laufeKombi(browser); }
  if (MODUS === 'voll') { await laufeVoll(browser); }
  await browser.close();
  if (overflowEingefasst.length) console.log('Hinweis: Elemente rechts ausserhalb des Fensters, aber in scrollenden/abgeschnittenen Containern (Farbreihen, Vorschaubilder) eingefasst, daher kein Seitenüberlauf:', overflowEingefasst.length, 'Fälle, z. B.', overflowEingefasst.slice(0, 4).join(', '));
  console.log('\nERGEBNIS [' + MODUS + ']: ' + pass + ' bestanden, ' + fail + ' fehlgeschlagen, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (fail) { console.log('Fehlgeschlagen:\n - ' + fehlerListe.slice(0, 40).join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('ABBRUCH', e.stack || e.message); process.exit(2); });
