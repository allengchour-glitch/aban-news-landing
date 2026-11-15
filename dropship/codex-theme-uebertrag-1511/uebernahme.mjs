// Codex-Theme 214040805767 «LuxeStyle – Kaufhinweis 15.11.2026»: genau die 7 vom Besitzer freigegebenen Dateien ins MAIN-Theme übernehmen.
// Besitzer 15.11.2026 auf gezielte Frage: «7 Dateien übernehmen» (statt das ganze, ältere Entwurfs-Theme zu veröffentlichen).
// NICHT übernommen: layout/theme.liquid und snippets/cart-summary.liquid (vereinfachte Gratisversand-Rechnung, laut Codex R239 nicht freigegeben),
// assets/luxestyle-manifest.json (themeeigene Asset-Pfade t/29 gegen t/30).
// Schutz: jede MAIN-Datei muss noch dieselbe md5 haben wie vor dem Klon des Entwurfs (MAIN-Stand 14.11. 13:42 UTC), sonst Abbruch.
// Trockenlauf Vorgabe · LIVE=1 schreibt (Sicherung sicherung/<datei>.vor-<ts>, frisch zurücklesen) · ZURUECK=1 LIVE=1 schreibt die Sicherung zurück (nur wenn MAIN noch gleich dem Übertrag ist).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const MAIN = 'gid://shopify/OnlineStoreTheme/213991391623', ENTWURF = 'gid://shopify/OnlineStoreTheme/214040805767';
export const DATEIEN = ['blocks/buy-buttons.liquid', 'sections/footer-group.json', 'assets/luxe-edit.css', 'sections/luxe-edit-home.liquid', 'locales/de.schema.json', 'locales/en.default.schema.json', 'templates/index.json'];
const md5 = s => createHash('md5').update(s).digest('hex');
const shop = process.env.SHOPIFY_SHOP;
const tok = (await (await fetch(`https://${shop}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json()).access_token;
const gql = async (query, variables) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return r.data; };
const lesen = async id => Object.fromEntries((await gql(`query($id:ID!,$f:[String!]!){theme(id:$id){role files(filenames:$f,first:20){nodes{filename checksumMd5 updatedAt body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id, f: DATEIEN })).theme.files.nodes.map(n => [n.filename, n]));
const rolle = async id => (await gql(`query($id:ID!){theme(id:$id){role name}}`, { id })).theme;
const rm = await rolle(MAIN); if (rm.role !== 'MAIN') { console.error('ABBRUCH: 213991391623 ist nicht MAIN', rm); process.exit(2); }
const m = await lesen(MAIN);
let soll = {};
if (ZURUECK) {
  const ts = readdirSync(W + '/sicherung').filter(f => f.startsWith('uebertrag.')).map(f => f.split('.vor-')[1]).filter(Boolean).sort().pop();
  if (!ts) { console.error('keine Sicherung'); process.exit(3); }
  for (const f of DATEIEN) {
    const nach = readFileSync(`${W}/sicherung/uebertrag.${f.replace(/\//g, '__')}.nach-${ts}`, 'utf8');
    if (m[f]?.body?.content !== nach) { console.error('ABBRUCH: seit dem Übertrag geändert:', f); process.exit(4); }
    soll[f] = readFileSync(`${W}/sicherung/uebertrag.${f.replace(/\//g, '__')}.vor-${ts}`, 'utf8');
  }
} else {
  const e = await lesen(ENTWURF);
  const vorher = JSON.parse(readFileSync(W + '/basis_md5.json', 'utf8'));
  for (const f of DATEIEN) {
    if (!m[f] || !e[f]) { console.error('ABBRUCH: Datei fehlt', f); process.exit(2); }
    if (m[f].checksumMd5 !== vorher[f]) { console.error('ABBRUCH: MAIN geändert seit der Prüfung:', f, m[f].checksumMd5, 'statt', vorher[f]); process.exit(5); }
    if (m[f].updatedAt > '2026-11-15T09:34:00Z') { console.error('ABBRUCH: MAIN-Datei jünger als der Klon:', f, m[f].updatedAt); process.exit(5); }
    soll[f] = e[f].body.content;
    console.log(f.padEnd(34), 'MAIN', m[f].checksumMd5.slice(0, 8), '-> Entwurf', e[f].checksumMd5.slice(0, 8), `(${m[f].body.content.length} -> ${soll[f].length} Zeichen)`);
  }
}
if (!LIVE) { console.log(ZURUECK ? 'Trockenlauf Rücknahme: nichts geschrieben' : 'Trockenlauf: nichts geschrieben'); process.exit(0); }
const ts = new Date().toISOString().replace(/[:.]/g, '-'); mkdirSync(W + '/sicherung', { recursive: true });
if (!ZURUECK) for (const f of DATEIEN) { const k = f.replace(/\//g, '__'); writeFileSync(`${W}/sicherung/uebertrag.${k}.vor-${ts}`, m[f].body.content); writeFileSync(`${W}/sicherung/uebertrag.${k}.nach-${ts}`, soll[f]); }
const r = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: MAIN, files: DATEIEN.map(f => ({ filename: f, body: { type: 'TEXT', value: soll[f] } })) });
if (r.themeFilesUpsert.userErrors.length) { console.error('FEHLER', JSON.stringify(r.themeFilesUpsert.userErrors)); process.exit(6); }
const json = f => f.endsWith('.json');
const gleich = (f, a, b) => { if (!json(f)) return a === b; try { const s = x => JSON.stringify(JSON.parse(x.replace(/^\/\*[\s\S]*?\*\/\s*/, ''))); return s(a) === s(b); } catch { return a === b; } };
for (let i = 0; i < 8; i++) {
  await new Promise(z => setTimeout(z, i ? 8000 : 3000));
  const n = await lesen(MAIN); const abw = DATEIEN.filter(f => !gleich(f, n[f]?.body?.content ?? '', soll[f]));
  console.log(new Date().toISOString(), 'Ruecklesen', i + 1, abw.length ? 'noch nicht: ' + abw.join(', ') : 'GLEICH alle ' + DATEIEN.length);
  if (!abw.length) process.exit(0);
}
process.exit(7);
