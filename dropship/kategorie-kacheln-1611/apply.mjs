// Kachel-Fix 16.11.2026 (Claude): Codex' Kategorieabschnitte erkennen auch Menü-Links vom Typ HTTP.
// Trockenlauf ist Vorgabe. LIVE=1 schreibt; ZURUECK=1 LIVE=1 stellt die Sicherung wieder her.
// Schreibt nur, wenn die Live-Dateien genau dem gesicherten Codex-Stand entsprechen (Prüfsumme), sonst Abbruch.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const HIER = new URL('.', import.meta.url).pathname;
const SHOP = process.env.SHOPIFY_SHOP, API = '2025-10', THEME = 'gid://shopify/OnlineStoreTheme/214169584007';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (q, v) => { const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) }); const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data; };
const th = (await gql(`{ theme(id:"${THEME}"){ role } }`)).theme;
if (th.role !== 'MAIN') { console.error('ABBRUCH: Theme ist nicht MAIN'); process.exit(2); }
const W = 'sections/lx-collection-welten.liquid', DT = 'sections/lx-collection-details.liquid', SN = 'snippets/lx-menu-knoten.liquid';
async function lies(namen) {
  const d = await gql(`query($f:[String!]){ theme(id:"${THEME}"){ files(filenames:$f, first:10){ nodes{ filename checksumMd5 body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`, { f: namen });
  return Object.fromEntries(d.theme.files.nodes.map(n => [n.filename, n.body?.content ?? null]));
}
const SICH = HIER + 'sicherung/';
const ist = await lies([W, DT, SN]);
if (ZURUECK) {
  const alt = { [W]: readFileSync(SICH + 'lx-collection-welten.vor.liquid', 'utf8'), [DT]: readFileSync(SICH + 'lx-collection-details.vor.liquid', 'utf8') };
  const neu = JSON.parse(readFileSync(SICH + 'neu.md5.json', 'utf8'));
  for (const f of [W, DT]) if (md5(ist[f]) !== neu[f]) { console.error(`ABBRUCH: ${f} wurde seit dem Einspielen geändert (fremd), nichts zurückgeschrieben`); process.exit(3); }
  if (!LIVE) { console.log('Trockenlauf Rücknahme: würde', W, DT, 'auf den Codex-Stand zurücksetzen (Snippet bleibt, ungenutzt).'); process.exit(0); }
  const r = await gql(`mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$t, files:$f){ userErrors{ field message } } }`, { t: THEME, f: [W, DT].map(f => ({ filename: f, body: { type: 'TEXT', value: alt[f] } })) });
  console.log(JSON.stringify(r)); const nach = await lies([W, DT]);
  for (const f of [W, DT]) console.log(f, md5(nach[f]) === md5(alt[f]) ? 'GLEICH' : 'ABWEICHUNG');
  process.exit(0);
}
// Basis: muss dem Stand entsprechen, aus dem gepatcht wird (Codex R266-R268)
mkdirSync(SICH, { recursive: true });
if (!existsSync(SICH + 'lx-collection-welten.vor.liquid')) {
  writeFileSync(SICH + 'lx-collection-welten.vor.liquid', ist[W]);
  writeFileSync(SICH + 'lx-collection-details.vor.liquid', ist[DT]);
  console.log('Sicherung angelegt:', md5(ist[W]), md5(ist[DT]));
}
const vorW = readFileSync(SICH + 'lx-collection-welten.vor.liquid', 'utf8'), vorD = readFileSync(SICH + 'lx-collection-details.vor.liquid', 'utf8');
if (md5(ist[W]) !== md5(vorW) || md5(ist[DT]) !== md5(vorD)) {
  const tmpP = HIER + 'neu/';
  console.error('Live-Dateien weichen von der Sicherung ab (schon eingespielt oder fremd geändert):', md5(ist[W]), md5(ist[DT]));
  if (existsSync(SICH + 'neu.md5.json')) { const n = JSON.parse(readFileSync(SICH + 'neu.md5.json', 'utf8')); if (n[W] === md5(ist[W]) && n[DT] === md5(ist[DT])) { console.log('Schon eingespielt, nichts zu tun.'); process.exit(0); } }
  process.exit(3);
}
execFileSync('python3', ['-I', HIER + 'patch.py', SICH + 'lx-collection-welten.vor.liquid', SICH + 'lx-collection-details.vor.liquid', HIER + 'neu'], { stdio: 'inherit' });
const neuW = readFileSync(HIER + 'neu/lx-collection-welten.liquid', 'utf8'), neuD = readFileSync(HIER + 'neu/lx-collection-details.liquid', 'utf8'), sn = readFileSync(HIER + 'lx-menu-knoten.liquid', 'utf8');
writeFileSync(SICH + 'neu.md5.json', JSON.stringify({ [W]: md5(neuW), [DT]: md5(neuD), [SN]: md5(sn) }, null, 1));
console.log('Plan:', W, md5(ist[W]), '->', md5(neuW), '|', DT, md5(ist[DT]), '->', md5(neuD), '|', SN, ist[SN] ? md5(ist[SN]) : 'neu', '->', md5(sn));
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
// Snippet zuerst (Abschnitte brauchen es), dann beide Abschnitte
for (const [f, v] of [[SN, sn], [W, neuW], [DT, neuD]]) {
  const r = await gql(`mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$t, files:$f){ upsertedThemeFiles{ filename } userErrors{ field message } } }`, { t: THEME, f: [{ filename: f, body: { type: 'TEXT', value: v } }] });
  const ue = r.themeFilesUpsert.userErrors; console.log(f, ue.length ? JSON.stringify(ue) : 'geschrieben');
  if (ue.length) { console.error('ABBRUCH nach Fehler; Rücknahme mit ZURUECK=1 LIVE=1 prüfen'); process.exit(4); }
}
const nach = await lies([W, DT, SN]);
for (const [f, v] of [[SN, sn], [W, neuW], [DT, neuD]]) console.log('Rücklesen', f, md5(nach[f]) === md5(v) ? 'GLEICH' : 'ABWEICHUNG');
