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
import { ausblendenText, ausblendenPruefen, modellLesen, ledgerZeile, TAG_AUS, REGELN } from './lib/printful_lager.mjs';

let n = 0;
const ok = (b, t) => { assert.ok(b, t); n++; };
const gleich = (a, b, t) => { assert.deepStrictEqual(a, b, t); n++; };
const md5 = (t) => createHash('md5').update(t).digest('hex');
const START = Date.parse('2026-11-06T02:13:00Z');
const tmpDirs = [];
process.on('exit', () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* aufräumen */ } } });    // auch bei einem roten Test (Mutationsprobe) bleibt nichts liegen

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
    w.req.push({ host: u.host, methode, pfad: u.pathname, body, headers: init.headers || {} });
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
  return { id: p.id, handle: p.handle, status: p.status, tags: [...p.tags], kanaele: p.marker ? { value: p.marker } : null, resourcePublications: { nodes: [...p.pubs.map((x) => ({ isPublished: true, publication: { id: 'gid://shopify/Publication/' + x } })), ...(p.unpub || []).map((x) => ({ isPublished: false, publication: { id: 'gid://shopify/Publication/' + x } }))] }, variants: { pageInfo: { hasNextPage: !!p.mehrVarianten }, nodes: p.variants.nodes.map((x) => (voll ? x : { id: x.id, sku: x.sku, inventoryPolicy: x.inventoryPolicy, sperre: x.sperre })) } };
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
    const passt = (p, term) => { const m = /^(tag|sku):(.+)$/.exec(term.trim()); if (!m) throw new Error('Unbekannter Suchbegriff: ' + term); return m[1] === 'tag' ? p.tags.includes(m[2]) : p.variants.nodes.some((x) => (x.sku || '').startsWith(m[2].replace(/\*$/, ''))); };
    const liste = w.produkte.filter((p) => String(v.q).split(' OR ').some((t) => passt(p, t)));
    const seite = liste.slice(start, start + w.seite);
    const naechster = start + w.seite;
    const antwortSeite = { data: { products: { pageInfo: { hasNextPage: naechster < liste.length, endCursor: w.cursorHaengt ? String(start) : String(naechster) }, nodes: seite.map((p) => produktAusgabe(p, true)) } } };
    if (naechster >= liste.length && w.nachListe) { const h = w.nachListe; w.nachListe = null; h(); }       // Rennen: jemand ändert ein Produkt, NACHDEM der Wächter die Liste gelesen hat
    return antwortSeite;
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
    if (q.includes('tagsAdd(')) {
      w.mut.push({ typ: 'tagsAdd', ziel: v.id, tags: v.tags });
      if (w.fehler.tagsAddUserErrors) return { data: { tagsAdd: { userErrors: [{ message: 'Tag abgelehnt' }] } } };
      const pp = p(v.id); if (!w.fehler.tagsAddIgnorieren) for (const t of v.tags) if (!pp.tags.includes(t)) pp.tags.push(t);
      return { data: { tagsAdd: { userErrors: [] } } };
    }
    if (q.includes('tagsRemove(')) { w.mut.push({ typ: 'tagsRemove', ziel: v.id, tags: v.tags }); const pp = p(v.id); pp.tags = pp.tags.filter((t) => !v.tags.includes(t)); if (w.fehler.kanaeleWegNachTag) pp.pubs = []; return { data: { tagsRemove: { userErrors: [] } } }; }
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
  const pa = w.req.filter((x) => x.pfad === '/shipping/rates');
  ok(pa.length > 0 && pa.every((x) => x.body.recipient.country_code === 'CH' && x.body.items.length === 1 && x.body.items[0].quantity === 1 && Number.isInteger(x.body.items[0].variant_id)), '0: Preisauskunft immer nach CH, eine Variante, Menge 1');
  ok(printfulAnfragen(w).every((x) => x.headers['X-PF-Store-Id'] === '123' && x.headers.Authorization === 'Bearer pk'), '0: Printful-Anfragen tragen Schlüssel und Store-Nummer');
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
  gleich(w.tg.length, 2, '2: zwei Telegram (Datei, neuer Befund)');
  ok(/Datei neu/.test(w.tg[0]), '2: Telegram nennt die Datei');
  ok(/1 neue\(r\) Befund/.test(w.tg[1]) && /Variante 5000_1002 ist bei Printful ausverkauft/.test(w.tg[1]) && /nichts geändert/.test(w.tg[1]), '2: das zweite Telegram nennt die ausverkaufte Einzelvariante, die im Shop kaufbar bleibt');
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
  const wS = standardWelt();
  await lauf(wS, { PRINTFUL_STORE_ID: null });
  ok(printfulAnfragen(wS).length > 0 && printfulAnfragen(wS).every((x) => !('X-PF-Store-Id' in x.headers)), '13: ohne Store-Nummer wird keine leere Kopfzeile gesendet');
  const wE = standardWelt();
  const r4 = await lauf(wE, { SHOPIFY_SHOP: 'https://evil.example.com', SHOPIFY_ADMIN_TOKEN: null, SHOPIFY_CLIENT_ID: 'cid', SHOPIFY_CLIENT_SECRET: 'csec' });
  gleich([r4.code, wE.req.length, wE.oauth], [1, 0, 0], '13: fremde Shop-Adresse wird abgelehnt, bevor Client-ID und Schlüssel irgendwohin gehen');
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
  const dir = mkdtempSync(join(tmpdir(), 'plager-')); tmpDirs.push(dir);
  const b = basisDateien(); writeFileSync(join(dir, 'm.json'), JSON.stringify(b.modelle)); writeFileSync(join(dir, 'a.json'), JSON.stringify(b.ausblenden));
  const sondeFehler = []; let sondeLief = false;
  const pruefe = async (f, muster, text) => { try { await f(); sondeFehler.push(`${text}: wurde NICHT abgelehnt`); } catch (e) { if (!muster.test(e.message)) sondeFehler.push(`${text}: falsche Meldung «${e.message}»`); } };
  await main({ PRINTFUL_API_KEY: 'pk', SHOPIFY_ADMIN_TOKEN: 'st', TELEGRAM_BOT_TOKEN: 'tt', TELEGRAM_CHAT_ID: 'cc', BASIS_MODELLE: join(dir, 'm.json'), BASIS_AUSBLENDEN: join(dir, 'a.json'), PF_ABSTAND_MS: '0', MODELLE: '10', LEDGER: join(dir, 'l.txt') }, {
    fetch: fetchFuer(w), sleep: async () => {}, now: () => START, log: () => {}, err: () => {},
    sonde: async ({ pf, schreibenGql, lesenGql, tg, schreiben }) => {
      sondeLief = true;
      if (schreiben !== false) sondeFehler.push('Trockenlauf erwartet');
      for (const [m, pfad] of [['POST', '/orders'], ['POST', '/orders/1/confirm'], ['DELETE', '/orders/1'], ['GET', '/orders'], ['POST', '/products/19'], ['PUT', '/products/19']]) await pruefe(() => pf(m, pfad, {}), /nicht erlaubt/, `Printful ${m} ${pfad}`);
      if (printfulAnfragen(w).length !== 0) sondeFehler.push('verbotene Printful-Anfrage ist hinausgegangen');
      for (const q of ['mutation($id:ID!){ tagsAdd(id:$id,tags:["x"]){ userErrors{ message } } }', 'mutation { productUpdate(product:{id:"x",status:DRAFT}){ product{ id } } }']) await pruefe(() => schreibenGql(q, { id: 'gid://shopify/Product/1' }), /Schreibzugriff im Trockenlauf/, 'Shopify-Schreiben im Trockenlauf');
      if (w.mut.length) sondeFehler.push('im Trockenlauf wurde geschrieben');
      if ((await tg('Probe')) !== null) sondeFehler.push('Telegram im Trockenlauf gesendet');
      if (w.tg.length) sondeFehler.push('Telegram im Trockenlauf hinausgegangen');
      await lesenGql('{ themes(first:5, roles:[MAIN]){ nodes{ id name } } }');
    },
  });
  ok(sondeLief, '13b: Sonde lief');
  gleich(sondeFehler, [], '13b: Printful-Erlaubnisliste, Trockenlauf-Sperre für Shopify und Telegram halten');
  // mit Freigabe schreibt dieselbe Sonde-Anfrage durch
  const w2 = standardWelt(); const sonde2 = [];
  writeFileSync(join(dir, 'FREI.txt'), 'frei');
  await main({ PRINTFUL_API_KEY: 'pk', SHOPIFY_ADMIN_TOKEN: 'st', TELEGRAM_BOT_TOKEN: 'tt', TELEGRAM_CHAT_ID: 'cc', BASIS_MODELLE: join(dir, 'm.json'), BASIS_AUSBLENDEN: join(dir, 'a.json'), PF_ABSTAND_MS: '0', MODELLE: '10', LEDGER: join(dir, 'l.txt'), LIVE: '1', FREIGABE_DATEI: join(dir, 'FREI.txt') }, {
    fetch: fetchFuer(w2), sleep: async () => {}, now: () => START, log: () => {}, err: () => {},
    sonde: async ({ schreibenGql, tg, schreiben }) => { sonde2.push(schreiben); await schreibenGql('mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }', { id: 'gid://shopify/Product/9', tags: ['probe'] }); sonde2.push(await tg('Probe')); },
  });
  gleich(sonde2, [true, true], '13b: mit Freigabe darf geschrieben und Telegram gesendet werden');
  gleich([w2.mut.length, w2.tg], [1, ['Probe']], '13b: die Probe-Anfragen kamen an');
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

