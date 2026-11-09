// Tests für die Rückmeldung CJ → Shopify: automation/lib/cj_tracking.mjs (reine Logik) und automation/cj_tracking.mjs (Verhalten).
// Das Skript läuft im KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein CJ, kein Telegram). Geprüft wird, was GESENDET wird:
// fulfillmentCreate / fulfillmentTrackingInfoUpdate (Nummer, Firma, Link, Positionen, notifyCustomer), Tags, Telegram-Texte, Exit-Code, API-Version, Abfragetexte.
// Der Fake-Shopify liefert NUR die Felder, die die Abfrage verlangt (und antwortet mit einem GraphQL-Fehler bei unbekannten Feldern oder falschen Variablentypen):
// sonst blieben kaputte oder zu schmale Abfragen grün (Lehre aus der Mutationsprobe zu printful_tracking, 03.11.2026).
// ALLE Zeiten sind relativ zu «jetzt» gebaut: ein fester Stichtag würde irgendwann still rot (Lehre test_autoupdate, 08.11.2026).
// Lauf: /opt/node22/bin/node automation/cj_tracking_test.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lxNummer, istCjSku, trackingFirma, trackingUrl, planCj, normNummer, SCHWELLEN_STUNDEN, CJ_VERSENDET, CJ_STORNIERT, CJ_UNBEZAHLT, CJ_IM_LAGER } from './lib/cj_tracking.mjs';

const SELF = fileURLToPath(import.meta.url);
const H = 3600 * 1000;
const cjZeit = (msVor) => new Date(Date.now() - msVor).toISOString().replace('T', ' ').slice(0, 19); // «2026-11-04 16:11:47» (UTC, wie CJ)
const isoVor = (msVor) => new Date(Date.now() - msVor).toISOString();

