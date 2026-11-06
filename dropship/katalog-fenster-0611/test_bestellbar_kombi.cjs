// KOPIE von katalog-nur-bestellbar-0511/test_nur_bestellbar.cjs (Original unverändert), angepasst auf den GEMEINSAMEN Stand: Browsertest «nur bestellbar» gegen die ECHTE Live-Seite (nur lesend).
// Das Dokument wird einmal vom Live-Shop geholt und mit den Änderungen der Liquid-Dateien versehen (so, wie der Server sie nach dem Einspielen liefern würde); JS, CSS und die DREI neuen Dateien
// (Ausblenden, Variantenkarte, deutsche Texte) kommen per page.route() aus ziel/ (dem Soll-Stand dieses Pakets); der Shop bleibt unverändert.
//   NODE_PATH=$(/opt/node22/bin/npm root -g) /opt/node22/bin/node dropship/katalog-fenster-0611/test_bestellbar_kombi.cjs
// Umgebung:  LOKAL=1  kein Zugriff auf die Live-Seite (Dokument und Daten aus dem Zwischenspeicher; für die Mutationsprobe)
//            SCHNELL=1  nur 1440 px und weniger Detailansichten
//            PRUEFSUMME_IGNORIEREN=1  statt ziel/ den frisch aus kombi.mjs berechneten Stand prüfen und nicht gegen daten/pruefstand.json vergleichen (nur Mutationsprobe)
//            MINIFIZIERT=1 ESBUILD=<Pfad zu esbuild>  JS und CSS so ausliefern, wie der Shopify-CDN es tut (GEMESSEN 06.11.2026: `esbuild --minify-whitespace --minify-syntax` ergibt das Live-JS Byte für Byte)
//            CACHE_DIR=<Ordner>  Zwischenspeicher (Vorgabe: Scratch); SHOTS_DIR=<Ordner>  kleine JPEG-Bilder (Vorgabe: Scratch)
// Vor jeder Messung: MD5 der Nachbildung (alle zwölf Dateien: ziel/ gegen kombi.mjs gegen daten/pruefstand.json).
// Live-Zugriffe: genau ein Seitenabruf (Dokument) pro Lauf plus die Datenschalen, die geöffnet werden; Cloudflare-Sperre -> Exit 2.
// Änderungen gegenüber dem Original (alle begründet): die Nachbildung ist der gemeinsame Stand; das Dokument trägt zusätzlich textsAsset und die Etiketten von (B); die Textdatei wird ausgeliefert.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const HIER = __dirname + '/';
const A_ORDNER = HIER + '../katalog-nur-bestellbar-0511/';
const SCRATCH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/fenster';
const CACHE = process.env.CACHE_DIR || SCRATCH + '/cache';
const SHOTS = process.env.SHOTS_DIR || SCRATCH + '/shots';
const LOKAL = process.env.LOKAL === '1', SCHNELL = process.env.SCHNELL === '1';
const LIVE_URL = 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const MINIFIZIERT = process.env.MINIFIZIERT === '1';
const miniMemo = new Map();
const mini = (text, loader) => {
  if (!MINIFIZIERT) return text;
  const k = loader + md5(text);
  if (!miniMemo.has(k)) {
    if (!process.env.ESBUILD) throw new Error('MINIFIZIERT=1 braucht ESBUILD=<Pfad zu esbuild>');
    const r = spawnSync(process.env.ESBUILD, ['--minify-whitespace', '--minify-syntax', '--loader=' + loader, '--log-level=error'], { input: text, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status !== 0 || !r.stdout) throw new Error('esbuild schlug fehl: ' + (r.stderr || '').slice(0, 300));
    miniMemo.set(k, r.stdout);
  }
  return miniMemo.get(k);
};
const erg = { fehler: [], daten: {} };
let pruefungen = 0;
const pruef = (ok, text) => { pruefungen++; if (!ok) erg.fehler.push(text); };
const gleich = (ist, soll, text) => pruef(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const schlafen = (ms) => new Promise((r) => setTimeout(r, ms));
for (const d of [CACHE + '/daten', CACHE + '/statisch', SHOTS]) fs.mkdirSync(d, { recursive: true });

// ---------- Nachbildung: Soll-Stand aus Sicherung + Paket ----------
async function nachbildung() {
  const K = await import(HIER + 'kombi.mjs');
  // P: dieselbe Form wie im Original (P.DATEIEN, P.NEUE_DATEIEN, P.NEUE_SCHLUESSEL), aber mit dem gemeinsamen Stand; NEUE_SCHLUESSEL = Etiketten von (A) UND (B)
  const P = { DATEIEN: K.DATEIEN, NEUE_DATEIEN: K.NEUE_DATEIEN, NEUE_SCHLUESSEL: K.NEUE_SCHLUESSEL, NEUE_SCHLUESSEL_B: K.NEUE_SCHLUESSEL_B };
  const alt = Object.fromEntries(Object.values(K.DATEIEN).map((f) => [f, fs.readFileSync(HIER + 'sicherung/' + f.replace('/', '__') + '.vor', 'utf8')]));
  const berechnet = K.anwendenKombi(alt, K.lesenDaten());
  let soll = berechnet;
  if (process.env.PRUEFSUMME_IGNORIEREN !== '1') {
    const pruefstand = JSON.parse(fs.readFileSync(HIER + 'daten/pruefstand.json', 'utf8')).md5;
    const ziel = Object.fromEntries(Object.keys(pruefstand).map((f) => [f, fs.readFileSync(HIER + 'ziel/' + f.replace('/', '__'), 'utf8')]));
    const istZiel = Object.fromEntries(Object.keys(pruefstand).map((f) => [f, md5(ziel[f])]));
    const istBerechnet = Object.fromEntries(Object.keys(pruefstand).map((f) => [f, md5(berechnet[f])]));
    gleich(istZiel, pruefstand, 'ziel/ gleich daten/pruefstand.json (MD5 aller zwölf Dateien)');
    gleich(istBerechnet, pruefstand, 'kombi.mjs berechnet den Stand von daten/pruefstand.json (MD5 aller zwölf Dateien)');
    if (JSON.stringify(istZiel) !== JSON.stringify(pruefstand) || JSON.stringify(istBerechnet) !== JSON.stringify(pruefstand)) throw new Error('Nachbildung weicht vom Prüfstand ab: Browsertest abgebrochen');
    soll = ziel;
  }
  return { P, alt, soll };
}

// ---------- Live-Dokument und Daten (mit Zwischenspeicher) ----------
async function holeDokument() {
  const datei = CACHE + '/seite.html';
  if (LOKAL) { if (!fs.existsSync(datei)) throw new Error('LOKAL=1, aber kein Dokument im Zwischenspeicher: ' + datei); return fs.readFileSync(datei, 'utf8'); }
  const r = await fetch(LIVE_URL, { headers: { 'User-Agent': UA, 'Accept-Language': 'de-CH,de;q=0.9' } });
  const html = await r.text();
  if (r.status !== 200 || !/data-lcl-config/.test(html)) { console.log('BOT-SPERRE oder Fehler', r.status, html.slice(0, 120)); process.exit(2); }
  fs.writeFileSync(datei, html);
  return html;
}
const memo = new Map();
async function datenAsset(route, name) {
  const datei = CACHE + '/daten/' + name;
  if (memo.has(name)) return memo.get(name);
  let body;
  if (LOKAL && fs.existsSync(datei)) body = fs.readFileSync(datei, 'utf8');
  else { const r = await route.fetch(); body = await r.text(); fs.writeFileSync(datei, body); }
  memo.set(name, body);
  return body;
}
async function statisch(route, url) {
  const datei = CACHE + '/statisch/' + md5(url) + '.bin', meta = datei + '.json';
  if (fs.existsSync(datei) && fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, 'utf8')); return route.fulfill({ status: m.status, headers: m.headers, body: fs.readFileSync(datei) }); }
  const r = await route.fetch(); const body = await r.body();
  if (r.status() === 200) { fs.writeFileSync(datei, body); fs.writeFileSync(meta, JSON.stringify({ status: 200, headers: { 'content-type': r.headers()['content-type'] || 'application/octet-stream' } })); }
  return route.fulfill({ response: r, body });
}