// ═════════════════════════════════════════════════════════════ 15. Rennen: ein Produkt ändert sich, NACHDEM der Wächter die Liste gelesen hat (Gegenleser 1 und 2)
{
  const p2 = (w) => w.produkte.find((x) => x.id.endsWith('/2'));
  const marker = (w) => p2(w).marker;
  // a) geplant: ENTWURF. Jemand setzt das Produkt in der Zwischenzeit von Hand auf ENTWURF: nichts schreiben, nie unser Tag an einen fremden Entwurf
  const w = standardWelt(); w.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  w.nachListe = () => { const p = p2(w); p.status = 'DRAFT'; p.pubs = []; };
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '15a: ein Rennen ist kein Fehler: Exit 0');
  gleich(w.mut.filter((m) => m.ziel === 'gid://shopify/Product/2'), [], '15a: am inzwischen von Hand entworfenen Produkt wird nichts geschrieben (kein Tag, kein Merkfeld, kein Status)');
  gleich([tags(w, 2).includes(TAG_AUS), marker(w)], [false, null], '15a: der Entwurf trägt unser Tag nicht');
  ok(/entwurf produkt-2 übersprungen: Status ist DRAFT, nicht ACTIVE/.test(r.text), '15a: Log nennt den Grund');
  ok(dateiObjekt(w).modelle.includes(11), '15a: die Datei im Theme wird trotzdem aktualisiert');
  ok(!r.ledger.includes('entwurf gid://shopify/Product/2'), '15a: keine Ledger-Zeile für eine Änderung, die nicht stattfand');
  // b) geplant: Rückkehr. Jemand aktiviert das Produkt in der Zwischenzeit von Hand: nichts doppelt schreiben; am Folgetag räumt «nachziehen» das Tag auf
  const w2 = standardWelt(); alsEntwurfVonUns(w2, 2);
  w2.nachListe = () => { const p = p2(w2); p.status = 'ACTIVE'; p.pubs = [...KANAELE]; };
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich(r2.code, 0, '15b: Exit 0');
  gleich(w2.mut.filter((m) => m.typ === 'productUpdate'), [], '15b: der Status wird nicht noch einmal gesetzt');
  ok(/reaktivieren produkt-2 übersprungen: Stand ist ACTIVE/.test(r2.text), '15b: Log nennt den Grund');
  w2.mut.length = 0;
  const r3 = await lauf(w2, LIVE, { freigabe: true, dir: r2.dir, uhr: r2.uhr });
  gleich(r3.code, 0, '15b: Folgetag Exit 0');
  gleich([status(w2, 2), tags(w2, 2).includes(TAG_AUS), marker(w2)], ['ACTIVE', false, null], '15b: Folgetag: das stehen gebliebene Tag und Merkfeld sind weg');
  gleich(mutTypen(w2), ['tagsRemove', 'metafeldWeg'], '15b: Folgetag: Kanäle waren vollständig, es wird nur aufgeräumt (kein Status, keine Veröffentlichung)');
  ok(r3.ledger.includes('nachziehen gid://shopify/Product/2 vorher={"status":"ACTIVE","kanaele":["301970915713","301971014017"],"handle":"produkt-2"}'), '15b: Ledger-Zeile «nachziehen» mit vorher=');
  // c) tagsAdd wird abgelehnt: Fehler, nichts bleibt stehen
  const w3 = standardWelt(); w3.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w3.fehler.tagsAddUserErrors = true;
  const r4 = await lauf(w3, LIVE, { freigabe: true });
  gleich(r4.code, 1, '15c: tagsAdd abgelehnt: Exit 1');
  ok(r4.errs.some((x) => /entwurf produkt-2: tagsAdd: .*Tag abgelehnt/.test(x)), '15c: Meldung nennt tagsAdd');
  gleich([status(w3, 2), tags(w3, 2).includes(TAG_AUS), marker(w3)], ['ACTIVE', false, null], '15c: das Produkt bleibt aktiv, das Merkfeld wird zurückgebaut');
  // d) Statuswechsel wird abgelehnt: Tag und Merkfeld werden zurückgebaut (sonst bliebe ein AKTIVES Produkt mit unserem Tag)
  const w4 = standardWelt(); w4.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w4.fehler.productUpdateUserErrors = true;
  const r5 = await lauf(w4, LIVE, { freigabe: true });
  gleich(r5.code, 1, '15d: Statuswechsel abgelehnt: Exit 1');
  gleich([status(w4, 2), tags(w4, 2).includes(TAG_AUS), marker(w4)], ['ACTIVE', false, null], '15d: kein stehen gebliebenes Tag und Merkfeld am aktiven Produkt');
  gleich(w4.mut.filter((m) => m.ziel === 'gid://shopify/Product/2').map((m) => m.typ), ['metafeldSetzen', 'tagsAdd', 'productUpdate', 'tagsRemove', 'metafeldWeg'], '15d: Reihenfolge: merken, Tag, Status (scheitert), Tag weg, Merkfeld weg');
  // e) das Tag wird still nicht gesetzt: das Rücklesen merkt es
  const w5 = standardWelt(); w5.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); w5.fehler.tagsAddIgnorieren = true;
  const r6 = await lauf(w5, LIVE, { freigabe: true });
  gleich(r6.code, 1, '15e: Tag nicht gesetzt: Exit 1 durch das Rücklesen');
  ok(r6.errs.some((x) => /Rücklesen entwurf produkt-2: Stand weicht vom Soll ab/.test(x)), '15e: Meldung');
  // f) ein schon vorhandenes Merkfeld geht beim ENTWURF nicht verloren
  const w6 = standardWelt(); w6.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); p2(w6).marker = '111';
  await lauf(w6, LIVE, { freigabe: true });
  gleich([status(w6, 2), marker(w6)], ['DRAFT', ['111', ...KANAELE].join(',')], '15f: vorhandenes Merkfeld und aktuelle Kanäle werden zusammengeführt');
  // g) nur VERÖFFENTLICHTE Kanäle werden gemerkt
  const w7 = standardWelt(); w7.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); p2(w7).unpub = ['302994456961'];
  const r7 = await lauf(w7, LIVE, { freigabe: true });
  gleich(marker(w7), KANAELE.join(','), '15g: ein nur verknüpfter, nicht veröffentlichter Kanal wird nicht gemerkt');
  ok(r7.ledger.includes('"kanaele":["301970915713","301971014017"]') && !r7.ledger.includes('302994456961'), '15g: auch das Ledger nennt nur veröffentlichte Kanäle');
  // h) Rückkehr geplant, aber jemand entfernt das Tag von Hand (der Entwurf gehört dann nicht mehr uns): nichts schreiben
  const w8 = standardWelt(); alsEntwurfVonUns(w8, 2);
  w8.nachListe = () => { p2(w8).tags = p2(w8).tags.filter((t) => t !== TAG_AUS); };
  const r8 = await lauf(w8, LIVE, { freigabe: true });
  gleich([r8.code, status(w8, 2), w8.mut.filter((m) => m.ziel === 'gid://shopify/Product/2')], [0, 'DRAFT', []], '15h: ohne unser Tag wird ein Entwurf nicht reaktiviert, auch wenn der Plan es vorsah');
  ok(/reaktivieren produkt-2 übersprungen: Stand ist DRAFT ohne unser Tag/.test(r8.text), '15h: Log nennt den Grund');
  // i) die Nachprüfung vor dem ENTWURF ist nicht lesbar: im Zweifel bleibt das Produkt aktiv
  const w9 = standardWelt(); w9.modelle.set(11, modell(11, { status: [AUS, AUS, AUS], skript: ['', '500', '500', '500', '500'] }));
  const r9 = await lauf(w9, LIVE, { freigabe: true });
  gleich([r9.code, status(w9, 2), w9.mut.some((m) => m.typ === 'productUpdate')], [0, 'ACTIVE', false], '15i: nicht lesbare Nachprüfung bestätigt den Ausfall nicht: kein ENTWURF');
  ok(/Nachprüfung produkt-2: Ausfall nicht bestätigt/.test(r9.text), '15i: Log nennt die Nachprüfung');
  // j) Statuswechsel scheitert bei vorhandenem Merkfeld: das Merkfeld bleibt (zusammengeführt), das Tag geht
  const w10 = standardWelt(); w10.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); p2(w10).marker = '111'; w10.fehler.productUpdateUserErrors = true;
  await lauf(w10, LIVE, { freigabe: true });
  gleich([status(w10, 2), tags(w10, 2).includes(TAG_AUS), marker(w10)], ['ACTIVE', false, ['111', ...KANAELE].join(',')], '15j: scheitert der Statuswechsel, bleibt ein schon vorhandenes Merkfeld erhalten, das Tag verschwindet');
  allgemein(w, '15a'); allgemein(w2, '15b'); allgemein(w3, '15c'); allgemein(w4, '15d'); allgemein(w6, '15f'); allgemein(w7, '15g');
}

