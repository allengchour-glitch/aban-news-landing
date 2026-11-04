// Spielt das Katalogfenster-Paket (EU-Grössen, ml/g, Knopf «Jetzt selbst gestalten», Sprung-Skript) ins MAIN-Theme.
// Trockenlauf ist Vorgabe.
//   Einspielen:  LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs
//   Rücknahme:   ZURUECK=1 LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs
// Einspielen: MD5 aller sieben Live-Dateien gegen den Ausgangsstand prüfen (sonst Abbruch, nichts geschrieben), Sicherung (gegen den Ausgangsstand geprüft)
// und Merkliste des Soll-Stands (sicherung/eingespielt.json) ablegen, dann Schritt 1 (Texte, Section, Galerie: ohne Code harmlos), WARTEN BIS die
// Prüfsummen von Schritt 1 über die API stimmen (höchstens 150 s), dann Schritt 2 (CSS, JS, Produktseiten-Skript), nach 75 s alle sieben Dateien über
// die Prüfsumme zurücklesen (Dateien über ~200 KB liefert die Theme-API nur als URL, darum nicht über den Textinhalt).
// Rücknahme: je Datei «neu» (gleich Soll) oder «alt» (gleich Sicherung); jede andere Datei bricht ab (Exit 3, nichts geschrieben). Sie funktioniert damit
// auch im Teilzustand (Abbruch nach Schritt 1, userErrors in Schritt 2) und unabhängig davon, ob sich etiketten.json inzwischen geändert hat.
// Exit: 0 ok · 3 schon eingespielt / Rücknahme nicht möglich · 4 Ausgangsstand oder Sicherung weicht ab · 5 userErrors · 6 Rücklesen weicht ab
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
import { DATEIEN, MD5_VOR, MARKE, anwenden } from './patches.mjs';

const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMEN = Object.values(DATEIEN);
const SCHRITT1 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE];
const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];
const MERKLISTE = HIER + 'sicherung/eingespielt.json';
const sichDatei = (n) => HIER + 'sicherung/' + n.replace('/', '__') + '.vor';
const TEILZUSTAND = 'Teilzustand möglich: ZURUECK=1 LIVE=1 node dropship/katalog-einheiten-0411/apply.mjs nimmt auch einen Teilzustand zurück (je Datei); zur Not die Dateien aus sicherung/*.vor von Hand per themeFilesUpsert zurückschreiben.';

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
  if (u.userErrors?.length) { console.error('userErrors:', JSON.stringify(u.userErrors)); console.error(TEILZUSTAND); process.exit(5); }
}
// Wartet, bis die API für alle genannten Dateien die erwartete Prüfsumme meldet (höchstens maxMs). Rückgabe: true/false.
async function warteBisGleich(sollMd5, namen, maxMs) {
  const t0 = Date.now();
  for (;;) {
    const nach = await lesen();
    const offen = namen.filter((n) => nach[n]?.md5 !== sollMd5[n]);
    if (!offen.length) return true;
    if (Date.now() - t0 > maxMs) { console.error('Prüfsumme weicht noch ab bei:', offen.join(', ')); return false; }
    await warte(10000);
  }
}
async function pruefenNachSchreiben(sollMd5, beschreibung) {
  await warte(75000);
  const nach = await lesen(); let ok = true;
  for (const n of NAMEN) {
    const gleichMd5 = nach[n]?.md5 === sollMd5[n];
    ok = ok && gleichMd5;
    console.log('rücklesen', beschreibung, n.padEnd(46), gleichMd5 ? 'GLEICH' : 'ABWEICHUNG', nach[n]?.md5, nach[n]?.size);
  }
  return ok;
}
const alsMd5 = (dateien) => Object.fromEntries(NAMEN.map((n) => [n, md5(dateien[n])]));

const jetzt = await lesen();
for (const n of NAMEN) console.log(n.padEnd(46), jetzt[n] ? `${jetzt[n].md5} ${jetzt[n].size} Byte` : 'FEHLT');
if (NAMEN.some((n) => !jetzt[n])) { console.error('Eine Datei fehlt: nichts geschrieben'); process.exit(4); }

