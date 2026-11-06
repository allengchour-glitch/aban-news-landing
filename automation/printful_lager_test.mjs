// Verhaltenstest des Printful-Lager-Wächters (automation/printful_lager.mjs) gegen eine gefälschte Welt: Printful, Shopify (GraphQL), Telegram, Zeit.
// Geprüft wird, was GESENDET wird (Mutationen, Theme-Datei, Telegram), nicht nur, was berechnet wird. Der Fake-Shopify antwortet nur auf die Abfragen und
// Mutationen, die der Wächter wirklich stellt; jede Mutation im Trockenlauf, jede Printful-Anfrage ausserhalb der Erlaubnisliste und jede Anfrage an Fortura-/CJ-Ware
// lässt den Test scheitern. Kein Netz, keine echte Zeit (die Uhr springt mit jedem sleep).
// Lauf: /opt/node22/bin/node automation/printful_lager_test.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { main } from './printful_lager.mjs';
import { ausblendenText, ausblendenPruefen, TAG_AUS, REGELN } from './lib/printful_lager.mjs';

let n = 0;
const ok = (b, t) => { assert.ok(b, t); n++; };
const gleich = (a, b, t) => { assert.deepStrictEqual(a, b, t); n++; };
const md5 = (t) => createHash('md5').update(t).digest('hex');
const START = Date.parse('2026-11-06T02:13:00Z');
const tmpDirs = [];

// ───────────────────────────────────────────────────────────── die gefälschte Welt
const AUS = { EU: 'supplier_out_of_stock', US: 'supplier_out_of_stock' }, DA = { EU: 'in_stock', US: 'in_stock' };
const stat = (m) => Object.entries(m).map(([region, status]) => ({ region, status }));
const THEME_ID = 'gid://shopify/OnlineStoreTheme/1', DATEI = 'assets/luxe-clothing-ausblenden.json';
const SHOPORT = { id: 'gid://shopify/Location/1', isFulfillmentService: false }, DIENST = { id: 'gid://shopify/Location/9', isFulfillmentService: true };

function modell(id, o = {}) {
  const vs = o.status || [DA, DA, DA];
  return { id, rate: o.rate || 'ok', discontinued: !!o.discontinued, varianten: vs.map((s, i) => ({ id: id * 100 + i + 1, status: s })), skript: o.skript || [], versionen: o.versionen ? o.versionen.map((vs) => vs.map((st2, i) => ({ id: id * 100 + i + 1, status: st2 }))) : null, antworten: 0, rateAnfragen: 0, rateSkript: o.rateSkript || [] };
}
const variante = (id, sku, o = {}) => ({ id, sku, inventoryPolicy: o.policy || 'CONTINUE', sperre: o.sperre != null ? { value: o.sperre } : null, inventoryItem: { id: 'gid://II/' + id, tracked: !!o.tracked, inventoryLevels: { nodes: o.tracked ? [{ quantities: [{ name: 'available', quantity: o.menge ?? 0 }], location: o.ort || SHOPORT }] : [{ quantities: [{ name: 'available', quantity: 0 }], location: SHOPORT }] } } });
const KANAELE = ['301970915713', '301971014017'];                  // Online Store, Shop
const produkt = (nr, status, varianten, tags = ['wunschdesign', 'printful_personalized_product']) => ({ id: 'gid://shopify/Product/' + nr, handle: 'produkt-' + nr, status, tags: [...tags], pubs: status === 'ACTIVE' ? [...KANAELE] : [], marker: null, variants: { nodes: varianten } });

function standardWelt() {
  const w = {
    modelle: new Map(), pfAuth: null, req: [], mut: [], tg: [], oauth: 0, seite: 2, cursorHaengt: false, productQueries: 0,
    produkte: [
      produkt(1, 'ACTIVE', [variante('gid://V/a1', '5000_1001'), variante('gid://V/a2', '5000_1002'), variante('gid://V/a3', '5000_1003')]),
      produkt(2, 'ACTIVE', [variante('gid://V/b1', '6000_1101'), variante('gid://V/b2', '6000_1102')]),
      produkt(3, 'ACTIVE', [1201, 1202, 1203].map((v) => variante('gid://V/c' + v, '7000_' + v, { tracked: true, menge: 9999, ort: DIENST }))),
      produkt(4, 'ACTIVE', [variante('gid://V/d1', '8000_1301'), variante('gid://V/d2', '8000_1302')]),
      produkt(5, 'DRAFT', [variante('gid://V/e1', '9000_1401'), variante('gid://V/e2', '9000_1402')]),
      produkt(6, 'ACTIVE', [variante('gid://V/f1', 'fortura-12345')], ['fortura', 'printful_personalized_product']),
      produkt(7, 'ACTIVE', [variante('gid://V/g1', 'WM-TRIKOT-RO1'), variante('gid://V/g2', 'MUGSET-KINGQ')]),
      produkt(8, 'ACTIVE', [variante('gid://V/h1', '4000_1501'), variante('gid://V/h2', '4000_1502', { tracked: true, menge: 0 }), variante('gid://V/h3', '4000_1503')]),
      produkt(9, 'ACTIVE', [variante('gid://V/m1', '3000_1601')], ['mode']),
    ],
    theme: { vorhanden: true, text: ausblendenText({ schemaVersion: 1, stand: '2026-11-05', quelle: 'Q', modelle: [20, 21], varianten: {} }), leseVerzug: 0, nachErstemLesen: null, upsertIgnorieren: false, userErrors: false, lesen: 0 },
    fehler: { productUpdateIgnorieren: false, productUpdateUserErrors: false, tgAus: false },
  };
  for (let id = 10; id <= 19; id++) w.modelle.set(id, modell(id));
  w.modelle.set(20, modell(20, { rate: 'keine' }));
  w.modelle.set(21, modell(21));
  return w;
}
const basisDateien = () => ({
  modelle: { modelle: Array.from({ length: 12 }, (_, i) => { const id = 10 + i; return { id, klasse: id === 21 ? 'UNGEEIGNET' : 'FLACH', nVarianten: 3, versandCH: id === 20 ? null : { rateUsd: 10, tageMin: 3, tageMax: 6 }, bestellbarCH: id !== 20 && id !== 21, grund: id === 20 ? 'keine Schweizer Versandrate' : id === 21 ? 'technisch ungeeignet (x)' : null }; }) },
  ausblenden: { modelle_ausblenden: [20, 21], varianten_ausblenden: {} },
});

const antwortHttp = (status, body, kopf = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: (k) => kopf[String(k).toLowerCase()] ?? null }, json: async () => (typeof body === 'string' ? JSON.parse(body) : body), text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

