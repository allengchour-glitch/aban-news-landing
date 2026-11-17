#!/usr/bin/env node
// NUR LESEN. Liest alle aktiven Produkte (Bulk, ~1 Minute, mit Beschreibung und Optionen) und schreibt die Liste der Produkte mit einer Silber-Feingehaltsangabe nach liste.json.
// Regel: automation/lib/silber_feingehalt.mjs (925, S925, Sterling, 999/990 Silber … in Titel, Beschreibung oder Optionen); Ausnahmen: ausnahmen.json (nach Einzelprüfung keine Angabe).
//   node dropship/silber-bazg-1711/liste.mjs            (Vorgabe: liste.json neben dieser Datei; LISTE=<Pfad> ändert das Ziel)
// Die Suche `title:*925*` ist NICHT zuverlässig (fand am 17.11. 129 statt 207: «S925…» wird nicht getroffen): darum der ganze Katalog.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { waehleAusKatalog, MARKER } from './lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const AUS = process.env.LISTE || join(HIER, 'liste.json');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
// Shopify erlaubt nur EINE Bulk-Abfrage je App gleichzeitig (auch das Schaufenster-Werkzeug nutzt sie): erst warten, bis eine laufende fertig ist (höchstens 8 Minuten), nicht sofort aufgeben.
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
    // Strom statt ganzer Text: die Beschreibungen machen die Datei gross (der Strom wird zeilenweise gelesen und nirgends gespeichert)
    const antwort = await fetch(s.url);
    if (!antwort.ok) { console.error('Ergebnisdatei nicht lesbar: HTTP ' + antwort.status); process.exit(1); }
    const alle = [];
    for await (const z of createInterface({ input: Readable.fromWeb(antwort.body), crlfDelay: Infinity })) { if (z.trim()) alle.push(JSON.parse(z)); }
    if (alle.length !== Number(s.objectCount)) { console.error(`Unvollständig: ${alle.length} von ${s.objectCount}`); process.exit(1); }
    const AUSN = process.env.AUSNAHMEN || join(HIER, 'ausnahmen.json');
    const ausnahmen = new Set((existsSync(AUSN) ? JSON.parse(readFileSync(AUSN, 'utf8')).handles : []) || []);
    const eintraege = waehleAusKatalog(alle, { ausnahmen });
    const schonErfasst = alle.filter((p) => (p.tags || []).includes(MARKER)).length;
    writeFileSync(AUS, JSON.stringify({ gelesenAktiv: alle.length, erzeugt: new Date().toISOString(), schonMitArbeitsTag: schonErfasst, anzahl: eintraege.length, eintraege }, null, 1));
    console.log(JSON.stringify({ gelesenAktiv: alle.length, anzahl: eintraege.length, schonMitArbeitsTag: schonErfasst, datei: AUS }));
    process.exit(0);
  }
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.error('Bulk', s.status, s.errorCode); process.exit(1); }
}
console.error('Bulk-Abfrage dauert zu lange'); process.exit(1);
