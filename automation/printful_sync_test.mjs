// Verhaltenstest für den Bestellweg automation/printful_sync.mjs: die Platzierung der Druckdatei (files[].type) und die Folgen eines Fehlers bei der Variantenabfrage.
// Der Bestellweg läuft in einem KINDPROZESS gegen ein gefälschtes fetch (kein Netz, kein Shopify, kein Printful): Shopify liefert eine bezahlte POD-Bestellung, die
// Printful-Variantenabfrage antwortet je Szenario (echte Mitschnitte aus dropship/pod-auswahl/platzierung_mitschnitte.json, 503, 429, 404, Netzfehler). Geprüft wird, was
// an Printful GESENDET wird (POST /orders: Adresse mit oder ohne ?confirm=1, files[].type) und welche Tags die Bestellung bekommt.
// Warum so: vorher prüfte ein Test nur per Regex den Quelltext («printful_sync ruft platzierungFuer auf»). Fünf von fünf Mutanten an dieser Stelle überlebten, eine Regex
// auf «/products/variant/» traf sogar den Kommentar. Lauf: /opt/node22/bin/node automation/printful_sync_test.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const MIT = JSON.parse(readFileSync(fileURLToPath(new URL('../dropship/pod-auswahl/platzierung_mitschnitte.json', import.meta.url)), 'utf8')).mitschnitte;

// ═════════════════════════════════════════════════════════════ KINDPROZESS: ein Szenario
if (process.argv[2] === '--szenario') {
  const sz = JSON.parse(process.env.PS_SZENARIO);
  Object.assign(process.env, { PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', PRINTFUL_AUTO_CONFIRM: '1', PF_PLATZIERUNG_PAUSE_MS: '0' });
  for (const k of ['GEMINI_API_KEY', 'PRINTFUL_STORE_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'DRY_RUN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET']) delete process.env[k];
  const prot = { posts: [], tags: [], variantGets: [], variantSignale: [], postSignale: [], warn: [], log: [] };
  let fertig; const ende = new Promise((r) => { fertig = r; });
  const order = { id: 'gid://shopify/Order/1', name: '#T1', email: 'a@b.ch', shippingAddress: { name: 'T', address1: 'x', city: 'Basel', countryCodeV2: 'CH', zip: '4000' },
    lineItems: { edges: [{ node: { quantity: 1, sku: sz.sku, title: 'T', product: { productType: sz.pt, tags: ['wunschdesign'], metafield: null }, variant: { sku: sz.sku },
      customAttributes: sz.seiten.map((x) => ({ key: '🖼️ Druckdatei (' + x + ')', value: 'https://res.cloudinary.com/x/' + x + '.png' })) } }] } };
  const mk = (status, body, roh) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => (sz.retryAfter && String(k).toLowerCase() === 'retry-after' ? String(sz.retryAfter) : null) }, json: async () => { if (roh !== undefined) throw new Error('kein JSON'); return body; } });
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.includes('myshopify.com') && url.includes('graphql')) {
      const b = JSON.parse(o.body), q = b.query;
      if (q.includes('orders(first')) return mk(200, { data: { orders: { edges: [{ node: order }] } } });
      if (q.includes('shop {')) return mk(200, { data: { shop: { name: 'x' } } });
      if (q.includes('tagsAdd')) { prot.tags.push(...b.variables.tags); return mk(200, { data: {} }); }
      return mk(200, { data: {} });
    }
    if (url.includes('/products/variant/')) {
      prot.variantGets.push(url.split('/products/variant/')[1]); prot.variantSignale.push(!!o.signal);
      const r = sz.variant[Math.min(prot.variantGets.length - 1, sz.variant.length - 1)];
      if (r.wirft) throw new Error(r.wirft);
      if (r.roh !== undefined) return mk(r.status, null, r.roh);
      return mk(r.status, r.body);
    }
    if (url.includes('api.printful.com/orders')) { prot.postSignale.push(!!o.signal); prot.posts.push({ url, items: JSON.parse(o.body).items }); return mk(200, { result: { id: 42 } }); }
    return mk(200, {});
  };
  console.log = (...a) => { const t = a.join(' '); prot.log.push(t); if (/^Printful-Sync fertig:/.test(t)) fertig(); };
  console.warn = (...a) => { prot.warn.push(a.join(' ')); };
  console.error = (...a) => { prot.warn.push('ERR ' + a.join(' ')); };
  await import('./printful_sync.mjs');
  await Promise.race([ende, new Promise((r) => setTimeout(r, 20000))]);
  process.stdout.write('\nPS_ERGEBNIS ' + JSON.stringify(prot) + '\n');
  process.exit(0);
}

