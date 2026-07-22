/* fortura_import.mjs — importiert lagernde CH-Ware vom Schweizer Dropship-Lieferanten FORTURA AG
 * (Vertrag 2026-07-22, Kundennr 544341). Quelle: täglicher CSV-Feed via FTP (Anlage 1 des Vertrags).
 *
 * WARUM FORTURA ghost-sale-SICHER by design: der Feed liefert TÄGLICH echten CH-Lagerbestand
 * (Lagerbestand Total) → wir setzen tracked:true + DENY + echte Menge. Bei 0 wird das Produkt
 * automatisch unkaufbar. Kein Ghost-Sale wie bei BigBuy. CH-Versand DPD CHF 9.50, 1–2 Tage.
 *
 * ⚠️ STATUS: Grundgerüst gegen die VERTRAGS-Spec (Anlage 1). Die EXAKTEN CSV-Spaltenüberschriften
 *    ergeben sich erst aus dem echten Feed (Vertrag: "Aktuelle Spaltenüberschriften ergeben sich
 *    aus dem jeweils aktuellen CSV Feed"). COLMAP unten anhand der ersten echten Feed-Datei final
 *    verifizieren, bevor scharf geschaltet wird. FTP-Zugang kommt nach Vertragsunterzeichnung.
 *
 * ENV: SHOPIFY_CLIENT_ID/SECRET · FORTURA_CSV (Pfad zur heruntergeladenen Feed-CSV) · [LIMIT] · [DRY=1]
 * Lauf: /opt/node22/bin/node automation/fortura_import.mjs
 */
import fs from 'node:fs';
import { catTags } from './cat_tags.mjs';

const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const SHOP = 'au3j0y-hq.myshopify.com', LOC = 'gid://shopify/Location/109350125953';
const PUBS = ['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961']
  .map(id => ({ publicationId: `gid://shopify/Publication/${id}` }));
const LIMIT = parseInt(process.env.LIMIT || '500', 10);
const DRY = process.env.DRY === '1';
const CSVPATH = process.env.FORTURA_CSV || '/tmp/fortura_feed.csv';
const LEDGER = 'dropship/_fortura_done.txt';
const IMG_SEEN = 'dropship/_fortura_img_seen.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Marge: CH-Versand DPD CHF 9.50 + Marge. Verkaufspreis = max(empf. VK, EK*Faktor, EK+Versand+Floor).
const SHIP_CH = 9.50;             // DPD Home pro Paket (exkl. MWST) laut Vertrag Ziffer 8
const MARKUP = 2.2;               // Faktor auf Netto-EK falls keine empfohlene VK vorhanden
const MIN_MARGIN = 6.0;           // Mindest-Deckungsbeitrag pro Artikel über EK+Versand

// ── COLMAP: Vertrags-Feldgruppen (Anlage 1) → echte CSV-Header. NACH erstem echten Feed final prüfen! ──
const COLMAP = {
  art:   ['ArtNr', 'Artikelnummer'],
  ean:   ['EAN', 'EAN2'],
  titleDE: ['ArtikelTitel', 'Bez1DE', 'Bezeichnung1DE', 'Bez2DE'],
  descDE: ['InternetTextDE', 'InternetText_DE'],
  ve:    ['Internet_VE'],                       // artikelbezogene Mindestbestellmenge (>1 = Multiplikator)
  status:['Status'],
  liquidation: ['Liquidation'],
  stock: ['Lagerbestand Total', 'LagerbestandTotal', 'Lagerbestand_Total', 'Lagerbestand Fortura'],
  ekNetto: ['Nettopreis', 'VP1', 'VP2'],        // Netto-Einkaufspreis
  vkEmpf: ['UVP', 'Endverkaufspreis', 'InternetPreisDE'], // unverbindliche VK-Empfehlung inkl. MWST
  imgs:  ['Bild_1','Bild_2','Bild_3','Bild_4','Bild_5'],
};

// ── CSV robust parsen (Semikolon ODER Komma; Anführungszeichen) ──
function detectDelim(headerLine){ return (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ','; }
function parseCSV(text){
  const firstNL = text.indexOf('\n');
  const delim = detectDelim(text.slice(0, firstNL < 0 ? text.length : firstNL));
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else { if (c === '"') q = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') {} else field += c; } }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}
const pick = (obj, keys) => { for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return String(obj[k]).trim(); return ''; };
const num = s => { const n = parseFloat(String(s).replace(/[^0-9.,-]/g,'').replace(',', '.')); return isFinite(n) ? n : 0; };
const normT = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();

async function scc(){ for(let a=0;a<5;a++){ try{ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const t=await r.text(); try{ const tok=JSON.parse(t).access_token; if(tok) return tok; }catch{} }catch{} await sleep(2000*(a+1)); } throw new Error('scc: kein Token'); }
let TOK;
async function sgql(q,v){ for(let a=0;a<4;a++){ const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})}); const j=await r.json(); if(j.data)return j; if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;} TOK=await scc(); await sleep(1000);} return {}; }
async function img200(u){ try{ const r=await fetch(u,{method:'HEAD'}); return r.ok; }catch{ return false; } }

const SET = `mutation($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id} userErrors{message}}}`;

// ── Hauptlauf ──
if (!fs.existsSync(CSVPATH)) {
  console.error(`Kein Fortura-Feed unter ${CSVPATH}. Nach Vertragsunterzeichnung: FTP-Feed herunterladen (Kundennr 544341), Pfad via FORTURA_CSV setzen.`);
  process.exit(0);
}
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean) : []);
const imgSeen = new Set(fs.existsSync(IMG_SEEN) ? fs.readFileSync(IMG_SEEN,'utf8').split('\n').filter(Boolean) : []);
// lokaler Titel-Abgleich gegen Voll-Export (Dublettenschutz, 16c)
const existTitles = new Set();
try{ for(const l of fs.readFileSync('/tmp/products.jsonl','utf8').split('\n')){ if(!l)continue; try{ existTitles.add(normT(JSON.parse(l).title||'')); }catch{} } }catch{}