function fetchFuer(w) {
  const pfModellAntwort = (m) => {
    const aktuell = m.versionen ? m.versionen[Math.min(m.antworten - 1, m.versionen.length - 1)] : m.varianten;
    return antwortHttp(200, { code: 200, result: { product: { id: m.id, title: 'Modell ' + m.id, is_discontinued: m.discontinued }, variants: aktuell.map((v) => ({ id: v.id, name: 'v', availability_status: stat(v.status) })) } });
  };
  return async (url, init = {}) => {
    const methode = (init.method || 'GET').toUpperCase();
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    w.req.push({ host: u.host, methode, pfad: u.pathname, body });
    if (u.host === 'api.printful.com') {
      if (w.pfAuth) return antwortHttp(w.pfAuth, { code: w.pfAuth, result: 'Forbidden' });
      const gm = /^\/products\/(\d+)$/.exec(u.pathname);
      if (methode === 'GET' && gm) {
        const m = w.modelle.get(Number(gm[1]));
        if (!m) return antwortHttp(404, { code: 404, result: 'Not Found' });
        m.antworten++;
        const s = m.skript.shift();
        if (s === '429') return antwortHttp(429, { code: 429, result: 'Too many' }, { 'retry-after': '3' });
        if (s === '500') return antwortHttp(500, { code: 500 });
        if (s === 'halb') return antwortHttp(200, '{"code":200,"result":{"product":{"id":' + m.id + ',"title":"Mod');
        if (s === 'ohneVarianten') return antwortHttp(200, { code: 200, result: { product: { id: m.id }, variants: [] } });
        if (s === '404') return antwortHttp(404, { code: 404, result: 'Not Found' });
        return pfModellAntwort(m);
      }
      if (methode === 'POST' && u.pathname === '/shipping/rates') {
        const vid = body.items[0].variant_id;
        const m = [...w.modelle.values()].find((x) => x.varianten.some((v) => v.id === vid) || (x.versionen || []).some((vv) => vv.some((v) => v.id === vid)));
        if (!m) return antwortHttp(400, { code: 400, result: `Invalid variant ID: ${vid}` });
        m.rateAnfragen++;
        const s = m.rateSkript.shift() || m.rate;
        if (s === 'keine') return antwortHttp(400, { code: 400, result: 'This product "X" ships to Australia, New Zealand only and the current shipping address is outside of this region.' });
        if (s === 'aus') return antwortHttp(400, { code: 400, result: 'Order contains products that are out of stock' });
        if (s === '500') return antwortHttp(500, { code: 500 });
        return antwortHttp(200, { code: 200, result: [{ id: 'STANDARD', rate: '10.79', currency: 'USD', minDeliveryDays: 6, maxDeliveryDays: 9 }] });
      }
      return antwortHttp(405, { code: 405 });
    }
    if (u.host === 'api.telegram.org') { w.tg.push(body.text); return antwortHttp(w.fehler.tgAus ? 500 : 200, { ok: !w.fehler.tgAus }); }
    if (u.pathname === '/admin/oauth/access_token') { w.oauth++; return antwortHttp(200, { access_token: 'tok' }); }
    if (u.pathname.endsWith('/graphql.json')) {
      w.apiVersion = /admin\/api\/([^/]+)\//.exec(u.pathname)[1];
      const q = body.query, v = body.variables || {};
      const daten = gql(w, q, v);
      return antwortHttp(200, daten);
    }
    throw new Error('Unerwartete Anfrage ' + methode + ' ' + url);
  };
}
function produktAusgabe(p, voll) {
  return { id: p.id, handle: p.handle, status: p.status, tags: [...p.tags], kanaele: p.marker ? { value: p.marker } : null, resourcePublications: { nodes: p.pubs.map((x) => ({ isPublished: true, publication: { id: 'gid://shopify/Publication/' + x } })) }, variants: { pageInfo: { hasNextPage: !!p.mehrVarianten }, nodes: p.variants.nodes.map((x) => (voll ? x : { id: x.id, sku: x.sku, inventoryPolicy: x.inventoryPolicy, sperre: x.sperre })) } };
}
function gql(w, q, v) {
  const fehler = (m) => ({ errors: [{ message: m }] });
  if (q.includes('themes(first')) return { data: { themes: { nodes: [{ id: THEME_ID, name: 'MAIN' }] } } };
  if (q.includes('theme(id:$id)') && q.includes('files(filenames')) {
    w.theme.lesen++;
    if (!w.theme.vorhanden) return { data: { theme: { files: { nodes: [], userErrors: [{ code: 'NOT_FOUND', filename: v.f[0] }] } } } };
    if (w.theme.nachErstemLesen && w.theme.lesen === 2) w.theme.text = w.theme.nachErstemLesen;
    const text = w.theme.leseVerzug > 0 && w.theme.alt != null ? (w.theme.leseVerzug--, w.theme.alt) : w.theme.text;
    return { data: { theme: { files: { nodes: [{ filename: v.f[0], checksumMd5: md5(text), body: { __typename: 'OnlineStoreThemeFileBodyText', content: text } }], userErrors: [] } } } };
  }
  if (q.includes('products(first')) {
    w.productQueries++;
    const start = v.c ? Number(v.c) : 0;
    const liste = w.produkte.filter((p) => p.tags.some((t) => ['printful_personalized_product', 'wunschdesign'].includes(t)));
    const seite = liste.slice(start, start + w.seite);
    const naechster = start + w.seite;
    return { data: { products: { pageInfo: { hasNextPage: naechster < liste.length, endCursor: w.cursorHaengt ? String(start) : String(naechster) }, nodes: seite.map((p) => produktAusgabe(p, true)) } } };
  }
  if (q.includes('product(id:$id)')) { const p = w.produkte.find((x) => x.id === v.id); return { data: { product: p ? produktAusgabe(p, false) : null } }; }
  if (q.startsWith('mutation')) {
    const p = (id) => w.produkte.find((x) => x.id === id);
    if (q.includes('productUpdate(product:$p)')) {
      w.mut.push({ typ: 'productUpdate', ziel: v.p.id, status: v.p.status });
      if (w.fehler.productUpdateUserErrors) return { data: { productUpdate: { product: null, userErrors: [{ field: ['status'], message: 'abgelehnt' }] } } };
      if (!w.fehler.productUpdateIgnorieren) { p(v.p.id).status = v.p.status; if (v.p.status === 'DRAFT') p(v.p.id).pubs = []; }   // Shopify nimmt einen Entwurf aus allen Kanälen (GEMESSEN 06.11.2026)
      return { data: { productUpdate: { product: { id: v.p.id, status: v.p.status }, userErrors: [] } } };
    }
    if (q.includes('tagsAdd(')) { w.mut.push({ typ: 'tagsAdd', ziel: v.id, tags: v.tags }); const pp = p(v.id); for (const t of v.tags) if (!pp.tags.includes(t)) pp.tags.push(t); return { data: { tagsAdd: { userErrors: [] } } }; }
    if (q.includes('tagsRemove(')) { w.mut.push({ typ: 'tagsRemove', ziel: v.id, tags: v.tags }); const pp = p(v.id); pp.tags = pp.tags.filter((t) => !v.tags.includes(t)); return { data: { tagsRemove: { userErrors: [] } } }; }
    if (q.includes('productVariantsBulkUpdate(')) {
      w.mut.push({ typ: 'variante', ziel: v.v[0].id, produkt: v.p, eingabe: v.v[0] });
      const pp = p(v.p);
      for (const e of v.v) { const x = pp.variants.nodes.find((y) => y.id === e.id); if (e.inventoryPolicy) x.inventoryPolicy = e.inventoryPolicy; if (e.metafields) x.sperre = { value: e.metafields[0].value }; }
      return { data: { productVariantsBulkUpdate: { productVariants: v.v.map((e) => ({ id: e.id })), userErrors: [] } } };
    }
    if (q.includes('metafieldsSet(')) {
      const m0 = v.m[0]; w.mut.push({ typ: 'metafeldSetzen', ziel: m0.ownerId, schluessel: m0.key, wert: m0.value, art: m0.type, ns: m0.namespace });
      if (m0.key === 'printful_lager_kanaele') p(m0.ownerId).marker = m0.value;
      return { data: { metafieldsSet: { metafields: [{ key: m0.key }], userErrors: [] } } };
    }
    if (q.includes('publishablePublish(')) {
      w.mut.push({ typ: 'publish', ziel: v.id, publikationen: v.in.map((x) => x.publicationId) });
      if (!w.fehler.publishIgnorieren) for (const x of v.in) p(v.id).pubs.push(x.publicationId.split('/').pop());
      return { data: { publishablePublish: { userErrors: [] } } };
    }
    if (q.includes('metafieldsDelete(')) {
      w.mut.push({ typ: 'metafeldWeg', ziel: v.m[0].ownerId, schluessel: v.m[0].key });
      if (v.m[0].key === 'printful_lager_kanaele') p(v.m[0].ownerId).marker = null;
      for (const pp of w.produkte) for (const x of pp.variants.nodes) if (x.id === v.m[0].ownerId) x.sperre = null;
      return { data: { metafieldsDelete: { deletedMetafields: [{ key: v.m[0].key }], userErrors: [] } } };
    }
    if (q.includes('themeFilesUpsert(')) {
      w.mut.push({ typ: 'theme', ziel: v.files[0].filename, text: v.files[0].body.value, art: v.files[0].body.type });
      if (w.theme.userErrors) return { data: { themeFilesUpsert: { upsertedThemeFiles: [], userErrors: [{ filename: v.files[0].filename, message: 'abgelehnt' }] } } };
      if (!w.theme.upsertIgnorieren) { w.theme.alt = w.theme.text; w.theme.text = v.files[0].body.value; }
      w.theme.vorhanden = true;
      return { data: { themeFilesUpsert: { upsertedThemeFiles: [{ filename: v.files[0].filename }], userErrors: [] } } };
    }
  }
  return fehler('Unbekannte Abfrage: ' + q.slice(0, 80));
}

