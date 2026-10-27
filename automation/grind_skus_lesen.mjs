#!/usr/bin/env node
/**
 * Alle Shop-Produkte (JEDER Status: aktiv, Entwurf, archiviert) mit allen Varianten-SKUs, per Bulk-Abfrage.
 * Futter für den Dublettenindex des Grind 2.0 (lib/grind_dubletten.mjs). NUR LESEN: die einzige «mutation» ist
 * bulkOperationRunQuery — sie legt eine Lese-Abfrage an und ändert nichts am Shop.
 *
 * WARUM eine eigene Abfrage: der Katalog-Dump (katalog_bulk.mjs) hat keine SKUs, und die SKU-Datei /tmp/mr/varianten.jsonl
 * kennt nur status:active. Ein Entwurf (≥ 10 000) oder ein archiviertes Produkt ist genauso eine Dublette: wer es neu anlegt,
 * erzeugt dieselbe Ware ein zweites Mal.
 *
 * Aufruf:  node automation/grind_skus_lesen.mjs [ziel.jsonl]        (Vorgabe /tmp/grind2/bau/skus.jsonl)
 * Ausgabe: ziel.jsonl  = eine Zeile je Produkt  {id, handle, title, status, skus:[…]}
 *          ziel.jsonl.meta.json = {stand, bulkId, objectCount, produkte, varianten, nachStatus, …}
 * Schalter (Umgebung):
 *   SHOPIFY_API_VERSION   Vorgabe 2026-01 (die älteren Skripte laufen noch auf 2025-01/2024-10, beides nicht mehr unterstützt)
 *   NUR_AUFBEREITEN=1     keine Abfrage: nur ziel.jsonl.roh (eine früher geladene Bulk-Datei) aufbereiten
 *   ROH_BEHALTEN=1        die rohe Bulk-Datei nicht löschen
 *   WARTEN_MAX_MIN        so lange auf eine fremde Bulk-Abfrage warten (Vorgabe 40; Shopify erlaubt nur EINE gleichzeitig)
 * Wiederaufnahme: die Bulk-Nummer steht in ziel.jsonl.bulkid; nach einem Neustart der Umgebung hängt sich der Lauf wieder an.
 */
