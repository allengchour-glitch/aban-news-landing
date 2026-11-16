// Kachel-Fix 16.11.2026 (Claude), Fassung 3: Codex' Kategorieabschnitte erkennen auch Menü-Links vom Typ HTTP,
// lange Kachelraster werden gekürzt, die Kachel lädt nur ein Produkt, der Pfad verlinkt nie auf die eigene Seite.
// Trockenlauf ist Vorgabe. LIVE=1 schreibt; ZURUECK=1 LIVE=1 stellt die Sicherung wieder her.
// Schreibt nur, wenn die Live-Dateien genau dem gesicherten Stand entsprechen (Prüfsumme), sonst Abbruch.
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
// Theme-Datei -> Name der Sicherung und der Ausgabe von patch.py. Reihenfolge = Schreibreihenfolge (Abhängigkeiten zuerst).
const SN = 'snippets/lx-menu-knoten.liquid';
const DATEIEN = [
  ['snippets/lx-collection-welten-card.liquid', 'lx-collection-welten-card'],
  ['snippets/lx-kopf-pfad.liquid', 'lx-kopf-pfad'],
  ['sections/lx-collection-details.liquid', 'lx-collection-details'],
  ['sections/lx-collection-welten.liquid', 'lx-collection-welten'],
];
const NAMEN = DATEIEN.map(d => d[0]);
async function lies(namen) {
  const d = await gql(`query($f:[String!]){ theme(id:"${THEME}"){ files(filenames:$f, first:10){ nodes{ filename checksumMd5 body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`, { f: namen });
  return Object.fromEntries(d.theme.files.nodes.map(n => [n.filename, n.body?.content ?? null]));
}
async function schreibe(f, v) {
  const r = await gql(`mutation($t:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$t, files:$f){ upsertedThemeFiles{ filename } userErrors{ field message } } }`, { t: THEME, f: [{ filename: f, body: { type: 'TEXT', value: v } }] });
  const ue = r.themeFilesUpsert.userErrors; console.log(f, ue.length ? JSON.stringify(ue) : 'geschrieben');
  return ue.length === 0;
}
const SICH = HIER + 'sicherung/';
const vorPfad = n => SICH + n + '.vor.liquid';
const ist = await lies([...NAMEN, SN]);
for (const f of NAMEN) if (ist[f] == null) { console.error('ABBRUCH: Datei fehlt im Theme:', f); process.exit(2); }

if (ZURUECK) {
  const neu = JSON.parse(readFileSync(SICH + 'neu.md5.json', 'utf8'));
  const zurueck = DATEIEN.filter(([f]) => md5(ist[f]) === neu[f]);
  const fremd = DATEIEN.filter(([f, n]) => md5(ist[f]) !== neu[f] && md5(ist[f]) !== md5(readFileSync(vorPfad(n), 'utf8')));
  if (fremd.length) { console.error('ABBRUCH: seit dem Einspielen fremd geändert, nichts zurückgeschrieben:', fremd.map(d => d[0]).join(', ')); process.exit(3); }
  if (!LIVE) { console.log('Trockenlauf Rücknahme: würde zurücksetzen:', zurueck.map(d => d[0]).join(', ') || '(nichts)', '| Snippet', SN, 'bleibt (ungenutzt).'); process.exit(0); }
  // Abschnitte zuerst (sie rufen das Snippet mit «titel» auf), dann Kachel und Pfad
  for (const [f, n] of [...zurueck].reverse()) if (!await schreibe(f, readFileSync(vorPfad(n), 'utf8'))) { console.error('ABBRUCH nach Fehler bei', f); process.exit(4); }
  const nach = await lies(NAMEN);
  for (const [f, n] of zurueck) console.log('Rücklesen', f, md5(nach[f]) === md5(readFileSync(vorPfad(n), 'utf8')) ? 'GLEICH' : 'ABWEICHUNG');
  process.exit(0);
}

mkdirSync(SICH, { recursive: true });
for (const [f, n] of DATEIEN) if (!existsSync(vorPfad(n))) { writeFileSync(vorPfad(n), ist[f]); console.log('Sicherung angelegt:', f, md5(ist[f])); }
const vor = Object.fromEntries(DATEIEN.map(([f, n]) => [f, readFileSync(vorPfad(n), 'utf8')]));
const abw = NAMEN.filter(f => md5(ist[f]) !== md5(vor[f]));
if (abw.length) {
  if (existsSync(SICH + 'neu.md5.json')) { const n = JSON.parse(readFileSync(SICH + 'neu.md5.json', 'utf8')); if (NAMEN.every(f => n[f] === md5(ist[f])) && ist[SN] && n[SN] === md5(ist[SN])) { console.log('Schon eingespielt, nichts zu tun.'); process.exit(0); } }
  console.error('ABBRUCH: Live-Dateien weichen von der Sicherung ab (fremd geändert oder halb eingespielt):', abw.join(', '));
  process.exit(3);
}
execFileSync('python3', ['-I', HIER + 'patch.py', ...['lx-collection-welten', 'lx-collection-details', 'lx-collection-welten-card', 'lx-kopf-pfad'].map(vorPfad), HIER + 'neu'], { stdio: 'inherit' });
const neu = Object.fromEntries(DATEIEN.map(([f, n]) => [f, readFileSync(HIER + 'neu/' + n + '.liquid', 'utf8')]));
const sn = readFileSync(HIER + 'lx-menu-knoten.liquid', 'utf8');
writeFileSync(SICH + 'neu.md5.json', JSON.stringify({ ...Object.fromEntries(NAMEN.map(f => [f, md5(neu[f])])), [SN]: md5(sn) }, null, 1));
for (const f of NAMEN) console.log('Plan:', f, md5(ist[f]), '->', md5(neu[f]));
console.log('Plan:', SN, ist[SN] ? md5(ist[SN]) : 'neu', '->', md5(sn));
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
for (const [f, v] of [[SN, sn], ...NAMEN.map(f => [f, neu[f]])]) {
  if (!await schreibe(f, v)) { console.error('ABBRUCH nach Fehler; bereits geschriebene Dateien mit ZURUECK=1 LIVE=1 zurücknehmen'); process.exit(4); }
}
const nach = await lies([...NAMEN, SN]);
let ok = true;
for (const [f, v] of [[SN, sn], ...NAMEN.map(f => [f, neu[f]])]) { const g = md5(nach[f]) === md5(v); ok &&= g; console.log('Rücklesen', f, g ? 'GLEICH' : 'ABWEICHUNG'); }
process.exit(ok ? 0 : 5);
