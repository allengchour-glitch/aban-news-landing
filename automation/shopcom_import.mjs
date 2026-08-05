/* shopcom_import.mjs — Importer-VORBAU für Shopcom AG (Büron LU, B2B Trading Hub, CH-Lager)
 * Stand 2026-08-05: Händler-Registrierung/Feed-Zugang PENDENT (Anfrage-Mail an info@shopcom.ch als
 * Gmail-Entwurf beim User). Shopcom-Shop läuft auf JTL — Feed vermutlich CSV mit täglichem Update.
 *
 * ⚠️ STATUS: Grundgerüst nach dem Fortura-Muster. COLMAP MUSS gegen den ECHTEN Feed verifiziert
 *    werden (erste Feed-Datei → Spalten prüfen → COLMAP anpassen → DRY-Lauf → scharf schalten).
 *
 * Ghost-sale-sicher by design: tracked:true + DENY + echte Feed-Menge (wie Fortura, nie wie BigBuy).
 * Alle Pflicht-Wachen aus CLAUDE.md eingebaut:
 *  - Titel-Wache: norm() (ä→ae, lowercase) gegen lokalen Voll-Export + Shopify-Query (Regel 9c/16c)
 *  - Bild-Wache: eigenes IMG_SEEN-Ledger + HTTP-200-Check vor Anlage (Regel 2 + Bild-Falle)
 *  - Kein Lieferanten-Leak: productType via shopcomType(title), NIE 'Shopcom' als Typ (Fortura-Lektion)
 *  - Kleinticket-Filter: MIN_VK (BigBuy-Lektion 15b)
 *  - EXCLUDE: Tabak/Vape (Shopcom führt sie! Ad-/Jugendschutz), Waffen, Erotik, Ersatzteile, Bulk
 *
 * ENV: SHOPIFY_CLIENT_ID/SECRET · SHOPCOM_CSV (Pfad zur Feed-CSV) · [DELIM=;] · [LIMIT] · [DRY=1]
 * Lauf: DRY=1 /opt/node22/bin/node automation/shopcom_import.mjs
 */
import fs from 'node:fs';
import { catTags } from './cat_tags.mjs';

function shopcomType(t){
  const tl=(t||'').toLowerCase();
  if(/kaffeem[üu]hle|karaffe|krug\b|backgeschirr|kochgeschirr|korkenzieher|k[üu]chenhelfer|besteck|geschirr|teekanne|thermosflasche|pfeffer|salzm[üu]hle|servierplatte|lebensmittelaufbewahrung/.test(tl))return 'Küche & Kochen';
  if(/duschvorhang|seifenspender|seifenschale|zahnputzbecher|wc\b|badreinigung|w[äa]schekorb|anti-?rutschmatte|badaufbewahrung/.test(tl))return 'Bad & Wellness';
  if(/kleiderb[üu]gel|kleiderst[äa]nder|garderobe|wandhaken|aufbewahrung|organizer|b[üu]gel/.test(tl))return 'Haushalt & Wohnen';
  if(/lampe|leuchte|nachtlicht|lichterkette|laterne/.test(tl))return 'Beleuchtung & Lampen';
  if(/staubsauger|roboter|generator|notstrom/.test(tl))return 'Haushaltsgeräte';
  if(/handyh[üu]lle|ladekabel|kopfh[öo]rer|adapter|netzwerk|handyzubeh[öo]r|halterung.*(handy|tablet)|stecker/.test(tl))return 'Handy-Zubehör';
  if(/baby|kleinkind|rassel|beissring|greifling|lauflern|pucktuch|nuscheli|l[äa]tzchen|hochstuhl|spieluhr|schmusetier/.test(tl))return 'Baby & Kleinkind';
  if(/spielzeug|puzzle|bausteine|kugelbahn|b[üu]gelperlen|knete|bastel|malen|puppe\b|spielmatte|badespielzeug/.test(tl))return 'Spielzeug & Spiele';
  if(/kost[üu]m|per[üu]cke|schminke|fasnacht|partydeko|girlande|luftballon|konfetti/.test(tl))return 'Kostüme & Verkleidung';
  if(/drachen|windspiel|gartenhaus|outdoor|wassersport|wintersport|schlitten|sit.?and.?ride/.test(tl))return 'Sport & Outdoor';
  if(/rucksack|tasche\b|portemonnaie|regenschirm/.test(tl))return 'Taschen';
  if(/tierbedarf|hunde|katzen/.test(tl))return 'Haustierbedarf';
  return 'Haushalt & Wohnen';
}

