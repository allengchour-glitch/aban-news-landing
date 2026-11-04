// Spielt die wechselnden Startseiten-Reihen ins MAIN-Theme (Sicherung vorher, Rücklesen nachher). Trockenlauf ist Vorgabe.
// Einspielen:   LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs
// Zurücknehmen: ZURUECK=1 LIVE=1 node dropship/startseite-wechsel-0411/apply_theme.mjs   (nur wenn MAIN noch den eingespielten Stand trägt)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const BASIS_MD5 = '42cd4023b0f91e92720c46c756d41aa9';       // sections/luxe-edit-home.liquid nach dem Karussell vom 04.11.
const SEC = 'sections/luxe-edit-home.liquid', SNIP = 'snippets/lx-rot-start.liquid';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const lesen = async (f) => { const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f })).theme.files.nodes; return Object.fromEntries(n.map((x) => [x.filename, x.body?.content ?? ''])); };
const jetzt = await lesen([SEC, SNIP]);
const neu = readFileSync(HIER + 'theme/luxe-edit-home.liquid', 'utf8'), snip = readFileSync(HIER + 'theme/lx-rot-start.liquid', 'utf8');
console.log('jetzt', SEC, md5(jetzt[SEC] || ''), '| Snippet vorhanden:', !!jetzt[SNIP], '| Soll neu', md5(neu));
if (ZURUECK) {
  if (md5(jetzt[SEC] || '') !== md5(neu)) { console.error('MAIN trägt nicht den eingespielten Stand: nichts zurückgenommen'); process.exit(3); }
  const vor = readFileSync(HIER + 'sicherung/luxe-edit-home.liquid.vor', 'utf8');
  console.log('zurück auf', md5(vor)); if (!LIVE) { console.log('Trockenlauf'); process.exit(0); }
  const u = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){userErrors{filename message}}}`, { id: th.id, files: [{ filename: SEC, body: { type: 'TEXT', value: vor } }] })).themeFilesUpsert;
  if (u.userErrors?.length) { console.error(JSON.stringify(u.userErrors)); process.exit(5); }
  const d = (await q(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, f: [SNIP] })).themeFilesDelete;
  console.log('Snippet gelöscht', JSON.stringify(d)); await new Promise((r2) => setTimeout(r2, 75000));
  const n = await lesen([SEC]); console.log('rücklesen', n[SEC] === vor ? 'GLEICH' : 'ABWEICHUNG'); process.exit(n[SEC] === vor ? 0 : 6);
}
if (md5(jetzt[SEC] || '') === md5(neu)) { console.error('Schon eingespielt'); process.exit(3); }
if (md5(jetzt[SEC] || '') !== BASIS_MD5) { console.error('MAIN-Datei weicht vom erwarteten Ausgangsstand ab: nichts geschrieben'); process.exit(4); }
mkdirSync(HIER + 'sicherung', { recursive: true }); writeFileSync(HIER + 'sicherung/luxe-edit-home.liquid.vor', jetzt[SEC]);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(0); }
const up = (await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: SNIP, body: { type: 'TEXT', value: snip } }, { filename: SEC, body: { type: 'TEXT', value: neu } }] })).themeFilesUpsert;
console.log('upsert', JSON.stringify(up)); if (up.userErrors?.length) process.exit(5);
await new Promise((r2) => setTimeout(r2, 75000));
const nach = await lesen([SEC, SNIP]); const ok = nach[SEC] === neu && nach[SNIP] === snip;
console.log('rücklesen', ok ? 'GLEICH' : 'ABWEICHUNG'); process.exit(ok ? 0 : 6);