// ═════════════════════════════════════════════════════════════ KINDPROZESS: Runner gegen gefälschte Netzwerke
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.CT_SZENARIO);
  Object.assign(process.env, { SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', CJ_EMAIL: 'e@x.ch', CJ_API_KEY: 'cj-key', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c',
    RETRY_PAUSE_MS: '0', CJ_PAUSE_MS: '0', CJ_BACKOFF_MS: '0', CJ_TOKEN_CACHE: join(process.env.CT_TMP, 'kein-token-' + process.pid + '.json') });
  for (const k of ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'GITHUB_STEP_SUMMARY', 'MAX', 'FENSTER_TAGE', 'DRY_RUN', 'RUN_LIMIT_MS', 'KUNDIN_MAILEN', 'NUR']) delete process.env[k];
  if (sz.dry !== undefined) process.env.DRY_RUN = sz.dry;
  if (sz.mailen !== undefined) process.env.KUNDIN_MAILEN = sz.mailen;
  if (sz.nur !== undefined) process.env.NUR = sz.nur;
  if (sz.ohneCj) delete process.env.CJ_API_KEY;
  if (sz.ohneShopify) delete process.env.SHOPIFY_ADMIN_TOKEN;
  if (sz.ohneTelegram) { delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
  if (sz.summaryDatei) process.env.GITHUB_STEP_SUMMARY = sz.summaryDatei;
  if (sz.runLimit !== undefined) process.env.RUN_LIMIT_MS = String(sz.runLimit);
  if (sz.fensterTage) process.env.FENSTER_TAGE = String(sz.fensterTage);
  const prot = { fulfills: [], tracks: [], tagsAdd: [], tagsRemove: [], tg: [], queries: [], versionen: [], cjAuth: [], cjListe: 0, cjDetail: [], exit: null, log: [], err: [], cjHeader: [], urls: [] };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  let fulfillAufrufe = 0, trackAufrufe = 0;
  const mk = (status, body, kopf = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (kopf[String(k).toLowerCase()] ?? (String(k).toLowerCase() === 'x-shopify-api-version' ? (sz.apiVersion || '2026-01') : null)) }, json: async () => body });

  // ---- minimaler GraphQL-Leser: Auswahl der Abfrage → Projektion der Fake-Daten (falsches oder zu schmales Feld = GraphQL-Fehler)
  const parseAuswahl = (q) => {
    const s = q.replace(/^\s*(query|mutation)\b[^{]*/, '');
    let i = 0;
    const ws = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
    const name = () => { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if (!m) throw new Error('GraphQL-Syntax bei: ' + s.slice(i, i + 25)); i += m[0].length; return m[0]; };
    const klammern = () => { let t = 0; do { if (s[i] === '(') t++; if (s[i] === ')') t--; i++; } while (t > 0 && i < s.length); };
    const menge = () => {
      if (s[i] !== '{') throw new Error('GraphQL-Syntax: { erwartet bei ' + s.slice(i, i + 25));
      i++; const felder = []; ws();
      while (s[i] !== '}') {
        if (i >= s.length) throw new Error('GraphQL-Syntax: } fehlt');
        const key = name(); let feld = key; ws();
        if (s[i] === ':') { i++; ws(); feld = name(); ws(); }
        if (s[i] === '(') { klammern(); ws(); }
        let kinder = null; if (s[i] === '{') kinder = menge();
        felder.push({ key, name: feld, kinder }); ws();
      }
      i++; return felder;
    };
    ws(); return menge();
  };
  const projiziere = (wert, felder) => {
    if (Array.isArray(wert)) return wert.map((w) => projiziere(w, felder));
    if (wert === null || typeof wert !== 'object') return wert;
    const out = {};
    for (const f of felder) {
      const roh = f.key in wert ? wert[f.key] : (f.name in wert ? wert[f.name] : undefined);
      if (roh === undefined) throw new Error(`Cannot query field "${f.name}"`);
      out[f.key] = f.kinder ? projiziere(roh, f.kinder) : roh;
    }
    return out;
  };
  const antwort = (q, daten) => { try { return mk(200, { data: projiziere(daten, parseAuswahl(q)) }); } catch (e) { return mk(200, { errors: [{ message: e.message }] }); } };

  const nummerVon = (o) => o.name.replace('#', '');
  const knoten = (o) => {
    const zeilen = o.lines || [{ sku: 'CJ-X1', qty: 1 }];
    const fos = o.fos !== undefined ? o.fos : [{ id: 'gid://shopify/FulfillmentOrder/' + nummerVon(o), lines: zeilen.map((l, i) => ({ id: 'gid://shopify/FulfillmentOrderLineItem/' + nummerVon(o) + '-' + (i + 1), sku: l.sku, remaining: l.qty })) }];
    const variante = (l) => (l.variantSku === null ? null : { sku: l.variantSku === undefined ? l.sku : l.variantSku });
    return {
      id: o.id || 'gid://shopify/Order/' + nummerVon(o), name: o.name, createdAt: o.createdAt, cancelledAt: o.cancelledAt || null, tags: o.tags || [],
      lineItems: { pageInfo: { hasNextPage: !!o.vieleLinien }, nodes: zeilen.map((l) => ({ sku: l.sku, currentQuantity: l.qty, variant: variante(l) })) },
      fulfillments: (o.fulfillments || []).map((f) => ({ id: f.id, status: f.status || 'SUCCESS', trackingInfo: (f.nummern || []).map((n) => ({ number: n })) })),
      fulfillmentOrders: { edges: fos.map((fo) => ({ node: {
        id: fo.id, status: fo.status || 'OPEN', supportedActions: (fo.aktionen || ['CREATE_FULFILLMENT']).map((a) => ({ action: a })),
        assignedLocation: { location: { id: fo.ort || 'gid://shopify/Location/1', isFulfillmentService: !!fo.dienst } },
        lineItems: { edges: fo.lines.map((l) => ({ node: { id: l.id, remainingQuantity: l.remaining, lineItem: { sku: l.sku, variant: variante(l) } } })) },
      } })) },
    };
  };

  globalThis.fetch = async (url, o = {}) => {
    url = String(url); prot.urls.push(url);
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      prot.versionen.push(url.split('/admin/api/')[1].split('/')[0]);
      if (q.includes('shop {')) { if (sz.authFehler) return mk(401, { errors: 'Unauthorized' }); return antwort(q, { shop: { name: 'x' } }); }
      if (q.includes('orders(first')) {
        if (!/orders\(first:\$n,\s*after:\$after,\s*query:\$q,\s*sortKey:CREATED_AT\)/.test(q)) return mk(200, { errors: [{ message: 'orders-Argumente falsch' }] });
        if (!/fulfillmentOrders\(first:20\)/.test(q) || !/lineItems\(first:50\)/.test(q) || !/lineItems\(first:25\)/.test(q)) return mk(200, { errors: [{ message: 'Seitengrösse der Unterlisten falsch' }] });
        if (!/^\s*query\(\$q:String!,\s*\$n:Int!,\s*\$after:String\)/.test(q)) return mk(200, { errors: [{ message: 'Variablentypen der Bestellabfrage falsch' }] });
        if (!(b.variables.n >= 1 && b.variables.n <= 10)) return mk(200, { errors: [{ message: 'MAX_COST_EXCEEDED: Seitengrösse über 10' }] });
        if (sz.ordersFehler) return mk(sz.ordersFehler, { errors: 'Access denied for orders field.' });
        prot.queries.push(b.variables.q);
        const istFertig = b.variables.q.includes('fulfillment_status:shipped');
        const seiten = istFertig ? [sz.fertige || []] : (sz.offeneSeiten || [sz.offene || []]);
        const nr = b.variables.after ? Number(String(b.variables.after).replace('c', '')) : 0;
        const liste = seiten[Math.min(nr, seiten.length - 1)] || [];
        return antwort(q, { orders: { pageInfo: { hasNextPage: sz.haengenderCursor ? true : nr < seiten.length - 1, endCursor: sz.haengenderCursor ? 'c0' : 'c' + (nr + 1) }, edges: liste.map((x) => ({ node: knoten(x) })) } });
      }
      if (q.includes('fulfillmentCreate')) {
        fulfillAufrufe++; prot.fulfills.push(b.variables.f);
        if (!q.includes('$f:FulfillmentInput!') || !/fulfillmentCreate\(fulfillment:\$f\)/.test(q) || !/userErrors\{\s*field\s+message\s*\}/.test(q)) return mk(200, { errors: [{ message: 'fulfillmentCreate: Argument, Typ oder userErrors falsch' }] });
        if (sz.fulfill500) return mk(500, { errors: 'boom' });
        if (sz.fulfillFehler) return antwort(q, { fulfillmentCreate: { fulfillment: null, userErrors: [{ field: ['x'], message: 'kaputt' }] } });
        return antwort(q, { fulfillmentCreate: { fulfillment: { id: 'gid://shopify/Fulfillment/' + fulfillAufrufe, status: 'SUCCESS' }, userErrors: [] } });
      }
      if (q.includes('fulfillmentTrackingInfoUpdate')) {
        trackAufrufe++; prot.tracks.push({ id: b.variables.id, t: b.variables.t, n: b.variables.n });
        if (!q.includes('$id:ID!') || !q.includes('$t:FulfillmentTrackingInput!') || !q.includes('$n:Boolean') || !/fulfillmentTrackingInfoUpdate\(fulfillmentId:\$id,\s*trackingInfoInput:\$t,\s*notifyCustomer:\$n\)/.test(q)) return mk(200, { errors: [{ message: 'fulfillmentTrackingInfoUpdate: Argument oder Typ falsch' }] });
        if (sz.track500) return mk(500, { errors: 'boom' });
        if (sz.trackFehler) return antwort(q, { fulfillmentTrackingInfoUpdate: { fulfillment: null, userErrors: [{ field: ['x'], message: 'kaputt' }] } });
        return antwort(q, { fulfillmentTrackingInfoUpdate: { fulfillment: { id: b.variables.id, status: 'SUCCESS' }, userErrors: [] } });
      }
      if (q.includes('tagsAdd')) {
        if (!q.includes('$id:ID!') || !q.includes('$tags:[String!]!') || !/tagsAdd\(id:\$id,\s*tags:\$tags\)/.test(q) || !/userErrors\{\s*message\s*\}/.test(q)) return mk(200, { errors: [{ message: 'tagsAdd: Argument, Typ oder userErrors falsch' }] });
        prot.tagsAdd.push({ id: b.variables.id, tags: b.variables.tags });
        return antwort(q, { tagsAdd: { userErrors: sz.tagFehler ? [{ message: 'nein' }] : [] } });
      }
      if (q.includes('tagsRemove')) {
        if (!q.includes('$id:ID!') || !q.includes('$tags:[String!]!') || !/tagsRemove\(id:\$id,\s*tags:\$tags\)/.test(q) || !/userErrors\{\s*message\s*\}/.test(q)) return mk(200, { errors: [{ message: 'tagsRemove: Argument, Typ oder userErrors falsch' }] });
        prot.tagsRemove.push({ id: b.variables.id, tags: b.variables.tags });
        return antwort(q, { tagsRemove: { userErrors: [] } });
      }
      return mk(200, { errors: [{ message: 'unbekannte Abfrage' }] });
    }
    if (url.includes('developers.cjdropshipping.com')) {
      if (url.includes('authentication/getAccessToken')) {
        prot.cjAuth.push(JSON.parse(o.body));
        if (sz.cjAuthFehler) return mk(200, { code: 1600001, result: false, message: 'falsch', data: null });
        return mk(200, { code: 200, result: true, message: 'Success', data: { accessToken: 'cj-token', accessTokenExpiryDate: new Date(Date.now() + 15 * 24 * H).toISOString() } });
      }
      prot.cjHeader.push((o.headers || {})['CJ-Access-Token']);
      if (url.includes('shopping/order/list')) {
        prot.cjListe++;
        if (sz.cjListeFehler) return mk(200, { code: 1600500, result: false, message: 'kaputt', data: null });
        const seite = Number(new URL(url).searchParams.get('pageNum') || 1);
        return mk(200, { code: 200, result: true, message: 'Success', data: { list: (sz.cjListe || []).slice((seite - 1) * 50, seite * 50) } });
      }
      if (url.includes('shopping/order/getOrderDetail')) {
        const id = decodeURIComponent(url.split('orderId=')[1]); prot.cjDetail.push(id);
        if ((sz.cjDetail500 || []).includes(id)) return mk(500, { error: 'x' });
        return mk(200, { code: 200, result: true, message: 'Success', data: (sz.cjDetail || {})[id] || {} });
      }
      return mk(404, {});
    }
    if (url.includes('api.telegram.org')) {
      const body = JSON.parse(o.body); prot.tg.push(body.text);
      if (sz.tgFehler) return mk(400, { ok: false });
      return mk(200, { ok: true });
    }
    return mk(200, {});
  };
  const echtesExit = process.exit.bind(process);
  process.exit = (c) => { prot.exit = c === undefined ? 0 : c; fertig(); };
  console.log = (...a) => { const t = a.join(' '); prot.log.push(t); if (/^CJ-Rückmeldung (fertig|abgebrochen)/.test(t)) fertig(); };
  console.error = (...a) => { prot.err.push(a.join(' ')); };
  await import('./cj_tracking.mjs');
  await Promise.race([ende, new Promise((r) => setTimeout(r, 20000))]);
  await new Promise((r) => setTimeout(r, 40)); // Telegram-Nachlauf nach dem Exit-Aufruf
  process.stdout.write('\nCT_ERGEBNIS ' + JSON.stringify(prot) + '\n', () => echtesExit(0));
  await new Promise(() => {});
}

