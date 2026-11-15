// Kompakter Kategorie-Kopf: Umschalten auf die neuen Dateien (fuer die Hauptsitzung). Fassung 2 (Pruefrunde 12.11.2026).
// Trockenlauf (Vorgabe):  node umschalten.mjs                       liest MAIN, prueft, zeigt die Aenderung, schreibt nichts
// Live:                   LIVE=1 node umschalten.mjs                Sicherung -> sicherung/, schreiben (eine Anfrage), frisch zuruecklesen
// Rueckweg:               ZURUECK=1 LIVE=1 node umschalten.mjs      entfernt NUR die eigenen Teile und vergleicht mit der Sicherung
// Optional:               ANKUENDIGUNG=1  zusaetzlich 1 Zeile render 'lx-ankuendigung-stabil' vor </head> in layout/theme.liquid
// Geaendert werden: templates/collection.json (3 Snippets, lux_usp_coll weg, Reihenfolge) und sections/main-collection.liquid
// (Eager-Block fuer die ersten Karten, KEIN Typwechsel mehr). Vor LIVE: die vier Snippets muessen die gepruefte md5 haben.
// Schalter: BASIS_EGAL=1 (Ausgangsstand weicht ab), FREMD_UEBERSCHREIBEN=1 (Ruecknahme trotz fremder Aenderung, nur eigene Teile raus).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { shopifyGql } from '/home/user/aban-news-landing/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/home/user/aban-news-landing/automation/lib/shopify_secret.mjs';
import { md5, COLLECTION_BASIS_MD5, MAIN_BASIS_MD5, SNIPPET_MD5, mainPatchen, mainEntpatchen, ankEinfuegen, ankEntfernen, ANK_ZEILE, ruecknahmePlan, umbauen, zurueckbauen, jsonAus } from './umschalten_lib.mjs';
const W = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1', ANK = process.env.ANKUENDIGUNG === '1';
const FREMD = process.env.FREMD_UEBERSCHREIBEN === '1', BASIS_EGAL = process.env.BASIS_EGAL === '1';
const C = 'templates/collection.json', M = 'sections/main-collection.liquid', T = 'layout/theme.liquid';
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await tr.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const lesen = async f => Object.fromEntries((await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:20){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f })).theme.files.nodes.map(n => [n.filename, n.body?.content ?? null]));
const schreiben = async dateien => { const r = await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: Object.entries(dateien).map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })) }); const e = r.themeFilesUpsert.userErrors; if (e.length) throw new Error(JSON.stringify(e)); };
const gleich = (f, a, b) => f.endsWith('.json') ? JSON.stringify(jsonAus(a)) === JSON.stringify(jsonAus(b)) : a === b;
async function ruecklesen(soll) {
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, i ? 8000 : 3000));
    const r = await lesen(Object.keys(soll));
    const abw = Object.keys(soll).filter(f => r[f] == null || !gleich(f, r[f], soll[f]));
    console.log('Ruecklesen', i + 1, abw.length ? 'noch nicht: ' + abw.join(', ') : 'GLEICH ' + Object.keys(soll).join(', '));
    if (!abw.length) return true;
  }
  return false;
}
const SICH = process.env.SICHERUNG_DIR || W + '/sicherung'; mkdirSync(SICH, { recursive: true });
const SNIPS = Object.keys(SNIPPET_MD5).filter(f => ANK || !f.includes('ankuendigung'));
const ist = await lesen([C, M, T, ...SNIPS]);

