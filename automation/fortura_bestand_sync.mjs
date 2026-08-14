/* fortura_bestand_sync.mjs — führt den Lagerbestand der Fortura-CH-Ware aus dem täglichen Feed nach.
 *
 * BEFUND (Fehlersuche 2026-08-14, Abschnitt [bestand]): Der Bestand von 2'593 Fortura-Produkten war
 * seit dem 23./24.07.2026 eingefroren — ein 21 Tage altes Foto auf genau dem Lager, das mit
 * «Blitzversand ab CH-Lager in 1–2 Tagen» beworben wird. URSACHE ist strukturell, kein vergessener
 * Lauf: fortura_import_grouped.mjs schreibt inventoryQuantities NUR im productSet beim Anlegen, und
 * überspringt danach jedes Produkt, das im Ledger dropship/_fortura_grp_done.txt steht. Im ganzen
 * Repo gab es keinen Pfad, der den Bestand eines BESTEHENDEN Fortura-Produkts je aktualisiert;
 * fortura_runner.sh zieht den Feed zwar täglich frisch, benutzt daraus aber nur die neuen Artikel.
 * tracked=true + DENY schützt nur davor, unter die eingefrorene Zahl zu verkaufen — nicht davor,
 * dass die Zahl falsch ist. In der Stichprobe standen 231 Varianten auf 1–3 Stück, also genau die
 * Randbestände, die ein Party-/Fasnachts-Grosshändler binnen Tagen leerräumt.
 *
 * DIESES SKRIPT ist die fehlende Gegenrichtung: Feed → Shop, für ALLE Fortura-Varianten (Verbindung
 * über die SKU `fortura-<ArtNr>`), nicht nur für neue. Gehört nach jedem Feed-Download gestartet;
 * in fortura_runner.sh ist es dafür fest eingehängt (Regel «zu jedem Nachfüllen gehört die Quelle»).
 *
 * ENTSCHEIDUNGEN + FEHLTREFFER-SCHUTZ (aus dem Probelauf):
 * - Der Feed ist die einzige Wahrheit. Ist er nicht da oder zu klein, bricht das Skript mit Code 2
 *   ab und meldet OFFEN. Es wird NIE eine Menge geraten, geschätzt oder aus dem alten Wert
 *   fortgeschrieben — eine gescheiterte Anfrage ist kein Ergebnis.
 * - SKU, die im Feed FEHLT (Artikel ausgelistet): Menge 0. Das ist die sichere Richtung (DENY +
 *   0 = nicht verkaufbar) und selbstheilend — kommt der Artikel zurück in den Feed, hebt der
 *   nächste Lauf die Menge wieder an. Es wird NICHTS gelöscht und NICHTS gedraftet: ein Draft
 *   müsste beim Restock von Hand zurückgenommen werden, eine 0 nicht.
 * - PLAUSIBILITÄTSBREMSE gegen halb geladene Feeds: würden mehr als MAX_ZERO_SHARE (Vorgabe 35 %)
 *   aller Shop-SKU auf 0 fallen, bricht der Lauf ab OHNE zu schreiben. Ein abgeschnittener Download
 *   darf nicht das halbe CH-Lager auf ausverkauft setzen.
 * - compareQuantity: geschrieben wird nur gegen den zuvor gelesenen Wert. Verkauft jemand zwischen
 *   Lesen und Schreiben, scheitert genau diese Zeile (statt den Verkauf zu überschreiben) und gilt
 *   als offen — der nächste Lauf holt sie.
 * - Nur Varianten mit tracked=true am CH-Standort werden angefasst. Untracked bleibt untracked:
 *   das ist Alt-Ware ohne Bestandsführung, dort wäre eine Zahl eine Behauptung.
 * - Journal dropship/_fortura_bestand_log.tsv wird nach JEDER Zeile geflusht (appendFileSync) und
 *   enthält den Feed-Fingerabdruck; ein abgebrochener Lauf setzt damit fort, statt neu zu beginnen.
 *
 * ENV: FORTURA_CSV (Vorgabe /tmp/fortura_feed.csv), DRY=1, LIMIT, MAX_ZERO_SHARE, MIN_FEED_ROWS,
 *      SHOPIFY_TOKEN_FILE (Vorgabe /tmp/cj_shop_token.txt) oder SHOPIFY_CLIENT_ID/SECRET.
 * Exit: 0 = gelaufen, 2 = OFFEN (Feed fehlt/unplausibel — nichts geschrieben).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const SHOP = 'au3j0y-hq.myshopify.com';
const API = `https://${SHOP}/admin/api/2024-10/graphql.json`;
const LOC = 'gid://shopify/Location/109350125953';
const CSVPATH = process.env.FORTURA_CSV || '/tmp/fortura_feed.csv';
const TOKFILE = process.env.SHOPIFY_TOKEN_FILE || '/tmp/cj_shop_token.txt';
const JOURNAL = 'dropship/_fortura_bestand_log.tsv';
const REPORT = 'dropship/_fortura_bestand_report.md';
const DRY = process.env.DRY === '1';
const LIMIT = parseInt(process.env.LIMIT || '0', 10);
const MAX_ZERO_SHARE = parseFloat(process.env.MAX_ZERO_SHARE || '0.35');
const MIN_FEED_ROWS = parseInt(process.env.MIN_FEED_ROWS || '5000', 10);
const LOCK = '/tmp/fortura_bestand_sync.lock';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Feed lesen (| getrennt, cp1252, CRLF) ---------- */
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === '|') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.length > 1);
}
const num = s => { const n = parseFloat(String(s ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
const artKey = s => String(s ?? '').trim().toUpperCase();

if (!fs.existsSync(CSVPATH)) {
  console.error(`OFFEN: Feed ${CSVPATH} fehlt. Erst automation/fortura_fetch_feed.sh laufen lassen ` +
    `(braucht /tmp/fortura_env.sh mit FORTURA_FTP_USER/PW). Es wird NICHTS geschrieben und NICHTS geraten.`);
  process.exit(2);
}
const raw = fs.readFileSync(CSVPATH);
const rows = parseCSV(raw.toString('latin1'));
if (rows.length < MIN_FEED_ROWS) {
  console.error(`OFFEN: Feed hat nur ${rows.length} Zeilen (< ${MIN_FEED_ROWS}) — abgeschnittener Download. Nichts geschrieben.`);
  process.exit(2);
}
const header = rows[0].map(h => h.trim());
const iArt = header.indexOf('ArtNr'), iStock = header.indexOf('Lagerbestand Total');
if (iArt < 0 || iStock < 0) {
  console.error(`OFFEN: Feed-Kopfzeile ohne 'ArtNr'/'Lagerbestand Total' (gefunden: ${header.slice(0, 12).join(', ')}…). Nichts geschrieben.`);
  process.exit(2);
}
const feed = new Map();
for (const r of rows.slice(1)) {
  const k = artKey(r[iArt]); if (!k) continue;
  const q = Math.max(0, Math.round(num(r[iStock])));
  // Doppelte ArtNr im Feed: konservativ die KLEINERE Menge nehmen (Übersell-Schutz).
  feed.set(k, feed.has(k) ? Math.min(feed.get(k), q) : q);
}
const feedHash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
console.log(`Feed ${CSVPATH}: ${rows.length - 1} Zeilen → ${feed.size} Artikelnummern (Fingerabdruck ${feedHash})`);

/* ---------- Shopify ---------- */
let TOK = fs.existsSync(TOKFILE) ? fs.readFileSync(TOKFILE, 'utf8').trim() : '';
async function newToken() {
  const { SHOPIFY_CLIENT_ID: id, SHOPIFY_CLIENT_SECRET: sec } = process.env;
  if (!id || !sec) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' })
  });
  const t = JSON.parse(await r.text()).access_token || '';
  if (t) { try { fs.writeFileSync(TOKFILE, t, { mode: 0o600 }); } catch {} TOK = t; }
  return t;
}
if (!TOK) TOK = await newToken();
if (!TOK) { console.error('OFFEN: kein Shopify-Token (weder ' + TOKFILE + ' noch SHOPIFY_CLIENT_ID/SECRET). Nichts geschrieben.'); process.exit(2); }

async function gql(query, variables) {
  for (let a = 0; a < 12; a++) {
    let j;
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query, variables }) });
      if (r.status === 401 || r.status === 403) { if (!await newToken()) break; continue; }
      j = JSON.parse(await r.text());
    } catch { await sleep(2000 * (a + 1)); continue; }
    if (j.data) return j;
    if (JSON.stringify(j.errors || '').includes('Throttled')) { await sleep(1500 + 500 * a); continue; }
    await sleep(2000);
  }
  return null; // gescheiterte Anfrage ist KEIN Ergebnis — Aufrufer behandelt das als offen
}

