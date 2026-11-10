// Drei kleine Theme-Korrekturen aus der Editor-Fehlersuche vom 10.11.2026 (T1 Tippflächen Handy, T2 Kauftext mit den echten Knopfnamen, T3 Cookie-Banner kommt nach Zustimmung nicht wieder).
//   node dropship/editor-theme-1011/apply.mjs             Trockenlauf (Vorgabe)
//   LIVE=1 node dropship/editor-theme-1011/apply.mjs      Sicherung, themeFilesUpsert, Rücklesen, Storefront-Prüfung, bei Fehler Rückweg
//   ZURUECK=1 LIVE=1 …                                    nimmt nur diese Änderungen zurück (spätere Änderungen anderer bleiben)
//   NUR=T2 …                                              nur einzelne Schritte
// Laufzeit bis rund 10 Minuten: nur im Hintergrund oder mit grossem Zeitlimit starten.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ablauf } from './ablauf.mjs'; import { dateien } from './patch.mjs';
const hier = path.dirname(fileURLToPath(import.meta.url));
const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const warte = ms => new Promise(r => setTimeout(r, ms)); process.stdout.on('error', () => {});
const tr = await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json();
if (!tr.access_token) { console.error('kein Token'); process.exit(4); }
const gql = async (q, v) => { for (let i = 0; i < 4; i++) { const r = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tr.access_token }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) { if (JSON.stringify(j.errors).includes('THROTTLED') && i < 3) { await warte(3000 * (i + 1)); continue; } throw new Error('GraphQL ' + JSON.stringify(j.errors).slice(0, 300)); } return j.data; } };
const main = (await gql(`{themes(first:5,roles:[MAIN]){nodes{id name role}}}`)).themes.nodes[0];
if (!main) { console.error('Kein MAIN-Theme'); process.exit(4); }
console.log('MAIN', main.id, main.name);
const lesenAlle = async () => { const d = await gql(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: main.id, f: dateien() }); const o = {}; for (const f of d.theme.files.nodes) o[f.filename] = f.body && f.body.content; for (const f of dateien()) if (typeof o[f] !== 'string') throw new Error('Datei nicht lesbar: ' + f); return o; };
const schreiben = async (neu, alt) => { const files = dateien().filter(f => neu[f] !== alt[f]).map(f => ({ filename: f, body: { type: 'TEXT', value: neu[f] } })); const r = (await gql(`mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$f){userErrors{field message}}}`, { id: main.id, f: files })).themeFilesUpsert; if (r.userErrors.length) throw new Error('themeFilesUpsert ' + JSON.stringify(r.userErrors)); };
const seite = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'de-CH,de;q=0.9' }, signal: AbortSignal.timeout(45000) }); return { status: r.status, text: await r.text() }; };
const SICH = path.join(hier, 'sicherung');
const code = await ablauf({ lesenAlle, schreiben, seite, warte, log: (...a) => console.log(...a), sicherungLesen: () => null,
  sicherungSchreiben: t => { fs.mkdirSync(SICH, { recursive: true }); for (const f of dateien()) { const p = path.join(SICH, f.replace('/', '__') + '.vor'); if (!fs.existsSync(p)) fs.writeFileSync(p, t[f]); } } },
  { live: process.env.LIVE === '1', zurueck: process.env.ZURUECK === '1', nur: process.env.NUR ? process.env.NUR.split(',') : null, themeId: main.id, erwartetThemeId: process.env.THEME_ID || 'gid://shopify/OnlineStoreTheme/213013037447' });
console.log('Exit', code); process.exit(code);