// ═════════════════════════════════════════════════════════════ 16. «nachziehen»: halb fertige oder von Hand beendete Entwürfe zu Ende führen
{
  const p2 = (w) => w.produkte.find((x) => x.id.endsWith('/2'));
  // a) Veröffentlichen schlägt fehl (Tag 1), am Folgetag klappt es
  const w = standardWelt(); alsEntwurfVonUns(w, 2); w.fehler.publishIgnorieren = true;
  const r1 = await lauf(w, LIVE, { freigabe: true });
  gleich([r1.code, status(w, 2), tags(w, 2).includes(TAG_AUS), p2(w).marker, p2(w).pubs], [1, 'ACTIVE', true, KANAELE.join(','), []], '16a: Veröffentlichen scheitert: Exit 1, Produkt aktiv ohne Kanäle, Tag und Merkfeld bleiben als Spur');
  ok(w.tg.some((t) => /\[Fehler\]/.test(t) && /nicht wiederhergestellt/.test(t)), '16a: Telegram meldet den Fehler mit dem Grund');
  w.fehler.publishIgnorieren = false; w.mut.length = 0; w.tg.length = 0;
  const t = await lauf(w, {}, { dir: r1.dir, uhr: r1.uhr });
  gleich(w.mut, [], '16a: Trockenlauf am Folgetag schreibt nichts');
  ok(/\[würde\] nachziehen produkt-2/.test(t.text) && /nachziehen 1,/.test(t.text), '16a: Trockenlauf kündigt «nachziehen» an');
  const r2 = await lauf(w, LIVE, { freigabe: true, dir: r1.dir, uhr: r1.uhr });
  gleich(r2.code, 0, '16a: Folgetag Exit 0');
  gleich([status(w, 2), tags(w, 2).includes(TAG_AUS), p2(w).marker, [...p2(w).pubs].sort()], ['ACTIVE', false, null, KANAELE], '16a: Folgetag: Kanäle wieder da, Tag und Merkfeld entfernt');
  gleich(mutTypen(w), ['publish', 'tagsRemove', 'metafeldWeg'], '16a: Folgetag: nur veröffentlichen und aufräumen (der Status wird nicht angefasst)');
  ok(/1 zu Ende geführt/.test(w.tg[0]), '16a: Telegram nennt das Zu-Ende-Führen');
  allgemein(w, '16a');
  // b) von Hand aktiviert, Kanäle vollständig: nur aufräumen
  const w2 = standardWelt(); p2(w2).tags.push(TAG_AUS); p2(w2).marker = KANAELE.join(',');
  const r3 = await lauf(w2, LIVE, { freigabe: true });
  gleich([r3.code, mutTypen(w2), tags(w2, 2).includes(TAG_AUS), p2(w2).marker], [0, ['tagsRemove', 'metafeldWeg'], false, null], '16b: von Hand aktiviert: Tag und Merkfeld verschwinden, sonst nichts');
  // c) ohne gemerkte Kanäle: Tag entfernen, aber melden
  const w3 = standardWelt(); p2(w3).tags.push(TAG_AUS);
  const r4 = await lauf(w3, LIVE, { freigabe: true });
  gleich([r4.code, mutTypen(w3), tags(w3, 2).includes(TAG_AUS)], [0, ['tagsRemove', 'metafeldWeg'], false], '16c: ohne Merkfeld nur aufräumen');
  ok(/keine gemerkte Kanalliste/.test(r4.text), '16c: Befund «keine gemerkte Kanalliste»');
  // d) nachziehen hat Vorrang: erst aufräumen, am nächsten Lauf entscheiden (alles ausverkauft)
  const w4 = standardWelt(); w4.modelle.get(11).varianten.forEach((v) => { v.status = AUS; }); p2(w4).tags.push(TAG_AUS); p2(w4).marker = KANAELE.join(',');
  const r5 = await lauf(w4, LIVE, { freigabe: true });
  gleich([r5.code, w4.mut.filter((m) => m.typ === 'productUpdate').length, tags(w4, 2).includes(TAG_AUS)], [0, 0, false], '16d: erster Lauf räumt nur auf, kein ENTWURF im selben Lauf');
  const r6 = await lauf(w4, LIVE, { freigabe: true, dir: r5.dir, uhr: r5.uhr });
  gleich([r6.code, status(w4, 2), tags(w4, 2).includes(TAG_AUS)], [0, 'DRAFT', true], '16d: zweiter Lauf: ENTWURF');
  // e) Nachziehen scheitert: Tag und Merkfeld bleiben, jeder Lauf meldet es (kein stilles Hängen)
  const w5 = standardWelt(); p2(w5).tags.push(TAG_AUS); p2(w5).marker = KANAELE.join(','); p2(w5).pubs = []; w5.fehler.publishIgnorieren = true;
  const r7 = await lauf(w5, LIVE, { freigabe: true });
  const r8 = await lauf(w5, LIVE, { freigabe: true, dir: r7.dir, uhr: r7.uhr });
  gleich([r7.code, r8.code, tags(w5, 2).includes(TAG_AUS), p2(w5).marker], [1, 1, true, KANAELE.join(',')], '16e: scheitert das Nachziehen, meldet es jeder Lauf erneut (Exit 1), Tag und Merkfeld bleiben');
  gleich(w5.tg.filter((x) => /\[Fehler\]/.test(x)).length, 2, '16e: zwei Fehler-Telegram (eines je Lauf)');
  ok(r7.errs.some((x) => /nachziehen produkt-2: Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt/.test(x)), '16e: Meldung nennt «nachziehen»');
  // f) das Rücklesen prüft die Kanäle (die Kanäle verschwinden nach dem Tag-Entfernen)
  const w6 = standardWelt(); alsEntwurfVonUns(w6, 2); w6.fehler.kanaeleWegNachTag = true;
  const r9 = await lauf(w6, LIVE, { freigabe: true });
  gleich(r9.code, 1, '16f: fehlende Kanäle nach der Reaktivierung: Exit 1 durch das Rücklesen');
  ok(r9.errs.some((x) => /Rücklesen reaktivieren produkt-2: Stand weicht vom Soll ab/.test(x)), '16f: Meldung');
  // g) Ledger der Reaktivierung
  const w7 = standardWelt(); alsEntwurfVonUns(w7, 2);
  const r10 = await lauf(w7, LIVE, { freigabe: true });
  ok(r10.ledger.includes('reaktivieren gid://shopify/Product/2 vorher={"status":"DRAFT","kanaele":["301970915713","301971014017"],"handle":"produkt-2"}'), '16g: Ledger-Zeile der Reaktivierung mit vorher=');
  ok(r10.ledger.indexOf('reaktivieren gid://shopify/Product/2') >= 0 && r10.ledger.split('\n').length >= 2, '16g: Zeile steht im Ledger');
}