// ═════════════════════════════════════════════════════════════ ELTERNPROZESS: Prüfungen
let ok = 0, fehl = 0;
const ist = (name, bedingung, detail) => { if (bedingung) { ok++; } else { fehl++; console.log('FEHLER:', name, detail !== undefined ? '→ ' + JSON.stringify(detail).slice(0, 400) : ''); } };
const gleich = (name, a, b) => ist(name, JSON.stringify(a) === JSON.stringify(b), { ist: a, soll: b });

// ───── 1. kleine Helfer
gleich('lxNummer: «#1034» → LX1034', lxNummer('#1034'), 'LX1034');
gleich('lxNummer: ohne Raute', lxNummer('1034'), 'LX1034');
gleich('lxNummer: fünfstellig', lxNummer('#10345'), 'LX10345');
gleich('lxNummer: «#1034-A» (Bestellung bearbeitet) → null', lxNummer('#1034-A'), null);
gleich('lxNummer: zu kurz → null', lxNummer('#12'), null);
gleich('lxNummer: leer/null/undefined → null', [lxNummer(''), lxNummer(null), lxNummer(undefined)], [null, null, null]);
ist('istCjSku: CJ… und CJ-CJ…', istCjSku('CJYD321170710JQ') && istCjSku('CJ-CJJJCWMY00128-Black-S') && istCjSku('cjxx1') && istCjSku('  CJAB'));
ist('istCjSku: Printful, Fortura, leer, null → nein', !istCjSku('9100403_1320') && !istCjSku('FGSS0052') && !istCjSku('') && !istCjSku(null) && !istCjSku(undefined) && !istCjSku('XCJ1'));
gleich('trackingFirma: CJPacket-Varianten', ['CJPacket Ordinary VIP', 'CJPacket EQ Sensitive', 'cjpacket fast'].map(trackingFirma), ['CJPacket', 'CJPacket', 'CJPacket']);
gleich('trackingFirma: DHL, PostNL, UPS, FedEx', ['DHL Official', 'PostNL', 'UPS Express', 'FedEx IP'].map(trackingFirma), ['DHL', 'PostNL', 'UPS', 'FedEx']);
gleich('trackingFirma: unbekannt bleibt, leer → CJ Dropshipping', [trackingFirma('Yun Express'), trackingFirma(''), trackingFirma(null)], ['Yun Express', 'CJ Dropshipping', 'CJ Dropshipping']);
gleich('trackingUrl: CJ-Link englisch → deutsch', trackingUrl('https://t.17track.net/en#nums=EQKPT8613208136YQ', 'EQKPT8613208136YQ'), 'https://t.17track.net/de#nums=EQKPT8613208136YQ');
gleich('trackingUrl: ohne CJ-Link → eigener 17track-Link', trackingUrl('', 'LX055331815NL'), 'https://t.17track.net/de#nums=LX055331815NL');
gleich('trackingUrl: fremder Link wird NICHT übernommen (kommt in eine Kundenmail)', trackingUrl('https://boese.example/x#nums=A1', 'A1'), 'https://t.17track.net/de#nums=A1');
gleich('trackingUrl: Link mit Zusatz nach der Nummer wird verworfen', trackingUrl('https://t.17track.net/en#nums=A1&x=<script>', 'A1'), 'https://t.17track.net/de#nums=A1');
gleich('trackingUrl: Nummer mit Leerzeichen → kein Link', trackingUrl('', 'AB 12'), '');
gleich('normNummer: Leerzeichen, Bindestrich, Gross-/Kleinschreibung', normNummer(' eqkpt-86 13.2 '), 'EQKPT8613' + '2');
gleich('Schwellen (Stunden)', SCHWELLEN_STUNDEN, { cjFehlt: 24, cjUnbezahlt: 24, cjHaengt: 168, ohneNummer: 48 });
ist('Statusmengen sind getrennt', [...CJ_VERSENDET].every((s) => !CJ_STORNIERT.has(s) && !CJ_UNBEZAHLT.has(s) && !CJ_IM_LAGER.has(s)) && CJ_IM_LAGER.has('UNSHIPPED') && CJ_VERSENDET.has('SHIPPED') && CJ_VERSENDET.has('DELIVERED') && CJ_STORNIERT.has('TRASH') && CJ_UNBEZAHLT.has('CREATED'));

// ───── 2. planCj
const JETZT = Date.now();
const shopB = (u = {}) => ({ name: '#1034', lx: 'LX1034', createdAt: isoVor(48 * H), zeilen: [{ foId: 'FO1', lineId: 'L1', ortId: 'LOC1', remaining: 1 }], pausiert: 0, cjEinheiten: 1, lieferungen: [], bekannteNummern: [], ...u });
const cjB = (u = {}) => ({ status: 'SHIPPED', trackNumber: 'EQKPT1', logisticName: 'CJPacket Ordinary VIP', trackingUrl: 'https://t.17track.net/en#nums=EQKPT1', createDate: cjZeit(96 * H), paymentDate: cjZeit(95 * H), outWarehouseTime: cjZeit(24 * H), einheiten: 1, ...u });
const plan = (shop, cj) => planCj({ shop, cj, jetztMs: JETZT });

let p = plan(shopB(), cjB());
gleich('SHIPPED: eine Aktion «melden» mit Nummer, Firma, deutschem Link und Mail', p.aktionen, [{ art: 'melden', nummer: 'EQKPT1', firma: 'CJPacket', url: 'https://t.17track.net/de#nums=EQKPT1', notify: true, positionen: [{ foId: 'FO1', lineId: 'L1', ortId: 'LOC1', quantity: 1 }] }]);
ist('SHIPPED: fertig, kein Befund, nichts wartet', p.fertig === true && p.befund === null && p.wartet === null);
p = plan(shopB(), cjB({ status: 'DELIVERED' }));
ist('DELIVERED: melden, aber OHNE Kundenmail («ist unterwegs» nach der Zustellung wäre falsch)', p.aktionen.length === 1 && p.aktionen[0].notify === false);
p = plan(shopB(), cjB({ status: ' shipped ' }));
ist('Status wird getrimmt und gross geschrieben', p.aktionen.length === 1);
p = plan(shopB({ zeilen: [{ foId: 'FO1', lineId: 'L1', ortId: 'LOC1', remaining: 2 }, { foId: 'FO2', lineId: 'L2', ortId: 'LOC2', remaining: 1 }], cjEinheiten: 3 }), cjB({ einheiten: 3 }));
gleich('mehrere Positionen und Orte: alle in EINER Aktion mit ihren Mengen', p.aktionen[0].positionen, [{ foId: 'FO1', lineId: 'L1', ortId: 'LOC1', quantity: 2 }, { foId: 'FO2', lineId: 'L2', ortId: 'LOC2', quantity: 1 }]);
p = plan(shopB({ zeilen: [{ foId: 'FO1', lineId: 'L1', remaining: 1 }] }), cjB());
ist('Position ohne Standort-Id: ortId = null', p.aktionen[0].positionen[0].ortId === null);

p = plan(shopB(), cjB({ trackNumber: '', outWarehouseTime: cjZeit(1 * H) }));
ist('SHIPPED ohne Nummer, jung: warten, nichts melden', p.aktionen.length === 0 && /ohne Sendungsnummer/.test(p.wartet || '') && p.befund === null && p.fertig === false);
p = plan(shopB(), cjB({ trackNumber: '   ', outWarehouseTime: cjZeit(60 * H) }));
ist('SHIPPED ohne Nummer seit 60 h: Befund ohne-nummer mit «3 Tagen»', p.befund && p.befund.art === 'ohne-nummer' && /3 Tagen/.test(p.befund.text) && p.aktionen.length === 0, p.befund);
p = plan(shopB(), cjB({ trackNumber: null, outWarehouseTime: cjZeit(47 * H) }));
ist('ohne Nummer bei 47 h: noch kein Befund (Grenze 48 h)', p.befund === null && p.wartet !== null);
p = plan(shopB(), cjB({ trackNumber: null, outWarehouseTime: cjZeit(48 * H + 1000) }));
ist('ohne Nummer bei 48 h: Befund', p.befund && p.befund.art === 'ohne-nummer');