const rows = parseCSV(fs.readFileSync(CSVPATH,'utf8'));
if (rows.length < 2) { console.error('Feed leer/unlesbar.'); process.exit(0); }
const header = rows[0].map(h => h.trim());
const recs = rows.slice(1).map(r => Object.fromEntries(header.map((h,i)=>[h, r[i]])));
console.log(`Fortura-Feed: ${recs.length} Zeilen · Spalten: ${header.slice(0,12).join(', ')}${header.length>12?'…':''}`);

if (!DRY) TOK = await scc();
let created=0, skip=0, oos=0;
for (const rec of recs.slice(0, LIMIT)) {
  const art = pick(rec, COLMAP.art);
  if (!art) { skip++; continue; }
  if (done.has('ft:'+art)) { skip++; continue; }
  const title = pick(rec, COLMAP.titleDE).replace(/\s{2,}/g,' ').trim().slice(0,70);
  if (!title || title.length < 4) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  const status = pick(rec, COLMAP.status).toLowerCase();
  const stock = Math.max(0, Math.round(num(pick(rec, COLMAP.stock))));
  const ve = Math.max(1, Math.round(num(pick(rec, COLMAP.ve)) || 1));
  const ekNetto = num(pick(rec, COLMAP.ekNetto));
  const vkEmpf = num(pick(rec, COLMAP.vkEmpf));
  // Verkaufspreis: empf. VK, sonst EK*Faktor — immer mind. EK+Versand+Marge
  const floor = ekNetto + SHIP_CH + MIN_MARGIN;
  let price = Math.max(vkEmpf || 0, ekNetto * MARKUP, floor);
  price = Math.round(price*20)/20;               // auf 0.05 runden (CH)
  if (!isFinite(price) || price <= 0) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }

  // Bild-Wache: erstes gültiges Bild
  let img = '';
  for (const u of COLMAP.imgs.map(k=>pick(rec,[k])).filter(Boolean)) { if (/^https?:\/\//.test(u)) { img = u; break; } }
  if (img && imgSeen.has(img)) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  if (existTitles.has(normT(title))) { console.log('= existiert', title.slice(0,40)); fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }

  // ausverkauft/inaktiv → NICHT anlegen (ghost-sale-Schutz von Anfang an)
  if (stock <= 0 || /inaktiv|gesperrt|deaktiv/.test(status)) { oos++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  if (DRY) { console.log(`[DRY] ${title.slice(0,44)} · EK ${ekNetto} → VK ${price} · Stock ${stock} · VE ${ve}`); created++; continue; }
  if (img && !(await img200(img))) { console.log('✗ bild', title.slice(0,40)); fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }

  existTitles.add(normT(title));
  if (img) { imgSeen.add(img); fs.appendFileSync(IMG_SEEN, img+'\n'); }
  const veNote = ve > 1 ? `<p>📦 Verkauf in Bündeln zu ${ve} Stück.</p>` : '';
  const desc = `<p>${pick(rec, COLMAP.descDE) || title}</p>${veNote}<p>🇨🇭 Versand aus der Schweiz · Lieferung 1–2 Werktage (DPD) · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · Kauf auf Rechnung mit Klarna & TWINT · LuxeStyle</p>`;
  const slug = (normT(title).replace(/\s+/g,'-').slice(0,46)) + '-ft' + String(art).toLowerCase();
  const tags = [...new Set(['fortura','dropship','ch-lager','schweiz-versand','neu', ...catTags(title)])];
  const input = {
    title, handle: slug, productType: 'Fortura-CH', vendor: 'LuxeStyle', status: 'ACTIVE', tags, descriptionHtml: desc,
    seo: { title: `${title} | LuxeStyle`.slice(0,70), description: `${title} – schnelle CH-Lieferung aus der Schweiz, Gratis-Versand ab CHF 50.`.slice(0,320) },
    productOptions: [{ name: 'Titel', values: [{ name: 'Standard' }] }],
    variants: [{ optionValues: [{ optionName: 'Titel', name: 'Standard' }], price: price.toFixed(2),
      inventoryItem: { sku: `fortura-${art}`.slice(0,70), tracked: true }, inventoryPolicy: 'DENY',
      inventoryQuantities: [{ locationId: LOC, name: 'available', quantity: stock }] }],
    files: img ? [{ originalSource: img, contentType: 'IMAGE' }] : [],
  };
  const r = await sgql(SET, { input });
  const spid = r.data?.productSet?.product?.id;
  if (!spid) { console.log('✗', title.slice(0,40), JSON.stringify(r.data?.productSet?.userErrors||'').slice(0,90)); fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  await sgql(`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`, { id: spid, p: PUBS });
  fs.appendFileSync(LEDGER, 'ft:'+art+'\n'); created++;
  console.log(`✅ ${title.slice(0,44)} → CHF ${price.toFixed(2)} [Stock ${stock}${ve>1?`, VE ${ve}`:''}] {${tags.filter(t=>!['fortura','dropship','ch-lager','schweiz-versand','neu'].includes(t)).join(',')}}`);
  await sleep(400);
}
console.log(`\nFERTIG. angelegt=${created} skip=${skip} ausverkauft-übersprungen=${oos}`);
