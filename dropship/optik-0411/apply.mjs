// Spielt die Optik-Politur vom 04.11.2026 ins MAIN-Theme (Sicherung vorher, Rücklesen nachher). Trockenlauf ist Vorgabe.
//   Einspielen:   LIVE=1 node dropship/optik-0411/apply.mjs            (Stufe 1, patches.mjs)
//                 STUFE=2 LIVE=1 node dropship/optik-0411/apply.mjs    (Stufe n, patchesN.mjs; setzt die vorige Stufe voraus)
//   Rücknahme:    ZURUECK=1 LIVE=1 node dropship/optik-0411/apply.mjs  (je Stufe; Stufe 2 zuerst zurücknehmen)   (nur wenn alle drei Dateien noch exakt dem eingespielten Stand entsprechen)
// Die Änderungen stehen in patches.mjs; ohne LIVE=1 wird nichts geschrieben.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const STUFE = Math.max(1, Number(process.env.STUFE || 1) | 0);
const { DATEIEN, MD5_VOR, MARKE_THEME, anwenden } = await import(STUFE === 1 ? './patches.mjs' : `./patches${STUFE}.mjs`);
const SUFFIX = STUFE === 1 ? '.vor' : `.vor-stufe${STUFE}`;
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const NAMEN = Object.values(DATEIEN);
const lesen = async () => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: NAMEN })).theme.files.nodes; return Object.fromEntries(n.map((x) => [x.filename, x.body?.content ?? null])); };
const schreiben = async (map) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: Object.entries(map).map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })) })).themeFilesUpsert;
const warte = (ms) => new Promise((r2) => setTimeout(r2, ms));
const alsDreier = (m) => ({ theme: m[DATEIEN.THEME], css: m[DATEIEN.CSS], footer: m[DATEIEN.FOOTER] });
const alsMap = (d) => ({ [DATEIEN.THEME]: d.theme, [DATEIEN.CSS]: d.css, [DATEIEN.FOOTER]: d.footer });
const jetzt = await lesen();
for (const n of NAMEN) console.log(n, jetzt[n] == null ? 'FEHLT' : md5(jetzt[n]));
if (NAMEN.some((n) => jetzt[n] == null)) { console.error('Eine Datei fehlt: nichts geschrieben'); process.exit(4); }
const vor = Object.fromEntries(NAMEN.map((n) => [n, MD5_VOR[n]]));

async function schreibenUndPruefen(soll, beschreibung) {
  const up = await schreiben(soll);
  console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) { console.error('userErrors, bitte Stand prüfen'); process.exit(5); }
  await warte(75000);
  const nach = await lesen(); let ok = true;
  for (const n of NAMEN) { const gleich = nach[n] === soll[n]; ok = ok && gleich; console.log('rücklesen', beschreibung, n, gleich ? 'GLEICH' : 'ABWEICHUNG', md5(nach[n] || '')); }
  process.exit(ok ? 0 : 6);
}

function ladeVor() {
  // Die Sicherung der Stände VOR der Politur (vom Einspielen angelegt).
  const m = {};
  for (const n of NAMEN) { const p = HIER + 'sicherung/' + n.replace('/', '__') + SUFFIX; if (!existsSync(p)) { console.error('Sicherung fehlt:', p); process.exit(4); } m[n] = readFileSync(p, 'utf8'); }
  return m;
}
if (ZURUECK) {
  const sich = ladeVor();
  const eingespielt = alsMap(anwenden(alsDreier(sich)));
  if (NAMEN.some((n) => jetzt[n] !== eingespielt[n])) { console.error('MAIN trägt nicht mehr exakt den eingespielten Stand: nichts zurückgenommen (von Hand mit zuruecknehmen() aus patches.mjs prüfen)'); process.exit(3); }
  console.log('Rücknahme auf den Stand vor der Politur');
  if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
  await schreibenUndPruefen(sich, 'zurück');
}

if (NAMEN.every((n) => md5(jetzt[n]) === vor[n]) === false) {
  const schon = jetzt[DATEIEN.THEME].includes(`id="${MARKE_THEME}"`);
  console.error(schon ? 'Schon eingespielt (oder teilweise): nichts geschrieben' : 'Mindestens eine Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben');
  process.exit(schon ? 3 : 4);
}
const neu = anwenden(alsDreier(jetzt));
mkdirSync(HIER + 'sicherung', { recursive: true });
for (const n of NAMEN) writeFileSync(HIER + 'sicherung/' + n.replace('/', '__') + SUFFIX, jetzt[n]);
console.log('Sicherung geschrieben; neue Grössen', NAMEN.map((n) => `${n} ${alsMap(neu)[n].length}`).join(' | '));
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
await schreibenUndPruefen(alsMap(neu), 'neu');