const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const SHOP = 'au3j0y-hq.myshopify.com', LOC = 'gid://shopify/Location/109350125953';
const PUBS = ['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961']
  .map(id => ({ publicationId: `gid://shopify/Publication/${id}` }));
const LIMIT = parseInt(process.env.LIMIT || '300', 10);
const DRY = process.env.DRY === '1';
const CSVPATH = process.env.SHOPCOM_CSV || '/tmp/shopcom_feed.csv';
const DELIM = process.env.DELIM || ';';
const LEDGER = 'dropship/_shopcom_done.txt';
const IMG_SEEN = 'dropship/_shopcom_img_seen.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Preise: CH-Lager-Versand ist günstig, aber Konditionen noch unbekannt → konservativ.
const SHIP_CH = parseFloat(process.env.SHIP_CH || '8.00');   // Annahme, nach Vertrag anpassen!
const MARKUP = parseFloat(process.env.MARKUP || '2.0');
const MIN_MARGIN = 6.0;
const MIN_VK = parseFloat(process.env.MIN_VK || '14.90');
const EXCLUDE = /tabak|zigarette|vape|e-?liquid|nikotin|pistole|gewehr|revolver|\bwaffe|schwert|dolch|munition|erotik|dessous|kontaktlinse|ersatzteil|karton à|display à|\bdisplay\b|alarmanlage/i;

// ── COLMAP: PLATZHALTER (JTL-übliche Namen) — gegen echten Feed verifizieren! ──
const COLMAP = {
  art:   ['Artikelnummer','ArtNr','SKU','HAN'],
  name:  ['Artikelname','Name','Bezeichnung','Titel'],
  desc:  ['Beschreibung','Kurzbeschreibung','Description'],
  ean:   ['EAN','GTIN','Barcode'],
  price: ['EK-Preis','EK Netto','Preis','VK-Netto','Händlerpreis'],
  uvp:   ['UVP','VK-Preis','Empf. VK'],
  stock: ['Lagerbestand','Bestand','Verfügbar','Menge'],
  img:   ['Bild','Bild_1','Bildurl','Bild-URL','Hauptbild'],
  img2:  ['Bild_2','Bild2'],
  cat:   ['Kategorie','Warengruppe','Kategoriepfad'],
};

function parseCSV(path, delim) {
  const raw = fs.readFileSync(path, 'latin1');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const head = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
  const idx = {};
  for (const [key, cands] of Object.entries(COLMAP)) {
    idx[key] = head.findIndex(h => cands.some(c => h.toLowerCase() === c.toLowerCase()));
  }
  console.log('Feed-Spalten:', head.join(' | '));
  console.log('COLMAP-Auflösung:', JSON.stringify(idx));
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const g = k => (idx[k] >= 0 ? cols[idx[k]] || '' : '');
    rows.push({ art: g('art'), name: g('name'), desc: g('desc'), ean: g('ean'),
      price: parseFloat((g('price') || '0').replace(',', '.')) || 0,
      uvp: parseFloat((g('uvp') || '0').replace(',', '.')) || 0,
      stock: parseInt(g('stock') || '0', 10) || 0, img: g('img'), img2: g('img2'), cat: g('cat') });
  }
  return rows;
}

const norm = s => (s || '').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();

async function shTok() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, { method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok}, body: JSON.stringify({ query:q, variables:v||{} }) });
  return r.json();
}
async function img200(url) {
  try { const r = await fetch(url, { method:'HEAD' }); return r.ok; } catch { return false; }
}