// ═════════════════════════════════════════════════════════════ 17. Neue Befunde gehen einmal an Telegram
{
  const befundTg = (w) => w.tg.filter((x) => /neue\(r\) Befund/.test(x));
  const zustandVon = (dir) => JSON.parse(readFileSync(join(dir, 'zustand.json'), 'utf8'));
  // a) ausverkaufte Einzelvariante (Strategie B): Trockenlauf zeigt, sendet nicht, merkt nichts
  const w = standardWelt(); w.modelle.get(10).varianten[1].status = AUS;
  const t = await lauf(w);
  ok(/\[Trockenlauf\] Telegram: [\s\S]*5000_1002/.test(t.text), '17a: Trockenlauf zeigt, was gesendet würde');
  gleich([w.tg, zustandVon(t.dir).gemeldet], [[], {}], '17a: Trockenlauf sendet nichts und merkt nichts als gemeldet');
  const r1 = await lauf(w, LIVE, { freigabe: true, dir: t.dir, uhr: t.uhr });
  gleich(befundTg(w).length, 1, '17a: live: genau ein Telegram für den Befund');
  ok(/Variante 5000_1002 ist bei Printful ausverkauft/.test(befundTg(w)[0]) && /nichts geändert/.test(befundTg(w)[0]), '17a: Text nennt Variante und «nichts geändert»');
  gleich(Object.keys(zustandVon(t.dir).gemeldet), ['variante-ausverkauft:5000_1002'], '17a: gemeldet ist im Zustand gemerkt');
  w.tg.length = 0;
  const r2 = await lauf(w, LIVE, { freigabe: true, dir: t.dir, uhr: t.uhr });
  gleich(w.tg, [], '17a: zweiter Lauf: derselbe Befund wird nicht noch einmal gemeldet');
  // Rückkehr und erneuter Ausfall: wird wieder gemeldet
  w.modelle.get(10).varianten[1].status = DA;
  await lauf(w, LIVE, { freigabe: true, dir: t.dir, uhr: t.uhr });
  gleich(zustandVon(t.dir).gemeldet, {}, '17a: ist die Variante zurück, fällt der Befund aus dem Zustand');
  w.modelle.get(10).varianten[1].status = AUS; w.tg.length = 0;
  await lauf(w, LIVE, { freigabe: true, dir: t.dir, uhr: t.uhr });
  gleich(befundTg(w).length, 1, '17a: fällt sie erneut aus, wird erneut gemeldet');
  ok(r1.code === 0 && r2.code === 0, '17a: Exit 0');
  // b) Telegram fällt aus: nicht als gemeldet gemerkt, der nächste Lauf versucht es wieder
  const w2 = standardWelt(); w2.modelle.get(10).varianten[1].status = AUS; w2.fehler.tgAus = true;
  const b1 = await lauf(w2, LIVE, { freigabe: true });
  gleich(zustandVon(b1.dir).gemeldet, {}, '17b: Telegram-Ausfall: nichts als gemeldet gemerkt');
  w2.fehler.tgAus = false; w2.tg.length = 0;
  await lauf(w2, LIVE, { freigabe: true, dir: b1.dir, uhr: b1.uhr });
  gleich(befundTg(w2).length, 1, '17b: der nächste Lauf sendet es');
  // c) ohne Telegram-Zugang (null): auch nicht gemerkt
  const w3 = standardWelt(); w3.modelle.get(10).varianten[1].status = AUS;
  const c1 = await lauf(w3, { ...LIVE, TELEGRAM_BOT_TOKEN: null }, { freigabe: true });
  gleich([w3.tg, zustandVon(c1.dir).gemeldet], [[], {}], '17c: ohne Telegram-Zugang nichts gesendet und nichts als gemeldet gemerkt');
  // d) Variante fehlt im Katalog: Befund bei vollständigem Lauf, nie bei Teilmenge oder unlesbarem Modell
  const bauen = () => { const x = standardWelt(); x.produkte.push(produkt(11, 'ACTIVE', [variante('gid://V/n1', '5000_99991')])); return x; };
  const w4 = bauen();
  const d1 = await lauf(w4, LIVE, { freigabe: true });
  ok(/Befund variante-nicht-im-katalog: Variante 5000_99991 \(produkt-11\) steht nicht mehr im Printful-Katalog/.test(d1.text), '17d: Befund «Variante fehlt im Katalog» mit SKU');
  gleich(befundTg(w4).length, 1, '17d: genau ein Telegram dazu');
  ok(/5000_99991/.test(befundTg(w4)[0]), '17d: das Telegram nennt die SKU');
  gleich(w4.mut.filter((m) => m.ziel === 'gid://shopify/Product/11' || m.produkt === 'gid://shopify/Product/11'), [], '17d: das Produkt wird nicht angefasst');
  const w5 = bauen();
  const d2 = await lauf(w5, { MODELLE: '10,11' });
  ok(!/variante-nicht-im-katalog/.test(d2.text), '17d: bei einer Teilmenge kein solcher Befund (die Modelle fehlen nur, weil sie nicht gelesen wurden)');
  const w6 = bauen(); w6.modelle.get(13).skript = ['500', '500', '500', '500'];
  const d3 = await lauf(w6, LIVE, { freigabe: true });
  ok(/unbekannt 13:/.test(d3.text) && !/variante-nicht-im-katalog/.test(d3.text), '17d: bei einem nicht lesbaren Modell kein solcher Befund');
  // e) unbekanntes Statuswort: Befund und Telegram einmal, die Variante bleibt unbekannt
  const w7 = standardWelt();
  w7.modelle.set(17, modell(17, { status: [DA, { EU: 'neuwort', US: 'neuwort' }, DA] }));
  w7.modelle.set(16, modell(16, { status: [{ EU: 'neuwort' }, { EU: 'neuwort' }, { EU: 'neuwort' }] }));
  const e1 = await lauf(w7, LIVE, { freigabe: true });
  gleich(e1.code, 0, '17e: Exit 0 (ein Modell unbekannt, 1 von 12)');
  ok(/Befund: Printful meldet das unbekannte Statuswort «neuwort» \(Modelle 16, 17\)/.test(e1.text), '17e: Befund nennt Wort und Modelle');
  gleich(befundTg(w7).length, 1, '17e: ein Telegram für das Wort (nicht eines je Modell)');
  ok(!dateiObjekt(w7).modelle.includes(16) && !dateiObjekt(w7).modelle.includes(17) && dateiObjekt(w7).varianten[17] === undefined, '17e: unbekannte Varianten werden nicht ausgeblendet');
}