// ---------- Dokument so verändern, wie der Server es nach dem Einspielen liefern würde ----------
const konfigRegex = /(<script type="application\/json" data-lcl-config>)([\s\S]*?)(<\/script>)/;
function mitKonfig(html, fn) {
  const m = html.match(konfigRegex); if (!m) throw new Error('Konfiguration nicht gefunden');
  const cfg = JSON.parse(m[2]); fn(cfg);
  return html.replace(konfigRegex, (_x, a, _b, c) => a + '\n  ' + JSON.stringify(cfg) + '\n  ' + c);
}
function sollDokument(htmlIst, ctx) {
  const { P, soll } = ctx;
  const de = JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_clothing;
  let html = mitKonfig(htmlIst, (cfg) => {
    const basis = cfg.assets.index.split('luxe-clothing-index.json')[0];
    cfg.assets = { index: cfg.assets.index, ausblenden: basis + 'luxe-clothing-ausblenden.json?v=nb0511', variantenkarte: basis + 'luxe-clothing-variantenkarte.json?v=nb0511', details: cfg.assets.details };
    cfg.textsAsset = basis + 'luxe-clothing-texts-de.json?v=kb0611'; // (B): so steht es nach dem Einspielen in der Konfiguration der Sektion
    for (const k of ['notice', 'intro', ...P.NEUE_SCHLUESSEL]) cfg.labels[k] = de[k];
  });
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  html = html.replace(/(<p class="lcl-notice">)[^<]*(<\/p>)/, (_m, a, b) => a + esc(de.notice) + b).replace(/(<p class="lcl-dialog-notice">)[^<]*(<\/p>)/, (_m, a, b) => a + esc(de.dialog_notice) + b).replace(/(<p class="lcl-intro">)[^<]*(<\/p>)/, (_m, a, b) => a + esc(de.intro) + b);
  // luxe_category (Shopliste unter dem Fenster): die alten Sätze müssen genau einmal im Live-Dokument stehen und werden durch die neuen ersetzt
  const deAlt = JSON.parse(ctx.alt[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_category, deNeu = JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_category;
  for (const k of ['shop_intro', 'end_note']) { const stellen = html.split(esc(deAlt[k])).length - 1; erg.daten['alterSatz_' + k] = stellen; if (stellen === 1) html = html.split(esc(deAlt[k])).join(esc(deNeu[k])); else if (stellen > 1) throw new Error('Satz ' + k + ' kommt ' + stellen + '× im Live-Dokument vor'); }
  // Links der Titelkacheln und der Shopliste: genau die Zeichenkette, die das Soll-Liquid ausgibt (echtes Ruby-Liquid, ein Aufruf für alle Produkte)
  const cfg = JSON.parse(htmlIst.match(konfigRegex)[2]);
  const ersteLieferbare = {};
  for (const o of cfg.shopVariantOffers) { const h = o.url.split('?')[0]; if (!ersteLieferbare[h] || (ersteLieferbare[h].available === false && o.available !== false)) ersteLieferbare[h] = o; }
  const vorlage = soll[P.DATEIEN.CATEGORY].match(/href="(\{\{ item\.url \}\}\?variant=[^"]*)"/);
  if (!vorlage) throw new Error('Link-Vorlage der Shopliste nicht gefunden');
  const handles = Object.keys(ersteLieferbare);
  const { rendere } = ctx.liquid;
  const r = rendere({ main: `{% for item in items %}${vorlage[1]}\n{% endfor %}`, context: { items: handles.map((h) => ({ url: h, selected_or_first_available_variant: { id: Number(ersteLieferbare[h].variantId) } })) } });
  if (r.fehler.length) throw new Error('Liquid: ' + r.fehler.join('; '));
  const gerendert = r.ausgabe.trim().split('\n');
  const proHandle = Object.fromEntries(handles.map((h, i) => [h, gerendert[i]]));
  let ersetzt = 0;
  html = html.replace(/href="(\/products\/[^"?]+)\?view=luxe-studio"/g, (_m, pfad) => { ersetzt++; if (!proHandle[pfad]) return _m; return `href="${proHandle[pfad]}"`; });
  erg.daten.linksUmgeschrieben = ersetzt;
  html = html.split('>Entwurf öffnen<').join('>' + (de.design_cta) + '<');
  return html;
}

// ---------- Erwartung: unabhängig vom JS des Pakets aus Angeboten, Variantenkarte, Ausblenden und Index gerechnet ----------
function erwartung(offers, karte, ausb, index) {
  const hideM = new Set((ausb.modelle || []).map(String)), hideV = new Set(Object.values(ausb.varianten || {}).flat().map(String));
  const proVariante = {};
  for (const o of offers) (proVariante[o.printfulVariantId] = proVariante[o.printfulVariantId] || []).push(o);
  const modelle = {};
  for (const [pid, zeilen] of Object.entries(karte.modelle)) {
    if (hideM.has(pid)) continue;
    for (const [vid, farbe, groesse] of zeilen) {
      const os = proVariante[String(vid)];
      if (!os || hideV.has(String(vid)) || !os.some((o) => o.available !== false)) continue;
      const m = (modelle[pid] = modelle[pid] || { vids: new Set(), farben: new Set(), groessen: new Set(), proFarbe: {}, farbeVon: {}, groesseVon: {} });
      m.vids.add(String(vid)); if (farbe) m.farben.add(farbe); if (groesse) m.groessen.add(groesse);
      const key = farbe || '';
      (m.proFarbe[key] = m.proFarbe[key] || new Set()).add(String(vid)); m.farbeVon[String(vid)] = key; m.groesseVon[String(vid)] = groesse || '';
    }
  }
  const sichtbar = new Set(Object.keys(modelle));
  const zeile = new Map(index.products.map((p) => [String(p.id), p]));
  const kategorien = {};
  for (const pid of sichtbar) for (const c of zeile.get(pid).categoryIds || []) kategorien[c] = (kategorien[c] || 0) + 1;
  const baby = [...sichtbar].filter((p) => (zeile.get(p).audiences || []).includes('kids') && zeile.get(p).baby === true && (zeile.get(p).categoryIds || []).map(String).includes('14')).length;
  const unisex = [...sichtbar].filter((p) => /\bunisex\b/i.test(zeile.get(p).title)).length;
  const farben = new Set(), groessen = new Set();
  for (const pid of sichtbar) { modelle[pid].farben.forEach((f) => farben.add(f)); modelle[pid].groessen.forEach((g) => groessen.add(g)); }
  return { modelle, sichtbar, kategorien, baby, unisex, farben, groessen, zeile, offersProVariante: proVariante, karteModelle: karte.modelle };
}

// ---------- Seite aufbauen ----------
async function oeffne(browser, vp, o) {
  const t0 = Date.now();
  const ctx = await browser.newContext({ viewport: vp, userAgent: UA, locale: 'de-CH' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  const seite = { ctx, page, seitenfehler: [], konsole: [] };
  // Cookie-Hinweis und Newsletter-Fenster würden Klicks abfangen (Playwright wartet dann auf freie Fläche): für den Test ausgeblendet, sie gehören nicht zum Katalog
  await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#lx-cookie-banner,#lx-pop{display:none!important}'; document.head.append(st); }); });
  seite.fremdeFehler = [];
  // Gezählt werden nur Fehler, die dem Katalog-Skript (luxe-clothing.js) zuzuordnen sind; Fehler fremder Skripte (Shop-Pixel, Header-Abruf, Clarity) stammen aus der Netzsperre des Tests und werden nur festgehalten
  page.on('pageerror', (e) => { const s = String(e.stack || '') + ' ' + e.message; if (/luxe-clothing/.test(s)) seite.seitenfehler.push(e.message.slice(0, 200)); else seite.fremdeFehler.push(e.message.slice(0, 120)); });
  page.on('console', (m) => { if (m.type() !== 'error' || /^Failed to load resource/.test(m.text())) return; if (/luxe-clothing/.test(m.location().url || '') || /luxe-clothing/.test(m.text())) seite.konsole.push(m.text().slice(0, 200)); });
  await ctx.route('**/*', async (route) => {
    const req = route.request(), u = new URL(req.url()), typ = req.resourceType();
    try {
      if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing|pinterest|snap|cookie|shopifycloud|shop\.app|monorail/i.test(u.hostname + u.pathname)) return await route.abort();
      if (typ === 'document' && u.pathname === '/collections/selbst-gestalten-1') return await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: o.html });
      const p = u.pathname;
      if (/\/assets\/luxe-clothing\.js$/.test(p)) return await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: mini(o.js, 'js') });
      if (/\/assets\/luxe-clothing\.css$/.test(p)) return await route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: mini(o.css, 'css') });
      for (const [muster, wert] of [[/\/assets\/luxe-clothing-ausblenden\.json$/, o.ausblenden], [/\/assets\/luxe-clothing-variantenkarte\.json$/, o.karte], [/\/assets\/luxe-clothing-texts-de\.json$/, o.texte]]) {
        if (!muster.test(p)) continue;
        if (wert === 'abort') return await route.abort();
        if (wert === '404' || wert == null) return await route.fulfill({ status: 404, contentType: 'text/plain', body: 'nicht gefunden' });
        return await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: wert });
      }
      const m = p.match(/\/assets\/(luxe-clothing-(?:index|reference-gallery|details-s\d+)\.json)$/);
      if (m) { if (o.indexVerzoegerung && m[1] === 'luxe-clothing-index.json') await schlafen(o.indexVerzoegerung); return await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: await datenAsset(route, m[1]) }); }
      if (typ === 'image' || typ === 'media') return LOKAL ? await route.abort() : await route.continue();
      if (/(^|\.)luxestyle\.ch$|cdn\.shopify\.com$/.test(u.hostname) && ['stylesheet', 'script', 'font'].includes(typ) && req.method() === 'GET') return await statisch(route, req.url());
      if (LOKAL && ['fetch', 'xhr'].includes(typ)) return await route.fulfill({ status: 404, body: '' });
      return await route.continue();
    } catch (e) { try { await route.abort(); } catch { /* Seite schon zu */ } }
  });
  await page.goto(LIVE_URL + (o.query || ''), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => { const r = document.querySelector('[data-luxe-clothing]'); return r && (r.dataset.loadState === 'ready' || r.dataset.loadState === 'error'); }, null, { timeout: 40000 });
  if (process.env.DEBUG_TEST === '1' && (await page.evaluate(() => document.querySelector('[data-luxe-clothing]').dataset.loadState)) === 'error') {
    console.log('DIAGNOSE Ladefehler:', JSON.stringify(await page.evaluate(async () => { const c = JSON.parse(document.querySelector('[data-lcl-config]').textContent); const out = {}; for (const k of ['index', 'variantenkarte', 'ausblenden']) { try { const r = await fetch(c.assets[k] || '/nix'); out[k] = r.status + ' ' + c.assets[k]; } catch (e) { out[k] = 'FEHLER ' + e.message; } } return out; })), seite.seitenfehler, seite.konsole);
  }
  if (process.env.DEBUG_TEST === '1') console.log('  [oeffne ' + (Date.now() - t0) + ' ms]');
  return seite;
}

