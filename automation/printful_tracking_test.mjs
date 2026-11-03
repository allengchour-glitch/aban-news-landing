// Tests für die Rückmeldung Printful → Shopify: automation/lib/printful_tracking.mjs (reine Logik) und automation/printful_tracking.mjs (Verhalten).
// Das Skript läuft im KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein Printful, kein Telegram). Geprüft wird, was GESENDET wird:
// fulfillmentCreate (Sendungsnummer, Firma, Positionen, notifyCustomer), Tags, Telegram-Texte, Exit-Code, API-Version, Abfragetexte.
// Der Fake-Shopify liefert NUR die Felder, die die Abfrage verlangt (und antwortet mit einem GraphQL-Fehler bei unbekannten Feldern oder falschen
// Variablentypen): sonst blieben kaputte oder zu schmale Abfragen grün (Lehre aus der Mutationsprobe 03.11.2026: 84 von 151 Mutanten überlebten).
// Lauf: /opt/node22/bin/node automation/printful_tracking_test.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { variantIdVonSku, trackingFirma, planVersand, nachOrtUndFulfillmentOrder, empfaengerPasst, PROBLEM_STATUS, BEKANNTE_STATUS, SCHWELLEN_STUNDEN } from './lib/printful_tracking.mjs';

const SELF = fileURLToPath(import.meta.url);

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.PT_SZENARIO);
  Object.assign(process.env, { PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c', RETRY_PAUSE_MS: '0', PRINTFUL_STORE_ID: '777' });
  for (const k of ['SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'GITHUB_STEP_SUMMARY', 'MAX', 'FENSTER_TAGE', 'DRY_RUN']) delete process.env[k];
  if (sz.dry !== undefined) process.env.DRY_RUN = sz.dry;
  if (sz.ohnePrintfulKey) delete process.env.PRINTFUL_API_KEY;
  if (sz.ohneShopify) delete process.env.SHOPIFY_ADMIN_TOKEN;
  if (sz.ohneTelegram) { delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
  if (sz.clientCredentials) { delete process.env.SHOPIFY_ADMIN_TOKEN; process.env.SHOPIFY_CLIENT_ID = 'cid'; process.env.SHOPIFY_CLIENT_SECRET = 'csecret'; }
  if (sz.summaryDatei) process.env.GITHUB_STEP_SUMMARY = sz.summaryDatei;
  if (sz.max) process.env.MAX = String(sz.max);
  const prot = { fulfills: [], tagsAdd: [], tagsRemove: [], tg: [], tgMeta: [], pfGets: [], pfHeader: [], queries: [], versionen: [], oauth: 0, anmeldungen: [], exit: null, log: [], err: [] };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  let ordersAufrufe = 0, fulfillAufrufe = 0; const pf429 = { ...(sz.pf429 || {}) };

  const mk = (status, body, kopf = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (kopf[String(k).toLowerCase()] ?? (String(k).toLowerCase() === 'x-shopify-api-version' ? (sz.apiVersion || '2026-01') : null)) }, json: async () => body });

  // ---- minimaler GraphQL-Leser: Auswahl der Abfrage → Projektion der Fake-Daten
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

  const knoten = (o) => ({
    id: o.id || 'gid://shopify/Order/' + o.name, name: o.name, createdAt: o.createdAt || new Date(Date.now() - 48 * 3600 * 1000).toISOString(), cancelledAt: o.cancelledAt || null, tags: o.tags || [],
    shippingAddress: o.adresse === undefined ? { name: 'Rolf Lanz', zip: '8703', countryCodeV2: 'CH' } : o.adresse,
    mf: o.pfId === null ? null : { value: String(o.pfId || '100') },
    fulfillments: (o.fulfillments || []).map((f) => (typeof f === 'string' ? { status: 'SUCCESS', trackingInfo: [{ number: f }] } : f)),
    fulfillmentOrders: { edges: (o.fos || []).map((fo) => ({ node: {
      id: fo.id, status: fo.status || 'OPEN', supportedActions: (fo.aktionen || ['CREATE_FULFILLMENT']).map((a) => ({ action: a })),
      assignedLocation: { location: { id: fo.ort || 'gid://shopify/Location/1' } },
      lineItems: { edges: fo.lines.map((l) => ({ node: { id: l.id, remainingQuantity: l.remaining, lineItem: { sku: l.sku, variant: l.variantSku === null ? null : { sku: l.variantSku === undefined ? l.sku : l.variantSku }, product: { tags: l.pod === false ? ['cj-real'] : (l.tags || ['wunschdesign']) } } } })) },
    } })) },
  });

  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.includes('/admin/oauth/access_token')) { prot.oauth++; return mk(200, { access_token: 'oauth-token' }); }
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      prot.versionen.push(url.split('/admin/api/')[1].split('/')[0]);
      prot.anmeldungen.push(o.headers['X-Shopify-Access-Token']);
      if (q.includes('shop {')) { if (sz.authFehler) return mk(401, { errors: 'Unauthorized' }); return antwort(q, { shop: { name: 'x' } }); }
      if (q.includes('orders(first')) {
        ordersAufrufe++;
        // Argumente, die der Fake sonst nicht sieht: falscher Metafeld-Schlüssel hiesse «nie eine Auftragsnummer»
        if (!/metafield\(namespace:"printful",\s*key:"order_id"\)/.test(q)) return mk(200, { errors: [{ message: 'Metafeld-Argumente falsch' }] });
        if (!/orders\(first:\$n,\s*after:\$after,\s*query:\$q,\s*sortKey:CREATED_AT\)/.test(q)) return mk(200, { errors: [{ message: 'orders-Argumente falsch' }] });
        if (!/fulfillmentOrders\(first:20\)/.test(q) || !/lineItems\(first:50\)/.test(q)) return mk(200, { errors: [{ message: 'Seitengrösse der Unterlisten falsch' }] });
        if (sz.ordersTransient && ordersAufrufe <= sz.ordersTransient) return mk(sz.ordersTransientArt || 503, { errors: 'down' });
        if (sz.ordersThrottled && ordersAufrufe <= sz.ordersThrottled) return mk(200, { errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] });
        prot.queries.push(b.variables.q);
        const istWaechter = b.variables.q.includes('-tag:printful-wartet');
        const seiten = istWaechter ? [sz.waechter || []] : (sz.mainSeiten || [sz.main || []]);
        const nr = b.variables.after ? Number(String(b.variables.after).replace('c', '')) : 0;
        const liste = seiten[Math.min(nr, seiten.length - 1)] || [];
        const hasNext = sz.haengenderCursor ? true : nr < seiten.length - 1;
        return antwort(q, { orders: { pageInfo: { hasNextPage: hasNext, endCursor: sz.haengenderCursor ? 'c0' : 'c' + (nr + 1) }, edges: liste.map((x) => ({ node: knoten(x) })) } });
      }
      if (q.includes('fulfillmentCreate')) {
        fulfillAufrufe++; prot.fulfills.push(b.variables.f);
        if (!q.includes('$f:FulfillmentInput!')) return mk(200, { errors: [{ message: 'Variable $f mit falschem Typ' }] });
        if (sz.fulfill500) return mk(500, { errors: 'boom' });
        if (sz.fulfillNull) return antwort(q, { fulfillmentCreate: null });
        if (sz.fulfillFehler) return antwort(q, { fulfillmentCreate: { fulfillment: null, userErrors: [{ field: ['x'], message: 'kaputt' }] } });
        return antwort(q, { fulfillmentCreate: { fulfillment: { id: 'gid://shopify/Fulfillment/' + fulfillAufrufe, status: 'SUCCESS' }, userErrors: [] } });
      }
      if (q.includes('tagsAdd')) {
        if (!q.includes('$id:ID!') || !q.includes('$tags:[String!]!')) return mk(200, { errors: [{ message: 'Variablentyp falsch' }] });
        prot.tagsAdd.push({ id: b.variables.id, tags: b.variables.tags });
        return antwort(q, { tagsAdd: { userErrors: sz.tagFehler ? [{ message: 'nein' }] : [] } });
      }
      if (q.includes('tagsRemove')) {
        if (!q.includes('$id:ID!') || !q.includes('$tags:[String!]!')) return mk(200, { errors: [{ message: 'Variablentyp falsch' }] });
        prot.tagsRemove.push({ id: b.variables.id, tags: b.variables.tags });
        return antwort(q, { tagsRemove: { userErrors: [] } });
      }
      return mk(200, { errors: [{ message: 'unbekannte Abfrage' }] });
    }
    if (url.includes('api.printful.com/orders/')) {
      const id = url.split('/orders/')[1]; prot.pfGets.push(id); prot.pfHeader.push(o.headers['X-PF-Store-Id'] || '');
      if (pf429[id] > 0) { pf429[id]--; return mk(429, { error: 'rate' }, { 'retry-after': '1' }); }
      const a = (sz.printful || {})[id];
      if (a && a.__status) return mk(a.__status, { error: { message: 'x' } });
      if (!a) return mk(404, { code: 404, error: { message: 'nicht gefunden' } });
      return mk(200, { code: 200, result: a });
    }
    if (url.includes('api.telegram.org')) {
      const body = JSON.parse(o.body); prot.tg.push(body.text); prot.tgMeta.push({ parse_mode: body.parse_mode, chat_id: body.chat_id, url: url.split('/bot')[1].split('/')[0] });
      if (sz.tgWirft) throw new Error('Netz weg');
      if (sz.tgFehler) return mk(400, { ok: false });
      return mk(200, { ok: true });
    }
    return mk(200, {});
  };
  const echtesExit = process.exit.bind(process);
  process.exit = (c) => { prot.exit = c === undefined ? 0 : c; fertig(); };
  console.log = (...a) => { const t = a.join(' '); prot.log.push(t); if (/^Printful-Rückmeldung fertig:/.test(t)) fertig(); };
  console.error = (...a) => { prot.err.push(a.join(' ')); };
  await import('./printful_tracking.mjs');
  await Promise.race([ende, new Promise((r) => setTimeout(r, 20000))]);
  await new Promise((r) => setTimeout(r, 40)); // Telegram-Nachlauf nach dem Exit-Aufruf
  process.stdout.write('\nPT_ERGEBNIS ' + JSON.stringify(prot) + '\n', () => echtesExit(0));
  await new Promise(() => {});
}