import { createReadStream, createWriteStream, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { bulkSammler } from './lib/grind_dubletten.mjs';

const AUS = process.argv[2] || '/tmp/grind2/bau/skus.jsonl';
const ROH = AUS + '.roh', BULKID = AUS + '.bulkid', META = AUS + '.meta.json';
const VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';
const WARTEN_MAX_MS = Number(process.env.WARTEN_MAX_MIN || 40) * 60000;
const schlaf = ms => new Promise(r => setTimeout(r, ms));

// Ohne Produkt-Filter: `products` liefert alle Status. Variante nur mit sku (mehr braucht der Index nicht).
const INNEN = `{ products { edges { node { id handle title status variants { edges { node { sku } } } } } } }`;

async function bulkLesen() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!SHOP || !process.env.SHOPIFY_CLIENT_ID || !CS) { console.error('SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET fehlen'); process.exit(1); }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json().catch(() => ({}))).access_token;
  if (!tok) { console.error('Kein Shopify-Token (Anmeldung abgelehnt)'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, VERSION, tok, a, b);
  const STATUS = `status errorCode objectCount url createdAt completedAt`;
  let id = null;

  // 1. Wiederaufnahme: eine früher von DIESEM Skript gestartete Abfrage übernehmen
  if (existsSync(BULKID)) {
    const alt = readFileSync(BULKID, 'utf8').trim();
    const s = alt ? (await q(`query($id:ID!){node(id:$id){... on BulkOperation{id ${STATUS}}}}`, { id: alt })).node : null;
    if (s && ['CREATED', 'RUNNING', 'COMPLETED'].includes(s.status)) { id = alt; console.log(`nehme Bulk-Abfrage ${alt} wieder auf (${s.status})`); }
  }
  // 2. sonst neu starten; läuft eine fremde Abfrage, warten
  const t0 = Date.now();
  while (!id) {
    const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
    if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) {
      if (Date.now() - t0 > WARTEN_MAX_MS) { console.error('Eine fremde Bulk-Abfrage läuft zu lange — abgebrochen, nichts gestartet'); process.exit(2); }
      console.log('andere Bulk-Abfrage läuft, warte 30 s'); await schlaf(30000); continue;
    }
    const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id status} userErrors{message}}}`, { q: INNEN })).bulkOperationRunQuery;
    if (m.userErrors?.length) {
      if (/already in progress|bereits/i.test(JSON.stringify(m.userErrors)) && Date.now() - t0 < WARTEN_MAX_MS) { console.log('Shopify meldet: andere Abfrage läuft — warte 30 s'); await schlaf(30000); continue; }
      console.error(JSON.stringify(m.userErrors)); process.exit(1);
    }
    id = m.bulkOperation.id; writeFileSync(BULKID, id); console.log(`Bulk-Abfrage gestartet: ${id}`);
  }
  // 3. warten bis fertig
  for (let i = 0; i < 360; i++) {
    const s = (await q(`query($id:ID!){node(id:$id){... on BulkOperation{id ${STATUS}}}}`, { id })).node;
    if (!s) { console.error('Bulk-Abfrage nicht mehr auffindbar'); process.exit(1); }
    if (s.status === 'COMPLETED') {
      if (!s.url) { console.error('Bulk fertig, aber ohne Datei (leeres Ergebnis?)'); process.exit(1); }
      const res = await fetch(s.url); if (!res.ok || !res.body) { console.error('Download fehlgeschlagen: HTTP ' + res.status); process.exit(1); }
      await pipeline(Readable.fromWeb(res.body), createWriteStream(ROH));
      return { bulkId: id, objectCount: Number(s.objectCount), api: VERSION };
    }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); try { unlinkSync(BULKID); } catch { /* egal */ } process.exit(1); }
    if (i % 6 === 0) console.log(`Bulk ${s.status}, bisher ${s.objectCount} Objekte`);
    await schlaf(10000);
  }
  console.error('Bulk-Abfrage dauert zu lange (> 60 Min.)'); process.exit(1);
}

let kopf = {};
if (process.env.NUR_AUFBEREITEN === '1') {
  if (!existsSync(ROH)) { console.error(`NUR_AUFBEREITEN=1, aber ${ROH} fehlt`); process.exit(1); }
  try { kopf = JSON.parse(readFileSync(META, 'utf8')); } catch { /* ohne Kopf */ }
} else kopf = await bulkLesen();

const sammler = bulkSammler();
const rl = createInterface({ input: createReadStream(ROH), crlfDelay: Infinity });
for await (const z of rl) sammler.add(z);
const { produkte, stat } = sammler.ergebnis();
const aus = createWriteStream(AUS);
for (const p of produkte) aus.write(JSON.stringify(p) + '\n');
await new Promise((ok, fehl) => { aus.on('error', fehl); aus.end(ok); });
const nachStatus = {}; for (const p of produkte) nachStatus[p.status] = (nachStatus[p.status] || 0) + 1;
const meta = { stand: new Date().toISOString(), ...kopf, produkte: stat.produkte, varianten: stat.varianten, variantenOhneSku: stat.variantenOhneSku, waisen: stat.waisen, kaputteZeilen: stat.kaputt, nachStatus,
  vollstaendig: kopf.objectCount ? kopf.objectCount === stat.produkte + stat.varianten : null };
writeFileSync(META, JSON.stringify(meta, null, 1));
if (process.env.ROH_BEHALTEN !== '1') { try { unlinkSync(ROH); } catch { /* egal */ } }
try { unlinkSync(BULKID); } catch { /* egal */ }   // fertig: die nächste Ausführung startet eine NEUE Abfrage (sonst würde sie das alte Ergebnis wieder laden)
console.log(JSON.stringify(meta));
if (stat.kaputt || stat.waisen || meta.vollstaendig === false) { console.error('WARNUNG: Zeilen kaputt/verwaist oder Objektzahl passt nicht — Datei nicht blind verwenden'); process.exit(3); }