// ---------- Messungen ----------
const lies = (page) => page.evaluate(() => {
  const root = document.querySelector('[data-luxe-clothing]'), q = (s, w = document) => [...w.querySelectorAll(s)];
  const txt = (s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
  const kartenInfo = () => q('.lcl-card').map((c) => {
    const a = q('.lcl-design-cta', c), d = q('.lcl-card-cta', c);
    return { id: c.dataset.productId, titel: (c.querySelector('h3')?.textContent || '').trim(), designAnzahl: a.length, designHref: a[0]?.getAttribute('href') || '', designText: a[0]?.textContent.trim() || '', designLabel: a[0]?.getAttribute('aria-label') || '', detailsText: d[0]?.textContent.trim() || '', designVorDetails: !!(a[0] && d[0] && (a[0].compareDocumentPosition(d[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) };
  });
  return {
    ladezustand: root.dataset.loadState, quelleAnzahl: root.dataset.sourceCount, gefiltert: root.dataset.filteredCount, hideState: root.dataset.hideState || '',
    ergebniszeile: txt('[data-lcl-results]'), nachricht: txt('[data-lcl-message]'), nachrichtSichtbar: !document.querySelector('[data-lcl-message]').hidden, retrySichtbar: !document.querySelector('[data-lcl-retry]').hidden,
    hinweis: txt('.lcl-notice'), hinweisDialog: txt('.lcl-dialog-notice'), intro: txt('.lcl-intro'), shopIntro: txt('.lxc-collection-heading > p'),
    filterFlaeche: getComputedStyle(document.querySelector('.lcl-discovery')).display, ergebnisFlaeche: getComputedStyle(document.querySelector('.lcl-result-line')).display,
    karten: kartenInfo(),
    gruppen: q('.lcl-group').map((g) => ({ key: g.dataset.group, name: g.querySelector('.lcl-group-name')?.textContent.trim(), n: Number(g.querySelector('.lcl-group-count')?.textContent) })),
    gruppenMobil: q('[data-lcl-group-select] option').map((o) => o.value),
    typen: q('[data-lcl-types] option').map((o) => ({ v: o.value, t: o.textContent.trim() })),
    farbenFilter: q('[data-lcl-color-filter] option').map((o) => o.value).filter(Boolean), groessenFilter: q('[data-lcl-size-filter] option').map((o) => o.value).filter(Boolean),
    kurzwahl: q('[data-lcl-category-shortcut]').map((x) => ({ key: x.dataset.lclCategoryShortcut, sichtbar: !x.hidden })),
    sonderauswahl: q('[data-lcl-audience]').map((x) => ({ key: x.dataset.lclAudience, sichtbar: !x.hidden })),
    unterkategorien: q('.lcl-subcategory:not(.lcl-subcategory--back)').map((x) => x.textContent.trim()),
    seitenText: txt('[data-lcl-page]'), weiterOffen: !document.querySelector('[data-lcl-next]').disabled && !document.querySelector('[data-lcl-pagination]').hidden,
    studioLinks: q('a[href*="view=luxe-studio"]').length,
    editorLinksListe: q('.lxc-card a[href*="lspod-start"]').length, editorLinksTitel: q('.lcl-cover-image[href*="lspod-start"]').length,
    shopKarten: q('.lxc-card').length, knopfTexteListe: [...new Set(q('.lxc-card-cta').map((x) => x.firstChild?.textContent.trim()))],
    scrollBreite: document.documentElement.scrollWidth, fensterBreite: innerWidth,
  };
});
async function alleKarten(page) {
  const alle = [];
  for (let i = 0; i < 80; i++) {
    const d = await lies(page); alle.push(...d.karten);
    if (!d.weiterOffen) break;
    const vor = await page.evaluate(() => document.querySelector('[data-luxe-clothing]').dataset.currentPage);
    await page.click('[data-lcl-next]');
    await page.waitForFunction((v) => document.querySelector('[data-luxe-clothing]').dataset.currentPage !== v, vor);
  }
  await page.evaluate(() => document.querySelector('[data-lcl-reset]').click()); await page.waitForTimeout(150);
  return alle;
}
async function modellOeffnen(page, pid, titel) {
  await page.fill('[data-lcl-search]', ''); await page.fill('[data-lcl-search]', titel); await page.waitForTimeout(450);
  const karte = page.locator(`.lcl-card[data-product-id="${pid}"]`);
  for (let i = 0; i < 40 && !(await karte.count()); i++) {
    const weiter = await page.evaluate(() => !document.querySelector('[data-lcl-next]').disabled && !document.querySelector('[data-lcl-pagination]').hidden);
    if (!weiter) return false;
    const vor = await page.evaluate(() => document.querySelector('[data-luxe-clothing]').dataset.currentPage);
    await page.click('[data-lcl-next]'); await page.waitForFunction((v) => document.querySelector('[data-luxe-clothing]').dataset.currentPage !== v, vor);
  }
  if (!(await karte.count())) return false;
  await karte.locator('.lcl-card-cta').click();
  await page.waitForFunction(() => { const d = document.querySelector('[data-lcl-dialog]'); return d.open && d.querySelector('.lcl-variant-content'); }, null, { timeout: 15000 });
  return true;
}
const detailLesen = (page) => page.evaluate(() => {
  const dlg = document.querySelector('[data-lcl-dialog]'), q = (s) => [...dlg.querySelectorAll(s)];
  const cta = dlg.querySelector('[data-lcl-design-cta]');
  return {
    titel: dlg.querySelector('[data-lcl-detail-title]').textContent.trim(),
    farben: q('.lcl-color-choice').map((b) => b.dataset.colorKey.split('|')[0]),
    groessenIds: q('.lcl-size').map((b) => b.dataset.variantId),
    gewaehlteGroesse: dlg.dataset.variantId, gewaehlteFarbe: dlg.dataset.color,
    daumenIds: q('.lcl-detail-thumbnail').map((b) => b.dataset.variantId).filter(Boolean),
    ctaAnzahl: q('[data-lcl-design-cta]').length, ctaHref: cta ? cta.getAttribute('href') : '', ctaText: cta ? cta.textContent.trim() : '',
    preisBox: (dlg.querySelector('[data-lcl-shop-price]')?.innerText || '').replace(/\s+/g, ' ').trim(),
    auswahlAngebot: dlg.querySelector('[data-lcl-shop-offer-select]') ? dlg.querySelector('[data-lcl-shop-offer-select]').value : null,
    anzahlZeile: (dlg.querySelector('[data-lcl-original-variants]')?.textContent || '').trim(), anzahlAttr: dlg.querySelector('[data-lcl-original-variants]')?.dataset.lclOriginalVariants || '',
    nichtBestellbarText: /noch nicht bestellbar|nicht bestellbar/i.test(dlg.querySelector('[data-lcl-shop-price]')?.innerText || ''),
    wechselKnopf: q('.lcl-design-switch').length, scrollBreite: document.documentElement.scrollWidth, fensterBreite: innerWidth,
  };
});

// ---------- Prüfungen je Ansicht ----------
function pruefeListe(tag, d, karten, e, offers) {
  const N = e.sichtbar.size;
  gleich(d.ladezustand, 'ready', `${tag}: Katalog geladen`);
  gleich([d.quelleAnzahl, d.gefiltert], [String(N), String(N)], `${tag}: Quell- und Trefferzahl gleich der Zahl bestellbarer Modelle`);
  gleich(d.ergebniszeile, N === 1 ? '1 Modell in dieser Auswahl' : `${N} Modelle in dieser Auswahl`, `${tag}: Ergebniszeile`);
  pruef(d.filterFlaeche !== 'none' && d.ergebnisFlaeche !== 'none', `${tag}: Filterfläche und Ergebniszeile sind sichtbar, solange es Modelle gibt`);
  gleich(karten.length, N, `${tag}: Kartenzahl über alle Seiten`);
  gleich([...new Set(karten.map((k) => k.id))].sort(), [...e.sichtbar].sort(), `${tag}: genau die erwarteten Modelle erscheinen`);
  const ohneKnopf = karten.filter((k) => k.designAnzahl !== 1);
  gleich(ohneKnopf.map((k) => k.titel), [], `${tag}: 0 Karten ohne genau einen Knopf «Jetzt selbst gestalten»`);
  gleich([...new Set(karten.map((k) => k.designText))], ['Jetzt selbst gestalten'], `${tag}: Knopftext`);
  gleich([...new Set(karten.map((k) => k.detailsText))], ['Auswahl & Details'], `${tag}: «Auswahl & Details» bleibt daneben`);
  pruef(karten.every((k) => k.designVorDetails), `${tag}: der Gestalten-Knopf steht vor dem Details-Knopf`);
  pruef(karten.every((k) => k.designLabel.startsWith('Jetzt selbst gestalten: ') && k.designLabel.length > 28), `${tag}: Knopf trägt den Modellnamen als Beschriftung`);
  const falsch = karten.filter((k) => {
    const m = k.designHref.match(/^https:\/\/luxestyle\.ch\/products\/([^?#]+)\?variant=(\d+)#lspod-start$/);
    if (!m) return true;
    const os = offers.filter((o) => o.variantId === m[2] && o.url.startsWith('/products/' + m[1] + '?') && o.available !== false);
    return !os.length || ![...(e.modelle[k.id] || { vids: [] }).vids].some((v) => os.some((o) => o.printfulVariantId === v));
  });
  gleich(falsch.map((k) => `${k.titel} -> ${k.designHref}`), [], `${tag}: jeder Knopf führt auf /products/<handle>?variant=<id>#lspod-start einer bestellbaren Ausführung desselben Modells`);
  gleich(d.studioLinks, 0, `${tag}: 0 Links auf view=luxe-studio`);
  pruef(d.shopKarten === new Set(offers.map((o) => o.shopifyProductId)).size && d.editorLinksListe === 3 * d.shopKarten && d.editorLinksTitel === 3, `${tag}: Shopliste ${d.editorLinksListe} Editor-Links bei ${d.shopKarten} Shopkarten (soll 3 je Karte), Titelkacheln ${d.editorLinksTitel} (soll 3)`);
  gleich(d.knopfTexteListe, ['Jetzt selbst gestalten'], `${tag}: Knopf der Shopliste heisst «Jetzt selbst gestalten»`);
  // Zähler, Gruppen, Typen, Chips
  const gr = d.gruppen.filter((g) => g.key !== 'all');
  pruef(gr.every((g) => g.n > 0), `${tag}: keine Gruppe mit Zähler 0`);
  gleich(d.gruppen.find((g) => g.key === 'all')?.n, N, `${tag}: Gruppe «Alle Produkte» zählt ${N}`);
  gleich(gr.map((g) => [g.key, g.n]), gr.map((g) => [g.key, e.kategorien[g.key] || 0]), `${tag}: jede Gruppe zählt die sichtbaren Modelle`);
  const wurzeln = Object.keys(e.kategorien);
  const erwarteteGruppen = e.wurzelIds.filter((c) => e.kategorien[c] > 0);
  gleich(gr.map((g) => g.key), erwarteteGruppen, `${tag}: Gruppen ohne sichtbares Modell fehlen (und nur diese)`);
  gleich(d.gruppenMobil.filter((v) => v !== 'all'), erwarteteGruppen, `${tag}: Mobil-Auswahl hat dieselben Gruppen`);
  const typOpt = d.typen.filter((t) => t.v);
  pruef(typOpt.every((t) => { const m = t.t.match(/\((\d+)\)\s*$/); return m && Number(m[1]) > 0 && Number(m[1]) === (e.kategorien[t.v] || 0); }), `${tag}: Typ-Liste zählt richtig und hat keinen Eintrag mit (0): ${JSON.stringify(typOpt.filter((t) => { const m = t.t.match(/\((\d+)\)\s*$/); return !(m && Number(m[1]) > 0 && Number(m[1]) === (e.kategorien[t.v] || 0)); }).slice(0, 4))}`);
  gleich(typOpt.map((t) => t.v).sort(), Object.keys(e.kategorien).filter((c) => e.typIds.has(c)).sort(), `${tag}: Typ-Liste enthält genau die Kategorien mit sichtbarem Modell`);
  const kw = Object.fromEntries(d.kurzwahl.map((k) => [k.key, k.sichtbar]));
  gleich(kw['202'], (e.kategorien['202'] || 0) > 0, `${tag}: Kurzwahl «Sticker» nur mit sichtbarem Modell`);
  const so = Object.fromEntries(d.sonderauswahl.map((k) => [k.key, k.sichtbar]));
  gleich([so.all, so.baby, so.unisex], [true, e.baby > 0, e.unisex > 0], `${tag}: Sonderauswahl (Alle/Baby/Unisex) nur mit sichtbarem Modell`);
  // Farben- und Grössenfilter: genau die bestellbaren Werte
  gleich([...d.farbenFilter].sort(), [...e.farben].sort(), `${tag}: Farbfilter enthält nur Farben bestellbarer Ausführungen`);
  gleich([...d.groessenFilter].sort(), [...e.groessen].sort(), `${tag}: Grössenfilter enthält nur Grössen bestellbarer Ausführungen`);
  pruef(d.scrollBreite <= d.fensterBreite + 1, `${tag}: kein seitliches Scrollen (${d.scrollBreite} > ${d.fensterBreite})`);
}

async function pruefeDetail(seite, tag, pid, e, offers, maxFarben = 4) {
  const page = seite.page, m = e.modelle[pid], titel = e.zeile.get(pid).title;
  const ok = await modellOeffnen(page, pid, titel);
  pruef(ok, `${tag}: Modell ${pid} (${titel}) ist als Karte auffindbar`); if (!ok) return;
  // unabhängige Gegenprobe der Variantenkarte: die Datenschale, die der Browser für dieses Modell geladen hat, nennt dieselben Varianten mit denselben Farben und Grössen
  { const key = e.zeile.get(pid).detailShardKey, name = 'luxe-clothing-details-' + key + '.json', roh = memo.get(name) || (fs.existsSync(CACHE + '/daten/' + name) ? fs.readFileSync(CACHE + '/daten/' + name, 'utf8') : null);
    pruef(!!roh, `${tag}/${pid}: Datenschale ${key} liegt vor`);
    if (roh) { const j = JSON.parse(roh); const zeilen = Array.isArray(j.products) ? j.products : Object.values(j.products); const r = zeilen.find((x) => String(x.id) === pid);
      gleich((r.variants || []).map((v) => [Number(v.id), typeof v.color === 'string' && v.color ? v.color : null, typeof v.size === 'string' && v.size ? v.size : null]), e.karteModelle[pid], `${tag}/${pid}: Variantenkarte gleich der Datenschale des Modells (Nummern, Farben, Grössen)`); } }
  let d = await detailLesen(page);
  gleich([...d.farben].sort(), [...m.farben].sort(), `${tag}/${pid}: Details zeigen genau die bestellbaren Farben`);
  const ids = new Set(); const farbenListe = d.farben.length ? d.farben.slice(0, maxFarben) : [''];
  for (let i = 0; i < farbenListe.length; i++) {
    if (d.farben.length) { await page.evaluate((idx) => document.querySelectorAll('[data-lcl-dialog] .lcl-color-choice')[idx].click(), i); await page.waitForTimeout(120); d = await detailLesen(page); }
    const farbe = d.farben.length ? farbenListe[i] : '';
    const erwartet = [...(m.proFarbe[farbe] || [])].sort();
    gleich([...d.groessenIds].sort(), erwartet, `${tag}/${pid}/${farbe || 'ohne Farbe'}: Grössen sind genau die bestellbaren Ausführungen dieser Farbe`);
    d.groessenIds.forEach((v) => ids.add(v));
    gleich(d.ctaAnzahl, 1, `${tag}/${pid}/${farbe || 'ohne Farbe'}: genau ein Knopf «Jetzt selbst gestalten» in den Details`);
    pruef(/^https:\/\/luxestyle\.ch\/products\/[^?#]+\?variant=\d+#lspod-start$/.test(d.ctaHref) && d.ctaText === 'Jetzt selbst gestalten', `${tag}/${pid}: Knopf-Ziel ${d.ctaHref}`);
    pruef(!d.nichtBestellbarText && d.wechselKnopf === 0, `${tag}/${pid}/${farbe || 'ohne Farbe'}: kein «nicht bestellbar»-Hinweis und kein Wechselknopf (${d.preisBox.slice(0, 80)})`);
    pruef(d.daumenIds.every((v) => m.vids.has(v)), `${tag}/${pid}: Vorschaubilder nur von bestellbaren Ausführungen`);
    const sel = (d.ctaHref.match(/variant=(\d+)/) || [])[1];
    pruef(offers.some((o) => o.variantId === sel && o.available !== false && m.vids.has(o.printfulVariantId)), `${tag}/${pid}: Knopf-Variante ${sel} gehört zu einer bestellbaren Ausführung dieses Modells`);
  }
  gleich(d.anzahlZeile, m.vids.size === 1 ? '1 bestellbare Ausführung' : `${m.vids.size} bestellbare Ausführungen`, `${tag}/${pid}: Anzahl-Zeile nennt die bestellbaren Ausführungen (Einzahl bei einer)`);
  pruef(d.scrollBreite <= d.fensterBreite + 1, `${tag}/${pid}: Details ohne seitliches Scrollen`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.fill('[data-lcl-search]', ''); await page.waitForTimeout(200);
}

// ---------- Ablauf ----------
(async () => {
  const ctxN = await nachbildung();
  const liquid = await import(A_ORDNER + 'liquid_helfer.mjs');
  if (!liquid.rubyLiquidGems()) throw new Error('Ruby-Liquid nicht gefunden (RUBY_LIQUID_GEMS)');
  const { P, alt, soll } = ctxN; ctxN.liquid = liquid;
  const htmlIst = await holeDokument();
  const htmlSoll = sollDokument(htmlIst, ctxN);
  const cfgIst = JSON.parse(htmlIst.match(konfigRegex)[2]);
  const offers = cfgIst.shopVariantOffers;
  const browser = await chromium.launch();
  const grund = { js: soll[P.DATEIEN.JS], css: soll[P.DATEIEN.CSS], html: htmlSoll, ausblenden: soll[P.NEUE_DATEIEN.AUSBLENDEN], karte: soll[P.NEUE_DATEIEN.KARTE], texte: soll[P.NEUE_DATEIEN.TEXTE] };
  const karte = JSON.parse(grund.karte), ausb = JSON.parse(grund.ausblenden);
  // Daten für die Erwartung: der Index kommt über die erste Seite (Zwischenspeicher/Netz); wir laden ihn dafür vorab
  const vorab = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, js: alt[P.DATEIEN.JS], css: alt[P.DATEIEN.CSS], html: htmlIst, ausblenden: '404', karte: '404' });
  await vorab.ctx.close();
  const index = JSON.parse(memo.get('luxe-clothing-index.json') || fs.readFileSync(CACHE + '/daten/luxe-clothing-index.json', 'utf8'));
  const erwartet = (offersX, ausbX) => {
    const e = erwartung(offersX, karte, ausbX, index);
    e.wurzelIds = index.categories.filter((c) => String(c.parent_id) === '0' && String(c.id) !== '277').sort((a, b) => (Number(a.catalog_position) || 0) - (Number(b.catalog_position) || 0) || Number(a.id) - Number(b.id)).map((c) => String(c.id));
    const kinder = new Map(); index.categories.forEach((c) => { const p = String(c.parent_id); if (!kinder.has(p)) kinder.set(p, []); kinder.get(p).push(String(c.id)); });
    const erreichbar = new Set(); const dfs = (k) => (kinder.get(k) || []).forEach((c) => { if (c === '277') return; erreichbar.add(c); dfs(c); }); dfs('0');
    e.typIds = erreichbar;
    return e;
  };
  const { pruefeGegenIndex } = await import(A_ORDNER + 'variantenkarte_bauen.mjs');
  gleich(pruefeGegenIndex(karte.modelle, index), [], 'Variantenkarte stimmt mit dem Index überein (Modelle, Variantenzahl, Farben, Grössen)');
  const e0 = erwartet(offers, ausb);
  erg.daten.erwartung = { bestellbareModelle: e0.sichtbar.size, bestellbareAusfuehrungen: Object.values(e0.modelle).reduce((s, m) => s + m.vids.size, 0), gruppen: e0.wurzelIds.filter((c) => e0.kategorien[c]).map((c) => [c, e0.kategorien[c]]), farben: e0.farben.size, groessen: e0.groessen.size };
  pruef(e0.sichtbar.size >= 3, `Erwartung: mindestens 3 bestellbare Modelle im Live-Dokument, gerechnet ${e0.sichtbar.size}`);
  const waehle = (e, bevorzugt, n) => { const sicht = bevorzugt.filter((p) => e.sichtbar.has(p)); for (const p of [...e.sichtbar].sort((a, b) => e.modelle[b].vids.size - e.modelle[a].vids.size)) if (!sicht.includes(p)) sicht.push(p); return sicht.slice(0, n); };

  // ===== A. Vorher (Ist-Dateien, Live-Dokument): der Test erkennt den Unterschied =====
  for (const breite of SCHNELL ? [1440] : [1440, 390]) {
    const s = await oeffne(browser, { width: breite, height: breite === 390 ? 844 : 900 }, { ...grund, js: alt[P.DATEIEN.JS], css: alt[P.DATEIEN.CSS], html: htmlIst, ausblenden: '404', karte: '404' });
    const d = await lies(s.page); const karten = d.karten; // erste Seite genügt (12 von 572 Karten): alle 48 Seiten durchzublättern dauert eine Minute
    erg.daten['vorher' + breite] = { treffer: d.gefiltert, kartenErsteSeite: karten.length, kartenMitKnopf: karten.filter((k) => k.designAnzahl > 0).length, studioLinks: d.studioLinks, gruppen: d.gruppen.length, typOptionen: d.typen.length, farbenFilter: d.farbenFilter.length, groessenFilter: d.groessenFilter.length, ergebniszeile: d.ergebniszeile };
    const studioErwartet = (htmlIst.match(/view=luxe-studio/g) || []).length;
    Object.assign(erg.daten['vorher' + breite], { studioLinksImDokument: studioErwartet, shopKarten: d.shopKarten, shopProdukteInAngeboten: new Set(offers.map((o) => o.shopifyProductId)).size, scroll: [d.scrollBreite, d.fensterBreite] });
    pruef(d.gefiltert === '572' && karten.length === 12 && karten.every((k) => k.designAnzahl === 0) && d.studioLinks === studioErwartet && studioErwartet === 3 * d.shopKarten + 3, `Vorher ${breite}: 572 Treffer, Karten der ersten Seite ohne Knopf, Vorschau-Links = 3 je Shopkarte + 3 Titelkacheln (ist ${d.gefiltert}/${karten.length}/${karten.filter((k) => k.designAnzahl).length}/${d.studioLinks}/${d.shopKarten})`);
    await s.ctx.close();
    if (!LOKAL) await schlafen(4000);
  }

  // ===== B. Nachher, 1440 px =====
  {
    const s = await oeffne(browser, { width: 1440, height: 900 }, grund);
    const d = await lies(s.page); const karten = await alleKarten(s.page);
    erg.daten.nachher1440 = { karten: karten.length, kartenMitKnopf: karten.filter((k) => k.designAnzahl === 1).length, studioLinks: d.studioLinks, editorLinksListe: d.editorLinksListe, editorLinksTitel: d.editorLinksTitel, gruppen: d.gruppen.map((g) => `${g.name} ${g.n}`), typOptionen: d.typen.length - 1, farbenFilter: d.farbenFilter.length, groessenFilter: d.groessenFilter.length, ergebniszeile: d.ergebniszeile, hinweis: d.hinweis };
    pruefeListe('1440', d, karten, e0, offers);
    { const deN = JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_clothing; pruef(d.hinweis === deN.notice && d.hinweisDialog === deN.dialog_notice && d.hinweis !== d.hinweisDialog, '1440: Hinweis im Kopf und im Dialog ist der neue Wortlaut (Dialog kürzer)'); }
    // Suche ohne Treffer: die Standardmeldung (es gibt bestellbare Modelle, nur keins passt), nicht der Satz für «nichts bestellbar»
    {
      await s.page.fill('[data-lcl-search]', 'zzzzqqxx'); await s.page.waitForTimeout(350);
      const dS = await lies(s.page);
      const deL = JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_clothing;
      gleich([dS.gefiltert, dS.nachricht, dS.karten.length], ['0', deL.empty, 0], '1440: Suche ohne Treffer meldet «kein Modell gefunden», nicht «nichts bestellbar»');
      await s.page.fill('[data-lcl-search]', ''); await s.page.waitForTimeout(300);
    }
    // Farbfilter wählen: Treffer und Grössenliste zählen nur bestellbare Paare (Farbe, Grösse)
    {
      const farbe = [...e0.farben].sort()[0];
      await s.page.selectOption('[data-lcl-color-filter]', farbe); await s.page.waitForTimeout(250);
      const dF = await lies(s.page);
      const mitFarbe = [...e0.sichtbar].filter((p) => e0.modelle[p].farben.has(farbe));
      const groessenZuFarbe = new Set(); mitFarbe.forEach((p) => (e0.modelle[p].proFarbe[farbe] || []).forEach((v) => { if (e0.modelle[p].groesseVon[v]) groessenZuFarbe.add(e0.modelle[p].groesseVon[v]); }));
      gleich(dF.gefiltert, String(mitFarbe.length), `1440: Farbfilter «${farbe}» zeigt ${mitFarbe.length} Modelle`);
      gleich([...dF.groessenFilter].sort(), [...groessenZuFarbe].sort(), `1440: Grössenliste zu «${farbe}» enthält nur bestellbare Grössen dieser Farbe`);
      const groesse = [...groessenZuFarbe].sort()[0];
      await s.page.selectOption('[data-lcl-size-filter]', groesse); await s.page.waitForTimeout(250);
      const dG = await lies(s.page);
      const mitPaar = mitFarbe.filter((p) => [...(e0.modelle[p].proFarbe[farbe] || [])].some((v) => e0.modelle[p].groesseVon[v] === groesse));
      gleich(dG.gefiltert, String(mitPaar.length), `1440: Farbe «${farbe}» und Grösse «${groesse}» zeigen ${mitPaar.length} Modelle`);
      erg.daten.farbfilter = { farbe, treffer: mitFarbe.length, groesse, trefferMitGroesse: mitPaar.length };
      await s.page.evaluate(() => document.querySelector('[data-lcl-reset]').click()); await s.page.waitForTimeout(200);
    }
    // Unterkategorien: eine Gruppe wählen, Chips zählen nur Sichtbares
    const erste = e0.wurzelIds.find((c) => e0.kategorien[c] > 0);
    const gefunden = await s.page.evaluate((k) => { const g = document.querySelector(`.lcl-group[data-group="${k}"]`); if (g) g.click(); return !!g; }, erste); pruef(gefunden, `1440: Gruppe ${erste} ist als Knopf vorhanden`); await s.page.waitForTimeout(200);
    const dg = await lies(s.page);
    const chipsOk = dg.unterkategorien.every((t) => { const m = t.match(/ · (\d+)$/); return m && Number(m[1]) > 0; });
    pruef(chipsOk && dg.unterkategorien.length > 0, `1440: Unterkategorie-Chips der Gruppe ${erste} haben alle einen Zähler über 0: ${JSON.stringify(dg.unterkategorien.slice(0, 6))}`);
    gleich(dg.gefiltert, String(e0.kategorien[erste]), `1440: Gruppe ${erste} zeigt ${e0.kategorien[erste]} Modelle`);
    await s.page.evaluate(() => document.querySelector('[data-lcl-reset]').click()); await s.page.waitForTimeout(150);
    // Details
    const modelle = waehle(e0, SCHNELL ? ['71', '19', '686'] : ['71', '686', '19', '456', '438', '821'], SCHNELL ? 3 : 6);
    erg.daten.detailModelle = modelle;
    for (const pid of modelle) await pruefeDetail(s, '1440', pid, e0, offers);
    // Modell mit zwei Shopangeboten für dieselbe Ausführung: Vorwahl, Knopf immer da
    const zwei = Object.entries(e0.offersProVariante).find(([v, os]) => new Set(os.map((o) => o.variantId)).size > 1 && Object.values(e0.modelle).some((m) => m.vids.has(v)));
    if (zwei) {
      const [vid, os] = zwei; const pid = Object.keys(e0.modelle).find((p) => e0.modelle[p].vids.has(vid));
      const ok = await modellOeffnen(s.page, pid, e0.zeile.get(pid).title); pruef(ok, `Zwei Angebote: Modell ${pid} auffindbar`);
      if (ok) {
        const farbe = e0.modelle[pid].farbeVon[vid];
        if (farbe) await s.page.evaluate((f) => [...document.querySelectorAll('[data-lcl-dialog] .lcl-color-choice')].find((b) => b.dataset.colorKey.split('|')[0] === f).click(), farbe);
        await s.page.waitForTimeout(100);
        await s.page.evaluate((v) => { const b = document.querySelector(`[data-lcl-dialog] .lcl-size[data-variant-id="${v}"]`); if (b) b.click(); else document.querySelector('[data-lcl-dialog] .lcl-size')?.click(); }, vid);
        await s.page.waitForTimeout(150);
        const dd = await detailLesen(s.page);
        gleich(dd.gewaehlteGroesse, vid, `Zwei Angebote: Ausführung ${vid} ist gewählt`);
        pruef(dd.auswahlAngebot !== null && os.some((o) => o.variantId === dd.auswahlAngebot && o.available !== false), `Zwei Angebote: ein lieferbares Angebot ist vorgewählt (Auswahl «${dd.auswahlAngebot}»)`);
        gleich(dd.ctaAnzahl, 1, 'Zwei Angebote: der Knopf «Jetzt selbst gestalten» ist sofort da');
        erg.daten.zweiAngebote = { modell: pid, ausfuehrung: vid, vorgewaehlt: dd.auswahlAngebot, knopf: dd.ctaHref };
        await s.page.keyboard.press('Escape');
      }
    } else erg.fehler.push('Keine Ausführung mit zwei Angeboten gefunden (Testvoraussetzung)');
    await s.page.evaluate(() => { document.querySelector('[data-lcl-reset]').click(); document.querySelector('.lcl-grid').scrollIntoView(); }); await s.page.waitForTimeout(400);
    await s.page.screenshot({ path: SHOTS + '/nachher_1440.jpg', type: 'jpeg', quality: 55 });
    pruef(s.seitenfehler.length === 0, `1440: Seitenfehler: ${s.seitenfehler.slice(0, 3).join(' | ')}`);
    pruef(s.konsole.length === 0, `1440: Konsolenfehler: ${s.konsole.slice(0, 3).join(' | ')}`);
    await s.ctx.close();
  }

  // ===== C. Nachher, 390 px =====
  if (!SCHNELL) {
    const s = await oeffne(browser, { width: 390, height: 844 }, grund);
    const d = await lies(s.page); const karten = await alleKarten(s.page);
    erg.daten.nachher390 = { karten: karten.length, kartenMitKnopf: karten.filter((k) => k.designAnzahl === 1).length, studioLinks: d.studioLinks, gruppen: d.gruppen.length, scroll: [d.scrollBreite, d.fensterBreite] };
    pruefeListe('390', d, karten, e0, offers);
    // alle 12 Karten der ersten Seite: Knopf mindestens 44 px, in der Karte, direkt über «Auswahl & Details», und «Auswahl & Details» sitzt unten bündig
    const knopf = await s.page.evaluate(() => {
      // Die erste Karte bekommt einen sehr langen Titel: die Nachbarkarte in derselben Zeile hat dann freien Platz, und nur mit «margin:auto» bleiben ihre Knöpfe unten bündig
      document.querySelector('.lcl-card h3').textContent = 'Sehr langer Titel zum Prüfen der Ausrichtung '.repeat(6);
      const zeilen = [...document.querySelectorAll('.lcl-card')].map((card) => { const b = card.querySelector('.lcl-design-cta'), det = card.querySelector('.lcl-card-cta'); const r = b.getBoundingClientRect(), c = card.getBoundingClientRect(), d = det.getBoundingClientRect(); return { h: Math.round(r.height), inKarte: r.left >= c.left - 1 && r.right <= c.right + 1, ueberlappt: r.bottom > d.top + 1, abstand: Math.round(d.top - r.bottom), boden: Math.round(c.bottom - d.bottom), klasse: b.classList.contains('lcl-card-design') }; });
      return { karten: zeilen.length, h: Math.min(...zeilen.map((z) => z.h)), inKarte: zeilen.every((z) => z.inKarte), ueberlappt: zeilen.some((z) => z.ueberlappt), abstand: Math.max(...zeilen.map((z) => z.abstand)), abstandMin: Math.min(...zeilen.map((z) => z.abstand)), bodenMax: Math.max(...zeilen.map((z) => z.boden)), klasse: zeilen.every((z) => z.klasse) };
    });
    pruef(knopf.karten === 12 && knopf.klasse && knopf.h >= 44 && knopf.inKarte && !knopf.ueberlappt && knopf.abstandMin >= 0 && knopf.abstand <= 12 && knopf.bodenMax <= 24, `390: auf allen 12 Karten der Knopf mindestens 44 px hoch, innerhalb der Karte, direkt über dem Details-Knopf (Abstand 0 bis 12 px) und unten bündig (Rand höchstens 24 px): ${JSON.stringify(knopf)}`);
    erg.daten.knopfKarte390 = knopf;
    for (const pid of waehle(e0, ['71', '686'], 2)) await pruefeDetail(s, '390', pid, e0, offers, 2);
    await s.page.evaluate(() => { document.querySelector('[data-lcl-reset]').click(); document.querySelector('.lcl-grid').scrollIntoView(); }); await s.page.waitForTimeout(400);
    await s.page.screenshot({ path: SHOTS + '/nachher_390.jpg', type: 'jpeg', quality: 55 });
    pruef(s.seitenfehler.length === 0, `390: Seitenfehler: ${s.seitenfehler.slice(0, 3).join(' | ')}`);
    await s.ctx.close();
  }

  // ===== D. Ausblenden greift (Zusatzschutz): Modell 71 weg, zwei Varianten von Modell 438 weg =====
  {
    const mA = waehle(e0, ['71'], 1)[0], mB = waehle(e0, ['438'], 4).find((p) => p !== mA && e0.modelle[p].vids.size >= 4);
    const vB = [...e0.modelle[mB].vids].slice(0, 2);
    const aus2 = { schemaVersion: 1, modelle: [Number(mA)], varianten: { [mB]: vB.map(Number) } };
    const e2 = erwartet(offers, aus2);
    erg.daten.zusatzschutz = { modellWeg: mA, variantenWeg: { [mB]: vB } };
    pruef(e2.sichtbar.size === e0.sichtbar.size - 1 && !e2.sichtbar.has(mA) && e2.modelle[mB].vids.size === e0.modelle[mB].vids.size - 2, `D: Erwartung rechnet Modell ${mA} weg und zwei Varianten von ${mB}`);
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, ausblenden: JSON.stringify(aus2) });
    const d = await lies(s.page); const karten = await alleKarten(s.page);
    gleich(karten.length, e2.sichtbar.size, `D: Zusatzschutz blendet das ganze Modell ${mA} aus`);
    pruef(!karten.some((k) => k.id === mA), `D: Modell ${mA} hat keine Karte`);
    gleich([...d.farbenFilter].sort(), [...e2.farben].sort(), 'D: Farbfilter folgt dem Zusatzschutz'); gleich([...d.groessenFilter].sort(), [...e2.groessen].sort(), 'D: Grössenfilter folgt dem Zusatzschutz');
    await pruefeDetail(s, 'D', mB, e2, offers, 6);
    pruef(s.seitenfehler.length === 0, `D: Seitenfehler: ${s.seitenfehler.slice(0, 3).join(' | ')}`);
    await s.ctx.close();
  }

  // ===== E. Ausblenden-Datei fehlt (404) oder ist gesperrt (abort): nichts bricht, Zahlen wie mit leerer Datei =====
  for (const modus of ['404', 'abort']) {
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, ausblenden: modus });
    const d = await lies(s.page); const karten = await alleKarten(s.page);
    gleich([d.ladezustand, karten.length, d.hideState], ['ready', e0.sichtbar.size, 'unavailable'], `E (${modus}): Katalog lädt trotzdem, alle ${e0.sichtbar.size} Karten, Zustand «unavailable»`);
    pruef(karten.every((k) => k.designAnzahl === 1), `E (${modus}): alle Karten tragen den Knopf`);
    pruef(s.seitenfehler.length === 0 && s.konsole.length === 0, `E (${modus}): keine Seiten-/Konsolenfehler: ${s.seitenfehler.concat(s.konsole).slice(0, 2).join(' | ')}`);
    await s.ctx.close();
  }

  // ===== F. Variantenkarte fehlt: ehrlicher Ladefehler statt unbestellbarer Modelle =====
  for (const modus of ['404', 'abort']) {
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, karte: modus });
    const d = await lies(s.page);
    gleich([d.ladezustand, d.karten.length, d.retrySichtbar, d.nachrichtSichtbar], ['error', 0, true, true], `F (${modus}): Ladefehler, keine Karten, Knopf «Erneut versuchen»`);
    pruef(/konnte nicht geladen werden/.test(d.nachricht), `F (${modus}): Meldung «${d.nachricht}»`);
    await s.ctx.close();
  }

  // ===== G. Null sichtbare Modelle: ehrlicher Satz =====
  const deTexte = JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_clothing;
  for (const [name, fn] of [['keine Angebote', (cfg) => { cfg.shopVariantOffers = []; }], ['alle Angebote nicht lieferbar', (cfg) => { cfg.shopVariantOffers.forEach((o) => { o.available = false; }); }]]) {
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, html: mitKonfig(htmlSoll, fn) });
    const d = await lies(s.page);
    gleich([d.ladezustand, d.karten.length, d.quelleAnzahl, d.gefiltert], ['ready', 0, '0', '0'], `G (${name}): geladen, 0 Karten`);
    gleich([d.nachricht, d.nachrichtSichtbar], [deTexte.none_orderable, true], `G (${name}): ehrlicher Satz statt leerer Seite`);
    gleich(d.ergebniszeile, '0 Modelle in dieser Auswahl', `G (${name}): Ergebniszeile`);
    gleich([d.filterFlaeche, d.ergebnisFlaeche], ['none', 'none'], `G (${name}): bei null Modellen keine leere Filterfläche und keine Ergebniszeile, nur der Satz`);
    pruef(d.gruppen.every((g) => g.key === 'all'), `G (${name}): keine Gruppe ausser «Alle Produkte»`);
    gleich(d.sonderauswahl.map((x) => [x.key, x.sichtbar]), [['all', true], ['baby', false], ['unisex', false]], `G (${name}): Sonderauswahl: nur «Alle» bleibt sichtbar`);
    pruef(d.studioLinks === 0 && s.seitenfehler.length === 0, `G (${name}): keine Vorschau-Links, keine Seitenfehler`);
    erg.daten['null_' + name] = d.nachricht;
    if (name === 'keine Angebote') await s.page.screenshot({ path: SHOTS + '/null_sichtbar.jpg', type: 'jpeg', quality: 55 });
    await s.ctx.close();
  }

  // ===== H. Teilweise lieferbar: Modell 686 nur noch mit einer lieferbaren Ausführung =====
  {
    const mH = waehle(e0, ['686'], 1)[0], eine = [...e0.modelle[mH].vids][0];
    const cfgH = (cfg) => { cfg.shopVariantOffers.forEach((o) => { if (e0.modelle[mH].vids.has(o.printfulVariantId) && o.printfulVariantId !== eine) o.available = false; }); };
    const offersH = JSON.parse(JSON.stringify(offers)); offersH.forEach((o) => { if (e0.modelle[mH].vids.has(o.printfulVariantId) && o.printfulVariantId !== eine) o.available = false; });
    const eH = erwartet(offersH, ausb);
    gleich([eH.sichtbar.has(mH), eH.modelle[mH].vids.size], [true, 1], `H: Erwartung hat Modell ${mH} mit genau einer lieferbaren Ausführung`);
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, html: mitKonfig(htmlSoll, cfgH) });
    const karten = await alleKarten(s.page);
    gleich(karten.length, eH.sichtbar.size, `H: weiterhin alle ${eH.sichtbar.size} Modelle (${mH} bleibt mit einer Ausführung)`);
    await pruefeDetail(s, 'H', mH, eH, offersH, 2);
    await s.ctx.close();
    // und ganz unlieferbar: Modell 686 verschwindet
    const offersH2 = JSON.parse(JSON.stringify(offers)); offersH2.forEach((o) => { if (e0.modelle[mH].vids.has(o.printfulVariantId)) o.available = false; });
    const eH2 = erwartet(offersH2, ausb);
    const s2 = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, html: mitKonfig(htmlSoll, (cfg) => { cfg.shopVariantOffers.forEach((o) => { if (e0.modelle[mH].vids.has(o.printfulVariantId)) o.available = false; }); }) });
    const k2 = await alleKarten(s2.page);
    gleich([k2.length, k2.some((k) => k.id === mH)], [eH2.sichtbar.size, false], `H: Modell ${mH} ohne lieferbare Ausführung erscheint nicht`);
    await s2.ctx.close();
  }

  // ===== J/K. Gruppen, Kurzwahl und Sonderauswahl verschwinden, wenn ihr letztes bestellbares Modell wegfällt =====
  const ohneModelle = (modellIds) => { const o2 = JSON.parse(JSON.stringify(offers)); o2.forEach((o) => { if (modellIds.some((p) => e0.modelle[p] && e0.modelle[p].vids.has(o.printfulVariantId))) o.available = false; }); return o2; };
  for (const [name, waehleModelle] of [
    ['J: keine Sticker und keine Mützen', () => [...e0.sichtbar].filter((p) => (e0.zeile.get(p).categoryIds || []).some((c) => ['202', '93'].includes(String(c))))],
    ['K: keine Unisex-Modelle', () => [...e0.sichtbar].filter((p) => /\bunisex\b/i.test(e0.zeile.get(p).title))],
  ]) {
    const weg = waehleModelle(); const o2 = ohneModelle(weg); const e2 = erwartet(o2, ausb);
    pruef(weg.length > 0 && e2.sichtbar.size === e0.sichtbar.size - weg.length, `${name}: Erwartung rechnet ${weg.length} Modelle weg`);
    const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, html: mitKonfig(htmlSoll, (cfg) => { cfg.shopVariantOffers = o2; }) });
    const d = await lies(s.page); const karten = await alleKarten(s.page);
    pruefeListe(name.split(':')[0], d, karten, e2, o2);
    erg.daten['gruppen_' + name.split(':')[0]] = d.gruppen.map((g) => g.name + ' ' + g.n).concat(['Kurzwahl ' + JSON.stringify(d.kurzwahl), 'Sonderauswahl ' + JSON.stringify(d.sonderauswahl)]);
    await s.ctx.close();
  }
  // ===== L. Zweites, ungültiges Angebot für dieselbe Ausführung: die Ausführung gilt nicht als bestellbar =====
  {
    const einzel = waehle(e0, ['518', '474', '84'], 3).find((p) => e0.modelle[p].vids.size === 1);
    if (einzel) {
      const vid = [...e0.modelle[einzel].vids][0];
      const s = await oeffne(browser, { width: 1440, height: 900 }, { ...grund, html: mitKonfig(htmlSoll, (cfg) => { const o = cfg.shopVariantOffers.find((x) => x.printfulVariantId === vid); cfg.shopVariantOffers.push({ ...o, variantId: String(Number(o.variantId) + 1), currency: 'EUR' }); }) });
      const karten = await alleKarten(s.page);
      gleich([karten.length, karten.some((k) => k.id === einzel)], [e0.sichtbar.size - 1, false], `L: Modell ${einzel} mit nur einer, nun unklaren Ausführung erscheint nicht`);
      await s.ctx.close();
    } else erg.fehler.push('L: kein Modell mit genau einer bestellbaren Ausführung (Testvoraussetzung)');
  }

  // ===== M. Korrekturrunde 06.11.2026: Einzahl, Hinweise, Direktlink, Angebotsauswahl, veraltetes Dokument, Vorabruf =====
  {
    const deL = deTexte;
    const vp = { width: 1440, height: 900 };
    const treffer = (suche) => [...e0.sichtbar].filter((p) => e0.zeile.get(p).title.toLowerCase().includes(suche)).length;
    {
      const s = await oeffne(browser, vp, grund);
      // M1 Einzahl und Mehrzahl in der Ergebniszeile
      for (const [suche, n] of [['spiral', 1], ['tote', 2]]) {
        pruef(treffer(suche) === n, `M1: Testvoraussetzung: «${suche}» trifft ${n} sichtbare Modelle (gerechnet ${treffer(suche)})`);
        await s.page.fill('[data-lcl-search]', suche); await s.page.waitForTimeout(450);
        const dd = await lies(s.page);
        gleich(dd.ergebniszeile, n === 1 ? deL.results_one : deL.results.replace('[count]', String(n)), `M1: Ergebniszeile bei ${n} Treffer(n)`);
      }
      await s.page.fill('[data-lcl-search]', ''); await s.page.waitForTimeout(250);
      // M2/M3 Details eines Modells mit genau einer bestellbaren Ausführung: Einzahl; der Hinweis im Dialog ist der kürzere Text, der Satz «Gestaltet und bestellt wird auf der Produktseite» steht genau einmal
      const einzelnes = [...e0.sichtbar].find((p) => e0.modelle[p].vids.size === 1);
      pruef(!!einzelnes, 'M2: Testvoraussetzung: ein Modell mit genau einer bestellbaren Ausführung');
      if (einzelnes) {
        const ok = await modellOeffnen(s.page, einzelnes, e0.zeile.get(einzelnes).title); pruef(ok, `M2: Modell ${einzelnes} auffindbar`);
        if (ok) {
          const d2 = await detailLesen(s.page);
          gleich(d2.anzahlZeile, deL.orderable_variants_one, `M2: Modell ${einzelnes} zeigt «${deL.orderable_variants_one}» (nicht «1 bestellbare Ausführungen»)`);
          const dl = await s.page.evaluate(() => { const dlg = document.querySelector('[data-lcl-dialog]'); return { hinweis: dlg.querySelector('.lcl-dialog-notice').textContent.trim(), text: dlg.innerText }; });
          gleich(dl.hinweis, deL.dialog_notice, 'M3: Hinweis im Dialog ist der kürzere Text');
          gleich((dl.text.match(/Gestaltet und bestellt wird auf der Produktseite im Shop\./g) || []).length, 1, 'M3: der Satz «Gestaltet und bestellt wird auf der Produktseite im Shop.» steht im Dialog genau einmal');
          pruef(!/Schuh/.test(dl.text.split('\n').slice(0, 6).join(' ')), 'M3: kein Schuh-Satz im Dialog eines Nicht-Schuh-Modells');
          await s.page.keyboard.press('Escape'); await s.page.waitForTimeout(150);
        }
      }
      // M3b Kopf: kein Schuh-Satz, neuer Einleitungstext, Text über der Shopliste und Schlusssatz
      const dK = await lies(s.page);
      pruef(!/Schuh/.test(dK.hinweis) && !/Schuh/.test(dK.hinweisDialog), 'M3b: ohne Schuhmodell kein Schuh-Satz im Hinweis (Kopf und Dialog)');
      gleich(dK.intro, deL.intro, 'M3b: Einleitung nennt keine Kinderkleidung mehr');
      gleich(dK.shopIntro, JSON.parse(soll[P.DATEIEN.DE].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_category.shop_intro, 'M3b: Text über der Shopliste verspricht keinen Entwurf mehr');
      pruef(!/Entwurf|noch nicht bestellt/.test(dK.shopIntro), `M3b: Text über der Shopliste: «${dK.shopIntro}»`);
      pruef(dK.filterFlaeche !== 'none' && dK.ergebnisFlaeche !== 'none', 'M3b: mit sichtbaren Modellen sind Filterfläche und Ergebniszeile sichtbar');
      pruef(s.seitenfehler.length === 0 && s.konsole.length === 0, `M: keine Seiten-/Konsolenfehler: ${s.seitenfehler.concat(s.konsole).slice(0, 2).join(' | ')}`);
      await s.ctx.close();
    }
    // M4 Schuh-Satz erscheint, sobald ein Schuhmodell sichtbar ist (Angebote für die ersten Varianten eines Schuhmodells ergänzt; alle Schuhmodelle stehen heute im Zusatzschutz, darum mit leerer Ausblenden-Datei)
    {
      const schuh = index.products.find((p) => /slip-on canvas shoes/i.test(p.title) && karte.modelle[String(p.id)]) || index.products.find((p) => /\bshoes?\b/i.test(p.title) && karte.modelle[String(p.id)]);
      pruef(!!schuh, 'M4: Testvoraussetzung: ein Schuhmodell im Index');
      if (schuh) {
        const vids = karte.modelle[String(schuh.id)].slice(0, 6).map((z) => String(z[0]));
        const s = await oeffne(browser, vp, { ...grund, ausblenden: JSON.stringify({ schemaVersion: 1, modelle: [], varianten: {} }), html: mitKonfig(htmlSoll, (cfg) => { vids.forEach((v) => cfg.shopVariantOffers.push({ ...cfg.shopVariantOffers[0], printfulVariantId: v })); }) });
        const d = await lies(s.page);
        pruef(d.karten.some((k) => k.id === String(schuh.id)) || d.gefiltert !== String(e0.sichtbar.size), `M4: das Schuhmodell ${schuh.id} ist sichtbar`);
        gleich([d.hinweis, d.hinweisDialog], [deL.notice + ' ' + deL.notice_shoes, deL.dialog_notice + ' ' + deL.notice_shoes], 'M4: Hinweis in Kopf und Dialog trägt jetzt den Schuh-Satz');
        const groessenTexte = await s.page.evaluate(() => [...document.querySelectorAll('[data-lcl-size-filter] option')].map((o) => o.textContent.trim()));
        pruef(groessenTexte.some((g) => /^EU\b/i.test(g)), `M4: der Grössenfilter zeigt Europa-Grössen (${groessenTexte.slice(0, 4).join(', ')})`);
        erg.daten.schuhSatz = { modell: schuh.id, titel: schuh.title, hinweis: d.hinweis };
        pruef(s.seitenfehler.length === 0, `M4: Seitenfehler: ${s.seitenfehler.slice(0, 2).join(' | ')}`);
        await s.ctx.close();
      }
    }
    // M5 Direktlink auf ein verborgenes oder unbekanntes Modell sagt, warum nichts aufgeht; auf ein sichtbares Modell öffnet er die Details
    for (const [pid, name, offen] of [[String(ausb.modelle[0]), 'verborgenes Modell', false], ['99999999', 'unbekanntes Modell', false], ['71', 'sichtbares Modell', true]]) {
      const s = await oeffne(browser, vp, { ...grund, query: '&catalog_product=' + pid });
      const d = await lies(s.page); const dialogOffen = await s.page.evaluate(() => document.querySelector('[data-lcl-dialog]').open);
      gleich([dialogOffen, d.nachricht, d.nachrichtSichtbar], offen ? [true, '', false] : [false, deL.model_unavailable, true], `M5: Direktlink auf ${name} (${pid})`);
      pruef(d.ladezustand === 'ready' && d.karten.length === 12 || offen, `M5: ${name}: Katalog bleibt benutzbar (${d.ladezustand}, ${d.karten.length} Karten)`);
      await s.ctx.close();
    }
    // M6 nicht lieferbare Angebote stehen nicht zur Wahl, solange es ein lieferbares gibt
    {
      const zwei = Object.entries(e0.offersProVariante).find(([v, os]) => new Set(os.map((o) => o.variantId)).size > 1 && Object.values(e0.modelle).some((m) => m.vids.has(v)));
      pruef(!!zwei, 'M6: Testvoraussetzung: Ausführung mit zwei Shopangeboten');
      if (zwei) {
        const [vid, os] = zwei; const pid = Object.keys(e0.modelle).find((p) => e0.modelle[p].vids.has(vid));
        const weg = os[0].variantId, bleibt = os.find((o) => o.variantId !== weg).variantId;
        const s = await oeffne(browser, vp, { ...grund, html: mitKonfig(htmlSoll, (cfg) => { cfg.shopVariantOffers.forEach((o) => { if (o.variantId === weg) o.available = false; }); }) });
        const ok = await modellOeffnen(s.page, pid, e0.zeile.get(pid).title); pruef(ok, `M6: Modell ${pid} auffindbar`);
        if (ok) {
          const farbe = e0.modelle[pid].farbeVon[vid];
          if (farbe) await s.page.evaluate((f) => [...document.querySelectorAll('[data-lcl-dialog] .lcl-color-choice')].find((b) => b.dataset.colorKey.split('|')[0] === f).click(), farbe);
          await s.page.waitForTimeout(100);
          await s.page.evaluate((v) => { const b = document.querySelector(`[data-lcl-dialog] .lcl-size[data-variant-id="${v}"]`); if (b) b.click(); }, vid);
          await s.page.waitForTimeout(150);
          const auswahl = await s.page.evaluate(() => { const sel = document.querySelector('[data-lcl-dialog] [data-lcl-shop-offer-select]'); return sel ? { optionen: [...sel.options].map((o) => o.value), wert: sel.value } : null; });
          pruef(auswahl !== null, 'M6: die Angebotsauswahl ist da');
          if (auswahl) gleich([auswahl.optionen, auswahl.wert], [['', bleibt], bleibt], 'M6: nur das lieferbare Angebot steht zur Wahl und ist vorgewählt');
          const dd = await detailLesen(s.page);
          gleich([dd.ctaAnzahl, dd.wechselKnopf], [1, 0], 'M6: der Knopf «Jetzt selbst gestalten» ist da, kein «Zu einer bestellbaren Ausführung wechseln»');
        }
        await s.ctx.close();
      }
    }
    // M7 veraltetes Dokument (neues JS, im Dokument fehlt der Schlüssel «variantenkarte»): eigener Satz, kein nutzloser Knopf; ein 404 der Karte bleibt der Ladefehler mit «Erneut versuchen» (Gruppe F)
    {
      const s = await oeffne(browser, vp, { ...grund, html: mitKonfig(htmlSoll, (cfg) => { delete cfg.assets.variantenkarte; }) });
      const d = await lies(s.page);
      gleich([d.ladezustand, d.karten.length, d.retrySichtbar, d.nachrichtSichtbar, d.nachricht], ['error', 0, false, true, deL.reload_needed], 'M7: veraltetes Dokument: Satz «bitte neu laden», kein Knopf «Erneut versuchen»');
      pruef(s.seitenfehler.length === 0, `M7: Seitenfehler: ${s.seitenfehler.slice(0, 2).join(' | ')}`);
      await s.ctx.close();
    }
    // M8 Vorabruf: Karte und Ausblenden-Datei starten zugleich mit dem Index (der Index antwortet absichtlich erst nach 250 ms; nacheinander begännen sie 250 ms später)
    {
      const s = await oeffne(browser, vp, { ...grund, indexVerzoegerung: 250 });
      const t = await s.page.evaluate(() => { const r = performance.getEntriesByType('resource'); const f = (n) => r.find((e) => e.name.includes(n)); return { index: f('luxe-clothing-index.json')?.startTime, indexEnde: f('luxe-clothing-index.json')?.responseEnd, karte: f('variantenkarte')?.startTime, ausb: f('ausblenden')?.startTime }; });
      erg.daten.vorabruf = t;
      pruef([t.index, t.indexEnde, t.karte, t.ausb].every((x) => typeof x === 'number') && t.indexEnde - t.index >= 200 && t.karte - t.index < 80 && t.ausb - t.index < 80, `M8: Karte (${Math.round(t.karte - t.index)} ms) und Ausblenden (${Math.round(t.ausb - t.index)} ms) starten zugleich mit dem Index (Index ${Math.round(t.indexEnde - t.index)} ms unterwegs)`);
      const d = await lies(s.page); gleich(d.ladezustand, 'ready', 'M8: Katalog lädt mit dem Vorabruf');
      await s.ctx.close();
    }
  }

  // ===== N. Knöpfe unten bündig in jeder Reihe (1440, 1024, 768, 390 px), auch wenn die erste Karte einen sehr langen Titel hat =====
  for (const breite of SCHNELL ? [1440, 768] : [1440, 1024, 768, 390]) {
    const s = await oeffne(browser, { width: breite, height: breite === 390 ? 844 : 900 }, grund);
    for (const langerTitel of [false, true]) {
      const reihen = await s.page.evaluate((lang) => {
        const cards = [...document.querySelectorAll('.lcl-card')];
        if (lang) cards[0].querySelector('h3').textContent = 'Sehr langer Titel zum Prüfen der Ausrichtung '.repeat(6);
        const rows = new Map();
        cards.forEach((card) => { const c = card.getBoundingClientRect(), b = card.querySelector('.lcl-design-cta').getBoundingClientRect(), d = card.querySelector('.lcl-card-cta').getBoundingClientRect(); const key = Math.round(c.top); if (!rows.has(key)) rows.set(key, []); rows.get(key).push({ buyTop: b.top, boden: c.bottom - d.bottom }); });
        return [...rows.values()].map((r) => ({ n: r.length, buyTop: Math.max(...r.map((x) => x.buyTop)) - Math.min(...r.map((x) => x.buyTop)), boden: Math.max(...r.map((x) => x.boden)) - Math.min(...r.map((x) => x.boden)), bodenMax: Math.max(...r.map((x) => x.boden)) }));
      }, langerTitel);
      const mehr = reihen.filter((r) => r.n > 1);
      pruef(mehr.length >= 1 && mehr.every((r) => r.buyTop <= 1.5 && r.boden <= 1.5 && r.bodenMax <= 24), `N ${breite}${langerTitel ? ' (erste Karte mit sehr langem Titel)' : ''}: in jeder Reihe liegen die Knöpfe auf gleicher Höhe und unten bündig: ${JSON.stringify(reihen)}`);
      erg.daten[`ausrichtung${breite}${langerTitel ? 'Lang' : ''}`] = reihen.map((r) => [r.n, Math.round(r.buyTop), Math.round(r.boden)]);
    }
    await s.ctx.close();
  }

  // ===== I. Der Knopf führt auf eine echte Produktseite mit dem Bestell-Editor (ein Live-Abruf, nur ohne LOKAL) =====
  if (!LOKAL) {
    const href = 'https://luxestyle.ch/products/' + (offers.find((o) => o.title.includes('Tasse')) || offers[0]).url.slice('/products/'.length);
    const s = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'de-CH' }); const p = await s.newPage();
    await s.route('**/*', (r) => { const h = new URL(r.request().url()).hostname; if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing/i.test(h)) return r.abort(); return r.continue(); });
    const resp = await p.goto(href + '#lspod-start', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForTimeout(2500);
    const ed = await p.evaluate(() => ({ anker: !!document.getElementById('lspod-start'), titel: document.title, canvas: !!document.querySelector('canvas, [data-lspod], .lspod'), hash: location.hash }));
    erg.daten.editorSeite = { href, status: resp.status(), ...ed };
    pruef(resp.status() === 200 && ed.anker, `I: Produktseite ${href} hat den Editor-Anker #lspod-start (${JSON.stringify(ed)})`);
    await s.close();
  }

  await browser.close();
  console.log(JSON.stringify(erg.daten, null, 1));
  console.log(`${pruefungen} Prüfungen, FEHLER: ${erg.fehler.length}`);
  erg.fehler.forEach((f) => console.log(' -', f));
  process.exit(erg.fehler.length ? 1 : 0);
})().catch((e) => { console.error('ABBRUCH', e && e.stack ? e.stack : e); console.log(`${pruefungen} Prüfungen bis zum Abbruch, FEHLER bisher: ${erg.fehler.length}`); erg.fehler.forEach((f) => console.log(' -', f)); process.exit(1); });