// ───────────────────────────────────────────────────────────── ein Lauf
async function lauf(w, env = {}, opt = {}) {
  const dir = opt.dir || mkdtempSync(join(tmpdir(), 'plager-'));
  if (!opt.dir) tmpDirs.push(dir);
  const b = basisDateien();
  if (!existsSync(join(dir, 'modelle.json'))) { writeFileSync(join(dir, 'modelle.json'), JSON.stringify(b.modelle)); writeFileSync(join(dir, 'ausblenden.json'), JSON.stringify(b.ausblenden)); }
  if (opt.freigabe) writeFileSync(join(dir, 'FREI.txt'), 'frei\n');
  const uhr = opt.uhr || { t: START };
  const logs = [], errs = [];
  const e = {
    PRINTFUL_API_KEY: 'pk', PRINTFUL_STORE_ID: '123', SHOPIFY_ADMIN_TOKEN: 'st', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', TELEGRAM_BOT_TOKEN: 'tt', TELEGRAM_CHAT_ID: 'cc',
    BASIS_MODELLE: join(dir, 'modelle.json'), BASIS_AUSBLENDEN: join(dir, 'ausblenden.json'), LEDGER: join(dir, 'ledger.txt'), ZUSTAND_DATEI: join(dir, 'zustand.json'),
    FREIGABE_DATEI: join(dir, 'FREI.txt'), GITHUB_STEP_SUMMARY: join(dir, 'summary.md'), PF_ABSTAND_MS: '0', WARTE_THEME_MS: '30000', ...env,
  };
  for (const k of Object.keys(e)) if (e[k] === null) delete e[k];
  const code = await main(e, { fetch: fetchFuer(w), sleep: async (ms) => { uhr.t += ms; }, now: () => uhr.t, log: (...a) => logs.push(a.join(' ')), err: (...a) => errs.push(a.join(' ')) });
  if (process.env.PL_DEBUG) console.log(`--- Lauf (Exit ${code})\n${logs.join('\n')}\n${errs.map((x) => 'ERR ' + x).join('\n')}`);
  return { code, logs, errs, dir, uhr, text: logs.join('\n'), ledger: existsSync(join(dir, 'ledger.txt')) ? readFileSync(join(dir, 'ledger.txt'), 'utf8') : '' };
}
const LIVE = { LIVE: '1' };
const printfulAnfragen = (w) => w.req.filter((r) => r.host === 'api.printful.com');
const nGet = (w, id) => w.req.filter((r) => r.pfad === `/products/${id}`).length;
function allgemein(w, name) {
  // gilt für jeden Lauf: Printful wird nur gelesen, Fremdware wird nie angefasst, kein Zugangsschlüssel im Klartext in der Adresse
  for (const r of printfulAnfragen(w)) ok((r.methode === 'GET' && /^\/products\/\d+$/.test(r.pfad)) || (r.methode === 'POST' && r.pfad === '/shipping/rates'), `${name}: Printful nur GET /products/N oder POST /shipping/rates (${r.methode} ${r.pfad})`);
  for (const m of w.mut) ok(!['gid://shopify/Product/6', 'gid://shopify/Product/7', 'gid://shopify/Product/9', 'gid://V/f1', 'gid://V/g1', 'gid://V/g2', 'gid://V/m1'].includes(m.ziel) && m.produkt !== 'gid://shopify/Product/6', `${name}: Fortura-, CJ-, Mode- und Sonder-SKU-Produkte werden nie angefasst`);
  for (const m of w.mut) ok(m.typ !== 'productUpdate' || ['DRAFT', 'ACTIVE'].includes(m.status), `${name}: nur ENTWURF oder AKTIV, nie ARCHIVIERT oder gelöscht`);
}
const alsEntwurfVonUns = (w, nr, marker = KANAELE.join(',')) => { const p = w.produkte.find((x) => x.id.endsWith('/' + nr)); p.status = 'DRAFT'; p.pubs = []; p.marker = marker; if (!p.tags.includes(TAG_AUS)) p.tags.push(TAG_AUS); };
const status = (w, nr) => w.produkte.find((p) => p.id.endsWith('/' + nr)).status;
const tags = (w, nr) => w.produkte.find((p) => p.id.endsWith('/' + nr)).tags;
const mutTypen = (w) => w.mut.map((m) => m.typ);
const dateiObjekt = (w) => ausblendenPruefen(w.theme.text);

// ═════════════════════════════════════════════════════════════ 0. Trockenlauf ohne Änderung
{
  const w = standardWelt();
  const r = await lauf(w);
  gleich(r.code, 0, '0: Exit 0');
  gleich(w.mut, [], '0: Trockenlauf schreibt nichts');
  gleich(w.tg, [], '0: Trockenlauf sendet kein Telegram');
  ok(/Schreibzugriffe: 0 \(Trockenlauf/.test(r.text), '0: Zusammenfassung nennt 0 Schreibzugriffe');
  ok(/nichts zu ändern/.test(r.text), '0: nichts zu ändern');
  ok(/Datei: unverändert/.test(r.text), '0: Datei unverändert');
  ok(w.productQueries === 4, '0: Shopify-Seitenwechsel über mehrere Seiten gelesen');
  gleich(w.apiVersion, '2026-01', '0: API-Version 2026-01');
  gleich(printfulAnfragen(w).filter((x) => x.methode === 'GET').length, 12, '0: ein Abruf je Modell (12 Modelle)');
  gleich(printfulAnfragen(w).filter((x) => x.methode === 'GET').every((x) => x.body === null), true, '0: GET ohne Körper');
  allgemein(w, '0');
  ok(existsSync(join(r.dir, 'zustand.json')), '0: Zustandsdatei geschrieben (lokal)');
  ok(/Printful-Lager-Wächter/.test(readFileSync(join(r.dir, 'summary.md'), 'utf8')), '0: Zusammenfassung für GitHub geschrieben');
}

// ═════════════════════════════════════════════════════════════ 1. Datei im Theme noch nicht eingespielt
{
  const w = standardWelt(); w.theme.vorhanden = false;
  w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });          // Modell fällt aus
  const r = await lauf(w);
  gleich(r.code, 0, '1: Exit 0 (Trockenlauf)');
  ok(/noch nicht eingespielt \(nichts wird angelegt\)/.test(r.text), '1: Trockenlauf meldet «noch nicht eingespielt»');
  ok(/Datei: wird nicht geschrieben \(noch nicht eingespielt\)/.test(r.text), '1: Datei wird nicht geschrieben');
  gleich(w.mut, [], '1: nichts geschrieben');
  // live: die Datei wird NIE angelegt, das Shop-Produkt wird trotzdem versorgt
  const w2 = standardWelt(); w2.theme.vorhanden = false;
  w2.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich(r2.code, 0, '1: live Exit 0');
  ok(!mutTypen(w2).includes('theme'), '1: live legt die Datei nie an');
  gleich(status(w2, 2), 'DRAFT', '1: das Produkt mit allen ausgefallenen Varianten geht trotzdem auf ENTWURF');
  allgemein(w2, '1');
}

