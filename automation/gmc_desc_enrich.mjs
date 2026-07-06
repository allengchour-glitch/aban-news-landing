#!/usr/bin/env node
/* gmc_desc_enrich.mjs — reichert Produktbeschreibungen um die Details an, die Google-Kunden
 * laut Merchant-Center-Report suchen («Farbe, Muster und Material»).
 * NUR FAKTEN: Farben/Grössen kommen aus den echten Varianten-Optionen, Material/Muster nur,
 * wenn sie bereits in Titel/Beschreibung stehen (Regex) — NICHTS wird erfunden.
 * Idempotent: Marker <div class="gmc-details"> wird nie doppelt angehängt.
 * Input: dropship/gmc_desc_ids.txt (Produkt-IDs aus dem GMC-Report, eine pro Zeile).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · [LIMIT=2500] · [DRY=1]. Cursor: dropship/_gmc_enrich_pos.txt
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const LIMIT = parseInt(process.env.LIMIT || '2500', 10);
const DRY = process.env.DRY === '1';
const IDS_F = 'dropship/gmc_desc_ids.txt';
const POS_F = 'dropship/_gmc_enrich_pos.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const MATERIALS = ['Baumwolle', 'Polyester', 'Leinen', 'Seide', 'Wolle', 'Kaschmir', 'Viskose', 'Elasthan', 'Nylon', 'Denim', 'Jeans', 'Samt', 'Satin', 'Chiffon', 'Spitze', 'Strick', 'Fleece', 'Cord', 'Leder', 'Kunstleder', 'Wildleder', 'Edelstahl', 'Sterlingsilber', '925er Silber', 'Titan', 'Kupfer', 'Messing', 'Zirkonia', 'Kristall', 'Perlen', 'Holz', 'Bambus', 'Keramik', 'Glas', 'Silikon', 'ABS', 'Aluminium', 'cotton', 'polyester', 'linen', 'silk', 'wool', 'leather', 'stainless steel'];
const PATTERNS = ['gestreift', 'Streifen', 'kariert', 'Karo', 'floral', 'Blumen', 'geblümt', 'Punkte', 'gepunktet', 'Polka', 'Paisley', 'Leo', 'Leopard', 'Zebra', 'Animal-Print', 'Camouflage', 'Batik', 'Tie-Dye', 'Colorblock', 'Ombre', 'Farbverlauf', 'bestickt', 'Stickerei', 'Print', 'Aufdruck', 'Grafik', 'Logo', 'Wellen', 'geometrisch', 'Zickzack', 'Fischgrät', 'Hahnentritt', 'Marmor', 'einfarbig', 'Uni'];

async function tok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3200); continue; }
    return j.data;
  }
  return null;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function findTerms(text, list) {
  const found = [];
  for (const m of list) {
    const re = new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (re.test(text)) { const de = { cotton: 'Baumwolle', polyester: 'Polyester', linen: 'Leinen', silk: 'Seide', wool: 'Wolle', leather: 'Leder', 'stainless steel': 'Edelstahl', Jeans: 'Denim', Streifen: 'gestreift', Karo: 'kariert', Blumen: 'floral', geblümt: 'floral', Punkte: 'gepunktet', Polka: 'gepunktet', Leo: 'Leoparden-Print', Leopard: 'Leoparden-Print', Stickerei: 'bestickt', Aufdruck: 'Print', Grafik: 'Print', Uni: 'einfarbig' }[m] || m;
      if (!found.includes(de)) found.push(de); }
    if (found.length >= 3) break;
  }
  return found;
}

const ids = fs.readFileSync(IDS_F, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
let pos = fs.existsSync(POS_F) ? parseInt(fs.readFileSync(POS_F, 'utf8'), 10) || 0 : 0;
const t = await tok();
if (!t) { console.error('Kein Token.'); process.exit(1); }
console.log(`GMC-Anreicherung: ${ids.length} Produkte, Start bei ${pos}, LIMIT ${LIMIT}${DRY ? ' [DRY]' : ''}`);

let done = 0, skipped = 0, enriched = 0;
for (let i = pos; i < ids.length && done < LIMIT; i++) {
  done++; fs.writeFileSync(POS_F, String(i + 1));
  const gid = `gid://shopify/Product/${ids[i]}`;
  const d = await gql(t, `query($id:ID!){ product(id:$id){ id title status descriptionHtml
    options{name values} } }`, { id: gid });
  const p = d?.product;
  if (!p || p.status !== 'ACTIVE') { skipped++; continue; }
  if ((p.descriptionHtml || '').includes('gmc-details')) { skipped++; continue; }
  const colors = (p.options || []).find(o => /^(farbe|color)$/i.test(o.name))?.values || [];
  const sizes = (p.options || []).find(o => /^(gr(ö|o)sse|size)$/i.test(o.name))?.values || [];
  const text = p.title + ' ' + (p.descriptionHtml || '').replace(/<[^>]+>/g, ' ');
  const mats = findTerms(text, MATERIALS);
  const pats = findTerms(text, PATTERNS);
  const li = [];
  if (colors.length) li.push(`<li><strong>Farben:</strong> ${esc(colors.slice(0, 12).join(', '))}</li>`);
  if (sizes.length) li.push(`<li><strong>Grössen:</strong> ${esc(sizes.slice(0, 14).join(', '))}</li>`);
  if (mats.length) li.push(`<li><strong>Material:</strong> ${esc(mats.join(', '))}</li>`);
  if (pats.length) li.push(`<li><strong>Muster/Design:</strong> ${esc(pats.join(', '))}</li>`);
  if (!li.length) { skipped++; continue; }
  const block = `\n<div class="gmc-details"><h3>Produktdetails</h3><ul>${li.join('')}</ul></div>`;
  if (DRY) { console.log(`[DRY] ${p.title.slice(0, 40)} → ${li.length} Details`); enriched++; continue; }
  const r = await gql(t, `mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,
    { i: { id: p.id, descriptionHtml: (p.descriptionHtml || '') + block } });
  const errs = r?.productUpdate?.userErrors || [];
  if (errs.length) { console.log('✗', p.title.slice(0, 30), JSON.stringify(errs).slice(0, 60)); continue; }
  enriched++;
  if (enriched % 100 === 0) console.log(`Fortschritt: ${enriched} angereichert (${done} geprüft)`);
  await sleep(450);
}
console.log(`FERTIG: ${done} geprüft · ${enriched} angereichert · ${skipped} übersprungen. Pointer: ${fs.readFileSync(POS_F, 'utf8')}`);
