// Spielt die Zahlungs-Symbole («TWINT Zahlung sichtbar», 04.11.2026) ins MAIN-Theme: Sicherung vorher, Rücklesen nachher. Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/zahlung-0411/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/zahlung-0411/apply.mjs   (nur wenn die drei Dateien noch exakt dem eingespielten Stand entsprechen)
// Reihenfolge beim Einspielen: erst das neue Snippet, dann die drei Dateien, die darauf verweisen; bei der Rücknahme umgekehrt.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEIEN, SNIPPET, MD5_VOR, anwenden } from './patches.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const warte = (ms) => new Promise((r2) => setTimeout(r2, ms));
const lesen = async (namen) => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:20){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: namen })).theme.files.nodes; return Object.fromEntries(n.map((x) => [x.filename, x.body?.content ?? null])); };
const schreiben = async (map) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: Object.entries(map).map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })) })).themeFilesUpsert;
const loeschen = async (namen) => (await q(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, f: namen })).themeFilesDelete;
const sichName = (n) => HIER + 'sicherung/' + n.replace(/\//g, '__') + '.vor';

const jetzt = await lesen([...DATEIEN, SNIPPET]);
for (const n of DATEIEN) console.log(n, jetzt[n] == null ? 'FEHLT' : md5(jetzt[n]));
console.log(SNIPPET, jetzt[SNIPPET] == null ? 'noch nicht vorhanden' : 'VORHANDEN ' + md5(jetzt[SNIPPET]));
if (DATEIEN.some((n) => jetzt[n] == null)) { console.error('Eine Datei fehlt: nichts geschrieben'); process.exit(4); }

async function pruefenNach(soll, snippetSoll, beschreibung) {
  await warte(75000);
  const nach = await lesen([...DATEIEN, SNIPPET]); let ok = true;
  for (const n of DATEIEN) { const gleich = nach[n] === soll[n]; ok = ok && gleich; console.log('rücklesen', beschreibung, n, gleich ? 'GLEICH' : 'ABWEICHUNG', md5(nach[n] || '')); }
  const sn = snippetSoll === null ? nach[SNIPPET] == null : nach[SNIPPET] === snippetSoll;
  ok = ok && sn; console.log('rücklesen', beschreibung, SNIPPET, sn ? 'GLEICH' : 'ABWEICHUNG');
  return ok;
}

if (ZURUECK) {
  const sich = {};
  for (const n of DATEIEN) { const p = sichName(n); if (!existsSync(p)) { console.error('Sicherung fehlt:', p); process.exit(4); } sich[n] = readFileSync(p, 'utf8'); }
  const eingespielt = anwenden(sich);
  if (DATEIEN.some((n) => jetzt[n] !== eingespielt[n]) || jetzt[SNIPPET] !== eingespielt[SNIPPET]) { console.error('MAIN trägt nicht mehr exakt den eingespielten Stand: nichts zurückgenommen (von Hand mit zuruecknehmen() aus patches.mjs prüfen)'); process.exit(3); }
  console.log('Rücknahme auf den Stand vor den Zahlungs-Symbolen');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const up = await schreiben(sich);
  console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) { console.error('userErrors, bitte Stand prüfen'); process.exit(5); }
  await warte(20000);
  const del = await loeschen([SNIPPET]);
  console.log('Snippet löschen', JSON.stringify(del)); if (del.userErrors?.length) { console.error('userErrors beim Löschen, bitte Stand prüfen'); process.exit(5); }
  process.exit((await pruefenNach(sich, null, 'zurück')) ? 0 : 6);
}

if (jetzt[SNIPPET] != null) { console.error('Snippet ist schon vorhanden (oder teilweise eingespielt): nichts geschrieben'); process.exit(3); }
if (DATEIEN.some((n) => md5(jetzt[n]) !== MD5_VOR[n])) { console.error('Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben'); process.exit(4); }
const neu = anwenden(Object.fromEntries(DATEIEN.map((n) => [n, jetzt[n]])));
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of DATEIEN) writeFileSync(sichName(n), jetzt[n]);
console.log('Sicherung geschrieben; neue Grössen', [...DATEIEN, SNIPPET].map((n) => `${n} ${neu[n].length}`).join(' | '));
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }

// 1. Snippet zuerst, damit kein Besucher einen Verweis auf ein fehlendes Snippet sieht.
const up1 = await schreiben({ [SNIPPET]: neu[SNIPPET] });
console.log('upsert Snippet', JSON.stringify(up1)); if (up1.userErrors?.length) { console.error('userErrors beim Snippet, nichts weiter geschrieben'); process.exit(5); }
await warte(20000);
const probe = await lesen([SNIPPET]);
if (probe[SNIPPET] !== neu[SNIPPET]) { console.error('Snippet nach 20 s nicht lesbar: Dateien noch nicht geschrieben, bitte Stand prüfen'); process.exit(6); }
// 2. Die drei Dateien.
const up2 = await schreiben(Object.fromEntries(DATEIEN.map((n) => [n, neu[n]])));
console.log('upsert Dateien', JSON.stringify(up2)); if (up2.userErrors?.length) { console.error('userErrors, bitte Stand prüfen (Rücknahme: ZURUECK=1 LIVE=1)'); process.exit(5); }
process.exit((await pruefenNach(neu, neu[SNIPPET], 'neu')) ? 0 : 6);
