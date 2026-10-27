/**
 * Netz-Simulator für Tests des Varianten-Werkzeugs (automation/cj_varianten_nachziehen_lauf_test.mjs). NUR für Tests.
 * Wird mit `node --import automation/lib/test_netz_stub.mjs <werkzeug>` geladen und ersetzt `fetch` durch Antworten nach Szenario —
 * Shopify (Token, GraphQL), CJ (Produkt, Fracht) und Gemini. Kein Netz, kein echter Shop, keine echten Zugangsdaten.
 *
 * Szenario (JSON-Datei, Pfad in NETZ_SZENARIO):
 *   produkte: { <handle>: { pid, farben:[…], groessen:[…], stand?, bildUrl? } }
 *   set:      { <handle>: 'ok' | 'usererror' | 'fehler' | 'limit' }     (Vorgabe ok)  — Ausgang von productSet
 *   frisch:   { <handle>: { updatedAt?, tags?, descriptionHtml?, variantsCount? } }  — Abweichungen beim frischen Lesen
 *   cj:       { <handle>: 'ok' | 'http500' | 'quota' }                  (Vorgabe ok)  — Ausgang der CJ-Produktabfrage
 *   fracht:   { <handle>: 'ok' | 'http500' | 'leer' }                   (Vorgabe ok)  — Frachtabfrage: Liste / HTTP 500 / keine Linie (= nicht lieferbar)
 *   stecker:  { <handle>: [<Schlüssel je CJ-Variante>, …] }   — CJ-Produkt mit Stecker-Varianten (z. B. ['Black-US','Black-EU']); die Shop-SKU bleibt «CJ-<pid>», die CJ-Nummern haben die Engine-Form (CJTST1000100AZ …)
 *   skus:     { <handle>: [<SKU je CJ-Variante>, …] }                        — eigene CJ-Variantennummern für 'stecker'
 *   preise:   { <handle>: [<Einkaufspreis je CJ-Variante>, …] }              — eigene Preise für 'stecker'
 *   sku:      { <handle>: 'ok' | 'usererror' | 'null' | 'errors' | 'schweigt' } (Vorgabe ok)  — Ausgang von productVariantsBulkUpdate (SKU schreiben); 'schweigt' = Antwort ohne userErrors, aber die SKU stimmt nicht
 *   skuDoppelt: { <SKU>: <Handle eines anderen Produkts> | { handle, sku } }          — ein anderes Shop-Produkt trägt diese SKU schon (Antwort auf die Doppel-Abfrage productVariants(query:"sku:…"))
 *   skuLesen: { <handle>: 'weg' | 'zwei' | 'andere' }                             — Zustand beim frischen Lesen vor dem SKU-Schreiben: Produkt gelöscht / inzwischen zwei Varianten / SKU von jemand anderem geändert
 *   ki:       'ok' | 'down' | 'unveraendert'                            (Vorgabe ok)  — Gemini antwortet / fällt aus / gibt alles unverändert zurück
 *   kiMap:    { <englisch>: <deutsch> }
 * Jede Anfrage wird nach NETZ_LOG geschrieben (eine JSON-Zeile je Anfrage), damit Tests prüfen können, WAS gesendet wurde.
 * Jede unbekannte Adresse wirft — ein Test soll nie unbemerkt ins echte Netz gehen.
 */
import { readFileSync, appendFileSync } from 'node:fs';

const SZ = JSON.parse(readFileSync(process.env.NETZ_SZENARIO, 'utf8'));
const LOG = process.env.NETZ_LOG;
const logge = o => { if (LOG) appendFileSync(LOG, JSON.stringify(o) + '\n'); };
const antwort = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const SHOPSKU = {};   // Shop-SKU nach einem Schreibvorgang (der Stub merkt sie sich, damit das Rücklesen sie sieht)
const handles = Object.keys(SZ.produkte || {});
const skuNow = h => (h in SHOPSKU ? SHOPSKU[h] : 'CJ-' + SZ.produkte[h].pid);
const nummer = h => handles.indexOf(h) + 1;
const handleZuId = id => handles.find(h => `gid://shopify/Product/${nummer(h)}` === id);
const handleZuPid = pid => handles.find(h => String(SZ.produkte[h].pid) === String(pid));