// ═════════════════════════════════════════════════════════════ PRÜFER
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 700)}\n   soll: ${JSON.stringify(b).slice(0, 700)}`); } };
const wahr = (n, bed) => ist(n, !!bed, true);

// ───────────────────────── reine Logik: Hilfsfunktionen
ist('SKU → Variante', [variantIdVonSku('9000001_10163'), variantIdVonSku('CJ-ABC123'), variantIdVonSku(''), variantIdVonSku(null), variantIdVonSku('X_5 '), variantIdVonSku('X_12ab'), variantIdVonSku('a_1_2')], [10163, null, null, null, 5, null, 2]);
ist('Firma LPS', trackingFirma('LPS', 'Latvian Postal Services Standard Trackable'), 'Latvian Postal Services');
ist('Firma DHL klein', trackingFirma('dhl', ''), 'DHL');
ist('Firma mit Leerzeichen und Rändern', trackingFirma('  dhl  ', ''), 'DHL');
ist('Firma FedEx', trackingFirma('FEDEX', ''), 'FedEx');
ist('Firma PostNL in drei Schreibweisen', [trackingFirma('POST_NL', ''), trackingFirma('post-nl', ''), trackingFirma('post nl', ''), trackingFirma('POSTNL', '')], ['PostNL', 'PostNL', 'PostNL', 'PostNL']);
ist('Firma DHL Express / Royal Mail / Poste', [trackingFirma('DHL_EXPRESS', ''), trackingFirma('Royal Mail', ''), trackingFirma('POSTE_ITALIANE', ''), trackingFirma('USPS', ''), trackingFirma('UPS', ''), trackingFirma('DPD', '')], ['DHL Express', 'Royal Mail', 'Poste Italiane', 'USPS', 'UPS', 'DPD']);
ist('Firma unbekannt aus service (Express)', trackingFirma('ACME', 'Acme Post Express Trackable'), 'Acme Post');
ist('Firma unbekannt aus service (Economy)', trackingFirma('XYZ', 'Zeta Post Economy'), 'Zeta Post');
ist('Firma unbekannt aus service (Flat Rate)', trackingFirma('XYZ', 'Zeta Flat Rate 3-5 days'), 'Zeta');
ist('Firma unbekannt aus service (Priority/Tracked)', [trackingFirma('XYZ', 'Zeta Priority'), trackingFirma('XYZ', 'Zeta Tracked')], ['Zeta', 'Zeta']);
ist('Firma nur Kürzel', trackingFirma('ZZZ', ''), 'ZZZ');
ist('Firma nur service', trackingFirma('', 'Foo Express'), 'Foo');
ist('Firma service nur Zusatzwort → Printful', trackingFirma('', 'Standard'), 'Printful');
ist('Firma leer', trackingFirma('', ''), 'Printful');
ist('Problemzustände', [...PROBLEM_STATUS].sort(), ['canceled', 'failed', 'onhold']);
ist('Bekannte Zustände', [...BEKANNTE_STATUS].sort(), ['archived', 'canceled', 'draft', 'failed', 'fulfilled', 'inprocess', 'inreview', 'onhold', 'partial', 'pending']);
ist('Schwellen', SCHWELLEN_STUNDEN, { draft: 24, inreview: 72, pending: 336, inprocess: 336, partial: 336, archived: 336, ohneNummer: 48 });

// ───────────────────────── reine Logik: planVersand
const zeilen = (...z) => z.map(([foId, lineId, remaining, variantId, ortId]) => ({ foId, lineId, remaining, variantId, ortId }));
const pfO = (status, items, shipments) => ({ status, items: items.map(([id, variant_id, quantity]) => ({ id, variant_id, quantity })), shipments });
const sh = (id, nr, items, extra = {}) => ({ id, tracking_number: nr, tracking_url: nr ? 'https://t/' + nr : '', carrier: 'LPS', service: 'Latvian Postal Services Standard Trackable', items: items.map(([item_id, quantity]) => ({ item_id, quantity })), ...extra });
const plan = (o) => planVersand({ jetztMs: Date.UTC(2026, 10, 3, 12, 0, 0), ...o });

let p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10], ['fo1', 'l2', 1, 11]), bekannteNummern: [] });
ist('Plan: eine Sendung, zwei Positionen', p.aktionen.map((a) => ({ n: a.nummer, f: a.firma, u: a.url, pos: a.positionen })), [{ n: 'LY1', f: 'Latvian Postal Services', u: 'https://t/LY1', pos: [{ foId: 'fo1', lineId: 'l1', ortId: null, quantity: 1 }, { foId: 'fo1', lineId: 'l2', ortId: null, quantity: 1 }] }]);
ist('Plan: fertig, kein Befund', [p.fertig, p.restOffen, p.unklar, p.wartet, p.problem, p.befund, p.ohneVariante], [true, 0, [], [], null, null, 0]);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [], bekannteNummern: ['ly1'] });
ist('Plan: bekannte Nummer (Gross/Klein egal) → nichts, fertig', [p.aktionen.length, p.fertig], [0, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, ' LY1 ', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: ['LY1'] });
ist('Plan: bekannte Nummer mit Rändern in der Sendung → nicht doppelt gemeldet', p.aktionen.length, 0);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [' ly1 '] });
ist('Plan: bekannte Nummer mit Rändern in Shopify → nicht doppelt gemeldet', p.aktionen.length, 0);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '  LY1  ', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Nummer wird getrimmt an den Kunden gegeben', p.aktionen[0].nummer, 'LY1');
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [null, '', undefined] });
ist('Plan: leere bekannte Nummern zählen nicht', p.aktionen.length, 1);

p = plan({ pfOrder: pfO('pending', [[1, 10, 1]], []), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [], alterStunden: 5 });
ist('Plan: pending jung → nichts, nicht fertig, kein Befund', [p.aktionen.length, p.fertig, p.restOffen, p.befund], [0, false, 1, null]);

for (const s of ['failed', 'canceled', 'onhold', 'FAILED']) { p = plan({ pfOrder: pfO(s, [], []), foZeilen: [], bekannteNummern: [] }); ist('Plan: Problem ' + s, [p.problem, /Zahlung\/Druckdatei/.test(p.befund || '')], [s.toLowerCase(), true]); }
p = plan({ pfOrder: pfO('canceled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Problemstatus blockiert eine schon versendete Sendung NICHT (Befund bleibt)', [p.aktionen.length, p.problem, p.fertig, !!p.befund], [1, 'canceled', false, true]);
p = plan({ pfOrder: pfO('onhold', [[1, 10, 1]], []), foZeilen: [], bekannteNummern: [] });
ist('Plan: Problemstatus gibt auch ohne Sendung Befund', !!p.befund, true);
p = plan({ pfOrder: pfO('weissnicht', [], []), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: unbekannter Status → Befund, keine Aktion', [p.aktionen.length, /unbekannt/.test(p.befund), p.fertig], [0, true, false]);
p = plan({ pfOrder: { items: [], shipments: [] }, foZeilen: [], bekannteNummern: [] });
ist('Plan: Status fehlt → Befund «leer»', /leer/.test(p.befund), true);

p = plan({ pfOrder: pfO('partial', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: Teilsendung 1 von 2 → gemeldet, nicht fertig, kein Befund', [p.aktionen[0].positionen, p.restOffen, p.fertig, p.befund], [[{ foId: 'fo1', lineId: 'l1', ortId: null, quantity: 1 }], 1, false, null]);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: '2026-11-03' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer (heute) → wartet, kein Befund, nicht fertig', [p.aktionen.length, p.wartet.length, p.fertig, p.befund], [0, 1, false, null]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: '2026-10-30' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer seit Tagen → Befund', [p.wartet.length, /48 Stunden/.test(p.befund || '')], [1, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: '2026-11-01T14:00:00Z' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer 46 h → noch kein Befund', p.befund, null);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: '2026-11-01T11:00:00Z' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer 49 h → Befund', !!p.befund, true);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung ohne Nummer und ohne Datum → kein Befund (Alter unbekannt)', p.befund, null);
p = plan({ pfOrder: pfO('partial', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: '2026-10-20' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: «partial» ohne Nummer: Alter-Befund nur bei fulfilled', p.befund, null);

p = plan({ pfOrder: pfO('fulfilled', [[1, 99, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Variante ohne Shop-Position → unklar, nichts gemeldet, Befund', [p.aktionen.length, p.unklar.length, p.fertig, /nicht eindeutig zuordenbar/.test(p.befund)], [0, 1, false, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[5, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung nennt unbekannte Printful-Position → unklar', [p.aktionen.length, p.unklar.length], [0, 1]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 0, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Printful-Position mit variant_id 0 → unklar (Grund «ohne Variante»)', [p.unklar.length, /ohne Variante/.test((p.unklar[0] || {}).grund)], [1, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, '10', 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: variant_id als Zeichenkette passt zur Zahl der SKU', p.aktionen.length, 1);
p = plan({ pfOrder: { status: 'fulfilled', items: [{ id: 1, variant_id: 10, quantity: 1 }], shipments: [{ id: 7, tracking_number: 'LY1', items: [{ item_id: '1', quantity: 1 }] }] }, foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: item_id als Zeichenkette passt zur Zahl der Position', p.aktionen.length, 1);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 3]], [sh(7, 'LY1', [[1, 3]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10], ['fo1', 'l2', 1, 10]), bekannteNummern: [] });
ist('Plan: gleiche Variante auf zwei Zeilen, eine Sendung → beide gefüllt', p.aktionen[0].positionen.map((x) => [x.lineId, x.quantity]), [['l1', 2], ['l2', 1]]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: eine Position fehlt im Shop → GANZE Sendung unklar', [p.aktionen.length, p.unklar.length], [0, 1]);
p = plan({ pfOrder: pfO('partial', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]]), sh(8, 'LY2', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: abgebrochene Sendung gibt den Vorrat zurück', [p.aktionen.map((a) => a.nummer), p.unklar.map((u) => u.nummer)], [['LY2'], ['LY1']]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'LY2', [[2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: zwei Sendungen teilen sich EINE Zeile, keine Doppelvergabe', [p.aktionen.map((a) => a.positionen[0].quantity), p.restOffen, p.fertig], [[1, 1], 0, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'LY2', [[2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10], ['fo1', 'l2', 1, 10]), bekannteNummern: [] });
ist('Plan: gleiche Variante auf ZWEI Zeilen und in ZWEI Sendungen → mehrdeutig, nichts gemeldet', [p.aktionen.length, p.unklar.length, /mehrdeutig/.test(p.unklar[0].grund), p.fertig], [0, 2, true, false]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 10, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10], ['fo1', 'l2', 1, 10]), bekannteNummern: [] });
ist('Plan: gleiche Variante auf zwei Zeilen, EINE Sendung → eindeutig', [p.aktionen.length, p.unklar.length], [1, 0]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'LY2', [[2, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: ['LY2'] });
ist('Plan: eine der zwei Sendungen schon bekannt → die andere ist eindeutig', [p.aktionen.map((a) => a.nummer), p.unklar.length], [['LY1'], 0]);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'ly1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: gleiche Nummer in zwei Sendungen → EINE Meldung, beide Mengen (Summe 2)', [p.aktionen.length, p.aktionen[0].positionen.reduce((a, x) => a + x.quantity, 0)], [1, 2]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]], { reshipment: true })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Nachsendung (reshipment) wird übersprungen, nicht gemeldet', [p.aktionen.length, p.uebersprungen.length, /Nachsendung/.test(p.uebersprungen[0].grund)], [0, 1, true]);
for (const s of ['canceled', 'cancelled', 'CANCELED']) { p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]], { status: s })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] }); ist('Plan: stornierte Sendung (' + s + ') übersprungen', [p.aktionen.length, p.uebersprungen.length], [0, 1]); }
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]], { status: 'shipped', reshipment: false })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: Sendung «shipped» ohne reshipment wird gemeldet', p.aktionen.length, 1);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [], bekannteNummern: [] });
ist('Plan: Shop schon von Hand erledigt (Nummer unbekannt) → übersprungen, nicht «unklar», fertig', [p.aktionen.length, p.unklar.length, p.uebersprungen.length, p.fertig, p.befund], [0, 0, 1, true, null]);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10], ['fo1', 'l2', 1, null]), bekannteNummern: [] });
ist('Plan: Position ohne Printful-Variante → gemeldet wird A, aber Befund und NICHT fertig', [p.aktionen.length, p.ohneVariante, p.fertig, /ohne Printful-Variante/.test(p.befund)], [1, 1, false, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l2', 1, 0]), bekannteNummern: [] });
ist('Plan: NUR Positionen ohne Variante offen → Sendung nicht zuordenbar, Befund', [p.aktionen.length, p.ohneVariante, !!p.befund, p.fertig], [0, 1, true, false]);

p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 2, 10]), bekannteNummern: [] });
ist('Plan: fulfilled, aber Shop hat mehr offen → Befund «fulfilled»', [p.aktionen.length, p.restOffen, p.fertig, /fulfilled/.test(p.befund)], [1, 1, false, true]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: ['LY1'] });
ist('Plan: bekannte Nummer, aber Position wieder offen (Fulfillment storniert) → Befund', [p.aktionen.length, p.restOffen, /fulfilled/.test(p.befund)], [0, 1, true]);

// «fertig» braucht jede Bedingung
p = plan({ pfOrder: pfO('partial', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [], alterStunden: 1 });
ist('Plan: alles gemeldet, aber Printful «partial» → nicht fertig', [p.aktionen.length, p.restOffen, p.fertig], [1, 0, false]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, '', [[1, 1]], { ship_date: '2026-11-03' })]), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
ist('Plan: eine Sendung gemeldet, eine wartet → nicht fertig', [p.aktionen.length, p.wartet.length, p.fertig], [1, 1, false]);

// Schwellen ohne Fortschritt
const alt = (status, h) => plan({ pfOrder: pfO(status, [[1, 10, 1]], []), foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [], alterStunden: h });
ist('Plan: draft 25 h → Befund, 23 h → keiner', [!!alt('draft', 25).befund, alt('draft', 23).befund], [true, null]);
ist('Plan: inreview 73 h → Befund, 71 h → keiner', [!!alt('inreview', 73).befund, alt('inreview', 71).befund], [true, null]);
for (const s of ['pending', 'inprocess', 'partial', 'archived']) ist(`Plan: ${s} 340 h → Befund, 330 h → keiner`, [/14 Tagen/.test(alt(s, 340).befund || ''), alt(s, 330).befund], [true, null]);
ist('Plan: fulfilled hat keine Altersschwelle', alt('fulfilled', 9999).befund && /fulfilled/.test(alt('fulfilled', 9999).befund) ? 'fulfilled-Befund (Shop offen)' : alt('fulfilled', 9999).befund, 'fulfilled-Befund (Shop offen)');

// Mengen
for (const [titel, items, erwartet] of [['Menge fehlt', [{ item_id: 1 }], 'ohne gültige Menge'], ['Menge 0', [{ item_id: 1, quantity: 0 }], 'ohne gültige Menge'], ['Menge negativ', [{ item_id: 1, quantity: -1 }], 'ohne gültige Menge'], ['Menge Text', [{ item_id: 1, quantity: 'viele' }], 'ohne gültige Menge'], ['keine Positionen', [], 'ohne Positionen']]) {
  p = plan({ pfOrder: { status: 'fulfilled', items: [{ id: 1, variant_id: 10, quantity: 1 }], shipments: [{ id: 7, tracking_number: 'LY1', items }] }, foZeilen: zeilen(['fo1', 'l1', 1, 10]), bekannteNummern: [] });
  ist('Plan: ' + titel + ' → unklar, nichts gemeldet', [p.aktionen.length, p.unklar.length, (p.unklar[0] || {}).grund.includes(erwartet)], [0, 1, true]);
}
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [{ foId: 'fo1', lineId: 'l1', remaining: 0, variantId: 10 }], bekannteNummern: [] });
ist('Plan: Zeile mit Menge 0 gilt nicht als offen (Shop schon erledigt)', [p.aktionen.length, p.uebersprungen.length], [0, 1]);
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), foZeilen: [{ foId: 'fo1', lineId: 'l1', remaining: -3, variantId: 10 }], bekannteNummern: [] });
ist('Plan: negative Restmenge gilt nicht als offen', p.aktionen.length, 0);

// Standorte
p = plan({ pfOrder: pfO('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]), foZeilen: zeilen(['foA', 'l1', 1, 10, 'locA'], ['foB', 'l2', 1, 11, 'locB']), bekannteNummern: [] });
ist('Plan: Positionen tragen ihren Standort', p.aktionen[0].positionen.map((x) => [x.foId, x.ortId]), [['foA', 'locA'], ['foB', 'locB']]);

// ───────────────────────── reine Logik: Empfänger
ist('Empfänger: gleiche PLZ, anderer Name → passt', empfaengerPasst({ name: 'A B', zip: '8703' }, { name: 'X Y', zip: '8703' }).ok, true);
ist('Empfänger: gleicher Name, andere PLZ → passt', empfaengerPasst({ name: 'Rolf Lanz', zip: '8703' }, { name: 'rolf  lanz', zip: '8000' }).ok, true);
ist('Empfänger: Umlaute und Satzzeichen egal', empfaengerPasst({ name: 'Zoë Müller-Frei', zip: '1' }, { name: 'ZOE MULLER FREI', zip: '2' }).ok, true);
ist('Empfänger: PLZ mit Leerzeichen egal', empfaengerPasst({ name: 'a', zip: 'SW1A 1AA' }, { name: 'b', zip: 'sw1a1aa' }).ok, true);
p = empfaengerPasst({ name: 'Rolf Lanz', zip: '8703' }, { name: 'Anna Meier', zip: '3000' });
ist('Empfänger: Name und PLZ verschieden → passt NICHT, Grund nennt beide', [p.ok, /Rolf Lanz/.test(p.grund), /Anna Meier/.test(p.grund)], [false, true, true]);
ist('Empfänger: keine Vergleichsdaten → passt', [empfaengerPasst(null, null).ok, empfaengerPasst({ name: 'A' }, { zip: '1' }).ok], [true, true]);
ist('Empfänger: nur Name vorhanden und verschieden → passt nicht', empfaengerPasst({ name: 'A' }, { name: 'B' }).ok, false);

// ───────────────────────── reine Logik: Gruppierung
ist('Gruppierung je Standort und Order, Mengen addiert', nachOrtUndFulfillmentOrder([{ foId: 'a', lineId: 'x', ortId: 'L1', quantity: 1 }, { foId: 'a', lineId: 'x', ortId: 'L1', quantity: 2 }, { foId: 'a', lineId: 'y', ortId: 'L1', quantity: 1 }, { foId: 'b', lineId: 'z', ortId: 'L1', quantity: 1 }]),
  [[{ fulfillmentOrderId: 'a', fulfillmentOrderLineItems: [{ id: 'x', quantity: 3 }, { id: 'y', quantity: 1 }] }, { fulfillmentOrderId: 'b', fulfillmentOrderLineItems: [{ id: 'z', quantity: 1 }] }]]);
ist('Gruppierung: zwei Standorte → zwei Gruppen', nachOrtUndFulfillmentOrder([{ foId: 'a', lineId: 'x', ortId: 'L1', quantity: 1 }, { foId: 'b', lineId: 'y', ortId: 'L2', quantity: 1 }]).length, 2);
ist('Gruppierung: ohne Standort alles in einer Gruppe', nachOrtUndFulfillmentOrder([{ foId: 'a', lineId: 'x', quantity: 1 }, { foId: 'b', lineId: 'y', quantity: 1 }]).length, 1);

// ───────────────────────── Verhalten des Skripts
const lauf = (sz) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PT_SZENARIO: JSON.stringify(sz) }, encoding: 'utf8', timeout: 90000 });
  const m = String(r.stdout).match(/PT_ERGEBNIS (.*)\n/);
  return { status: r.status, prot: m ? JSON.parse(m[1]) : null, stderr: r.stderr };
};
const pod = (id, sku, remaining = 1, extra = {}) => ({ id, sku, remaining, ...extra });
const pfA = (status, items, shipments, recipient) => ({ ...pfO(status, items, shipments), ...(recipient ? { recipient } : {}) });
const bestellung = (extra = {}) => ({ name: '#T1', pfId: 100, tags: ['printful-synced', 'printful-confirmed'], fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10')] }], ...extra });
const tagListen = (prot, art = 'tagsAdd') => prot[art].map((t) => t.tags);
const heute = new Date().toISOString().slice(0, 10);
const vorTagen = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// V1: eine Position, eine Sendung (Normalfall)
let r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY076164335LV', [[1, 1]])]) } });
ist('V1 Exit', r.prot && r.prot.exit, null);
ist('V1 fulfillmentCreate', r.prot.fulfills, [{ notifyCustomer: true, trackingInfo: { number: 'LY076164335LV', url: 'https://t/LY076164335LV', company: 'Latvian Postal Services' }, lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: 'fo1', fulfillmentOrderLineItems: [{ id: 'l1', quantity: 1 }] }] }]);
ist('V1 Tag shipped', tagListen(r.prot), [['printful-shipped']]);
wahr('V1 Telegram genau eine Erfolgsmeldung mit Nummer, HTML, richtiger Chat und Bot', r.prot.tg.length === 1 && /versendet/.test(r.prot.tg[0]) && /LY076164335LV/.test(r.prot.tg[0]) && r.prot.tgMeta[0].parse_mode === 'HTML' && r.prot.tgMeta[0].chat_id === 'c' && r.prot.tgMeta[0].url === 't');
ist('V1 Abfrage: nur synced, ohne shipped, mit Datum von vor 45 Tagen', [/^tag:printful-synced -tag:printful-shipped created_at:>=\d{4}-\d\d-\d\d$/.test(r.prot.queries[0]), r.prot.queries[0].split('>=')[1] >= vorTagen(46) && r.prot.queries[0].split('>=')[1] <= vorTagen(44)], [true, true]);
ist('V1 alle Aufrufe mit API 2026-01', [...new Set(r.prot.versionen)], ['2026-01']);
ist('V1 Printful-Abfrage mit Store-Header', [r.prot.pfGets, r.prot.pfHeader], [['100'], ['777']]);
ist('V1 Shopify-Anmeldung mit dem Token', [...new Set(r.prot.anmeldungen)], ['x']);

// V2: drei Positionen, eine Sendung (der echte Fall #1033)
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10163'), pod('l2', '9000001_10164'), pod('l3', '9000001_10165')] }] })],
  printful: { 100: pfA('fulfilled', [[1, 10163, 1], [2, 10164, 1], [3, 10165, 1]], [sh(7, 'LY1', [[1, 1], [2, 1], [3, 1]])]) } });
ist('V2 eine Meldung mit drei Positionen', [r.prot.fulfills.length, r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems.map((x) => x.id)], [1, ['l1', 'l2', 'l3']]);

// V3: schon von Hand gemeldet (Nummer bekannt, Fulfillment-Order geschlossen) → keine zweite Mail, nur das Tag
r = lauf({ main: [bestellung({ fulfillments: ['LY1'], fos: [] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3 keine Meldung, kein Telegram, Tag shipped', [r.prot.fulfills.length, r.prot.tg.length, tagListen(r.prot)], [0, 0, [['printful-shipped']]]);
// V3b: Nummer von Hand mit anderer Schreibweise und Rändern eingetragen
r = lauf({ main: [bestellung({ fulfillments: [' ly1 '] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3b bekannte Nummer in anderer Schreibweise → nicht doppelt gemeldet', r.prot.fulfills.length, 0);
// V3c: Nummer in der ZWEITEN Lieferung und zweiten trackingInfo bekannt
r = lauf({ main: [bestellung({ fulfillments: [{ status: 'SUCCESS', trackingInfo: [{ number: 'X0' }] }, { status: 'SUCCESS', trackingInfo: [{ number: 'X1' }, { number: 'LY1' }] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3c Nummer in der zweiten trackingInfo der zweiten Lieferung → bekannt', r.prot.fulfills.length, 0);
// V3d: Nummer nur an STORNIERTER Lieferung → zählt nicht als bekannt
r = lauf({ main: [bestellung({ fulfillments: [{ status: 'CANCELLED', trackingInfo: [{ number: 'LY1' }] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3d stornierte Lieferung gilt nicht als gemeldet', r.prot.fulfills.length, 1);
r = lauf({ main: [bestellung({ fulfillments: [{ status: 'ERROR', trackingInfo: [{ number: 'LY1' }] }, { status: 'FAILURE', trackingInfo: [{ number: 'LY1' }] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V3e fehlgeschlagene Lieferungen (ERROR/FAILURE) zählen nicht als gemeldet', r.prot.fulfills.length, 1);

// V4: in Arbeit, jung → nichts; alt → Befund
r = lauf({ main: [bestellung()], printful: { 100: pfA('inprocess', [[1, 10, 1]], []) } });
ist('V4 jung: nichts geschrieben', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [0, 0, 0, null]);
r = lauf({ main: [bestellung({ createdAt: new Date(Date.now() - 20 * 86400000).toISOString() })], printful: { 100: pfA('inprocess', [[1, 10, 1]], []) } });
ist('V4b 20 Tage in Arbeit → einmal Befund (Tag + Telegram), Exit grün', [tagListen(r.prot), r.prot.tg.length, /14 Tagen/.test(r.prot.tg[0] || ''), r.prot.exit], [[['printful-problem']], 1, true, null]);
r = lauf({ main: [bestellung({ createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString() })], printful: { 100: pfA('draft', [[1, 10, 1]], []) } });
ist('V4c Entwurf nach 30 h nie bestätigt → Befund', [tagListen(r.prot), /Entwurf/.test(r.prot.tg[0] || '')], [[['printful-problem']], true]);

// V5: Zahlung gescheitert → einmal melden, nicht wiederholen
r = lauf({ main: [bestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V5 failed: Tag problem + eine Telegram', [r.prot.fulfills.length, tagListen(r.prot), r.prot.tg.length, /failed/.test(r.prot.tg[0] || ''), r.prot.exit], [0, [['printful-problem']], 1, true, null]);
r = lauf({ main: [bestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V5b failed mit Problem-Tag: keine Wiederholung', [r.prot.tagsAdd.length, r.prot.tg.length], [0, 0]);

// V6: Problem behoben → Tag weg, gemeldet, shipped
r = lauf({ main: [bestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V6 Erholung', [tagListen(r.prot, 'tagsRemove'), r.prot.fulfills.length, tagListen(r.prot)], [[['printful-problem']], 1, [['printful-shipped']]]);
r = lauf({ main: [bestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('inprocess', [[1, 10, 1]], []) } });
ist('V6b Befund weg, Tag noch da → Tag entfernt', [tagListen(r.prot, 'tagsRemove'), r.prot.tagsAdd.length], [[['printful-problem']], 0]);
r = lauf({ main: [bestellung()], printful: { 100: pfA('inprocess', [[1, 10, 1]], []) } });
ist('V6c kein Befund, kein Tag → nichts entfernt', r.prot.tagsRemove.length, 0);

// V7: gemischte Bestellung: nur die POD-Position wird gemeldet, die CJ-Position bleibt offen
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10'), pod('l2', 'CJ-ABC-123', 1, { pod: false })] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V7 nur POD gemeldet', r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems, [{ id: 'l1', quantity: 1 }]);
ist('V7 POD fertig → Tag shipped trotz offener CJ-Position', tagListen(r.prot), [['printful-shipped']]);
for (const tags of [['Wunschdesign'], ['PRINTFUL_PERSONALIZED_PRODUCT'], ['printful_personalized_product']]) {
  r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 1, { tags })] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
  ist('V7b POD-Tag ' + tags[0] + ' wird erkannt (Grossschreibung egal)', r.prot.fulfills.length, 1);
}

// V8: zwei Sendungen, die zweite ohne Sendungsnummer
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10'), pod('l2', '9000001_11')] }] })], printful: { 100: pfA('partial', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1]]), sh(8, '', [[2, 1]])]) } });
ist('V8 erste gemeldet, kein shipped, kein Befund', [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [1, 0, 1, null]);
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, '', [[1, 1]], { ship_date: vorTagen(4) })]) } });
ist('V8b fulfilled seit 4 Tagen ohne Sendungsnummer → Befund', [tagListen(r.prot), /48 Stunden/.test(r.prot.tg[0] || '')], [[['printful-problem']], true]);

// V9: Sendung nicht zuordenbar → nichts melden, Mensch benachrichtigen
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 99, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V9 unklar', [r.prot.fulfills.length, tagListen(r.prot), r.prot.tg.length, /nicht eindeutig zuordenbar/.test(r.prot.tg[0] || '')], [0, [['printful-problem']], 1, true]);
r = lauf({ main: [bestellung({ tags: ['printful-synced', 'printful-problem'] })], printful: { 100: pfA('fulfilled', [[1, 99, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V9b unklar mit Problem-Tag: keine Wiederholung, Tag bleibt', [r.prot.tagsAdd.length, r.prot.tagsRemove.length, r.prot.tg.length], [0, 0, 0]);

// V10: Shopify lehnt die Meldung ab / liefert keine Meldung
r = lauf({ fulfillFehler: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V10 userErrors: kein shipped, Exit 1, Telegram «gescheitert», nur 1 Versuch', [r.prot.tagsAdd.length, r.prot.exit, r.prot.tg.some((t) => /gescheitert/.test(t)), r.prot.fulfills.length], [0, 1, true, 1]);
r = lauf({ fulfillNull: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V10b Antwort fulfillmentCreate=null → NICHT als gemeldet gezählt', [r.prot.tagsAdd.length, r.prot.exit, r.prot.tg.some((t) => /versendet \(/.test(t) && /Kundenmail/.test(t))], [0, 1, false]);
r = lauf({ fulfill500: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V10c HTTP 500 bei fulfillmentCreate: GENAU EIN Versuch (keine Wiederholung, sonst doppelte Mail), Exit 1, kein Tag', [r.prot.fulfills.length, r.prot.exit, r.prot.tagsAdd.length], [1, 1, 0]);
r = lauf({ tagFehler: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V10d Tag-userErrors → Fehler, Exit 1 (Meldung selbst ging raus)', [r.prot.fulfills.length, r.prot.exit], [1, 1]);

// V11: Trockenlauf-Schreibweisen
for (const w of ['1', 'true', 'TRUE', 'yes', 'on', ' 1 ', 'ja']) {
  r = lauf({ dry: w, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
  ist(`V11 DRY_RUN='${w}' → Trockenlauf: nichts geschrieben, kein Telegram`, [r.prot.fulfills.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [0, 0, 0, null]);
}
r = lauf({ dry: '1', main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
wahr('V11 DRY: Meldung steht im Protokoll', r.prot.log.some((l) => /\[DRY\].*versendet gemeldet/.test(l)));
for (const w of ['0', 'false', 'no', 'nein', 'off', '']) {
  r = lauf({ dry: w, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
  ist(`V11b DRY_RUN='${w}' → live`, [r.prot.fulfills.length, r.prot.tagsAdd.length], [1, 1]);
}
r = lauf({ dry: '1', main: [bestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V11c DRY: auch kein Telegram und kein Tag bei Befund', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);

// V12: Printful-Auftrag nicht lesbar
r = lauf({ main: [bestellung({ pfId: 555 })], printful: {} });
ist('V12 Printful 404 → Befund (Tag + Telegram), NICHT Exit 1', [r.prot.fulfills.length, tagListen(r.prot), /404/.test(r.prot.tg[0] || ''), r.prot.exit], [0, [['printful-problem']], true, null]);
r = lauf({ main: [bestellung()], printful: { 100: { __status: 500 } } });
ist('V12b Printful 500 bleibend → Fehler Exit 1, kein Tag, drei Versuche', [r.prot.tagsAdd.length, r.prot.exit, r.prot.pfGets.length], [0, 1, 3]);
r = lauf({ pf429: { 100: 2 }, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V12c Printful 429 zweimal dann OK → Wiederholung gelingt', [r.prot.fulfills.length, r.prot.exit, r.prot.pfGets.length], [1, null, 3]);
r = lauf({ main: [bestellung()], printful: { 100: { __status: 401 } } });
ist('V12d Printful 401 → Fehler Exit 1 (kein Befund)', [r.prot.exit, r.prot.tagsAdd.length, r.prot.pfGets.length], [1, 0, 1]);

// V13: Metafeld fehlt
r = lauf({ main: [bestellung({ pfId: null })], printful: {} });
ist('V13 ohne printful.order_id → Befund, kein Printful-Aufruf, Exit grün', [r.prot.pfGets.length, tagListen(r.prot), r.prot.exit], [0, [['printful-problem']], null]);

// V14: Teilmenge
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 2)] }] })], printful: { 100: pfA('partial', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V14 Teilsendung', [r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems, r.prot.tagsAdd.length], [[{ id: 'l1', quantity: 1 }], 0]);

// V15: Fulfillment-Orders, die wir nicht melden dürfen
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', status: 'ON_HOLD', lines: [pod('l1', '9000001_10')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15 ON_HOLD → nicht melden, Befund «pausierten»', [r.prot.fulfills.length, tagListen(r.prot), /pausierten/.test(r.prot.tg[0] || '')], [0, [['printful-problem']], true]);
for (const status of ['SCHEDULED', 'INCOMPLETE', 'CLOSED', 'CANCELLED']) {
  r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', status, lines: [pod('l1', '9000001_10')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
  ist(`V15b FO-Status ${status} → keine Meldung`, r.prot.fulfills.length, 0);
}
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', status: 'IN_PROGRESS', lines: [pod('l1', '9000001_10')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15c FO IN_PROGRESS mit CREATE_FULFILLMENT → gemeldet', r.prot.fulfills.length, 1);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', aktionen: ['REQUEST_FULFILLMENT'], lines: [pod('l1', '9000001_10')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15d Service-Standort (kein CREATE_FULFILLMENT): übersprungen, kein Printful-Aufruf, kein Tag, kein Telegram', [r.prot.fulfills.length, r.prot.pfGets.length, r.prot.tagsAdd.length, r.prot.tg.length, r.prot.exit], [0, 0, 0, 0, null]);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 0)] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15e Restmenge 0 (alles schon erledigt) → keine Meldung, Tag shipped, kein Alarm', [r.prot.fulfills.length, tagListen(r.prot), r.prot.tg.length], [0, [['printful-shipped']], 0]);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', null)] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V15f remainingQuantity null → wie 0', r.prot.fulfills.length, 0);

// V16: Wächter
const alter = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
r = lauf({ main: [], waechter: [{ name: '#W1', createdAt: alter(20), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16 Wächter: alte unsynchronisierte POD-Bestellung → Telegram + Tag wartet', [r.prot.tg.length, /Printful-Dashboard/.test(r.prot.tg[0] || ''), /doppelter Auftrag/.test(r.prot.tg[0] || ''), tagListen(r.prot)], [1, true, true, [['printful-wartet']]]);
r = lauf({ main: [], waechter: [{ name: '#W1', createdAt: alter(11), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16b Wächter: 11 h alt → noch nichts', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);
r = lauf({ main: [], waechter: [{ name: '#W1', createdAt: alter(13), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16c Wächter: 13 h alt → Alarm', r.prot.tg.length, 1);
r = lauf({ main: [], waechter: [{ name: '#W3', createdAt: alter(20), tags: [], fos: [{ id: 'fo9', lines: [pod('c1', 'CJ-XYZ', 1, { pod: false })] }] }] });
ist('V16d Wächter: Nicht-POD-Bestellung → nichts', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);
r = lauf({ main: [], waechter: [{ name: '#W4', createdAt: alter(20), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10', 0)] }] }] });
ist('V16e Wächter: POD-Zeile ohne Restmenge → nichts', r.prot.tg.length, 0);
r = lauf({ main: [], waechter: [{ name: '#W5', createdAt: alter(20), tags: [], fos: [{ id: 'fo9', aktionen: ['REQUEST_FULFILLMENT'], lines: [pod('w1', '5599797_9526')] }] }] });
ist('V16f Wächter: Service-Standort (Printful-App) → kein Fehlalarm', [r.prot.tg.length, r.prot.tagsAdd.length], [0, 0]);
r = lauf({ main: [], waechter: [{ name: '#W6', createdAt: alter(20), tags: ['printful-review'], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16g Wächter: Bestellung mit nur «printful-review» (Auftrag nie angelegt) wird gemeldet', r.prot.tg.length, 1);
r = lauf({ main: [], waechter: [{ name: '#W7', createdAt: alter(20), cancelledAt: alter(1), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16h Wächter: stornierte Bestellung → nichts', r.prot.tg.length, 0);
const wq = r.prot.queries.find((q) => q.includes('-tag:printful-wartet')) || '';
ist('V16i Wächter-Abfrage: alle Bestandteile', ['financial_status:paid', 'fulfillment_status:unfulfilled', '-tag:printful-synced', '-tag:printful-wartet'].map((t) => wq.includes(t)), [true, true, true, true]);
ist('V16j Wächter-Abfrage: NICHT «-tag:printful-review», Datum vor 45 Tagen', [wq.includes('-tag:printful-review'), /created_at:>=\d{4}-\d\d-\d\d$/.test(wq), wq.split('>=')[1] >= vorTagen(46) && wq.split('>=')[1] <= vorTagen(44)], [false, true, true]);
r = lauf({ main: [], tgFehler: true, waechter: [{ name: '#W1', createdAt: alter(20), tags: [], fos: [{ id: 'fo9', lines: [pod('w1', '9000001_10')] }] }] });
ist('V16k Wächter: Telegram scheitert → KEIN Tag (Alarm wird nächstes Mal wiederholt), Exit 1', [r.prot.tagsAdd.length, r.prot.exit], [0, 1]);

// V17: zwei Bestellungen, die zweite hat einen Fehler → die erste wird trotzdem fertig, Exit 1
r = lauf({ main: [bestellung(), bestellung({ name: '#T2', pfId: 777, id: 'gid://shopify/Order/T2' })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), 777: { __status: 500 } } });
ist('V17 Fehler bei #T2 stoppt #T1 nicht', [r.prot.fulfills.length, r.prot.exit], [1, 1]);

// V18: Seitenblättern
const bn = (n) => bestellung({ name: '#P' + n, pfId: 200 + n, id: 'gid://shopify/Order/P' + n, fos: [{ id: 'fo' + n, lines: [pod('l' + n, '9000001_10')] }] });
const pfN = (n) => pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY' + n, [[1, 1]])]);
r = lauf({ mainSeiten: [[bn(1)], [bn(2)], [bn(3)]], printful: { 201: pfN(1), 202: pfN(2), 203: pfN(3) } });
ist('V18 drei Seiten → drei Bestellungen verarbeitet, Cursor weitergegeben', [r.prot.fulfills.length, r.prot.pfGets.sort()], [3, ['201', '202', '203']]);
r = lauf({ haengenderCursor: true, main: [bn(1)], printful: { 201: pfN(1) } });
ist('V18b hängender Cursor (hasNextPage immer true) → Bestellung nur EINMAL, kein Endlos, höchstens 2 Abfragen', [r.prot.fulfills.length, r.prot.pfGets.length, r.prot.queries.filter((q) => !q.includes('-tag:printful-wartet')).length <= 2], [1, 1, true]);
r = lauf({ max: 2, mainSeiten: [[bn(1), bn(2)], [bn(3)]], printful: { 201: pfN(1), 202: pfN(2), 203: pfN(3) } });
ist('V18c MAX=2 begrenzt', r.prot.fulfills.length, 2);

// V19: Start und Anmeldung
r = lauf({ ohnePrintfulKey: true, main: [bestellung()] });
ist('V19 ohne PRINTFUL_API_KEY → Exit 1, Telegram, keine Abfrage', [r.prot.exit, r.prot.tg.length, r.prot.queries.length], [1, 1, 0]);
r = lauf({ ohneShopify: true, main: [bestellung()] });
ist('V19b ohne Shopify-Zugang → Exit 1, Telegram, keine Abfrage', [r.prot.exit, r.prot.tg.length, r.prot.queries.length], [1, 1, 0]);
r = lauf({ authFehler: true, main: [bestellung()] });
ist('V19c Shopify-Anmeldung scheitert → Exit 1, Telegram, KEINE Bestellabfrage', [r.prot.exit, r.prot.tg.length, r.prot.queries.length], [1, 1, 0]);
r = lauf({ clientCredentials: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V19d Client-Credentials-Anmeldung: Token geholt und benutzt', [r.prot.oauth, [...new Set(r.prot.anmeldungen)], r.prot.fulfills.length, r.prot.exit], [1, ['oauth-token'], 1, null]);
r = lauf({ ohneTelegram: true, main: [bestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V19e ohne Telegram: Befund wird trotzdem getaggt, Exit grün', [tagListen(r.prot), r.prot.tg.length, r.prot.exit], [[['printful-problem']], 0, null]);

// V20: Telegram-Ausfall bei Befund
r = lauf({ tgFehler: true, main: [bestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V20 Telegram HTTP-Fehler → KEIN Tag (Wiederholung nächstes Mal), Exit 1', [r.prot.tagsAdd.length, r.prot.exit], [0, 1]);
r = lauf({ tgWirft: true, main: [bestellung()], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
ist('V20b Telegram wirft → KEIN Tag, Exit 1', [r.prot.tagsAdd.length, r.prot.exit], [0, 1]);
r = lauf({ tgFehler: true, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V20c Telegram-Ausfall bei Erfolgsmeldung → Meldung und shipped trotzdem, Exit grün', [r.prot.fulfills.length, tagListen(r.prot), r.prot.exit], [1, [['printful-shipped']], null]);

// V21: HTML-Zeichen werden maskiert
r = lauf({ main: [bestellung({ name: '#A&B<1>' })], printful: { 100: pfA('failed', [[1, 10, 1]], []) } });
wahr('V21 Telegram-Text maskiert & < >', /#A&amp;B&lt;1&gt;/.test(r.prot.tg[0] || '') && !/<1>/.test(r.prot.tg[0]));

// V22: Empfänger passt nicht
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])], { name: 'Anna Meier', zip: '3000' }) } });
ist('V22 Empfänger verschieden → nicht gemeldet, Befund', [r.prot.fulfills.length, tagListen(r.prot), /gehört vermutlich zu einer anderen Bestellung/.test(r.prot.tg[0] || '')], [0, [['printful-problem']], true]);
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])], { name: 'ROLF LANZ', zip: '8703' }) } });
ist('V22b Empfänger gleich → gemeldet', r.prot.fulfills.length, 1);

// V23: storniert
r = lauf({ main: [bestellung({ cancelledAt: new Date().toISOString() })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V23 in Shopify storniert → übersprungen, kein Printful-Aufruf', [r.prot.pfGets.length, r.prot.fulfills.length, r.prot.tagsAdd.length], [0, 0, 0]);

// V26: mehrere Standorte / Orders
r = lauf({ main: [bestellung({ fos: [{ id: 'foA', ort: 'locA', lines: [pod('l1', '9000001_10')] }, { id: 'foB', ort: 'locB', lines: [pod('l2', '9000001_11')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]) } });
ist('V26 zwei Standorte → zwei Aufrufe, nur der erste mit Kundenmail', [r.prot.fulfills.length, r.prot.fulfills.map((f) => f.notifyCustomer), r.prot.fulfills.map((f) => f.lineItemsByFulfillmentOrder.length), tagListen(r.prot)], [2, [true, false], [1, 1], [['printful-shipped']]]);
r = lauf({ main: [bestellung({ fos: [{ id: 'foA', lines: [pod('l1', '9000001_10')] }, { id: 'foB', lines: [pod('l2', '9000001_11')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1], [2, 11, 1]], [sh(7, 'LY1', [[1, 1], [2, 1]])]) } });
ist('V26b zwei Orders am selben Standort → EIN Aufruf mit beiden Orders', [r.prot.fulfills.length, r.prot.fulfills[0].lineItemsByFulfillmentOrder.map((x) => x.fulfillmentOrderId)], [1, ['foA', 'foB']]);

// V27: URL fehlt
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]], { tracking_url: '' })]) } });
ist('V27 ohne tracking_url → trackingInfo ohne url-Feld', Object.keys(r.prot.fulfills[0].trackingInfo).sort(), ['company', 'number']);

// V28: vorübergehende Fehler bei Shopify
r = lauf({ ordersTransient: 2, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V28 Shopify 503 zweimal beim Lesen → Wiederholung gelingt, Exit grün', [r.prot.fulfills.length, r.prot.exit], [1, null]);
r = lauf({ ordersTransient: 2, ordersTransientArt: 429, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V28b Shopify 429 zweimal → Wiederholung gelingt', [r.prot.fulfills.length, r.prot.exit], [1, null]);
r = lauf({ ordersThrottled: 2, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V28c GraphQL THROTTLED zweimal → Wiederholung gelingt', [r.prot.fulfills.length, r.prot.exit], [1, null]);
r = lauf({ ordersTransient: 9, main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V28d Shopify dauerhaft 503 → Fehler, Exit 1, nichts gemeldet', [r.prot.fulfills.length, r.prot.exit, r.prot.tg.some((t) => /Fehler/.test(t))], [0, 1, true]);

// V29: Zusammenfassung
const tmp = mkdtempSync(join(tmpdir(), 'pt-'));
const sumDatei = join(tmp, 'summary.md');
r = lauf({ summaryDatei: sumDatei, apiVersion: '2025-10', main: [bestellung(), bestellung({ name: '#T2', pfId: 300, id: 'gid://shopify/Order/T2' })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]), 300: pfA('failed', [[1, 10, 1]], []) } });
const summary = existsSync(sumDatei) ? readFileSync(sumDatei, 'utf8') : '';
wahr('V29 Zusammenfassung: Zähler, Sendung, Befund, API-Hinweis', /2 offene Bestellung\(en\)/.test(summary) && /1 Sendung\(en\) gemeldet/.test(summary) && /1 Befund\(e\)/.test(summary) && /abgeschlossen/.test(summary) && /#T1: versendet gemeldet, Latvian Postal Services LY1/.test(summary) && /#T2: Printful-Auftrag steht auf «failed»/.test(summary) && /API-Version 2025-10 statt 2026-01/.test(summary));
wahr('V29b Zeile ohne Fehler: «0 Fehler»', /, 0 Fehler\./.test(summary));

// V30: Nachsendung / Doppelmeldung derselben Nummer in zwei Sendungen
r = lauf({ main: [bestellung()], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]], { reshipment: true })]) } });
ist('V30 Nachsendung → nicht gemeldet, Zusammenfassungszeile', [r.prot.fulfills.length, r.prot.exit], [0, null]);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 2)] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 2]], [sh(7, 'LY1', [[1, 1]]), sh(8, 'LY1', [[1, 1]])]) } });
ist('V30b gleiche Nummer in zwei Sendungen → EINE Meldung mit Menge 2', [r.prot.fulfills.length, r.prot.fulfills[0].lineItemsByFulfillmentOrder[0].fulfillmentOrderLineItems[0].quantity], [1, 2]);

// V31: SKU-Quelle und Positionen ohne Variante
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', 'IRGENDWAS', 1, { variantSku: '9000001_10' })] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V31 Varianten-SKU hat Vorrang vor der Positions-SKU (wie printful_sync)', r.prot.fulfills.length, 1);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10', 1, { variantSku: null })] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V31b ohne Variante → Positions-SKU', r.prot.fulfills.length, 1);
r = lauf({ main: [bestellung({ fos: [{ id: 'fo1', lines: [pod('l1', '9000001_10'), pod('l2', 'MEIN-SKU-OHNE-SUFFIX')] }] })], printful: { 100: pfA('fulfilled', [[1, 10, 1]], [sh(7, 'LY1', [[1, 1]])]) } });
ist('V31c Position ohne Variante → andere wird gemeldet, aber KEIN shipped, Befund', [r.prot.fulfills.length, tagListen(r.prot), /ohne Printful-Variante/.test(r.prot.tg.find((t) => /Variante/.test(t)) || '')], [1, [['printful-problem']], true]);

// V32: unbekannter Printful-Status
r = lauf({ main: [bestellung()], printful: { 100: pfA('weissnicht', [[1, 10, 1]], []) } });
ist('V32 unbekannter Status → Befund einmal', [tagListen(r.prot), /unbekannt/.test(r.prot.tg[0] || '')], [[['printful-problem']], true]);

console.log(`\nprintful_tracking: ${ok} bestanden, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
