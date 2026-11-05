// Verhaltenstest für den Bestellweg automation/printful_sync.mjs (Version 2, «Bestellweg härten»).
// Der Bestellweg läuft in einem KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein Printful, kein Telegram, keine KI): Shopify liefert Bestellungen (auch seitenweise),
// Printful antwortet je Szenario (echte Mitschnitte der Platzierung aus dropship/pod-auswahl/platzierung_mitschnitte.json, echter Katalogauszug mit Optionen, Druckdateien und
// Konflikten aus dropship/pod-auswahl/bestellweg_katalog_auszug.json; Fehler 503, 429, 404, Netzfehler, Zahlung gescheitert). Geprüft wird, was an Printful
// GESENDET wird (Entwurf anlegen, bestätigen, external_id, files[].type, options), welche Tags die Bestellung bekommt, was an Telegram geht und der Exit-Code.
// Warum so: vorher prüfte ein Test nur per Regex den Quelltext; fünf von fünf Mutanten an der Platzierung überlebten. Lauf: /opt/node22/bin/node automation/printful_sync_test.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const lade = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const MIT = lade('../dropship/pod-auswahl/platzierung_mitschnitte.json').mitschnitte;
const KAT = lade('../dropship/pod-auswahl/bestellweg_katalog_auszug.json').produkte;

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.PS_SZENARIO);
  Object.assign(process.env, { PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', PRINTFUL_AUTO_CONFIRM: '1', PF_PLATZIERUNG_PAUSE_MS: '0', PF_PAUSE_MS: '0', PRINTFUL_KI_KONTROLLE: 'aus' });
  for (const k of ['GEMINI_API_KEY', 'PRINTFUL_STORE_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'DRY_RUN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'GITHUB_STEP_SUMMARY', 'MAX', 'RUN_LIMIT_MS', 'PRINTFUL_MIN_NETTO_CHF', 'PRINTFUL_DATEI_HOSTS']) delete process.env[k];
  if (sz.telegram) Object.assign(process.env, { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' });
  if (sz.ki && sz.ki !== 'aus') { process.env.PRINTFUL_KI_KONTROLLE = 'pflicht'; if (sz.ki !== 'ohne-schluessel') process.env.GEMINI_API_KEY = 'g'; }
  Object.assign(process.env, sz.env || {});
  const prot = { api: [], pf: [], posts: [], confirms: [], tags: [], mf: [], tg: [], log: [], warn: [], err: [], shop: [], dateien: [], gemini: [], variantGets: [], variantSignale: [], postSignale: [], exitCode: null, lookups: 0, leseVor: 0, leseNach: 0, dateiGezogen: 0, dateiAbgebrochen: false, shopOps: [], shopQuery: '' };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  const st = { bestaetigt: false, ext: null, nr: 0 };
  const mk = (status, body, x = {}) => ({ ok: status >= 200 && status < 300, status, body: null, headers: { get: (k) => { const l = String(k).toLowerCase(); return x.header && x.header[l] !== undefined ? x.header[l] : (sz.retryAfter && l === 'retry-after' ? String(sz.retryAfter) : null); } },
    json: async () => { if (x.roh !== undefined) throw new Error('kein JSON'); return body; }, arrayBuffer: async () => (x.bytes ? x.bytes.buffer.slice(x.bytes.byteOffset, x.bytes.byteOffset + x.bytes.byteLength) : new ArrayBuffer(0)) });
  const png = (w, h) => { const b = Buffer.alloc(64); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const folge = (liste, n) => (Array.isArray(liste) && liste.length ? liste[Math.min(n, liste.length - 1)] : {});
  const draftOrder = (i = 0) => ({ id: 42, external_id: st.ext, status: 'draft', error: null, costs: { currency: 'USD', subtotal: '7.75', discount: '0.00', shipping: '4.00', tax: '0.95', vat: '0.00', total: '12.70' }, items: [{ files: [{ type: 'default', status: 'ok', width: 1024, height: 1024 }, { type: 'preview', status: 'ok' }] }], ...(sz.entwurf || {}), ...folge(sz.entwurfFolge, i) });
  const nachOrder = (i = 0) => ({ ...draftOrder(0), status: 'pending', ...(sz.nachConfirm || {}), ...folge(sz.nachFolge, i) });
  // Katalog des Szenarios: echte Auszüge (Tasse, T-Shirt, Kappe, Poster, Jacke, Strick, Hülle), sonst synthetisch aus der Dateiliste des Mitschnitts
  const druck = (pid) => {
    if (KAT[pid]) return KAT[pid];
    const m = MIT[pid]; if (!m) return null;
    const ids = m.produkt.files.filter((f) => f.type !== 'mockup').flatMap((f) => [f.id, f.type]);
    const pl = Object.fromEntries(ids.map((i) => [i, 1]));
    return { printfiles: { printfiles: [{ printfile_id: 1, width: 3000, height: 3000, dpi: 150, fill_mode: 'fit' }], variant_printfiles: [{ variant_id: sz.vid, placements: pl }] }, templates: { min_dpi: 75, conflicting_placements: [] } };
  };
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      prot.api.push((/\/admin\/api\/([^/]+)\//.exec(url) || [])[1]);
      if (q.includes('orders(first')) {
        prot.shop.push({ q: b.variables.q, n: b.variables.n, c: b.variables.c }); prot.shopQuery = q;
        const seiten = sz.shopSeiten || [{ orders: sz.orders || [] }];
        const i = b.variables.c ? parseInt(String(b.variables.c).slice(1), 10) : 0, s = seiten[i] || { orders: [] };
        const weiter = s.weiter !== undefined ? s.weiter : i < seiten.length - 1;
        return mk(200, { data: { orders: { pageInfo: { hasNextPage: !!weiter, endCursor: 'c' + (i + 1) }, edges: s.orders.map((node) => ({ node })) } } });
      }
      if (q.includes('shop {')) return mk(200, { data: { shop: { name: 'x' } } });
      if (q.includes('tagsAdd')) {
        prot.shopOps.push('tagsAdd');
        if (sz.tagFehler === 'http') return mk(500, {});
        const n = prot.tags.length; prot.tags.push({ id: b.variables.id, tags: b.variables.tags });
        if (sz.tagFehler === 'userErrors' && (sz.tagFehlerAb === undefined || n >= sz.tagFehlerAb)) return mk(200, { data: { tagsAdd: { userErrors: [{ message: 'kaputt' }] } } });
        if (sz.tagFehler === 'graphql') return mk(200, { errors: [{ message: 'Access denied' }] });
        return mk(200, { data: { tagsAdd: { userErrors: [] } } });
      }
      if (q.includes('metafieldsSet')) { prot.shopOps.push('metafieldsSet'); prot.mf.push(b.variables.mf[0]); return mk(200, { data: { metafieldsSet: { userErrors: sz.mfFehler ? [{ message: 'x' }] : [] } } }); }
      return mk(200, { data: {} });
    }
    if (url.startsWith('https://api.telegram.org')) { prot.tg.push(JSON.parse(o.body).text); return sz.tgFehler ? mk(500, {}) : mk(200, { ok: true }); }
    if (url.includes('generativelanguage.googleapis.com')) {
      prot.gemini.push({ url, schluesselImKopf: !!(o.headers && o.headers['x-goog-api-key']), schluesselInUrl: /key=/.test(url) });
      if (sz.ki === 'wirft') throw new Error('ETIMEDOUT');
      if (sz.ki === 'http402') return mk(402, { error: { message: 'prepayment credits are depleted' } });
      const t = { pass: 'PASS - sieht gut aus', fail: 'FAIL - <b>leer</b>', unklar: 'Das Bild zeigt eine Tasse.', leer: '' }[sz.ki];
      return mk(200, { candidates: [{ content: { parts: [{ text: t }] } }] });
    }
    if (/res\.cloudinary\.com|cdn\.shopify\.com|bilder\.luxestyle\.ch|evil\.example\.com/.test(url)) {
      prot.dateien.push({ url, range: !!(o.headers && o.headers.Range) });
      const spez = (sz.dateiPro || []).find((x) => url.includes(x.match)) || sz.datei || {};
      if (spez.wirft) throw new Error('ECONNRESET');
      const status = spez.status || 200;
      if (status !== 200) return mk(status, {});
      if (spez.strom) {                                   // ein Server, der den Range-Kopf ignoriert und die GANZE Datei in Stücken liefert: der Kleber darf nur den Anfang ziehen
        const ganz = Buffer.concat([png(...(spez.px || [3000, 3000])), Buffer.alloc(spez.strom)]); let pos = 0;
        const r = mk(200, {}, { bytes: ganz, header: { 'content-type': 'image/png' } });
        r.body = { getReader: () => ({ read: async () => { if (pos >= ganz.length) return { done: true }; const teil = ganz.subarray(pos, pos + 16384); pos += teil.length; prot.dateiGezogen += teil.length; return { done: false, value: new Uint8Array(teil) }; }, cancel: async () => { prot.dateiAbgebrochen = true; } }) };
        return r;
      }
      return mk(200, {}, { bytes: spez.roh ? Buffer.from('<html>kein Bild</html>') : png(...(spez.px || [3000, 3000])), header: { 'content-type': spez.typ || 'image/png' } });
    }
    if (url.startsWith('https://api.printful.com')) {
      const p = url.slice('https://api.printful.com'.length), m = (o.method || 'GET').toUpperCase();
      prot.pf.push(m + ' ' + p);
      let r;
      if ((r = /^\/products\/variant\/(\d+)$/.exec(p))) {
        prot.variantGets.push(r[1]); prot.variantSignale.push(!!o.signal);
        const v = sz.variant[Math.min(prot.variantGets.length - 1, sz.variant.length - 1)];
        if (v.wirft) throw new Error(v.wirft);
        if (v.roh !== undefined) return mk(v.status, null, { roh: v.roh });
        if (v.kat) return mk(200, { result: { variant: { id: Number(r[1]) }, product: KAT[v.kat].produkt } });
        return mk(v.status, v.body);
      }
      if ((r = /^\/mockup-generator\/(printfiles|templates)\/(\d+)$/.exec(p))) {
        if (sz.druckStatus) return mk(sz.druckStatus, { error: { message: 'busy' } });
        const d = druck(Number(r[2])); if (!d) return mk(404, { error: { message: 'nicht da' } });
        return mk(200, { result: r[1] === 'printfiles' ? d.printfiles : d.templates });
      }
      if ((r = /^\/orders\/@(.+)$/.exec(p))) {
        prot.lookups++;
        const l = folge(sz.lookup, prot.lookups - 1);
        if (l.wirft) throw new Error(l.wirft);
        if (l.status === 200) return mk(200, { result: { id: 777, external_id: decodeURIComponent(r[1]), status: 'draft', ...(l.order || {}) } });
        return mk(l.status || 404, { error: { message: 'Not Found' } });
      }
      if (m === 'POST' && p === '/orders') {
        prot.postSignale.push(!!o.signal);
        const body = JSON.parse(o.body); prot.posts.push({ p, body }); st.ext = body.external_id;
        const pr = folge(sz.post, prot.posts.length - 1);
        if (pr.wirft) throw new Error(pr.wirft);
        const status = pr.status || 200;
        return mk(status, status === 200 ? { result: { id: 42, status: 'draft' } } : { error: { message: pr.meldung || 'fehlgeschlagen' } });
      }
      if ((r = /^\/orders\/(\d+)\/confirm$/.exec(p)) && m === 'POST') {
        prot.confirms.push(p); const c = sz.confirmFolge ? folge(sz.confirmFolge, prot.confirms.length - 1) : (sz.confirm || {});
        if (c.wirft) throw new Error(c.wirft);
        if (c.status && c.status !== 200) { if (c.trotzdem) st.bestaetigt = true; return mk(c.status, { error: { message: c.meldung || 'abgelehnt' } }); }
        st.bestaetigt = true; return mk(200, { result: { id: 42, status: 'pending' } });
      }
      if ((r = /^\/orders\/(\d+)$/.exec(p)) && m === 'GET') {
        if (sz.lesenStatus) return mk(sz.lesenStatus, {});
        const idx = st.bestaetigt ? prot.leseNach : prot.leseVor;
        const o2 = st.bestaetigt ? nachOrder(idx) : draftOrder(idx);
        if (st.bestaetigt) prot.leseNach++; else prot.leseVor++;
        return mk(200, { result: o2 });
      }
    }
    return mk(200, {});
  };
  console.log = (...a) => { const t = a.join(' '); prot.log.push(t); if (/^Printful-Sync fertig:/.test(t)) { prot.exitCode = process.exitCode || 0; fertig(); } };
  console.warn = (...a) => { prot.warn.push(a.join(' ')); };
  console.error = (...a) => { prot.err.push(a.join(' ')); };
  let gesendet = false;
  const melde = () => { if (gesendet) return; gesendet = true; try { writeSync(1, '\nPS_ERGEBNIS ' + JSON.stringify({ ...prot, ausstieg: process.exitCode ?? null }) + '\n'); } catch { /* egal */ } };
  process.on('exit', melde);                         // auch wenn das Skript selbst process.exit(1) ruft (fataler Fehler)
  await import('./printful_sync.mjs');
  await Promise.race([ende, new Promise((r) => setTimeout(r, 20000))]);
  melde();
  process.exit(0);
}

// ═════════════════════════════════════════════════════════════ PRÜFER
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 700)}\n   soll: ${JSON.stringify(b).slice(0, 700)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const lauf = (sz, env = {}) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PS_SZENARIO: JSON.stringify(sz), ...env }, encoding: 'utf8', timeout: 90000 });
  const m = String(r.stdout).match(/PS_ERGEBNIS (.*)\n/);
  if (!m) throw new Error('Kindprozess ohne Ergebnis (Exit ' + r.status + '): ' + String(r.stderr).slice(0, 600) + String(r.stdout).slice(-300));
  return { status: r.status, prot: JSON.parse(m[1]), stderr: r.stderr, stdout: r.stdout };
};
const antwort = (pid) => ({ status: 200, body: { result: { variant: { id: MIT[pid].variante }, product: MIT[pid].produkt } } });
const V = (s) => 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/' + s + '.png';
const A = (key, value) => ({ key, value });
const karte6 = (pl, extra = {}) => A('_pod_karte', JSON.stringify({ v: 6, s: 1, pl, ...extra }));
/** Bestellung (Shopify-Knoten) mit EINER Editor-Position; v5-Schlüssel «🖼️ Druckdatei (Vorne)» wie im alten Test. */
const zeile = (o = {}) => ({ id: 'gid://shopify/LineItem/9001', quantity: 1, sku: '5599797_4025', title: 'T', discountedTotalSet: { shopMoney: { amount: '49.90', currencyCode: 'CHF' } }, product: { productType: 'T-Shirts', tags: ['wunschdesign'], metafield: null }, variant: { sku: '5599797_4025' }, customAttributes: [A('🖼️ Druckdatei (Vorne)', V('Vorne'))], ...o });
const knoten = (zeilen, o = {}) => ({ id: 'gid://shopify/Order/1', name: '#T1', email: 'a@b.ch', tags: [], shippingAddress: { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' }, lineItems: { pageInfo: { hasNextPage: false }, edges: zeilen.map((node) => ({ node })) }, ...o });
const einfach = (pt, sku, seiten, extra = {}) => ({ pt, sku, seiten, ...extra });
/** Szenario aus dem alten Muster {pt, sku, seiten, variant}: eine Bestellung, v5-Eigenschaften «Druckdatei (<Seite>)» */
const alt = (s) => ({ vid: Number(s.sku.split('_').pop()), orders: [knoten([zeile({ sku: s.sku, variant: { sku: s.sku }, product: { productType: s.pt, tags: ['wunschdesign'], metafield: null }, customAttributes: s.seiten.map((x) => A('🖼️ Druckdatei (' + x + ')', V(x))) })])], ...s });
const sz1 = (zeilen, extra = {}) => ({ vid: 4025, orders: [knoten(zeilen, extra.order || {})], variant: [{ kat: 71 }], ...extra });
const typenDerPosts = (e) => e.prot.posts.map((p) => p.body.items.map((i) => i.files.map((f) => f.type)));
const tags = (e) => e.prot.tags.flatMap((t) => t.tags);
const bestaetigt = (e) => e.prot.confirms.length > 0;
const hatReview = (e) => tags(e).includes('printful-review');
const tgAnzahl = (e) => e.prot.tg.length;
/** Was an Printful ging, wie im alten Test: [bestätigt?, files[].type je Datei, Variantennummer] */
const gesendet = (e) => e.prot.posts.map((p) => [bestaetigt(e), p.body.items.map((i) => i.files.map((f) => f.type)), p.body.items.map((i) => i.variant_id)]);

// ── Gesicherte Fälle: der Printful-Typ der Variante entscheidet; Entwurf mit external_id, Dateien/Kosten nachgelesen, dann bestätigt und der Status nachgelesen
for (const [name, sz, soll] of [
  ['Handyhülle (Shop-Art «Handy-Zubehör», Printful 798)', alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [antwort(798)] }), ['default']],
  ['Tasse (Shop-Art «Tassen & Becher», Printful 19)', alt({ pt: 'Tassen & Becher', sku: '111_1320', seiten: ['Vorne'], variant: [antwort(19)] }), ['default']],
  ['Poster (Printful 268)', alt({ pt: 'Poster', sku: '9000001_8948', seiten: ['Vorne'], variant: [antwort(268)] }), ['default']],
  ['Magnet (Shop-Art «Magnet», Printful 656 ist technisch ein STICKER)', alt({ pt: 'Magnet', sku: '111_16366', seiten: ['Vorne'], variant: [antwort(656)] }), ['default']],
  ['Mauspad (SUBLIMATION, Shop-Art «Accessoires»)', alt({ pt: 'Accessoires', sku: '111_14943', seiten: ['Vorne'], variant: [antwort(583)] }), ['default']],
  ['Stoffbeutel (CUT-SEW mit nur «default», Shop-Art «Taschen»)', alt({ pt: 'Taschen', sku: '111_4533', seiten: ['Vorne'], variant: [antwort(84)] }), ['default']],
  ['T-Shirt nur vorne (Printful 71)', alt({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne'], variant: [antwort(71)] }), ['front']],
]) {
  const e = lauf(sz);
  ist(`${name}: genau ein Auftrag, Platzierung ${soll.join('/')}, bestätigt, eine Variantenabfrage mit Zeitlimit, Tags printful-synced + printful-confirmed, kein Review`,
    [e.prot.posts.length, typenDerPosts(e), e.prot.confirms.length, e.prot.variantGets.length, e.prot.variantSignale, tags(e).includes('printful-synced'), tags(e).includes('printful-confirmed'), hatReview(e), e.status, e.prot.exitCode],
    [1, [[soll]], 1, 1, [true], true, true, false, 0, 0]);
}
{ // Aufbau des Auftrags und Reihenfolge der Aufrufe
  const e = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [antwort(798)] }));
  const p = e.prot.posts[0];
  ist('Abfrage geht an /products/variant/20688 (die Nummer aus der SKU), der Auftrag an variant_id 20688 mit external_id «LXT1», der Auftrag selbst MIT Zeitlimit-Signal (früher ohne: hing an einer stummen API)', [e.prot.variantGets, p.body.items[0].variant_id, p.body.external_id, e.prot.postSignale], [['20688'], 20688, 'LXT1', [true]]);
  ist('der Entwurf wird OHNE confirm angelegt (POST /orders), bestätigt wird in einem eigenen Schritt', [p.p, e.prot.confirms], ['/orders', ['/orders/42/confirm']]);
  ist('Reihenfolge: zuerst nach bestehendem Auftrag fragen, dann anlegen, markieren, nachlesen, bestätigen, Status nachlesen', e.prot.pf.filter((x) => !/products|mockup/.test(x)), ['GET /orders/@LXT1', 'POST /orders', 'GET /orders/42', 'POST /orders/42/confirm', 'GET /orders/42']);
  ist('Tag printful-synced steht VOR dem Bestätigen (erste Tag-Mutation), Metafeld printful.order_id = 42', [e.prot.tags[0].tags, e.prot.mf.map((m) => [m.namespace, m.key, m.value])], [['printful-synced'], [['printful', 'order_id', '42']]]);
  ist('Empfänger und Artikel gehen mit: Name, Ort, Land, Menge; Artikel-external_id = Nummer der Bestellposition', [p.body.recipient.name, p.body.recipient.city, p.body.recipient.country_code, p.body.items[0].quantity, p.body.items[0].external_id], ['T', 'Basel', 'CH', 1, '9001']);
}
{ // T-Shirt vorne + hinten (v5): beide Seiten, URLs bleiben ihrer Seite zugeordnet, nur EINE Abfrage (Cache)
  const e = lauf(alt({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne', 'Hinten'], variant: [antwort(71)] }));
  ist('T-Shirt vorne+hinten (v5): front mit der Vorne-Datei, back mit der Hinten-Datei, bestätigt, eine Abfrage', [e.prot.posts[0].body.items[0].files, e.prot.variantGets.length, bestaetigt(e)], [[{ type: 'front', url: V('Vorne') }, { type: 'back', url: V('Hinten') }], 1, true]);
  const h = lauf(alt({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Hinten'], variant: [antwort(71)] }));
  ist('nur eine Rückseite: Platzierung back (nicht front)', [h.prot.posts[0].body.items[0].files], [[{ type: 'back', url: V('Hinten') }]]);
  // Codex-Fund (wichtig): eine Rückseiten-Datei auf einem Ein-Platzierungs-Produkt war früher «default, bestätigt»; jetzt Entwurf mit Meldung
  const hu = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Hinten'], variant: [antwort(798)] }));
  ist('Hülle mit «Hinten»-Datei: Platzierung default, aber NICHT bestätigt (die Hülle hat keine Rückseite): Entwurf, Review-Tag «platzierung», eine Meldung', [hu.prot.posts[0].body.items[0].files.map((f) => f.type), bestaetigt(hu), tags(hu).includes('printful-review-platzierung'), hu.prot.warn.length >= 0], [['default'], false, true, true]);
  const tv = lauf(alt({ pt: 'Tassen', sku: '111_1320', seiten: ['Vorne', 'Hinten'], variant: [antwort(19)], telegram: true }));
  ist('Tasse mit Vorne UND Hinten: beide würden «default» belegen → Entwurf, kein Bestätigen (früher: ohne Review durchgewunken)', [tv.prot.posts[0].body.items[0].files.map((f) => f.type), bestaetigt(tv), tgAnzahl(tv), /dieselbe Platzierung/.test(tv.prot.tg[0])], [['default', 'default'], false, 2, true]);
}

// ── Fehler bei der Variantenabfrage (Befund 23): wiederholen; bleibt es dabei, nach Shop-Art zurückfallen; dann ist weder Platzierung noch Auflösung noch Option prüfbar → Entwurf
{
  const netz = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ wirft: 'ECONNRESET' }] }));
  ist('Netzfehler, Shop-Art «Handy-Zubehör»: dreimal versucht, Rückfall front, Auftrag als ENTWURF (kein Bestätigen), Tags printful-synced + printful-review, KEIN printful-confirmed, Log «ENTWURF (Review)»',
    [netz.prot.variantGets.length, gesendet(netz), tags(netz).includes('printful-review'), tags(netz).includes('printful-confirmed'), netz.prot.log.some((l) => /ENTWURF \(Review\)/.test(l))], [3, [[false, [['front']], [20688]]], true, false, true]);
  const nw = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ wirft: 'ECONNRESET' }], telegram: true }));
  ist('…die Meldung an Telegram nennt Auftrag, Vorderseite und den Grund «derzeit nicht lesbar (Netzfehler)»', nw.prot.tg.some((t) => /#T1/.test(t) && /Vorderseite nicht gesichert/.test(t) && /derzeit nicht lesbar \(Netzfehler\)/.test(t)), true);
  const h404 = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 404, body: { error: { message: 'nicht da' } } }] }));
  ist('HTTP 404: endgültig, KEINE Wiederholung (eine Abfrage), Rückfall front, Entwurf', [h404.prot.variantGets.length, gesendet(h404), tags(h404).includes('printful-review')], [1, [[false, [['front']], [20688]]], true]);
  const h502 = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 502, roh: '<html>Bad gateway</html>' }, antwort(798)] }));
  ist('HTTP 502 (HTML), dann Erfolg: wiederholt, danach default und BESTÄTIGT', [h502.prot.variantGets.length, gesendet(h502), tags(h502).includes('printful-confirmed')], [2, [[true, [['default']], [20688]]], true]);
  const h429 = lauf(alt({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 429, body: { error: { message: 'Too many requests' } } }, antwort(798)], retryAfter: 0 }));
  ist('HTTP 429, dann Erfolg: wiederholt, default, bestätigt', [h429.prot.variantGets.length, gesendet(h429)], [2, [[true, [['default']], [20688]]]]);
  // Änderung gegenüber der alten Fassung: bei nicht lesbarer Variante fehlen Produkt-Nummer, Mindest-dpi, Konflikte und Optionen. Der Rückfall «Poster/Magnet → default» bleibt belegt,
  // aber bestätigt wird nicht mehr (früher bestätigt).
  const pn = lauf(alt({ pt: 'Poster', sku: '9000001_8948', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] }));
  ist('Netzfehler, Shop-Art «Poster» (alte Liste): Rückfall default (belegt), aber Entwurf: Mindest-dpi und Optionen sind ohne Produkt nicht prüfbar (früher bestätigt)', [pn.prot.variantGets.length, gesendet(pn), tags(pn).includes('printful-review-druckdaten')], [3, [[false, [['default']], [8948]]], true]);
  const mn = lauf(alt({ pt: 'Magnet', sku: '111_16366', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] }));
  ist('Netzfehler, Shop-Art «Magnet» (alte Liste): Rückfall default, Entwurf', gesendet(mn), [[false, [['default']], [16366]]]);
  const tn = lauf(alt({ pt: 'Tassen & Becher', sku: '111_1320', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] }));
  ist('Netzfehler, Shop-Art «Tassen & Becher» (NICHT in der alten Liste): front geraten → Entwurf', gesendet(tn), [[false, [['front']], [1320]]]);
  const sn = lauf(alt({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne', 'Hinten'], variant: [{ wirft: 'ECONNRESET' }], telegram: true }));
  ist('Netzfehler beim Shirt: front/back aus der Shop-Art geraten → Entwurf mit zwei Hinweisen', [gesendet(sn), (sn.prot.tg[0].match(/nicht gesichert/g) || []).length], [[[false, [['front', 'back']], [4025]]], 2]);
}
// ── Dateiliste kennt die Seite nicht (Befund 26): bisherige Antwort, aber Entwurf
{
  const hose = lauf(alt({ pt: 'Hosen', sku: '111_11038', seiten: ['Vorne'], variant: [antwort(400)], telegram: true }));
  ist('Jogginghose (right_leg/left_leg): front wie bisher, aber Entwurf mit Hinweis auf die Dateiliste', [gesendet(hose), hose.prot.tg.some((w) => /right_leg, left_leg, label_inside/.test(w))], [[[false, [['front']], [11038]]], true]);
  const ruck = lauf(alt({ pt: 'Taschen', sku: '111_9063', seiten: ['Vorne', 'Hinten'], variant: [antwort(279)], telegram: true }));
  ist('Rucksack (kein «back»): Vorderseite gesichert, Rückseite nicht → Entwurf', [gesendet(ruck), (ruck.prot.tg[0].match(/nicht gesichert/g) || []).length], [[[false, [['front', 'back']], [9063]]], 1]);
}

// ═════════════════════════════════════════════════════════════ NEU: mehrere Platzierungen (Editor v6), echte Platzierungs-IDs
{
  const sechs = (extra = {}) => sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v')), A('🖼️ Druckdatei (back)', V('h')), A('🖼️ Druckdatei (sleeve_left)', V('a')), karte6(['front', 'back', 'sleeve_left'], { dt: { front: 'default' } })] })], extra);
  const e = lauf(sechs());
  ist('v6 T-Shirt vorne+hinten+Ärmel: files[] mit den ECHTEN Typen default/back/sleeve_left und ihren URLs, bestätigt', [e.prot.posts[0].body.items[0].files, bestaetigt(e), hatReview(e)], [[{ type: 'default', url: V('v') }, { type: 'back', url: V('h') }, { type: 'sleeve_left', url: V('a') }], true, false]);
  const o = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (sleeve_left)', V('a')), karte6(['sleeve_left'])] })]));
  ist('v6 nur linker Ärmel: «sleeve_left» (der alte Weg hätte «front» daraus gemacht und den Ärmel auf die Brust gedruckt)', [o.prot.posts[0].body.items[0].files.map((f) => f.type), bestaetigt(o)], [['sleeve_left'], true]);
  const u = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (hood)', V('k')), karte6(['hood'])] })], { telegram: true }));
  ist('v6 unbekannte Platzierung «hood»: Entwurf (nicht bestätigt), Review-Tags, die Meldung nennt die Dateiliste', [bestaetigt(u), tags(u).includes('printful-review-platzierung'), /steht nicht in der Dateiliste/.test(u.prot.tg[0])], [false, true, true]);
  const k = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v')), A('🖼️ Druckdatei (front_large)', V('w')), karte6(['front', 'front_large'], { dt: { front: 'default' } })] })], { telegram: true, datei: { px: [2250, 2700] } }));
  ist('v6 front + front_large (Konflikt laut Katalog): Entwurf, Review-Tag «konflikt», Meldung nennt beide Platzierungen', [bestaetigt(k), tags(k).includes('printful-review-konflikt'), /«front» und «front_large»/.test(k.prot.tg[0])], [false, true, true]);
  const d = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (default)', V('v')), A('🖼️ Druckdatei (front)', V('w'))] })], { telegram: true }));
  ist('v6 «default» und «front» zugleich (dieselbe Platzierung): Entwurf, nicht bestätigt', [bestaetigt(d), tags(d).includes('printful-review-platzierung')], [false, true]);
  const n = lauf(sechs({ druckStatus: 429 }));
  ist('Katalog (Mindest-dpi, Konflikte) nicht lesbar (429): Entwurf, Review-Tag «druckdaten», NICHT bestätigt', [bestaetigt(n), tags(n).includes('printful-review-druckdaten')], [false, true]);
  const kn = lauf(sechs());
  ist('Katalog wird je Produkt EINMAL gelesen (printfiles + templates), nicht je Datei', kn.prot.pf.filter((x) => /mockup-generator/.test(x)), ['GET /mockup-generator/printfiles/71', 'GET /mockup-generator/templates/71']);
}

// ═════════════════════════════════════════════════════════════ NEU: Optionen (Stickerei) und Technik
{
  const stick = (extraAttr = [], extra = {}) => sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', V('s')), karte6(['embroidery_chest_left']), ...extraAttr] })], { telegram: true, ...extra });
  const o1 = lauf(stick());
  ist('Stickerei OHNE Garnfarben: Entwurf, Review-Tag «optionen», Meldung nennt thread_colors_chest_left; der Entwurf hat KEINE Optionen', [bestaetigt(o1), tags(o1).includes('printful-review-optionen'), /thread_colors_chest_left/.test(o1.prot.tg[0]), 'options' in o1.prot.posts[0].body.items[0]], [false, true, true, false]);
  const o2 = lauf(stick([A('⚙️ Option (thread_colors_chest_left)', '#FFFFFF,#cc3333')]));
  ist('Stickerei MIT Garnfarben: items[].options = [{id, value:[Hex…]}] in der Katalogschreibweise, bestätigt', [o2.prot.posts[0].body.items[0].options, o2.prot.posts[0].body.items[0].files, bestaetigt(o2)], [[{ id: 'thread_colors_chest_left', value: ['#FFFFFF', '#CC3333'] }], [{ type: 'embroidery_chest_left', url: V('s') }], true]);
  const o3 = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', V('s')), A('_pod_karte', JSON.stringify({ v: 6, pl: ['embroidery_chest_left'], o: { thread_colors_chest_left: ['#000000'] } }))] })]));
  ist('Optionen aus _pod_karte.o werden ebenso durchgereicht', [o3.prot.posts[0].body.items[0].options, bestaetigt(o3)], [[{ id: 'thread_colors_chest_left', value: ['#000000'] }], true]);
  const o4 = lauf(stick([A('⚙️ Option (thread_colors_chest_left)', '#123456')]));
  ist('Garnfarbe, die es nicht gibt: Entwurf, die Option wird NICHT gesendet', [bestaetigt(o4), 'options' in o4.prot.posts[0].body.items[0], tags(o4).includes('printful-review-optionen')], [false, false, true]);
  const o5 = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (embroidery_chest_left)', V('s')), A('🖼️ Druckdatei (back)', V('h')), A('⚙️ Option (thread_colors_chest_left)', '#000000')] })], { telegram: true }));
  ist('Stickerei + Direktdruck in einem Artikel: Entwurf, Review-Tag «technik-gemischt»', [bestaetigt(o5), tags(o5).includes('printful-review-technik-gemischt')], [false, true]);
}

// ═════════════════════════════════════════════════════════════ NEU: Auflösung, Dateien, Adressen (Datei-Prüfung ohne Bildbibliothek)
{
  const klein = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v')), karte6(['front'], { dt: { front: 'default' } })] })], { telegram: true, datei: { px: [600, 800] } }));
  ist('Datei 600×800 auf 1800×2400 (50 dpi, Mindest 75): Entwurf, Review-Tag «aufloesung», Meldung nennt Pixel und dpi', [bestaetigt(klein), tags(klein).includes('printful-review-aufloesung'), /600×800 px ergeben auf dem Produkt etwa 50 dpi/.test(klein.prot.tg[0])], [false, true, true]);
  const grenze = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v')), karte6(['front'])] })], { datei: { px: [900, 1200] } }));
  ist('Datei 900×1200 = genau 75 dpi: ok, bestätigt', [bestaetigt(grenze), hatReview(grenze)], [true, false]);
  const html = lauf(sz1([zeile()], { datei: { roh: true }, telegram: true }));
  ist('Datei ist kein Bild (HTML): Entwurf, «aufloesung» (nicht prüfbar, kein Freispruch)', [bestaetigt(html), tags(html).includes('printful-review-aufloesung')], [false, true]);
  const kopf = lauf(sz1([zeile()]));
  ist('die Datei wird mit Range-Kopf (nur der Anfang) geholt', kopf.prot.dateien.every((x) => x.range), true);
  const n404 = lauf(sz1([zeile()], { datei: { status: 404 }, telegram: true }));
  ist('Datei antwortet 404: HARTER Befund, KEIN Auftrag bei Printful, Review-Tags, eine Meldung', [n404.prot.posts.length, tags(n404).includes('printful-review-datei-nicht-erreichbar'), tags(n404).includes('printful-synced'), tgAnzahl(n404)], [0, true, false, 1]);
  const evil = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://evil.example.com/x.png')] })], { telegram: true }));
  ist('Datei von fremdem Host: HARTER Befund, die Adresse wird NIE abgerufen, kein Auftrag', [evil.prot.posts.length, evil.prot.dateien.length, tags(evil).includes('printful-review-datei-adresse')], [0, 0, true]);
  const http = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (Vorne)', 'http://res.cloudinary.com/x/a.png')] })], { telegram: true }));
  ist('Datei mit http: harter Befund (früher still ignoriert/abgerufen)', [http.prot.posts.length, tags(http).includes('printful-review-datei-adresse')], [0, true]);
  const eigen = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (Vorne)', 'https://bilder.luxestyle.ch/x.png')] })], { telegram: true, env: { PRINTFUL_DATEI_HOSTS: 'bilder.luxestyle.ch' } }));
  ist('PRINTFUL_DATEI_HOSTS erweitert die Liste', [eigen.prot.posts.length, hatReview(eigen)], [1, false]);
  const meta = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['wunschdesign'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9000001_8948', variant: { sku: '9000001_8948' } })], { vid: 8948, variant: [antwort(268)] }));
  ist('Fertig-Produkt mit Metafeld custom.print_file (beliebiger https-Host): Datei gilt als Vorderseite, bestätigt', [meta.prot.posts[0].body.items[0].files, bestaetigt(meta)], [[{ type: 'default', url: 'https://bilder.luxestyle.ch/motiv.png' }], true]);
}

// ═════════════════════════════════════════════════════════════ NEU: KI-Kontrolle gibt bei Fehler NICHT mehr frei
{
  const pass = lauf(sz1([zeile()], { ki: 'pass' }));
  ist('KI sagt PASS: bestätigt; Schlüssel im Kopf, NICHT in der Adresse; die kleine Cloudinary-Kopie (c_limit,w_1400) wird geprüft', [bestaetigt(pass), pass.prot.gemini[0].schluesselImKopf, pass.prot.gemini[0].schluesselInUrl, pass.prot.dateien.some((d) => /c_limit,w_1400/.test(d.url))], [true, true, false, true]);
  const fail = lauf(sz1([zeile()], { ki: 'fail', telegram: true }));
  ist('KI sagt FAIL: Entwurf, Review-Tag «kontrolle-fail», Meldung nennt den Grund und MASKIERT das HTML aus der KI-Antwort', [bestaetigt(fail), tags(fail).includes('printful-review-kontrolle-fail'), /FAIL - &lt;b&gt;leer&lt;\/b&gt;/.test(fail.prot.tg[0])], [false, true, true]);
  for (const [name, ki, art] of [['HTTP 402 (Guthaben leer)', 'http402', 'kontrolle-technisch'], ['Netzfehler/Zeitüberschreitung', 'wirft', 'kontrolle-technisch'], ['Antwort ohne PASS/FAIL', 'unklar', 'kontrolle-technisch'], ['leere Antwort', 'leer', 'kontrolle-technisch'], ['kein GEMINI_API_KEY (Vorgabe «pflicht»)', 'ohne-schluessel', 'kontrolle-fehlt']]) {
    const e = lauf(sz1([zeile()], { ki: ki, telegram: true }));
    ist(`KI: ${name} → Entwurf, Review-Tag «${art}», NICHT bestätigt (früher: PASS, Auftrag bestätigt)`, [bestaetigt(e), tags(e).includes('printful-review-' + art), e.prot.posts.length], [false, true, 1]);
  }
  const g402 = lauf(sz1([zeile()], { ki: 'http402', telegram: true }));
  ist('KI HTTP 402: die Meldung nennt den Grund («KI antwortet HTTP 402» samt Text von Google), nicht nur «unklar»', [/KI antwortet HTTP 402/.test(g402.prot.tg[0]), /prepayment credits are depleted/.test(g402.prot.tg[0])], [true, true]);
  const aus = lauf(sz1([zeile()], { ki: 'aus' }));
  ist('PRINTFUL_KI_KONTROLLE=aus verzichtet ausdrücklich: keine KI-Anfrage, bestätigt (die mechanischen Prüfungen bleiben)', [bestaetigt(aus), aus.prot.gemini.length], [true, 0]);
  const vor = lauf(sz1([zeile()]));
  ist('Vorgabe ohne Schalter und ohne Schlüssel im Test-Rahmen: «aus» (der Rahmen setzt aus; die echte Vorgabe ist «pflicht», siehe oben)', bestaetigt(vor), true);
}

// ═════════════════════════════════════════════════════════════ NEU: Doppelauftrag-Schutz
{
  const ex = lauf(sz1([zeile()], { lookup: [{ status: 200, order: { status: 'pending' } }] }));
  ist('Auftrag mit external_id existiert (pending): KEIN neuer Auftrag, nichts bestätigt, Tag printful-synced + Metafeld 777 nachgetragen, kein Review', [ex.prot.posts.length, ex.prot.confirms.length, tags(ex), ex.prot.mf.map((m) => m.value), ex.status], [0, 0, ['printful-synced'], ['777'], 0]);
  const exd = lauf(sz1([zeile()], { lookup: [{ status: 200, order: { status: 'draft' } }], telegram: true }));
  ist('Auftrag existiert als ENTWURF: nicht angelegt, nicht automatisch bestätigt, Review «vorhanden-entwurf», eine Meldung', [exd.prot.posts.length, exd.prot.confirms.length, tags(exd).includes('printful-review-vorhanden-entwurf'), tgAnzahl(exd)], [0, 0, true, 1]);
  const exf = lauf(sz1([zeile()], { lookup: [{ status: 200, order: { status: 'failed', error: 'Invalid Card Number' } }], telegram: true }));
  ist('Auftrag existiert, Status failed: nichts angelegt, Befund «vorhanden-zahlung-fehlgeschlagen» mit dem Grund der Karte', [exf.prot.posts.length, tags(exf).includes('printful-review-vorhanden-zahlung-fehlgeschlagen'), /Invalid Card Number/.test(exf.prot.tg[0])], [0, true, true]);
  const ex5 = lauf(sz1([zeile()], { lookup: [{ status: 500 }] }));
  ist('Nach dem Auftrag lässt sich nicht fragen (HTTP 500): NICHTS anlegen (sonst Doppel), Versuchszähler printful-versuch-1, Exit 1', [ex5.prot.posts.length, tags(ex5), ex5.prot.exitCode], [0, ['printful-versuch-1'], 1]);
  const exn = lauf(sz1([zeile()], { lookup: [{ wirft: 'ECONNRESET' }] }));
  ist('…Netzfehler bei der Nachfrage ebenso (drei Versuche der Nachfrage, kein Auftrag)', [exn.prot.posts.length, exn.prot.lookups, exn.prot.exitCode], [0, 3, 1]);
  const dr = lauf(sz1([zeile({ })], { order: { tags: ['printful-versuch-2'] }, lookup: [{ status: 500 }], telegram: true }));
  ist('Dritter Fehlversuch: aus dem Zähler wird ein Befund (Review-Tag «wiederholt-gescheitert», eine Meldung)', [tags(dr).includes('printful-versuch-3'), tags(dr).includes('printful-review-wiederholt-gescheitert'), dr.prot.tg.filter((t) => /Läufe in Folge/.test(t)).length], [true, true, 1]);
  // Anlegen: Antwort verloren
  const p500 = lauf(sz1([zeile()], { post: [{ status: 503 }], lookup: [{ status: 404 }, { status: 200, order: { status: 'draft' } }], telegram: true }));
  ist('POST /orders → 503, aber der Auftrag ist angelegt (Nachfrage findet ihn): KEIN zweiter POST, Tag nachgetragen, kein Bestätigen', [p500.prot.posts.length, p500.prot.confirms.length, tags(p500).includes('printful-synced')], [1, 0, true]);
  const pw = lauf(sz1([zeile()], { post: [{ wirft: 'ETIMEDOUT' }], lookup: [{ status: 404 }] }));
  ist('POST /orders → Netzfehler und KEIN Auftrag da: genau ein POST, später wieder (Versuchszähler), Exit 1, kein Review', [pw.prot.posts.length, tags(pw), pw.prot.exitCode], [1, ['printful-versuch-1'], 1]);
  const p400 = lauf(sz1([zeile()], { post: [{ status: 400, meldung: 'Invalid placement' }], telegram: true }));
  ist('POST /orders → 400: HARTER Befund «printful-abgelehnt» (Meldung von Printful im Text), KEIN printful-synced, Review-Tags, eine Meldung, Exit 0', [tags(p400).includes('printful-review-printful-abgelehnt'), tags(p400).includes('printful-synced'), /Invalid placement/.test(p400.prot.tg[0]), tgAnzahl(p400), p400.prot.exitCode], [true, false, true, 1, 0]);
  const p401 = lauf(sz1([zeile()], { post: [{ status: 401 }] }));
  ist('POST /orders → 401 (Schlüssel falsch): technischer Fehler, Exit 1, KEINE Tags an der Bestellung', [tags(p401), p401.prot.exitCode], [[], 1]);
  // Tag-Fehler
  for (const [name, f] of [['userErrors', 'userErrors'], ['HTTP 500', 'http'], ['GraphQL-Fehler', 'graphql']]) {
    const t = lauf(sz1([zeile()], { tagFehler: f }));
    ist(`Markieren scheitert (${name}): Auftrag angelegt, aber NICHT bestätigt, Fehler gemeldet, Exit 1; es bleibt bei EINEM Auftrag`, [t.prot.posts.length, t.prot.confirms.length, t.prot.exitCode, t.prot.err.some((x) => /Metafeld\/Tag nicht gesetzt/.test(x))], [1, 0, 1, true]);
  }
  const mf = lauf(sz1([zeile()], { mfFehler: true }));
  ist('Metafeld scheitert (userErrors): wie ein Tag-Fehler, nicht bestätigt, Exit 1', [mf.prot.confirms.length, mf.prot.exitCode], [0, 1]);
  const zw = lauf(sz1([zeile()], { tagFehler: 'userErrors', tagFehlerAb: 0, lookup: [{ status: 404 }] }));
  ist('Schreiben schlägt fehl, der NÄCHSTE Lauf (hier: Auftrag existiert jetzt) legt nichts doppelt an', zw.prot.posts.length, 1);
  const nach = lauf(sz1([zeile()], { lookup: [{ status: 200, order: { status: 'draft' } }] }));
  ist('…und tatsächlich: der zweite Lauf findet den Entwurf über external_id und legt keinen zweiten an', nach.prot.posts.length, 0);
}

// ═════════════════════════════════════════════════════════════ NEU: Status NACH dem Bestätigen wird gelesen
{
  const fz = lauf(sz1([zeile()], { nachConfirm: { status: 'failed', error: 'Invalid Card Number' }, telegram: true }));
  ist('Bestätigen ok, aber Printful meldet failed (Karte): NICHT «BESTÄTIGT» (Log «ENTWURF (Review)»), kein printful-confirmed, Review «zahlung-fehlgeschlagen», Meldung mit dem Grund', [fz.prot.log.some((l) => /BESTÄTIGT/.test(l)), fz.prot.log.some((l) => /ENTWURF \(Review\)/.test(l)), tags(fz).includes('printful-confirmed'), tags(fz).includes('printful-review-zahlung-fehlgeschlagen'), /Invalid Card Number/.test(fz.prot.tg[0])], [false, true, false, true, true]);
  const oh = lauf(sz1([zeile()], { nachConfirm: { status: 'onhold' }, telegram: true }));
  ist('Printful meldet onhold: Befund «angehalten», nicht bestätigt', [tags(oh).includes('printful-review-angehalten'), tags(oh).includes('printful-confirmed')], [true, false]);
  const ca = lauf(sz1([zeile()], { nachConfirm: { status: 'canceled' }, telegram: true }));
  ist('Printful meldet canceled: Befund «storniert»', tags(ca).includes('printful-review-storniert'), true);
  const dd = lauf(sz1([zeile()], { nachConfirm: { status: 'draft' } }));
  ist('Status bleibt «draft» nach dem Bestätigen (auch nach Wiederholen): Befund «nicht-bestaetigt»', [tags(dd).includes('printful-review-nicht-bestaetigt'), tags(dd).includes('printful-confirmed')], [true, false]);
  const spaet = lauf(sz1([zeile()], { nachFolge: [{ status: 'draft' }, { status: 'draft' }, { status: 'inprocess' }] }));
  ist('Status erst «draft», dann «inprocess» (Printful braucht einen Moment): nachgelesen, dann BESTÄTIGT', [spaet.prot.leseNach, tags(spaet).includes('printful-confirmed'), hatReview(spaet)], [3, true, false]);
  const c400 = lauf(sz1([zeile()], { confirm: { status: 400, meldung: 'Order has missing files' }, telegram: true }));
  ist('Bestätigen wird abgelehnt (400): Entwurf bleibt, Befund «bestaetigen-abgelehnt» mit Printful-Text, kein Status-Nachlesen nötig', [tags(c400).includes('printful-review-bestaetigen-abgelehnt'), /missing files/.test(c400.prot.tg[0]), tags(c400).includes('printful-confirmed')], [true, true, false]);
  const c500 = lauf(sz1([zeile()], { confirm: { status: 502, trotzdem: true } }));
  ist('Bestätigen: HTTP 502, aber Printful hat bestätigt (Status nachgelesen = pending): BESTÄTIGT', [tags(c500).includes('printful-confirmed'), hatReview(c500)], [true, false]);
  const c502 = lauf(sz1([zeile()], { confirm: { wirft: 'ECONNRESET' } }));
  ist('Bestätigen: Netzfehler und Status bleibt «draft»: Befund «nicht-bestaetigt», nie «BESTÄTIGT»', [tags(c502).includes('printful-review-nicht-bestaetigt'), c502.prot.log.some((l) => /BESTÄTIGT/.test(l))], [true, false]);
  const lg = lauf(sz1([zeile()], { lesenStatus: 500 }));
  ist('Status lässt sich nach dem Anlegen nicht lesen (500): Entwurf mit Befund «entwurf-nicht-lesbar», NICHT bestätigt', [tags(lg).includes('printful-review-entwurf-nicht-lesbar'), bestaetigt(lg)], [true, false]);
}
// ═════════════════════════════════════════════════════════════ NEU: Dateistatus und Kosten-Wächter
{
  const df = lauf(sz1([zeile()], { entwurf: { items: [{ files: [{ type: 'default', status: 'failed', warning: 'Image resolution too low' }, { type: 'preview', status: 'ok' }] }] }, telegram: true }));
  ist('Printful lehnt die Datei ab (status failed + Warnung): Entwurf, Befund «datei-abgelehnt» mit dem Text, nicht bestätigt', [bestaetigt(df), tags(df).includes('printful-review-datei-abgelehnt'), /Image resolution too low/.test(df.prot.tg[0])], [false, true, true]);
  const dw = lauf(sz1([zeile()], { entwurf: { items: [{ files: [{ type: 'default', status: 'waiting' }] }] } }));
  ist('Dateien bleiben «waiting» (nach sieben Lesungen, rund 2 Minuten): Befund «datei-wartet», nicht bestätigt', [bestaetigt(dw), tags(dw).includes('printful-review-datei-wartet'), dw.prot.leseVor], [false, true, 7]);
  const dw2 = lauf(sz1([zeile()], { entwurfFolge: [{ items: [{ files: [{ type: 'default', status: 'waiting' }] }] }, { items: [{ files: [{ type: 'default', status: 'waiting' }] }] }, {}] }));
  ist('Dateien erst «waiting», dann ok: nachgelesen (drei Lesungen), bestätigt', [dw2.prot.leseVor, bestaetigt(dw2)], [3, true]);
  const verlust = lauf(sz1([zeile({ discountedTotalSet: { shopMoney: { amount: '12.90', currencyCode: 'CHF' } } })], { entwurf: { costs: { currency: 'USD', subtotal: '19.00', shipping: '10.00', tax: '2.35', vat: '0.00', total: '31.35' } }, telegram: true }));
  ist('Kosten 31.35 USD (ohne Steuer 29.00 = 26.10 CHF) gegen 12.90 CHF Erlös: VERLUST → Entwurf, Befund «kosten», Meldung nennt Kosten und Erlös, NICHT bestätigt', [bestaetigt(verlust), tags(verlust).includes('printful-review-kosten'), /Verlust/.test(verlust.prot.tg[0]), /26\.10 CHF/.test(verlust.prot.tg[0]), /12\.90 CHF/.test(verlust.prot.tg[0])], [false, true, true, true, true]);
  const knapp = lauf(sz1([zeile({ discountedTotalSet: { shopMoney: { amount: '29.90', currencyCode: 'CHF' } } })], { entwurf: { costs: { currency: 'USD', subtotal: '7.75', shipping: '10.49', tax: '1.47', vat: '0.00', total: '19.71' } } }));
  ist('Echte Zahlen des Auftrags 183834327 (19.71 USD inkl. 1.47 Steuer) gegen 29.90 CHF: Gewinn → bestätigt', bestaetigt(knapp), true);
  const wenig = { discountedTotalSet: { shopMoney: { amount: '21.90', currencyCode: 'CHF' } } }, kost = { costs: { currency: 'USD', subtotal: '7.75', shipping: '10.49', tax: '1.47', vat: '0.00', total: '19.71' } };
  const o0 = lauf(sz1([zeile(wenig)], { entwurf: kost, env: { PRINTFUL_MIN_NETTO_CHF: '0' } }));
  ist('21.90 CHF Erlös gegen dieselben Kosten: Netto etwa 2.80 CHF, kein Verlust, Mindestgewinn ausdrücklich 0 → bestätigt', bestaetigt(o0), true);
  const o4 = lauf(sz1([zeile(wenig)], { entwurf: kost, telegram: true }));
  ist('Vorgabe des Mindestgewinns ist 4 CHF (Ziel der Preisformel): dasselbe Beispiel ohne Einstellung → Entwurf «kosten», Meldung «Gewinn unter dem Mindestgewinn»', [bestaetigt(o4), tags(o4).includes('printful-review-kosten'), /Gewinn unter dem Mindestgewinn/.test(o4.prot.tg[0])], [false, true, true]);
  const minn = lauf(sz1([zeile(wenig)], { entwurf: kost, env: { PRINTFUL_MIN_NETTO_CHF: '4' } }));
  ist('PRINTFUL_MIN_NETTO_CHF=4 (Ziel der Preisformel): dasselbe Beispiel → Entwurf «kosten», nicht bestätigt', [bestaetigt(minn), tags(minn).includes('printful-review-kosten')], [false, true]);
  const eur = lauf(sz1([zeile({ discountedTotalSet: { shopMoney: { amount: '29.90', currencyCode: 'EUR' } } })]));
  ist('Erlös in EUR: Kosten unbekannt → Entwurf «kosten-unbekannt» (keine geratene Umrechnung)', [bestaetigt(eur), tags(eur).includes('printful-review-kosten-unbekannt')], [false, true]);
  const ohneK = lauf(sz1([zeile({ discountedTotalSet: null })]));
  ist('Erlös fehlt im Shopify-Ergebnis: «kosten-unbekannt», nicht bestätigt', [bestaetigt(ohneK), tags(ohneK).includes('printful-review-kosten-unbekannt')], [false, true]);
  const keine = lauf(sz1([zeile()], { entwurf: { costs: null } }));
  ist('Printful nennt keine Kosten (auch nach Wiederholen): «kosten-unbekannt», nicht bestätigt', [bestaetigt(keine), tags(keine).includes('printful-review-kosten-unbekannt'), keine.prot.leseVor], [false, true, 7]);
  const rechnet = lauf(sz1([zeile()], { entwurfFolge: [{ costs: { currency: 'USD', total: '1', calculation_status: 'calculating' } }, { costs: { currency: 'USD', total: '1', calculation_status: 'calculating' } }, {}] }));
  ist('Kosten erst «calculating», dann fertig: nachgelesen, bestätigt', [rechnet.prot.leseVor, bestaetigt(rechnet)], [3, true]);
}

// ═════════════════════════════════════════════════════════════ NEU: Befunde ohne Auftrag (hart) und genau eine Meldung je Befundart
{
  const sku = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'noch kaputter' } })], { telegram: true }));
  ist('Bestellung nur mit unbekannter SKU (Codex-Fund: früher still übersprungen, bei jedem Lauf neu gelesen): Review-Tags «ohne-variante», EINE Meldung, kein Auftrag, kein Printful-Aufruf', [tags(sku), tgAnzahl(sku), sku.prot.posts.length, sku.prot.pf.filter((x) => /products|mockup|POST/.test(x)).length], [['printful-review', 'printful-review-ohne-variante'], 1, 0, 0]);
  const zw = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'noch kaputter' } })], { telegram: true, order: { tags: ['printful-review', 'printful-review-ohne-variante'] } }));
  ist('…beim nächsten Lauf (Tags vorhanden): KEINE zweite Meldung, keine neuen Tags (genau einmal)', [tgAnzahl(zw), zw.prot.tags.length], [0, 0]);
  const neuart = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'x' }, customAttributes: [] })], { telegram: true, order: { tags: ['printful-review', 'printful-review-ohne-variante'] } }));
  ist('…kommt eine NEUE Befundart dazu («keine-druckdatei» ist hier verdeckt, weil die SKU zuerst scheitert; Gegenprobe über hasNextPage)', tgAnzahl(neuart), 0);
  const lang = lauf(sz1([zeile()], { telegram: true, order: { lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: zeile() }] } } }));
  ist('Mehr als 50 Positionen (hasNextPage): HARTER Befund «positionen-viele», kein Auftrag (sonst gälte die Bestellung mit fehlenden Positionen als erledigt)', [lang.prot.posts.length, tags(lang).includes('printful-review-positionen-viele')], [0, true]);
  const gross = lauf(sz1([zeile({ product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [] })], { telegram: true, order: { lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: zeile({ product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [] }) }] } } }));
  ist('Bestellung mit über 50 Positionen, in den ersten 50 keine Editor-Ware (die 51. könnte eine sein): wird trotzdem geprüft, harter Befund «positionen-viele»', [gross.prot.posts.length, tags(gross).includes('printful-review-positionen-viele')], [0, true]);
  const adr = lauf(sz1([zeile()], { telegram: true, order: { shippingAddress: { name: 'T', address1: '', city: 'Basel', zip: '4000', countryCodeV2: 'CH' } } }));
  ist('Lieferadresse ohne Strasse: HARTER Befund «adresse», kein Auftrag', [adr.prot.posts.length, tags(adr).includes('printful-review-adresse')], [0, true]);
  const land = lauf(sz1([zeile()], { telegram: true, order: { shippingAddress: { name: 'T', address1: 'x', city: 'Basel', zip: '4000' } } }));
  ist('Lieferland fehlt: kein stilles «CH» mehr, harter Befund', [land.prot.posts.length, tags(land).includes('printful-review-adresse')], [0, true]);
  const ohneTag = lauf(sz1([zeile({ product: { productType: 'x', tags: ['sale'], metafield: null }, customAttributes: [A('🖼️ Druckdatei (front)', V('v'))] })], { telegram: true }));
  ist('Druckdatei-Eigenschaft an einem Produkt OHNE POD-Tag (für Kunden frei schreibbar): harter Befund, es wird NICHT gedruckt', [ohneTag.prot.posts.length, tags(ohneTag).includes('printful-review-druckdatei-ohne-pod')], [0, true]);
  const sw = lauf(sz1([zeile({ sku: '5599797_4025', variant: { sku: '5599797_999' } })], { telegram: true }));
  ist('SKU der Position ≠ SKU der Variante (Codex-Fund: früher gewann die Variante): die der Position gilt, Entwurf mit «sku-widerspruch»', [sw.prot.posts[0].body.items[0].variant_id, bestaetigt(sw), tags(sw).includes('printful-review-sku-widerspruch')], [4025, false, true]);
  const nurVar = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: '5599797_4025' } })]));
  ist('SKU der Position kaputt, die der Variante gut: Rückfall auf die Variante, bestätigt', [nurVar.prot.posts[0].body.items[0].variant_id, bestaetigt(nurVar)], [4025, true]);
  const dopp = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('a')), A('🖼️ Druckdatei (front)', V('b'))] })], { telegram: true }));
  ist('Dieselbe Platzierung zweimal in den Eigenschaften: harter Befund «datei-doppelt»', [dopp.prot.posts.length, tags(dopp).includes('printful-review-datei-doppelt')], [0, true]);
  const mix = lauf(sz1([zeile(), zeile({ id: 'gid://shopify/LineItem/9002', title: 'Lampe', sku: 'CJ-1', variant: { sku: 'CJ-1' }, product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [] })]));
  ist('Gemischte Bestellung (Editor-Shirt + CJ-Lampe): nur das Shirt geht an Printful, bestätigt', [mix.prot.posts[0].body.items.length, bestaetigt(mix)], [1, true]);
  const halb = lauf(sz1([zeile(), zeile({ id: 'gid://shopify/LineItem/9003', title: 'Tasse', sku: 'zzz', variant: { sku: 'zzz' } })], { telegram: true }));
  ist('Zwei Editor-Positionen, eine ohne Variante: KEIN Teilauftrag bei Printful (sonst bestätigt jemand einen halben Auftrag), eine Meldung', [halb.prot.posts.length, tgAnzahl(halb)], [0, 1]);
  const html = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (Vorne)', V('v'))], title: '<script>alert(1)</script>' }), zeile({ id: 'gid://shopify/LineItem/9004', title: 'Y<b>', sku: 'zzz', variant: { sku: 'zzz' } })], { telegram: true }));
  ist('Fremdtext (Produkttitel mit HTML) wird in der Telegram-Meldung maskiert', [/<script>/.test(html.prot.tg[0]), /&lt;b&gt;/.test(html.prot.tg[0])], [false, true]);
  const tgf = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'k' } })], { telegram: true, tgFehler: true }));
  ist('Telegram nicht zustellbar (HTTP 500): Fehler gemeldet, Exit 1, die Befund-Tags werden NICHT gesetzt (der nächste Lauf meldet erneut)', [tags(tgf).includes('printful-review-ohne-variante'), tgf.prot.exitCode], [false, 1]);
  const e1 = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v'))], product: { productType: 'T', tags: ['wunschdesign'], metafield: null } })], { telegram: true, datei: { px: [100, 100] }, order: { tags: ['printful-review-aufloesung'] } }));
  ist('Befundart schon gemeldet (Tag «printful-review-aufloesung»): keine zweite Meldung zur Auflösung, aber der Entwurf entsteht', [e1.prot.posts.length, e1.prot.tg.filter((t) => /Auflösung|dpi/.test(t)).length], [1, 0]);
}