function shopProdukt(h) {
  const x = SZ.produkte[h];
  return {
    id: `gid://shopify/Product/${nummer(h)}`, title: `Testprodukt ${h}`, status: 'ACTIVE', handle: h, tags: x.tags || ['sort-test', 'cj'],
    descriptionHtml: x.descriptionHtml || `<p>Beschreibung ${h}</p>`, updatedAt: x.stand || '2026-10-26T10:00:00Z',
    options: [{ id: 'gid://shopify/ProductOption/1', name: 'Title', values: ['Default Title'] }],
    variantsCount: { count: 1 }, mediaCount: { count: 0 },
    variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', sku: skuNow(h), price: '19.90', inventoryItem: { id: 'gid://shopify/InventoryItem/1', unitCost: { amount: '5.00' } } }] },
    media: { nodes: [] },
  };
}

function cjProdukt(h) {
  const x = SZ.produkte[h], vs = [];
  if (SZ.stecker?.[h]) return { pid: String(x.pid), productNameEn: 'Test ' + h, productKeyEn: 'Color-Electrical outlet', variants: SZ.stecker[h].map((k, i) => ({ vid: 'vid-' + h + '-' + i,
    variantSku: SZ.skus?.[h]?.[i] ?? 'CJTST' + (1000000 + nummer(h) * 100 + i) + 'AZ', variantKey: k, variantSellPrice: SZ.preise?.[h]?.[i] ?? 5, variantWeight: 100, variantImage: '' })) };
  for (const f of x.farben) for (const g of x.groessen) {
    const i = vs.length;
    vs.push({ vid: `vid-${h}-${i}`, variantSku: `SKU-${x.pid}-${i}`, variantKey: `${f}-${g}`, variantSellPrice: 5, variantWeight: 100, variantImage: x.bildUrl || '' });
  }
  return { pid: String(x.pid), productNameEn: `Test ${h}`, productKeyEn: 'Color-Size', variants: vs };
}

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const body = init.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : null;

  if (/\/admin\/oauth\/access_token$/.test(u)) { logge({ k: 'token' }); return antwort({ access_token: 'stub-token', scope: 'x' }); }

  if (/\/admin\/api\/[^/]+\/graphql\.json$/.test(u)) {
    const q = String(body?.query || ''), v = body?.variables || {};
    if (q.includes('productByHandle')) { logge({ k: 'PRODUKT', handle: v.h }); return antwort({ data: { productByHandle: SZ.produkte[v.h] ? shopProdukt(v.h) : null } }); }
    if (q.includes('productVariants(first:5')) {                                          // SKU_DOPPELT: trägt ein anderes Produkt die Ziel-SKU schon?
      const ziel = (/sku:"([^"]+)"/.exec(v.q || '') || [])[1], d = (SZ.skuDoppelt || {})[ziel];
      logge({ k: 'SKU_DOPPELT', sku: ziel });
      const knoten = d ? [{ id: 'gid://shopify/ProductVariant/999', sku: typeof d === 'object' ? d.sku : ziel, product: { handle: typeof d === 'object' ? d.handle : d } }] : [];
      return antwort({ data: { productVariants: { nodes: knoten } } });
    }
    if (q.includes('productVariantsBulkUpdate')) {
      const h = handleZuId(v.p), modus = (SZ.sku || {})[h] || 'ok';
      logge({ k: 'SKU_SCHREIBEN', handle: h, modus, vars: v.v });
      if (modus === 'usererror') return antwort({ data: { productVariantsBulkUpdate: { productVariants: [], userErrors: [{ field: ['variants', '0'], message: 'kaputt' }] } } });
      if (modus === 'null') return antwort({ data: { productVariantsBulkUpdate: null } });
      if (modus === 'errors') return antwort({ errors: [{ message: 'Access denied for productVariantsBulkUpdate field' }] });
      SHOPSKU[h] = v.v[0].inventoryItem.sku;
      return antwort({ data: { productVariantsBulkUpdate: { productVariants: [{ id: v.v[0].id, sku: modus === 'schweigt' ? 'anderes' : SHOPSKU[h] }], userErrors: [] } } });
    }
    if (q.includes('product(id:$id)') && q.includes('variants(first:3)')) {              // SKU_LESEN: frisches Lesen vor/nach dem SKU-Schreiben
      const h = handleZuId(v.id), modus = (SZ.skuLesen || {})[h]; logge({ k: 'SKU_LESEN', handle: h, modus });
      if (modus === 'weg') return antwort({ data: { product: null } });
      // Feldgenau wie die echte API: nur was die Abfrage verlangt, kommt zurück (ein gelöschtes Feld in der Abfrage fiele sonst erst in der ersten Live-Nacht auf)
      const knoten = [{ id: 'gid://shopify/ProductVariant/1', ...(/nodes\{[^}]*\bsku\b/.test(q) ? { sku: modus === 'andere' ? 'CJ-ANDERE-SKU-123456' : skuNow(h) } : {}) }];
      if (modus === 'zwei') knoten.push({ id: 'gid://shopify/ProductVariant/2', ...(/nodes\{[^}]*\bsku\b/.test(q) ? { sku: 'X' } : {}) });
      return antwort({ data: { product: { id: v.id, ...(q.includes('variantsCount{count}') ? { variantsCount: { count: knoten.length } } : {}), variants: { nodes: knoten } } } });
    }
    if (q.includes('product(id:$id)')) {                                   // FRISCH: frisches Lesen unmittelbar vor dem Schreiben
      const h = handleZuId(v.id); logge({ k: 'FRISCH', handle: h });
      const p = shopProdukt(h), o = (SZ.frisch || {})[h] || {};
      return antwort({ data: { product: { updatedAt: o.updatedAt ?? p.updatedAt, descriptionHtml: o.descriptionHtml ?? p.descriptionHtml, tags: o.tags ?? p.tags,
        variantsCount: o.variantsCount ?? p.variantsCount, media: p.media } } });
    }
    if (q.includes('productSet')) {
      const h = handleZuId(v.i?.id), modus = (SZ.set || {})[h] || 'ok';
      logge({ k: 'productSet', handle: h, modus, varianten: v.i?.variants?.length, optionen: (v.i?.productOptions || []).map(o => o.name), werte: (v.i?.productOptions || []).flatMap(o => (o.values || []).map(x => x.name)), mitDatei: (v.i?.variants || []).filter(x => x.file).length, beschreibungMarker: String(v.i?.descriptionHtml || '').includes('ls-var-v1'), tags: v.i?.tags });
      if (modus === 'limit') return antwort({ errors: [{ message: 'Daily variant creation limit reached' }] });
      if (modus === 'fehler') return antwort({ errors: [{ message: 'Internal error. Looks like something went wrong on our end.' }] });
      if (modus === 'usererror') return antwort({ data: { productSet: { product: null, userErrors: [{ field: ['input'], message: 'Ungültig', code: 'INVALID' }] } } });
      return antwort({ data: { productSet: { product: { id: v.i.id, handle: h, variantsCount: { count: v.i.variants.length }, options: v.i.productOptions.map(o => ({ name: o.name, values: o.values.map(w => w.name) })) }, userErrors: [] } } });
    }
    throw new Error('Netz-Stub: unbekannte GraphQL-Abfrage: ' + q.slice(0, 80));
  }

  if (/developers\.cjdropshipping\.com\/api2\.0\/v1\/product\/query/.test(u)) {
    const pid = new URL(u).searchParams.get('pid'), h = handleZuPid(pid), modus = (SZ.cj || {})[h] || 'ok';
    logge({ k: 'cjProdukt', handle: h, modus });
    if (modus === 'http500') return antwort({ result: false, code: 500, message: 'Server Error' }, 500);
    if (modus === 'quota') return antwort({ result: false, code: 1600200, message: 'Insufficient API points' }, 200);
    return antwort({ code: 200, result: true, message: 'Success', data: cjProdukt(h) });
  }

  if (/logistic\/freightCalculate/.test(u)) {
    const vid = String(body?.products?.[0]?.vid || ''), h = handles.find(x => vid.startsWith(`vid-${x}-`)), modus = (SZ.fracht || {})[h] || 'ok';
    logge({ k: 'cjFracht', handle: h, modus });
    if (modus === 'http500') return antwort({ result: false, code: 500, message: 'Server Error' }, 500);
    return antwort({ code: 200, result: true, message: 'Success', data: modus === 'leer' ? [] : [{ logisticName: 'Test-Post', logisticPrice: 1.5, logisticAging: '10-15' }] });
  }

  if (/generativelanguage\.googleapis\.com/.test(u)) {
    const text = String(body?.contents?.[0]?.parts?.[0]?.text || ''), texte = JSON.parse(text.slice(text.lastIndexOf('[')));
    logge({ k: 'gemini', texte, modus: SZ.ki || 'ok' });
    if (SZ.ki === 'down') return antwort({ error: { message: 'credits depleted' } }, 402);
    const aus = texte.map(t => (SZ.ki === 'unveraendert' ? t : (SZ.kiMap || {})[t] ?? t));
    return antwort({ candidates: [{ content: { parts: [{ text: JSON.stringify(aus) }] } }] });
  }

  throw new Error('Netz-Stub: unerwartete Adresse (kein echtes Netz im Test): ' + u.slice(0, 120));
};