// ═════════════════════════════════════════════════════════════ 2. Variante fällt aus
{
  const w = standardWelt();
  w.modelle.get(10).varianten[1].status = AUS;                                // Variante 1002
  const trocken = await lauf(w);
  gleich(trocken.code, 0, '2: Trockenlauf Exit 0');
  gleich(w.mut, [], '2: Trockenlauf schreibt nichts');
  ok(/ÄNDERN WÜRDE: 0 Shop-Aktion\(en\), Datei neu/.test(trocken.text), '2: Trockenlauf kündigt die neue Datei an');
  ok(/Befund variante-ausverkauft: Variante 5000_1002/.test(trocken.text), '2: Befund für die ausverkaufte Einzelvariante (Strategie B sperrt nicht)');
  const alt = w.theme.text;
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '2: live Exit 0');
  gleich(mutTypen(w), ['theme'], '2: live ändert nur die Datei (Strategie B)');
  const neu = dateiObjekt(w);
  gleich([neu.modelle, neu.varianten], [[20, 21], { 10: [1002] }], '2: die Datei nennt die ausverkaufte Variante');
  gleich(neu.stand, '2026-11-06', '2: Stand erneuert');
  gleich(w.mut[0].art, 'TEXT', '2: Datei als TEXT geschrieben');
  gleich(w.mut[0].ziel, DATEI, '2: richtige Datei');
  ok(r.ledger.includes('printful-lager') && r.ledger.includes(' theme assets/luxe-clothing-ausblenden.json vorher='), '2: Ledger-Zeile mit vorher= vor dem Schreiben');
  ok(r.ledger.includes(JSON.stringify(alt).slice(1, 60)), '2: das Ledger trägt den alten Dateiinhalt');
  gleich(w.tg.length, 1, '2: ein Telegram');
  ok(/Datei neu/.test(w.tg[0]), '2: Telegram nennt die Datei');
  ok(/Datei geschrieben und zurückgelesen/.test(r.text), '2: Rücklesen der Datei bestätigt');
  allgemein(w, '2');
  // zweiter Lauf: unverändert, kein Schreiben, kein Telegram
  w.mut.length = 0; w.tg.length = 0;
  const r2 = await lauf(w, LIVE, { freigabe: true, dir: r.dir, uhr: r.uhr });
  gleich(r2.code, 0, '2: zweiter Lauf Exit 0');
  gleich(w.mut, [], '2: zweiter Lauf schreibt nichts mehr');
  gleich(w.tg, [], '2: zweiter Lauf schickt kein Telegram');
  ok(/Datei: unverändert/.test(r2.text), '2: Datei unverändert');
}

// ═════════════════════════════════════════════════════════════ 3. Modell fällt aus (alle Varianten) -> ENTWURF
{
  const w = standardWelt();
  w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const trocken = await lauf(w);
  gleich([trocken.code, w.mut], [0, []], '3: Trockenlauf Exit 0 ohne Schreiben');
  ok(/\[würde\] entwurf produkt-2 \(variante-ausverkauft\)/.test(trocken.text) || /\[würde\] entwurf produkt-2 \(ueberall-ausverkauft\)/.test(trocken.text), '3: Trockenlauf nennt den ENTWURF');
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '3: live Exit 0');
  gleich(mutTypen(w), ['metafeldSetzen', 'tagsAdd', 'productUpdate', 'theme'], '3: Reihenfolge Kanäle merken, Tag, Status, Datei');
  gleich([w.mut[0].schluessel, w.mut[0].ns, w.mut[0].wert, w.mut[0].art, w.mut[0].ziel], ['printful_lager_kanaele', 'luxe', KANAELE.join(','), 'single_line_text_field', 'gid://shopify/Product/2'], '3: die Verkaufskanäle werden VOR dem ENTWURF im Produktfeld gemerkt');
  gleich([w.mut[1].tags, w.mut[2].status, w.mut[2].ziel], [[TAG_AUS], 'DRAFT', 'gid://shopify/Product/2'], '3: Tag und Entwurf am richtigen Produkt');
  ok(r.ledger.includes('"kanaele":["301970915713","301971014017"]'), '3: Ledger trägt die Kanäle');
  gleich([status(w, 2), tags(w, 2).includes(TAG_AUS)], ['DRAFT', true], '3: frisch gelesen: ENTWURF mit unserem Tag');
  ok(nGet(w, 11) >= 3, '3: Nachprüfung liest das Modell vor dem ENTWURF noch einmal frisch (trocken 1, live 2)');
  ok(dateiObjekt(w).modelle.includes(11), '3: Modell steht in der Datei');
  ok(r.ledger.includes('entwurf gid://shopify/Product/2 vorher={"status":"ACTIVE"'), '3: Ledger mit vorher=ACTIVE');
  gleich(status(w, 3), 'ACTIVE', '3: Produkt am Dienst-Standort (anderes Modell) unberührt');
  ok(/auf ENTWURF/.test(w.tg[0]) && /neu ausgeblendet: 11/.test(w.tg[0]), '3: Telegram nennt ENTWURF und das Modell');
  allgemein(w, '3');
}

// ═════════════════════════════════════════════════════════════ 4. Rückkehr
{
  const w = standardWelt();
  w.theme.text = ausblendenText({ schemaVersion: 1, stand: '2026-11-05', quelle: 'Q', modelle: [11, 13, 20, 21], varianten: { 10: [1002] } });
  alsEntwurfVonUns(w, 2); alsEntwurfVonUns(w, 4);   // von uns entworfen; Modell 11 und 13 sind wieder da
  // Produkt 4 (DRAFT mit Tag, Modell 13) kommt ebenfalls zurück; Produkt 5 (DRAFT ohne Tag, Modell 14) bleibt Entwurf
  w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[2].sperre = { value: 'CONTINUE' };           // von uns gesperrte Variante (1503), wieder lieferbar
  w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[2].inventoryPolicy = 'DENY';
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '4: Exit 0');
  gleich([status(w, 2), tags(w, 2).includes(TAG_AUS)], ['ACTIVE', false], '4: von uns entworfenes Produkt ist wieder aktiv, Tag weg');
  gleich([status(w, 4), tags(w, 4).includes(TAG_AUS)], ['ACTIVE', false], '4: zweites Produkt zurück');
  gleich([status(w, 5), w.mut.some((m) => m.ziel === 'gid://shopify/Product/5')], ['DRAFT', false], '4: Entwurf ohne unser Tag bleibt Entwurf und wird nie angefasst');
  const h3 = w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[2];
  gleich([h3.inventoryPolicy, h3.sperre], ['CONTINUE', null], '4: gesperrte Variante wieder frei, Markierung entfernt');
  const f = dateiObjekt(w);
  gleich([f.modelle, f.varianten], [[20, 21], {}], '4: Datei: 11 und 13 sind zurück, die Variante 1002 ist wieder da');
  ok(/wieder da: 11, 13/.test(r.text), '4: Log nennt die Rückkehr');
  for (const nr of [2, 4]) { const pp = w.produkte.find((x) => x.id.endsWith('/' + nr)); gleich([[...pp.pubs].sort(), pp.marker], [KANAELE, null], `4: Produkt ${nr}: Verkaufskanäle wiederhergestellt, Merkfeld entfernt`); }
  gleich(w.mut.filter((m) => m.typ === 'publish').map((m) => m.publikationen).sort(), [KANAELE.map((k) => 'gid://shopify/Publication/' + k), KANAELE.map((k) => 'gid://shopify/Publication/' + k)], '4: genau die gemerkten Kanäle, keine anderen');
  gleich(mutTypen(w).filter((t) => t !== 'theme').slice(0, 5), ['productUpdate', 'publish', 'tagsRemove', 'metafeldWeg', 'productUpdate'], '4: Reihenfolge: aktiv, veröffentlichen, Tag weg, Merkfeld weg');
  // ohne gemerkte Kanalliste: aktivieren, aber melden
  const wK = standardWelt(); alsEntwurfVonUns(wK, 2, null);
  wK.produkte.find((x) => x.id.endsWith('/2')).marker = null;
  const rK = await lauf(wK, LIVE, { freigabe: true });
  gleich([rK.code, status(wK, 2), wK.mut.some((m) => m.typ === 'publish')], [0, 'ACTIVE', false], '4: ohne Kanalliste wird aktiviert, nichts erfunden');
  ok(/keine gemerkte Kanalliste/.test(rK.text), '4: Befund «keine gemerkte Kanalliste»');
  // Veröffentlichen schlägt still fehl: Fehler
  const wP = standardWelt(); alsEntwurfVonUns(wP, 2); wP.fehler.publishIgnorieren = true;
  const rP = await lauf(wP, LIVE, { freigabe: true });
  gleich(rP.code, 1, '4: Kanäle nicht wiederhergestellt: Exit 1');
  ok(rP.errs.some((x) => /Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt/.test(x)), '4: Meldung');
  allgemein(wK, '4K'); allgemein(wP, '4P');
  ok(w.mut.filter((m) => m.typ === 'productUpdate').every((m) => m.status === 'ACTIVE'), '4: nur Aktivierungen');
  allgemein(w, '4');
}