p = plan(shopB(), cjB({ status: 'UNSHIPPED', paymentDate: cjZeit(2 * 24 * H), outWarehouseTime: null }));
ist('UNSHIPPED seit 2 Tagen: warten', p.aktionen.length === 0 && /im CJ-Lager/.test(p.wartet) && p.befund === null && p.fertig === false);
p = plan(shopB(), cjB({ status: 'UNSHIPPED', paymentDate: cjZeit(167 * H), outWarehouseTime: null }));
ist('UNSHIPPED seit 167 h: noch kein Befund', p.befund === null);
p = plan(shopB(), cjB({ status: 'UNSHIPPED', paymentDate: cjZeit(169 * H), outWarehouseTime: null }));
ist('UNSHIPPED seit 169 h: Befund cj-haengt mit «7 Tagen»', p.befund && p.befund.art === 'cj-haengt' && /7 Tagen/.test(p.befund.text) && /CJ-Ticket/.test(p.befund.text), p.befund);
p = plan(shopB(), cjB({ status: 'UNSHIPPED', paymentDate: null, createDate: cjZeit(10 * 24 * H), outWarehouseTime: null }));
ist('UNSHIPPED ohne Zahlungsdatum: das Anlegedatum zählt', p.befund && p.befund.art === 'cj-haengt');

p = plan(shopB(), cjB({ status: 'CREATED', createDate: cjZeit(23 * H), paymentDate: null }));
ist('CREATED seit 23 h: warten (noch nicht bezahlt)', p.befund === null && /nicht bezahlt/.test(p.wartet));
p = plan(shopB(), cjB({ status: 'CREATED', createDate: cjZeit(25 * H), paymentDate: null }));
ist('CREATED seit 25 h: Befund cj-unbezahlt', p.befund && p.befund.art === 'cj-unbezahlt' && /in CJ bezahlen/.test(p.befund.text), p.befund);
p = plan(shopB(), cjB({ status: 'UNPAID', createDate: cjZeit(25 * H), paymentDate: null }));
ist('UNPAID zählt wie CREATED', p.befund && p.befund.art === 'cj-unbezahlt');
for (const st of ['CLOSED', 'TRASH', 'CANCELLED', 'CANCELED']) {
  p = plan(shopB(), cjB({ status: st }));
  ist(`${st} bei offener Bestellung: Befund cj-storniert, nichts melden`, p.befund && p.befund.art === 'cj-storniert' && p.aktionen.length === 0 && p.befund.text.includes(st), p.befund);
}
p = plan(shopB({ zeilen: [] }), cjB({ status: 'CLOSED' }));
ist('CLOSED ohne offene Positionen: nichts zu tun, fertig', p.befund === null && p.fertig === true && p.aktionen.length === 0);
p = plan(shopB({ zeilen: [] }), cjB({ status: 'UNSHIPPED', paymentDate: cjZeit(10 * 24 * H) }));
ist('im Lager, aber nichts offen (von Hand gemeldet): kein Befund, fertig', p.befund === null && p.fertig === true);
p = plan(shopB({ zeilen: [] }), cjB({ status: 'CREATED', createDate: cjZeit(10 * 24 * H) }));
ist('unbezahlt, aber nichts offen: kein Befund, fertig', p.befund === null && p.fertig === true);
p = plan(shopB(), cjB({ status: 'MERKWUERDIG' }));
ist('unbekannter Status: Befund cj-status-unbekannt mit dem Status im Text', p.befund && p.befund.art === 'cj-status-unbekannt' && /MERKWUERDIG/.test(p.befund.text) && p.aktionen.length === 0, p.befund);
p = plan(shopB(), cjB({ status: '' }));
ist('leerer Status: «leer» im Text', p.befund && /leer/.test(p.befund.text));
p = plan(shopB(), cjB({ status: undefined }));
ist('fehlender Status: Befund, kein Absturz', p.befund && p.befund.art === 'cj-status-unbekannt');

p = plan(shopB({ createdAt: isoVor(23 * H) }), null);
ist('kein CJ-Auftrag, 23 h alt: warten', p.befund === null && /noch nicht angelegt/.test(p.wartet) && p.aktionen.length === 0);
p = plan(shopB({ createdAt: isoVor(25 * H) }), null);
ist('kein CJ-Auftrag, 25 h alt: Befund cj-fehlt mit Nummer', p.befund && p.befund.art === 'cj-fehlt' && /LX1034/.test(p.befund.text) && /25 h/.test(p.befund.text), p.befund);
p = plan(shopB({ createdAt: isoVor(5 * 24 * H) }), null);
ist('kein CJ-Auftrag, 5 Tage alt: «5 Tagen»', p.befund && /5 Tagen/.test(p.befund.text));
p = plan(shopB({ zeilen: [] }), null);
ist('kein CJ-Auftrag, aber nichts offen und alles gemeldet: fertig', p.fertig === true && p.befund === null);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: [] }] }), null);
ist('Lieferung ohne Nummer, kein CJ-Auftrag: warten mit passendem Text', p.befund === null && /CJ-Auftrag LX1034 nicht gefunden/.test(p.wartet) && p.fertig === false, p);
p = plan(shopB({ createdAt: 'kaputt' }), null);
ist('unlesbares Bestelldatum: kein Befund, kein Absturz', p.befund === null && p.wartet !== null);
p = plan(shopB({ lx: null }), cjB());
ist('Bestellname ohne Nummer: nichts tun', p.aktionen.length === 0 && /ohne eindeutige Nummer/.test(p.wartet));

p = plan(shopB({ cjEinheiten: 1 }), cjB({ einheiten: 2 }));
ist('Stückzahl bei CJ weicht ab: NICHT melden, Befund positionen-abweichung mit beiden Zahlen', p.aktionen.length === 0 && p.befund && p.befund.art === 'positionen-abweichung' && /\(2\)/.test(p.befund.text) && /\(1\)/.test(p.befund.text) && p.fertig === false, p);
p = plan(shopB(), cjB({ einheiten: null }));
ist('CJ nennt keine Stückzahl: NICHT melden, Befund positionen-unbekannt', p.aktionen.length === 0 && p.befund && p.befund.art === 'positionen-unbekannt');
p = plan(shopB({ cjEinheiten: null }), cjB({ einheiten: 1 }));
ist('Shop kennt die Stückzahl nicht (mehr als 25 Positionen): NICHT melden', p.aktionen.length === 0 && p.befund && p.befund.art === 'positionen-abweichung');
p = plan(shopB({ cjEinheiten: 1 }), cjB({ status: 'DELIVERED', einheiten: 3 }));
ist('auch DELIVERED wird bei abweichender Stückzahl nicht gemeldet', p.aktionen.length === 0 && p.befund && p.befund.art === 'positionen-abweichung');
p = plan(shopB({ zeilen: [], cjEinheiten: 1, lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: ['EQKPT1'] }], bekannteNummern: ['EQKPT1'] }), cjB({ einheiten: 5 }));
ist('alles gemeldet und Nummer bekannt: die Stückzahl wird nicht mehr geprüft (nichts offen)', p.befund === null && p.fertig === true && p.aktionen.length === 0);

p = plan(shopB({ bekannteNummern: ['eqkpt 1'] }), cjB());
ist('Nummer steht schon in Shopify (andere Schreibweise), Position offen: NICHT doppelt melden, Befund nummer-bekannt-offen', p.aktionen.length === 0 && p.befund && p.befund.art === 'nummer-bekannt-offen', p);