if (ZURUECK) {
  const ts = readdirSync(SICH).filter(f => f.startsWith('collection.json.vor-')).map(f => f.slice('collection.json.vor-'.length)).sort().pop();
  if (!ts) { console.error('Keine Sicherung'); process.exit(3); }
  const s = f => existsSync(`${SICH}/${f}-${ts}`) ? readFileSync(`${SICH}/${f}-${ts}`, 'utf8') : null;
  console.log('Sicherung', ts);
  const plan = {}; const fehler = [];
  // collection.json
  if (gleich(C, ist[C], s('collection.json.nach'))) plan[C] = s('collection.json.vor');
  else if (FREMD) { plan[C] = JSON.stringify(zurueckbauen(jsonAus(ist[C]), jsonAus(s('collection.json.vor'))), null, 2); console.log(C, ': fremd geaendert, nur eigene Teile zurueck'); }
  else fehler.push(C + ': seit dem Umschalten geaendert');
  // main-collection.liquid
  if (s('main-collection.liquid.vor') != null) {
    const p = ruecknahmePlan(ist[M], s('main-collection.liquid.vor'), mainEntpatchen, FREMD);
    if (p.ok) { plan[M] = p.schreiben; if (p.fremd) console.log(M, ': fremd geaendert, nur eigener Block raus'); } else fehler.push(M + ': ' + p.grund);
  }
  // theme.liquid (nur wenn unsere Zeile drin ist)
  if ((ist[T] || '').includes(ANK_ZEILE + '</head>')) {
    const vorT = s('theme.liquid.vor');
    if (vorT == null) { if (FREMD) plan[T] = ankEntfernen(ist[T]); else fehler.push(T + ': Zeile da, aber keine Sicherung dieses Laufs'); }
    else { const p = ruecknahmePlan(ist[T], vorT, ankEntfernen, FREMD); if (p.ok) { plan[T] = p.schreiben; if (p.fremd) console.log(T, ': fremd geaendert, nur die eine Zeile raus'); } else fehler.push(T + ': ' + p.grund); }
  }
  if (fehler.length) { console.error('ABBRUCH, nichts geschrieben:\n  ' + fehler.join('\n  ')); process.exit(4); }
  console.log('Rueckweg schreibt:', Object.keys(plan).join(', '));
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben'); process.exit(0); }
  await schreiben(plan);
  process.exit((await ruecklesen(plan)) ? 0 : 7);
}

for (const f of SNIPS) {
  if (ist[f] == null) { console.error('ABBRUCH: neue Datei fehlt im Theme:', f); process.exit(2); }
  if (md5(ist[f]) !== SNIPPET_MD5[f]) { console.error('ABBRUCH:', f, 'hat md5', md5(ist[f]), 'statt des geprueften', SNIPPET_MD5[f]); process.exit(2); }
}
console.log('Snippets geprueft (md5):', SNIPS.length);
if (md5(ist[C]) !== COLLECTION_BASIS_MD5 && !BASIS_EGAL) { console.error('ABBRUCH:', C, 'geaendert seit 11.11., md5', md5(ist[C]), '(erst Unterschied lesen, dann BASIS_EGAL=1)'); process.exit(5); }
if (md5(ist[M]) !== MAIN_BASIS_MD5 && !BASIS_EGAL) { console.error('ABBRUCH:', M, 'geaendert seit 04.11., md5', md5(ist[M]), '(erst Unterschied lesen, dann BASIS_EGAL=1)'); process.exit(5); }
const da = jsonAus(ist[C]);
const neuC = umbauen(da);
const soll = { [C]: JSON.stringify(neuC, null, 2), [M]: mainPatchen(ist[M]) };
console.log('Reihenfolge alt:', da.order.join(', '));
console.log('Reihenfolge neu:', neuC.order.join(', '));
for (const k of Object.keys(da.sections)) {
  if (!neuC.sections[k]) { console.log('entfernt:', k); continue; }
  if (JSON.stringify(da.sections[k]) !== JSON.stringify(neuC.sections[k])) console.log('geaendert:', k, '(custom_liquid -> ' + neuC.sections[k].settings.custom_liquid + ')');
}
console.log(M, ': Karten-Block', ist[M].length, '->', soll[M].length, 'Zeichen (Typ main-collection bleibt)');
if (ANK) { if (ist[T].includes("render 'lx-ankuendigung-stabil'")) console.log(T, ': Zeile schon da'); else { soll[T] = ankEinfuegen(ist[T]); console.log(T, ': + 1 Zeile vor </head>'); } }
writeFileSync(W + '/collection.json.neu', soll[C]);
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben. Neuer Stand in collection.json.neu'); process.exit(0); }
const ts = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`${SICH}/collection.json.vor-${ts}`, ist[C]); writeFileSync(`${SICH}/collection.json.nach-${ts}`, soll[C]);
writeFileSync(`${SICH}/main-collection.liquid.vor-${ts}`, ist[M]); writeFileSync(`${SICH}/main-collection.liquid.nach-${ts}`, soll[M]);
if (soll[T]) { writeFileSync(`${SICH}/theme.liquid.vor-${ts}`, ist[T]); writeFileSync(`${SICH}/theme.liquid.nach-${ts}`, soll[T]); }
await schreiben(soll);
process.exit((await ruecklesen(soll)) ? 0 : 7);
