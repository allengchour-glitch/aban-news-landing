#!/usr/bin/env node
/* premium_import.mjs — «teure Sachen holen, die im Lager sind» (User 2026-07-07 Nacht).
 * Geht den BigBuy-Katalog nach EK-Preis ABSTEIGEND durch und importiert nur Produkte, die
 * den 2-Stufen-Lieferbarkeits-Check BESTEHEN (GEHIRN 14: shipping/orders CH + order/check Stock).
 * Nur condition NEW (Refurb war die BEKO-/Weissware-Falle). Marken-Preisformel (UVP-verankert).
 * Guards: Ledger dropship/premium_done.txt · Bild-Ledger bigbuy_img_seen.txt · Titel-Dupwache.
 * Publikation: alle Kanäle AUSSER Google (Markenware = GMC-Sperr-Risiko, noGoogle-Regel).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · BIGBUY_API_KEY · [CAP=50] · [MIN_EK=60] · [MAX_EK=700]
 *      [PAGES=400] · [DRY=1] · [GAP=1800]
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const BB = (process.env.BIGBUY_API_KEY || '').trim();
const CAP = parseInt(process.env.CAP || '50', 10);
const MIN_EK = parseFloat(process.env.MIN_EK || '60');
const MAX_EK = parseFloat(process.env.MAX_EK || '700');
const PAGES = parseInt(process.env.PAGES || '400', 10);
const DRY = process.env.DRY === '1';
const GAP = parseInt(process.env.GAP || '1800', 10);
const LEDGER = 'dropship/premium_done.txt';
const IMG_LEDGER = 'dropship/bigbuy_img_seen.txt';
const EUR = 0.97;
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!BB || !CID || !CSEC) { console.error('Secrets fehlen'); process.exit(1); }

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
async function bbCall(url, body) {
  for (let a = 0; a < 10; a++) {
    try {
      const r = await fetch(url, body
        ? { method: 'POST', headers: { Authorization: `Bearer ${BB}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { headers: { Authorization: `Bearer ${BB}` } });
      if (r.status === 429) { await sleep(Math.min(20000 * (a + 1), 120000)); continue; }
      const txt = await r.text();
      if (/rate limit|too many/i.test(txt)) { await sleep(Math.min(20000 * (a + 1), 120000)); continue; }
      let j = null; try { j = JSON.parse(txt); } catch {}
      return { status: r.status, j };
    } catch { await sleep(5000); }
  }
  return { status: 0, j: null };
}
async function viable(ref) { // GEHIRN 14: 2 Checks; ER005 (Moneybox leer) = lieferbar
  const ship = await bbCall('https://api.bigbuy.eu/rest/shipping/orders.json',
    { order: { delivery: { isoCountry: 'CH', postcode: '8001' }, products: [{ reference: ref, quantity: 1 }] } });
  const opt = (ship.j?.shippingOptions || [])[0];
  if (!opt) return { ok: false, why: 'kein-ch-versand' };
  await sleep(900);
  const chk = await bbCall('https://api.bigbuy.eu/rest/order/check.json', { order: {
    internalReference: 'premium-check', cashOnDelivery: false, language: 'de', paymentMethod: 'moneybox',
    carriers: [{ name: (opt.shippingService?.name || 'seur').toLowerCase() }],
    shippingAddress: { firstName: 'Check', lastName: 'Dry', country: 'CH', postcode: '8001', town: 'Zuerich',
      address: 'Bahnhofstrasse 1', phone: '000000000', email: 'info@luxestyle.ch', comment: '' },
    products: [{ reference: ref, quantity: 1 }] } });
  if ((chk.status >= 200 && chk.status < 300) || chk.j?.code === 'ER005') return { ok: true, shipCost: opt.cost };
  return { ok: false, why: chk.j?.code || String(chk.status) };
}
async function img200(u) { try { const r = await fetch(u, { method: 'HEAD' }); return r.ok; } catch { return false; } }
const round90 = x => (Math.ceil(x) - 0.10).toFixed(2);

const t = await tok(); if (!t) { console.error('kein Shopify-Token'); process.exit(1); }
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const imgSeen = new Set(fs.existsSync(IMG_LEDGER) ? fs.readFileSync(IMG_LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const pubsQ = await gql(t, 'query{ publications(first:10){ edges{ node{ id name } } } }');
const pubs = pubsQ.data.publications.edges.map(e => e.node).filter(p => !/google|inbox/i.test(p.name));

// 1) Katalog paginiert einsammeln: NEW + aktiv + EK im Fenster
// Cache: Container stirbt oft — Kandidatenliste in /tmp übersteht Neustarts (24h gültig).
const CACHE='dropship/_premium_cands.json';   // im Repo-Ordner: Auto-Committer sichert ihn → übersteht ALLES
let cands = [], startPage = 1, scanDone = false;
try{ const c=JSON.parse(fs.readFileSync(CACHE,'utf8'));
  if(Date.now()-c.ts < 172800000 && Array.isArray(c.cands)){ cands=c.cands; startPage=(c.page||0)+1; scanDone=!!c.done;
    console.log(`Cache: ${cands.length} Kandidaten, ${scanDone?'Scan KOMPLETT':'weiter ab Seite '+startPage}`);} }catch{}
if(!scanDone){
console.log(`Sammle Katalog (Seite ${startPage}–${PAGES} à 250) …`);
for (let page = startPage; page <= PAGES; page++) {
  const { status, j } = await bbCall(`https://api.bigbuy.eu/rest/catalog/products.json?pageSize=250&page=${page}`);
  if (status !== 200 || !Array.isArray(j)) { console.log(`  Seite ${page}: Ende/Fehler (${status})`); fs.writeFileSync(CACHE, JSON.stringify({ts:Date.now(),cands,page:page-1,done:status===200})); break; }
  if (!j.length) { fs.writeFileSync(CACHE, JSON.stringify({ts:Date.now(),cands,page,done:true})); break; }
  for (const p of j) {
    if (p.active !== 1 || p.condition !== 'NEW') continue;
    const ek = Number(p.wholesalePrice) || 0;
    if (ek < MIN_EK || ek > MAX_EK) continue;
    const imgs = Array.isArray(p.images) ? p.images.map(x => (typeof x === 'string' ? x : x?.url)).filter(Boolean) : [];
    cands.push({ id: p.id, sku: p.sku, ek, uvp: Number(p.retailPrice) || 0, images: imgs });
  }
  if (page % 10 === 0){ if(page % 50===0) console.log(`  … Seite ${page}, ${cands.length} Kandidaten`); fs.writeFileSync(CACHE, JSON.stringify({ts:Date.now(),cands,page,done:false})); }
  await sleep(1500);
  if (page === PAGES) fs.writeFileSync(CACHE, JSON.stringify({ts:Date.now(),cands,page,done:true}));
}
}
cands.sort((a, b) => b.ek - a.ek);
console.log(`${cands.length} Premium-Kandidaten (EK ${MIN_EK}–${MAX_EK} €, NEW, aktiv) — teuerste zuerst. CAP ${CAP}${DRY ? ' [DRY]' : ''}`);

const SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id } userErrors{ field message } } }`;
let created = 0, checked = 0;
for (const c of cands) {
  if (created >= CAP) break;
  if (done.has('pm:' + c.id)) continue;
  checked++;
  // Detail (deutscher Name)
  const { status, j: d } = await bbCall(`https://api.bigbuy.eu/rest/catalog/product/${c.id}.json?isoCode=de`);
  await sleep(GAP);
  if (status !== 200 || !d) continue;
  let name = (d.name || '').replace(/\s*[–—-]?\s*Ref\.?:?\s*(BB[-_])?[A-Z0-9][\w-]*\s*$/i, '').replace(/ß/g, 'ss').replace(/["<>]/g, '').trim();
  if (!name || name.length < 8) continue;
  // Lieferbarkeit ZUERST (der ganze Sinn dieser Welle)
  const v = await viable(c.sku); await sleep(GAP);
  if (!v.ok) { console.log(`  skip(${v.why}) €${c.ek} ${name.slice(0, 50)}`); fs.appendFileSync(LEDGER, 'pm:' + c.id + '\n'); done.add('pm:' + c.id); continue; }
  // Titel-Dupwache
  const dq = await gql(t, `query($q:String!){ products(first:1,query:$q){ edges{ node{ id } } } }`, { q: `title:"${name.replace(/"/g, '')}" status:active` });
  if (dq.data?.products?.edges?.length) { console.log('  skip(dup-titel)', name.slice(0, 45)); fs.appendFileSync(LEDGER, 'pm:' + c.id + '\n'); done.add('pm:' + c.id); continue; }
  // Bilder
  const good = [];
  for (const u of c.images.slice(0, 8)) { if (await img200(u)) good.push(u); if (good.length >= 6) break; }
  if (good.length < 2) { fs.appendFileSync(LEDGER, 'pm:' + c.id + '\n'); done.add('pm:' + c.id); continue; }
  const imgKey = good[0].split('?')[0].split('/').pop();
  if (imgKey && imgSeen.has(imgKey)) { console.log('  skip(dup-bild)', name.slice(0, 45)); fs.appendFileSync(LEDGER, 'pm:' + c.id + '\n'); done.add('pm:' + c.id); continue; }
  // Marken-Preis (UVP-verankert, nie unter EK*1.25)
  const ekChf = c.ek * EUR, uvpChf = c.uvp * EUR;
  const price = round90(Math.max(ekChf * 1.25, uvpChf > 0 ? uvpChf * 1.05 : 0, ekChf * 1.25));
  if (DRY) { console.log(`[DRY] €${c.ek} → CHF ${price} | ${name.slice(0, 60)} (Versand ${v.shipCost} €)`); created++; continue; }
  const handle = (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)) + '-' + c.id;
  const desc = `<p><strong>${name}</strong></p><ul><li>✔ Original-Markenware, fabrikneu</li><li>📦 Lagergeprüft — versandbereit ab EU-Lager</li><li>🚚 Lieferung in die Schweiz per Spedition/Paket</li><li>↩️ 30 Tage Rückgaberecht</li></ul><p>✓ Geprüfte Qualität · Gratis-Versand ab CHF 50 · 🇨🇭 LuxeStyle</p>`;
  const input = { title: name, handle, productType: 'Premium', vendor: 'LuxeStyle', status: 'ACTIVE',
    tags: ['bigbuy', 'dropship', 'marke', 'premium-lager', 'lager-geprueft'],
    descriptionHtml: desc, seo: { title: `${name} | LuxeStyle`, description: `${name} – Original-Markenware an Lager, schnelle Lieferung in die Schweiz.` },
    files: good.map(u => ({ originalSource: u, contentType: 'IMAGE' })),
    productOptions: [{ name: 'Titel', values: [{ name: 'Standard' }] }],
    variants: [{ optionValues: [{ optionName: 'Titel', name: 'Standard' }], price,
      inventoryItem: { sku: `BB-${c.sku}`.slice(0, 70), tracked: false }, inventoryPolicy: 'CONTINUE' }] };
  const r = await gql(t, SET, { input });
  const pid = r.data?.productSet?.product?.id;
  if (!pid) { console.log('  ✗ create', name.slice(0, 40), JSON.stringify(r.data?.productSet?.userErrors || r).slice(0, 120)); continue; }
  if (pubs.length) await gql(t, `mutation($id:ID!,$p:[PublicationInput!]!){ publishablePublish(id:$id,input:$p){ userErrors{message} } }`,
    { id: pid, p: pubs.map(p => ({ publicationId: p.id })) });
  fs.appendFileSync(LEDGER, 'pm:' + c.id + '\n'); done.add('pm:' + c.id);
  if (imgKey) { fs.appendFileSync(IMG_LEDGER, imgKey + '\n'); imgSeen.add(imgKey); }
  created++;
  console.log(`✅ ${created}/${CAP} CHF ${price} (EK €${c.ek}) | ${name.slice(0, 60)}`);
}
console.log(`FERTIG: ${created} Premium-Produkte angelegt (${checked} geprüft).`);
if (created >= CAP) { try{ fs.unlinkSync('/tmp/premium_wave_active'); }catch{} console.log('Welle komplett — Vorfahrt-Flag entfernt.'); }