// ═════════════════════════════════════════════════════════════ 5. Strategie A, B und der Dienst-Standort
{
  const bauen = () => { const w = standardWelt(); w.modelle.get(15).varianten[1].status = AUS; w.modelle.get(12).varianten[0].status = AUS; return w; };   // 1502 (getrackt am Shop-Standort) und 1201 (Dienst-Standort)
  const wB = bauen();
  const rB = await lauf(wB, LIVE, { freigabe: true });
  gleich(rB.code, 0, '5: B Exit 0');
  ok(!mutTypen(wB).includes('variante'), '5: Strategie B ändert keine Variante');
  ok(/Befund variante-ausverkauft: Variante 4000_1502/.test(rB.text) && /Befund variante-ausverkauft: Variante 7000_1201/.test(rB.text), '5: B meldet beide als Befund');
  allgemein(wB, '5 B');
  for (const strat of ['A', 'auto']) {
    const w = bauen();
    const r = await lauf(w, { ...LIVE, STRATEGIE: strat }, { freigabe: true });
    gleich(r.code, 0, `5: ${strat} Exit 0`);
    const vm = w.mut.filter((m) => m.typ === 'variante');
    gleich(vm.length, 1, `5: ${strat} sperrt genau eine Variante`);
    gleich([vm[0].ziel, vm[0].eingabe.inventoryPolicy, vm[0].eingabe.metafields[0].key, vm[0].eingabe.metafields[0].value, vm[0].produkt], ['gid://V/h2', 'DENY', 'printful_lager_sperre', 'CONTINUE', 'gid://shopify/Product/8'], `5: ${strat} sperrt die getrackte Variante am Shop-Standort und merkt die alte Einstellung`);
    gleich(w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[1].inventoryPolicy, 'DENY', `5: ${strat} frisch gelesen DENY`);
    ok(/Variante 7000_1201 .*dienststandort/.test(r.text), `5: ${strat} fasst den Dienst-Standort nicht an (Befund)`);
    ok(r.ledger.includes('sperre gid://V/h2 vorher={"produktId":"gid://shopify/Product/8","policy":"CONTINUE"'), `5: ${strat} Ledger mit vorher=`);
    allgemein(w, `5 ${strat}`);
    // Folgetag: Variante wieder lieferbar -> freigeben
    w.modelle.get(15).varianten[1].status = DA; w.mut.length = 0;
    const r2 = await lauf(w, { ...LIVE, STRATEGIE: strat }, { freigabe: true, dir: r.dir, uhr: r.uhr });
    gleich(r2.code, 0, `5: ${strat} Folgetag Exit 0`);
    const x = w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[1];
    gleich([x.inventoryPolicy, x.sperre], ['CONTINUE', null], `5: ${strat} Folgetag: Variante frei, Markierung weg`);
    gleich(w.mut.filter((m) => m.typ === 'variante').length, 1, `5: ${strat} Folgetag: eine Rückstellung`);
  }
  const wX = standardWelt(); wX.fehler.ungueltig = true;
  const rX = await lauf(wX, { STRATEGIE: 'Q' });
  gleich(rX.code, 1, '5: unbekannte Strategie: Exit 1');
}

// ═════════════════════════════════════════════════════════════ 6. Keine Schweizer Versandrate (frisch gemessen) und Nachprüfung
{
  const w = standardWelt(); w.modelle.get(12).rate = 'keine';
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '6: Exit 0');
  gleich([status(w, 3), tags(w, 3).includes(TAG_AUS)], ['DRAFT', true], '6: Produkt ohne Schweizer Rate geht auf ENTWURF (Status ändert den Dienst-Bestand nicht)');
  ok(dateiObjekt(w).modelle.includes(12), '6: Modell 12 ist ausgeblendet');
  gleich(w.modelle.get(12).rateAnfragen, 2, '6: Rate vor dem ENTWURF frisch nachgemessen (einmal im Lauf, einmal vor dem ENTWURF)');
  allgemein(w, '6');
  // Nachprüfung widerruft: die erste Antwort sagt «ausverkauft», die Nachprüfung «lieferbar»
  const w2 = standardWelt();
  w2.modelle.set(11, modell(11, { versionen: [[AUS, AUS, AUS], [DA, DA, DA]] }));
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich(r2.code, 0, '6: flackerndes Modell: Exit 0');
  gleich([status(w2, 2), w2.mut.some((m) => m.typ === 'productUpdate')], ['ACTIVE', false], '6: bei der Nachprüfung nicht mehr ausgefallen: kein ENTWURF');
  ok(/Nachprüfung produkt-2: Ausfall nicht bestätigt, ENTWURF unterbleibt/.test(r2.text), '6: Log nennt die Nachprüfung');
  // Einzelvariante ausverkauft, Modell sonst lieferbar: ENTWURF nur, wenn alle Varianten DES PRODUKTS ausfallen (Produkt 2 zeigt nur 1101 und 1102)
  const w3 = standardWelt(); w3.modelle.get(11).varianten[0].status = AUS; w3.modelle.get(11).varianten[1].status = AUS;
  const r3 = await lauf(w3, LIVE, { freigabe: true });
  gleich([r3.code, status(w3, 2)], [0, 'DRAFT'], '6: alle gelisteten Varianten des Produkts ausverkauft: ENTWURF, obwohl das Modell noch lieferbar ist');
  gleich(dateiObjekt(w3).varianten, { 11: [1101, 1102] }, '6: Datei: die beiden Varianten, nicht das Modell');
  // Teilweise: nur 1101 -> kein ENTWURF
  const w4 = standardWelt(); w4.modelle.get(11).varianten[0].status = AUS;
  await lauf(w4, LIVE, { freigabe: true });
  gleich(status(w4, 2), 'ACTIVE', '6: eine lieferbare Variante: bleibt aktiv');
}