p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'gid://shopify/Fulfillment/9', status: 'SUCCESS', nummern: [] }] }), cjB());
gleich('bereits «versendet» ohne Nummer: Nummer NACHTRAGEN an dieser Lieferung', p.aktionen, [{ art: 'nachtragen', lieferungId: 'gid://shopify/Fulfillment/9', nummer: 'EQKPT1', firma: 'CJPacket', url: 'https://t.17track.net/de#nums=EQKPT1', notify: true }]);
ist('Nachtragen: fertig', p.fertig === true && p.befund === null);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: [] }, { id: 'F2', status: 'SUCCESS', nummern: [] }] }), cjB());
ist('zwei Lieferungen ohne Nummer: nicht raten, Befund mehrere-ohne-nummer', p.aktionen.length === 0 && p.befund && p.befund.art === 'mehrere-ohne-nummer' && /2 Lieferungen/.test(p.befund.text), p);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'CANCELLED', nummern: [] }, { id: 'F2', status: 'SUCCESS', nummern: [] }] }), cjB());
ist('eine stornierte Lieferung ohne Nummer zählt nicht', p.aktionen.length === 1 && p.aktionen[0].lieferungId === 'F2');
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: ['ANDERE1'] }, { id: 'F2', status: 'SUCCESS', nummern: [] }], bekannteNummern: ['ANDERE1'] }), cjB());
ist('eine Lieferung mit anderer Nummer und eine ohne: die leere bekommt die CJ-Nummer', p.aktionen.length === 1 && p.aktionen[0].lieferungId === 'F2' && p.aktionen[0].art === 'nachtragen');
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: ['EQKPT1'] }], bekannteNummern: ['EQKPT1'] }), cjB());
ist('Nummer schon an der Lieferung: nichts zu tun, fertig', p.aktionen.length === 0 && p.fertig === true && p.befund === null);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: ['EQKPT1'] }, { id: 'F2', status: 'SUCCESS', nummern: [] }], bekannteNummern: ['EQKPT1'] }), cjB());
ist('Nummer steht schon an einer anderen Lieferung: die leere Lieferung NICHT mit derselben Nummer füllen', p.aktionen.length === 0 && p.befund === null && p.fertig === true, p);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: ['MANUELL9'] }], bekannteNummern: ['MANUELL9'] }), cjB());
ist('von Hand mit anderer Nummer gemeldet: nicht anfassen, fertig', p.aktionen.length === 0 && p.fertig === true && p.befund === null);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: [] }], cjEinheiten: 1 }), cjB({ status: 'DELIVERED' }));
ist('Nachtragen nach Zustellung: still (keine Mail)', p.aktionen.length === 1 && p.aktionen[0].notify === false);
p = plan(shopB({ zeilen: [], lieferungen: [{ id: 'F1', status: 'SUCCESS', nummern: [] }], cjEinheiten: 2 }), cjB({ einheiten: 1 }));
ist('Nachtragen nur, wenn die Stückzahl passt', p.aktionen.length === 0 && p.befund && p.befund.art === 'positionen-abweichung');

p = plan(shopB({ pausiert: 1 }), cjB());
ist('eine Position in nicht meldbarer Fulfillment-Order: die meldbare wird gemeldet, dazu Befund nicht-meldbar, NICHT fertig', p.aktionen.length === 1 && p.befund && p.befund.art === 'nicht-meldbar' && p.fertig === false, p);
p = plan(shopB({ zeilen: [], pausiert: 2 }), cjB());
ist('alle offenen Positionen nicht meldbar: keine Aktion, Befund, nicht fertig', p.aktionen.length === 0 && p.befund && p.befund.art === 'nicht-meldbar' && /2 CJ-Position/.test(p.befund.text) && p.fertig === false);
p = plan(shopB({ zeilen: [], pausiert: 1 }), cjB({ status: 'UNSHIPPED', paymentDate: cjZeit(1 * H) }));
ist('nur pausierte Positionen und CJ noch im Lager: warten (kein Befund nicht-meldbar vor dem Versand)', p.befund === null && p.aktionen.length === 0);

// ───── 3. Runner im Kindprozess
const tmp = mkdtempSync(join(tmpdir(), 'cjtracking-'));
function lauf(sz, kindEnv = {}) {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { ...process.env, CT_SZENARIO: JSON.stringify(sz), CT_TMP: tmp, ...kindEnv }, encoding: 'utf8', timeout: 60000 });
  const m = /CT_ERGEBNIS (.*)$/m.exec(r.stdout || '');
  if (!m) { console.log('KEIN ERGEBNIS', r.status, (r.stderr || '').slice(0, 600), (r.stdout || '').slice(0, 300)); return { exit: 'kein', fulfills: [], tracks: [], tagsAdd: [], tagsRemove: [], tg: [], log: [], err: [], cjDetail: [], queries: [], versionen: [], cjAuth: [], cjHeader: [], urls: [], cjListe: 0 }; }
  return JSON.parse(m[1]);
}
const FO = (n) => 'gid://shopify/FulfillmentOrder/' + n;
const FOL = (n, i = 1) => `gid://shopify/FulfillmentOrderLineItem/${n}-${i}`;
const bestellung = (name, u = {}) => ({ name, createdAt: isoVor(48 * H), ...u });
const cjAuftrag = (lx, u = {}) => {
  const id = 'SD' + lx; const status = u.status || 'SHIPPED';
  return { eintrag: { orderId: id, orderNum: lx, orderStatus: status, createDate: cjZeit(96 * H) },
    detail: { orderStatus: status, trackNumber: u.trackNumber === undefined ? 'EQKPT' + lx.slice(2) : u.trackNumber, logisticName: u.logisticName || 'CJPacket Ordinary VIP',
      trackingUrl: u.trackingUrl === undefined ? 'https://t.17track.net/en#nums=EQKPT' + lx.slice(2) : u.trackingUrl, createDate: cjZeit(96 * H), paymentDate: u.paymentDate === undefined ? cjZeit(95 * H) : u.paymentDate,
      outWarehouseTime: u.outWarehouseTime === undefined ? cjZeit(24 * H) : u.outWarehouseTime, productList: u.produkte || [{ vid: '1', quantity: u.einheiten ?? 1 }] } };
};
const szCj = (...auftraege) => ({ cjListe: auftraege.map((a) => a.eintrag), cjDetail: Object.fromEntries(auftraege.map((a) => [a.eintrag.orderId, a.detail])) });
const mitCj = (sz, ...auftraege) => ({ ...sz, ...szCj(...auftraege) });

