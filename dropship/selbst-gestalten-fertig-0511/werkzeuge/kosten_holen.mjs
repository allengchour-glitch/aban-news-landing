#!/usr/bin/env node
// NUR LESEN. Aufgabe B «Kosten, Versand, Preisformel» (Selbst gestalten, 05.11.2026).
// Holt (1) die Shop-Preise aller «Selbst gestalten»-Produkte (Shopify, Abfrage), (2) die Printful-Katalogkosten je Variante
// (GET /products/variant/<id>, GET /products/<id>), (3) den Printful-Versand nach CH 8001 (POST /shipping/rates = reine Berechnung).
// Schreibt NICHTS bei Shopify oder Printful. Ergebnis: JSON-Dateien im Ausgabeordner (Vorgabe: ./kosten_daten), fortsetzbar (Zwischenspeicher).
//
// ENV: PRINTFUL_API_KEY, PRINTFUL_STORE_ID, SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET   (nie ausgeben)
//      OUT=<Ordner>   PHASE=shop|varianten|produkte|versand|alle (Vorgabe alle)   PAUSE_MS=700
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';

const OUT = process.env.OUT || './kosten_daten';
const PHASE = process.env.PHASE || 'alle';
const PAUSE_MS = Math.max(600, parseInt(process.env.PAUSE_MS || '700', 10) || 700);
mkdirSync(OUT, { recursive: true });
const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const lies = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const sichern = (f, o) => writeFileSync(f, JSON.stringify(o, null, 1));

const PFH = { Authorization: 'Bearer ' + process.env.PRINTFUL_API_KEY, 'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID, 'Content-Type': 'application/json' };
async function pf(method, path, body) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.printful.com' + path, { method, headers: PFH, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429) { await pause((parseInt(r.headers.get('retry-after') || '15', 10) + 1) * 1000); continue; }
    return { status: r.status, j: await r.json().catch(() => ({})) };
  }
  return { status: 429, j: {} };
}
const vidAusSku = (sku) => { const m = String(sku || '').match(/_(\d+)\s*$/); return m ? parseInt(m[1], 10) : null; };

// ───────────────────────────── 1. Shop
async function shopLesen() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) throw new Error('Kein Shopify-Token');
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  let shop = null;
  try { shop = (await q(`{ shop { currencyCode taxesIncluded taxShipping } }`, {})).shop; } catch (e) { shop = { fehler: String(e.message || e).slice(0, 120) }; }
  const produkte = new Map();
  for (const tag of ['wunschdesign', 'printful_personalized_product']) {
    let after = null;
    for (let s = 0; s < 6; s++) {
      const j = await q(`query($q:String!,$a:String){products(first:40,query:$q,after:$a){nodes{id handle title status productType tags options{name values}
        featuredMedia{preview{image{url}}}
        variants(first:100){nodes{id title sku price compareAtPrice taxable selectedOptions{name value} inventoryItem{unitCost{amount currencyCode}}}}}
        pageInfo{hasNextPage endCursor}}}`, { q: `tag:${tag}`, a: after });
      for (const p of j.products.nodes) produkte.set(p.handle, p);
      if (!j.products.pageInfo.hasNextPage) break; after = j.products.pageInfo.endCursor;
    }
  }
  for (const [h] of [...produkte]) if (!/gestalten/.test(h)) produkte.delete(h);
  const liste = [...produkte.values()].map((p) => ({
    handle: p.handle, titel: p.title, status: p.status, productType: p.productType, optionen: p.options,
    bild: p.featuredMedia?.preview?.image?.url || null,
    varianten: p.variants.nodes.map((v) => ({ id: v.id, titel: v.title, sku: v.sku, preis: Number(v.price), vergleichspreis: v.compareAtPrice ? Number(v.compareAtPrice) : null, steuerpflichtig: v.taxable,
      einstand: v.inventoryItem?.unitCost ? Number(v.inventoryItem.unitCost.amount) : null, vid: vidAusSku(v.sku), optionen: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])) })),
  }));
  sichern(join(OUT, 'shop_preise.json'), { gelesen: new Date().toISOString(), shop, produkte: liste });
  console.log('Shop: Produkte', liste.length, 'Varianten', liste.reduce((n, p) => n + p.varianten.length, 0), JSON.stringify(shop));
}

// ───────────────────────────── 2. Printful-Varianten (Katalogkosten je SKU-Nummer)
async function variantenLesen() {
  const shop = lies(join(OUT, 'shop_preise.json'));
  const vids = [...new Set(shop.produkte.flatMap((p) => p.varianten.map((v) => v.vid)).filter(Boolean))];
  const f = join(OUT, 'pf_varianten.json'); const c = lies(f, {});
  let n = 0;
  for (const vid of vids) {
    if (c[vid] && c[vid].preisUsd != null) continue;
    const a = await pf('GET', '/products/variant/' + vid);
    const v = a.j?.result?.variant, p = a.j?.result?.product;
    c[vid] = a.status === 200 && v ? { preisUsd: parseFloat(v.price), produktId: v.product_id, produktTyp: p?.type, produktTitel: p?.title, name: v.name, groesse: v.size, farbe: v.color,
      lieferbar: v.in_stock, regionen: (v.availability_status || []).map((r) => r.region + ':' + r.status) } : { fehler: 'HTTP ' + a.status };
    n++; if (n % 25 === 0) { sichern(f, c); console.log('Varianten', n, '/', vids.length); }
    await pause(PAUSE_MS);
  }
  sichern(f, c);
  console.log('Varianten fertig:', Object.keys(c).length, 'Fehler', Object.values(c).filter((x) => x.fehler).length);
}

