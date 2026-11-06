// LX-KATALOGTEXTE-0511: Browsertest. Der Live-Shop bleibt UNVERÄNDERT: JS, Textdatei und Section-Konfiguration werden nur im Browser per route() ersetzt.
// Aufruf: NODE_PATH=$(/opt/node22/bin/npm root -g) /opt/node22/bin/node test_texte.cjs [schnell|voll|szenarien]
const { chromium } = require('playwright');
const fs = require('fs');
const B = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/work/bau/';
const TH = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/ds/theme/';
const SEITE = 'https://luxestyle.ch/collections/selbst-gestalten-1?view=luxe-gestalten';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MODUS = process.argv[2] || 'schnell';

const patchedJs = fs.readFileSync(B + 'theme/assets__luxe-clothing.js', 'utf8');
const origJs = fs.readFileSync(B + 'theme/assets__luxe-clothing.js.orig', 'utf8');
const textsRoh = fs.readFileSync(B + 'luxe-clothing-texts-de.json', 'utf8');
const T = JSON.parse(textsRoh);
const deLocale = fs.readFileSync(B + 'theme/locales__de.json', 'utf8');
const NOTE_DE = /"original_note_translated":\s*"([^"]+)"/.exec(deLocale)[1];
const NOTE_ALT = /"original_note":\s*"([^"]+)"/.exec(deLocale)[1];
const LOCALE_DE = JSON.parse(deLocale.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).luxe_clothing;
const NEUE_ETIKETTEN = ['original_variants_one', 'supplier_out_of_stock', 'stocked_on_demand', 'status_unknown'];
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

// ---- Browser-Aufbau ----
async function neuerKontext(browser, vp, opt) {
  const ctx = await browser.newContext({ viewport: vp, userAgent: UA, locale: opt.locale || 'de-CH' });
  const zaehler = { texte: 0, js: 0 };
  ctx.on('request', (r) => { if (/luxe-clothing-texts-de\.json/.test(r.url())) zaehler.texte++; });
  await ctx.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (/clarity|facebook|tiktok|google|doubleclick|analytics|klaviyo|judge|hotjar|bing|pinterest|snap|sentry/i.test(u.hostname)) return route.abort();
    if (/\/assets\/luxe-clothing\.js$/.test(u.pathname)) { zaehler.js++; return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: opt.js === 'alt' ? origJs : patchedJs }); }
    if (/\/assets\/luxe-clothing-texts-de\.json$/.test(u.pathname)) {
      const m = opt.texte || 'datei';
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
    if (/\/collections\/selbst-gestalten[^/]*$/.test(u.pathname) && route.request().resourceType() === 'document' && opt.konfig !== false) {
      const resp = await route.fetch();
      let html = await resp.text();
      html = html.replace(/(<script type="application\/json" data-lcl-config>)([\s\S]*?)(<\/script>)/, (m, a, json, c) => {
        const cfg = JSON.parse(json);
        cfg.textsAsset = String(cfg.presentationAsset).replace('luxe-clothing-reference-gallery.json', 'luxe-clothing-texts-de.json').replace(/\?v=\d+/, '?v=lxtest');
        cfg.labels.original_note_translated = NOTE_DE; // spiegelt die Section/Locale-Änderung
        for (const k of NEUE_ETIKETTEN) cfg.labels[k] = LOCALE_DE[k];
        if (opt.etikettFehlt) { delete cfg.labels.original_note_translated; for (const k of NEUE_ETIKETTEN) delete cfg.labels[k]; }
        if (opt.etikettMissing) { for (const k of ['original_note_translated', ...NEUE_ETIKETTEN]) cfg.labels[k] = 'translation missing: de.luxe_clothing.' + k; }
        if (opt.sprache) cfg.locale = opt.sprache;
        zaehler.locale = cfg.locale;
        return a + JSON.stringify(cfg) + c;
      });
      const h = { ...resp.headers() }; delete h['content-encoding']; delete h['content-length'];
      return route.fulfill({ status: resp.status(), headers: h, body: html });
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
const STATUS_DE = { in_stock: LOCALE_DE.in_stock, out_of_stock: LOCALE_DE.out_of_stock, not_available: LOCALE_DE.not_available, supplier_out_of_stock: LOCALE_DE.supplier_out_of_stock, stocked_on_demand: LOCALE_DE.stocked_on_demand };
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
function pruefeNeu(id, d, n) {
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
  const einzahl = d.kleinTexte.find((x) => /Originalvariante/.test(x)); const anz = (p.variants || []).length;
  if (einzahl && anz === 1) ok(/^1 Originalvariante /.test(einzahl), n + ' Singular bei einer Variante', einzahl);
  ok(!/translation missing/i.test(d.dialogText), n + ' kein «translation missing» im Fenster');
}

// ---- Prüfung eines Modells im Zustand «Deutsch mit Textdatei» ----
function pruefeDeutsch(id, d, vpName) {
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
  pruefeNeu(id, d, n);
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
  const { ctx, page } = await neuerKontext(browser, { width: 1280, height: 900 }, { js: 'alt', konfig: false, locale: opt.locale });
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

(async () => {
  const browser = await chromium.launch();
  const t0 = Date.now();
  if (MODUS === 'schnell' || MODUS === 'alles') { await pruefeFrische(browser); await laufeSchnell(browser); }
  if (MODUS === 'szenarien' || MODUS === 'alles') { await laufeSzenarien(browser); }
  if (MODUS === 'voll') { await laufeVoll(browser); }
  await browser.close();
  if (overflowEingefasst.length) console.log('Hinweis: Elemente rechts ausserhalb des Fensters, aber in scrollenden/abgeschnittenen Containern (Farbreihen, Vorschaubilder) eingefasst, daher kein Seitenüberlauf:', overflowEingefasst.length, 'Fälle, z. B.', overflowEingefasst.slice(0, 4).join(', '));
  console.log('\nERGEBNIS [' + MODUS + ']: ' + pass + ' bestanden, ' + fail + ' fehlgeschlagen, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (fail) { console.log('Fehlgeschlagen:\n - ' + fehlerListe.slice(0, 40).join('\n - ')); process.exit(1); }
})().catch((e) => { console.error('ABBRUCH', e.stack || e.message); process.exit(2); });