/* ---------- Lock ---------- */
if (!DRY) {
  try { const fd = fs.openSync(LOCK, 'wx'); fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd); }
  catch { const age = (Date.now() - (fs.statSync(LOCK).mtimeMs || 0)) / 60000; if (age < 60) { console.log('läuft bereits, skip'); process.exit(0); } fs.writeFileSync(LOCK, String(process.pid)); }
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch {} });
}

/* ---------- Ist-Stand im Shop lesen ---------- */
const Q = `query($c:String){productVariants(first:60,after:$c,query:"sku:fortura-*"){pageInfo{hasNextPage endCursor}
 nodes{sku product{id title status} inventoryItem{id tracked inventoryLevels(first:5){nodes{location{id} updatedAt quantities(names:["available"]){quantity}}}}}}}`;
const live = [];
let cursor = null, seiten = 0, leseFehler = 0;
while (true) {
  const j = await gql(Q, { c: cursor });
  if (!j) { leseFehler++; break; }
  const p = j.data.productVariants;
  for (const v of p.nodes) {
    const lvl = (v.inventoryItem?.inventoryLevels?.nodes || []).find(l => l.location.id === LOC);
    live.push({
      sku: v.sku, art: artKey(String(v.sku).replace(/^fortura-/i, '')),
      pid: v.product.id, titel: v.product.title, status: v.product.status,
      ii: v.inventoryItem?.id, tracked: !!v.inventoryItem?.tracked,
      ist: lvl ? (lvl.quantities[0]?.quantity ?? null) : null, seit: lvl?.updatedAt || ''
    });
  }
  seiten++;
  if (!p.pageInfo.hasNextPage) break;
  cursor = p.pageInfo.endCursor;
  await sleep(700);
}
if (leseFehler) { console.error('OFFEN: Varianten-Abfrage abgebrochen (Shopify antwortete nicht). Nichts geschrieben.'); process.exit(2); }
console.log(`Shop: ${live.length} Varianten mit SKU fortura-* auf ${seiten} Seiten`);