// ═════════════════════════════════════════════════════════════ 18. Varianten, die nur ausserhalb der Schweiz lieferbar sind
{
  const w = standardWelt();
  w.modelle.set(15, modell(15, { status: [{ AU: 'in_stock' }, DA, { AU: 'in_stock', EU: 'in_stock' }] }));
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich(r.code, 0, '18: Exit 0');
  gleich(dateiObjekt(w).varianten, { 15: [1501] }, '18: nur die AU-Variante steht in der Datei; AU+EU bleibt lieferbar');
  ok(/1 Varianten in 1 Modellen sind nur in AU, BR, JP oder UK lieferbar/.test(r.text), '18: Log nennt die Zahl');
  // alle Varianten eines Modells nur in JP oder BR: Produkt geht auf ENTWURF
  const w2 = standardWelt();
  w2.modelle.set(12, modell(12, { status: [{ JP: 'in_stock' }, { JP: 'in_stock' }, { BR: 'in_stock' }] }));
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich([r2.code, status(w2, 3)], [0, 'DRAFT'], '18: Produkt, dessen Varianten nur in JP oder BR lieferbar sind: ENTWURF');
  ok(dateiObjekt(w2).modelle.includes(12), '18: das Modell steht in der Datei');
  // eine Variante nur in AU ist keine Testvariante für die Preisauskunft
  const w3 = standardWelt();
  w3.modelle.set(20, modell(20, { status: [{ AU: 'in_stock' }, { AU: 'in_stock' }, DA], rateSkript: ['ok'] }));
  const r3 = await lauf(w3);
  const pa = w3.req.filter((x) => x.pfad === '/shipping/rates' && Math.floor(x.body.items[0].variant_id / 100) === 20);
  gleich(pa.map((x) => x.body.items[0].variant_id), [2003], '18: die Preisauskunft nimmt die Variante mit Schweizer Region (2003), nicht die AU-Varianten');
}

