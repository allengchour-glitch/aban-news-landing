#!/usr/bin/env node
// NUR LESEN. Liest alle aktiven Produkte (Bulk, ~1 Minute, mit Beschreibung und Optionen) und schreibt die Liste der Produkte mit einer Gold-/Platin-Feingehaltsangabe nach gold-waechter-liste.json.
// Regel: automation/lib/gold_feingehalt.mjs; Aufbau der Liste: gold_wahl.mjs; Ausnahmen: gold-ausnahmen.json (nach Einzelprüfung keine Angabe).
//   node dropship/gold-bazg-1711/gold_liste.mjs            (Vorgabe: gold-waechter-liste.json neben dieser Datei; LISTE=<Pfad> ändert das Ziel)
// Exit 0 in Ordnung (auch mit Treffern), 1 Fehler (Zugang, Bulk, unvollständige Antwort).
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { dirname, join } from 'node:path';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { baueListe, MAX_JE_LAUF } from './gold_wahl.mjs';
import { MARKER_GOLD } from './gold_entwurf.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const AUS = process.env.LISTE || join(HIER, 'gold-waechter-liste.json');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
// Shopify erlaubt nur EINE Bulk-Abfrage je App gleichzeitig (auch das Schaufenster und der Silber-Wächter nutzen sie): erst warten, bis eine laufende fertig ist (höchstens 8 Minuten).
for (let i = 0; ; i++) {
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (!lauf || !['CREATED', 'RUNNING', 'CANCELING'].includes(lauf.status)) break;
  if (i >= 32) { console.error('Es läuft seit über 8 Minuten eine andere Bulk-Abfrage (Status ' + lauf.status + '), abgebrochen'); process.exit(1); }
  if (i === 0) console.error('Es läuft schon eine Bulk-Abfrage (' + lauf.status + '), warte bis sie fertig ist');
  await schlaf(15000);
}
const inner = `{ products(query:"status:active") { edges { node { id handle title productType tags description options { name values } } } } }`;
const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
if (m.userErrors?.length) { console.error(JSON.stringify(m.userErrors)); process.exit(1); }
for (let i = 0; i < 120; i++) {                       // höchstens 20 Minuten (der Job hat 40)
  await schlaf(10000);
  const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
  if (s.status === 'COMPLETED') {
    const antwort = await fetch(s.url);
    if (!antwort.ok) { console.error('Ergebnisdatei nicht lesbar: HTTP ' + antwort.status); process.exit(1); }
    const alle = [];
    for await (const z of createInterface({ input: Readable.fromWeb(antwort.body), crlfDelay: Infinity })) { if (z.trim()) alle.push(JSON.parse(z)); }
    if (alle.length !== Number(s.objectCount)) { console.error(`Unvollständig: ${alle.length} von ${s.objectCount}`); process.exit(1); }
    const AUSN = process.env.AUSNAHMEN || join(HIER, 'gold-ausnahmen.json');
    const ausnahmen = new Set((existsSync(AUSN) ? JSON.parse(readFileSync(AUSN, 'utf8')).handles : []) || []);
    const liste = baueListe(alle, { ausnahmen, max: Number(process.env.MAX_ANZAHL) || MAX_JE_LAUF });
    const schonErfasst = alle.filter((p) => (p.tags || []).includes(MARKER_GOLD)).length;
    writeFileSync(AUS, JSON.stringify({ ...liste, erzeugt: new Date().toISOString(), schonMitArbeitsTag: schonErfasst }, null, 1));
    console.log(JSON.stringify({ gelesenAktiv: liste.gelesenAktiv, anzahl: liste.anzahl, ohneBeleg: liste.ohneBeleg.length, hinweise: liste.hinweise.length, zuViele: liste.zuViele, datei: AUS }));
    process.exit(0);
  }
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
console.error('Bulk-Abfrage dauert zu lange'); process.exit(1);