/* ---------- Abgleich ---------- */
const plan = [], ohneBestandsfuehrung = [], ohneLevel = [];
let unveraendert = 0, fehltImFeed = 0;
for (const v of live) {
  if (!v.tracked) { ohneBestandsfuehrung.push(v); continue; }
  if (v.ist === null || !v.ii) { ohneLevel.push(v); continue; }
  const imFeed = feed.has(v.art);
  const soll = imFeed ? feed.get(v.art) : 0;
  if (!imFeed) fehltImFeed++;
  if (soll === v.ist) { unveraendert++; continue; }
  plan.push({ ...v, soll, grund: imFeed ? 'feed' : 'nicht-mehr-im-feed' });
}
const nullPlan = plan.filter(p => p.soll === 0).length;
const zeroShare = live.length ? fehltImFeed / live.length : 0;
console.log(`\nAbgleich: ${unveraendert} unverändert · ${plan.length} zu ändern (davon ${nullPlan} auf 0) · ` +
  `${fehltImFeed} SKU nicht mehr im Feed (${(zeroShare * 100).toFixed(1)} %) · ` +
  `${ohneBestandsfuehrung.length} ohne Bestandsführung (unangetastet) · ${ohneLevel.length} ohne CH-Lagerzeile`);
for (const p of plan.slice(0, 25)) console.log(`  ${p.sku.padEnd(22)} ${String(p.ist).padStart(5)} → ${String(p.soll).padStart(5)}  ${p.grund}  ${p.titel.slice(0, 44)}`);
if (plan.length > 25) console.log(`  … und ${plan.length - 25} weitere`);