// ═════════════════════════════════════════════════════════════ 7. Fehlerpfade Printful
{
  // a) 429 zweimal, dann gut
  const w = standardWelt(); w.modelle.get(12).skript = ['429', '429'];
  const r = await lauf(w);
  gleich(r.code, 0, '7a: nach 429 und Wiederholung Exit 0');
  gleich(nGet(w, 12), 3, '7a: dreimal abgefragt');
  ok(r.uhr.t - START >= 6000, '7a: Retry-After (3 s) zweimal abgewartet');
  gleich(w.mut, [], '7a: nichts geschrieben');
  // b) 5xx bleibt: das Modell gilt als unbekannt, der Lauf geht weiter (1 von 12 < 10 %)
  const w2 = standardWelt(); w2.modelle.get(13).skript = ['500', '500', '500', '500'];
  w2.theme.text = ausblendenText({ schemaVersion: 1, stand: '2026-11-05', quelle: 'Q', modelle: [13, 20, 21], varianten: {} });
  alsEntwurfVonUns(w2, 4);
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich(r2.code, 0, '7b: ein unbekanntes Modell stoppt den Lauf nicht');
  gleich(nGet(w2, 13), 4, '7b: vier Versuche');
  ok(/unbekannt 13: Printful .*HTTP 500/.test(r2.text), '7b: Log nennt das unbekannte Modell');
  ok(dateiObjekt(w2).modelle.includes(13), '7b: bisheriger Stand (ausgeblendet) bleibt, es wird nichts erraten');
  gleich(status(w2, 4), 'DRAFT', '7b: Produkt zum unbekannten Modell wird nicht reaktiviert');
  // c) halbe Antwort (abgeschnittenes JSON) vier Mal
  const w3 = standardWelt(); w3.modelle.get(14).skript = ['halb', 'halb', 'halb', 'halb'];
  const r3 = await lauf(w3);
  gleich(r3.code, 0, '7c: halbe Antwort: Exit 0');
  ok(/unbekannt 14: Printful .*abgeschnitten/.test(r3.text), '7c: abgeschnittene Antwort erkannt');
  // d) Antwort mit gültigem JSON, aber ohne Varianten
  const w3b = standardWelt(); w3b.modelle.get(14).skript = ['ohneVarianten'];
  const r3b = await lauf(w3b);
  ok(/unbekannt 14: ohne Varianten/.test(r3b.text), '7d: Antwort ohne Varianten gilt als unbekannt');
  // e) zwei unbekannte von zwölf: Bremse, nichts geschrieben, Telegram nur live
  const w4 = standardWelt(); w4.modelle.get(13).skript = ['500', '500', '500', '500']; w4.modelle.get(14).skript = ['500', '500', '500', '500'];
  w4.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const r4 = await lauf(w4, LIVE, { freigabe: true });
  gleich(r4.code, 2, '7e: zu viele unbekannte Modelle: Exit 2');
  gleich(w4.mut, [], '7e: nichts geschrieben');
  ok(/BREMSE zu-viele-unbekannt: 2 von 12/.test(r4.text), '7e: Bremse genannt');
  ok(/ABBRUCH ohne Schreiben/.test(w4.tg[0]), '7e: Telegram meldet den Abbruch');
  // FORCE hebt diese Bremse nicht auf
  w4.modelle.get(13).skript = ['500', '500', '500', '500']; w4.modelle.get(14).skript = ['500', '500', '500', '500'];
  const r4b = await lauf(w4, { ...LIVE, FORCE: '1' }, { freigabe: true });
  gleich([r4b.code, w4.mut.length], [2, 0], '7e: FORCE=1 hebt die Bremse «nicht lesbar» nicht auf');
  // f) 401: Exit 1, nichts geschrieben
  const w5 = standardWelt(); w5.pfAuth = 401;
  const r5 = await lauf(w5, LIVE, { freigabe: true });
  gleich([r5.code, w5.mut.length], [1, 0], '7f: Zugang abgelehnt: Exit 1 ohne Schreiben');
  ok(r5.errs.some((x) => /abgelehnt \(HTTP 401\)/.test(x)), '7f: Fehlermeldung nennt 401');
  gleich(printfulAnfragen(w5).length <= 3, true, '7f: nach dem ersten 401 wird nicht weiter gefragt');
  // g) Zeitlimit: die Uhr läuft ab, der Rest gilt als unbekannt -> Bremse
  const w6 = standardWelt();
  const r6 = await lauf(w6, { ...LIVE, PF_ABSTAND_MS: '2000', RUN_LIMIT_MS: '5000', PF_PARALLEL: '1' }, { freigabe: true });
  gleich(r6.code, 2, '7g: Zeitlimit: Exit 2');
  ok(/Zeitlimit/.test(r6.text), '7g: Log nennt das Zeitlimit');
  gleich(w6.mut, [], '7g: nichts geschrieben');
  ok(printfulAnfragen(w6).length < 12, '7g: nach dem Zeitlimit werden keine weiteren Modelle abgefragt');
  // h) Versandrate: 5xx bei der Preisauskunft ändert nichts (Modell 20 wird jeden Lauf gemessen)
  const w7 = standardWelt(); w7.modelle.get(20).rateSkript = ['500', '500', '500'];
  const r7 = await lauf(w7, LIVE, { freigabe: true });
  gleich(r7.code, 0, '7h: Rate-Fehler: Exit 0');
  gleich(w7.mut, [], '7h: Rate unbekannt: nichts geändert, Modell bleibt ausgeblendet');
  // i) Modell 404 (nicht mehr im Katalog) -> aus
  const w8 = standardWelt(); w8.modelle.delete(16);
  const r8 = await lauf(w8, LIVE, { freigabe: true });
  gleich(r8.code, 0, '7i: 404: Exit 0');
  ok(dateiObjekt(w8).modelle.includes(16), '7i: nicht mehr im Katalog: aus dem Fenster');
  ok(/16 \(nicht-im-katalog\)/.test(r8.text), '7i: Grund genannt');
  // j) nur ausverkaufte Testvarianten in der Preisauskunft: unbekannt, nichts geändert
  const w9 = standardWelt(); w9.modelle.get(20).rate = 'aus';
  const r9 = await lauf(w9, LIVE, { freigabe: true });
  gleich([r9.code, w9.mut.length], [0, 0], '7j: Preisauskunft «ausverkauft»: kein Urteil über die Schweiz');
  allgemein(w, '7a'); allgemein(w2, '7b'); allgemein(w4, '7e'); allgemein(w7, '7h');
}

// ═════════════════════════════════════════════════════════════ 8. Bremsen vor dem Schreiben
{
  const bauen = () => { const w = standardWelt(); for (const id of [10, 12, 13, 14, 15, 16, 17, 18]) w.modelle.get(id).varianten.forEach((v) => { v.status = AUS; }); return w; };
  const w = bauen();
  const r = await lauf(w, { ...LIVE, MAX_NEU_AUS: '3' }, { freigabe: true });
  gleich([r.code, w.mut.length], [2, 0], '8: 8 neu verschwindende Modelle bei Grenze 3: Exit 2, nichts geschrieben');
  ok(/BREMSE zu-viele-neu-aus: 8 Modelle/.test(r.text), '8: Bremse genannt');
  ok(/Grenze 3/.test(r.text), '8: Grenze aus der Umgebung');
  // FORCE=1 hebt diese Bremse auf (Handstart nach Prüfung)
  const rF = await lauf(w, { ...LIVE, MAX_NEU_AUS: '3', FORCE: '1', MAX_ENTWUERFE: '99' }, { freigabe: true });
  gleich(rF.code, 0, '8: FORCE=1: Exit 0');
  ok(/FORCE=1: aufgehoben/.test(rF.text) && w.mut.length > 0, '8: FORCE=1 schreibt');
  // Entwurfs-Bremse
  const w2 = standardWelt(); w2.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const r2 = await lauf(w2, { ...LIVE, MAX_ENTWUERFE: '0' }, { freigabe: true });
  gleich([r2.code, w2.mut.length], [2, 0], '8: Entwurfs-Bremse: Exit 2, nichts geschrieben (auch nicht die Datei)');
  ok(/BREMSE zu-viele-entwuerfe: 1 aktive/.test(r2.text), '8: Bremse genannt');
  // Trockenlauf zeigt die Bremse auch (Exit 2), schreibt nichts
  const r3 = await lauf(w2, { MAX_ENTWUERFE: '0' });
  gleich([r3.code, w2.mut.length], [2, 0], '8: Trockenlauf mit Bremse: Exit 2');
  allgemein(w, '8'); allgemein(w2, '8b');
}

// ═════════════════════════════════════════════════════════════ 9. Freigabe
{
  const w = standardWelt(); w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const r = await lauf(w, LIVE);                                   // LIVE=1, aber keine Freigabedatei
  gleich([r.code, w.mut.length, w.tg.length], [0, 0, 0], '9: ohne Freigabedatei bleibt LIVE=1 ein Trockenlauf');
  ok(/Freigabedatei .* fehlt: Lauf bleibt ein Trockenlauf/.test(r.text), '9: Log erklärt es');
  const r2 = await lauf(w, {}, { freigabe: true });                // Freigabe da, aber LIVE nicht gesetzt
  gleich([r2.code, w.mut.length], [0, 0], '9: Freigabedatei allein schreibt nichts');
  const r3 = await lauf(w, LIVE, { freigabe: true });
  ok(w.mut.length > 0 && r3.code === 0, '9: LIVE=1 mit Freigabedatei schreibt');
}

