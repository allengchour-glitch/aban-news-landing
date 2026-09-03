/* fortura_import.mjs — importiert lagernde CH-Ware vom Schweizer Dropship-Lieferanten FORTURA AG
 * (Vertrag 2026-07-22, Kundennr 544341). Quelle: täglicher CSV-Feed via FTP (Anlage 1 des Vertrags).
 *
 * Der Feed liefert täglich echten CH-Lagerbestand (Lagerbestand Total) → beim ANLEGEN setzen wir
 * tracked:true + DENY + echte Menge. CH-Versand DPD CHF 9.50, 1–2 Tage.
 * ⚠️ KORREKTUR 2026-08-14: Hier stand «ghost-sale-SICHER by design». Das war falsch und hat den
 * Fehler drei Wochen gedeckt. Der FEED ist täglich frisch, der SHOP war es nicht: dieses Skript
 * schreibt die Menge nur beim Anlegen, danach nie wieder — 4'179 aktive Varianten standen 21 Tage
 * auf dem Wert vom 23./24.07. DENY schützt nur davor, unter die eingefrorene Zahl zu verkaufen,
 * nicht davor, dass die Zahl falsch ist. Nachgeführt wird jetzt von automation/fortura_bestand_sync.mjs.
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
import { fortCatTags } from './fortura_cat.mjs';

function forturaType(t){
  const tl=(t||'').toLowerCase();
  if(/luftballon|ballon(?!.*[aä]rmel)|girlande|konfetti|wimpel|partydeko|party-?set|tischdeko|servietten|pi[nñ]ata|folienballon|deko\b|banner\b|tischdecke|strohhalm/.test(tl))return 'Partydeko & Ballone';
  if(/spielzeug|puzzle|pl[üu]sch|kuscheltier|puppe\b|schwimmbrille|taucherbrille|wasserpistole|seifenblasen|kreisel|bausteine|knete|springseil|kartenspiel/.test(tl))return 'Spielzeug & Spiele';
  if(/badeset|schaumbad|badesalz|badebombe|seife\b|duschgel|bodylotion|pflegeset|kosmetikset/.test(tl))return 'Beauty & Pflege';
  if(/schweiz|edelweiss|1\.\s*august|matterhorn|alphorn/.test(tl))return 'Schweizer Editionen';
  if(/sonnenbrille|schmuck|kette\b|armband|ohrring|tasche\b|rucksack|schal\b|f[äa]cher|geldb[öo]rse|krawatte|fliege\b|hosentr[äa]ger|g[üu]rtel/.test(tl))return 'Accessoires';
  if(/tasse\b|becher\b|glas\b|gl[äa]ser|kissen|decke\b|organizer|aufbewahrung|lampe|leuchte|kerze/.test(tl))return 'Haushalt & Wohnen';
  // 03.09.2026: Forturas Gruppe «Kostüme» ist ein Sammeltopf (226 BRUDER-Traktoren, Lotto, HARIBO, Deko standen als Kostüm)
  if(/bruder|claas|john deere|fendt|lemken|fliegl|joskin|manitou|\bjlg\b|volvo|\bcat\b|ram 2500|land rover|range rover|mb sprinter|mb arocs|mack granite|man tg|scania|massey|new holland|steyr|case ih|jcb|deutz|horsch|kipp-?lkw|anh[äa]nger|dumper|radlader|bagger|\blkw\b|traktor|bworld|rundballen|teleskoplader|feldh[äa]cksler|bulldozer|gator|roadmax|tankwagen|unimog|hoflader|lotto|bingo|tombola|gl[üu]cksrad|w[üu]rfel|spielkarte/.test(tl))return 'Spielzeug & Spiele';
  if(/haribo|trolli|bonbon|kaugummi|lolli|schoko|gummib[äa]r|chupa|lakritz|zuckerwatte|zuckerst|fruchtgummi|skittles|candy/.test(tl))return 'Süsswaren & Esswaren';
  if(/jeton|wertmarke|wachsfackel|skelett\b|spinne\b|spinnennetz|totenkopf|dekostoff|knicklicht|papagei|kan[üu]le|luftschlange|einwegteller|pappbecher|laternenstab|lampionstab|geschenkband|leinwand|wurfdose|animatronic|grabstein|fledermaus|k[üu]rbis\b/.test(tl))return 'Partydeko & Ballone';
  return 'Kostüme & Verkleidung';
}
// Kern-Kostümwörter (EINE Quelle: automation/kostuem_core.regex) → Tag kostuem-ch-front, an dem die Kollektion «Kostüme ab CH-Lager» hängt
const KOSTUEM_CORE = new RegExp(fs.readFileSync(new URL('./kostuem_core.regex', import.meta.url), 'utf8').trim(), 'i');
export function kostuemFrontTag(typ, title){ return (typ==='Kostüme & Verkleidung' && KOSTUEM_CORE.test(title||'')) ? ['kostuem-ch-front'] : []; }
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
// Kleinticket-Filter (BigBuy-Lektion 15b): Einzelartikel mit UVP < MIN_VK tragen den CHF 9.50
// DPD-Versand nicht → würden absurd überteuert gepreist (unverkäuflich). Skip. Env-überschreibbar.
const MIN_VK = parseFloat(process.env.MIN_VK || '14.90');
const FT_FILTER = process.env.FT_FILTER ? new RegExp(process.env.FT_FILTER, 'i') : null; // optional: nur Kategorie/Thema
const FT_TAGS = (process.env.FT_TAGS || '').split(',').map(s=>s.trim()).filter(Boolean); // optional: Batch-Collection-Tags
// Sharding "i/n" → paralleler Voll-Import auf DISJUNKTE ArtNr (kein Duplikat-Risiko trotz Parallellauf)
const SHARD = (() => { const m = (process.env.FT_SHARD || '').match(/^(\d+)\/(\d+)$/); return m ? { i: +m[1], n: +m[2] } : null; })();
const shardHash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// ⛔ AUSSCHLUSS (Marken-/Ad-/Regulatorik-Schutz): Waffen (TikTok/Google sperren!), Kontaktlinsen
//    (Medizinprodukt, CH-Regulatorik), Erotik, Event-Tickets, Ersatzteile, Bulk-Kartongebinde.
const EXCLUDE = /pistole|gewehr|revolver|\bwaffe|schwert|dolch|machete|\baxt\b|munition|patrone|halfter|kontaktlinse|\blinsen\b|erotik|dessous|bondage|fifty shades|eintritt|ersatzteil|nachschub|karton à|display à|\bdisplay\b/i;

// ── COLMAP: gegen den ECHTEN Feed verifiziert (2026-07-23, 66 Spalten, Delimiter '|', cp1252) ──
//    Preis-Semantik BELEGT: VP1 = Netto-EK (99% VP1<VP2), VP2 = Nettopreis inkl = UVP (84% identisch).
const COLMAP = {
  art:   ['ArtNr', 'Artikelnummer'],
  ean:   ['EAN', 'EAN2'],
  titleDE: ['ArtikelTitelDE', 'Bez1DE'],         // kuratierter E-Com-Titel, Fallback Kurzbez.
  zusatzDE: ['ArtikelTitelZusatzDE'],            // Marketing-Zusatztext → in die Beschreibung
  lieferumfangDE: ['ArtikelLieferumfangDE'],     // Lieferumfang → in die Beschreibung
  groesse: ['GrösseDE'],
  farbe: ['FarbeDE'],
  dimension: ['DimensionDE'],                    // Masse
  marke: ['Marke'],
  anlass: ['Anlass1DE','Thema1DE'],              // Anlass/Thema
  descDE: ['InternetTextDE', 'ArtikelLieferumfangDE'],
  ve:    ['Internet_VE'],                         // artikelbezogene Mindestbestellmenge (>1 = Multiplikator)
  status:['Status'],
  liquidation: ['Liquidation'],
  stock: ['Lagerbestand Total'],                  // täglicher CH-Lagerbestand → ghost-sale-sicher
  ekNetto: ['VP1'],                               // Netto-Einkaufspreis (verifiziert)
  vkEmpf: ['VP2', 'Nettopreis inkl'],             // UVP inkl. MWST (verifiziert)
  imgs:  ['Bild_1','Bild_2','Bild_3','Bild_4','Bild_5'],
};

// ── CSV robust parsen (Pipe | ODER Semikolon ODER Komma; Anführungszeichen) ──
function detectDelim(headerLine){
  const cands = [['|',(headerLine.match(/\|/g)||[]).length],[';',(headerLine.match(/;/g)||[]).length],[',',(headerLine.match(/,/g)||[]).length]];
  cands.sort((a,b)=>b[1]-a[1]); return cands[0][1] > 0 ? cands[0][0] : ',';
}
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
// ── Lockfile gegen PARALLELE Läufe (verhindert Duplikate: 2 Prozesse lesen denselben Ledger-Stand) ──
const LOCK = SHARD ? `/tmp/fortura_import_${SHARD.i}of${SHARD.n}.lock` : '/tmp/fortura_import.lock';
if (!DRY) {
  try {
    const fd = fs.openSync(LOCK, 'wx'); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
  } catch {
    const age = (Date.now() - (fs.statSync(LOCK).mtimeMs || 0)) / 60000;
    if (age < 30) { console.log(`Fortura-Import läuft bereits (Lock ${age.toFixed(1)}min alt) → skip, kein Doppellauf.`); process.exit(0); }
    fs.writeFileSync(LOCK, String(process.pid));   // veralteter Lock (>30min) → übernehmen
  }
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch {} });
}
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean) : []);
const imgSeen = new Set(fs.existsSync(IMG_SEEN) ? fs.readFileSync(IMG_SEEN,'utf8').split('\n').filter(Boolean) : []);
// lokaler Titel-Abgleich gegen Voll-Export (Dublettenschutz, 16c)
const existTitles = new Set();
try{ for(const l of fs.readFileSync('/tmp/products.jsonl','utf8').split('\n')){ if(!l)continue; try{ existTitles.add(normT(JSON.parse(l).title||'')); }catch{} } }catch{}

// Feed ist cp1252/latin1 (deutsche Umlaute) — NICHT utf8 lesen (sonst ü/ö/ä kaputt)
const rows = parseCSV(fs.readFileSync(CSVPATH,'latin1'));
if (rows.length < 2) { console.error('Feed leer/unlesbar.'); process.exit(0); }
const header = rows[0].map(h => h.trim());
const recs = rows.slice(1).map(r => Object.fromEntries(header.map((h,i)=>[h, r[i]])));
console.log(`Fortura-Feed: ${recs.length} Zeilen · Spalten: ${header.slice(0,12).join(', ')}${header.length>12?'…':''}`);

if (!DRY) TOK = await scc();
let created=0, skip=0, oos=0;
for (const rec of recs.slice(0, LIMIT)) {
  const art = pick(rec, COLMAP.art);
  if (!art) { skip++; continue; }
  if (SHARD && (shardHash(art) % SHARD.n) !== SHARD.i) { continue; }   // anderer Shard
  if (done.has('ft:'+art)) { skip++; continue; }
  const catBlob = [rec['Grp-Bez'], rec['ArtikelTitelDE'], rec['Bez1DE'], rec['Thema1DE'], rec['Anlass1DE'], rec['Bez2DE']].filter(Boolean).join(' ');
  // Optionaler Kategorie/Thema-Filter (z.B. FT_FILTER="1. august|schweiz|edelweiss" für Saison-Batch)
  if (FT_FILTER && !FT_FILTER.test(catBlob)) { skip++; continue; }
  // ⛔ Ausschluss-Guard: Waffen/Kontaktlinsen/Erotik/Tickets/Ersatzteile nie importieren
  if (EXCLUDE.test(catBlob)) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  // Titel = kuratierter ArtikelTitelDE (Fallback Bez1DE) + Grösse (Kostüme haben viele ArtNr je Grösse → nicht dedupen)
  let baseTitle = pick(rec, COLMAP.titleDE).replace(/[,;]\s*$/,'').trim();
  const gr = pick(rec, COLMAP.groesse);
  let title = baseTitle.replace(/\s{2,}/g,' ').trim();
  // Sauber kürzen: an Wortgrenze ≤66 abschneiden, baumelnde Konjunktionen/Kommas strippen (kein Mid-Word-Cut)
  if (title.length > 66) { title = title.slice(0,66); const sp = title.lastIndexOf(' '); if (sp > 30) title = title.slice(0, sp); }
  for (let k=0;k<3;k++) title = title.replace(/[\s,]+(und|mit|inkl\.?|&|für|aus|im|in|zum|zur|von)\.?$/i,'').replace(/[\s,&-]+$/,'').trim();
  if (gr && gr.length <= 8 && !new RegExp(`\\b${gr.replace(/[^\w]/g,'')}\\b`,'i').test(title)) title += ` · Gr. ${gr}`;
  title = title.slice(0,70).trim();
  if (!title || title.length < 4) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  const status = pick(rec, COLMAP.status).toLowerCase();
  const stock = Math.max(0, Math.round(num(pick(rec, COLMAP.stock))));
  const ve = Math.max(1, Math.round(num(pick(rec, COLMAP.ve)) || 1));
  const ekNetto = num(pick(rec, COLMAP.ekNetto));
  const vkEmpf = num(pick(rec, COLMAP.vkEmpf));
  // Kleinticket-Skip: UVP unter MIN_VK trägt den DPD-Versand nicht (Einzelartikel) → nicht anlegen
  if (vkEmpf > 0 && vkEmpf < MIN_VK && ve <= 1) { skip++; fs.appendFileSync(LEDGER,'ft:'+art+'\n'); continue; }
  // Verkaufspreis: UVP (VP2) ist der Markt-Anker → daran ausrichten, NIE unter EK+Versand+Marge.
  // Nur wenn keine UVP vorhanden: EK*Faktor. (2.2× würde sonst über die UVP schießen = unverkäuflich.)
  const floor = ekNetto + SHIP_CH + MIN_MARGIN;
  let price = vkEmpf > 0 ? Math.max(vkEmpf, floor) : Math.max(ekNetto * MARKUP, floor);
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
  // Reichhaltige Beschreibung: Marketing-Text + Spec-Tabelle + Anlass + Trust
  const marketing = pick(rec, COLMAP.descDE) || pick(rec, COLMAP.zusatzDE) || `${title} – hochwertige Qualität ab Schweizer Lager.`;
  const specs = [
    ['Marke', pick(rec, COLMAP.marke)],
    ['Farbe', pick(rec, COLMAP.farbe)],
    ['Grösse', pick(rec, COLMAP.groesse)],
    ['Masse', pick(rec, COLMAP.dimension)],
    ['Anlass', pick(rec, COLMAP.anlass)],
    ['Lieferumfang', pick(rec, COLMAP.lieferumfangDE)],
    ['Artikel-Nr.', String(art)],
  ].filter(([,v]) => v && v.length);
  const specTable = specs.length
    ? `<h4>Details</h4><ul>${specs.map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}</ul>` : '';
  const veNote = ve > 1 ? `<p>📦 Verkauf in praktischen Bündeln zu ${ve} Stück.</p>` : '';
  const desc = `<p>${marketing}</p>${specTable}${veNote}`
    + `<h4>Warum bei LuxeStyle kaufen?</h4><ul>`
    + `<li>🇨🇭 <strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)</li>`
    + `<li>📦 Gratis-Versand ab CHF 50</li>`
    + `<li>↩️ 30 Tage Rückgaberecht</li>`
    + `<li>🔒 Kauf auf Rechnung mit Klarna · TWINT · Karten · PayPal · Apple Pay</li>`
    + `<li>💬 Schweizer Support: info@luxestyle.ch</li></ul>`;
  const slug = (normT(title).replace(/\s+/g,'-').slice(0,46)) + '-ft' + String(art).toLowerCase();
  const tags = [...new Set(['fortura','dropship','ch-lager','schweiz-versand','neu', ...kostuemFrontTag(forturaType(title), title), ...FT_TAGS,
    ...fortCatTags(rec['Grp-Bez'], rec['Kategorie'], title), ...catTags(title)])];
  const input = {
    title, handle: slug, productType: forturaType(title), vendor: 'LuxeStyle', status: 'ACTIVE', tags, descriptionHtml: desc,
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