// ───────────────────────────── 3. Printful-Produkte (Aufpreise je Platzierung/Option, Techniken)
async function produkteLesen() {
  const c = lies(join(OUT, 'pf_varianten.json'));
  const pids = [...new Set(Object.values(c).map((x) => x.produktId).filter(Boolean))];
  // Produkte, deren SKUs im Shop keine Printful-Nummer tragen (LS…): Nummer steht im Handle/SKU
  for (const extra of [518, 259, 474, 394]) if (!pids.includes(extra)) pids.push(extra);
  const f = join(OUT, 'pf_produkte.json'); const k = lies(f, {});
  for (const pid of pids) {
    if (k[pid]) continue;
    const a = await pf('GET', '/products/' + pid);
    const r = a.j?.result;
    k[pid] = a.status === 200 && r ? { titel: r.product.title, typ: r.product.type, waehrung: r.product.currency,
      dateien: (r.product.files || []).map((x) => ({ id: x.id, typ: x.type, titel: x.title, aufpreis: x.additional_price })),
      optionen: (r.product.options || []).map((o) => ({ id: o.id, titel: o.title, typ: o.type, aufpreis: o.additional_price })),
      techniken: (r.product.techniques || []).map((t) => ({ key: t.key, name: t.display_name, default: t.is_default })),
      varianten: (r.variants || []).map((v) => ({ id: v.id, name: v.name, groesse: v.size, farbe: v.color, preisUsd: parseFloat(v.price), lieferbar: v.in_stock })) } : { fehler: 'HTTP ' + a.status };
    await pause(PAUSE_MS);
  }
  sichern(f, k); console.log('Produkte fertig:', Object.keys(k).length);
}

// ───────────────────────────── 4. Versand CH (POST /shipping/rates)
async function versandLesen() {
  const c = lies(join(OUT, 'pf_varianten.json'));
  const f = join(OUT, 'versand_ch.json'); const v = lies(f, { ziel: 'CH 8001', waehrung: 'USD', q1: {}, q2: {}, q3: {} });
  const rate = async (vid, qty) => {
    const a = await pf('POST', '/shipping/rates', { recipient: { country_code: 'CH', zip: '8001' }, items: [{ variant_id: vid, quantity: qty }], currency: 'USD' });
    if (a.status !== 200) return { fehler: `HTTP ${a.status} ${typeof a.j.result === 'string' ? a.j.result : ''}`.trim() };
    return { raten: (a.j.result || []).map((x) => ({ id: x.id, name: String(x.name).replace(/[⁠\s]+/g, ' ').trim(), usd: parseFloat(x.rate), tage: [x.minDeliveryDays ?? null, x.maxDeliveryDays ?? null], waehrung: x.currency })), extra: a.j.extra || [] };
  };
  const vids = Object.keys(c).filter((id) => c[id].preisUsd != null).map(Number);
  let n = 0;
  for (const vid of vids) {
    if (!v.q1[vid] || v.q1[vid].fehler) { v.q1[vid] = await rate(vid, 1); n++; await pause(PAUSE_MS); }
    if (n % 25 === 0 && n) { sichern(f, v); console.log('Versand q1', n, '/', vids.length); }
  }
  sichern(f, v);
  // Menge 2 und 3: je Printful-Produkt die erste und die teuerste Variante (Gewichtsklasse)
  const proProdukt = {};
  for (const vid of vids) (proProdukt[c[vid].produktId] ||= []).push(vid);
  for (const [pid, ids] of Object.entries(proProdukt)) {
    const teuer = ids.slice().sort((a, b) => c[b].preisUsd - c[a].preisUsd)[0];
    for (const vid of new Set([ids[0], teuer])) {
      if (!v.q2[vid] || v.q2[vid].fehler) { v.q2[vid] = await rate(vid, 2); await pause(PAUSE_MS); }
      if (!v.q3[vid] || v.q3[vid].fehler) { v.q3[vid] = await rate(vid, 3); await pause(PAUSE_MS); }
    }
    sichern(f, v);
  }
  console.log('Versand fertig: q1', Object.keys(v.q1).length, 'q2', Object.keys(v.q2).length, 'q3', Object.keys(v.q3).length, 'Fehler q1', Object.values(v.q1).filter((x) => x.fehler).length);
}

const phasen = { shop: shopLesen, varianten: variantenLesen, produkte: produkteLesen, versand: versandLesen };
if (PHASE === 'alle') { for (const p of ['shop', 'varianten', 'produkte', 'versand']) await phasen[p](); }
else await phasen[PHASE]();