// ═════════════════════════════════════════════════════════════ 10. Rücknahme aus dem Ledger
{
  const w = standardWelt();
  w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  w.modelle.get(15).varianten[1].status = AUS;
  const originalDatei = w.theme.text;
  const r = await lauf(w, { ...LIVE, STRATEGIE: 'A' }, { freigabe: true });
  gleich(r.code, 0, '10: Einspielen Exit 0');
  gleich([status(w, 2), dateiObjekt(w).modelle.includes(11), w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[1].inventoryPolicy], ['DRAFT', true, 'DENY'], '10: Ausgangslage für die Rücknahme');
  // Trockenlauf der Rücknahme: sagt nur, was sie täte
  const t = await lauf(w, { ZURUECK: '1' }, { dir: r.dir });
  gleich(t.code, 0, '10: Rücknahme im Trockenlauf Exit 0');
  ok(/\[würde\] entwurf zurück auf ACTIVE: produkt-2/.test(t.text), '10: Trockenlauf nennt die Rücknahme');
  gleich(status(w, 2), 'DRAFT', '10: Trockenlauf ändert nichts');
  w.mut.length = 0;
  const z = await lauf(w, { ZURUECK: '1', LIVE: '1' }, { dir: r.dir });                // ohne Freigabedatei: der Rückweg muss auch nach «Datei löschen» gehen
  gleich(z.code, 0, '10: Rücknahme live Exit 0');
  gleich([status(w, 2), tags(w, 2).includes(TAG_AUS), [...w.produkte.find((x) => x.id.endsWith('/2')).pubs].sort()], ['ACTIVE', false, KANAELE], '10: Produkt wieder aktiv, Tag weg, Verkaufskanäle zurück');
  const h = w.produkte.find((p) => p.id.endsWith('/8')).variants.nodes[1];
  gleich([h.inventoryPolicy, h.sperre], ['CONTINUE', null], '10: Variante wieder wie vorher');
  gleich(w.theme.text, originalDatei, '10: Datei wieder Byte für Byte der alte Inhalt');
  ok(/Rücknahme: 3 zurückgesetzt/.test(z.text), '10: drei Rücknahmen (Produkt, Variante, Datei)');
  // zweite Rücknahme: nichts mehr zu tun (der Stand ist nicht mehr der von uns gesetzte)
  w.mut.length = 0;
  const z2 = await lauf(w, { ZURUECK: '1', LIVE: '1' }, { dir: r.dir });
  ok(/Rücknahme: 0 zurückgesetzt, /.test(z2.text) && !mutTypen(w).includes('productUpdate') , '10: zweite Rücknahme ändert nichts');
  allgemein(w, '10');
  // fremd veränderte Datei wird nicht überschrieben
  const w2 = standardWelt(); w2.modelle.get(10).varianten[0].status = AUS;
  const a = await lauf(w2, LIVE, { freigabe: true });
  w2.theme.text = w2.theme.text.replace('2026-11-06', '2026-11-07');                      // jemand ändert die Datei danach
  const fremd = w2.theme.text;
  w2.mut.length = 0;
  const b = await lauf(w2, { ZURUECK: '1', LIVE: '1' }, { dir: a.dir });
  gleich([b.code, w2.theme.text, w2.mut.length], [1, fremd, 0], '10: nach fremder Änderung: Exit 1, Datei bleibt');
  ok(b.errs.some((x) => /wurde nach uns verändert/.test(x)), '10: Meldung nennt den Grund');
  const c = await lauf(w2, { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }, { dir: a.dir });
  gleich(c.code, 0, '10: mit FREMD_UEBERSCHREIBEN=1 geht es');
  ok(dateiObjekt(w2).varianten[10] === undefined, '10: Datei zurückgeschrieben');
  gleich((await lauf(w2, { ZURUECK: '1', LIVE: '1', LEDGER: join(a.dir, 'gibt-es-nicht.txt') }, { dir: a.dir })).code, 1, '10: ohne Ledger: Exit 1');
}

// ═════════════════════════════════════════════════════════════ 11. «nur bei Änderung»: die Versandrate wird nicht jeden Tag für alle gemessen
{
  const w = standardWelt();
  const r1 = await lauf(w);
  const p1 = w.req.filter((x) => x.pfad === '/shipping/rates').length;
  const tagIdx = Math.floor(START / 86400000);
  const scheibe = [...w.modelle.keys()].filter((id) => id % REGELN.scheiben === tagIdx % REGELN.scheiben);
  const erwartet1 = new Set([20, 10, 11, 12, 13, 14, 15, ...scheibe]);    // ch-nein + Modelle mit Shopprodukt + Scheibe
  gleich(w.req.filter((x) => x.pfad === '/shipping/rates').length >= 1 && p1 <= erwartet1.size + 1, true, '11: erster Lauf misst höchstens ch-nein, Shop-Modelle und die Scheibe');
  w.req.length = 0;
  const r2 = await lauf(w, {}, { dir: r1.dir, uhr: r1.uhr });
  const rate2 = w.req.filter((x) => x.pfad === '/shipping/rates');
  const erwartet2 = new Set([20, ...scheibe]);
  ok(rate2.length <= erwartet2.size, `11: zweiter Lauf misst höchstens ch-nein und die Scheibe (${rate2.length} <= ${erwartet2.size})`);
  ok(rate2.length < p1, '11: zweiter Lauf misst weniger als der erste');
  ok(rate2.every((x) => erwartet2.has(Math.floor(x.body.items[0].variant_id / 100))), '11: nur Modelle, die nach den Regeln dran sind');
  // Signatur ändert sich -> das Modell wird gemessen
  w.req.length = 0;
  const m = [...w.modelle.keys()].find((id) => id >= 16 && id <= 19 && !scheibe.includes(id));
  w.modelle.get(m).varianten[0].status = AUS;
  await lauf(w, {}, { dir: r1.dir, uhr: r1.uhr });
  ok(w.req.some((x) => x.pfad === '/shipping/rates' && Math.floor(x.body.items[0].variant_id / 100) === m), `11: geänderter Bestand von Modell ${m} löst eine Messung aus`);
  // MAX_RATEN vertagt den Rest
  const w3 = standardWelt();
  const r3 = await lauf(w3, { MAX_RATEN: '2', VOLL: '1' });
  gleich(w3.req.filter((x) => x.pfad === '/shipping/rates').length <= 2 + 0, true, '11: MAX_RATEN begrenzt die Preisauskünfte (VOLL=1 würde alle messen)');
  ok(/vertagt \(MAX_RATEN\)/.test(r3.text), '11: Rest vertagt');
  const w4 = standardWelt();
  await lauf(w4, { VOLL: '1' });
  ok(w4.req.filter((x) => x.pfad === '/shipping/rates').length >= 11, '11: VOLL=1 misst alle lieferbaren Modelle');
  // Zustandsdatei kaputt: Lauf geht weiter
  const w5 = standardWelt(); const d5 = mkdtempSync(join(tmpdir(), 'plager-')); tmpDirs.push(d5);
  writeFileSync(join(d5, 'zustand.json'), '{kaputt');
  const r5 = await lauf(w5, {}, { dir: d5 });
  ok(r5.code === 0 && /Zustandsdatei nicht lesbar/.test(r5.text), '11: kaputte Zustandsdatei: Meldung, Lauf geht weiter');
}