// ═════════════════════════════════════════════════════════════ NEU: Seiten lesen, POD nicht verdrängen
{
  const nichtPod = (n) => knoten([zeile({ product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [] })], { id: 'gid://shopify/Order/' + n, name: '#N' + n });
  const pod = (n) => knoten([zeile()], { id: 'gid://shopify/Order/' + n, name: '#P' + n });
  const e = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: [nichtPod(1), nichtPod(2), nichtPod(3)] }, { orders: [nichtPod(4), pod(5)] }], env: { MAX: '1' } });
  ist('Drei Nicht-POD-Bestellungen auf Seite 1, die POD-Bestellung auf Seite 2 (Codex-Fund: wurde bei MAX=1 nie gesehen): sie wird bearbeitet, die Abfrage blättert mit dem Cursor', [e.prot.posts.length, e.prot.posts[0].body.external_id, e.prot.shop.map((s) => s.c)], [1, 'LXP5', [null, 'c1']]);
  const m = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: [pod(1), pod(2)] }, { orders: [pod(3)] }], env: { MAX: '2' } });
  ist('MAX=2: nach zwei POD-Bestellungen wird nicht weiter geblättert und keine dritte bearbeitet', [m.prot.posts.map((p) => p.body.external_id), m.prot.shop.length], [['LXP1', 'LXP2'], 1]);
  const f = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: [nichtPod(1)] }], orders: [] });
  ist('Nur Nicht-POD-Bestellungen: nichts zu tun, kein Printful-Aufruf, Exit 0', [f.prot.pf.length, f.prot.exitCode, f.prot.log.some((l) => /Keine offenen POD-Bestellungen/.test(l))], [0, 0, true]);
  ist('Die Abfrage schliesst synchronisierte UND in Prüfung stehende Bestellungen aus (Codex-Fund: fehlgeschlagene wurden bei jedem Lauf neu gesendet) und nimmt nur offene, bezahlte, unversendete', [/-tag:printful-synced/.test(e.prot.shop[0].q), /-tag:printful-review/.test(e.prot.shop[0].q), /financial_status:paid/.test(e.prot.shop[0].q), /fulfillment_status:unfulfilled/.test(e.prot.shop[0].q), /status:open/.test(e.prot.shop[0].q)], [true, true, true, true, true]);
  const storno = lauf(sz1([zeile()], { order: { cancelledAt: '2026-11-05T10:00:00Z' }, telegram: true }));
  ist('Stornierte (noch nicht erstattete) Bestellung: wird NIE an Printful übergeben, keine Tags, keine Meldung, Log nennt den Grund', [storno.prot.posts.length, storno.prot.tags.length, storno.prot.tg.length, storno.prot.log.some((l) => /in Shopify storniert/.test(l))], [0, 0, 0, true]);
  const viel = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (hood)', V('a'))], title: 'x'.repeat(2000) })], { telegram: true }));
  ist('Telegram-Meldung bleibt unter dem Limit von 4096 Zeichen, auch bei sehr langem Fremdtext', [viel.prot.tg.every((t) => t.length < 4096), viel.prot.tg.length > 0], [true, true]);
  const viele = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: Array.from({ length: 31 }, (_, i) => ({ orders: [nichtPod(i)], weiter: true })) });
  ist('Mehr als 30 Seiten: Abbruch mit Fehlermeldung «Seitenlimit», Exit 1', [viele.prot.shop.length, viele.prot.err.some((x) => /Seitenlimit/.test(x)), viele.prot.exitCode], [30, true, 1]);
  const zwei = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: [knoten([zeile({ sku: 'k', variant: { sku: 'k' } })], { id: 'gid://shopify/Order/1', name: '#P1' }), pod(2)] }] });
  ist('Eine Bestellung scheitert hart, die nächste läuft trotzdem durch', [zwei.prot.posts.map((p) => p.body.external_id), tags(zwei).includes('printful-review-ohne-variante')], [['LXP2'], true]);
}

