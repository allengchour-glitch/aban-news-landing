// Verhaltenstest für den Bestellweg automation/printful_sync.mjs (Version 2, «Bestellweg härten»).
// Der Bestellweg läuft in einem KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein Printful, kein Telegram, keine KI): Shopify liefert Bestellungen (auch seitenweise),
// Printful antwortet je Szenario (echte Mitschnitte der Platzierung aus dropship/pod-auswahl/platzierung_mitschnitte.json, echter Katalogauszug mit Optionen, Druckdateien und
// Konflikten aus dropship/pod-auswahl/bestellweg_katalog_auszug.json; Fehler 503, 429, 404, Netzfehler, Zahlung gescheitert). Geprüft wird, was an Printful
// GESENDET wird (Entwurf anlegen, bestätigen, external_id, files[].type, options), welche Tags die Bestellung bekommt, was an Telegram geht und der Exit-Code.
// Warum so: vorher prüfte ein Test nur per Regex den Quelltext; fünf von fünf Mutanten an der Platzierung überlebten. Lauf: /opt/node22/bin/node automation/printful_sync_test.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { anlegenTag } from './lib/printful_bestellweg.mjs';

const SELF = fileURLToPath(import.meta.url);
const lade = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const MIT = lade('../dropship/pod-auswahl/platzierung_mitschnitte.json').mitschnitte;
// Der alte Auszug (05.11.) hat das Feld additional_price aus den Dateilisten weggekürzt; der ECHTE Katalog liefert es an jeder Datei (der Auszug bestellweg_katalog_auszug.json und die Antwort der Canary-Tasse belegen es, null = im Grundpreis).
// Seit dem 10.11.2026 gilt ein FEHLENDES Feld als «Preis unbekannt» (nie als gratis); hier wird es für die älteren Szenarien so ergänzt, wie der echte Katalog es liefert.
for (const x of Object.values(MIT)) for (const f of (x.produkt.files || [])) if (!Object.prototype.hasOwnProperty.call(f, 'additional_price')) f.additional_price = null;
const KAT = lade('../dropship/pod-auswahl/bestellweg_katalog_auszug.json').produkte;

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.PS_SZENARIO);
  // Alle Platzierungen der Test-Kataloge gelten als bezahlt (die älteren Szenarien prüfen Platzierung, Dateien und Bestätigen, nicht den Preis); die Szenarien zum Aufpreis löschen die Variable (envLoeschen).
  const ALLE_PLATZIERUNGEN = [...new Set([...Object.values(KAT), ...Object.values(MIT)].flatMap((x) => (x.produkt.files || []).flatMap((f) => [f.id, f.type])).filter((x) => /^[a-z0-9_]+$/.test(x)))].join(',');
  // Seit der Härtung vom 10.11.2026 bestätigt der Sync nur mit gesetzter Kostenobergrenze UND eingeschalteter KI-Kontrolle: der Rahmen setzt beides (Obergrenze 500 USD, KI «pflicht» mit Schlüssel; die Attrappe antwortet PASS),
  // damit die älteren Szenarien weiter «bestätigt» prüfen. Geschrieben wird nur bei DRY_RUN=0 (der Rahmen setzt es; `envLoeschen: ['DRY_RUN']` prüft die Vorgabe).
  Object.assign(process.env, { PRINTFUL_PAKET_BEZAHLT: ALLE_PLATZIERUNGEN, PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', PRINTFUL_AUTO_CONFIRM: '1', PF_PLATZIERUNG_PAUSE_MS: '0', PF_PAUSE_MS: '0', PRINTFUL_KI_KONTROLLE: 'pflicht', GEMINI_API_KEY: 'g', PRINTFUL_MAX_KOSTEN_USD: '500', DRY_RUN: '0' });
  for (const k of ['PRINTFUL_STORE_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'GITHUB_STEP_SUMMARY', 'MAX', 'RUN_LIMIT_MS', 'PRINTFUL_MIN_NETTO_CHF', 'PRINTFUL_DATEI_HOSTS']) delete process.env[k];
  if (sz.telegram) Object.assign(process.env, { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' });
  const kiArt = sz.ki || 'pass';                                              // Antwort der KI-Attrappe; 'aus' schaltet die Kontrolle ab, 'ohne-schluessel' lässt den Schlüssel weg
  if (kiArt === 'aus') { process.env.PRINTFUL_KI_KONTROLLE = 'aus'; delete process.env.GEMINI_API_KEY; }
  if (kiArt === 'ohne-schluessel') delete process.env.GEMINI_API_KEY;
  for (const k of sz.envLoeschen || []) delete process.env[k];       // Standardwerte prüfen: die Variable gar nicht setzen (nicht leer); `env` setzt danach
  Object.assign(process.env, sz.env || {});
  const prot = { api: [], pf: [], posts: [], confirms: [], tags: [], mf: [], tg: [], log: [], warn: [], err: [], shop: [], dateien: [], gemini: [], variantGets: [], variantSignale: [], postSignale: [], exitCode: null, lookups: 0, leseVor: 0, leseNach: 0, dateiGezogen: 0, dateiAbgebrochen: false, shopOps: [], shopQuery: '', kiDateien: [], frisch: [], frischQuery: '', scopeAbfragen: 0, tagOps: 0, dateiRedirect: [], folge: [], anspruch: [], anspruchQuery: '' };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  const st = { bestaetigt: false, ext: null, nr: 0, tagsJeBestellung: {} };   // tagsJeBestellung: was der Sync per tagsAdd gesetzt hat (das zweite Lesen nach dem Setzen der Markierung zeigt es)
  const mk = (status, body, x = {}) => ({ ok: status >= 200 && status < 300, status, body: null, headers: { get: (k) => { const l = String(k).toLowerCase(); return x.header && x.header[l] !== undefined ? x.header[l] : (sz.retryAfter && l === 'retry-after' ? String(sz.retryAfter) : null); } },
    json: async () => { if (x.roh !== undefined) throw new Error('kein JSON'); return body; }, arrayBuffer: async () => (x.bytes ? x.bytes.buffer.slice(x.bytes.byteOffset, x.bytes.byteOffset + x.bytes.byteLength) : new ArrayBuffer(0)) });
  const png = (w, h) => { const b = Buffer.alloc(64); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const folge = (liste, n) => (Array.isArray(liste) && liste.length ? liste[Math.min(n, liste.length - 1)] : {});
  // Der Entwurf, den die Attrappe zurückgibt, ist das GESENDETE (Artikel, Varianten, Mengen, Dateitypen aus dem POST), mit einer Vorschau-Datei dazu; `dateiStatus` ('failed', {status, warning}) und `dateiStatusFolge` setzen den Dateistatus,
  // `entwurf` überschreibt Felder (Kosten, items), `entwurfFolge` je Lesung.
  const dateiSt = (i) => { const x = sz.dateiStatusFolge ? folge(sz.dateiStatusFolge, i) : sz.dateiStatus; return typeof x === 'string' ? { status: x } : (x || { status: 'ok' }); };
  const gesendeteItems = (i) => { const post = prot.posts.length ? prot.posts[prot.posts.length - 1].body : null; if (!post) return [{ files: [{ type: 'default', status: 'ok' }, { type: 'preview', status: 'ok' }] }]; return post.items.map((it) => ({ variant_id: it.variant_id, quantity: it.quantity, files: [...it.files.map((f) => ({ type: f.type, ...dateiSt(i), width: 1024, height: 1024 })), { type: 'preview', status: 'ok' }] })); };
  const draftOrder = (i = 0) => ({ id: 42, external_id: st.ext, status: 'draft', error: null, costs: { currency: 'USD', subtotal: '7.75', discount: '0.00', shipping: '4.00', tax: '0.95', vat: '0.00', total: '12.70' }, items: gesendeteItems(i), ...(sz.entwurf || {}), ...folge(sz.entwurfFolge, i) });
  const nachOrder = (i = 0) => ({ ...draftOrder(0), status: 'pending', ...(sz.nachConfirm || {}), ...folge(sz.nachFolge, i) });
  // Katalog des Szenarios: echte Auszüge (Tasse, T-Shirt, Kappe, Poster, Jacke, Strick, Hülle), sonst synthetisch aus der Dateiliste des Mitschnitts
  const druck = (pid) => {
    if (sz.druckEigen && sz.druckEigen[pid]) return sz.druckEigen[pid];            // echter Auszug eines Produkts, das der Katalogauszug nicht führt (WP6: Tasse 403)
    if (KAT[pid]) return KAT[pid];
    const m = MIT[pid]; if (!m) return null;
    const ids = m.produkt.files.filter((f) => f.type !== 'mockup').flatMap((f) => [f.id, f.type]);
    const pl = Object.fromEntries(ids.map((i) => [i, 1]));
    return { printfiles: { printfiles: [{ printfile_id: 1, width: 3000, height: 3000, dpi: 150, fill_mode: 'fit' }], variant_printfiles: [{ variant_id: sz.vid, placements: pl }] }, templates: { min_dpi: 75, conflicting_placements: [] } };
  };
  // Wie Shopify: die Antwort enthält nur die Felder, die die Abfrage NENNT. Ein Feld, das der Kleber liest, aber nicht abfragt, fehlt dem Kleber hier genauso wie im Betrieb (früher lieferte die Attrappe alles, und das Streichen eines Feldes aus der Abfrage blieb unbemerkt).
  const parseAuswahl = (q) => {
    let i = q.indexOf('{');
    const ws = () => { while (i < q.length && /[\s,]/.test(q[i])) i++; };
    const lies = () => {
      i++; const kinder = {};
      for (;;) {
        ws();
        if (i >= q.length) throw new Error('Abfrage nicht lesbar');
        if (q[i] === '}') { i++; return kinder; }
        if (q.startsWith('...', i)) { i += 3; ws(); const on = /^on\s+[A-Za-z_]\w*/.exec(q.slice(i)); if (on) i += on[0].length; ws(); Object.assign(kinder, lies()); continue; }
        const m = /^[A-Za-z_]\w*/.exec(q.slice(i)); if (!m) throw new Error('Feldname erwartet bei ' + q.slice(i, i + 20));
        const name = m[0]; i += name.length; ws();
        if (q[i] === '(') { let d = 0; do { if (q[i] === '"') { i++; while (q[i] !== '"') i++; } else if (q[i] === '(') d++; else if (q[i] === ')') d--; i++; } while (d > 0); ws(); }
        kinder[name] = q[i] === '{' ? lies() : null;
      }
    };
    return lies();
  };
  const projiziere = (w, baum) => {
    if (baum === null) return w;
    if (Array.isArray(w)) return w.map((x) => projiziere(x, baum));
    if (w === null || typeof w !== 'object') return w;
    const aus = {}; for (const k of Object.keys(baum)) if (k in w) aus[k] = projiziere(w[k], baum[k]); return aus;
  };
  const alleBestellungen = () => [...(sz.orders || []), ...(sz.shopSeiten || []).flatMap((s) => s.orders || [])];
  const knotenZu = (n) => (n.lineItems && n.lineItems.edges || []).map((e) => e && e.node).filter(Boolean);
  const istPodZeile = (z) => ((z.product && z.product.tags) || []).some((t) => ['wunschdesign', 'printful_personalized_product'].includes(String(t).toLowerCase()));
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
        return mk(200, projiziere({ data: { orders: { pageInfo: { hasNextPage: !!weiter, endCursor: 'c' + (i + 1) }, edges: s.orders.map((node) => ({ node })) } } }, { data: parseAuswahl(q) }));
      }
      if (q.includes('node(id') && !q.includes('displayFinancialStatus')) {   // Anspruch nachlesen: nur die Tags (Markierung vor dem Anlegen; wer hat zuerst markiert?)
        prot.anspruchQuery = q; const nr = prot.anspruch.length; prot.anspruch.push(b.variables.id);
        if (sz.anspruchFehler === 'http') return mk(500, {});
        if (sz.anspruchFehler === 'null') return mk(200, { data: { node: null } });
        const basis = alleBestellungen().find((x) => x.id === b.variables.id);
        if (!basis) return mk(200, { data: { node: null } });
        const eigene = st.tagsJeBestellung[b.variables.id] || [];
        // Rivalen: `frueher` = ein anderer Lauf hat 5 s VOR uns markiert (kleinere Zeichenkette), `spaeter` = 5 s danach, `alt` = vor 70 Minuten (nicht mehr aktiv)
        const rivalen = { frueher: [anlegenTag(Date.now() - 5000, 'aaaaaaaa')], spaeter: [anlegenTag(Date.now() + 5000, 'ffffffff')], alt: [anlegenTag(Date.now() - 70 * 60000, 'aaaaaaaa')], beide: [anlegenTag(Date.now() + 5000, 'ffffffff'), anlegenTag(Date.now() - 5000, 'aaaaaaaa')] }[sz.rivale] || [];
        const tags = sz.anspruchOhneEigene ? [...(basis.tags || []), ...rivalen] : [...(basis.tags || []), ...eigene, ...rivalen];
        return mk(200, projiziere({ data: { node: { id: basis.id, tags, ...folge(sz.anspruchFolge, nr) } } }, { data: parseAuswahl(q) }));
      }
      if (q.includes('node(id')) {                       // frisches Lesen einer Bestellung (vor dem Anlegen, vor dem Bestätigen)
        prot.frischQuery = q; const nr = prot.frisch.length; prot.frisch.push(b.variables.id);
        if (sz.frischFehler && nr >= (sz.frischFehlerAb || 0)) {                       // `frischFehlerAb`: ab der n-ten frischen Lesung (0 = ab der ersten)
          if (sz.frischFehler === 'http') return mk(500, {});
          if (sz.frischFehler === 'null') return mk(200, { data: { node: null } });
        }
        const basis = alleBestellungen().find((x) => x.id === b.variables.id);
        if (!basis) return mk(200, { data: { node: null } });
        const knoten = { ...basis, ...folge(sz.frischFolge, nr) };
        for (const k of Object.keys(knoten)) if (knoten[k] === '__WEG__') delete knoten[k];   // «__WEG__» in frischFolge: das Feld fehlt in der Antwort ganz (JSON kennt kein undefined)
        return mk(200, projiziere({ data: { node: knoten } }, { data: parseAuswahl(q) }));
      }
      if (q.includes('currentAppInstallation')) {         // Zugriffsrechte des Tokens
        prot.scopeAbfragen++;
        if (sz.scopesFehler) return mk(200, { errors: [{ message: 'Access denied' }] });
        const handles = sz.scopes || ['read_orders', 'write_orders', 'read_merchant_managed_fulfillment_orders', 'read_third_party_fulfillment_orders'];
        return mk(200, { data: { currentAppInstallation: { accessScopes: handles.map((handle) => ({ handle })) } } });
      }
      if (q.includes('shop {')) return mk(200, { data: { shop: { name: 'x' } } });
      if (q.includes('tagsAdd')) {
        prot.shopOps.push('tagsAdd');
        const n = prot.tagOps++;                           // alle Aufrufe zählen, auch gescheiterte; `tagFehlerAb` = ab dem n-ten Aufruf scheitert es (0 = ab dem ersten)
        if (sz.tagFehler && n >= (sz.tagFehlerAb || 0)) {
          if (sz.tagFehler === 'http') return mk(500, {});
          if (sz.tagFehler === 'userErrors') return mk(200, { data: { tagsAdd: { userErrors: [{ message: 'kaputt' }] } } });
          if (sz.tagFehler === 'graphql') return mk(200, { errors: [{ message: 'Access denied' }] });
        }
        prot.tags.push({ id: b.variables.id, tags: b.variables.tags }); prot.folge.push('tags:' + b.variables.tags.join('+'));
        st.tagsJeBestellung[b.variables.id] = [...(st.tagsJeBestellung[b.variables.id] || []), ...b.variables.tags];
        return mk(200, { data: { tagsAdd: { userErrors: [] } } });
      }
      if (q.includes('metafieldsSet')) { prot.shopOps.push('metafieldsSet'); prot.mf.push(b.variables.mf[0]); return mk(200, { data: { metafieldsSet: { userErrors: sz.mfFehler ? [{ message: 'x' }] : [] } } }); }
      return mk(200, { data: {} });
    }
    if (url.startsWith('https://api.telegram.org')) { prot.tg.push(JSON.parse(o.body).text); return sz.tgFehler ? mk(500, {}) : mk(200, { ok: true }); }
    if (url.includes('generativelanguage.googleapis.com')) {
      prot.gemini.push({ url, schluesselImKopf: !!(o.headers && o.headers['x-goog-api-key']), schluesselInUrl: /key=/.test(url) });
      if (kiArt === 'wirft') throw new Error('ETIMEDOUT');
      if (kiArt === 'http402') return mk(402, { error: { message: 'prepayment credits are depleted' } });
      const t = { pass: 'PASS - sieht gut aus', fail: 'FAIL - <b>leer</b>', unklar: 'Das Bild zeigt eine Tasse.', leer: '' }[kiArt];
      return mk(200, { candidates: [{ content: { parts: [{ text: t }] } }] });
    }
    if (/res\.cloudinary\.com|cdn\.shopify\.com|bilder\.luxestyle\.ch|evil\.example/.test(url)) {
      const range = !!(o.headers && o.headers.Range);
      if (range) prot.dateien.push({ url, range, redirect: o.redirect }); else prot.kiDateien.push({ url, redirect: o.redirect });   // der Kopf-Abruf trägt immer «Range»; Abrufe ohne ihn gehören der KI-Kontrolle
      const spez = (sz.dateiPro || []).find((x) => url.includes(x.match)) || sz.datei || {};
      if (spez.wirft) throw new Error('ECONNRESET');
      // Weiterleitung nur für den Kopf-Abruf (Range); `weiterleitungImmer` leitet jedes Mal weiter (Schleife), sonst nur beim ersten Abruf dieser Adresse
      if (spez.weiterleitung && range && (spez.weiterleitungImmer || !prot.dateiRedirect.includes(url))) { prot.dateiRedirect.push(url); return mk(302, {}, { header: { location: spez.weiterleitung } }); }
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
        const l0 = folge(sz.lookup, prot.lookups - 1);
        // Nach dem Anlegen kennt die Attrappe NUR die gepostete external_id: wer nach einer anderen fragt, bekommt 404 (ein Auftrag mit fremder Kennung existiert nicht)
        const l = l0.status === 200 && st.ext && decodeURIComponent(r[1]) !== st.ext ? { status: 404 } : l0;
        if (l.wirft) throw new Error(l.wirft);
        if (l.status === 200) {
          const b1 = alleBestellungen()[0] || {}, a = b1.shippingAddress || {};
          const menge = knotenZu(b1).filter(istPodZeile).reduce((x, z) => x + (Number.isInteger(z.currentQuantity) ? z.currentQuantity : (z.quantity || 1)), 0);
          return mk(200, { result: { id: 777, external_id: decodeURIComponent(r[1]), status: 'draft', recipient: { name: a.name || [a.firstName, a.lastName].filter(Boolean).join(' '), zip: a.zip, country_code: a.countryCodeV2 }, items: [{ quantity: menge || 1 }], ...(l.order || {}) } });
        }
        return mk(l.status || 404, { error: { message: 'Not Found' } });
      }
      if (m === 'POST' && p === '/orders') {
        prot.postSignale.push(!!o.signal);
        const body = JSON.parse(o.body); prot.posts.push({ p, body }); st.ext = body.external_id; prot.folge.push('POST');
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
        if (st.bestaetigt && sz.lesenNachStatus) return mk(sz.lesenNachStatus, {});   // nur die Lesungen NACH dem Bestätigen scheitern
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
let ok = 0, fehl = 0, letzter = null;
// PS_DEBUG=1 zeigt bei einem Fehlschlag zusätzlich das Protokoll des zuletzt gefahrenen Szenarios (Log, Warnungen, Fehler, Telegram, Tags): Fehlersuche, nicht Teil der Prüfung
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 700)}\n   soll: ${JSON.stringify(b).slice(0, 700)}`); if (process.env.PS_DEBUG && letzter) console.log('   [letztes Szenario]', JSON.stringify({ log: letzter.prot.log, warn: letzter.prot.warn, err: letzter.prot.err, tg: letzter.prot.tg, tags: letzter.prot.tags, posts: letzter.prot.posts.length, confirms: letzter.prot.confirms.length }).slice(0, 1800)); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const lauf = (sz, env = {}) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PS_SZENARIO: JSON.stringify(sz), ...env }, encoding: 'utf8', timeout: 90000 });
  const m = String(r.stdout).match(/PS_ERGEBNIS (.*)\n/);
  if (!m) throw new Error('Kindprozess ohne Ergebnis (Exit ' + r.status + '): ' + String(r.stderr).slice(0, 600) + String(r.stdout).slice(-300));
  return (letzter = { status: r.status, prot: JSON.parse(m[1]), stderr: r.stderr, stdout: r.stdout });
};
const antwort = (pid) => ({ status: 200, body: { result: { variant: { id: MIT[pid].variante }, product: MIT[pid].produkt } } });
const V = (s) => 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/' + s + '.png';
const A = (key, value) => ({ key, value });
const karte6 = (pl, extra = {}) => A('_pod_karte', JSON.stringify({ v: 6, s: 1, pl, ...extra }));
/** Bestellung (Shopify-Knoten) mit EINER Editor-Position; v5-Schlüssel «🖼️ Druckdatei (Vorne)» wie im alten Test. */
const zeile = (o = {}) => ({ id: 'gid://shopify/LineItem/9001', quantity: 1, sku: '5599797_4025', title: 'T', discountedTotalSet: { shopMoney: { amount: '49.90', currencyCode: 'CHF' } }, product: { productType: 'T-Shirts', tags: ['wunschdesign'], metafield: null }, variant: { sku: '5599797_4025' }, customAttributes: [A('🖼️ Druckdatei (Vorne)', V('Vorne'))], ...o });
/** Fulfillment-Orders wie die Admin-Abfrage sie liefert: ein Händler-Standort mit allen Positionen (`ort` ändert den Standort, z. B. FO_DIENST = der Dienst-Standort «Printful»). */
const FO_DIENST = { id: 'gid://shopify/Location/2', name: 'Printful', isFulfillmentService: true };
const fos = (zeilen, ort = { id: 'gid://shopify/Location/1', name: 'Shop location', isFulfillmentService: false }) => ({ pageInfo: { hasNextPage: false }, edges: [{ node: { id: 'gid://shopify/FulfillmentOrder/1', status: 'OPEN', assignedLocation: { location: ort }, lineItems: { pageInfo: { hasNextPage: false }, edges: zeilen.map((z) => ({ node: { lineItem: { id: z.id } } })) } } }] });
// Der Shopify-Knoten einer bezahlten Bestellung, wie die Abfrage ihn liefert (test false, bezahlt, nicht storniert). Ein Szenario ändert einzelne Felder über `order: {…}`.
const knoten = (zeilen, o = {}) => ({ id: 'gid://shopify/Order/1', name: '#T1', email: 'a@b.ch', tags: [], cancelledAt: null, test: false, displayFinancialStatus: 'PAID', shippingAddress: { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' }, lineItems: { pageInfo: { hasNextPage: false }, edges: zeilen.map((node) => ({ node })) }, fulfillmentOrders: fos(zeilen), ...o });
const einfach = (pt, sku, seiten, extra = {}) => ({ pt, sku, seiten, ...extra });
/** Szenario aus dem alten Muster {pt, sku, seiten, variant}: eine Bestellung, v5-Eigenschaften «Druckdatei (<Seite>)» */
const alt = (s) => ({ vid: Number(s.sku.split('_').pop()), orders: [knoten([zeile({ sku: s.sku, variant: { sku: s.sku }, product: { productType: s.pt, tags: ['wunschdesign'], metafield: null }, customAttributes: s.seiten.map((x) => A('🖼️ Druckdatei (' + x + ')', V(x))) })])], ...s });
const sz1 = (zeilen, extra = {}) => ({ vid: 4025, orders: [knoten(zeilen, extra.order || {})], variant: [{ kat: 71 }], ...extra });
const typenDerPosts = (e) => e.prot.posts.map((p) => p.body.items.map((i) => i.files.map((f) => f.type)));
// Die Markierung «printful-anlegen-<Zeit>» vor dem POST trägt die Uhrzeit des Laufs: die Tag-Listen der Tests zeigen sie nicht (eigene Prüfungen: `markenTags`).
const tags = (e) => e.prot.tags.flatMap((t) => t.tags).filter((t) => !/^printful-anlegen-/.test(t));
const markenTags = (e) => e.prot.tags.flatMap((t) => t.tags).filter((t) => /^printful-anlegen-/.test(t));
/** Tag einer früheren Markierung, `minVor` Minuten alt */
const markeVor = (minVor) => anlegenTag(Date.now() - minVor * 60000);
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
  ist('Die Markierung «printful-anlegen-<Zeit>» wird VOR dem POST gesetzt (erste Tag-Mutation), danach Tag printful-synced (vor dem Bestätigen), Metafeld printful.order_id = 42',
    [e.prot.tags[0].tags.map((t) => t.replace(/\d{8}t\d{4}-\d{5}-[a-z0-9]{8}$/, '<zeit>')), e.prot.tags[1].tags, e.prot.mf.map((m) => [m.namespace, m.key, m.value])], [['printful-anlegen-<zeit>'], ['printful-synced'], [['printful', 'order_id', '42']]]);
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
  const meta = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9000001_8948', variant: { sku: '9000001_8948' } })], { vid: 8948, variant: [antwort(268)] }));
  ist('FERTIG-Produkt (Tag printful_personalized_product, KEIN wunschdesign) mit Metafeld custom.print_file (beliebiger https-Host): Datei gilt als Vorderseite, bestätigt', [meta.prot.posts[0].body.items[0].files, bestaetigt(meta)], [[{ type: 'default', url: 'https://bilder.luxestyle.ch/motiv.png' }], true]);
  // Fund 22 (Gegenprüfung P1): ein EDITOR-Produkt (wunschdesign) druckt nie das Muster des Besitzers aus dem Metafeld
  const metaEd = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['wunschdesign', 'printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } }, sku: '9000001_8948', variant: { sku: '9000001_8948' } })], { vid: 8948, variant: [antwort(268)], telegram: true }));
  ist('EDITOR-Produkt (wunschdesign) ohne Design der Kundin, aber mit Metafeld custom.print_file: KEIN Auftrag (das Muster des Besitzers wird nie gedruckt), Befund «keine-druckdatei», eine 🔴-Meldung', [metaEd.prot.posts.length, metaEd.prot.confirms.length, tags(metaEd).includes('printful-review-keine-druckdatei'), tgAnzahl(metaEd), metaEd.prot.dateien.length], [0, 0, true, 1, 0]);
  const metaPort = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'Poster', tags: ['printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch:8443/motiv.png' } }, sku: '9000001_8948', variant: { sku: '9000001_8948' } })], { vid: 8948, variant: [antwort(268)], telegram: true }));
  ist('Fertig-Produkt, dessen Metafeld einen Port nennt: die Datei wird nicht übernommen (kein Auftrag), nichts abgerufen', [metaPort.prot.posts.length, metaPort.prot.dateien.length], [0, 0]);
}

// ═════════════════════════════════════════════════════════════ NEU: KI-Kontrolle gibt bei Fehler NICHT mehr frei
{
  const pass = lauf(sz1([zeile()], { ki: 'pass' }));
  ist('KI sagt PASS: bestätigt; Schlüssel im Kopf, NICHT in der Adresse; die kleine Cloudinary-Kopie (c_limit,w_1400) wird geprüft, Weiterleitungen werden nicht blind verfolgt (redirect manual)', [bestaetigt(pass), pass.prot.gemini[0].schluesselImKopf, pass.prot.gemini[0].schluesselInUrl, pass.prot.kiDateien.some((d) => /c_limit,w_1400/.test(d.url)), pass.prot.kiDateien.every((d) => d.redirect === 'manual')], [true, true, false, true, true]);
  const fail = lauf(sz1([zeile()], { ki: 'fail', telegram: true }));
  ist('KI sagt FAIL: Entwurf, Review-Tag «kontrolle-fail», Meldung nennt den Grund und MASKIERT das HTML aus der KI-Antwort', [bestaetigt(fail), tags(fail).includes('printful-review-kontrolle-fail'), /FAIL - &lt;b&gt;leer&lt;\/b&gt;/.test(fail.prot.tg[0])], [false, true, true]);
  for (const [name, ki, art] of [['HTTP 402 (Guthaben leer)', 'http402', 'kontrolle-technisch'], ['Netzfehler/Zeitüberschreitung', 'wirft', 'kontrolle-technisch'], ['Antwort ohne PASS/FAIL', 'unklar', 'kontrolle-technisch'], ['leere Antwort', 'leer', 'kontrolle-technisch'], ['kein GEMINI_API_KEY (Vorgabe «pflicht»)', 'ohne-schluessel', 'kontrolle-fehlt']]) {
    const e = lauf(sz1([zeile()], { ki: ki, telegram: true }));
    ist(`KI: ${name} → Entwurf, Review-Tag «${art}», NICHT bestätigt (früher: PASS, Auftrag bestätigt)`, [bestaetigt(e), tags(e).includes('printful-review-' + art), e.prot.posts.length], [false, true, 1]);
  }
  const g402 = lauf(sz1([zeile()], { ki: 'http402', telegram: true }));
  ist('KI HTTP 402: die Meldung nennt den Grund («KI antwortet HTTP 402» samt Text von Google), nicht nur «unklar»', [/KI antwortet HTTP 402/.test(g402.prot.tg[0]), /prepayment credits are depleted/.test(g402.prot.tg[0])], [true, true]);
  const aus = lauf(sz1([zeile()], { ki: 'aus' }));
  ist('PRINTFUL_KI_KONTROLLE=aus verzichtet ausdrücklich auf die KI: keine KI-Anfrage, der Entwurf entsteht, wird aber NICHT automatisch bestätigt (Härtung 10.11.2026: Bestätigen verlangt die KI-Kontrolle)', [bestaetigt(aus), aus.prot.gemini.length, aus.prot.posts.length, tags(aus).includes('printful-review-manuell')], [false, 0, 1, true]);
  const vor = lauf(sz1([zeile()]));
  ist('Rahmen des Tests: Obergrenze 500 USD, KI «pflicht» mit Schlüssel und PASS-Attrappe: bestätigt (Grundlage der älteren Szenarien)', [bestaetigt(vor), vor.prot.gemini.length], [true, 1]);
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
    const t = lauf(sz1([zeile()], { tagFehler: f, tagFehlerAb: 1 }));      // der erste tagsAdd (Markierung vor dem Anlegen) gelingt, das Tag printful-synced scheitert
    ist(`Markieren scheitert (${name}): Auftrag angelegt, aber NICHT bestätigt, Fehler gemeldet, Exit 1; es bleibt bei EINEM Auftrag`, [t.prot.posts.length, t.prot.confirms.length, t.prot.exitCode, t.prot.err.some((x) => /Metafeld\/Tag nicht gesetzt/.test(x))], [1, 0, 1, true]);
    const v = lauf(sz1([zeile()], { tagFehler: f }));                          // schon die Markierung VOR dem POST scheitert: dann wird gar nichts angelegt
    ist(`Die Markierung vor dem Anlegen scheitert (${name}): KEIN Auftrag bei Printful, Fehler gemeldet, Exit 1`, [v.prot.posts.length, v.prot.confirms.length, v.prot.exitCode, v.prot.err.some((x) => /Markierung vor dem Anlegen nicht gesetzt/.test(x))], [0, 0, 1, true]);
  }
  const mf = lauf(sz1([zeile()], { mfFehler: true }));
  ist('Metafeld scheitert (userErrors): wie ein Tag-Fehler, nicht bestätigt, Exit 1', [mf.prot.confirms.length, mf.prot.exitCode], [0, 1]);
  const zw = lauf(sz1([zeile()], { tagFehler: 'userErrors', tagFehlerAb: 1, lookup: [{ status: 404 }] }));
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
  ist('Reihenfolge der Schreibzugriffe: Markierung vor dem POST (tagsAdd), dann Metafeld printful.order_id VOR dem Tag printful-synced, dann printful-confirmed (Aufruf-Reihenfolge am Shop)', reihe.prot.shopOps, ['tagsAdd', 'metafieldsSet', 'tagsAdd', 'tagsAdd']);
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
  const detail = lauf(sz1([zeile()], { ki: 'aus', datei: { px: [200, 200] }, telegram: true, env: { PRINTFUL_LOG_DETAIL: '1', DRY_RUN: '1' } }));
  ist('PRINTFUL_LOG_DETAIL=1 (eigener Rechner): die Befundtexte stehen auch im Log (hier: Druckdatei zu klein)', detail.prot.log.some((l) => /zu klein/.test(l)), true);
  const ohneDetail = lauf(sz1([zeile()], { ki: 'aus', datei: { px: [200, 200] }, telegram: true, env: { DRY_RUN: '1' } }));
  ist('…ohne PRINTFUL_LOG_DETAIL steht der Befundtext NICHT im öffentlichen Log, nur die Art', [ohneDetail.prot.log.some((l) => /zu klein/.test(l)), ohneDetail.prot.log.some((l) => /aufloesung/.test(l))], [false, true]);
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

// ═════════════════════════════════════════════════════════════ WP6 (06.11.2026): Attrappen-Bestellungen aus den ECHTEN Eigenschaften der Canary-Tasse
// Die Kaufanfrage der Canary-Tasse «Keramik-Tasse mit farbiger Innenseite» (Printful 403, SKU 9100403_17197) wurde am 06.11.2026 im Browser abgefangen (fabrik/lauf-0611/README.md);
// die Printful-Antworten dazu (Variante, Druckdateien, Vorlagen) sind ein Auszug der ECHTEN Antworten desselben Tages. Die Datei der Anfrage misst 2700×1140 px.
// Verlangt wird: alte und neue Schreibweise des Schlüssels ergeben denselben Auftrag ohne Befund (bestätigt), _vorschau wird nie geholt, qd ist nur ein weicher Hinweis, eine Karte,
// die der SKU widerspricht, und eine Bestellung ohne Design legen KEINEN Printful-Auftrag an und lösen nichts bei der Kundin aus (kein Shopify-Schreibzugriff ausser den Tags).
{
  const TASSE = JSON.parse('{"antwort":{"variant":{"id":17197,"product_id":403,"size":"15 oz","color":"Blue"},"product":{"id":403,"type":"MUG","title":"White Ceramic Mug with Color Inside","files":[{"id":"default","type":"default","title":"Print file","additional_price":null,"options":[]},{"id":"preview","type":"mockup","title":"Mockup","additional_price":null,"options":[]}],"options":[{"id":"license_type","title":"License type","type":"multi_select","values":{"CLC":"Collegiate Licensing Company","AFFINITY":"Affinity","BR":"BR","EX":"EX","NCAA":"NCAA","FAN":"Fan","BCOMPLY":"BrandComply","TAG":"Tag","DLH":"DLH","CORE81":"Core81"},"additional_price":null,"additional_price_breakdown":[]}],"techniques":[{"key":"SUBLIMATION","display_name":"Sublimation","is_default":true}]}},"printfiles":{"product_id":403,"available_placements":{"default":"Print file"},"printfiles":[{"printfile_id":43,"width":2700,"height":1050,"dpi":300,"fill_mode":"fit","can_rotate":false},{"printfile_id":44,"width":2700,"height":1140,"dpi":300,"fill_mode":"fit","can_rotate":false}],"variant_printfiles":[{"variant_id":11051,"placements":{"default":43}},{"variant_id":17197,"placements":{"default":44}}]},"templates":{"min_dpi":150,"conflicting_placements":[]}}');
  const DATEI_T = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793976626/xy1jxggytwmgpyvh4m1v.png';
  const VORSCHAU_T = 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793976700/klmnopqrst.jpg';
  const KARTE_T = { v: 6, m: 403, pv: 17197, sv: '68134397739399', pl: ['default'], ap: 0 };
  const TEXT_T = A('🎨 Design (default)', 'Text: "Test Entwurf"');
  const ALT = '🖼️ Druckdatei (default)', NEU = '_Druckdatei (default)';
  const eigT = (schluessel = ALT, extra = {}, mehr = []) => [TEXT_T, A(schluessel, DATEI_T), A('_pod_karte', JSON.stringify({ ...KARTE_T, ...extra })), ...mehr];
  const tasseZeile = (props, o = {}) => zeile({ title: 'Keramik-Tasse mit farbiger Innenseite selbst gestalten', sku: '9100403_17197', variant: { sku: '9100403_17197' }, discountedTotalSet: { shopMoney: { amount: '27.90', currencyCode: 'CHF' } },
    product: { productType: 'Tassen & Becher', tags: ['wunschdesign', 'printful_personalized_product', 'sg-fabrik'], metafield: null }, customAttributes: props, ...o });
  const szT = (props, extra = {}, zeileO = {}) => ({ vid: 17197, orders: [knoten([tasseZeile(props, zeileO)], extra.order || {})], variant: [{ status: 200, body: { result: TASSE.antwort } }], druckEigen: { 403: { printfiles: TASSE.printfiles, templates: TASSE.templates } }, datei: { px: [2700, 1140] }, ...extra });
  const nurLookup = (e) => e.prot.pf.filter((x) => !/mockup-generator|products\/variant/.test(x));
  const SOLL_ARTIKEL = [{ variant_id: 17197, quantity: 1, files: [{ type: 'default', url: DATEI_T }], external_id: '9001' }];

  // (1) alte und neue Schreibweise: derselbe Auftrag, bestätigt, kein Review
  for (const [n, st] of [['ALTE Schreibweise «🖼️ Druckdatei (default)» (Editor 6.2.0)', ALT], ['NEUE Schreibweise «_Druckdatei (default)» (ab 6.2.1)', NEU]]) {
    const e = lauf(szT(eigT(st)));
    ist(`WP6 Sync Canary-Tasse, ${n}: ein Auftrag mit Artikel 17197 und Datei «default», bestätigt, kein Review-Tag, Exit 0`, [e.prot.posts.map((p) => p.body.items), bestaetigt(e), hatReview(e), tags(e).includes('printful-confirmed'), e.prot.exitCode], [[SOLL_ARTIKEL], true, false, true, 0]);
  }
  {
    const a = lauf(szT(eigT(ALT))), n = lauf(szT(eigT(NEU)));
    ist('WP6 Sync: alte und neue Schreibweise senden BYTE-GLEICH denselben Auftrag (Empfänger, Artikel, external_id)', JSON.stringify(n.prot.posts[0].body), JSON.stringify(a.prot.posts[0].body));
  }
  // (4) _vorschau: nie geholt, nie gesendet
  for (const [n, st] of [['alt', ALT], ['neu', NEU]]) {
    const e = lauf(szT(eigT(st, {}, [A('_vorschau', VORSCHAU_T)])));
    ist(`WP6 Sync mit _vorschau (${n}): derselbe Auftrag, bestätigt, nur die Druckdatei wurde abgerufen (die Vorschau nie), kein Review`, [e.prot.posts[0].body.items, bestaetigt(e), e.prot.dateien.map((d) => d.url), hatReview(e)], [SOLL_ARTIKEL, true, [DATEI_T], false]);
  }
  // gemischte Schlüssel: harter Befund, kein Auftrag
  {
    const e = lauf(szT(eigT(ALT, {}, [A(NEU, DATEI_T)]), { telegram: true }));
    ist('WP6 Sync gemischte Schlüssel (alt UND neu für «default»): kein Auftrag, Review-Tags «schluessel-gemischt», eine Meldung mit 🔴, nichts abgerufen', [e.prot.posts.length, tags(e).includes('printful-review-schluessel-gemischt'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), e.prot.dateien.length], [0, true, false, 1, true, 0]);
    const u = lauf(szT([TEXT_T, A('_Druckdatei (Front)', DATEI_T), A('_pod_karte', JSON.stringify(KARTE_T))], { telegram: true }));
    ist('WP6 Sync nicht lesbarer neuer Schlüssel («_Druckdatei (Front)»): kein Auftrag, Review-Tag «datei-schluessel» (früher: als Vorderseite gedruckt)', [u.prot.posts.length, tags(u).includes('printful-review-datei-schluessel')], [0, true]);
  }
  // (2) qd: nur weich
  for (const [n, qd, bestaetigtSoll, tag] of [['300 (gleich der Messung der Datei)', 300, true, null], ['150 (Mindest-dpi der Tasse, unter der Messung 300)', 150, false, 'printful-review-qd-weicht-ab'], ['149 (unter der Mindest-dpi)', 149, false, 'printful-review-qd-weicht-ab'], ['60 (hochgezogenes Foto)', 60, false, 'printful-review-qd-weicht-ab'], ['400 (mehr als die Datei trägt)', 400, false, 'printful-review-qd-weicht-ab'], ['"abc" (unbrauchbar)', 'abc', false, 'printful-review-aufloesung-angabe']]) {
    const e = lauf(szT(eigT(NEU, { qd }), { telegram: true }));
    ist(`WP6 Sync qd ${n}: Entwurf ${bestaetigtSoll ? 'wird bestätigt' : 'bleibt Entwurf'}${tag ? ', Tag ' + tag : ', kein Review'}, der Auftrag selbst wird in jedem Fall angelegt (nie ein harter Befund)`,
      [e.prot.posts.length, bestaetigt(e), tag ? tags(e).includes(tag) : !hatReview(e), !/🔴/.test(e.prot.tg.join(' '))], [1, bestaetigtSoll, true, true]);
  }
  {
    const e = lauf(szT(eigT(NEU, { qd: 300 }), { datei: { px: [900, 380] }, telegram: true }));
    ist('WP6 Sync: ein hohes qd (300) gibt die zu kleine Datei (900×380 = 100 dpi) NICHT frei: Entwurf, Tags «aufloesung» und «qd-weicht-ab»', [bestaetigt(e), tags(e).includes('printful-review-aufloesung'), tags(e).includes('printful-review-qd-weicht-ab')], [false, true, true]);
  }
  // (3) Karte gegen SKU
  for (const [n, extra, text] of [['pv 17196 statt 17197', { pv: 17196 }, /17196/], ['m 404 statt 403', { m: 404 }, /Produkt 404/]]) {
    const e = lauf(szT(eigT(NEU, extra), { telegram: true }));
    ist(`WP6 Sync Karte widerspricht der SKU (${n}): KEIN Auftrag, kein Bestätigen, Review-Tags «karte-widerspruch», nicht als synchronisiert markiert, eine 🔴-Meldung, keine Abfrage von Variante oder Datei`,
      [e.prot.posts.length, e.prot.confirms.length, tags(e).includes('printful-review-karte-widerspruch'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), text.test(e.prot.tg[0] || ''), e.prot.variantGets.length, e.prot.dateien.length, nurLookup(e)], [0, 0, true, false, 1, true, true, 0, 0, ['GET /orders/@LXT1']]);
  }
  // Druckdatei-Eigenschaft in neuer Schreibweise an einem Produkt OHNE POD-Tag (und ohne Karte): die Bestellung wird trotzdem geprüft, nicht still übergangen
  {
    const e = lauf(szT([A(NEU, DATEI_T)], { telegram: true }, { product: { productType: 'Tassen & Becher', tags: [], metafield: null } }));
    ist('WP6 Sync: «_Druckdatei (…)» an einem Produkt ohne POD-Tag und ohne Karte: harter Befund «druckdatei-ohne-pod», kein Auftrag, nichts abgerufen', [e.prot.posts.length, tags(e).includes('printful-review-druckdatei-ohne-pod'), e.prot.dateien.length], [0, true, 0]);
  }
  // (5) Bestellung ohne Design
  {
    const e = lauf(szT([], { telegram: true }));
    ist('WP6 Sync ohne Design: KEIN Printful-Auftrag (weder Entwurf noch Bestätigen), Review-Tags «keine-druckdatei», genau eine 🔴-Meldung mit dem Verweis auf OHNE-DESIGN.md, Exit 0', [e.prot.posts.length, e.prot.confirms.length, tags(e).includes('printful-review-keine-druckdatei'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), /OHNE-DESIGN\.md/.test(e.prot.tg[0] || ''), e.prot.exitCode], [0, 0, true, false, 1, true, true, 0]);
    ist('WP6 Sync ohne Design: KEIN Kundenkontakt und keine Rückerstattung durch den Sync: die einzige Schreibaktion an Shopify ist das Setzen der Tags (kein Metafeld, keine Erstattung, keine Versandmeldung, keine Stornierung), an Printful geht nur die Abfrage nach einem bestehenden Auftrag',
      [e.prot.shopOps, nurLookup(e), e.prot.tg.length], [['tagsAdd'], ['GET /orders/@LXT1'], 1]);
    ist('WP6 Sync ohne Design: das Protokoll (öffentlich) nennt nur Nummer und Befundart, keinen Titel und keinen Kundentext', [e.prot.log.some((l) => /Keramik-Tasse/.test(l)), e.prot.warn.some((l) => /Keramik-Tasse|Test Entwurf/.test(l)), e.prot.warn.some((l) => /keine-druckdatei/.test(l))], [false, false, true]);
    const zweit = lauf(szT([], { telegram: true, order: { tags: ['printful-review', 'printful-review-keine-druckdatei'] } }));
    ist('WP6 Sync ohne Design, zweiter Lauf (Tags stehen schon): dieselbe Befundart wird NICHT erneut gemeldet', [zweit.prot.posts.length, tgAnzahl(zweit), zweit.prot.tags.length], [0, 0, 0]);
    const nurKarte = lauf(szT([TEXT_T, A('_pod_karte', JSON.stringify(KARTE_T))], { telegram: true }));
    ist('WP6 Sync ohne Design, aber mit Editor-Eintrag: derselbe Ablauf, die Meldung sagt «Editor-Eintrag da» und nennt die Karte NICHT noch einmal als eigenen Befund', [nurKarte.prot.posts.length, tags(nurKarte).includes('printful-review-keine-druckdatei'), tags(nurKarte).includes('printful-review-karte-ohne-datei'), /Editor-Eintrag da/.test(nurKarte.prot.tg[0] || '')], [0, true, false, true]);
  }
  // Trockenlauf mit der Attrappe: gelesen, nichts geschrieben
  {
    const e = lauf(szT(eigT(NEU), { telegram: true, env: { DRY_RUN: '1' } }));
    ist('WP6 Sync Trockenlauf mit der Canary-Attrappe (neue Schreibweise): würde als Entwurf angelegt UND bestätigt, nichts geschrieben (kein POST, kein Tag, kein Metafeld, keine Telegram-Meldung)', [e.prot.posts.length, e.prot.shopOps, e.prot.tg.length, e.prot.log.some((l) => /würde als Entwurf angelegt und danach bestätigt/.test(l))], [0, [], 0, true]);
    const o = lauf(szT([], { telegram: true, env: { DRY_RUN: '1' } }));
    ist('WP6 Sync Trockenlauf ohne Design: kein POST, keine Tags, keine Meldung', [o.prot.posts.length, o.prot.shopOps, o.prot.tg.length], [0, [], 0]);
  }
  // PRINTFUL_AUTO_CONFIRM=0 (Entscheid des Besitzers): der Auftrag bleibt Entwurf, einziger Befund «manuell»
  {
    const e = lauf(szT(eigT(NEU), { telegram: true, env: { PRINTFUL_AUTO_CONFIRM: '0' } }));
    ist('WP6 Sync mit PRINTFUL_AUTO_CONFIRM=0 (Besitzer-Entscheid): derselbe Entwurf wird angelegt, NICHT bestätigt, als einziger Befund «manuell»', [e.prot.posts[0].body.items, bestaetigt(e), tags(e).filter((t) => t.startsWith('printful-review-')), tags(e).includes('printful-synced')], [SOLL_ARTIKEL, false, ['printful-review-manuell'], true]);
  }
}

// ═════════════════════════════════════════════════════════════ Phase 1 (09.11.2026): Dienst-Standort, Aufpreis ohne bezahltes Paket, Standardwerte, Kosten-Obergrenze, Editor 6.4.0
{
  const M = lade('../dropship/selbst-gestalten-fertig-0511/bestellweg/editor_640_mitschnitt.json');
  const fall = (n) => M.faelle.find((f) => f.name === n);
  const attr = (f) => Object.entries(f.anfrage.properties).map(([key, value]) => A(key, value));
  const SKU = '9100071_4025';
  const shirt = (f, extra = {}, zeileO = {}) => sz1([zeile({ sku: SKU, variant: { sku: SKU }, title: 'T-Shirt selbst gestalten', customAttributes: attr(f), ...zeileO })], { datei: { px: [1800, 2400] }, telegram: true, ...extra });
  const ohnePaket = ['PRINTFUL_PAKET_BEZAHLT'];
  const pf = (e) => e.prot.pf.filter((x) => !/products|mockup/.test(x));
  const vorneText = fall('t-shirt-71-vorne-text'), mitRuecken = fall('t-shirt-71-vorne-foto-und-ruecken-text');

  // Die Abfrage fragt nach dem Standort und den Optionen der Variante
  {
    const e = lauf(shirt(vorneText));
    const q = e.prot.shopQuery;
    ist('Phase 1 Abfrage: Fulfillment-Orders mit Standort (Dienst-Flag) und Positionen, dazu die Optionen der Variante (für das bezahlte Paket)', [/fulfillmentOrders\(first:20\)/.test(q), /assignedLocation\{ location\{ id name isFulfillmentService \}/.test(q), /lineItems\(first:50\)\{ pageInfo\{ hasNextPage \} edges\{ node\{ lineItem\{ id \}/.test(q), /variant\{ sku title selectedOptions\{ name value \}/.test(q)], [true, true, true, true]);
    ist('Phase 1 Normalfall (echte Eigenschaften des Editors 6.4.0, Händler-Standort, Vorderseite): ein Auftrag, Typ «default», kein Review', [e.prot.posts.length, typenDerPosts(e), hatReview(e)], [1, [[['default']]], false]);
    const druckUrl = vorneText.anfrage.properties['🖼️ Druckdatei (front)'], vorschauUrl = vorneText.anfrage.properties._vorschau;
    ist('Phase 1 Normalfall: der Auftrag trägt die Druckdatei (nicht die Vorschau), abgerufen wird nur die Druckdatei; «_vorschau» geht nie an Printful und nie ins Netz', [e.prot.posts[0].body.items[0].files, e.prot.dateien.map((d) => d.url).every((u) => u === druckUrl), JSON.stringify(e.prot.posts).includes(vorschauUrl)], [[{ type: 'default', url: druckUrl }], true, false]);
  }
  // (a) Dienst-Standort
  {
    const e = lauf(shirt(vorneText, { order: { fulfillmentOrders: fos([zeile({ id: 'gid://shopify/LineItem/9001' })], FO_DIENST) } }));
    ist('Phase 1 Dienst-Standort «Printful»: KEIN Auftrag (weder Entwurf noch Bestätigen), nur die Abfrage nach einem bestehenden Auftrag, keine Variantenabfrage, nichts abgerufen', [e.prot.posts.length, e.prot.confirms.length, pf(e), e.prot.variantGets.length, e.prot.dateien.length], [0, 0, ['GET /orders/@LXT1'], 0, 0]);
    ist('Phase 1 Dienst-Standort: Tags printful-review + printful-review-dienst-standort, NICHT printful-synced; genau eine 🔴-Meldung, die Printful nennt; Exit 0', [tags(e).includes('printful-review'), tags(e).includes('printful-review-dienst-standort'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), /Printful/.test(e.prot.tg[0] || ''), e.status], [true, true, false, 1, true, true, 0]);
    ist('Phase 1 Dienst-Standort: das öffentliche Protokoll nennt nur Nummer und Befundart', [e.prot.warn.some((l) => /dienst-standort/.test(l)), e.prot.warn.some((l) => /Fulfillment-Service-Standort|Doppeldruck/.test(l)), e.prot.log.some((l) => /Fulfillment-Service-Standort|Doppeldruck/.test(l))], [true, false, false]);
    const zweit = lauf(shirt(vorneText, { order: { tags: ['printful-review', 'printful-review-dienst-standort'], fulfillmentOrders: fos([zeile({ id: 'gid://shopify/LineItem/9001' })], FO_DIENST) } }));
    ist('Phase 1 Dienst-Standort, zweiter Lauf: die Bestellung mit dem Review-Tag wird nicht mehr gelesen (Abfrage schliesst sie aus), nichts erneut gemeldet', [zweit.prot.shop[0].q.includes('-tag:printful-review'), tgAnzahl(zweit) <= 1], [true, true]);
    // Nachtrag 10.11.2026 (SYNC.md 7.2a): bei vier Produkten liegen nur einige Varianten am Dienst-Standort. Ein Warenkorb mit einer Dienst- und einer Händler-Variante desselben Produkts hält die GANZE Bestellung an:
    // auch die Händler-Position wird nicht gedruckt, bis der Besitzer eingreift (sichere Richtung, aber eine Folge, die der Besitzer kennen muss).
    {
      const attrT = attr(vorneText);
      const zD = zeile({ id: 'gid://shopify/LineItem/9001', sku: SKU, variant: { sku: SKU }, title: 'T-Shirt selbst gestalten (Dienst-Variante)', customAttributes: attrT });
      const zH = zeile({ id: 'gid://shopify/LineItem/9002', sku: SKU, variant: { sku: SKU }, title: 'T-Shirt selbst gestalten (Händler-Variante)', customAttributes: attrT });
      const misch = lauf(sz1([zD, zH], { datei: { px: [1800, 2400] }, telegram: true, order: { fulfillmentOrders: { edges: [fos([zD], FO_DIENST).edges[0], fos([zH]).edges[0]] } } }));
      ist('Phase 1 Dienst-Standort, GEMISCHTER Warenkorb (eine Position am Dienst, eine am Händler-Standort): KEIN Auftrag für keine der beiden, Review «dienst-standort», eine 🔴-Meldung, Exit 0', [misch.prot.posts.length, misch.prot.confirms.length, tags(misch).includes('printful-review-dienst-standort'), tags(misch).includes('printful-synced'), tgAnzahl(misch), /🔴/.test(misch.prot.tg[0] || ''), misch.status], [0, 0, true, false, 1, true, 0]);
      const nurH = lauf(sz1([zH], { datei: { px: [1800, 2400] }, telegram: true, order: { fulfillmentOrders: fos([zH]) } }));
      ist('Phase 1 Gegenprobe: dieselbe Händler-Position allein → ein Auftrag, kein Review (die Sperre kommt vom Warenkorb mit der Dienst-Position, nicht von der Händler-Position)', [nurH.prot.posts.length, hatReview(nurH)], [1, false]);
    }
    const ohneFo = lauf(shirt(vorneText, { order: { fulfillmentOrders: undefined } }));
    ist('Phase 1 (Härtung 10.11.2026): Antwort OHNE Fulfillment-Orders (nie «frei» geraten): HARTER Befund «dienst-standort-unklar», KEIN Auftrag (früher: weich, Entwurf neben dem Auftrag der Printful-App), nicht als erledigt markiert', [ohneFo.prot.posts.length, bestaetigt(ohneFo), tags(ohneFo).includes('printful-review-dienst-standort-unklar'), tags(ohneFo).includes('printful-synced'), tgAnzahl(ohneFo), /🔴/.test(ohneFo.prot.tg[0] || '')], [0, false, true, false, 1, true]);
  }
  // (b) Aufpreis ohne bezahltes Paket
  {
    const e = lauf(shirt(mitRuecken, { envLoeschen: ohnePaket }));
    ist('Phase 1 Aufpreis: Vorder- und Rückseite (echte Eigenschaften des Editors 6.4.0, ap 6.1), bezahlt nur die Vorderseite: KEIN Auftrag, Tag printful-review-aufpreis-unbezahlt, eine 🔴-Meldung mit «back» und 5.95 USD', [e.prot.posts.length, e.prot.confirms.length, tags(e).includes('printful-review-aufpreis-unbezahlt'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), /«back»/.test(e.prot.tg[0] || ''), /5\.95 USD/.test(e.prot.tg[0] || ''), e.prot.dateien.length, e.prot.gemini.length], [0, 0, true, false, 1, true, true, true, 0, 0]);
    const bez = lauf(shirt(mitRuecken, { env: { PRINTFUL_PAKET_BEZAHLT: 'back' } }));
    ist('Phase 1 Aufpreis: mit PRINTFUL_PAKET_BEZAHLT=back (Übergang) wird derselbe Kauf angelegt und bestätigt: Dateien «default» und «back»', [bez.prot.posts.length, typenDerPosts(bez), bestaetigt(bez), hatReview(bez)], [1, [[['default', 'back']]], true, false]);
    const nur = lauf(shirt(vorneText, { envLoeschen: ohnePaket }));
    ist('Phase 1 Aufpreis: nur die Vorderseite braucht kein Paket (ohne PRINTFUL_PAKET_BEZAHLT): angelegt und bestätigt', [nur.prot.posts.length, bestaetigt(nur), hatReview(nur)], [1, true, false]);
    const unrichtig = lauf(shirt(mitRuecken, { env: { PRINTFUL_PAKET_BEZAHLT: 'sleeve_left' } }));
    ist('Phase 1 Aufpreis: bezahlt ist nur der linke Ärmel, gedruckt wird die Rückseite → weiter KEIN Auftrag', [unrichtig.prot.posts.length, tags(unrichtig).includes('printful-review-aufpreis-unbezahlt')], [0, true]);
  }
  {
    // PRINTFUL_PAKET_BEZAHLT mit ungültiger ID: Konfigurationsfehler, Exit 1, nichts angelegt, keine Anfrage
    const e = lauf(shirt(vorneText, { env: { PRINTFUL_PAKET_BEZAHLT: 'back, Hinten!' } }));
    ist('Phase 1: PRINTFUL_PAKET_BEZAHLT mit ungültiger ID → Konfigurationsfehler, Exit 1, nichts gelesen, nichts angelegt', [e.prot.exitCode === null ? e.prot.ausstieg : e.prot.exitCode, e.prot.posts.length, e.prot.shop.length, e.prot.err.some((l) => /PRINTFUL_PAKET_BEZAHLT/.test(l))], [1, 0, 0, true]);
  }
  // (c) Standardwerte: ohne gesetzte Variablen wie der Workflow (nichts bestätigen, keine KI)
  {
    const roh = (extra = {}) => lauf(shirt(vorneText, { envLoeschen: ['PRINTFUL_AUTO_CONFIRM', 'PRINTFUL_KI_KONTROLLE', 'GEMINI_API_KEY'], ...extra }));
    const e = roh();
    ist('Phase 1 Standardwerte: PRINTFUL_AUTO_CONFIRM und PRINTFUL_KI_KONTROLLE nicht gesetzt → Entwurf angelegt, NICHT bestätigt, einziger Befund «manuell», keine KI-Anfrage, keine KI-Befunde', [e.prot.posts.length, bestaetigt(e), tags(e).filter((t) => t.startsWith('printful-review-')), e.prot.gemini.length], [1, false, ['printful-review-manuell'], 0]);
    const mitSchluessel = lauf(shirt(vorneText, { envLoeschen: ['PRINTFUL_AUTO_CONFIRM', 'PRINTFUL_KI_KONTROLLE'], env: { GEMINI_API_KEY: 'g' } }));
    ist('Phase 1 Standardwerte: auch mit vorhandenem GEMINI_API_KEY fragt der Sync die KI nicht (Vorgabe «aus»)', [mitSchluessel.prot.gemini.length, bestaetigt(mitSchluessel)], [0, false]);
    for (const w of ['', '0', 'false', 'nein', 'xyz', 'jaa', 'aus', ' ']) {
      const x = roh({ env: { PRINTFUL_AUTO_CONFIRM: w } });
      ist(`Phase 1 PRINTFUL_AUTO_CONFIRM=«${w}»: nicht bestätigt (nur ein ausdrückliches Ja bestätigt, auch ein Tippfehler nicht)`, [x.prot.posts.length, bestaetigt(x)], [1, false]);
    }
    // Bestätigt wird nur mit Kostenobergrenze UND eingeschalteter KI-Kontrolle (Rahmen: Obergrenze 500, KI pflicht mit Schlüssel)
    for (const w of ['1', 'true', 'TRUE', 'ja', 'Yes', 'on', ' an ']) {
      const x = roh({ env: { PRINTFUL_AUTO_CONFIRM: w, PRINTFUL_KI_KONTROLLE: 'pflicht', GEMINI_API_KEY: 'g' } });
      ist(`Phase 1 PRINTFUL_AUTO_CONFIRM=«${w}» (mit KI-Kontrolle und Obergrenze): bestätigt`, [x.prot.posts.length, bestaetigt(x)], [1, true]);
    }
    const pflichtOhne = roh({ env: { PRINTFUL_AUTO_CONFIRM: '1', PRINTFUL_KI_KONTROLLE: 'pflicht' } });
    ist('Phase 1 PRINTFUL_KI_KONTROLLE=pflicht ohne GEMINI_API_KEY: nicht bestätigt, Review «kontrolle-fehlt»', [bestaetigt(pflichtOhne), tags(pflichtOhne).includes('printful-review-kontrolle-fehlt')], [false, true]);
    // Härtung 10.11.2026: ist die KI-Kontrolle aus, bleibt jede Bestätigung aus (auch bei AUTO_CONFIRM=1 und gesetzter Obergrenze); der Entwurf trägt den Grund
    for (const w of ['aus', 'AUS', 'Aus', ' aus ', '']) {
      const aus = roh({ env: { PRINTFUL_AUTO_CONFIRM: '1', PRINTFUL_KI_KONTROLLE: w, GEMINI_API_KEY: 'g' }, telegram: true });
      ist(`Phase 1 AUTO_CONFIRM=1 mit PRINTFUL_KI_KONTROLLE=«${w}» (KI aus): KEINE KI-Anfrage, der Entwurf wird angelegt, aber NICHT bestätigt, Befund «manuell» nennt die KI-Kontrolle als Grund`, [aus.prot.gemini.length, aus.prot.posts.length, bestaetigt(aus), tags(aus).includes('printful-review-manuell'), /KI-Kontrolle/.test(aus.prot.tg[0] || '')], [0, 1, false, true, true]);
    }
    const tippfehler = lauf(shirt(vorneText, { envLoeschen: ['PRINTFUL_KI_KONTROLLE'], env: { PRINTFUL_AUTO_CONFIRM: '1', PRINTFUL_KI_KONTROLLE: 'Pflicht', GEMINI_API_KEY: 'g', }, ki: 'pass' }));
    ist('Phase 1 PRINTFUL_KI_KONTROLLE=«Pflicht» (Gross-/Kleinschreibung) schaltet die KI ein: eine Anfrage, bestätigt nach PASS', [tippfehler.prot.gemini.length, bestaetigt(tippfehler)], [1, true]);
    const unklar = lauf(shirt(vorneText, { env: { PRINTFUL_AUTO_CONFIRM: '1', PRINTFUL_KI_KONTROLLE: 'pflich', GEMINI_API_KEY: 'g' }, ki: 'http402' }));
    ist('Phase 1 PRINTFUL_KI_KONTROLLE=«pflich» (Tippfehler) gilt als pflicht (die sichere Seite): KI wird gefragt, ihr Ausfall hält den Auftrag an', [unklar.prot.gemini.length, bestaetigt(unklar)], [1, false]);
    // dieselben Werte, die der Workflow als Vorgabe setzt, ergeben dasselbe wie nicht gesetzte Variablen
    const ymlPfad = fileURLToPath(new URL('../.github/workflows/printful-sync.yml', import.meta.url));
    if (!existsSync(ymlPfad)) { if (process.env.CI) { fehl++; console.log('✗ Workflow-Datei nicht ausgecheckt, in der CI muss sie da sein'); } else console.log('(Workflow-Datei nicht ausgecheckt → Abgleich der Standardwerte mit dem Workflow übersprungen)'); }
    else {
    const yml = readFileSync(ymlPfad, 'utf8');
    const wfConfirm = (yml.match(/PRINTFUL_AUTO_CONFIRM: \$\{\{[^}]*\|\| '([^']*)' \}\}/) || [])[1], wfKi = (yml.match(/PRINTFUL_KI_KONTROLLE: \$\{\{[^}]*\|\| '([^']*)' \}\}/) || [])[1];
    ist('Phase 1: der Workflow setzt als Vorgabe PRINTFUL_AUTO_CONFIRM «0» und PRINTFUL_KI_KONTROLLE «aus»', [wfConfirm, wfKi], ['0', 'aus']);
    const wf = lauf(shirt(vorneText, { env: { PRINTFUL_AUTO_CONFIRM: wfConfirm, PRINTFUL_KI_KONTROLLE: wfKi, GEMINI_API_KEY: 'g' }, envLoeschen: ohnePaket }));
    const roh0 = lauf(shirt(vorneText, { envLoeschen: ['PRINTFUL_AUTO_CONFIRM', 'PRINTFUL_KI_KONTROLLE', ...ohnePaket], env: { GEMINI_API_KEY: 'g' } }));
    const sicht = (x) => [x.prot.posts.length, x.prot.confirms.length, x.prot.gemini.length, tags(x).sort()];
    ist('Phase 1: Skript ohne Variablen und Skript mit den Vorgaben des Workflows verhalten sich gleich (Aufträge, Bestätigen, KI-Anfragen, Tags)', sicht(roh0), sicht(wf));
    }
  }
  // (d) Kosten-Obergrenze (die Attrappe liefert Kosten von 12.70 USD)
  {
    const kst = (w, extra = {}) => lauf(shirt(vorneText, { env: { PRINTFUL_MAX_KOSTEN_USD: w }, ...extra }));
    const unter = kst('12.69');
    ist('Phase 1 Kosten-Obergrenze 12.69 USD bei 12.70 USD Auftragssumme: Entwurf bleibt, NICHT bestätigt, Tag printful-review-kosten-obergrenze, eine 🟡-Befundmeldung mit beiden Zahlen (dazu die Zusammenfassung)', [unter.prot.posts.length, bestaetigt(unter), tags(unter).includes('printful-review-kosten-obergrenze'), unter.prot.tg.filter((x) => /^🟡/.test(x)).length, /🟡/.test(unter.prot.tg[0] || ''), /12\.70/.test(unter.prot.tg[0] || ''), /12\.69/.test(unter.prot.tg[0] || '')], [1, false, true, 1, true, true, true]);
    const gleich = kst('12.70');
    ist('Phase 1 Kosten-Obergrenze genau 12.70: erlaubt, bestätigt', [bestaetigt(gleich), hatReview(gleich)], [true, false]);
    // Härtung 10.11.2026: PRINTFUL_AUTO_CONFIRM=1 verlangt eine Obergrenze. Fehlt sie (leer, 0, aus), ist das ein Konfigurationsfehler: Exit 1, nichts gelesen, nichts angelegt (auch im Trockenlauf)
    for (const w of ['', '0', 'aus', 'AUS', ' ']) {
      const x = kst(w);
      ist(`Phase 1 AUTO_CONFIRM=1 ohne Obergrenze (PRINTFUL_MAX_KOSTEN_USD=«${w}»): Konfigurationsfehler, Exit 1, nichts gelesen, nichts angelegt, die Meldung nennt die Variable`, [x.prot.ausstieg, x.prot.posts.length, x.prot.shop.length, x.prot.err.some((l) => /PRINTFUL_MAX_KOSTEN_USD/.test(l) && /Kostenobergrenze/.test(l))], [1, 0, 0, true]);
    }
    const trockenOhne = kst('', { env: { PRINTFUL_MAX_KOSTEN_USD: '', DRY_RUN: '1' } });
    ist('Phase 1 AUTO_CONFIRM=1 ohne Obergrenze auch im TROCKENLAUF: Exit 1 (der Mangel soll sichtbar werden, bevor die Freigabedatei liegt)', [trockenOhne.prot.ausstieg, trockenOhne.prot.shop.length], [1, 0]);
    // Ohne AUTO_CONFIRM ist die Obergrenze weiter freiwillig (nichts wird bestätigt)
    for (const w of ['', '0', 'aus', 'AUS', ' ']) {
      const x = kst(w, { env: { PRINTFUL_MAX_KOSTEN_USD: w, PRINTFUL_AUTO_CONFIRM: '0' } });
      ist(`Phase 1 AUTO_CONFIRM=0 und PRINTFUL_MAX_KOSTEN_USD=«${w}»: kein Fehler, Entwurf, nicht bestätigt`, [x.prot.ausstieg ?? x.status, x.prot.posts.length, bestaetigt(x)], [0, 1, false]);
    }
    ist('Phase 1 PRINTFUL_MAX_KOSTEN_USD=5 (weit darunter): nicht bestätigt', bestaetigt(kst('5')), false);
    for (const w of ['abc', '-5', '12,70', 'NaN', 'Infinity']) {
      const x = kst(w);
      ist(`Phase 1 PRINTFUL_MAX_KOSTEN_USD=«${w}» (unbrauchbar): Konfigurationsfehler, Exit 1, nichts gelesen, nichts angelegt`, [x.prot.ausstieg, x.prot.posts.length, x.prot.shop.length, x.prot.err.some((l) => /PRINTFUL_MAX_KOSTEN_USD/.test(l))], [1, 0, 0, true]);
    }
    const kurz = lauf(shirt(vorneText, { env: { PRINTFUL_MAX_KOSTEN_USD: '5', DRY_RUN: '1' } }));
    ist('Phase 1 Trockenlauf mit Obergrenze: nichts angelegt, Exit 0 (die Summe ist vor dem Anlegen unbekannt)', [kurz.prot.posts.length, kurz.status], [0, 0]);
  }
}

// ═════════════════════════════════════════════════════════════ HÄRTUNG 10.11.2026 (Gegenprüfung P1: 27 bestätigte Funde)
// Jeder Absatz nennt den Fund (Nummer in dropship/wp6-0611/SYNC.md, Abschnitt 7.9). Grundsatz: ein Weg, der Geld bewegt, ist standardmässig zu; Unbekanntes, Unlesbares und Fehlendes ergibt «kein Auftrag / nicht bestätigen» plus Befund.
{
  const bestellt = (zeilen = [zeile()], extra = {}) => sz1(zeilen, extra);
  const gesperrt = (e) => [e.prot.posts.length, e.prot.confirms.length];

  // ── Fund 0: Zahlung, Test und Storno werden am Knoten geprüft, nicht nur am Suchstring
  {
    const q0 = lauf(bestellt());
    ist('Fund 0 Suchstring: schliesst Testbestellungen aus (-test:true) und nimmt nur bezahlte (financial_status:paid)', [/-test:true/.test(q0.prot.shop[0].q), /financial_status:paid/.test(q0.prot.shop[0].q)], [true, true]);
    ist('Fund 0 Die Abfrage liest test, displayFinancialStatus und cancelledAt (sonst bliebe der Knoten ungeprüft)', [/cancelledAt test displayFinancialStatus/.test(q0.prot.shopQuery)], [true]);
    const tst = lauf(bestellt([zeile()], { order: { test: true }, telegram: true }));
    ist('Fund 0 Testbestellung (test:true, trotzdem PAID): wird NIE gedruckt: kein Printful-Aufruf, keine Tags, keine Meldung, Exit 0, Log nennt den Grund', [tst.prot.posts.length, tst.prot.pf.length, tst.prot.tags.length, tgAnzahl(tst), tst.prot.exitCode, tst.prot.log.some((l) => /#T1: Testbestellung/.test(l))], [0, 0, 0, 0, 0, true]);
    for (const status of ['PENDING', 'PARTIALLY_PAID', 'AUTHORIZED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED', 'EXPIRED']) {
      const e = lauf(bestellt([zeile()], { order: { displayFinancialStatus: status } }));
      ist(`Fund 0 Zahlungsstatus ${status}: nicht gedruckt (nur PAID wird gedruckt), kein Printful-Aufruf, Exit 0, Log nennt den Status`, [e.prot.posts.length, e.prot.pf.length, e.prot.exitCode, e.prot.log.some((l) => l.includes('Zahlungsstatus ' + status))], [0, 0, 0, true]);
    }
    for (const [n, o] of [['test fehlt (null)', { test: null }], ['displayFinancialStatus fehlt (null)', { displayFinancialStatus: null }], ['displayFinancialStatus leer', { displayFinancialStatus: '' }]]) {
      const e = lauf(bestellt([zeile()], { order: o }));
      ist(`Fund 0 ${n}: UNLESBAR ist nie bezahlt: kein Auftrag, technischer Fehler, Exit 1`, [e.prot.posts.length, e.prot.pf.length, e.prot.exitCode, e.prot.err.some((x) => /Zahlungsstatus nicht lesbar/.test(x))], [0, 0, 1, true]);
    }
    const nichtPod = lauf(bestellt([zeile({ product: { productType: 'x', tags: ['cj'], metafield: null }, customAttributes: [] })], { order: { test: null } }));
    ist('Fund 0 Eine Nicht-POD-Bestellung mit unlesbarem Knoten ist kein Fehler (sie interessiert den Sync nicht)', [nichtPod.prot.exitCode, nichtPod.prot.err.length], [0, 0]);
  }

  // ── Fund 1: vor dem Anlegen und vor dem Bestätigen wird die Bestellung FRISCH aus Shopify gelesen
  {
    const e = lauf(bestellt());
    ist('Fund 1 Normalfall: zwei frische Lesungen derselben Bestellung (vor dem Anlegen, vor dem Bestätigen), die Abfrage nennt test, cancelledAt, displayFinancialStatus und tags', [e.prot.frisch, bestaetigt(e), /node\(id/.test(e.prot.frischQuery), /cancelledAt test displayFinancialStatus/.test(e.prot.frischQuery), /tags/.test(e.prot.frischQuery)], [['gid://shopify/Order/1', 'gid://shopify/Order/1'], true, true, true, true]);
    const vorAnlegen = lauf(bestellt([zeile()], { frischFolge: [{ cancelledAt: '2026-11-10T10:00:00Z' }], telegram: true }));
    ist('Fund 1 Storno zwischen Liste und Anlegen: KEIN Auftrag, keine Markierung, harter Befund «zahlung-geaendert», eine 🔴-Meldung, nur eine frische Lesung', [...gesperrt(vorAnlegen), markenTags(vorAnlegen).length, tags(vorAnlegen).includes('printful-review-zahlung-geaendert'), tags(vorAnlegen).includes('printful-synced'), tgAnzahl(vorAnlegen), /🔴/.test(vorAnlegen.prot.tg[0] || ''), vorAnlegen.prot.frisch.length], [0, 0, 0, true, false, 1, true, 1]);
    const vorBestaetigen = lauf(bestellt([zeile()], { frischFolge: [{}, { cancelledAt: '2026-11-10T10:00:00Z' }], telegram: true }));
    ist('Fund 1 Storno zwischen Anlegen und Bestätigen (der Fall des Prüfers): der Entwurf bleibt, NICHT bestätigt, weicher Befund «zahlung-geaendert», 🟡-Meldung nennt den Entwurf und das Löschen im Dashboard', [...gesperrt(vorBestaetigen), tags(vorBestaetigen).includes('printful-review-zahlung-geaendert'), tags(vorBestaetigen).includes('printful-confirmed'), /🟡/.test(vorBestaetigen.prot.tg[0] || ''), /Entwurf #42/.test(vorBestaetigen.prot.tg[0] || ''), /storniert/.test(vorBestaetigen.prot.tg[0] || '')], [1, 0, true, false, true, true, true]);
    for (const [n, f] of [['erstattet (REFUNDED)', { displayFinancialStatus: 'REFUNDED' }], ['teilweise erstattet', { displayFinancialStatus: 'PARTIALLY_REFUNDED' }], ['zum Testauftrag geworden', { test: true }]]) {
      const x = lauf(bestellt([zeile()], { frischFolge: [{}, f] }));
      ist(`Fund 1 vor dem Bestätigen ${n}: nicht bestätigt, Befund «zahlung-geaendert»`, [bestaetigt(x), tags(x).includes('printful-review-zahlung-geaendert')], [false, true]);
    }
    const unlesbar1 = lauf(bestellt([zeile()], { frischFehler: 'http' }));
    ist('Fund 1 Shopify liefert die frische Lesung nicht (HTTP 500), VOR dem Anlegen: nichts angelegt, Versuchszähler, Exit 1', [...gesperrt(unlesbar1), tags(unlesbar1), unlesbar1.prot.exitCode], [0, 0, ['printful-versuch-1'], 1]);
    const nullKnoten = lauf(bestellt([zeile()], { frischFehler: 'null' }));
    ist('Fund 1 Shopify kennt den Knoten nicht mehr (null): nichts angelegt, Exit 1', [...gesperrt(nullKnoten), nullKnoten.prot.exitCode], [0, 0, 1]);
    const unlesbar2 = lauf(bestellt([zeile()], { frischFehler: 'http', frischFehlerAb: 1, telegram: true }));
    ist('Fund 1 Shopify liefert nur die zweite frische Lesung nicht (vor dem Bestätigen): der Entwurf steht, NICHT bestätigt, Befund «zahlung-unlesbar»', [...gesperrt(unlesbar2), tags(unlesbar2).includes('printful-review-zahlung-unlesbar'), tags(unlesbar2).includes('printful-confirmed')], [1, 0, true, false]);
    const feldWeg = lauf(bestellt([zeile()], { frischFolge: [{}, { test: null }] }));
    ist('Fund 1 ein fehlendes Feld in der frischen Lesung (test null) ist nie «bezahlt»: nicht bestätigt, «zahlung-unlesbar»', [bestaetigt(feldWeg), tags(feldWeg).includes('printful-review-zahlung-unlesbar')], [false, true]);
    const schon = lauf(bestellt([zeile()], { frischFolge: [{ tags: ['printful-synced'] }], telegram: true }));
    ist('Fund 1 Ein anderer Lauf war schneller (frisch gelesen trägt die Bestellung schon printful-synced): nichts angelegt, keine Tags, keine Meldung, Exit 0', [...gesperrt(schon), schon.prot.tags.length, tgAnzahl(schon), schon.prot.exitCode, schon.prot.log.some((l) => /anderer Lauf/.test(l))], [0, 0, 0, 0, 0, true]);
    const schon2 = lauf(bestellt([zeile()], { frischFolge: [{ tags: [markeVor(5)] }] }));
    ist('Fund 1/6 Ein anderer Lauf hat vor 5 Minuten angefangen (Markierung beim frischen Lesen): nichts angelegt', gesperrt(schon2), [0, 0]);
    const trocken = lauf(bestellt([zeile()], { env: { DRY_RUN: '1' } }));
    ist('Fund 1 Im Trockenlauf wird die Bestellung nicht frisch gelesen (es wird nichts geschrieben, also nichts abgesichert)', [trocken.prot.frisch.length], [0]);
    const e1 = lauf({ vid: 4025, variant: [{ kat: 71 }], orders: [knoten([zeile()], { id: 'gid://shopify/Order/1', name: '#A' }), knoten([zeile()], { id: 'gid://shopify/Order/2', name: '#B' })], frischFolge: [{}, {}, {}, { cancelledAt: '2026-11-10T10:00:00Z' }] });
    ist('Fund 1 Mehrere Bestellungen: jede wird einzeln frisch gelesen (zwei Lesungen je Bestellung); wird die ZWEITE zwischen Anlegen und Bestätigen storniert, bleibt nur ihr Entwurf liegen', [e1.prot.frisch, e1.prot.confirms.length, e1.prot.posts.length], [['gid://shopify/Order/1', 'gid://shopify/Order/1', 'gid://shopify/Order/2', 'gid://shopify/Order/2'], 1, 2]);
  }

  // ── Fund 2 und 23: nur BEKANNTE v5-Schlüssel gelten als v5; alles andere, was nach Druckdatei klingt, ist ein harter Befund
  {
    for (const k of ['🖼️ Druckdatei (Sleeve_left)', 'Rückseite Druckdatei', 'Druckdatei (sleeve_left)', '🖼️ Druckdatei (rücken)', 'Print file (back)', 'hinten druckdatei', '🖼️ Druckdatei (Sleeve-Left)']) {
      const e = lauf(bestellt([zeile({ customAttributes: [A(k, V('x'))] })], { telegram: true }));
      ist(`Fund 2/23 unbekannter Schlüssel «${k}»: KEIN Auftrag (früher: still als Vorderseite gedruckt und bestätigt), harter Befund «datei-schluessel», eine 🔴-Meldung, nichts abgerufen`, [...gesperrt(e), tags(e).includes('printful-review-datei-schluessel'), tgAnzahl(e), e.prot.dateien.length], [0, 0, true, 1, 0]);
    }
    for (const k of ['🖼️ Druckdatei', '🖼️ Druckdatei (Vorne)', 'Vorne · 🖼️ Druckdatei', 'Front · 🖼️ Print file', '🖼️ Print file (Front)']) {
      const e = lauf(bestellt([zeile({ customAttributes: [A(k, V('x'))] })]));
      ist(`Fund 2/23 bekannte v5-Schreibweise «${k}» wird weiter gelesen (Vorderseite), bestätigt`, [e.prot.posts.length, typenDerPosts(e), bestaetigt(e)], [1, [[['front']]], true]);
    }
  }

  // ── Fund 3: Herkunft der Druckdatei: eigene Cloud unter /image/upload/, kein Port, kein /image/fetch/, Weiterleitungen werden nicht blind verfolgt
  {
    for (const [n, u] of [['fremde Cloudinary-Cloud', 'https://res.cloudinary.com/andere-cloud/image/upload/v1/x.png'], ['anderer Port', 'https://res.cloudinary.com:8443/dwyi6kkrl/image/upload/v1/x.png'], ['/image/fetch/ auf eine Fremdadresse', 'https://res.cloudinary.com/dwyi6kkrl/image/fetch/https%3A%2F%2Fevil.example%2Fx.png'], ['Rückstrich-Trick', 'https://res.cloudinary.com\\@evil.example/x.png'], ['video/upload statt image/upload', 'https://res.cloudinary.com/dwyi6kkrl/video/upload/v1/x.mp4']]) {
      const e = lauf(bestellt([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', u)] })], { telegram: true }));
      ist(`Fund 3 ${n}: harter Befund «datei-adresse», KEIN Auftrag, die Adresse wird nie abgerufen`, [...gesperrt(e), tags(e).includes('printful-review-datei-adresse'), e.prot.dateien.length, e.prot.kiDateien.length], [0, 0, true, 0, 0]);
    }
    const gross = lauf(bestellt([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://RES.Cloudinary.com/dwyi6kkrl/image/upload/v1/GROSS.png')] })]));
    ist('Fund 3 Grossgeschriebener Host ist derselbe Host; abgerufen und gesendet wird die NORMALISIERTE Adresse (kleingeschriebener Host)', [gross.prot.posts[0].body.items[0].files[0].url, gross.prot.dateien[0].url], ['https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/GROSS.png', 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/GROSS.png']);
    const zeig = lauf(bestellt());
    ist('Fund 3 Jeder Kopf-Abruf der Druckdatei lässt Weiterleitungen nicht blind zu (redirect «manual»)', zeig.prot.dateien.every((d) => d.redirect === 'manual'), true);
    const fremdRd = lauf(bestellt([zeile()], { datei: { weiterleitung: 'https://evil.example/x.png' } }));
    ist('Fund 3 Die Datei leitet auf einen FREMDEN Host weiter: das Ziel wird nie abgerufen (nur die Ausgangsadresse), die Pixelgrösse ist nicht prüfbar → Entwurf «aufloesung», NICHT bestätigt', [fremdRd.prot.dateien.length, fremdRd.prot.dateien.some((d) => /evil/.test(d.url)), bestaetigt(fremdRd), tags(fremdRd).includes('printful-review-aufloesung')], [1, false, false, true]);
    const eigenRd = lauf(bestellt([zeile()], { dateiPro: [{ match: 'Vorne', weiterleitung: V('zweit') }] }));
    ist('Fund 3 Die Datei leitet auf eine ERLAUBTE Adresse weiter: sie wird verfolgt (zwei Abrufe, der zweite auf das Ziel), die Auflösung stimmt, bestätigt', [eigenRd.prot.dateien.map((d) => d.url), bestaetigt(eigenRd)], [[V('Vorne'), V('zweit')], true]);
    const schleife = lauf(bestellt([zeile()], { datei: { weiterleitung: V('zweit'), weiterleitungImmer: true } }));
    ist('Fund 3 Endlose Weiterleitung: nach höchstens drei Sprüngen Schluss (vier Abrufe), Auflösung nicht prüfbar → Entwurf', [schleife.prot.dateien.length, bestaetigt(schleife), tags(schleife).includes('printful-review-aufloesung')], [4, false, true]);
  }

  // ── Fund 4 und 21: die Dienst-Standort-Sperre greift auch, wenn die Fulfillment-Order unsichtbar, abgeschnitten oder der Standort unlesbar ist
  {
    const z1 = zeile();
    const sicht = (fo) => lauf(bestellt([z1], { order: { fulfillmentOrders: fo }, telegram: true }));
    const FO_OK = fos([z1]);
    for (const [n, fo] of [
      ['leere Liste (Token sieht die Order nicht)', { pageInfo: { hasNextPage: false }, edges: [] }],
      ['Order nur für eine ANDERE Position', fos([zeile({ id: 'gid://shopify/LineItem/8888' })])],
      ['Order ohne Standort', { pageInfo: { hasNextPage: false }, edges: [{ node: { id: 'f', status: 'OPEN', assignedLocation: null, lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: { lineItem: { id: z1.id } } }] } } }] }],
      ['Standort ohne Dienst-Flag', { pageInfo: { hasNextPage: false }, edges: [{ node: { id: 'f', status: 'OPEN', assignedLocation: { location: { id: 'l', name: 'x' } }, lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: { lineItem: { id: z1.id } } }] } } }] }],
      ['Order geschlossen (CLOSED)', { pageInfo: { hasNextPage: false }, edges: [{ node: { ...FO_OK.edges[0].node, status: 'CLOSED' } }] }],
      ['Order storniert (CANCELLED)', { pageInfo: { hasNextPage: false }, edges: [{ node: { ...FO_OK.edges[0].node, status: 'CANCELLED' } }] }],
      ['mehr Fulfillment-Orders als eine Abfrage liefert (hasNextPage)', { ...FO_OK, pageInfo: { hasNextPage: true } }],
      ['eine Order mit mehr Positionen als eine Abfrage liefert', { ...FO_OK, edges: [{ node: { ...FO_OK.edges[0].node, lineItems: { ...FO_OK.edges[0].node.lineItems, pageInfo: { hasNextPage: true } } } }] }],
    ]) {
      const e = sicht(fo);
      ist(`Fund 4/21 «${n}»: HARTER Befund «dienst-standort-unklar», KEIN Auftrag (kein Entwurf neben dem Auftrag der Printful-App), nicht als erledigt markiert, eine 🔴-Meldung`, [...gesperrt(e), tags(e).includes('printful-review-dienst-standort-unklar'), tags(e).includes('printful-synced'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), e.prot.variantGets.length], [0, 0, true, false, 1, true, 0]);
    }
    const normal = lauf(bestellt([z1]));
    ist('Fund 4/21 Gegenprobe: eine sichtbare, offene Order am Händler-Standort mit allen Seitenköpfen auf false → Auftrag, bestätigt', [normal.prot.posts.length, bestaetigt(normal)], [1, true]);
    const geschlossenPlusOffen = lauf(bestellt([z1], { order: { fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [{ node: { ...fos([z1], FO_DIENST).edges[0].node, status: 'CLOSED' } }, FO_OK.edges[0]] } }, telegram: true }));
    ist('Fund 4/21 Eine GESCHLOSSENE Dienst-Order und eine offene Händler-Order für dieselbe Position: HARTER Befund «dienst-standort-unklar» (hat der Dienst schon gedruckt?), KEIN Auftrag (Gegenleser Linse 1, 10.11.2026; früher: Auftrag)', [...gesperrt(geschlossenPlusOffen), tags(geschlossenPlusOffen).includes('printful-review-dienst-standort-unklar'), /GESCHLOSSENEN/.test(geschlossenPlusOffen.prot.tg[0] || '')], [0, 0, true, true]);
    const geschlossenHaendler = lauf(bestellt([z1], { order: { fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [{ node: { ...FO_OK.edges[0].node, id: 'f-alt', status: 'CLOSED' } }, { node: { ...FO_OK.edges[0].node, id: 'f-neu' } }] } } }));
    ist('Fund 4/21 Gegenprobe: eine GESCHLOSSENE Händler-Order neben einer offenen derselben Position (z. B. Teillieferung) bleibt «frei»: Auftrag, bestätigt', [geschlossenHaendler.prot.posts.length, bestaetigt(geschlossenHaendler)], [1, true]);
    const dienstSichtbar = lauf(bestellt([z1], { order: { fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [fos([z1], FO_DIENST).edges[0], { node: { id: 'f2', status: 'OPEN', assignedLocation: { location: { id: 'l', name: 'x' } }, lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: { lineItem: { id: z1.id } } }] } } }] } }, telegram: true }));
    ist('Fund 4/21 Dienst-Order sichtbar UND eine zweite Order mit unlesbarem Standort für dieselbe Position: der Befund heisst «dienst-standort» (nicht nur «unklar»)', [tags(dienstSichtbar).includes('printful-review-dienst-standort'), tags(dienstSichtbar).includes('printful-review-dienst-standort-unklar')], [true, false]);

    // Zugriffsrechte des Tokens
    const sc = (scopes, extra = {}) => lauf(bestellt([z1], { scopes, telegram: true, ...extra }));
    const rechteOk = sc(undefined);
    ist('Fund 21 Rechte des Tokens beide da: eine Abfrage der Rechte, Log «beide Standortarten lesbar», normaler Lauf', [rechteOk.prot.scopeAbfragen, rechteOk.prot.log.some((l) => /beide Standortarten lesbar/.test(l)), bestaetigt(rechteOk)], [1, true, true]);
    const ohneDrittanbieter = sc(['read_orders', 'read_merchant_managed_fulfillment_orders']);
    ist('Fund 21 Dem Token fehlt read_third_party_fulfillment_orders (scharf): es wird KEINE Bestellung gelesen und nichts bearbeitet, Fehler nennt das Recht, Exit 1, Log sagt es', [ohneDrittanbieter.prot.shop.length, ...gesperrt(ohneDrittanbieter), ohneDrittanbieter.prot.err.some((x) => /read_third_party_fulfillment_orders/.test(x)), ohneDrittanbieter.prot.exitCode, ohneDrittanbieter.prot.log.some((l) => /nichts bearbeitet/.test(l)), ohneDrittanbieter.prot.tags.length], [0, 0, 0, true, 1, true, 0]);
    const ohneHaendler = sc(['read_orders', 'read_third_party_fulfillment_orders']);
    ist('Fund 21 Dem Token fehlt read_merchant_managed_fulfillment_orders: ebenso nichts bearbeitet, Exit 1', [ohneHaendler.prot.shop.length, ohneHaendler.prot.err.some((x) => /read_merchant_managed_fulfillment_orders/.test(x)), ohneHaendler.prot.exitCode], [0, true, 1]);
    const trockenOhne = sc(['read_orders'], { env: { DRY_RUN: '1', PRINTFUL_LOG_DETAIL: '1' }, order: undefined });
    ist('Fund 21 Im Trockenlauf wird trotz fehlendem Recht weiter gelesen (die Zusammenfassung soll zeigen, was geschähe), aber Exit 1 macht den Mangel sichtbar; kein Auftrag', [trockenOhne.prot.shop.length >= 1, ...gesperrt(trockenOhne), trockenOhne.prot.exitCode], [true, 0, 0, 1]);
    const schreib = sc(['write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders']);
    ist('Fund 21 «write_» schliesst «read_» ein: beide write-Rechte genügen', [schreib.prot.err.length, bestaetigt(schreib)], [0, true]);
    const nichtLesbar = sc(undefined, { scopesFehler: true });
    ist('Fund 21 Die Rechte lassen sich nicht abfragen (GraphQL-Fehler): nur eine Notiz im Log, der Lauf geht weiter (die Sperre pro Position gilt trotzdem)', [nichtLesbar.prot.log.some((l) => /nicht abfragbar/.test(l)), nichtLesbar.prot.err.length, bestaetigt(nichtLesbar)], [true, 0, true]);
    const hinweis = lauf(bestellt([z1], { order: { fulfillmentOrders: undefined }, scopes: ['read_orders', 'read_merchant_managed_fulfillment_orders'], env: { DRY_RUN: '1', PRINTFUL_LOG_DETAIL: '1' } }));
    ist('Fund 21 Fehlt dem Token ein Recht, nennt der Befund «dienst-standort-unklar» es als mögliche Ursache (Trockenlauf mit Befundtexten im Log)', hinweis.prot.log.some((l) => /dem Token fehlt das Recht read_third_party_fulfillment_orders/.test(l)), true);
  }

  // ── Fund 5, 20 und 24: geschrieben wird nur bei ausdrücklichem DRY_RUN=0
  {
    const ohne = lauf(bestellt([zeile()], { telegram: true, envLoeschen: ['DRY_RUN'] }));
    ist('Fund 5/20/24 DRY_RUN nicht gesetzt: TROCKENLAUF (kein POST, keine Tags, keine Meldung, «[DRY]» im Log), Exit 0', [ohne.prot.posts.length, ohne.prot.tags.length, ohne.prot.tg.length, ohne.prot.log.some((l) => /^\[DRY\] #T1/.test(l)), ohne.prot.exitCode], [0, 0, 0, true, 0]);
    for (const v of ['', ' ', 'ON', '2', 'schreiben']) { const d = lauf(bestellt([zeile()], { env: { DRY_RUN: v } })); ist(`Fund 5/20/24 DRY_RUN=«${v}» gilt als Trockenlauf`, d.prot.posts.length, 0); }
    for (const v of ['0', 'false', 'FALSE', ' no ', 'nein', 'off']) { const d = lauf(bestellt([zeile()], { env: { DRY_RUN: v } })); ist(`Fund 5/20/24 DRY_RUN=«${v}» schreibt`, d.prot.posts.length, 1); }
  }

  // ── Fund 6: Markierung VOR dem Anlegen; ein Lauf kurz darauf legt nichts neu an
  {
    const e = lauf(bestellt());
    ist('Fund 6 Die Markierung «printful-anlegen-<Zeit>» steht VOR dem POST (Reihenfolge der Aufrufe am Shop und bei Printful) und trägt die Uhrzeit des Laufs (höchstens zwei Minuten alt)', [e.prot.folge.slice(0, 2).map((x) => x.replace(/\d{8}t\d{4}-\d{5}-[a-z0-9]{8}/, '<zeit>')), markenTags(e).length, Math.abs(Date.parse(markenTags(e)[0].replace(/^printful-anlegen-(\d{4})(\d{2})(\d{2})t(\d{2})(\d{2})-\d{5}-[a-z0-9]{8}$/, '$1-$2-$3T$4:$5:00Z')) - Date.now()) < 120000], [['tags:printful-anlegen-<zeit>', 'POST'], 1, true]);
    const jung = lauf(bestellt([zeile()], { order: { tags: [markeVor(10)] }, lookup: [{ status: 404 }], telegram: true }));
    ist('Fund 6 Ein früherer Lauf hat vor 10 Minuten angefangen und Printful zeigt den Auftrag (noch) nicht: NICHTS neu angelegt, kein Tag, keine Meldung, kein Fehler, «wartet» in der Zusammenfassung', [...gesperrt(jung), jung.prot.tags.length, tgAnzahl(jung), jung.prot.exitCode, jung.prot.log.some((l) => /vor 10 Minuten angefangen/.test(l)), jung.prot.frisch.length], [0, 0, 0, 0, 0, true, 0]);
    const grenze59 = lauf(bestellt([zeile()], { order: { tags: [markeVor(59)] } }));
    ist('Fund 6 Eine Markierung von vor 59 Minuten sperrt noch', grenze59.prot.posts.length, 0);
    const grenze61 = lauf(bestellt([zeile()], { order: { tags: [markeVor(61)] } }));
    ist('Fund 6 Eine Markierung von vor 61 Minuten sperrt nicht mehr: der Auftrag wird angelegt (neue Markierung)', [grenze61.prot.posts.length, markenTags(grenze61).length], [1, 1]);
    const zwei = lauf(bestellt([zeile()], { order: { tags: [markeVor(300), markeVor(5)] } }));
    ist('Fund 6 Zählt die JÜNGSTE Markierung (eine alte und eine von vor 5 Minuten): gesperrt', zwei.prot.posts.length, 0);
    const gefunden = lauf(bestellt([zeile()], { order: { tags: [markeVor(10)] }, lookup: [{ status: 200, order: { status: 'pending' } }] }));
    ist('Fund 6 Zeigt Printful den Auftrag inzwischen (Nachfrage findet ihn), gilt das trotz junger Markierung: Tag printful-synced nachgetragen, kein zweiter Auftrag', [gefunden.prot.posts.length, tags(gefunden).includes('printful-synced')], [0, true]);
    const verloren = lauf(bestellt([zeile()], { post: [{ status: 503 }], lookup: [{ status: 404 }] }));
    ist('Fund 6 POST nicht quittiert und Nachfrage findet nichts: die Markierung steht (der nächste Lauf legt eine Stunde lang nichts neu an), Versuchszähler 1', [markenTags(verloren).length, tags(verloren).includes('printful-versuch-1'), verloren.prot.posts.length], [1, true, 1]);
    const nochmal = lauf(bestellt([zeile()], { order: { tags: [...markenTags(verloren), 'printful-versuch-1'] }, post: [{ status: 503 }], lookup: [{ status: 404 }] }));
    ist('Fund 6 …und ein Lauf unmittelbar danach (Markierung ist Sekunden alt) legt NICHT erneut an', gesperrt(nochmal), [0, 0]);
    const nach = lauf(bestellt([zeile()], { post: [{ status: 503 }], lookup: [{ status: 404 }, { status: 404 }] }));
    ist('Fund 6 Die Nachfrage nach einem nicht quittierten POST fragt nach DERSELBEN external_id, die gepostet wurde (die Attrappe kennt nach dem POST nur diese)', [nach.prot.pf.filter((x) => x.startsWith('GET /orders/@')), nach.prot.posts[0].body.external_id], [['GET /orders/@LXT1', 'GET /orders/@LXT1'], 'LXT1']);
    const spaet = lauf(bestellt([zeile()], { post: [{ status: 503 }], lookup: [{ status: 404 }, { status: 200, order: { status: 'draft' } }] }));
    ist('Fund 6 Die Nachfrage nach dem POST findet den Auftrag unter der gepostetenexternal_id: nichts doppelt, Tag printful-synced', [spaet.prot.posts.length, tags(spaet).includes('printful-synced')], [1, true]);
  }

  // ── Fund 8: unvollständige Entwürfe und fehlende Angaben sind nie «ok»
  {
    const mitItems = (items) => ({ entwurf: { items }, telegram: true });
    const leer = lauf(bestellt([zeile()], mitItems([])));
    ist('Fund 8 Der Entwurf nennt KEINEN Artikel (items []): nicht bestätigt, nach der Wartezeit Befund «datei-wartet» (leer) und «entwurf-abweichend»', [bestaetigt(leer), leer.prot.leseVor, tags(leer).includes('printful-review-datei-wartet'), tags(leer).includes('printful-review-entwurf-abweichend'), /keine einzige Datei/.test(leer.prot.tg[0] || '')], [false, 7, true, true, true]);
    const keineDateien = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 1 }])));
    ist('Fund 8 Der Artikel hat keine files (Printful hat noch nichts angehängt): nicht bestätigt, «datei-wartet», sieben Lesungen', [bestaetigt(keineDateien), keineDateien.prot.leseVor, tags(keineDateien).includes('printful-review-datei-wartet')], [false, 7, true]);
    const nurVorschau = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 1, files: [{ type: 'preview', status: 'ok' }] }])));
    ist('Fund 8 Nur eine Vorschau-Datei zählt nicht als Datei: nicht bestätigt, «datei-wartet»', [bestaetigt(nurVorschau), tags(nurVorschau).includes('printful-review-datei-wartet')], [false, true]);
    const falscheVar = lauf(bestellt([zeile()], mitItems([{ variant_id: 999, quantity: 1, files: [{ type: 'front', status: 'ok' }, { type: 'preview', status: 'ok' }] }])));
    ist('Fund 8 Printful nennt eine ANDERE Variante als gesendet (999 statt 4025): nicht bestätigt, Befund «entwurf-abweichend» nennt beide Zahlen', [bestaetigt(falscheVar), tags(falscheVar).includes('printful-review-entwurf-abweichend'), /999/.test(falscheVar.prot.tg[0] || ''), /4025/.test(falscheVar.prot.tg[0] || '')], [false, true, true, true]);
    const falscheMenge = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 2, files: [{ type: 'front', status: 'ok' }] }])));
    ist('Fund 8 Printful nennt eine andere Menge (2 statt 1): nicht bestätigt, «entwurf-abweichend»', [bestaetigt(falscheMenge), tags(falscheMenge).includes('printful-review-entwurf-abweichend')], [false, true]);
    const falscherTyp = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 1, files: [{ type: 'back', status: 'ok' }] }])));
    ist('Fund 8 Printful führt eine andere Platzierung (back statt front): nicht bestätigt, «entwurf-abweichend»', [bestaetigt(falscherTyp), tags(falscherTyp).includes('printful-review-entwurf-abweichend')], [false, true]);
    const zweiArtikel = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 1, files: [{ type: 'front', status: 'ok' }] }, { variant_id: 4025, quantity: 1, files: [{ type: 'front', status: 'ok' }] }])));
    ist('Fund 8 Printful nennt zwei Artikel statt einem: nicht bestätigt, «entwurf-abweichend»', [bestaetigt(zweiArtikel), tags(zweiArtikel).includes('printful-review-entwurf-abweichend')], [false, true]);
    const gleich = lauf(bestellt([zeile()], mitItems([{ variant_id: 4025, quantity: 1, files: [{ type: 'front', status: 'ok' }, { type: 'preview', status: 'ok' }] }])));
    ist('Fund 8 Gegenprobe: derselbe Entwurf mit Variante, Menge und Typ wie gesendet (plus Vorschau): bestätigt', [bestaetigt(gleich), hatReview(gleich)], [true, false]);
    for (const [n, costs] of [['ohne Währung', { total: '12.70', tax: '0.95' }], ['Währung leer', { currency: '', total: '12.70', tax: '0.95' }], ['Summe als Hexzahl «0x10»', { currency: 'USD', total: '0x10', tax: '0.95' }], ['Summe «1e1»', { currency: 'USD', total: '1e1' }], ['Summe 0.001 USD (nicht plausibel)', { currency: 'USD', total: '0.001', tax: '0' }], ['Summe als Array', { currency: 'USD', total: ['12.70'] }]]) {
      const e = lauf(bestellt([zeile()], { entwurf: { costs }, telegram: true }));
      ist(`Fund 8 Kosten ${n}: NICHT bestätigt, Befund «kosten-unbekannt»`, [bestaetigt(e), tags(e).includes('printful-review-kosten-unbekannt')], [false, true]);
    }
  }

  // ── Fund 9: ein schon vorhandener Printful-Auftrag mit unserer external_id muss zu DIESER Bestellung passen
  {
    const fremd = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', recipient: { name: 'FREMDE PERSON', zip: '10115', country_code: 'DE' } } }], telegram: true }));
    ist('Fund 9 Vorhandener Auftrag mit FREMDEM Empfänger (wiederverwendete Bestellnummer): die Bestellung gilt NICHT als erledigt (kein Tag printful-synced, kein Metafeld), harter Befund «vorhanden-fremd», eine 🔴-Meldung, nichts angelegt', [...gesperrt(fremd), tags(fremd).includes('printful-synced'), tags(fremd).includes('printful-review-vorhanden-fremd'), fremd.prot.mf.length, tgAnzahl(fremd), /🔴/.test(fremd.prot.tg[0] || ''), /Name des Empfängers/.test(fremd.prot.tg[0] || ''), /FREMDE/.test(fremd.prot.tg.join(' '))], [0, 0, false, true, 0, 1, true, true, false]);
    const anderePlz = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', recipient: { name: 'T', zip: '8000', country_code: 'CH' } } }] }));
    ist('Fund 9 Dieselbe Person, andere PLZ: ebenfalls «vorhanden-fremd»', [tags(anderePlz).includes('printful-review-vorhanden-fremd'), tags(anderePlz).includes('printful-synced')], [true, false]);
    const anderesLand = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', recipient: { name: 'T', zip: '4000', country_code: 'DE' } } }] }));
    ist('Fund 9 Anderes Land: «vorhanden-fremd»', tags(anderesLand).includes('printful-review-vorhanden-fremd'), true);
    const andereMenge = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', items: [{ quantity: 7 }] } }] }));
    ist('Fund 9 Andere Stückzahl (7 statt 1): «vorhanden-fremd»', [tags(andereMenge).includes('printful-review-vorhanden-fremd'), tags(andereMenge).includes('printful-synced')], [true, false]);
    const ohneEmpfaenger = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', recipient: null } }] }));
    ist('Fund 9 Der Empfänger des vorhandenen Auftrags ist nicht lesbar: «vorhanden-fremd» (nie still erledigt)', tags(ohneEmpfaenger).includes('printful-review-vorhanden-fremd'), true);
    const ohneArtikel = lauf(bestellt([zeile()], { lookup: [{ status: 200, order: { status: 'pending', items: null } }] }));
    ist('Fund 9 Die Artikel des vorhandenen Auftrags sind nicht lesbar: «vorhanden-fremd»', tags(ohneArtikel).includes('printful-review-vorhanden-fremd'), true);
    const reihenfolge = lauf(bestellt([zeile()], { order: { shippingAddress: { name: 'Max Muster', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' } }, lookup: [{ status: 200, order: { status: 'pending', recipient: { name: 'Muster, MAX', zip: '4000', country_code: 'ch' } } }] }));
    ist('Fund 9 Gegenprobe: Name in anderer Reihenfolge/Schreibung und Land klein geschrieben passt: erledigt (Tag printful-synced), kein Befund', [tags(reihenfolge).includes('printful-synced'), hatReview(reihenfolge)], [true, false]);
    const doppel = lauf(bestellt([zeile({ quantity: 2, currentQuantity: 2 })], { lookup: [{ status: 200, order: { status: 'pending', items: [{ quantity: 2 }] } }] }));
    ist('Fund 9 Gegenprobe: Menge 2 bestellt, Menge 2 bei Printful: passt', [tags(doppel).includes('printful-synced'), hatReview(doppel)], [true, false]);
  }

  // ── Fund 14: der Deckel «MAX Bestellungen je Lauf» hält auch, wenn eine Seite mehr liefert
  {
    const pod = (n) => knoten([zeile()], { id: 'gid://shopify/Order/' + n, name: '#P' + n });
    const m = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: [pod(1), pod(2), pod(3), pod(4), pod(5)] }], env: { MAX: '2' } });
    ist('Fund 14 Fünf POD-Bestellungen auf EINER Seite, MAX=2: genau die ersten zwei werden bearbeitet (nicht fünf)', [m.prot.posts.map((p) => p.body.external_id), m.prot.shop.length], [['LXP1', 'LXP2'], 1]);
  }

  // ── Fund 22: ein Editor-Produkt druckt nie das Muster aus dem Metafeld (siehe auch oben bei den Fertig-Produkten)
}

// ── Fund 13: Feldtreue. Die Attrappe liefert nur die Felder, die die Abfrage NENNT. Jedes Feld, das der Kleber braucht, muss darum in der Abfrage stehen; diese Szenarien machen jedes Feld unverzichtbar
{
  const vollAdresse = { name: 'Max Muster', firstName: 'Max', lastName: 'Muster', address1: 'Weg 1', address2: '2. Stock', city: 'Basel', provinceCode: 'BS', countryCodeV2: 'CH', zip: '4000', phone: '+41 61 000 00 00' };
  const e = lauf(sz1([zeile()], { order: { email: 'kundin@example.ch', shippingAddress: vollAdresse } }));
  ist('Fund 13 Feldtreue: der Empfänger an Printful trägt jedes Adressfeld und die E-Mail aus der Bestellung', e.prot.posts[0] && e.prot.posts[0].body.recipient, { name: 'Max Muster', address1: 'Weg 1', address2: '2. Stock', city: 'Basel', state_code: 'BS', country_code: 'CH', zip: '4000', email: 'kundin@example.ch', phone: '+41 61 000 00 00' });
  const ohneName = lauf(sz1([zeile()], { order: { shippingAddress: { ...vollAdresse, name: undefined } } }));
  ist('Fund 13 Feldtreue: ohne «name» setzt sich der Empfängername aus Vor- und Nachname zusammen', ohneName.prot.posts[0] && ohneName.prot.posts[0].body.recipient.name, 'Max Muster');

  const viele = lauf(sz1([zeile()], { order: { lineItems: { pageInfo: { hasNextPage: true }, edges: [{ node: zeile() }] } }, telegram: true }));
  ist('Fund 13 Feldtreue: mehr Positionen, als eine Abfrage liefert (pageInfo.hasNextPage der Positionsliste) → harter Befund «positionen-viele», kein Auftrag', [viele.prot.posts.length, tags(viele).includes('printful-review-positionen-viele')], [0, true]);

  const widerspruch = lauf(sz1([zeile({ sku: '5599797_4025', variant: { sku: '5599797_999' } })]));
  ist('Fund 13 Feldtreue: SKU der Position (4025) und SKU der Variante (999) werden beide gelesen: weicher Befund «sku-widerspruch», es gilt die der Position', [tags(widerspruch).includes('printful-review-sku-widerspruch'), widerspruch.prot.posts[0] && widerspruch.prot.posts[0].body.items[0].variant_id], [true, 4025]);

  const nurVariante = lauf(sz1([zeile({ sku: null, variant: { sku: '5599797_4025' } })]));
  ist('Fund 13 Feldtreue: ohne SKU an der Position gilt die der Variante (Rückfall)', nurVariante.prot.posts[0] && nurVariante.prot.posts[0].body.items[0].variant_id, 4025);

  const teil = lauf(sz1([zeile({ quantity: 2, currentQuantity: 1 })], { env: { PRINTFUL_MIN_NETTO_CHF: '20' } }));
  ist('Fund 13 Feldtreue: bei teilweise entfernter Position (2 bestellt, 1 übrig) zählt nur der anteilige Umsatz (24.95 statt 49.90): der Gewinn liegt unter dem Mindestgewinn 20 → Befund «kosten», nicht bestätigt', [bestaetigt(teil), tags(teil).includes('printful-review-kosten'), teil.prot.posts[0] && teil.prot.posts[0].body.items[0].quantity], [false, true, 1]);
  const ganz = lauf(sz1([zeile({ quantity: 2, currentQuantity: 2 })], { env: { PRINTFUL_MIN_NETTO_CHF: '20' } }));
  ist('Fund 13 Feldtreue: Gegenprobe: nichts entfernt (2 von 2) → voller Umsatz, Gewinn über 20, bestätigt', [bestaetigt(ganz), ganz.prot.posts[0] && ganz.prot.posts[0].body.items[0].quantity], [true, 2]);

  const fertig = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'T-Shirts', tags: ['printful_personalized_product'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } } })]));
  ist('Fund 13 Feldtreue/Fund 22: Fertigware (nur Tag printful_personalized_product) druckt das Motiv aus dem Produkt-Metafeld custom.print_file (auf die Vorderseite des T-Shirts, Typ «front» laut Dateiliste)', fertig.prot.posts[0] && fertig.prot.posts[0].body.items[0].files, [{ type: 'front', url: 'https://bilder.luxestyle.ch/motiv.png' }]);
  const editorMf = lauf(sz1([zeile({ customAttributes: [], product: { productType: 'T-Shirts', tags: ['wunschdesign'], metafield: { value: 'https://bilder.luxestyle.ch/motiv.png' } } })], { telegram: true }));
  ist('Fund 22: ein Editor-Produkt (Tag wunschdesign) druckt NIE das Metafeld-Muster: ohne Design der Kundin harter Befund «keine-druckdatei», kein Auftrag', [editorMf.prot.posts.length, tags(editorMf).includes('printful-review-keine-druckdatei')], [0, true]);

  // Markierung scheitert: nichts angelegt
  const markFehlt = lauf(sz1([zeile()], { tagFehler: 'userErrors', tagFehlerAb: 0, telegram: true }));
  ist('Fund 6: lässt sich die Markierung vor dem Anlegen nicht setzen, wird NICHTS angelegt, Fehler «Markierung vor dem Anlegen nicht gesetzt», Exit 1', [markFehlt.prot.posts.length, markFehlt.prot.err.some((x) => /Markierung vor dem Anlegen nicht gesetzt/.test(x)), markFehlt.prot.exitCode], [0, true, 1]);

  // Knoten-ID der frischen Lesung passt nicht
  const fremdeId = lauf(sz1([zeile()], { frischFolge: [{ id: 'gid://shopify/Order/999' }] }));
  ist('Fund 1: die frisch gelesene Bestellung trägt eine andere ID → «unlesbar»: nichts angelegt, Versuchszähler, Exit 1', [fremdeId.prot.posts.length, tags(fremdeId), fremdeId.prot.exitCode], [0, ['printful-versuch-1'], 1]);
  const ohneTags = lauf(sz1([zeile()], { frischFolge: [{ tags: null }] }));
  ist('Fund 1: die frische Lesung trägt kein Feld «tags» → «unlesbar»: nichts angelegt, Exit 1, der Versuchszähler steht (kein „unerwarteter Fehler“ durch eine Ausnahme)', [ohneTags.prot.posts.length, ohneTags.prot.exitCode, tags(ohneTags), ohneTags.prot.err.some((x) => /unerwarteter Fehler/.test(x))], [0, 1, ['printful-versuch-1'], false]);
  const ohneTagsSpaet = lauf(sz1([zeile()], { frischFolge: [{}, { tags: null }] }));
  ist('Fund 1: …beim zweiten Lesen (vor dem Bestätigen) ohne «tags» wird NICHT bestätigt (das Stopp-Tag printful-review lässt sich dann nicht prüfen; früher: bestätigt), Entwurf bleibt, Befund «zahlung-unlesbar»', [bestaetigt(ohneTagsSpaet), tags(ohneTagsSpaet).includes('printful-review-zahlung-unlesbar'), ohneTagsSpaet.prot.posts.length], [false, true, 1]);
  const leseNullTest = lauf(sz1([zeile()], { frischFolge: [{ test: null }] }));
  ist('Fund 1: fehlt in der frischen Lesung das Feld «test», ist das unlesbar: nichts angelegt, Versuchszähler statt Ausnahme', [leseNullTest.prot.posts.length, leseNullTest.prot.exitCode, tags(leseNullTest), leseNullTest.prot.err.some((x) => /unerwarteter Fehler/.test(x))], [0, 1, ['printful-versuch-1'], false]);

  // Fund 21: die Rechte-Abfrage im Trockenlauf bringt Exit 1, aber der Lauf liest weiter und legt nichts an
  const trockenRecht = lauf(sz1([zeile()], { scopes: ['read_orders'], env: { DRY_RUN: '1' } }));
  ist('Fund 21: im Trockenlauf mit fehlendem Recht wird weiter gelesen (Zusammenfassung), aber nichts angelegt', [trockenRecht.prot.shop.length >= 1, trockenRecht.prot.posts.length, trockenRecht.prot.log.some((l) => /\[DRY\] #T1/.test(l))], [true, 0, true]);
}


// ═════════════════════════════════════════════════════════════ ZWEITE RUNDE 10.11.2026 (drei Gegenleser nach der Härtung P1): Fulfillment-Status, Stand beim Bestätigen, Anspruch, Mengen, Quellen, Konfiguration
{
  const bestellt = (zeilen = [zeile()], extra = {}) => sz1(zeilen, extra);
  const gesperrt = (e) => [e.prot.posts.length, e.prot.confirms.length];
  const z1 = zeile();
  const foMit = (status, ort) => { const f = fos([z1], ort); return { ...f, edges: [{ node: { ...f.edges[0].node, status } }] }; };

  // ── Linse 1, Fund 1: Fulfillment-Order-Status ist eine WHITELIST (nur OPEN und IN_PROGRESS sind druckbar)
  for (const st of ['ON_HOLD', 'SCHEDULED', 'INCOMPLETE', '', 'WEIRD']) {
    const e = lauf(bestellt([z1], { order: { fulfillmentOrders: foMit(st) }, telegram: true }));
    ist(`R2 L1/1 Fulfillment-Order «${st || '(leer)'}»: HARTER Befund «fulfillment-gehalten», KEIN Auftrag, keine Netzabfrage für die Position, eine 🔴-Meldung (früher: angelegt und bestätigt)`, [...gesperrt(e), tags(e).includes('printful-review-fulfillment-gehalten'), tgAnzahl(e), /🔴/.test(e.prot.tg[0] || ''), e.prot.variantGets.length, e.prot.exitCode], [0, 0, true, 1, true, 0, 0]);
  }
  for (const st of ['OPEN', 'IN_PROGRESS']) { const e = lauf(bestellt([z1], { order: { fulfillmentOrders: foMit(st) } })); ist(`R2 L1/1 Gegenprobe: Fulfillment-Order ${st} ist druckbar: Auftrag, bestätigt`, [e.prot.posts.length, bestaetigt(e)], [1, true]); }
  const gehaltenDienst = lauf(bestellt([z1], { order: { fulfillmentOrders: foMit('ON_HOLD', FO_DIENST) }, telegram: true }));
  ist('R2 L1/1 Gehaltene Order am DIENST-Standort: bleibt «dienst-standort» (der Dienst hat Vorrang), kein Auftrag', [...gesperrt(gehaltenDienst), tags(gehaltenDienst).includes('printful-review-dienst-standort')], [0, 0, true]);
  const gehaltenUndOffen = lauf(bestellt([z1], { order: { fulfillmentOrders: { pageInfo: { hasNextPage: false }, edges: [foMit('ON_HOLD').edges[0], { node: { ...fos([z1]).edges[0].node, id: 'f2' } }] } } }));
  ist('R2 L1/1 Eine gehaltene UND eine offene Order derselben Position: gehalten gewinnt, kein Auftrag', [...gesperrt(gehaltenUndOffen), tags(gehaltenUndOffen).includes('printful-review-fulfillment-gehalten')], [0, 0, true]);
  // Das Halten kommt NACH der Liste: vor dem Anlegen (erstes frisches Lesen) und vor dem Bestätigen (zweites)
  const halt0 = lauf(bestellt([z1], { frischFolge: [{ fulfillmentOrders: foMit('ON_HOLD') }], telegram: true }));
  ist('R2 L1/1 Die Order wird zwischen Liste und Anlegen gehalten: NICHTS angelegt, keine Markierung, kein Tag, keine Meldung, Exit 0, Log «veralteten Stand»', [...gesperrt(halt0), halt0.prot.tags.length, tgAnzahl(halt0), halt0.prot.exitCode, halt0.prot.log.some((l) => /veralteten Stand/.test(l)), halt0.prot.anspruch.length], [0, 0, 0, 0, 0, true, 0]);
  const halt1 = lauf(bestellt([z1], { frischFolge: [{}, { fulfillmentOrders: foMit('ON_HOLD') }], telegram: true }));
  ist('R2 L1/1 Die Order wird zwischen Anlegen und Bestätigen gehalten (der Haken des Prüfers): der Entwurf bleibt, NICHT bestätigt, weicher Befund «bestellung-geaendert» nennt ON_HOLD und den Entwurf', [halt1.prot.posts.length, halt1.prot.confirms.length, tags(halt1).includes('printful-review-bestellung-geaendert'), tags(halt1).includes('printful-confirmed'), /ON_HOLD/.test(halt1.prot.tg[0] || ''), /Entwurf #42/.test(halt1.prot.tg[0] || ''), /🟡/.test(halt1.prot.tg[0] || '')], [1, 0, true, false, true, true, true]);
  const zumDienst = lauf(bestellt([z1], { frischFolge: [{}, { fulfillmentOrders: fos([z1], FO_DIENST) }] }));
  ist('R2 L1/1 Die Position wandert vor dem Bestätigen an den Dienst-Standort: nicht bestätigt, «bestellung-geaendert»', [zumDienst.prot.confirms.length, tags(zumDienst).includes('printful-review-bestellung-geaendert')], [0, true]);
  const foWeg = lauf(bestellt([z1], { frischFolge: [{}, { fulfillmentOrders: '__WEG__' }] }));
  ist('R2 L1/1 Fehlt das Feld fulfillmentOrders in der frischen Lesung vor dem Bestätigen: nicht bestätigt, «zahlung-unlesbar» (nie «unverändert»)', [bestaetigt(foWeg), tags(foWeg).includes('printful-review-zahlung-unlesbar')], [false, true]);
  ist('R2 L1/1 Die frische Abfrage liest die Fulfillment-Orders samt Status und Standort', [/fulfillmentOrders\(first:20\)/.test(halt1.prot.frischQuery), /status assignedLocation\{ location\{ id name isFulfillmentService/.test(halt1.prot.frischQuery)], [true, true]);

  // ── Linse 1, Fund 2: das frische Lesen vor dem Bestätigen vergleicht Adresse, Positionen, Mengen und das Stopp-Tag
  {
    const adr = (o) => ({ name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000', ...o });
    for (const [n, f, text] of [['Strasse und Ort', { shippingAddress: adr({ address1: 'Neue Strasse 99', city: 'Bern', zip: '3000' }) }, /Lieferadresse/], ['Land (US)', { shippingAddress: adr({ countryCodeV2: 'US' }) }, /Lieferadresse/], ['E-Mail', { email: 'andere@b.ch' }, /Lieferadresse oder E-Mail/], ['Name', { shippingAddress: adr({ name: 'Anderer Name' }) }, /Lieferadresse/], ['Telefon', { shippingAddress: adr({ phone: '+41 79 000 00 00' }) }, /Lieferadresse/]]) {
      const e = lauf(bestellt([z1], { frischFolge: [{}, f], telegram: true }));
      ist(`R2 L1/2 ${n} nach dem Anlegen geändert (Zahlung bleibt PAID): der Entwurf bleibt, NICHT bestätigt, Befund «bestellung-geaendert», Meldung nennt die Änderung`, [e.prot.posts.length, e.prot.confirms.length, tags(e).includes('printful-review-bestellung-geaendert'), tags(e).includes('printful-confirmed'), text.test(e.prot.tg[0] || '')], [1, 0, true, false, true]);
    }
    const adrWeg = lauf(bestellt([z1], { frischFolge: [{}, { shippingAddress: null }] }));
    ist('R2 L1/2 Die Lieferadresse ist nach dem Anlegen WEG (null): nicht bestätigt, «bestellung-geaendert»', [adrWeg.prot.confirms.length, tags(adrWeg).includes('printful-review-bestellung-geaendert')], [0, true]);
    const entfernt = lauf(bestellt([z1], { frischFolge: [{}, { lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: { ...z1, quantity: 1, currentQuantity: 0 } }] } }] }));
    ist('R2 L1/2 Die Position entfällt nach dem Anlegen (currentQuantity 0, Zahlung bleibt PAID): nicht bestätigt, «bestellung-geaendert»', [entfernt.prot.confirms.length, tags(entfernt).includes('printful-review-bestellung-geaendert')], [0, true]);
    const menge = lauf(bestellt([z1], { frischFolge: [{}, { lineItems: { pageInfo: { hasNextPage: false }, edges: [{ node: { ...z1, quantity: 3, currentQuantity: 3 } }] } }] }));
    ist('R2 L1/2 Die Menge ändert sich nach dem Anlegen (1 → 3): nicht bestätigt', [menge.prot.confirms.length, tags(menge).includes('printful-review-bestellung-geaendert')], [0, true]);
    const leer = lauf(bestellt([z1], { frischFolge: [{}, { lineItems: { pageInfo: { hasNextPage: false }, edges: [] } }] }));
    ist('R2 L1/2 Die Positionsliste ist nach dem Anlegen leer: nicht bestätigt', [leer.prot.confirms.length, tags(leer).includes('printful-review-bestellung-geaendert')], [0, true]);
    const stopp = lauf(bestellt([z1], { frischFolge: [{}, { tags: ['printful-review'] }], telegram: true }));
    ist('R2 L1/2 Das Stopp-Tag printful-review steht beim zweiten Lesen (das dokumentierte Stopp-Signal): nicht bestätigt, der Entwurf bleibt, «bestellung-geaendert» nennt das Tag', [stopp.prot.posts.length, stopp.prot.confirms.length, tags(stopp).includes('printful-review-bestellung-geaendert'), /printful-review/.test(stopp.prot.tg[0] || '')], [1, 0, true, true]);
    for (const [n, f] of [['shippingAddress', { shippingAddress: '__WEG__' }], ['email', { email: '__WEG__' }], ['lineItems', { lineItems: '__WEG__' }]]) {
      const e = lauf(bestellt([z1], { frischFolge: [{}, f] }));
      ist(`R2 L1/2 Fehlt das Feld ${n} in der frischen Lesung vor dem Bestätigen: nicht bestätigt, «zahlung-unlesbar» (nie «unverändert»)`, [bestaetigt(e), tags(e).includes('printful-review-zahlung-unlesbar')], [false, true]);
    }
    const aend0 = lauf(bestellt([z1], { frischFolge: [{ shippingAddress: adr({ city: 'Bern' }) }], telegram: true }));
    ist('R2 L1/2 Die Adresse ändert sich zwischen Liste und Anlegen: NICHTS angelegt (der Plan beruht auf einem veralteten Stand), keine Tags, keine Meldung, Exit 0', [...gesperrt(aend0), aend0.prot.tags.length, tgAnzahl(aend0), aend0.prot.exitCode], [0, 0, 0, 0, 0]);
    {
      // Sichtbar, nicht still: eine Bestellung, die beim Anlegen als geändert gilt, steht mit Nummer in der Zusammenfassung (sonst bliebe ein dauerhafter Unterschied zwischen Liste und frischem Lesen unbemerkt)
      const ds = '/tmp/ps_summary_geaendert_' + process.pid + '.md';
      const sicht = lauf(bestellt([z1], { frischFolge: [{ shippingAddress: adr({ city: 'Bern' }) }], env: { GITHUB_STEP_SUMMARY: ds } }));
      const text = readFileSync(ds, 'utf8'); try { rmSync(ds); } catch { /* egal */ }
      ist('R2 L1/2 …die Zusammenfassung nennt die Bestellung mit «wartet (die Bestellung hat sich seit dem Planen geändert», zählt sie unter «später wieder» und es bleibt bei Exit 0', [/- #T1: wartet \(die Bestellung hat sich seit dem Planen geändert/.test(text), /1 später wieder/.test(sicht.prot.log[sicht.prot.log.length - 1]), sicht.prot.exitCode], [true, true, 0]);
    }
    ist('R2 L1/2 Die frische Abfrage liest Adresse samt E-Mail und die Positionen mit Menge', [/\bemail\b/.test(stopp.prot.frischQuery), /shippingAddress\{[^}]*zip phone/.test(stopp.prot.frischQuery), /lineItems\(first:50\)\{ edges\{ node\{ currentQuantity quantity id/.test(stopp.prot.frischQuery)], [true, true, true]);
  }

  // ── Linse 1, Fund 3: Anspruch mit Nachlesen. Wer unter den aktiven Markierungen NICHT die kleinste hat, legt nichts an.
  {
    const e = lauf(bestellt([z1]));
    ist('R2 L1/3 Normalfall: die Markierung hat Sekunden, Millisekunden und einen Zufallsteil, danach werden die Tags EINMAL nachgelesen (nur Tags), dann angelegt', [/^printful-anlegen-\d{8}t\d{4}-\d{5}-[a-z0-9]{8}$/.test(markenTags(e)[0]), e.prot.anspruch.length, /id tags/.test(e.prot.anspruchQuery) && !/displayFinancialStatus/.test(e.prot.anspruchQuery), e.prot.posts.length, bestaetigt(e)], [true, 1, true, 1, true]);
    ist('R2 L1/3 Zwei Läufe erzeugen verschiedene Markierungen (Zufallsteil)', new Set([markenTags(lauf(bestellt([z1])))[0], markenTags(lauf(bestellt([z1])))[0]]).size, 2);
    for (const [n, rivale] of [['ein anderer Lauf hat 5 s FRÜHER markiert', 'frueher'], ['früher und später', 'beide']]) {
      const x = lauf(bestellt([z1], { rivale, telegram: true }));
      ist(`R2 L1/3 ${n}: NICHTS angelegt, nicht bestätigt, kein Fehler, keine Meldung, Log «früher markiert»; die eigene Markierung bleibt stehen`, [...gesperrt(x), x.prot.exitCode, tgAnzahl(x), x.prot.log.some((l) => /früher markiert/.test(l)), markenTags(x).length, tags(x).includes('printful-synced')], [0, 0, 0, 0, true, 1, false]);
    }
    for (const [n, rivale] of [['ein anderer Lauf hat 5 s SPÄTER markiert (er unterliegt, nicht wir)', 'spaeter'], ['eine Markierung von vor 70 Minuten zählt nicht mehr', 'alt']]) {
      const x = lauf(bestellt([z1], { rivale }));
      ist(`R2 L1/3 ${n}: angelegt und bestätigt`, [x.prot.posts.length, bestaetigt(x)], [1, true]);
    }
    const ohneEigene = lauf(bestellt([z1], { anspruchOhneEigene: true }));
    ist('R2 L1/3 Die eigene Markierung ist beim Nachlesen nicht zu sehen: NICHTS angelegt, aber SICHTBAR (Fehler «nicht nachlesbar», Exit 1; es ist ein Lesefehler und kein Verlust gegen einen anderen Lauf, sonst bliebe die Bestellung bei jedem Lauf still liegen)', [...gesperrt(ohneEigene), ohneEigene.prot.err.some((l) => /nicht nachlesbar/.test(l)), ohneEigene.prot.exitCode, ohneEigene.prot.log.some((l) => /früher markiert/.test(l))], [0, 0, true, 1, false]);
    for (const f of ['http', 'null']) {
      const x = lauf(bestellt([z1], { anspruchFehler: f }));
      ist(`R2 L1/3 Das Nachlesen der Markierung scheitert (${f}): NICHTS angelegt, Fehler «nicht nachlesbar», Exit 1`, [...gesperrt(x), x.prot.err.some((l) => /nicht nachlesbar/.test(l)), x.prot.exitCode], [0, 0, true, 1]);
    }
    const reihenfolge = lauf(bestellt([z1]));
    ist('R2 L1/3 Reihenfolge: Markierung setzen, DANN Tags nachlesen, DANN POST (die Tag-Aufrufe stehen vor dem POST)', [reihenfolge.prot.folge.slice(0, 2).map((x) => x.replace(/\d{8}t\d{4}-\d{5}-[a-z0-9]{8}/, '<zeit>')), reihenfolge.prot.anspruch.length], [['tags:printful-anlegen-<zeit>', 'POST'], 1]);
  }

  // ── Linse 1, Fund 4: ein negativer Mindestgewinn hebt die Verlustsperre NICHT auf, er ist ein Konfigurationsfehler
  {
    const verlust = { entwurf: { costs: { currency: 'USD', subtotal: '60.00', discount: '0.00', shipping: '0.00', tax: '0.00', vat: '0.00', total: '60.00' } } };
    for (const v of ['-100', '-0.01', ' -5 ']) {
      const x = lauf(bestellt([z1], { ...verlust, env: { PRINTFUL_MIN_NETTO_CHF: v } }));
      ist(`R2 L1/4 PRINTFUL_MIN_NETTO_CHF=«${v}»: Konfigurationsfehler, Exit 1, nichts gelesen, nichts angelegt, die Meldung nennt die Variable`, [x.prot.ausstieg, x.prot.posts.length, x.prot.shop.length, x.prot.err.some((l) => /PRINTFUL_MIN_NETTO_CHF/.test(l) && /negativ/.test(l))], [1, 0, 0, true]);
    }
    const trockenNeg = lauf(bestellt([z1], { env: { PRINTFUL_MIN_NETTO_CHF: '-1', DRY_RUN: '1' } }));
    ist('R2 L1/4 …auch im TROCKENLAUF (der Mangel soll sichtbar werden, bevor die Freigabedatei liegt)', [trockenNeg.prot.ausstieg, trockenNeg.prot.shop.length], [1, 0]);
    for (const v of ['0', 'abc', '', '4', '1000']) {
      const x = lauf(bestellt([z1], { ...verlust, env: { PRINTFUL_MIN_NETTO_CHF: v } }));
      ist(`R2 L1/4 PRINTFUL_MIN_NETTO_CHF=«${v}»: kein Konfigurationsfehler; der Verlustauftrag (60 USD Kosten gegen 49.90 CHF Erlös) bleibt Entwurf, Befund «kosten»`, [x.prot.ausstieg ?? x.status, x.prot.posts.length, bestaetigt(x), tags(x).includes('printful-review-kosten')], [0, 1, false, true]);
    }
  }

  // ── Linse 1, Fund 5: eine unlesbare Menge wird nie als «1» gedruckt
  {
    const e = lauf(bestellt([zeile({ quantity: 0 })], { telegram: true }));
    ist('R2 L1/5 Menge unlesbar (quantity 0, kein currentQuantity): KEIN Auftrag, harter Befund «menge-unlesbar», eine 🔴-Meldung (früher: 1 Stück gedruckt und bestätigt)', [...gesperrt(e), tags(e).includes('printful-review-menge-unlesbar'), tgAnzahl(e), e.prot.variantGets.length], [0, 0, true, 1, 0]);
    const ok1 = lauf(bestellt([zeile({ quantity: 0, currentQuantity: 0 })]));
    ist('R2 L1/5 Gegenprobe: currentQuantity 0 (entfernt) ist KEIN unlesbarer Fall, sondern übergangen (kein Befund, kein Auftrag)', [...gesperrt(ok1), ok1.prot.tags.length], [0, 0, 0]);
    const ok2 = lauf(bestellt([zeile({ quantity: 2 })]));
    ist('R2 L1/5 Gegenprobe: quantity 2 ohne currentQuantity gilt (2 Stück)', [ok2.prot.posts[0] && ok2.prot.posts[0].body.items[0].quantity, bestaetigt(ok2)], [2, true]);
  }

  // ── Linse 1, Fund 6: Quelle der Druckdatei: eigener Datei-Pfad im Shopify-CDN, nur Grösse/Qualität/Format bei Cloudinary
  {
    for (const [n, u] of [['fremder cdn.shopify.com-Pfad', 'https://cdn.shopify.com/s/files/1/9999/9999/9999/files/evil.png'], ['Cloudinary-Überlagerung l_fetch', 'https://res.cloudinary.com/dwyi6kkrl/image/upload/l_fetch:aHR0cHM6Ly9ldmlsLmV4YW1wbGUveC5wbmc=/x.png'], ['Cloudinary-Überlagerung u_ / e_', 'https://res.cloudinary.com/dwyi6kkrl/image/upload/u_evil,e_blur:500/v1/x.png']]) {
      const e = lauf(bestellt([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', u)] })], { telegram: true }));
      ist(`R2 L1/6 ${n}: harter Befund «datei-adresse», KEIN Auftrag, die Adresse wird nie abgerufen`, [...gesperrt(e), tags(e).includes('printful-review-datei-adresse'), e.prot.dateien.length, e.prot.kiDateien.length], [0, 0, true, 0, 0]);
    }
    const eigen = lauf(bestellt([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/design.png')] })]));
    ist('R2 L1/6 Gegenprobe: eine Datei aus den EIGENEN Dateien des Shops im Shopify-CDN wird abgerufen und gedruckt', [eigen.prot.posts.length, bestaetigt(eigen)], [1, true]);
    const trafo = lauf(bestellt([zeile({ customAttributes: [A('🖼️ Druckdatei (front)', 'https://res.cloudinary.com/dwyi6kkrl/image/upload/c_limit,w_2000/v1/design.png')] })]));
    ist('R2 L1/6 Gegenprobe: Grössen-Transformation «c_limit,w_2000» bei Cloudinary bleibt erlaubt', [trafo.prot.posts.length, bestaetigt(trafo)], [1, true]);
    const rdFremd = lauf(bestellt([zeile()], { dateiPro: [{ match: 'Vorne', weiterleitung: 'https://cdn.shopify.com/s/files/1/9999/9999/9999/files/x.png' }] }));
    ist('R2 L1/6 Die Datei leitet auf einen FREMDEN Pfad im Shopify-CDN weiter: das Ziel wird nie abgerufen, Pixelgrösse nicht prüfbar → Entwurf, NICHT bestätigt (früher: bestätigt)', [rdFremd.prot.dateien.length, bestaetigt(rdFremd), tags(rdFremd).includes('printful-review-aufloesung')], [1, false, true]);
  }

  // ── Linse 1, Fund 8: Trockenlauf mit eingeschalteter KI sendet nichts an Google
  {
    const e = lauf(bestellt([z1], { env: { DRY_RUN: '1' } }));
    ist('R2 L1/8 Trockenlauf mit KI «pflicht» und Schlüssel: KEIN Aufruf an Gemini, kein Bild für die Kontrolle geladen, kein Befund «kontrolle-…», nichts geschrieben, Log nennt die ausgelassene KI', [e.prot.gemini.length, e.prot.kiDateien.length, e.prot.posts.length, e.prot.tags.length, e.prot.log.some((l) => /KI-Kontrolle der Druckdatei \(im Trockenlauf nicht ausgeführt\)/.test(l)), e.prot.log.some((l) => /REVIEW: .*kontrolle/.test(l))], [0, 0, 0, 0, true, false]);
    const scharf = lauf(bestellt([z1]));
    ist('R2 L1/8 Gegenprobe: scharf wird die KI weiter gefragt (ein Aufruf, ein Bild)', [scharf.prot.gemini.length, scharf.prot.kiDateien.length], [1, 1]);
  }

  // ── Linse 2, Fund 2: zwei gültige Editor-Positionen Ende zu Ende; ein Artikel ohne Datei gibt den Entwurf nie frei
  {
    const zwei = [zeile({ id: 'gid://shopify/LineItem/9001' }), zeile({ id: 'gid://shopify/LineItem/9002', customAttributes: [A('🖼️ Druckdatei (Vorne)', V('zweite'))] })];
    const e = lauf(bestellt(zwei, { telegram: true }));
    ist('R2 L2/2 Zwei Editor-Positionen: EIN Auftrag mit ZWEI Artikeln (external_id 9001 und 9002, je Menge 1, je eine Datei), bestätigt', [e.prot.posts.length, e.prot.posts[0] && e.prot.posts[0].body.items.map((i) => [i.external_id, i.quantity, i.files.map((f) => f.type)]), e.prot.confirms.length, bestaetigt(e), hatReview(e)], [1, [['9001', 1, ['front']], ['9002', 1, ['front']]], 1, true, false]);
    ist('R2 L2/2 …die beiden Dateien sind die der beiden Positionen (zwei verschiedene Adressen)', e.prot.posts[0] && e.prot.posts[0].body.items.map((i) => i.files[0].url), [V('Vorne'), V('zweite')]);
    const drei = lauf(bestellt([zeile({ id: 'gid://shopify/LineItem/9001', quantity: 2 }), zeile({ id: 'gid://shopify/LineItem/9002', quantity: 1, customAttributes: [A('🖼️ Druckdatei (Vorne)', V('zweite'))] })]));
    ist('R2 L2/2 Zwei Positionen mit Menge 2 und 1: beide Mengen gehen mit', drei.prot.posts[0] && drei.prot.posts[0].body.items.map((i) => i.quantity), [2, 1]);
    const dat = (n) => ({ variant_id: 4025, quantity: 1, files: n ? [{ type: 'front', status: 'ok' }, { type: 'preview', status: 'ok' }] : [] });
    const zweiteOhne = lauf(bestellt(zwei, { entwurf: { items: [dat(1), dat(0)] }, telegram: true }));
    ist('R2 L2/2 Printful führt nur beim ERSTEN Artikel eine Datei, beim zweiten keine: NICHT bestätigt, nach der Wartezeit «datei-wartet» (Text nennt den Artikel ohne Datei) UND «entwurf-abweichend»; sieben Lesungen', [bestaetigt(zweiteOhne), tags(zweiteOhne).includes('printful-review-datei-wartet'), tags(zweiteOhne).includes('printful-review-entwurf-abweichend'), /Mindestens ein Artikel/.test(zweiteOhne.prot.tg[0] || ''), zweiteOhne.prot.leseVor], [false, true, true, true, 7]);
    const ersteOhne = lauf(bestellt(zwei, { entwurf: { items: [dat(0), dat(1)] } }));
    ist('R2 L2/2 …ebenso wenn nur der ZWEITE Artikel eine Datei führt', [bestaetigt(ersteOhne), tags(ersteOhne).includes('printful-review-datei-wartet')], [false, true]);
    const beide = lauf(bestellt(zwei, { entwurf: { items: [dat(1), dat(1)] } }));
    ist('R2 L2/2 Gegenprobe: beide Artikel führen ihre Datei: bestätigt', [bestaetigt(beide), hatReview(beide)], [true, false]);
    const nurEine = lauf(bestellt(zwei, { post: [{}] }));
    ist('R2 L2/2 Es wird NICHT nur die erste Position gesendet (zwei Artikel im POST-Body)', nurEine.prot.posts[0] && nurEine.prot.posts[0].body.items.length, 2);
  }

  // ── Linse 2, Fund 5: vier kleine Lücken im Sync-Verhalten
  {
    const kaputt = lauf(bestellt([z1], { lesenNachStatus: 404, telegram: true }));
    ist('R2 L2/5 Der Status von Auftrag #42 ist nach dem Bestätigen NICHT lesbar: «BESTÄTIGT» steht nirgends, kein Tag printful-confirmed, Befund «status-unbekannt», die Bestätigung selbst ging raus', [kaputt.prot.confirms.length, tags(kaputt).includes('printful-confirmed'), tags(kaputt).includes('printful-review-status-unbekannt'), kaputt.prot.log.some((l) => /BESTÄTIGT/.test(l))], [1, false, true, false]);
    const pod = (n) => knoten([zeile()], { id: 'gid://shopify/Order/' + n, name: '#Q' + n });
    const viele = lauf({ vid: 4025, variant: [{ kat: 71 }], shopSeiten: [{ orders: Array.from({ length: 20 }, (_, i) => pod(i + 1)) }, { orders: [pod(21), pod(22)] }] });
    ist('R2 L2/5 Ohne MAX gilt die Vorgabe 20: bei 22 Kandidaten werden genau 20 bearbeitet', [viele.prot.posts.length, viele.prot.shop.length], [20, 1]);   // nach 20 Kandidaten wird nicht weitergelesen
    const trockenAbc = lauf(bestellt([z1], { env: { PRINTFUL_MAX_KOSTEN_USD: 'abc', PRINTFUL_AUTO_CONFIRM: '0', DRY_RUN: '1' } }));
    ist('R2 L2/5 PRINTFUL_MAX_KOSTEN_USD=abc ist auch im TROCKENLAUF ein Konfigurationsfehler (Exit 1, nichts gelesen)', [trockenAbc.prot.ausstieg, trockenAbc.prot.shop.length], [1, 0]);
    const ausKonfig = lauf(bestellt([z1], { env: { PRINTFUL_PAKET_BEZAHLT: 'back, Bad Wert', DRY_RUN: '1' } }));
    ist('R2 L2/5 Eine ungültige Platzierungs-ID in PRINTFUL_PAKET_BEZAHLT ist auch im Trockenlauf ein Konfigurationsfehler', [ausKonfig.prot.ausstieg, ausKonfig.prot.shop.length], [1, 0]);
  }
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