// ═════════════════════════════════════════════════════════════ 12. Shopify-Fehler
{
  // a) Seitenwechsel hängt
  const w = standardWelt(); w.cursorHaengt = true;
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich([r.code, w.mut.length], [1, 0], '12a: hängender Cursor: Exit 1 ohne Schreiben');
  ok(r.errs.some((x) => /Seitenwechsel hängt/.test(x)), '12a: Meldung');
  // b) Datei zwischen Lesen und Schreiben verändert
  const w2 = standardWelt(); w2.modelle.get(10).varianten[0].status = AUS;
  w2.theme.nachErstemLesen = w2.theme.text.replace('2026-11-05', '2026-11-04');
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich(r2.code, 1, '12b: Datei verändert: Exit 1');
  ok(!mutTypen(w2).includes('theme') && r2.errs.some((x) => /hat sich seit dem Lesen verändert/.test(x)), '12b: nicht überschrieben, Meldung');
  // c) Theme lehnt ab (userErrors)
  const w3 = standardWelt(); w3.modelle.get(10).varianten[0].status = AUS; w3.theme.userErrors = true;
  const r3 = await lauf(w3, LIVE, { freigabe: true });
  gleich(r3.code, 1, '12c: userErrors: Exit 1');
  ok(r3.errs.some((x) => /schreiben: .*abgelehnt/.test(x)), '12c: Meldung');
  ok(w3.tg.some((t) => /Fehler/.test(t)), '12c: Telegram meldet den Fehler');
  // d) Rücklesen der Datei bleibt aus: nach der Wartezeit ein Fehler
  const w4 = standardWelt(); w4.modelle.get(10).varianten[0].status = AUS; w4.theme.upsertIgnorieren = true;
  const r4 = await lauf(w4, { ...LIVE, WARTE_THEME_MS: '25000' }, { freigabe: true });
  gleich(r4.code, 1, '12d: Rücklesen ohne Erfolg: Exit 1');
  ok(r4.errs.some((x) => /Rücklesen .*Prüfsumme nach 25 s/.test(x)), '12d: Meldung');
  ok(r4.uhr.t - START >= 25000, '12d: die Wartezeit wurde wirklich abgewartet (Uhr)');
  // e) Verzögerte Leseseite: erst alter, dann neuer Inhalt -> Erfolg
  const w5 = standardWelt(); w5.modelle.get(10).varianten[0].status = AUS; w5.theme.leseVerzug = 2;
  const r5 = await lauf(w5, LIVE, { freigabe: true });
  gleich(r5.code, 0, '12e: verzögerte Leseseite: nach Warten Erfolg');
  // f) Produkt-Status wird ignoriert -> Rücklesen meldet es
  const w6 = standardWelt(); w6.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w6.fehler.productUpdateIgnorieren = true;
  const r6 = await lauf(w6, LIVE, { freigabe: true });
  gleich(r6.code, 1, '12f: Rücklesen weicht ab: Exit 1');
  ok(r6.errs.some((x) => /Rücklesen entwurf produkt-2: Stand weicht vom Soll ab/.test(x)), '12f: Meldung');
  // g) productUpdate mit userErrors
  const w7 = standardWelt(); w7.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w7.fehler.productUpdateUserErrors = true;
  const r7 = await lauf(w7, LIVE, { freigabe: true });
  gleich(r7.code, 1, '12g: userErrors am Produkt: Exit 1');
  ok(r7.errs.some((x) => /entwurf produkt-2: productUpdate: .*abgelehnt/.test(x)), '12g: Meldung');
  // h) ungültiges Schema der Datei
  const w8 = standardWelt(); w8.theme.text = '{"schemaVersion":7}';
  const r8 = await lauf(w8, LIVE, { freigabe: true });
  gleich([r8.code, w8.mut.length], [1, 0], '12h: unbekanntes Schema: Exit 1, Datei bleibt');
  ok(/UNGÜLTIG/.test(r8.text), '12h: gemeldet');
  // i) Stand alt, Inhalt gleich -> nur der Stand wird erneuert
  const w9 = standardWelt(); w9.theme.text = ausblendenText({ schemaVersion: 1, stand: '2026-10-25', quelle: 'Q', modelle: [20, 21], varianten: {} });
  const r9 = await lauf(w9, LIVE, { freigabe: true });
  gleich([r9.code, mutTypen(w9), dateiObjekt(w9).stand], [0, ['theme'], '2026-11-06'], '12i: veralteter Stand wird erneuert');
  ok(/Inhalt gleich, Stand 12 Tage alt/.test(r9.text), '12i: Log');
  gleich(w9.tg.length, 0, '12i: kein Telegram für eine reine Stand-Erneuerung');
  // j) Telegram fällt aus: kein Absturz
  const w10 = standardWelt(); w10.modelle.get(10).varianten[0].status = AUS; w10.fehler.tgAus = true;
  gleich((await lauf(w10, LIVE, { freigabe: true })).code, 0, '12j: Telegram-Ausfall bricht nichts ab');
  allgemein(w, '12a'); allgemein(w6, '12f');
}

// ═════════════════════════════════════════════════════════════ 13. Zugang und Teilmenge
{
  const w = standardWelt();
  const r = await lauf(w, { PRINTFUL_API_KEY: null });
  gleich([r.code, w.req.length], [1, 0], '13: ohne Printful-Schlüssel Exit 1, keine Anfrage');
  const r2 = await lauf(w, { SHOPIFY_ADMIN_TOKEN: null });
  gleich([r2.code, w.req.length], [1, 0], '13: ohne Shopify-Zugang Exit 1, keine Anfrage');
  const r3 = await lauf(w, { SHOPIFY_ADMIN_TOKEN: null, SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'csec' });
  gleich([r3.code, w.oauth], [0, 1], '13: Client-Credentials-Anmeldung einmal, Exit 0');
  const r4 = await lauf(w, { SHOPIFY_SHOP: 'https://evil.example.com' });
  gleich(r4.code, 1, '13: fremde Shop-Adresse wird abgelehnt (Zugangsdaten gehen nie dorthin)');
  ok(!w.req.some((x) => x.host.includes('evil')), '13: keine Anfrage an die fremde Adresse');
  const w2 = standardWelt(); w2.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const r5 = await lauf(w2, { ...LIVE, MODELLE: '10,11' }, { freigabe: true });
  gleich(r5.code, 0, '13: Teilmenge Exit 0');
  gleich(printfulAnfragen(w2).filter((x) => x.methode === 'GET').map((x) => x.pfad).sort(), ['/products/10', '/products/11', '/products/11'], '13: nur die zwei Modelle (11 zweimal wegen der Nachprüfung)');
  ok(!mutTypen(w2).includes('theme'), '13: eine Teilmenge schreibt die Datei nie');
  ok(/bei Teilmenge nie geschrieben/.test(r5.text), '13: Log');
  gleich(status(w2, 2), 'DRAFT', '13: Shop-Aktion für das Teilmengen-Modell läuft');
  const w3 = standardWelt();
  const r6 = await lauf(w3, { BASIS_MODELLE: '/gibt/es/nicht.json' });
  gleich([r6.code, w3.req.length], [1, 0], '13: fehlende Basisdatei: Exit 1, keine Anfrage');
}

// ═════════════════════════════════════════════════════════════ 13b. Schutzschalter von aussen geprüft (Sonde im Lauf)
{
  const w = standardWelt();
  let sondeLief = false;
  const e = { PRINTFUL_API_KEY: 'pk', SHOPIFY_ADMIN_TOKEN: 'st', BASIS_MODELLE: null, MODELLE: '10' };
  const dir = mkdtempSync(join(tmpdir(), 'plager-')); tmpDirs.push(dir);
  const b = basisDateien(); writeFileSync(join(dir, 'm.json'), JSON.stringify(b.modelle)); writeFileSync(join(dir, 'a.json'), JSON.stringify(b.ausblenden));
  await main({ ...e, BASIS_MODELLE: join(dir, 'm.json'), BASIS_AUSBLENDEN: join(dir, 'a.json'), PF_ABSTAND_MS: '0', LEDGER: join(dir, 'l.txt') }, {
    fetch: fetchFuer(w), sleep: async () => {}, now: () => START, log: () => {}, err: () => {},
    sonde: async ({ pf, schreibenGql, lesenGql, schreiben }) => {
      sondeLief = true;
      gleich(schreiben, false, '13b: Trockenlauf');
      for (const [m, pfad] of [['POST', '/orders'], ['POST', '/orders/1/confirm'], ['DELETE', '/orders/1'], ['GET', '/orders'], ['POST', '/products/19'], ['PUT', '/products/19']]) {
        await assert.rejects(() => pf(m, pfad, {}), /nicht erlaubt/, `13b: Printful ${m} ${pfad} wird vor dem Senden abgelehnt`); n++;
      }
      gleich(printfulAnfragen(w).length, 0, '13b: dabei ging keine Printful-Anfrage hinaus');
      for (const q of ['mutation($id:ID!){ tagsAdd(id:$id,tags:["x"]){ userErrors{ message } } }', 'mutation { productUpdate(product:{id:"x",status:DRAFT}){ product{ id } } }']) {
        await assert.rejects(() => schreibenGql(q, { id: 'gid://shopify/Product/1' }), /Schreibzugriff im Trockenlauf/, '13b: Shopify-Schreiben im Trockenlauf wird abgelehnt'); n++;
      }
      gleich(w.mut, [], '13b: dabei wurde nichts geschrieben');
      await lesenGql('{ themes(first:5, roles:[MAIN]){ nodes{ id name } } }');
    },
  });
  ok(sondeLief, '13b: Sonde lief');
}

// ═════════════════════════════════════════════════════════════ 14. Gesamtsicht: fremde Ware, Zugangsschlüssel, Modus
{
  const w = standardWelt();
  w.modelle.get(10).varianten[1].status = AUS; w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w.modelle.get(15).varianten[1].status = AUS;
  const r = await lauf(w, { ...LIVE, STRATEGIE: 'auto' }, { freigabe: true });
  gleich(r.code, 0, '14: Gesamtlauf Exit 0');
  allgemein(w, '14');
  ok(!r.text.includes('Bearer') && !r.text.includes('X-Shopify-Access-Token') && !/\bpk\b|\bst\b/.test(r.text.replace(/\bst\b-/g, '')), '14: weder Printful-Schlüssel noch Shopify-Token im Log');
  for (const x of w.req.filter((y) => y.host === 'api.printful.com')) ok(!x.pfad.includes('pk'), '14: Schlüssel nicht in der Adresse');
  rmSync(r.dir, { recursive: true, force: true });
}

for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* aufräumen */ } }
console.log(`${n} Prüfungen bestanden`);