// ═════════════════════════════════════════════════════════════ 19. Rücknahme: Stand und Reihenfolge
{
  const p2 = (w) => w.produkte.find((x) => x.id.endsWith('/2'));
  // a) Rücknahme einer Freigabe (Variante wieder sperren, mit dem alten Wert in der Markierung)
  const w = standardWelt(); w.modelle.get(15).varianten[1].status = AUS;
  const a1 = await lauf(w, { ...LIVE, STRATEGIE: 'A' }, { freigabe: true });
  w.modelle.get(15).varianten[1].status = DA;
  const a2 = await lauf(w, { ...LIVE, STRATEGIE: 'A' }, { freigabe: true, dir: a1.dir, uhr: a1.uhr });
  const h = () => w.produkte.find((x) => x.id.endsWith('/8')).variants.nodes[1];
  gleich([h().inventoryPolicy, h().sperre], ['CONTINUE', null], '19a: Ausgangslage: Variante wieder frei');
  writeFileSync(join(a1.dir, 'nur-freigabe.txt'), a2.ledger.split('\n').filter((x) => / freigabe /.test(x)).join('\n') + '\n');
  const za = await lauf(w, { ZURUECK: '1', LIVE: '1', LEDGER: join(a1.dir, 'nur-freigabe.txt') }, { dir: a1.dir });
  gleich(za.code, 0, '19a: Rücknahme Exit 0');
  gleich([h().inventoryPolicy, h().sperre], ['DENY', { value: 'CONTINUE' }], '19a: die Freigabe ist zurückgenommen: DENY, Markierung mit dem alten Wert CONTINUE');
  // b) Rücknahme einer Reaktivierung: wieder ENTWURF mit Tag und gemerkten Kanälen
  const w2 = standardWelt(); alsEntwurfVonUns(w2, 2);
  const b1 = await lauf(w2, LIVE, { freigabe: true });
  gleich(status(w2, 2), 'ACTIVE', '19b: Ausgangslage: reaktiviert');
  const zb = await lauf(w2, { ZURUECK: '1', LIVE: '1' }, { dir: b1.dir });
  gleich([zb.code, status(w2, 2), tags(w2, 2).includes(TAG_AUS), p2(w2).marker, p2(w2).pubs], [0, 'DRAFT', true, KANAELE.join(','), []], '19b: Reaktivierung zurückgenommen: ENTWURF mit Tag und gemerkten Kanälen');
  // c) Reihenfolge: ENTWURF, dann Rückkehr; die Rücknahme geht von hinten nach vorn und endet im Ausgangszustand «aktiv»
  const w3 = standardWelt(); w3.modelle.get(11).varianten.forEach((v) => { v.status = AUS; });
  const original = w3.theme.text;
  const c1 = await lauf(w3, LIVE, { freigabe: true });
  gleich(status(w3, 2), 'DRAFT', '19c: Lauf 1: ENTWURF');
  w3.modelle.get(11).varianten.forEach((v) => { v.status = DA; });
  const c2 = await lauf(w3, LIVE, { freigabe: true, dir: c1.dir, uhr: c1.uhr });
  gleich(status(w3, 2), 'ACTIVE', '19c: Lauf 2: wieder aktiv');
  const zc = await lauf(w3, { ZURUECK: '1', LIVE: '1' }, { dir: c1.dir });
  gleich([zc.code, status(w3, 2), tags(w3, 2).includes(TAG_AUS), [...p2(w3).pubs].sort(), w3.theme.text], [0, 'ACTIVE', false, KANAELE, original], '19c: von hinten nach vorn zurückgenommen: aktiv, ohne Tag, Kanäle da, Datei wie am Anfang');
  ok(/Rücknahme: 4 zurückgesetzt/.test(zc.text), '19c: vier Schritte (zwei Produkte, zwei Dateien)');
  // d) ein Entwurf ohne unser Tag wird bei der Rücknahme eines ENTWURFS nie angefasst
  const w4 = standardWelt();
  const dir = mkdtempSync(join(tmpdir(), 'plager-')); tmpDirs.push(dir);
  writeFileSync(join(dir, 'fremd.txt'), ledgerZeile('2026-11-06T02:20:00.000Z', 'entwurf', 'gid://shopify/Product/5', { status: 'ACTIVE', handle: 'produkt-5', kanaele: KANAELE }) + '\n');
  const zd = await lauf(w4, { ZURUECK: '1', LIVE: '1', LEDGER: join(dir, 'fremd.txt') }, { dir });
  gleich([zd.code, w4.mut.length, status(w4, 5)], [0, 0, 'DRAFT'], '19d: ein Entwurf ohne unser Tag bleibt bei der Rücknahme unberührt');
  ok(/übersprungen entwurf produkt-5: Stand ist nicht mehr der von uns gesetzte/.test(zd.text), '19d: Log nennt den Grund');
  // e) «nachziehen» wird nicht zurückgenommen
  const w5 = standardWelt();
  writeFileSync(join(dir, 'nz.txt'), ledgerZeile('2026-11-06T02:20:00.000Z', 'nachziehen', 'gid://shopify/Product/2', { status: 'ACTIVE', kanaele: KANAELE, handle: 'produkt-2' }) + '\n');
  const ze = await lauf(w5, { ZURUECK: '1', LIVE: '1', LEDGER: join(dir, 'nz.txt') }, { dir });
  gleich([ze.code, w5.mut.length], [0, 0], '19e: Zu-Ende-Führen wird nicht zurückgenommen');
  ok(/übersprungen nachziehen produkt-2/.test(ze.text), '19e: Log nennt es');
}

