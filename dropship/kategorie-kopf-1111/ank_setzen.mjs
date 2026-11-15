// Nur die Ankündigungsleiste festmachen (Fund «wichtig» der Live-Nachmessung 15.11.: Desktop-CLS 0,19).
// Setzt 1 Zeile {%- render 'lx-ankuendigung-stabil' -%} vor </head> in layout/theme.liquid des MAIN-Themes.
// Trockenlauf Vorgabe · LIVE=1 schreibt (Sicherung sicherung/theme.liquid.ank-vor-<ts>, frisch zuruecklesen)
// ZURUECK=1 [LIVE=1] nimmt genau diese Zeile wieder heraus (nur wenn sie genau einmal vor </head> steht).
import { writeFileSync, mkdirSync } from 'node:fs';
import { shopifyGql } from '/home/user/aban-news-landing/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/home/user/aban-news-landing/automation/lib/shopify_secret.mjs';
import { md5, SNIPPET_MD5, ankEinfuegen, ankEntfernen } from './umschalten_lib.mjs';
const W = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const T = 'layout/theme.liquid', S = 'snippets/lx-ankuendigung-stabil.liquid';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) })).json()).access_token;
if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const lesen = async f => Object.fromEntries((await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f })).theme.files.nodes.map(n => [n.filename, n.body?.content ?? null]));
const ist = await lesen([T, S]);
if (ist[T] == null) { console.error('ABBRUCH: theme.liquid nicht lesbar'); process.exit(2); }
let soll;
if (ZURUECK) soll = ankEntfernen(ist[T]);
else {
  if (ist[S] == null || md5(ist[S]) !== SNIPPET_MD5[S]) { console.error('ABBRUCH: Snippet fehlt oder md5 weicht ab:', ist[S] == null ? 'fehlt' : md5(ist[S])); process.exit(2); }
  soll = ankEinfuegen(ist[T]);
}
console.log(T, ist[T].length, '->', soll.length, 'Zeichen', ZURUECK ? '(Zeile raus)' : '(+1 Zeile vor </head>)');
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben'); process.exit(0); }
const SICH = W + '/sicherung'; mkdirSync(SICH, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`${SICH}/theme.liquid.ank-vor-${ts}`, ist[T]); writeFileSync(`${SICH}/theme.liquid.ank-nach-${ts}`, soll);
const r = await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: [{ filename: T, body: { type: 'TEXT', value: soll } }] });
if (r.themeFilesUpsert.userErrors.length) { console.error('FEHLER', JSON.stringify(r.themeFilesUpsert.userErrors)); process.exit(6); }
for (let i = 0; i < 8; i++) {
  await new Promise(res => setTimeout(res, i ? 8000 : 3000));
  const n = (await lesen([T]))[T];
  if (n === soll) { console.log(new Date().toISOString(), 'Ruecklesen GLEICH', T); process.exit(0); }
  console.log('Ruecklesen', i + 1, 'noch nicht gleich');
}
process.exit(7);
