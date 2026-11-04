// Spielt die wechselnden Startseiten-Reihen ins MAIN-Theme (Sicherung vorher, Rücklesen nachher). Trockenlauf ist Vorgabe.
// Einspielen:        LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs
// Einen Schritt zurück (v2 -> v1): ZURUECK=1 LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs
// Ganz zurück (vor der Rotation): ZURUECK=ganz LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs
// Beide Rücknahmen laufen nur, wenn MAIN noch den eingespielten Stand trägt.
//
// Stände der Sektion sections/luxe-edit-home.liquid:
//   VOR  = 42cd4023… (Karussell vom 04.11., feste Listen)            -> Sicherung sicherung/luxe-edit-home.liquid.vor
//   V1   = 22522065… (Rotation, Fensterstart nur bis Poolgrösse-Fenster) -> Sicherung sicherung/*.vor-v1
//   V2   = Datei theme/luxe-edit-home.liquid (ganzer Pool, Tagesversatz, ohne concat)
// Snippets: lx-rot-start (Startposition) und, ab V2, lx-rot-ok (Gültigkeit einer Karte).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK || '';
const HIER = new URL('.', import.meta.url).pathname;
const MD5_VOR = '42cd4023b0f91e92720c46c756d41aa9', MD5_V1 = '225220650a26c4ef88dee4900fec986a';
const SEC = 'sections/luxe-edit-home.liquid', SNIP = 'snippets/lx-rot-start.liquid', OK = 'snippets/lx-rot-ok.liquid';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const lesen = async (f) => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f })).theme.files.nodes; return Object.fromEntries(n.map((x) => [x.filename, x.body?.content ?? null])); };
const schreiben = async (files) => (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: files.map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })) })).themeFilesUpsert;
const loeschen = async (f) => (await q(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, f })).themeFilesDelete;
const warte = (ms) => new Promise((r2) => setTimeout(r2, ms));
const lies = (p) => readFileSync(HIER + p, 'utf8');
const jetzt = await lesen([SEC, SNIP, OK]);
const neu = lies('theme/luxe-edit-home.liquid'), snip = lies('theme/lx-rot-start.liquid'), ok = lies('theme/lx-rot-ok.liquid');
const stand = md5(jetzt[SEC] || '');
console.log('jetzt', SEC, stand, '| lx-rot-start vorhanden:', !!jetzt[SNIP], '| lx-rot-ok vorhanden:', !!jetzt[OK], '| Soll (V2)', md5(neu));

if (ZURUECK) {
  if (stand !== md5(neu) || jetzt[SNIP] !== snip || jetzt[OK] !== ok) { console.error('MAIN trägt nicht den eingespielten Stand (V2): nichts zurückgenommen'); process.exit(3); }
  const ganz = ZURUECK === 'ganz';
  const sec0 = lies(ganz ? 'sicherung/luxe-edit-home.liquid.vor' : 'sicherung/luxe-edit-home.liquid.vor-v1');
  console.log(ganz ? 'ganz zurück auf' : 'zurück auf V1', md5(sec0)); if (!LIVE) { console.log('Trockenlauf'); process.exit(0); }
  const dateien = [[SEC, sec0]]; if (!ganz) dateien.push([SNIP, lies('sicherung/lx-rot-start.liquid.vor-v1')]);
  const u = await schreiben(dateien); if (u.userErrors?.length) { console.error(JSON.stringify(u.userErrors)); process.exit(5); }
  const d = await loeschen(ganz ? [SNIP, OK] : [OK]); console.log('gelöscht', JSON.stringify(d));
  await warte(75000);
  const n = await lesen([SEC, SNIP]); const gleich = n[SEC] === sec0 && (ganz ? !n[SNIP] : n[SNIP] === dateien[1][1]);
  console.log('rücklesen', gleich ? 'GLEICH' : 'ABWEICHUNG'); process.exit(gleich ? 0 : 6);
}

if (stand === md5(neu) && jetzt[SNIP] === snip && jetzt[OK] === ok) { console.error('Schon eingespielt'); process.exit(3); }
if (stand !== MD5_V1 && stand !== MD5_VOR) { console.error('MAIN-Datei weicht vom erwarteten Ausgangsstand ab (weder VOR noch V1): nichts geschrieben'); process.exit(4); }
mkdirSync(HIER + 'sicherung', { recursive: true });
if (stand === MD5_VOR) writeFileSync(HIER + 'sicherung/luxe-edit-home.liquid.vor', jetzt[SEC]);
else { writeFileSync(HIER + 'sicherung/luxe-edit-home.liquid.vor-v1', jetzt[SEC]); if (jetzt[SNIP]) writeFileSync(HIER + 'sicherung/lx-rot-start.liquid.vor-v1', jetzt[SNIP]); }
if (stand === MD5_V1 && !existsSync(HIER + 'sicherung/luxe-edit-home.liquid.vor')) console.log('Hinweis: sicherung/luxe-edit-home.liquid.vor (Stand vor der Rotation) fehlt im Ordner.');
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
// Die Hilfs-Snippets zuerst und zusammen mit der Sektion in EINEM Aufruf: schlägt etwas fehl, wird nichts geschrieben.
const up = await schreiben([[OK, ok], [SNIP, snip], [SEC, neu]]);
console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) process.exit(5);
await warte(75000);
const nach = await lesen([SEC, SNIP, OK]); const gleich = nach[SEC] === neu && nach[SNIP] === snip && nach[OK] === ok;
console.log('rücklesen', gleich ? 'GLEICH' : 'ABWEICHUNG'); process.exit(gleich ? 0 : 6);