// ═════════════════════════════════════════════════════════════ 20. Zustandsdatei mit fremdem Schema wird nicht geglaubt
{
  const sigModell20 = modellLesen({ status: 200, json: { code: 200, result: { product: { id: 20, title: 'x', is_discontinued: false }, variants: [2001, 2002, 2003].map((id) => ({ id, availability_status: stat(DA) })) } } }, 20).signatur;
  const tagIdx = Math.floor(START / 86400000);
  ok(20 % REGELN.scheiben !== tagIdx % REGELN.scheiben, '20: Modell 20 liegt heute nicht in der Tagesscheibe (sonst prüfte der Test nichts)');
  const dateiMit = async (schema) => {
    const w = standardWelt(); const dir = mkdtempSync(join(tmpdir(), 'plager-')); tmpDirs.push(dir);
    writeFileSync(join(dir, 'zustand.json'), JSON.stringify({ schema, stand: new Date(START).toISOString(), modelle: { 20: { sig: sigModell20, ch: true, gemessen: new Date(START).toISOString() } } }));
    const r = await lauf(w, LIVE, { freigabe: true, dir });
    return { w, r };
  };
  const fremd = await dateiMit(2);
  gleich(fremd.r.code, 0, '20: Zustand mit fremdem Schema: Lauf geht weiter');
  ok(dateiObjekt(fremd.w).modelle.includes(20), '20: der fremde Zustand («Modell 20 hat eine Schweizer Rate») wird nicht geglaubt: Modell 20 bleibt ausgeblendet');
  ok(fremd.w.modelle.get(20).rateAnfragen >= 1, '20: Modell 20 wurde neu gemessen');
  const eigen = await dateiMit(1);
  ok(eigen.w.modelle.get(20).rateAnfragen === 0 && !dateiObjekt(eigen.w).modelle.includes(20), '20: Gegenprobe: derselbe Zustand mit Schema 1 wird geglaubt (keine Messung, Modell kommt zurück)');
}

