// Fell-Folge 05.11.2026: Produkte, deren CJ-DATENBLATT echtes Tierfell («Rabbit fur», «Mink fur») als Material nennt, auf ENTWURF.
// Nur der Status ändert sich (Titel, Text, Preise, Varianten, Bilder, Handles bleiben). Rücknahme setzt ACTIVE zurück.
//   Trockenlauf (Vorgabe):  node fell_folge.mjs
//   Schreiben:               LIVE=1 node fell_folge.mjs
//   Rücknahme:               ZURUECK=1 LIVE=1 node fell_folge.mjs   (liest fell_folge_sicherung.json; nur Produkte, die jetzt DRAFT sind)
// Die Handle-Liste steht in fell_folge_liste.json (Beleg je Produkt: wörtliche CJ-Fundstelle).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = process.env.SICHERUNG || HIER + 'fell_folge_sicherung.json';
const LISTE = process.env.LISTE || HIER + 'fell_folge_liste.json';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

const LESEN = `query($h:String!){products(first:2,query:$h){nodes{id handle title status totalInventory}}}`;
const lies = async (handle) => {
  const n = (await q(LESEN, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle);
  if (n.length !== 1) throw new Error('Produkt nicht eindeutig: ' + handle + ' (' + n.length + ')');
  return n[0];
};
const SCHREIBEN = `mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id handle status} userErrors{field message}}}`;
const setzeStatus = async (id, status) => {
  const j = (await q(SCHREIBEN, { p: { id, status } })).productUpdate;
  if (j.userErrors?.length) throw new Error('userErrors: ' + JSON.stringify(j.userErrors));
  return j.product;
};
const pause = (ms) => new Promise((s) => setTimeout(s, ms));

if (ZURUECK) {
  const sich = JSON.parse(readFileSync(SICH, 'utf8'));
  let fehler = 0;
  for (const s of sich) {
    const ist = await lies(s.handle);
    if (ist.status !== 'DRAFT') { console.log('übersprungen (nicht DRAFT):', s.handle, ist.status); continue; }
    console.log('zurück auf', s.status, ':', s.handle);
    if (!LIVE) continue;
    await setzeStatus(s.id, s.status); await pause(1200);
    const nach = await lies(s.handle);
    const ok = nach.status === s.status; console.log('  rücklesen', ok ? 'GLEICH' : 'ABWEICHUNG', nach.status); if (!ok) fehler++;
  }
  console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf, nichts geschrieben'); process.exit(fehler ? 6 : 0);
}

const liste = JSON.parse(readFileSync(LISTE, 'utf8'));
if (!Array.isArray(liste) || !liste.length) { console.error('Liste leer'); process.exit(2); }
const plan = [];
for (const e of liste) {
  const p = await lies(e.handle);
  if (p.status !== 'ACTIVE') { console.log('ÜBERSPRUNGEN (nicht aktiv):', e.handle, p.status); continue; }
  plan.push({ e, p });
}
for (const x of plan) console.log('ENTWURF', x.p.handle, '|', x.p.title, '|', (x.e.beleg || '').slice(0, 90));
console.log('zu ändern:', plan.length, 'von', liste.length);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// Sicherung VOR dem Schreiben (nur der Status; vorhandene Einträge bleiben)
const alt = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : [];
const neu = plan.filter((x) => !alt.some((s) => s.id === x.p.id)).map((x) => ({ id: x.p.id, handle: x.p.handle, title: x.p.title, status: x.p.status }));
writeFileSync(SICH, JSON.stringify([...alt, ...neu], null, 1));
let fehler = 0;
for (const x of plan) {
  await setzeStatus(x.p.id, 'DRAFT'); await pause(1500);
  const nach = await lies(x.p.handle);
  const ok = nach.status === 'DRAFT';
  console.log('rücklesen', x.p.handle, ok ? 'GLEICH' : 'ABWEICHUNG', '|', nach.status);
  if (!ok) fehler++;
}
process.exit(fehler ? 6 : 0);
