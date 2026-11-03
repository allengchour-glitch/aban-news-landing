// Tests für die Rückmeldung Printful → Shopify: automation/lib/printful_tracking.mjs (reine Logik) und automation/printful_tracking.mjs (Verhalten).
// Das Skript läuft im KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein Printful, kein Telegram). Geprüft wird, was GESENDET wird:
// fulfillmentCreate (Sendungsnummer, Firma, Positionen, notifyCustomer), Tags, Telegram-Texte, Exit-Code. Lauf: /opt/node22/bin/node automation/printful_tracking_test.mjs
// Warum so: eine Regex auf den Quelltext würde «tagsAdd steht im Code» grün melden, auch wenn das Tag am falschen Ort oder zu früh gesetzt wird.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { variantIdVonSku, trackingFirma, planVersand, nachFulfillmentOrder, PROBLEM_STATUS } from './lib/printful_tracking.mjs';

const SELF = fileURLToPath(import.meta.url);

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.PT_SZENARIO);
  Object.assign(process.env, { PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' });
  for (const k of ['PRINTFUL_STORE_ID', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'GITHUB_STEP_SUMMARY', 'MAX', 'FENSTER_TAGE']) delete process.env[k];
  if (sz.dry) process.env.DRY_RUN = '1'; else delete process.env.DRY_RUN;
  const prot = { fulfills: [], tagsAdd: [], tagsRemove: [], tg: [], pfGets: [], queries: [], exit: null, log: [], err: [] };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  const mk = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => body });
  const knoten = (o) => ({
    id: o.id || 'gid://shopify/Order/' + o.name, name: o.name, createdAt: o.createdAt || new Date(Date.now() - 48 * 3600 * 1000).toISOString(), tags: o.tags || [],
    displayFulfillmentStatus: 'UNFULFILLED',
    mf: o.pfId === null ? null : { value: String(o.pfId || '100') },
    fulfillments: (o.fulfillments || []).map((n) => ({ trackingInfo: [{ number: n }] })),
    fulfillmentOrders: { edges: (o.fos || []).map((fo) => ({ node: { id: fo.id, status: fo.status || 'OPEN', lineItems: { edges: fo.lines.map((l) => ({ node: { id: l.id, remainingQuantity: l.remaining, lineItem: { sku: l.sku, product: { tags: l.pod === false ? ['cj-real'] : ['wunschdesign'] } } } })) } } })) },
  });
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      if (q.includes('orders(first')) {
        prot.queries.push(b.variables.q);
        const liste = b.variables.q.includes('-tag:printful-wartet') ? (sz.waechter || []) : (sz.main || []);
        return mk(200, { data: { orders: { pageInfo: { hasNextPage: false, endCursor: null }, edges: liste.map((x) => ({ node: knoten(x) })) } } });
      }
      if (q.includes('shop {')) return mk(200, { data: { shop: { name: 'x' } } });
      if (q.includes('fulfillmentCreate')) { prot.fulfills.push(b.variables.f); return mk(200, { data: { fulfillmentCreate: { fulfillment: { id: 'f1', status: 'SUCCESS' }, userErrors: sz.fulfillFehler ? [{ field: ['x'], message: 'kaputt' }] : [] } } }); }
      if (q.includes('tagsAdd')) { prot.tagsAdd.push({ id: b.variables.id, tags: b.variables.tags }); return mk(200, { data: { tagsAdd: { userErrors: [] } } }); }
      if (q.includes('tagsRemove')) { prot.tagsRemove.push({ id: b.variables.id, tags: b.variables.tags }); return mk(200, { data: { tagsRemove: { userErrors: [] } } }); }
      return mk(200, { data: {} });
    }
    if (url.includes('api.printful.com/orders/')) {
      const id = url.split('/orders/')[1]; prot.pfGets.push(id);
      const a = (sz.printful || {})[id];
      if (!a) return mk(404, { code: 404, error: { message: 'nicht gefunden' } });
      return mk(200, { code: 200, result: a });
    }
    if (url.includes('api.telegram.org')) { prot.tg.push(JSON.parse(o.body).text); return mk(200, { ok: true }); }
    return mk(200, {});
  };
  const echtesExit = process.exit.bind(process);
  process.exit = (c) => { prot.exit = c === undefined ? 0 : c; fertig(); };
  console.log = (...a) => { const t = a.join(' '); prot.log.push(t); if (/^Printful-Rückmeldung fertig:/.test(t)) fertig(); };
  console.error = (...a) => { prot.err.push(a.join(' ')); };
  await import('./printful_tracking.mjs');
  await Promise.race([ende, new Promise((r) => setTimeout(r, 20000))]);
  await new Promise((r) => setTimeout(r, 30)); // Telegram-Nachlauf nach dem Exit-Aufruf
  process.stdout.write('\nPT_ERGEBNIS ' + JSON.stringify(prot) + '\n', () => echtesExit(0));
  await new Promise(() => {});
}