// Die Sicherung muss der Ausgangsstand sein (sonst würde eine Rücknahme etwas Falsches zurückschreiben)
function ladeSicherung() {
  const sich = {};
  for (const n of NAMEN) {
    if (!existsSync(sichDatei(n))) return null;
    sich[n] = readFileSync(sichDatei(n), 'utf8');
    if (md5(sich[n]) !== MD5_VOR[n]) { console.error('Sicherung weicht vom Ausgangsstand ab:', n); process.exit(4); }
  }
  return sich;
}

if (ZURUECK) {
  const sich = ladeSicherung(); if (!sich) { console.error('Sicherung fehlt'); process.exit(4); }
  let soll;
  if (existsSync(MERKLISTE)) soll = JSON.parse(readFileSync(MERKLISTE, 'utf8')).md5;
  else soll = alsMd5(anwenden(sich, JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8'))));
  const alt = alsMd5(sich), zustand = {};
  for (const n of NAMEN) zustand[n] = jetzt[n].md5 === soll[n] ? 'neu' : jetzt[n].md5 === alt[n] ? 'alt' : 'fremd';
  for (const n of NAMEN) console.log('zustand', n.padEnd(46), zustand[n]);
  if (NAMEN.some((n) => zustand[n] === 'fremd')) { console.error('Mindestens eine Datei ist weder im eingespielten noch im Ausgangsstand (jemand hat sie verändert): nichts zurückgenommen'); process.exit(3); }
  const zuSchreiben = NAMEN.filter((n) => zustand[n] === 'neu');
  console.log('Rücknahme auf den Stand vor dem Paket; zu schreiben:', zuSchreiben.length ? zuSchreiben.join(', ') : '(nichts, alles schon im Ausgangsstand)');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  const rueck2 = SCHRITT2.filter((n) => zuSchreiben.includes(n)), rueck1 = SCHRITT1.filter((n) => zuSchreiben.includes(n));
  if (rueck2.length) await schreiben(sich, rueck2);
  if (rueck2.length && rueck1.length) await warteBisGleich(alt, rueck2, 150000);
  if (rueck1.length) await schreiben(sich, rueck1);
  process.exit((await pruefenNachSchreiben(alt, 'zurück')) ? 0 : 6);
}

if (NAMEN.every((n) => jetzt[n].md5 === MD5_VOR[n]) === false) {
  const schon = jetzt[DATEIEN.JS].content?.includes(MARKE) || jetzt[DATEIEN.CSS].content?.includes(MARKE);
  console.error(schon ? 'Schon eingespielt (oder teilweise): nichts geschrieben (Rücknahme: ZURUECK=1)' : 'Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben');
  process.exit(schon ? 3 : 4);
}
if (NAMEN.some((n) => jetzt[n].content == null)) { console.error('Inhalt einer Datei nicht lesbar: nichts geschrieben'); process.exit(4); }
const etiketten = JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8'));
const alt = Object.fromEntries(NAMEN.map((n) => [n, jetzt[n].content]));
const neu = anwenden(alt, etiketten);
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of NAMEN) if (!existsSync(sichDatei(n))) writeFileSync(sichDatei(n), alt[n]);
if (!ladeSicherung()) { console.error('Sicherung unvollständig'); process.exit(4); }
const sollMd5 = alsMd5(neu);
console.log('Sicherung vorhanden; neue Grössen', NAMEN.map((n) => `${n} ${Buffer.byteLength(neu[n])}`).join(' | '));
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
// Merkliste VOR dem Schreiben: so erkennt die Rücknahme auch einen Teilzustand
writeFileSync(MERKLISTE, JSON.stringify({ erstellt: new Date().toISOString(), hinweis: 'MD5 der Dateien, die apply.mjs ins MAIN-Theme schreibt (Soll-Stand)', md5: sollMd5 }, null, 1) + '\n');
await schreiben(neu, SCHRITT1);
if (!(await warteBisGleich(sollMd5, SCHRITT1, 150000))) { console.error('Schritt 1 ist nach 150 s noch nicht in der API sichtbar: Schritt 2 NICHT geschrieben.'); console.error(TEILZUSTAND); process.exit(6); }
await warte(15000);
await schreiben(neu, SCHRITT2);
process.exit((await pruefenNachSchreiben(sollMd5, 'neu')) ? 0 : 6);