// ═════════════════════════════════════════════════════════════ 21. Preisauskunft: mehrere Testvarianten, Zeitlimit
{
  // a) erste Testvariante ausverkauft, zweite liefert eine Rate: das Modell ist für die Schweiz bestellbar
  const w = standardWelt();
  w.modelle.set(20, modell(20, { status: [DA, { US: 'in_stock' }, DA], rateSkript: ['aus', 'ok'] }));
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich([r.code, w.modelle.get(20).rateAnfragen, dateiObjekt(w).modelle.includes(20)], [0, 2, false], '21a: nach «ausverkauft» wird die zweite Testvariante probiert; mit Rate kommt das Modell zurück');
  // b) zwei eindeutige Absagen genügen, die dritte Variante wird nicht mehr gefragt
  const w2 = standardWelt();
  w2.modelle.set(20, modell(20, { status: [DA, { US: 'in_stock' }, { EU: 'in_stock' }], rateSkript: ['keine', 'keine', 'ok'] }));
  const r2 = await lauf(w2, LIVE, { freigabe: true });
  gleich([r2.code, w2.modelle.get(20).rateAnfragen, dateiObjekt(w2).modelle.includes(20)], [0, 2, true], '21b: zwei eindeutige Absagen: Schluss, Modell bleibt ausgeblendet');
  // c) Zeitlimit gilt auch in der Rate-Phase
  const voll = standardWelt();
  const rv = await lauf(voll, { PF_ABSTAND_MS: '2000', PF_PARALLEL: '1', RUN_LIMIT_MS: '9999999' });
  const nVoll = voll.req.filter((x) => x.pfad === '/shipping/rates').length;
  const kurz = standardWelt();
  const rk = await lauf(kurz, { PF_ABSTAND_MS: '2000', PF_PARALLEL: '1', RUN_LIMIT_MS: '27000' });
  const nKurz = kurz.req.filter((x) => x.pfad === '/shipping/rates').length;
  ok(rv.code === 0 && rk.code === 0 && nVoll >= 6, `21c: Ausgangslage: ohne Limit ${nVoll} Preisauskünfte, Exit 0`);
  ok(nKurz >= 1 && nKurz < nVoll, `21c: das Zeitlimit stoppt die Preisauskünfte (${nKurz} statt ${nVoll}), alle Modelle sind gelesen`);
  gleich(kurz.req.filter((x) => x.methode === 'GET').length, 12, '21c: alle 12 Modelle wurden vor dem Limit gelesen');
}

// ═════════════════════════════════════════════════════════════ 22. Seitenlimit der Shop-Abfrage
{
  const w = standardWelt(); w.seite = 1;
  for (let i = 0; i < 70; i++) w.produkte.push(produkt(100 + i, 'ACTIVE', [variante('gid://V/z' + i, 'WM-Z-' + i)]));
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich([r.code, w.mut.length], [1, 0], '22: mehr als 60 Seiten: Exit 1 ohne Schreiben');
  ok(r.errs.some((x) => /mehr als 60 Seiten/.test(x)), '22: Meldung');
}

// ═════════════════════════════════════════════════════════════ 23. Produkt nur mit SKU 9000001_<Variante> (ohne POD-Tag)
{
  const w = standardWelt();
  w.produkte.push(produkt(12, 'ACTIVE', [variante('gid://V/s1', '9000001_1801'), variante('gid://V/s2', '9000001_1802')], ['bild-ok']));
  w.modelle.get(18).varianten.forEach((v) => { v.status = AUS; });
  const r = await lauf(w, LIVE, { freigabe: true });
  gleich([r.code, status(w, 12)], [0, 'DRAFT'], '23: Produkt ohne POD-Tag, aber mit Printful-SKU, geht bei Ausfall auf ENTWURF');
  ok(tags(w, 12).includes(TAG_AUS) && tags(w, 12).includes('bild-ok'), '23: es trägt unser Tag, die anderen Tags bleiben');
  // dasselbe Produkt mit einer fremden SKU daneben: nie
  const w2 = standardWelt();
  w2.produkte.push(produkt(12, 'ACTIVE', [variante('gid://V/s1', '9000001_1801'), variante('gid://V/s2', 'ZZ-9')], ['bild-ok']));
  w2.modelle.get(18).varianten.forEach((v) => { v.status = AUS; });
  await lauf(w2, LIVE, { freigabe: true });
  gleich(status(w2, 12), 'ACTIVE', '23: mit einer fremden SKU daneben wird das Produkt nicht angefasst');
}

for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* aufräumen */ } }
console.log(`${n} Prüfungen bestanden`);
