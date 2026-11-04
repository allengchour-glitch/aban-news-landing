// Spielt das Katalogfenster-Paket (EU-Grössen, ml/g, Knopf «Jetzt selbst gestalten», Sprung-Skript) ins MAIN-Theme.
// Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs   (nur wenn die sieben Dateien noch EXAKT dem eingespielten Stand entsprechen)
// Ablauf beim Einspielen: MD5 aller sieben Live-Dateien gegen den erwarteten Ausgangsstand prüfen (sonst Abbruch, nichts geschrieben),
// Sicherung ablegen, Schritt 1 = Texte, Section und Galerie (ohne Code harmlos), kurz warten, Schritt 2 = CSS, JS, Produktseiten-Skript,
// nach rund 75 s ALLE sieben Dateien über die Prüfsumme zurücklesen (Dateien über ~200 KB liefert die Theme-API nur als URL, darum nicht über den Textinhalt).
// Exit: 0 ok · 3 schon eingespielt / Rücknahme nicht möglich · 4 Ausgangsstand weicht ab · 5 userErrors · 6 Rücklesen weicht ab
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEIEN, MD5_VOR, MARKE, SCHREIB_REIHENFOLGE, anwenden } from './patches.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMEN = Object.values(DATEIEN);
const SCHRITT1 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE];
const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];

const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);

// Liest die sieben Dateien: {name: {md5, size, content|null}}; Inhalt nur, wenn die API ihn als Text liefert (sonst über die URL nachladen).
async function lesen() {
  const nodes = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename size checksumMd5 body{__typename ... on OnlineStoreThemeFileBodyText{content} ... on OnlineStoreThemeFileBodyUrl{url}}}}}}`, { id: th.id, f: NAMEN })).theme.files.nodes;
  const out = {};
  for (const n of nodes) {
    let content = n.body?.__typename === 'OnlineStoreThemeFileBodyText' ? n.body.content : null;
    if (content == null && n.body?.url) { const rr = await fetch(n.body.url); if (rr.ok) content = await rr.text(); }
    out[n.filename] = { md5: n.checksumMd5, size: n.size, content };
  }
  return out;
}
async function schreiben(dateien, namen) {
  const files = namen.map((n) => ({ filename: n, body: { type: 'TEXT', value: dateien[n] } }));
  const u = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files })).themeFilesUpsert;
  console.log('upsert', namen.join(', '), JSON.stringify(u.upsertedThemeFiles.map((x) => x.filename)));
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors), '- bitte Stand prüfen / Rücknahme erwägen'); process.exit(5); }
}
async function pruefenNachSchreiben(soll, beschreibung) {
  await warte(75000);
  const nach = await lesen(); let ok = true;
  for (const n of NAMEN) {
    const gleichMd5 = nach[n]?.md5 === md5(soll[n]);
    ok = ok && gleichMd5;
    console.log('rücklesen', beschreibung, n.padEnd(46), gleichMd5 ? 'GLEICH' : 'ABWEICHUNG', nach[n]?.md5, nach[n]?.size);
  }
  return ok;
}
async function einspielenReihenfolge(soll) {
  await schreiben(soll, SCHRITT1);
  await warte(20000);
  await schreiben(soll, SCHRITT2);
}

const jetzt = await lesen();
for (const n of NAMEN) console.log(n.padEnd(46), jetzt[n] ? `${jetzt[n].md5} ${jetzt[n].size} Byte` : 'FEHLT');
if (NAMEN.some((n) => !jetzt[n])) { console.error('Eine Datei fehlt: nichts geschrieben'); process.exit(4); }
const sichDatei = (n) => HIER + 'sicherung/' + n.replace('/', '__') + '.vor';

if (ZURUECK) {
  const sich = Object.fromEntries(NAMEN.map((n) => { if (!existsSync(sichDatei(n))) { console.error('Sicherung fehlt:', sichDatei(n)); process.exit(4); } return [n, readFileSync(sichDatei(n), 'utf8')]; }));
  const etiketten = JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8'));
  const eingespielt = anwenden(sich, etiketten);
  if (NAMEN.some((n) => jetzt[n].md5 !== md5(eingespielt[n]))) { console.error('MAIN trägt nicht mehr exakt den eingespielten Stand: nichts zurückgenommen (Dateien einzeln prüfen)'); process.exit(3); }
  console.log('Rücknahme auf den Stand vor dem Paket');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  // Rückwärts: erst Code, dann Daten und Labels
  await schreiben(sich, SCHRITT2); await warte(20000); await schreiben(sich, SCHRITT1);
  process.exit((await pruefenNachSchreiben(sich, 'zurück')) ? 0 : 6);
}

if (NAMEN.every((n) => jetzt[n].md5 === MD5_VOR[n]) === false) {
  const schon = jetzt[DATEIEN.JS].content?.includes(MARKE) || jetzt[DATEIEN.CSS].content?.includes(MARKE);
  console.error(schon ? 'Schon eingespielt (oder teilweise): nichts geschrieben' : 'Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben');
  process.exit(schon ? 3 : 4);
}
if (NAMEN.some((n) => jetzt[n].content == null)) { console.error('Inhalt einer Datei nicht lesbar: nichts geschrieben'); process.exit(4); }
const etiketten = JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8'));
const alt = Object.fromEntries(NAMEN.map((n) => [n, jetzt[n].content]));
const neu = anwenden(alt, etiketten);
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of NAMEN) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);
console.log('Sicherung vorhanden; neue Grössen', NAMEN.map((n) => `${n} ${Buffer.byteLength(neu[n])}`).join(' | '));
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
await einspielenReihenfolge(neu);
process.exit((await pruefenNachSchreiben(neu, 'neu')) ? 0 : 6);