// Szenario 1: Vorgabe = Trockenlauf
let r = lauf(mitCj({ offene: [bestellung('#1034')] }, cjAuftrag('LX1034')));
ist('Trockenlauf (Vorgabe): keine Versandmeldung, kein Tag, keine Telegram-Nachricht, Exit-Code unauffällig', r.fulfills.length === 0 && r.tracks.length === 0 && r.tagsAdd.length === 0 && r.tagsRemove.length === 0 && r.tg.length === 0 && (r.exit === null || r.exit === 0), r);
ist('Trockenlauf zeigt den Plan («[DRY] … als versendet melden», Firma, Nummer, Kundenmail «nein» ohne Freigabe)', r.log.some((l) => /\[DRY\] #1034: als versendet melden \(EQKPT1034\)/.test(l)) && r.log.some((l) => /#1034: \[DRY\] versendet gemeldet \(CJPacket EQKPT1034, Kundenmail nein, 1 Position\(en\)\)/.test(l)), r.log);
ist('Trockenlauf: die Abfragen sind Lesezugriffe auf beide Listen (offen und von Hand versendet), mit -tag:cj-shipped und Zeitfenster', r.queries.length === 2 && r.queries.every((q) => /-tag:cj-shipped/.test(q) && /financial_status:paid/.test(q) && /created_at:>=\d{4}-\d{2}-\d{2}/.test(q)) && /fulfillment_status:unfulfilled OR fulfillment_status:partial/.test(r.queries[0]) && /fulfillment_status:shipped/.test(r.queries[1]), r.queries);
ist('Alle Shopify-Aufrufe laufen auf der API-Version 2026-01', r.versionen.length > 0 && r.versionen.every((v) => v === '2026-01'), r.versionen);
ist('CJ: die Anmeldung kommt mit E-Mail und Schlüssel, die Aufrufe tragen die Zugangsmarke', r.cjAuth.length === 1 && r.cjAuth[0].email === 'e@x.ch' && r.cjAuth[0].password === 'cj-key' && r.cjHeader.length > 0 && r.cjHeader.every((h) => h === 'cj-token'), [r.cjAuth, r.cjHeader]);
for (const wert of ['1', 'true', 'ja', 'on', '', 'unsinn']) {
  r = lauf(mitCj({ offene: [bestellung('#1034')], dry: wert }, cjAuftrag('LX1034')));
  ist(`DRY_RUN=«${wert}» bleibt Trockenlauf`, r.fulfills.length === 0 && r.tagsAdd.length === 0, r.fulfills);
}

// Szenario 2: scharf mit Kundenmail
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0' }, cjAuftrag('LX1034')));
gleich('scharf: genau EINE fulfillmentCreate mit Mail, Nummer, deutschem 17track-Link, Firma und der Position', r.fulfills, [{ notifyCustomer: true, trackingInfo: { number: 'EQKPT1034', url: 'https://t.17track.net/de#nums=EQKPT1034', company: 'CJPacket' }, lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: FO('1034'), fulfillmentOrderLineItems: [{ id: FOL('1034'), quantity: 1 }] }] }]);
gleich('scharf: danach das Tag cj-shipped (und nur das)', r.tagsAdd, [{ id: 'gid://shopify/Order/1034', tags: ['cj-shipped'] }]);
ist('scharf: eine Telegram-Meldung «versendet … Kundenmail ausgelöst», kein Alarm', r.tg.length === 1 && /📦/.test(r.tg[0]) && /#1034/.test(r.tg[0]) && /Kundenmail ausgelöst/.test(r.tg[0]) && !/🔴/.test(r.tg[0]), r.tg);
ist('scharf: Exit unauffällig', r.exit === null || r.exit === 0, r.exit);
for (const wert of ['0', 'false', 'no', 'nein', 'off', 'OFF', ' False ']) {
  r = lauf(mitCj({ offene: [bestellung('#1034')], dry: wert }, cjAuftrag('LX1034')));
  ist(`DRY_RUN=«${wert}» schaltet scharf (ausdrücklich aus)`, r.fulfills.length === 1, r.fulfills.length);
}

// Szenario 3: ohne Kundenmail
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', mailen: '0' }, cjAuftrag('LX1034')));
ist('KUNDIN_MAILEN=0: gemeldet, aber notifyCustomer false und der Telegram-Text sagt es', r.fulfills.length === 1 && r.fulfills[0].notifyCustomer === false && /Ohne Kundenmail/.test(r.tg[0]) && r.tagsAdd.length === 1, r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', mailen: 'false' }, cjAuftrag('LX1034')));
ist('KUNDIN_MAILEN=false: ebenfalls ohne Mail', r.fulfills.length === 1 && r.fulfills[0].notifyCustomer === false);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', mailen: '1' }, cjAuftrag('LX1034')));
ist('KUNDIN_MAILEN=1: mit Mail', r.fulfills[0].notifyCustomer === true);
r = lauf(mitCj({ offene: [bestellung('#1034')], mailen: '1' }, cjAuftrag('LX1034')));
ist('KUNDIN_MAILEN=1 ohne scharfes DRY_RUN: trotzdem nichts gesendet', r.fulfills.length === 0 && r.tg.length === 0);

// Szenario 4: zugestellt → still
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0' }, cjAuftrag('LX1034', { status: 'DELIVERED' })));
ist('DELIVERED: gemeldet, aber ohne Kundenmail (auch mit KUNDIN_MAILEN Vorgabe)', r.fulfills.length === 1 && r.fulfills[0].notifyCustomer === false && /Ohne Kundenmail/.test(r.tg[0]), r);

// Szenario 5: Schreibfehler werden NIE wiederholt
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', fulfill500: true }, cjAuftrag('LX1034')));
ist('fulfillmentCreate HTTP 500: genau EIN Versuch (keine Wiederholung = keine doppelte Mail), Exit 1, Alarm «Ausgang unbekannt», kein Tag cj-shipped', r.fulfills.length === 1 && r.exit === 1 && r.tg.some((t) => /Ausgang unbekannt/.test(t) && /Nicht von Hand eintragen/.test(t)) && r.tagsAdd.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', fulfillFehler: true }, cjAuftrag('LX1034')));
ist('fulfillmentCreate mit userErrors: ein Versuch, Exit 1, Alarm «abgelehnt», kein Tag', r.fulfills.length === 1 && r.exit === 1 && r.tg.some((t) => /abgelehnt/.test(t)) && r.tagsAdd.length === 0, r);

// Szenario 6: Nummer nachtragen
const nachtrag = (u = {}) => bestellung('#1029', { lines: [{ sku: 'CJYD1', qty: 1 }], fos: [], fulfillments: [{ id: 'gid://shopify/Fulfillment/77', status: 'SUCCESS', nummern: [] }], ...u });
r = lauf(mitCj({ fertige: [nachtrag()], dry: '0' }, cjAuftrag('LX1029')));
gleich('Nachtragen scharf: genau EIN fulfillmentTrackingInfoUpdate an der bestehenden Lieferung, mit Mail', r.tracks, [{ id: 'gid://shopify/Fulfillment/77', t: { number: 'EQKPT1029', url: 'https://t.17track.net/de#nums=EQKPT1029', company: 'CJPacket' }, n: true }]);
ist('Nachtragen: keine neue Lieferung, Tag cj-shipped, Telegram «Sendungsnummer nachgetragen»', r.fulfills.length === 0 && r.tagsAdd.length === 1 && r.tagsAdd[0].tags[0] === 'cj-shipped' && /Sendungsnummer nachgetragen/.test(r.tg[0]), r);
r = lauf(mitCj({ fertige: [nachtrag()] }, cjAuftrag('LX1029')));
ist('Nachtragen im Trockenlauf: nichts geschrieben, Plan sichtbar', r.tracks.length === 0 && r.tagsAdd.length === 0 && r.log.some((l) => /#1029: \[DRY\] Sendungsnummer nachgetragen \(CJPacket EQKPT1029, Kundenmail nein\)/.test(l)), r.log);
r = lauf(mitCj({ fertige: [nachtrag()], dry: '0', track500: true }, cjAuftrag('LX1029')));
ist('Nachtragen HTTP 500: genau ein Versuch, Exit 1, Alarm «Ausgang unbekannt»', r.tracks.length === 1 && r.exit === 1 && r.tg.some((t) => /Ausgang unbekannt/.test(t)) && r.tagsAdd.length === 0, r);
r = lauf(mitCj({ fertige: [nachtrag()], dry: '0', trackFehler: true }, cjAuftrag('LX1029')));
ist('Nachtragen mit userErrors: ein Versuch, Exit 1, «abgelehnt»', r.tracks.length === 1 && r.exit === 1 && r.tg.some((t) => /abgelehnt/.test(t)), r);
r = lauf(mitCj({ fertige: [bestellung('#1030', { lines: [{ sku: 'CJYD1', qty: 1 }], fos: [], fulfillments: [{ id: 'gid://shopify/Fulfillment/5', status: 'SUCCESS', nummern: ['EQKPT1030'] }] })], dry: '0' }, cjAuftrag('LX1030')));
ist('von Hand vollständig gemeldete Bestellung (Nummer da): nicht gelesen, kein CJ-Detail, nichts geschrieben', r.cjDetail.length === 0 && r.tracks.length === 0 && r.fulfills.length === 0 && r.tagsAdd.length === 0, r);
r = lauf(mitCj({ fertige: [bestellung('#1031', { lines: [{ sku: 'FGSS0052', qty: 1 }], fos: [], fulfillments: [{ id: 'gid://shopify/Fulfillment/6', status: 'SUCCESS', nummern: [] }] })], dry: '0' }, cjAuftrag('LX1031')));
ist('Fortura-Bestellung (ohne CJ-Position) ohne Nummer: nie anfassen', r.cjDetail.length === 0 && r.tracks.length === 0 && r.fulfills.length === 0, r);

// Szenario 7: Befunde mit Tags und Telegram
const alt = (std) => bestellung('#1040', { createdAt: isoVor(30 * H), ...std });
r = lauf({ offene: [alt()], cjListe: [], dry: '0' });
ist('Befund cj-fehlt: EINMAL Telegram, Tags cj-problem + cj-problem-cj-fehlt, kein Exit 1', r.tg.length === 1 && /🔴/.test(r.tg[0]) && /LX1040/.test(r.tg[0]) && r.tagsAdd.length === 1 && JSON.stringify(r.tagsAdd[0].tags) === JSON.stringify(['cj-problem', 'cj-problem-cj-fehlt']) && (r.exit === null || r.exit === 0), r);
r = lauf({ offene: [alt({ tags: ['cj-problem', 'cj-problem-cj-fehlt'] })], cjListe: [], dry: '0' });
ist('derselbe Befund beim nächsten Lauf: KEINE zweite Meldung, kein neues Tag', r.tg.length === 0 && r.tagsAdd.length === 0 && r.tagsRemove.length === 0, r);
r = lauf(mitCj({ offene: [alt({ tags: ['cj-problem', 'cj-problem-cj-fehlt'] })], dry: '0' }, cjAuftrag('LX1040', { status: 'UNSHIPPED', paymentDate: cjZeit(9 * 24 * H), outWarehouseTime: null })));
ist('Befund wechselt (cj-fehlt → cj-haengt): neue Meldung, neue Tags, altes Art-Tag entfernt', r.tg.length === 1 && /CJ-Ticket/.test(r.tg[0]) && r.tagsAdd.length === 1 && JSON.stringify(r.tagsAdd[0].tags) === JSON.stringify(['cj-problem', 'cj-problem-cj-haengt']) && r.tagsRemove.length === 1 && JSON.stringify(r.tagsRemove[0].tags) === JSON.stringify(['cj-problem-cj-fehlt']), r);
r = lauf(mitCj({ offene: [alt({ tags: ['cj-problem', 'cj-problem-cj-fehlt', 'Kunde'] })], dry: '0' }, cjAuftrag('LX1040')));
ist('Befund verschwindet (CJ hat versendet): gemeldet, Problem-Tags entfernt, dann cj-shipped; fremde Tags bleiben', r.fulfills.length === 1 && r.tagsRemove.length === 1 && JSON.stringify(r.tagsRemove[0].tags) === JSON.stringify(['cj-problem', 'cj-problem-cj-fehlt']) && r.tagsAdd.length === 1 && r.tagsAdd[0].tags[0] === 'cj-shipped', r);
r = lauf({ offene: [alt()], cjListe: [], dry: '0', tgFehler: true });
ist('Telegram nicht zustellbar: Exit 1 und KEIN Tag (der nächste Lauf alarmiert erneut)', r.exit === 1 && r.tagsAdd.length === 0 && r.tg.length >= 1, r);
r = lauf({ offene: [alt()], cjListe: [], dry: '0', ohneTelegram: true });
ist('Telegram nicht eingerichtet: Befund wird trotzdem getaggt, kein Exit 1', r.tg.length === 0 && r.tagsAdd.length === 1 && (r.exit === null || r.exit === 0), r);
r = lauf({ offene: [alt()], cjListe: [] });
ist('Trockenlauf mit Befund: keine echte Telegram-Nachricht, kein Tag, aber im Protokoll sichtbar', r.tg.length === 0 && r.tagsAdd.length === 0 && r.log.some((l) => /\[DRY\] Telegram: .*#1040/.test(l)), r.log);
r = lauf(mitCj({ offene: [alt()], dry: '0' }, cjAuftrag('LX1040', { status: 'CREATED', paymentDate: null })));
ist('CJ-Auftrag angelegt, aber 96 h nicht bezahlt: Befund cj-unbezahlt', r.tg.length === 1 && /in CJ bezahlen/.test(r.tg[0]), r.tg);

// Szenario 8: Auswahl der Bestellungen
r = lauf(mitCj({ offene: [bestellung('#1034'), bestellung('#1035')], dry: '0', nur: '#1035' }, cjAuftrag('LX1034'), cjAuftrag('LX1035')));
ist('NUR=#1035: nur diese Bestellung (ein CJ-Detail, eine Meldung)', r.cjDetail.length === 1 && r.cjDetail[0] === 'SDLX1035' && r.fulfills.length === 1 && r.fulfills[0].trackingInfo.number === 'EQKPT1035', r);
r = lauf(mitCj({ offene: [bestellung('#1034'), bestellung('#1035')], dry: '0', nur: '1035, #1034' }, cjAuftrag('LX1034'), cjAuftrag('LX1035')));
ist('NUR akzeptiert Nummern mit und ohne Raute, Leerzeichen und mehrere', r.fulfills.length === 2, r.fulfills.length);
r = lauf(mitCj({ offene: [bestellung('#1034', { cancelledAt: isoVor(2 * H) })], dry: '0' }, cjAuftrag('LX1034')));
ist('stornierte Bestellung: nicht anfassen', r.fulfills.length === 0 && r.cjDetail.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: '9100403_1320', qty: 1 }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('Bestellung ohne CJ-Position (Printful-SKU): nicht anfassen, kein CJ-Detail', r.fulfills.length === 0 && r.cjDetail.length === 0, r);
r = lauf(mitCj({ offeneSeiten: [[bestellung('#1034')], [bestellung('#1035')]], dry: '0' }, cjAuftrag('LX1034'), cjAuftrag('LX1035')));
ist('Seitenweise Abfrage: beide Seiten werden bearbeitet', r.fulfills.length === 2 && r.queries.length === 3, [r.fulfills.length, r.queries.length]);

r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', haengenderCursor: true }, cjAuftrag('LX1034')));
ist('hängender Seitencursor (Shopify liefert immer dieselbe Seite): der Lauf endet, die Bestellung wird genau einmal gemeldet', r.fulfills.length === 1 && r.queries.length <= 6 && r.exit !== 'kein', [r.fulfills.length, r.queries.length, r.exit]);

// Szenario 9: gemischte Bestellung und besondere Positionen
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'CJ-X1', qty: 2 }, { sku: '9100403_1320', qty: 1 }, { sku: 'FGSS0052', qty: 1 }] })], dry: '0' }, cjAuftrag('LX1034', { einheiten: 2 })));
ist('gemischte Bestellung: nur die CJ-Position wird gemeldet (Stückzahl 2), die übrigen bleiben offen, kein cj-shipped-Fehler', r.fulfills.length === 1 && JSON.stringify(r.fulfills[0].lineItemsByFulfillmentOrder) === JSON.stringify([{ fulfillmentOrderId: FO('1034'), fulfillmentOrderLineItems: [{ id: FOL('1034', 1), quantity: 2 }] }]), r.fulfills);
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'CJ-X1', qty: 1 }], fos: [{ id: FO('9'), dienst: true, lines: [{ id: FOL('9'), sku: 'CJ-X1', remaining: 1 }] }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('CJ-Position an einem Fulfillment-Service-Standort: nie anfassen', r.fulfills.length === 0 && r.tg.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034', { fos: [{ id: FO('8'), status: 'ON_HOLD', aktionen: ['RELEASE_HOLD'], lines: [{ id: FOL('8'), sku: 'CJ-X1', remaining: 1 }] }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('Fulfillment-Order angehalten: nichts melden, Befund nicht-meldbar, KEIN cj-shipped', r.fulfills.length === 0 && r.tg.some((t) => /nicht meldbar/.test(t)) && !r.tagsAdd.some((t) => t.tags.includes('cj-shipped')), r);
r = lauf(mitCj({ offene: [bestellung('#1034', { fos: [{ id: FO('8'), status: 'CLOSED', lines: [{ id: FOL('8'), sku: 'CJ-X1', remaining: 1 }] }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('geschlossene Fulfillment-Order (veraltete Restmenge) wird ignoriert: keine Meldung, kein CJ-Abruf, kein falscher Alarm «nicht meldbar»', r.fulfills.length === 0 && r.cjDetail.length === 0 && r.tg.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034', { fos: [{ id: FO('1'), ort: 'gid://shopify/Location/A', lines: [{ id: FOL('1'), sku: 'CJ-X1', remaining: 1 }] }, { id: FO('2'), ort: 'gid://shopify/Location/B', lines: [{ id: FOL('2'), sku: 'CJ-X2', remaining: 1 }] }], lines: [{ sku: 'CJ-X1', qty: 1 }, { sku: 'CJ-X2', qty: 1 }] })], dry: '0' }, cjAuftrag('LX1034', { einheiten: 2 })));
ist('zwei Standorte: zwei Aufrufe, nur der erste mit Kundenmail (eine Mail je Bestellung)', r.fulfills.length === 2 && r.fulfills[0].notifyCustomer === true && r.fulfills[1].notifyCustomer === false, r.fulfills.map((f) => f.notifyCustomer));
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'CJ-X1', qty: 1 }], vieleLinien: true })], dry: '0' }, cjAuftrag('LX1034')));
ist('mehr als 25 Positionen im Shop: Stückzahl unsicher, nichts melden, Alarm', r.fulfills.length === 0 && r.tg.some((t) => /Stückzahl/.test(t)), r);
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'CJ-X1', qty: 2 }] })], dry: '0' }, cjAuftrag('LX1034', { einheiten: 1 })));
ist('Stückzahl bei CJ weicht ab: nichts melden, Alarm, KEIN cj-shipped', r.fulfills.length === 0 && r.tg.some((t) => /Stückzahl bei CJ \(1\)/.test(t)) && !r.tagsAdd.some((t) => t.tags.includes('cj-shipped')), r);
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'CJ-X1', qty: 1, variantSku: 'XYZ-1' }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('SKU kommt aus der Variante: eine Variante mit fremder SKU gilt nicht als CJ (wie bei den anderen Werkzeugen)', r.fulfills.length === 0 && r.cjDetail.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034', { lines: [{ sku: 'x', qty: 1, variantSku: 'CJ-X1' }], fos: [{ id: FO('7'), lines: [{ id: FOL('7'), sku: 'x', variantSku: 'CJ-X1', remaining: 1 }] }] })], dry: '0' }, cjAuftrag('LX1034')));
ist('SKU nur an der Variante (CJ…): gilt als CJ und wird gemeldet', r.fulfills.length === 1 && r.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems[0].id === FOL('7'), r.fulfills);

// Szenario 10: CJ- und Shopify-Ausfälle
r = lauf({ offene: [bestellung('#1034')], dry: '0', ohneCj: true });
ist('CJ-Zugangsdaten fehlen: Exit 1, nichts gelesen, nichts geschrieben, Meldung nennt CJ', r.exit === 1 && r.fulfills.length === 0 && r.queries.length === 0 && r.err.some((e) => /CJ_EMAIL\/CJ_API_KEY/.test(e)) && r.tg.some((t) => /CJ_EMAIL\/CJ_API_KEY/.test(t)), r);
r = lauf({ offene: [bestellung('#1034')], dry: '0', ohneShopify: true });
ist('Shopify-Zugangsdaten fehlen: Exit 1', r.exit === 1 && r.fulfills.length === 0 && r.err.some((e) => /Shopify-Zugang/.test(e)), r);
r = lauf({ offene: [bestellung('#1034')], dry: '0', authFehler: true });
ist('Shopify-Anmeldung scheitert: Exit 1, nichts geschrieben', r.exit === 1 && r.fulfills.length === 0 && r.tg.some((t) => /Shopify-Anmeldung/.test(t)), r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', cjAuthFehler: true }, cjAuftrag('LX1034')));
ist('CJ-Anmeldung scheitert: Exit 1, nichts geschrieben', r.exit === 1 && r.fulfills.length === 0 && r.tagsAdd.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', cjListeFehler: true }, cjAuftrag('LX1034')));
ist('CJ-Auftragsliste nicht lesbar: Exit 1, KEIN «CJ-Auftrag fehlt»-Alarm (sonst würden alle Bestellungen als unbestellt gemeldet), nichts geschrieben', r.exit === 1 && r.fulfills.length === 0 && r.tg.every((t) => !/kein CJ-Auftrag/.test(t)) && r.tagsAdd.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034'), bestellung('#1035')], dry: '0', cjDetail500: ['SDLX1034'] }, cjAuftrag('LX1034'), cjAuftrag('LX1035')));
ist('Detail einer Bestellung bei CJ nicht lesbar: Fehler und Exit 1, die andere Bestellung wird trotzdem gemeldet', r.exit === 1 && r.fulfills.length === 1 && r.fulfills[0].trackingInfo.number === 'EQKPT1035', r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', ordersFehler: 403 }, cjAuftrag('LX1034')));
ist('Bestellabfrage mit Zugriffsfehler (errors als Zeichenkette): Exit 1, nichts geschrieben', r.exit === 1 && r.fulfills.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034'), bestellung('#1035')], dry: '0', runLimit: 0 }, cjAuftrag('LX1034'), cjAuftrag('LX1035')));
ist('Gesamtzeitlimit überschritten: Exit 1 mit Meldung «Zeitlimit», es wird nichts angefangen', r.exit === 1 && r.fulfills.length === 0 && r.tg.some((t) => /Zeitlimit/.test(t)) && r.cjDetail.length === 0, r);
r = lauf(mitCj({ offene: [bestellung('#1034')], dry: '0', apiVersion: '2026-04' }, cjAuftrag('LX1034')));
ist('Shopify antwortet mit anderer API-Version: nur ein Hinweis, kein Fehler', r.fulfills.length === 1 && (r.exit === null || r.exit === 0), r);

// Szenario 11: Zusammenfassung für GitHub
const summaryDatei = join(tmp, 'summary.md');
r = lauf(mitCj({ offene: [bestellung('#1034'), bestellung('#1035', { createdAt: isoVor(2 * H) })], summaryDatei }, cjAuftrag('LX1034')));
const summary = (() => { try { return readFileSync(summaryDatei, 'utf8'); } catch { return ''; } })();
ist('GitHub-Zusammenfassung: Überschrift mit «Trockenlauf», Zeile mit Zählern, Plan je Bestellung', /### CJ-Rückmeldung \(Trockenlauf\)/.test(summary) && /2 Bestellung\(en\) zu prüfen/.test(summary) && /#1034: \[DRY\] versendet gemeldet, CJPacket EQKPT1034/.test(summary) && /#1035: CJ-Auftrag LX1035 noch nicht angelegt/.test(summary), summary);

rmSync(tmp, { recursive: true, force: true });
console.log(`\ncj_tracking: ${ok} bestanden, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