// ═════════════════════════════════════════════════════════════ PRÜFER
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 700)}\n   soll: ${JSON.stringify(b).slice(0, 700)}`); } };

// ───────────────────────── reine Logik
ist('SKU → Variante', [variantIdVonSku('9000001_10163'), variantIdVonSku('CJ-ABC123'), variantIdVonSku(''), variantIdVonSku(null), variantIdVonSku('X_5 ')], [10163, null, null, null, 5]);
ist('Firma LPS', trackingFirma('LPS', 'Latvian Postal Services Standard Trackable'), 'Latvian Postal Services');
ist('Firma DHL klein', trackingFirma('dhl', ''), 'DHL');
ist('Firma unbekannt aus service', trackingFirma('ACME', 'Acme Post Express Trackable'), 'Acme Post');
ist('Firma nur Kürzel', trackingFirma('ZZZ', ''), 'ZZZ');
ist('Firma leer', trackingFirma('', ''), 'Printful');
ist('Problemzustände', [...PROBLEM_STATUS].sort(), ['canceled', 'failed', 'onhold']);

const zeilen = (...z) => z.map(([foId, lineId, remaining, variantId]) => ({ foId, lineId, remaining, variantId }));
const pfO = (status, items, shipments) => ({ status, items: items.map(([id, variant_id, quantity]) => ({ id, variant_id, quantity })), shipments });
const sh = (id, nr, items, extra = {}) => ({ id, tracking_number: nr, tracking_url: nr ? 'https://t/' + nr : '', carrier: 'LPS', service: 'Latvian Postal Services Standard Trackable', items: items.map(([item_id, quantity]) => ({ item_id, quantity })), ...extra });

let p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10], ['fo1', 'l2', 1, 11]), bekannteNummern: [] });
ist('Plan: eine Sendung, zwei Positionen', p.aktionen.map((a) => ({ n: a.nummer, f: a.firma, u: a.url, pos: a.positionen })), [{ n: 'LY1', f: 'Latvian Postal Services', u: 'https://t/LY1', pos: [{ foId: 'fo1', lineId: 'l1', quantity: 1 }, { foId: 'fo1', lineId: 'l2', quantity: 1 }] }]);
ist('Plan: fertig', [p.fertig, p.restOffen, p.unklar, p.wartet, p.problem], [true, 0, [], [], null]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [], bekannteNummern: ['ly1'] });
ist('Plan: bekannte Nummer (Gross/Klein egal) → nichts, fertig', [p.aktionen.length, p.fertig], [0, true]);

p = planVersand({ pfOrder: pfO('pending', [[1, 10, 1]], []), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: pending ohne Sendung → nichts, nicht fertig', [p.aktionen.length, p.fertig, p.restOffen], [0, false, 1]);

for (const s of ['failed', 'canceled', 'onhold', 'FAILED']) ist('Plan: Problem ' + s, planVersand({ pfOrder: pfO(s, [], []), foZeilen: [], bekannteNummern: [] }).problem, s.toLowerCase());

p = planVersand({ pfOrder: pfO('partial', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: Teilsendung 1 von 2 → gemeldet, nicht fertig', [p.aktionen[0].positionen, p.restOffen, p.fertig], [[{ foId: 'fo1', lineId: 'l1', quantity: 1 }], 1, false]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer → wartet', [p.aktionen.length, p.wartet.length, p.fertig], [0, 1, false]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 99, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Variante ohne Shop-Position → unklar, nichts gemeldet', [p.aktionen.length, p.unklar.length, p.fertig], [0, 1, false]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[5, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung nennt unbekannte Printful-Position → unklar', [p.aktionen.length, p.unklar.length], [0, 1]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 3]], [sh(7, 'LY1', [[1, 3]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10], ['fo1', 'l2', 1, 10]), bekannteNummern: [] });
ist('Plan: gleiche Variante auf zwei Zeilen → beide gefüllt', p.aktionen[0].positionen, [{ foId: 'fo1', lineId: 'l1', quantity: 2 }, { foId: 'fo1', lineId: 'l2', quantity: 1 }]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: eine Position fehlt im Shop → GANZE Sendung unklar (nicht halb melden)', [p.aktionen.length, p.unklar.length], [0, 1]);

// Rückgabe des Vorrats nach abgebrochener Sendung: Sendung A scheitert (Variante 11 fehlt), Sendung B (nur Variante 10) muss trotzdem die Position bekommen
p = planVersand({ pfOrder: pfO('partial', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]]), sh(8, 'LY2', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: abgebrochene Sendung gibt den Vorrat zurück', [p.aktionen.map((a) => a.nummer), p.unklar.map((u) => u.nummer)], [['LY2'], ['LY1']]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'LY2', [[2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: zwei Sendungen teilen sich einen Vorrat, keine Doppelvergabe', [p.aktionen.map((a) => a.positionen[0].quantity), p.restOffen, p.fertig], [[1, 1], 0, true]);

p = planVersand({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [{ foId: 'fo1', lineId: 'l1', remaining: 0, variantId: 10 }], bekannteNummern: [] });
ist('Plan: Menge 0 zählt nicht → unklar', [p.aktionen.length, p.unklar.length], [0, 1]);

ist('nachFulfillmentOrder gruppiert und summiert', nachFulfillmentOrder([{ foId: 'a', lineId: 'x', quantity: 1 }, { foId: 'a', lineId: 'x', quantity: 2 }, { foId: 'a', lineId: 'y', quantity: 1 }, { foId: 'b', lineId: 'z', quantity: 1 }]),
  [{ fulfillmentOrderId: 'a', fulfillmentOrderLineItems: [{ id: 'x', quantity: 3 }, { id: 'y', quantity: 1 }] }, { fulfillmentOrderId: 'b', fulfillmentOrderLineItems: [{ id: 'z', quantity: 1 }] }]);

// ───────────────────────── Verhalten des Skripts
const lauf = (sz) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PT_SZENARIO: JSON.stringify(sz) }, encoding: 'utf8', timeout: 90000 });
  const m = String(r.stdout).match(/PT_ERGEBNIS (.*)\n/);
  return { status: r.status, prot: m ? JSON.parse(m[1]) : null, stderr: r.stderr };
};
const pod = (id, sku, remaining = 1) => ({ id, sku, remaining });
const pfA = (status, items, shipments) => pfO(status, items, shipments);
const grundBestellung = (extra = {}) => ({ name: '#T1', pfId: 100, tags: ['printful-synced', 'printful-confirmed'], fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10')] }], ...extra });

// V1: eine Position, eine Sendung
let r = lauf({ main: [grundBestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY076164335LV', [[1, 1]])]) } });
ist('V1 Exit', r.prot && r.prot.exit, null);
ist('V1 fulfillmentCreate', r.prot.fulfills, [{ notifyCustomer: true, trackingInfo: { number: 'LY076164335LV', url: 'https://t/LY076164335LV', company: 'Latvian Postal Services' }, lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: 'fo1', fulfillmentOrderLineItems: [{ id: 'l1', quantity: 1 }] }] }]);
ist('V1 Tag shipped', r.prot.tagsAdd.map((t) => t.tags), [['printful-shipped']]);
ist('V1 Telegram genau eine Erfolgsmeldung', r.prot.tg.length === 1 && /versendet/.test(r.prot.tg[0]) && /LY076164335LV/.test(r.prot.tg[0]), true);
ist('V1 Abfrage ohne alte Bestellungen (Datum) und ohne shipped', /tag:printful-synced -tag:printful-shipped created_at:>=\d{4}-\d\d-\d\d/.test(r.prot.queries[0]), true);

// V2: drei Positionen, eine Sendung (der echte Fall #1033)
r = lauf({ main: [grundBestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10163'), pod('l2', '9000001_10164'), pod('l3', '9000001_10165')] }] })],
  printful: { 100: pfA('fulfilled', [[1, 10163, 1], [2, 10164, 1], [3, 10165, 1]], [sh(7, 'LY1', [[1, 1], [2, 1], [3, 1]])]) } });
ist('V2 eine Meldung mit drei Positionen', [r.prot.fulfills.length, r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems.map((x) => x.id)], [1, ['l1', 'l2', 'l3']]);

// V3: schon von Hand gemeldet (Nummer bekannt, Fulfillment-Order geschlossen) → keine zweite Mail, nur das Tag
r = lauf({ main: [grundBestellung({ fulfillments: ['LY1'], fos: [] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3 keine Meldung, keine Telegram, Tag shipped', [r.prot.fulfills.length, r.prot.tg.length, r.prot.tagsAdd.map((t) => t.tags)], [0, 0, [['printful-shipped']]]);

// V4: noch in Arbeit → nichts
r = lauf({ main: [grundBestellung()], printful: { 100: pfA('inprocess', [[1, 10, 1]], []) } });
ist('V4 nichts geschrieben', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [0, 0, 0, null]);

// V5: Zahlung gescheitert → einmal melden, nicht wiederholen
r = lauf({ main: [grundBestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V5 failed: Tag problem + eine Telegram', [r.prot.fulfills.length, r.prot.tagsAdd.map((t) => t.tags), r.prot.tg.length, /failed/.test(r.prot.tg[0] || '')], [0, [['printful-problem']], 1, true]);
r = lauf({ main: [grundBestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V5b failed mit Problem-Tag: keine Wiederholung', [r.prot.tagsAdd.length, r.prot.tg.length], [0, 0]);

// V6: Problem behoben (neue Karte) → Tag weg, gemeldet, shipped
r = lauf({ main: [grundBestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V6 Erholung', [r.prot.tagsRemove.map((t) => t.tags), r.prot.fulfills.length, r.prot.tagsAdd.map((t) => t.tags)], [[['printful-problem']], 1, [['printful-shipped']]]);

// V7: gemischte Bestellung: nur die POD-Position wird gemeldet, die CJ-Position bleibt offen
r = lauf({ main: [grundBestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10'), { id: 'l2', sku: 'CJ-ABC-123', remaining: 1, pod: false }] }] })],
  printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V7 nur POD gemeldet', r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems, [{ id: 'l1', quantity: 1 }]);
ist('V7 POD fertig → Tag shipped trotz offener CJ-Position', r.prot.tagsAdd.map((t) => t.tags), [['printful-shipped']]);

// V8: zwei Sendungen, die zweite noch ohne Sendungsnummer
r = lauf({ main: [grundBestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10'), pod('l2', '9000001_11')] }] })],
  printful: { 100: pfA('partial', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, '', [[2, 1]])]) } });
ist('V8 erste gemeldet, kein shipped', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.exit], [1, 0, null]);

// V9: Sendung nicht zuordenbar → nichts melden, Mensch benachrichtigen
r = lauf({ main: [grundBestellung()], printful: { 100: pfA('fulfilled', [[1, 99, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V9 unklar', [r.prot.fulfills.length, r.prot.tagsAdd.map((t) => t.tags), r.prot.tg.length, /nicht eindeutig/.test(r.prot.tg[0] || '')], [0, [['printful-problem']], 1, true]);

// V10: Shopify lehnt die Meldung ab → kein shipped-Tag, Exit 1, Telegram
r = lauf({ fulfillFehler: true, main: [grundBestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V10 Fehler: kein shipped, Exit 1', [r.prot.tagsAdd.filter((t) => t.tags.includes('printful-shipped')).length, r.prot.exit], [0, 1]);
ist('V10 Fehler: Telegram gemeldet', r.prot.tg.some((t) => /gescheitert/.test(t)), true);

// V11: Trockenlauf schreibt nichts und sendet nichts
r = lauf({ dry: true, main: [grundBestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V11 DRY: nichts geschrieben', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [0, 0, 0, null]);
ist('V11 DRY: Meldung steht im Protokoll', r.prot.log.some((l) => /\[DRY\].*versendet gemeldet/.test(l)), true);
r = lauf({ dry: true, main: [grundBestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V11b DRY: auch kein Telegram bei Problem', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);

// V12: Printful-Auftrag nicht lesbar → Exit 1, nichts geschrieben
r = lauf({ main: [grundBestellung({ pfId: 555 })], printful: {} });
ist('V12 Printful 404', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.exit], [0, 0, 1]);

// V13: Metafeld fehlt
r = lauf({ main: [grundBestellung({ pfId: null })], printful: {} });
ist('V13 ohne printful.order_id', [r.prot.pfGets.length, r.prot.exit], [0, 1]);

// V14: Teilmenge: Position 2 Stück, Sendung 1 Stück → 1 gemeldet, kein shipped
r = lauf({ main: [grundBestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 2)] }] })], printful: { 100: pfA('partial', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V14 Teilsendung', [r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems, r.prot.tagsAdd.length], [[{ id: 'l1', quantity: 1 }], 0]);

// V15: geschlossene/pausierte Fulfillment-Order wird nicht angefasst
r = lauf({ main: [grundBestellung({ fos: [{ id: 'fo1', status: 'ON_HOLD', lines: [pod('l1', '9000001_10')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15 ON_HOLD → nicht melden, unklar', [r.prot.fulfills.length, r.prot.tagsAdd.map((t) => t.tags)], [0, [['printful-problem']]]);

// V16: Wächter
const alt = new Date(Date.now() - 20 * 3600 * 1000).toISOString(), jung = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
r = lauf({ main: [], waechter: [{ name: '#W1', createdAt: alt, tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16 Wächter: alte unsynchronisierte POD-Bestellung → Telegram + Tag wartet', [r.prot.tg.length, /keinen Printful-Auftrag/.test(r.prot.tg[0] || ''), r.prot.tagsAdd.map((t) => t.tags)], [1, true, [['printful-wartet']]]);
r = lauf({ main: [], waechter: [{ name: '#W2', createdAt: jung, tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16b Wächter: junge Bestellung (unter 12 h) → nichts', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);
r = lauf({ main: [], waechter: [{ name: '#W3', createdAt: alt, tags: [], fos: [{ id: 'fo9', lines: [{ id: 'c1', sku: 'CJ-XYZ', remaining: 1, pod: false }] }] }] });
ist('V16c Wächter: Nicht-POD-Bestellung → nichts', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);
ist('V16d Wächter-Abfrage mit Zeitfenster', /-tag:printful-wartet created_at:>=\d{4}-\d\d-\d\d/.test(r.prot.queries.find((q) => q.includes('-tag:printful-wartet')) || ''), true);

// V17: zwei Bestellungen, die zweite hat einen Fehler → die erste wird trotzdem fertig, Exit 1
r = lauf({ main: [grundBestellung(), grundBestellung({ name: '#T2', pfId: 777, id: 'gid://shopify/Order/T2' })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V17 Fehler bei #T2 stoppt #T1 nicht', [r.prot.fulfills.length, r.prot.exit], [1, 1]);

console.log(`\nprintful_tracking: ${ok} bestanden, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