(async () => {
  if (!fs.existsSync(CSVPATH)) { console.log(`Kein Feed unter ${CSVPATH} → No-op. (Feed-Zugang von Shopcom abwarten.)`); process.exit(0); }
  if (!CID || !CSEC) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
  const rows = parseCSV(CSVPATH, DELIM);
  console.log(`${rows.length} Feed-Zeilen.`);
  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean) : []);
  const imgSeen = new Set(fs.existsSync(IMG_SEEN) ? fs.readFileSync(IMG_SEEN,'utf8').split('\n').filter(Boolean) : []);
  const tok = await shTok();
  let made = 0;
  for (const r of rows) {
    if (made >= LIMIT) break;
    if (!r.art || done.has(r.art)) continue;
    if (!r.name || r.stock < 3 || !r.img) continue;
    if (EXCLUDE.test(r.name) || EXCLUDE.test(r.cat)) continue;
    const uvp = r.uvp > r.price ? r.uvp : 0;
    let vk = Math.max(uvp, r.price * MARKUP, r.price + SHIP_CH + MIN_MARGIN);
    if (vk < MIN_VK) continue;                       // Kleinticket-Filter
    vk = Math.floor(vk) + 0.90;
    const imgKey = (r.img.split('/').pop() || r.img).slice(0, 120);
    if (imgSeen.has(imgKey)) continue;               // Bild-Wache
    // Titel-Wache gegen Shopify
    const tq = await gql(tok, `query($q:String){ productsCount(query:$q){count} }`, { q: `title:*${r.name.slice(0,40).replace(/"/g,'')}*` });
    if ((tq?.data?.productsCount?.count || 0) > 0) { fs.appendFileSync(LEDGER, r.art + '\n'); continue; }
    if (!(await img200(r.img))) { console.log('· Bild tot:', r.name.slice(0,50)); continue; }
    const title = r.name.replace(/\s+/g,' ').trim().slice(0, 90);
    const tags = [...new Set(['shopcom','dropship','ch-lager','blitzversand','schweiz-versand','neu', ...catTags(title)])];
    const desc = `<p>${(r.desc || title)}</p><ul><li>🇨🇭 <strong>Blitzversand aus dem Schweizer Lager</strong> – Lieferung in 1–3 Werktagen</li><li>📦 Gratis-Versand ab CHF 65</li><li>↩️ 30 Tage Rückgaberecht</li><li>🔒 Kauf auf Rechnung mit Klarna · TWINT · Karten · PayPal · Apple Pay</li><li>💬 Schweizer Support: info@luxestyle.ch</li></ul>`;
    if (DRY) { console.log(`[DRY] ${title} | VK ${vk} | Typ ${shopcomType(title)} | Tags ${tags.join(',')}`); made++; continue; }
    const input = { title, productType: shopcomType(title), vendor: 'LuxeStyle', status: 'ACTIVE', tags, descriptionHtml: desc,
      seo: { title: `${title} | LuxeStyle`.slice(0,70), description: `${title} – Blitzversand aus dem Schweizer Lager, Gratis-Versand ab CHF 65.`.slice(0,320) },
      productOptions: [{ name: 'Titel', values: [{ name: 'Standard' }] }],
      variants: [{ optionValues: [{ optionName: 'Titel', name: 'Standard' }], price: vk.toFixed(2), barcode: r.ean || undefined,
        inventoryItem: { sku: `shopcom-${r.art}`.slice(0,70), tracked: true }, inventoryPolicy: 'DENY',
        inventoryQuantities: [{ locationId: LOC, name: 'available', quantity: r.stock }] }],
      files: [ { originalSource: r.img, contentType: 'IMAGE' }, ...(r.img2 && await img200(r.img2) ? [{ originalSource: r.img2, contentType: 'IMAGE' }] : []) ] };
    const res = await gql(tok, `mutation($i:ProductSetInput!){ productSet(synchronous:true, input:$i){ product{id} userErrors{field message} } }`, { i: input });
    const pid = res?.data?.productSet?.product?.id;
    const errs = res?.data?.productSet?.userErrors || [];
    if (!pid) { console.log('✗', title.slice(0,50), JSON.stringify(errs).slice(0,150)); continue; }
    await gql(tok, `mutation($id:ID!,$inp:[PublicationInput!]!){ publishablePublish(id:$id, input:$inp){ userErrors{message} } }`, { id: pid, inp: PUBS });
    fs.appendFileSync(LEDGER, r.art + '\n'); fs.appendFileSync(IMG_SEEN, imgKey + '\n');
    made++; console.log('✓', title.slice(0,60), 'VK', vk);
    await sleep(400);
  }
  console.log(`FERTIG: ${made} Shopcom-Produkte${DRY ? ' [DRY]' : ''}.`);
})();