if (zeroShare > MAX_ZERO_SHARE) {
  console.error(`\nABBRUCH (Plausibilitätsbremse): ${(zeroShare * 100).toFixed(1)} % der Shop-SKU fehlen im Feed, ` +
    `Grenze ${(MAX_ZERO_SHARE * 100).toFixed(0)} %. Das sieht nach halbem Feed aus, nicht nach ausgelisteter Ware. Nichts geschrieben.`);
  process.exit(2);
}
if (DRY) { console.log('\n[DRY] nichts geschrieben.'); process.exit(0); }

/* ---------- Schreiben ---------- */
// Journal-Wiederaufnahme: was in DIESER Feed-Generation schon gesetzt wurde, wird übersprungen.
const schonGesetzt = new Set();
if (fs.existsSync(JOURNAL)) for (const z of fs.readFileSync(JOURNAL, 'utf8').split('\n')) {
  const f = z.split('\t'); if (f[1] === feedHash && f[5] === 'ok') schonGesetzt.add(f[2]);
}
const offen = plan.filter(p => !schonGesetzt.has(p.sku));
if (schonGesetzt.size) console.log(`Wiederaufnahme: ${plan.length - offen.length} bereits in diesem Feed-Lauf gesetzt.`);

const SET = `mutation($input:InventorySetQuantitiesInput!){inventorySetQuantities(input:$input){
  inventoryAdjustmentGroup{createdAt} userErrors{field message code}}}`;
let ok = 0, fehler = 0;
for (let i = 0; i < offen.length; i += 100) {
  const batch = offen.slice(i, i + 100);
  if (LIMIT && ok >= LIMIT) break;
  const j = await gql(SET, {
    input: {
      name: 'available', reason: 'correction', ignoreCompareQuantity: false,
      quantities: batch.map(p => ({ inventoryItemId: p.ii, locationId: LOC, quantity: p.soll, compareQuantity: p.ist }))
    }
  });
  const errs = j?.data?.inventorySetQuantities?.userErrors || [];
  if (!j || errs.length) {
    // Ganzer Stapel abgelehnt (z. B. weil eine Zeile zwischenzeitlich verkauft wurde) → einzeln nachfahren.
    for (const p of batch) {
      const r = await gql(SET, { input: { name: 'available', reason: 'correction', ignoreCompareQuantity: false, quantities: [{ inventoryItemId: p.ii, locationId: LOC, quantity: p.soll, compareQuantity: p.ist }] } });
      const e = r?.data?.inventorySetQuantities?.userErrors || [];
      const gut = r && !e.length;
      fs.appendFileSync(JOURNAL, [new Date().toISOString(), feedHash, p.sku, p.ist, p.soll, gut ? 'ok' : 'offen', p.grund, (e[0]?.message || (r ? '' : 'keine Antwort')).slice(0, 80)].join('\t') + '\n');
      if (gut) ok++; else fehler++;
      await sleep(150);
    }
  } else {
    for (const p of batch) { fs.appendFileSync(JOURNAL, [new Date().toISOString(), feedHash, p.sku, p.ist, p.soll, 'ok', p.grund, ''].join('\t') + '\n'); ok++; }
  }
  console.log(`… ${Math.min(i + 100, offen.length)}/${offen.length} (ok ${ok}, offen ${fehler})`);
  await sleep(400);
}

const bericht = `# Fortura-Bestandsabgleich — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC

Feed: ${CSVPATH} (${rows.length - 1} Zeilen, ${feed.size} ArtNr, Fingerabdruck ${feedHash})
Shop: ${live.length} Varianten mit SKU \`fortura-*\`

| | Anzahl |
|---|---|
| Menge geändert | ${ok} |
| unverändert (Feed = Shop) | ${unveraendert} |
| auf 0 gesetzt (nicht mehr im Feed) | ${plan.filter(p => p.grund === 'nicht-mehr-im-feed').length} |
| beim Schreiben offen geblieben (nächster Lauf) | ${fehler} |
| ohne Bestandsführung, unangetastet | ${ohneBestandsfuehrung.length} |
| ohne CH-Lagerzeile | ${ohneLevel.length} |

Journal (jede Zeile sofort geflusht): \`${JOURNAL}\`
`;
fs.writeFileSync(REPORT, bericht);
console.log(`\nFERTIG. geändert=${ok} offen=${fehler} unverändert=${unveraendert} → ${REPORT}`);