// ═════════════════════════════════════════════════════════════ PRÜFER
let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 600)}\n   soll: ${JSON.stringify(b).slice(0, 600)}`); } };

const lauf = (sz) => {
  const r = spawnSync(process.execPath, [SELF, '--szenario'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, PS_SZENARIO: JSON.stringify(sz) }, encoding: 'utf8', timeout: 90000 });
  const m = String(r.stdout).match(/PS_ERGEBNIS (.*)\n/);
  return { status: r.status, prot: m ? JSON.parse(m[1]) : null, stderr: r.stderr };
};
const antwort = (pid) => ({ status: 200, body: { result: { variant: { id: MIT[pid].variante }, product: MIT[pid].produkt } } });
const V = (s) => 'https://res.cloudinary.com/x/' + s + '.png';
/** Was an Printful ging: [bestätigt?, files[].type je Datei, Variantennummer] */
const gesendet = (e) => e.prot.posts.map((p) => [/\?confirm=1$/.test(p.url), p.items.map((i) => i.files.map((f) => f.type)), p.items.map((i) => i.variant_id)]);

// ── Gesicherte Fälle: der Printful-Typ der Variante entscheidet, die Bestellung wird bestätigt
for (const [name, sz, soll] of [
  ['Handyhülle (Shop-Art «Handy-Zubehör», Printful 798)', { pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [antwort(798)] }, ['default']],
  ['Tasse (Shop-Art «Tassen & Becher», Printful 19)', { pt: 'Tassen & Becher', sku: '111_1320', seiten: ['Vorne'], variant: [antwort(19)] }, ['default']],
  ['Poster (Printful 268)', { pt: 'Poster', sku: '9000001_8948', seiten: ['Vorne'], variant: [antwort(268)] }, ['default']],
  ['Magnet (Shop-Art «Magnet», Printful 656 ist technisch ein STICKER)', { pt: 'Magnet', sku: '111_16366', seiten: ['Vorne'], variant: [antwort(656)] }, ['default']],
  ['Mauspad (SUBLIMATION, Shop-Art «Accessoires»)', { pt: 'Accessoires', sku: '111_14943', seiten: ['Vorne'], variant: [antwort(583)] }, ['default']],
  ['Stoffbeutel (CUT-SEW mit nur «default», Shop-Art «Taschen»)', { pt: 'Taschen', sku: '111_4533', seiten: ['Vorne'], variant: [antwort(84)] }, ['default']],
  ['T-Shirt nur vorne (Printful 71)', { pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne'], variant: [antwort(71)] }, ['front']],
]) {
  const e = lauf(sz);
  ist(`${name}: genau ein Auftrag, bestätigt, Platzierung ${soll.join('/')}, eine Variantenabfrage mit Zeitlimit, Tag printful-confirmed`,
    [gesendet(e), e.prot.variantGets.length, e.prot.variantSignale, e.prot.tags.includes('printful-confirmed'), e.prot.tags.includes('printful-review')],
    [[[true, [soll], [Number(sz.sku.split('_').pop())]]], 1, [true], true, false]);
}
{ // Variantennummer und Pfad: GET /products/variant/<Nummer aus der SKU>
  const e = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [antwort(798)] });
  ist('Abfrage geht an /products/variant/20688 (die Nummer aus der SKU), die Bestellung an variant_id 20688, die Bestellung selbst OHNE Zeitlimit-Signal', [e.prot.variantGets, e.prot.posts[0].items[0].variant_id, e.prot.postSignale], [['20688'], 20688, [false]]);
}
{ // T-Shirt vorne + hinten: beide Seiten, URLs bleiben ihrer Seite zugeordnet, nur EINE Abfrage (Cache)
  const e = lauf({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne', 'Hinten'], variant: [antwort(71)] });
  ist('T-Shirt vorne+hinten: front mit der Vorne-Datei, back mit der Hinten-Datei, bestätigt, eine Abfrage', [e.prot.posts[0].items[0].files, e.prot.variantGets.length, /\?confirm=1$/.test(e.prot.posts[0].url)],
    [[{ type: 'front', url: V('Vorne') }, { type: 'back', url: V('Hinten') }], 1, true]);
  const h = lauf({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Hinten'], variant: [antwort(71)] });
  ist('nur eine Rückseite: Platzierung back (nicht front)', [h.prot.posts[0].items[0].files], [[{ type: 'back', url: V('Hinten') }]]);
  const hu = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Hinten'], variant: [antwort(798)] });
  ist('Hülle mit «Hinten»-Datei: bleibt default (die Hülle hat nur eine Platzierung)', hu.prot.posts[0].items[0].files.map((f) => f.type), ['default']);
}

// ── Fehler bei der Variantenabfrage (Befund 23): wiederholen; bleibt es dabei, nach Shop-Art zurückfallen, und wenn die nicht belegt ist, den Auftrag NICHT bestätigen
{
  const netz = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ wirft: 'ECONNRESET' }] });
  ist('Netzfehler, Shop-Art «Handy-Zubehör»: dreimal versucht, Rückfall front, Auftrag als ENTWURF (kein confirm), Tag printful-review, KEIN printful-confirmed',
    [netz.prot.variantGets.length, gesendet(netz), netz.prot.tags.includes('printful-review'), netz.prot.tags.includes('printful-confirmed'), netz.prot.log.some((l) => /ENTWURF \(Review\)/.test(l))], [3, [[false, [['front']], [20688]]], true, false, true]);
  ist('…die Warnung nennt Auftrag, Rückseite/Vorderseite und den Grund', netz.prot.warn.some((w) => /#T1/.test(w) && /Vorderseite nicht gesichert/.test(w) && /derzeit nicht lesbar \(Netzfehler\)/.test(w) && /Auftrag bleibt Entwurf/.test(w)), true);
  const h404 = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 404, body: { error: { message: 'nicht da' } } }] });
  ist('HTTP 404: endgültig, KEINE Wiederholung (eine Abfrage), Rückfall front, Entwurf', [h404.prot.variantGets.length, gesendet(h404), h404.prot.tags.includes('printful-review')], [1, [[false, [['front']], [20688]]], true]);
  const h502 = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 502, roh: '<html>Bad gateway</html>' }, antwort(798)] });
  ist('HTTP 502 (HTML), dann Erfolg: wiederholt, danach default und BESTÄTIGT', [h502.prot.variantGets.length, gesendet(h502), h502.prot.tags.includes('printful-confirmed')], [2, [[true, [['default']], [20688]]], true]);
  const h429 = lauf({ pt: 'Handy-Zubehör', sku: '3615382_20688', seiten: ['Vorne'], variant: [{ status: 429, body: { error: { message: 'Too many requests' } } }, antwort(798)], retryAfter: 0 });
  ist('HTTP 429, dann Erfolg: wiederholt, default, bestätigt', [h429.prot.variantGets.length, gesendet(h429)], [2, [[true, [['default']], [20688]]]]);
  const pn = lauf({ pt: 'Poster', sku: '9000001_8948', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] });
  ist('Netzfehler, Shop-Art «Poster» (alte Liste): Rückfall default ist belegt → bestätigt', [pn.prot.variantGets.length, gesendet(pn)], [3, [[true, [['default']], [8948]]]]);
  const mn = lauf({ pt: 'Magnet', sku: '111_16366', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] });
  ist('Netzfehler, Shop-Art «Magnet» (echte Shop-Art, alte Liste): Rückfall default, bestätigt', gesendet(mn), [[true, [['default']], [16366]]]);
  const tn = lauf({ pt: 'Tassen & Becher', sku: '111_1320', seiten: ['Vorne'], variant: [{ wirft: 'ETIMEDOUT' }] });
  ist('Netzfehler, Shop-Art «Tassen & Becher» (NICHT in der alten Liste): front geraten → Entwurf, nicht bestätigt', gesendet(tn), [[false, [['front']], [1320]]]);
  const sn = lauf({ pt: 'T-Shirts', sku: '5599797_4025', seiten: ['Vorne', 'Hinten'], variant: [{ wirft: 'ECONNRESET' }] });
  ist('Netzfehler beim Shirt: front/back aus der Shop-Art geraten → Entwurf mit zwei Hinweisen', [gesendet(sn), sn.prot.warn.filter((w) => /nicht gesichert/.test(w)).length], [[[false, [['front', 'back']], [4025]]], 2]);
}

// ── Dateiliste kennt die Seite nicht (Befund 26): bisherige Antwort, aber Entwurf
{
  const hose = lauf({ pt: 'Hosen', sku: '111_11038', seiten: ['Vorne'], variant: [antwort(400)] });
  ist('Jogginghose (right_leg/left_leg): front wie bisher, aber Entwurf mit Hinweis auf die Dateiliste', [gesendet(hose), hose.prot.warn.some((w) => /right_leg, left_leg, label_inside/.test(w))], [[[false, [['front']], [11038]]], true]);
  const ruck = lauf({ pt: 'Taschen', sku: '111_9063', seiten: ['Vorne', 'Hinten'], variant: [antwort(279)] });
  ist('Rucksack (kein «back»): Vorderseite gesichert, Rückseite nicht → Entwurf', [gesendet(ruck), ruck.prot.warn.filter((w) => /nicht gesichert/.test(w)).length], [[[false, [['front', 'back']], [9063]]], 1]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