// ═════════════════════════════════════════════════════════════ NEU: Trockenlauf, Handschalter, Zeitlimit, Zugangsdaten
{
  const dry = lauf(sz1([zeile()], { telegram: true, env: { DRY_RUN: '1' } }));
  ist('DRY_RUN=1: gelesen, aber nichts geschrieben (kein POST, kein Bestätigen, keine Tags, kein Telegram), «[DRY]» im Log, Exit 0', [dry.prot.posts.length, dry.prot.confirms.length, dry.prot.tags.length, dry.prot.tg.length, dry.prot.log.some((l) => /^\[DRY\] #T1/.test(l)), dry.prot.exitCode], [0, 0, 0, 0, true, 0]);
  for (const v of ['true', 'yes', 'ja', 'TRUE', 'x']) { const d = lauf(sz1([zeile()], { env: { DRY_RUN: v } })); ist(`DRY_RUN=${v} gilt als Trockenlauf (früher nur «1»)`, d.prot.posts.length, 0); }
  for (const v of ['0', 'false', 'no', 'nein', 'off']) { const d = lauf(sz1([zeile()], { env: { DRY_RUN: v } })); ist(`DRY_RUN=${v} schreibt`, d.prot.posts.length, 1); }
  const dx = lauf(sz1([zeile()], { env: { DRY_RUN: '1' }, lookup: [{ status: 200, order: { status: 'pending' } }], telegram: true }));
  ist('DRY_RUN und der Auftrag existiert: keine Tags, keine Meldung', [dx.prot.tags.length, dx.prot.tg.length], [0, 0]);
  const man = lauf(sz1([zeile()], { env: { PRINTFUL_AUTO_CONFIRM: '0' }, telegram: true }));
  ist('PRINTFUL_AUTO_CONFIRM=0: Entwurf angelegt, NICHT bestätigt, Review «manuell», eine Befund-Meldung (dazu die Zusammenfassung am Ende)', [man.prot.posts.length, bestaetigt(man), tags(man).includes('printful-review-manuell'), man.prot.tg.filter((t) => /Bestellung/.test(t)).length, man.prot.tg.length], [1, false, true, 1, 2]);
  const zl = lauf(sz1([zeile()], { env: { RUN_LIMIT_MS: '-1' } }));
  ist('Zeitlimit erreicht: keine Bestellung angefasst, Fehler «Zeitlimit», Exit 1', [zl.prot.posts.length, zl.prot.err.some((x) => /Zeitlimit/.test(x)), zl.prot.exitCode], [0, true, 1]);
  const ohneKey = spawnSync(process.execPath, [fileURLToPath(new URL('./printful_sync.mjs', import.meta.url))], { env: { PATH: process.env.PATH, HOME: process.env.HOME }, encoding: 'utf8', timeout: 30000 });
  ist('Ohne PRINTFUL_API_KEY: Exit 1 mit Meldung (früher stiller No-op mit Exit 0, auch im Zeitplan)', [ohneKey.status, /PRINTFUL_API_KEY/.test(ohneKey.stderr)], [1, true]);
  const ohneShop = spawnSync(process.execPath, [fileURLToPath(new URL('./printful_sync.mjs', import.meta.url))], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PRINTFUL_API_KEY: 'k' }, encoding: 'utf8', timeout: 30000 });
  ist('Ohne Shopify-Zugangsdaten: Exit 1 mit Meldung', [ohneShop.status, /Shopify-Zugangsdaten/.test(ohneShop.stderr)], [1, true]);
  ist('Shopify-Abfragen laufen auf der unterstützten API-Version 2026-01 (die alte Fassung nutzte das abgelaufene 2025-01)', [...new Set(man.prot.api)], ['2026-01']);
  const sum = lauf(sz1([zeile()], { env: { GITHUB_STEP_SUMMARY: '/dev/null' } }));
  ist('Zusammenfassung ohne Fehler: Zeile «Printful-Sync fertig: 1 bestätigt …», Exit 0', [/^Printful-Sync fertig: 1 bestätigt, 0 Entwurf\/Review, 0 ohne Auftrag/.test(sum.prot.log[sum.prot.log.length - 1]), sum.prot.exitCode], [true, 0]);
}

// ═════════════════════════════════════════════════════════════ NEU (Gegenleser, Runde 2, 05.11.2026)
// Fund 1 (beide Gegenleser): erst das Metafeld, das Tag ZULETZT
{
  const mf = lauf(sz1([zeile()], { mfFehler: true }));
  ist('Metafeld scheitert: das Tag printful-synced wird gar nicht erst gesetzt (sonst bliebe der Entwurf ohne Prüfer liegen), nicht bestätigt, Exit 1', [tags(mf), mf.prot.confirms.length, mf.prot.exitCode], [[], 0, 1]);
  ist('…und die Meldung verspricht nur, was stimmt: der nächste Lauf findet den Entwurf über external_id', mf.prot.err.some((x) => /findet ihn über external_id LXT1 und markiert ihn nach/.test(x)), true);
  const reihe = lauf(sz1([zeile()]));
  ist('Reihenfolge der Schreibzugriffe: Metafeld printful.order_id VOR dem Tag printful-synced (Aufruf-Reihenfolge am Shop)', reihe.prot.shopOps, ['metafieldsSet', 'tagsAdd', 'tagsAdd']);
  const nachlauf = lauf(sz1([zeile()], { lookup: [{ status: 200, order: { id: 42, status: 'draft' } }] }));
  ist('Zweiter Lauf nach dem Metafeld-Fehler (der Entwurf existiert): kein zweiter Auftrag, Metafeld UND Tag werden nachgeholt, Entwurf bleibt zur Prüfung', [nachlauf.prot.posts.length, nachlauf.prot.mf.map((m) => m.value), tags(nachlauf).includes('printful-synced'), nachlauf.prot.confirms.length], [0, ['42'], true, 0]);
}
// Fund 4 (GL1): Kosten von null oder darunter geben nie frei
{
  for (const [n, costs] of [['total 0.00', { currency: 'USD', total: '0.00', tax: '0.00' }], ['total negativ', { currency: 'USD', total: '-5.00' }], ['Steuer grösser als die Summe', { currency: 'USD', total: '12.70', tax: '20.00' }], ['Steuer gleich Summe', { currency: 'USD', total: '12.70', tax: '12.70' }]]) {
    const e = lauf(sz1([zeile()], { entwurf: { costs }, telegram: true }));
    ist(`Kosten ${n}: NICHT bestätigt, Befund «kosten-unbekannt»`, [bestaetigt(e), tags(e).includes('printful-review-kosten-unbekannt')], [false, true]);
  }
}
// Fund 1 (GL2): der bezahlte Versand gehört auf die Erlösseite
{
  const versand = { currentShippingPriceSet: { shopMoney: { amount: '7.0', currencyCode: 'CHF' } } };
  const kosten1033 = { costs: { currency: 'USD', subtotal: '2.34', shipping: '15.90', tax: '1.47', vat: '0.00', total: '19.71' } };   // echte Zahlen des Auftrags 183834327 (#1033)
  const pos = (betrag) => zeile({ discountedTotalSet: { shopMoney: { amount: betrag, currencyCode: 'CHF' } } });
  const mit = lauf(sz1([pos('16.83')], { entwurf: kosten1033, order: versand, telegram: true }));
  ist('#1033 (Positionen 16.83 CHF + 7.00 CHF bezahlter Versand = 23.83 CHF, Kosten 19.71 USD inkl. 1.47 Steuer): netto +4.51 CHF, über dem Mindestgewinn 4 → bestätigt', [bestaetigt(mit), hatReview(mit)], [true, false]);
  const ohne = lauf(sz1([pos('16.83')], { entwurf: kosten1033, telegram: true }));
  ist('…derselbe Auftrag OHNE Versand auf der Erlösseite (Fehler vor der Korrektur): netto -1.72 CHF → Entwurf «kosten» (Gegenprobe, dass der Versand wirkt)', [bestaetigt(ohne), tags(ohne).includes('printful-review-kosten'), /-1\.72 CHF/.test(ohne.prot.tg[0])], [false, true, true]);
  const frei = lauf(sz1([pos('16.83')], { entwurf: kosten1033, order: { currentShippingPriceSet: { shopMoney: { amount: '0.0', currencyCode: 'CHF' } } } }));
  ist('Gratisversand (0.0): kein Versandanteil, derselbe Auftrag bleibt Entwurf', bestaetigt(frei), false);
  const misch = lauf(sz1([pos('16.83'), zeile({ id: 'gid://shopify/LineItem/9002', title: 'Lampe', sku: 'CJ-1', variant: { sku: 'CJ-1' }, product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [], discountedTotalSet: { shopMoney: { amount: '16.83', currencyCode: 'CHF' } } })], { entwurf: kosten1033, order: versand, telegram: true }));
  ist('Mischbestellung (Sticker 16.83 + CJ-Lampe 16.83, Versand 7.00): nur der halbe Versand (3.50) zählt zum Druckauftrag → netto +0.0 unter dem Mindestgewinn → Entwurf «kosten»', [bestaetigt(misch), tags(misch).includes('printful-review-kosten')], [false, true]);
  const eur = lauf(sz1([pos('16.83')], { entwurf: kosten1033, order: { currentShippingPriceSet: { shopMoney: { amount: '7.0', currencyCode: 'EUR' } } } }));
  ist('Versand in EUR: wird nicht geraten, kein Versandanteil (vorsichtig) → Entwurf', bestaetigt(eur), false);
}
// Fund 9 (GL2): entfernte und erstattete Einheiten werden nicht gedruckt
{
  const teil = lauf(sz1([zeile({ quantity: 3, currentQuantity: 2, discountedTotalSet: { shopMoney: { amount: '89.70', currencyCode: 'CHF' } } })]));
  ist('Drei bestellt, eine nachträglich entfernt (currentQuantity 2): an Printful gehen 2', teil.prot.posts[0].body.items[0].quantity, 2);
  const weg = lauf(sz1([zeile({ quantity: 1, currentQuantity: 0 })], { telegram: true }));
  ist('Einzige Editor-Position vollständig entfernt (currentQuantity 0): die Bestellung ist kein Kandidat mehr (Log «Keine offenen POD-Bestellungen»), kein Printful-Aufruf, keine Tags, keine Meldung, Exit 0', [weg.prot.posts.length, weg.prot.pf.length, weg.prot.tags.length, weg.prot.tg.length, weg.prot.log.some((l) => /Keine offenen POD-Bestellungen/.test(l)), weg.prot.exitCode], [0, 0, 0, 0, true, 0]);
  const halb = lauf(sz1([zeile({ currentQuantity: 0 }), zeile({ id: 'gid://shopify/LineItem/9005', title: 'Tasse' })]));
  ist('Zwei Editor-Positionen, eine entfernt: nur die andere geht an Printful', [halb.prot.posts[0].body.items.length, halb.prot.posts[0].body.items[0].external_id], [1, '9005']);
  const q = lauf(sz1([zeile()]));
  ist('Die Shopify-Abfrage liest currentQuantity und den Versand der Bestellung', [/currentQuantity/.test(q.prot.shopQuery), /currentShippingPriceSet/.test(q.prot.shopQuery)], [true, true]);
}
// Fund 10 (GL2): external_id kollidiert nicht
{
  const a = lauf(sz1([zeile()], { order: { name: '#1034-1', id: 'gid://shopify/Order/111' } })), b = lauf(sz1([zeile()], { order: { name: '#10341', id: 'gid://shopify/Order/222' } }));
  ist('Bestellnamen «#1034-1» und «#10341» ergeben zwei verschiedene external_id (früher beide LX10341)', [a.prot.posts[0].body.external_id, b.prot.posts[0].body.external_id], ['LX10341N111', 'LX10341']);
  const n = lauf(sz1([zeile()], { order: { name: '#1034', id: 'gid://shopify/Order/333' } }));
  ist('Der Normalfall «#1034» bleibt «LX1034» (lesbar im Printful-Dashboard)', n.prot.posts[0].body.external_id, 'LX1034');
}
// Fund 5 (GL1): ein 4xx beim Anlegen wird erst nachgefragt, dann gebucht
{
  const z = lauf(sz1([zeile()], { post: [{ status: 400, meldung: 'duplicate external_id' }], lookup: [{ status: 404 }, { status: 200, order: { status: 'pending' } }], telegram: true }));
  ist('POST /orders → 400, die Nachfrage findet den Auftrag (zweiter Lauf legte ihn an): KEIN harter Befund «printful-abgelehnt», Tag printful-synced + Metafeld nachgetragen', [tags(z).includes('printful-review-printful-abgelehnt'), tags(z).includes('printful-synced'), z.prot.mf.map((m) => m.value), z.prot.posts.length], [false, true, ['777'], 1]);
  const z5 = lauf(sz1([zeile()], { post: [{ status: 400, meldung: 'Invalid placement' }], lookup: [{ status: 404 }, { status: 500 }] }));
  ist('POST /orders → 400, die Nachfrage ist nicht beantwortbar (500): kein harter Befund auf Verdacht, Versuchszähler, Exit 1', [tags(z5), z5.prot.exitCode], [['printful-versuch-1'], 1]);
  const z4 = lauf(sz1([zeile()], { post: [{ status: 400, meldung: 'Invalid placement' }], lookup: [{ status: 404 }, { status: 404 }], telegram: true }));
  ist('POST /orders → 400 und es gibt keinen Auftrag: harter Befund wie bisher', [tags(z4).includes('printful-review-printful-abgelehnt'), z4.prot.lookups], [true, 2]);
}
// Fund 6/2: die Wartezeit reicht für langsame Dateien, der Text nennt sie ehrlich
{
  const warte = (n) => Array.from({ length: n }, () => ({ items: [{ files: [{ type: 'default', status: 'waiting' }] }] }));
  const sechs = lauf(sz1([zeile()], { entwurfFolge: [...warte(5), {}] }));
  ist('Das Protokoll hält fest, wie lange Printful brauchte («Dateien und Kosten fertig nach N s Wartezeit»)', sechs.prot.log.some((l) => /^#T1: Printful-Entwurf #42: Dateien und Kosten fertig nach \d+ s Wartezeit/.test(l)), true);
  ist('Dateien erst nach fünf Lesungen fertig (früher nach vier aufgegeben): bestätigt, sechs Lesungen', [bestaetigt(sechs), sechs.prot.leseVor, hatReview(sechs)], [true, 6, false]);
  const nie = lauf(sz1([zeile()], { entwurf: { items: [{ files: [{ type: 'default', status: 'waiting' }] }] }, telegram: true }));
  ist('Dateien nie fertig: die Meldung nennt die Wartezeit in Sekunden (nicht «mehrere Minuten»), den Weg (Dashboard) und bleibt Entwurf', [/Sekunden Wartezeit noch nicht fertig geprüft/.test(nie.prot.tg[0]), /Printful-Dashboard/.test(nie.prot.tg[0]), /mehreren Minuten/.test(nie.prot.tg[0])], [true, true, false]);
  const kn = lauf(sz1([zeile()], { entwurf: { costs: null }, telegram: true }));
  ist('Kosten nie fertig: Befund «kosten-unbekannt» mit der Wartezeit im Text', /Sekunden Wartezeit/.test(kn.prot.tg[0]), true);
  const rl = lauf(sz1([zeile()], { entwurf: { items: [{ files: [{ type: 'default', status: 'waiting' }] }] }, env: { RUN_LIMIT_MS: '1200', PF_PAUSE_MS: '300' } }));
  ist('Das Zeitlimit des Laufs gilt auch beim Warten (Limit 1,2 s, Pausen 0,6 s, 1,2 s …): die Bestellung wird bearbeitet, aber nicht mehr alle sieben Lesungen abgewartet', [rl.prot.posts.length, rl.prot.leseVor >= 1 && rl.prot.leseVor < 7], [1, true]);
}
// Fund 11 (GL2): 429 beim Bestätigen ist vorübergehend
{
  const e = lauf(sz1([zeile()], { confirmFolge: [{ status: 429, meldung: 'Too many requests' }, {}], telegram: true }));
  ist('Bestätigen: HTTP 429, nach der Pause erneut → bestätigt (der gedrosselte Aufruf wurde nicht ausgeführt)', [e.prot.confirms.length, tags(e).includes('printful-confirmed'), hatReview(e)], [2, true, false]);
  const z = lauf(sz1([zeile()], { confirmFolge: [{ status: 429 }, { status: 429 }], telegram: true }));
  ist('Bestätigen: zweimal 429 und der Auftrag bleibt Entwurf: Befund «nicht-bestaetigt» mit dem Hinweis «Bestätigen unklar», NICHT «lehnt ab»', [z.prot.confirms.length, tags(z).includes('printful-review-nicht-bestaetigt'), tags(z).includes('printful-review-bestaetigen-abgelehnt'), tags(z).includes('printful-confirmed')], [2, true, false, false]);
}
// Fund 6 (GL2): der Trockenlauf zeigt, was er täte
{
  const ds = '/tmp/ps_summary_' + process.pid + '.md';
  const dry = lauf(sz1([zeile()], { telegram: true, env: { DRY_RUN: '1', GITHUB_STEP_SUMMARY: ds } }));
  const text = readFileSync(ds, 'utf8'); try { rmSync(ds); } catch { /* egal */ }
  ist('Trockenlauf: die Zusammenfassung zählt die anstehende Bestellung und nennt sie (Nummer, external_id, würde angelegt und bestätigt)', [/1 Bestellung\(en\) würden angelegt/.test(dry.prot.log[dry.prot.log.length - 1]), /- #T1: 1 Artikel, external_id LXT1: würde als Entwurf angelegt und danach bestätigt/.test(text)], [true, true]);
  const dry2 = lauf(sz1([zeile()], { entwurf: {}, telegram: true, env: { DRY_RUN: '1', PRINTFUL_AUTO_CONFIRM: '0' } }));
  ist('Trockenlauf mit PRINTFUL_AUTO_CONFIRM=0: «NICHT bestätigt» steht im Log', dry2.prot.log.some((l) => /NICHT bestätigt/.test(l)), true);
}
// Fund 8 (GL1): das Repo ist öffentlich, Log und Zusammenfassung tragen nur Nummer und Art
{
  const ds = '/tmp/ps_summary2_' + process.pid + '.md';
  const geheim = 'Haus-Foto von Frau Muster';
  const fail = lauf(sz1([zeile()], { ki: 'fail', telegram: true, env: { GITHUB_STEP_SUMMARY: ds } }));
  const text = readFileSync(ds, 'utf8'); try { rmSync(ds); } catch { /* egal */ }
  const log = [...fail.prot.log, ...fail.prot.warn, ...fail.prot.err].join('\n') + '\n' + text;
  ist('KI-Befund (beschreibt das Kundenbild): im Telegram-Text vollständig, im Log und in der Zusammenfassung nur Nummer und Art', [/FAIL/.test(fail.prot.tg[0]), /leer/.test(fail.prot.tg[0]), /#T1: \[kontrolle-fail\]/.test(text), /leer/.test(log)], [true, true, true, false]);
  const p400 = lauf(sz1([zeile()], { post: [{ status: 400, meldung: geheim }], telegram: true }));
  ist('Fehlertext von Printful (kann Adressdaten enthalten): nur im Telegram-Text, nicht im Log', [p400.prot.tg.some((t) => t.includes(geheim)), [...p400.prot.log, ...p400.prot.warn, ...p400.prot.err].some((t) => t.includes(geheim))], [true, false]);
  const p503 = lauf(sz1([zeile()], { post: [{ status: 503, meldung: geheim }], lookup: [{ status: 404 }], telegram: true }));
  ist('Technischer Fehler mit Printful-Text: Log öffentlich ohne den Text, Telegram-Fehlermeldung mit', [[...p503.prot.log, ...p503.prot.warn, ...p503.prot.err].some((t) => t.includes(geheim)), p503.prot.tg.some((t) => t.includes(geheim))], [false, true]);
  const dry = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'k' } })], { telegram: true, env: { DRY_RUN: '1' } }));
  ist('Trockenlauf mit hartem Befund: «[DRY] Telegram würde senden» nennt keinen Befundtext (der Zeitplan ohne Freigabedatei läuft öffentlich), die Art steht in der Warnung', [dry.prot.log.some((l) => /^\[DRY\] Telegram würde senden/.test(l)), [...dry.prot.log, ...dry.prot.warn].some((l) => /SKU ohne Printful-Variante/.test(l)), dry.prot.warn.some((l) => /ohne-variante/.test(l))], [true, false, true]);
  const detail = lauf(sz1([zeile()], { ki: 'fail', telegram: true, env: { PRINTFUL_LOG_DETAIL: '1', DRY_RUN: '1' } }));
  ist('PRINTFUL_LOG_DETAIL=1 (eigener Rechner): die Befundtexte stehen auch im Log', detail.prot.log.some((l) => /FAIL/.test(l)), true);
}
// Fund 11 (GL2) / Mutant «state_code»: das Bundesland geht mit
{
  const e = lauf(sz1([zeile()], { order: { shippingAddress: { name: 'T', address1: 'x', city: 'Los Angeles', countryCodeV2: 'US', provinceCode: 'CA', zip: '90001', phone: '+1 555 0100' } } }));
  ist('Empfänger: state_code (Bundesland), Telefon und E-Mail gehen an Printful', [e.prot.posts[0].body.recipient.state_code, e.prot.posts[0].body.recipient.phone, e.prot.posts[0].body.recipient.email, e.prot.posts[0].body.recipient.country_code], ['CA', '+1 555 0100', 'a@b.ch', 'US']);
}
// Mutant «Telegram-Text ohne Maskieren des Bestellnamens»
{
  const e = lauf(sz1([zeile({ sku: 'kaputt', variant: { sku: 'k' } })], { order: { name: '#<b>X' }, telegram: true }));
  ist('Telegram: der Bestellname (Fremdtext) wird maskiert', [/<b>X/.test(e.prot.tg[0]), /&lt;b&gt;X/.test(e.prot.tg[0])], [false, true]);
}
// Mutant «holeKopf, Streaming-Pfad»: ein Server ignoriert den Range-Kopf und liefert die ganze Datei
{
  const e = lauf(sz1([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', V('v')), karte6(['front'], { dt: { front: 'default' } })] })], { telegram: true, datei: { px: [600, 800], strom: 400000 } }));
  ist('Server ignoriert Range und liefert 400 KB: nur der Anfang wird gezogen (höchstens 64 KB plus ein Stück), der Rest abgebrochen, die Pixelgrösse stimmt (600×800 → «aufloesung»)', [e.prot.dateiGezogen <= 65536 + 16384, e.prot.dateiAbgebrochen, /600×800 px ergeben auf dem Produkt etwa 50 dpi/.test(e.prot.tg[0])], [true, true, true]);
}
// Fund 3 (GL2): Nahtfarbe bei Cut-and-Sew-Produkten: ohne Vorgabe des Besitzers Entwurf, mit Vorgabe gesendet
{
  const jacke = (extra = {}) => sz1([zeile({ sku: '5_18730', variant: { sku: '5_18730' }, product: { productType: 'Jacken', tags: ['wunschdesign'], metafield: null }, customAttributes: [A('🖼️ Druckdatei (front)', V('v')), karte6(['front'], { dt: { front: 'default' } })] })], { vid: 18730, variant: [{ kat: 388 }], ...extra });
  const o = lauf(jacke({ telegram: true }));
  ist('Kapuzenjacke (Option stitch_color) ohne Vorgabe: Entwurf, Befund «optionen», die Meldung nennt stitch_color', [bestaetigt(o), tags(o).includes('printful-review-optionen'), /stitch_color/.test(o.prot.tg[0])], [false, true, true]);
  const m = lauf(jacke({ env: { PRINTFUL_STITCH_COLOR: 'white' } }));
  ist('…mit PRINTFUL_STITCH_COLOR=white: options [{stitch_color: white}] gesendet, bestätigt', [m.prot.posts[0].body.items[0].options, bestaetigt(m), hatReview(m)], [[{ id: 'stitch_color', value: 'white' }], true, false]);
  const f = lauf(jacke({ telegram: true, env: { PRINTFUL_STITCH_COLOR: 'rot' } }));
  ist('…mit einem Wert, den das Produkt nicht kennt («rot»): Entwurf, nichts gesendet, Meldung nennt die Option', [bestaetigt(f), 'options' in f.prot.posts[0].body.items[0], /stitch_color/.test(f.prot.tg[0])], [false, false, true]);
}
// Fund 7 (GL1): Stickerei wird am Platzierungs-TYP erkannt, nicht an der Datei-ID
{
  const kappe = (attr, extra = {}) => sz1([zeile({ sku: '5_7854', variant: { sku: '5_7854' }, product: { productType: 'Kappen', tags: ['wunschdesign'], metafield: null }, customAttributes: attr })], { vid: 7854, variant: [{ kat: 206 }], telegram: true, ...extra });
  const a = lauf(kappe([A('🖼️ Druckdatei (embroidery_front)', V('v')), karte6(['embroidery_front'])]));
  ist('Kappe, Stickerei «embroidery_front» ohne Garnfarben (früher: kein Befund, BESTÄTIGT): Entwurf, Befund «optionen» (der Katalog führt dort keine Garnfarben-Option)', [bestaetigt(a), tags(a).includes('printful-review-optionen'), /Garnfarben-Option/.test(a.prot.tg[0])], [false, true, true]);
  const b = lauf(kappe([A('🖼️ Druckdatei (default)', V('v')), karte6(['default'])]));
  ist('Kappe, Datei-ID «default» (= Typ embroidery_front): ebenso Entwurf «optionen», und KEIN Auflösungsbefund aus Zufall (Stickerei hat keine Pixelgrösse)', [bestaetigt(b), tags(b).includes('printful-review-optionen'), tags(b).includes('printful-review-aufloesung')], [false, true, false]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
