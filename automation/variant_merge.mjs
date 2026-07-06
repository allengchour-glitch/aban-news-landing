#!/usr/bin/env node
/* variant_merge.mjs — «1 Produkt mit mehreren Auswahlen statt zu viel Scrollen» (User 2026-07-06).
 * Führt optisch ähnliche Einzelprodukte einer MODELL-FAMILIE zu EINEM Produkt zusammen:
 *   - Familie = gleiche Marke + Modellnummer im Titel (z.B. Italia Independent 0504-CRK-021 & 0504-CRK-044)
 *   - Eltern-Produkt bekommt Option «Modell/Farbe»; jede Variante = eigener Preis + eigene SKU
 *   - Bild je Variante: Hauptbild des Mitglieds wird angehängt und der Variante zugeordnet
 *     (Auswahl wechselt das Bild!)
 *   - Mitglieder → DRAFT + Tag merged-into-<id>; URL-Redirect alt → Eltern (SEO bleibt)
 * V1-Ziel: Sonnenbrillen «Italia Independent» (TITLE-Muster \b\d{4}[A-Z]?\b als Modell).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · [DRY=1] · [ONLY_MODEL=0504] · [LIMIT_FAM=999]
 * Ledger: dropship/_merge_done.txt (Familien-Keys) — idempotent.
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const ONLY = (process.env.ONLY_MODEL || '').trim();
const LIMIT_FAM = parseInt(process.env.LIMIT_FAM || '999', 10);
const LEDGER = 'dropship/_merge_done.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, q, v) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
        body: JSON.stringify({ query: q, variables: v }) });
      const j = await r.json();
      if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3000); continue; }
      return j;
    } catch { await sleep(3000); }
  }
  return {};
}

const t = await tok(); if (!t) { console.error('kein Token'); process.exit(1); }
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);

// 1) Alle Brillen der Marke einsammeln
const prods = [];
let cursor = null;
while (true) {
  const d = await gql(t, `query($c:String){ products(first:100, after:$c, query:"title:*Italia Independent* status:active"){
    pageInfo{hasNextPage endCursor}
    edges{ node{ id handle title createdAt
      featuredMedia{ preview{ image{ url } } }
      variants(first:1){ edges{ node{ id sku price } } } } } }}`, { c: cursor });
  const p = d.data?.products; if (!p) break;
  for (const e of p.edges) prods.push(e.node);
  if (!p.pageInfo.hasNextPage) break;
  cursor = p.pageInfo.endCursor;
}
console.log(`${prods.length} Italia-Independent-Produkte`);

// 2) Familien nach Modellnummer (erste 4-stellige Zahl im Titel)
const fams = new Map();
for (const p of prods) {
  const m = p.title.match(/\b(0\d{3}|09\d{2}|5\d{3})\b/);
  if (!m) continue;
  const genus = /herren/i.test(p.title) ? 'H' : /unisex/i.test(p.title) ? 'U' : 'D';
  const key = `ii-${genus}-${m[1]}`;
  if (!fams.has(key)) fams.set(key, []);
  fams.get(key).push(p);
}
const merged = [...fams.entries()].filter(([k, v]) => v.length >= 2 && !done.has(k) && (!ONLY || k.includes(ONLY)));
console.log(`${merged.length} Familien mit ≥2 Modellen (Beispiel: ${merged.slice(0, 5).map(([k, v]) => k + '×' + v.length).join(', ')})`);

let famCount = 0;
for (const [key, list] of merged) {
  if (famCount >= LIMIT_FAM) break;
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const parent = list[0];
  // Label je Mitglied: Code-Teil nach der Modellnummer, sonst SKU-Endung
  const labels = new Map(); const seen = new Set();
  for (const p of list) {
    let lab = (p.title.match(/\b0?\d{3,4}[-\s]?([A-Z]{2,4}[-.]?\d{2,3})/) || [])[1] || '';
    if (!lab) { const sku = p.variants.edges[0]?.node.sku || ''; lab = sku.replace(/^bb-/i, '').slice(-6).toUpperCase(); }
    lab = lab.replace(/[-.]/g, '') || 'STD';
    let base = lab, n = 2;
    while (seen.has(lab)) lab = `${base}-${n++}`;
    seen.add(lab); labels.set(p.id, lab);
  }
  const model = key.split('-').pop();
  const genus = key.includes('-H-') ? 'Herrensonnenbrille' : key.includes('-U-') ? 'Unisex-Sonnenbrille' : 'Damensonnenbrille';
  const sizeM = parent.title.match(/ø\s*\d+\s*mm/i);
  const newTitle = `${genus} Italia Independent ${model} · Farbauswahl${sizeM ? ' · ' + sizeM[0] : ''}`;
  if (DRY) {
    console.log(`[DRY] ${key}: ${list.length} → «${newTitle}»`);
    for (const p of list) console.log(`    - ${labels.get(p.id).padEnd(8)} CHF ${p.variants.edges[0]?.node.price} | ${p.title.slice(0, 55)}`);
    famCount++; continue;
  }
  // 3) Eltern-Produkt: Option «Modell» + Varianten (Preis+SKU je Mitglied)
  const variants = list.map(p => ({
    optionValues: [{ optionName: 'Modell', name: labels.get(p.id) }],
    price: p.variants.edges[0]?.node.price,
    inventoryItem: { sku: (p.variants.edges[0]?.node.sku || '').slice(0, 70), tracked: false },
    inventoryPolicy: 'CONTINUE'
  }));
  const rs = await gql(t, `mutation($i:ProductSetInput!){ productSet(synchronous:true,input:$i){ product{ id variants(first:100){edges{node{id title}}} } userErrors{field message} } }`,
    { i: { id: parent.id, title: newTitle,
      productOptions: [{ name: 'Modell', values: list.map(p => ({ name: labels.get(p.id) })) }],
      variants } });
  const errs = rs.data?.productSet?.userErrors || [];
  if (errs.length) { console.log('✗', key, JSON.stringify(errs).slice(0, 120)); continue; }
  const vmap = new Map();
  for (const e of rs.data.productSet.product.variants.edges) vmap.set(e.node.title, e.node.id);
  // 4) Bild je Mitglied anhängen + der Variante zuordnen
  for (const p of list.slice(0, 24)) {
    const img = p.featuredMedia?.preview?.image?.url;
    const vid = vmap.get(labels.get(p.id));
    if (!img || !vid) continue;
    const cm = await gql(t, `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){ media{id} userErrors{message} } }`,
      { id: parent.id, m: [{ originalSource: img.split('?')[0] + '?width=1200', mediaContentType: 'IMAGE' }] });
    const mid = cm.data?.productCreateMedia?.media?.[0]?.id;
    if (mid) {
      await sleep(2500); // Media verarbeiten lassen
      await gql(t, `mutation($p:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$vm){ userErrors{message} } }`,
        { p: parent.id, vm: [{ variantId: vid, mediaIds: [mid] }] });
    }
    await sleep(400);
  }
  // 5) Mitglieder draften + Redirect auf die passende Variante
  for (const p of list.slice(1)) {
    await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
      { i: { id: p.id, status: 'DRAFT', tags: ['merged-into-' + parent.id.split('/').pop()] } });
    const vid = (vmap.get(labels.get(p.id)) || '').split('/').pop();
    await gql(t, `mutation($i:UrlRedirectInput!){ urlRedirectCreate(urlRedirect:$i){ userErrors{message} } }`,
      { i: { path: '/products/' + p.handle, target: `/products/${parent.handle}${vid ? '?variant=' + vid : ''}` } });
    await sleep(300);
  }
  fs.appendFileSync(LEDGER, key + '\n');
  famCount++;
  console.log(`✅ ${key}: ${list.length} Produkte → 1 «${newTitle.slice(0, 60)}» (${variants.length} Varianten)`);
}
console.log(`FERTIG: ${famCount} Familien zusammengeführt${DRY ? ' [DRY]' : ''}.`);
