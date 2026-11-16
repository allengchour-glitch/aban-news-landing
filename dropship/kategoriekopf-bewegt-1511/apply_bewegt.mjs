// Spielt den bewegten Kategoriekopf als NEUE Testdateien ins MAIN-Theme (Trockenlauf ist Vorgabe).
//   node apply_bewegt.mjs                    Trockenlauf: zeigt, was geschrieben wuerde; prueft, dass keine Datei mit fremdem Inhalt existiert
//   LIVE=1 node apply_bewegt.mjs             schreibt NUR die neuen Dateien, liest frisch zurueck, prueft unveraenderte bestehende Dateien
//   ZURUECK=1 LIVE=1 node apply_bewegt.mjs   loescht NUR die eigenen Dateien, und nur wenn sie noch genau unserem Stand entsprechen
// Bestehende Dateien (FREMD) werden nie geschrieben. Ihre Pruefsummen werden vor und nach dem Schreiben verglichen.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
import { gql, mainTheme, themeLesen } from './shop.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
export const DATEIEN = ['snippets/lx-kopf-bewegt.liquid', 'templates/collection.lxbewegt.json'];
export const FREMD = ['templates/collection.json', 'snippets/lx-kopf-kompakt.liquid', 'snippets/lx-kopf-pfad.liquid', 'snippets/lx-kopf-chips.liquid', 'sections/main-collection.liquid', 'layout/theme.liquid', 'AGENTS.md'];
// Erwartete Stände (16.11. 00:36 UTC gelesen). Weicht eine Datei ab (andere Sitzung), wird nichts geschrieben.
const ERWARTET = { 'templates/collection.json': 'f7592acb1a336cbcd98552693fd08ff4', 'snippets/lx-kopf-kompakt.liquid': 'a27ed6b6248968534648517fd58f8cd0', 'snippets/lx-kopf-pfad.liquid': '69565ad5f8d9fde2fe6825f0afa87b5e', 'snippets/lx-kopf-chips.liquid': '74104de0caa980fb1d751e0261f5d6bd', 'sections/main-collection.liquid': 'f928eda786bfa8cb29905a5ecf1ecd0c', 'layout/theme.liquid': '62a77592ae9e0648d2ccec60bdf23979', 'AGENTS.md': '11947bfa3323a9f8f0cb9f661769f36a' };
const BUCH = path.join(HIER, 'eingespielt.json');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const ohneKommentar = (s) => { const t = String(s || '').trimStart(); return t.startsWith('/*') ? t.slice(t.indexOf('*/') + 2).trimStart() : t; };
function gleich(f, ist, sollText) {
  if (!ist) return false;
  if (ist.md5 === md5(sollText)) return true;
  if (f.endsWith('.json')) { try { return JSON.stringify(JSON.parse(ohneKommentar(ist.content))) === JSON.stringify(JSON.parse(sollText)); } catch { return false; } }
  return false;
}
const t = await mainTheme();
console.log(new Date().toISOString(), 'MAIN:', t.id, t.name, LIVE ? 'LIVE' : 'Trockenlauf', ZURUECK ? 'ZURÜCK' : '');
const vorher = await themeLesen(t.id, [...DATEIEN, ...FREMD]);
const fremdVor = Object.fromEntries(FREMD.map((f) => [f, vorher[f] ? vorher[f].md5 : null]));
for (const f of FREMD) console.log('bestehend vorher:', f, fremdVor[f]);
const abw = FREMD.filter((f) => fremdVor[f] !== ERWARTET[f]);
if (abw.length && !ZURUECK) { console.log('ABBRUCH: fremde Datei(en) weichen vom erwarteten Stand ab:', abw.join(', ')); process.exit(3); }
if (ZURUECK) {
  let buch; try { buch = JSON.parse(fs.readFileSync(BUCH, 'utf8')); } catch { throw new Error('kein eingespielt.json: nichts zurückzunehmen'); }
  if (buch.theme !== t.id) throw new Error('anderes MAIN-Theme als beim Einspielen: ' + buch.theme);
  const weg = [];
  for (const f of DATEIEN) {
    const ist = vorher[f];
    if (!ist) { console.log('fehlt schon:', f); continue; }
    const unserer = ist.md5 === buch.dateien[f] || (buch.json && buch.json[f] && f.endsWith('.json') && JSON.stringify(JSON.parse(ohneKommentar(ist.content))) === buch.json[f]);
    if (!unserer) { console.log('NICHT gelöscht (fremd verändert):', f, ist.md5, '≠', buch.dateien[f]); continue; }
    weg.push(f);
  }
  console.log('zu löschen:', weg.join(', ') || '–');
  if (!LIVE) { console.log('Trockenlauf: nichts gelöscht.'); process.exit(0); }
  if (weg.length) {
    const d = await gql(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, f: weg });
    console.log(JSON.stringify(d.themeFilesDelete));
  }
  await new Promise((r) => setTimeout(r, 3000));
  const nach = await themeLesen(t.id, [...DATEIEN, ...FREMD]);
  for (const f of DATEIEN) console.log('nachher', f, nach[f] ? 'NOCH DA' : 'weg');
  for (const f of FREMD) console.log('bestehend', f, (nach[f] ? nach[f].md5 : null) === fremdVor[f] ? 'unverändert' : 'VERÄNDERT');
  process.exit(0);
}
const soll = {};
for (const f of DATEIEN) soll[f] = fs.readFileSync(path.join(HIER, 'theme', f), 'utf8');
let buch = {}; try { buch = JSON.parse(fs.readFileSync(BUCH, 'utf8')).dateien || {}; } catch {}
const schreiben = [];
for (const f of DATEIEN) {
  const ist = vorher[f];
  if (ist && gleich(f, ist, soll[f])) { console.log('gleich (nichts zu tun):', f); continue; }
  if (ist && ist.md5 !== buch[f]) throw new Error('ABBRUCH: ' + f + ' existiert schon mit fremdem Inhalt (' + ist.md5 + ')');
  schreiben.push(f);
  console.log((ist ? 'ersetzen (eigener früherer Stand): ' : 'neu: ') + f, Buffer.byteLength(soll[f]), 'Byte, md5', md5(soll[f]));
}
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
// Reihenfolge: zuerst das Snippet, dann die Vorlage, die es benutzt
for (const f of schreiben) {
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, files: [{ filename: f, body: { type: 'TEXT', value: soll[f] } }] });
  const e = d.themeFilesUpsert.userErrors;
  if (e.length) throw new Error('Fehler beim Schreiben ' + f + ': ' + JSON.stringify(e));
  console.log('geschrieben:', f);
}
let nach;
for (let v = 0; v < 6; v++) {
  await new Promise((r) => setTimeout(r, v ? 10000 : 3000));
  nach = await themeLesen(t.id, [...DATEIEN, ...FREMD]);
  if (DATEIEN.every((f) => gleich(f, nach[f], soll[f]))) break;
}
let gut = true;
for (const f of DATEIEN) { const g = gleich(f, nach[f], soll[f]); if (!g) gut = false; console.log('Rücklesen', f, g ? 'GLEICH' : 'ABWEICHUNG', nach[f] && nach[f].md5, nach[f] && nach[f].md5 !== md5(soll[f]) ? '(JSON inhaltlich verglichen)' : ''); }
for (const f of FREMD) { const g = (nach[f] ? nach[f].md5 : null) === fremdVor[f]; if (!g) gut = false; console.log('bestehend', f, g ? 'unverändert' : 'VERÄNDERT', nach[f] && nach[f].md5); }
fs.writeFileSync(BUCH, JSON.stringify({ theme: t.id, zeit: new Date().toISOString(), dateien: Object.fromEntries(DATEIEN.map((f) => [f, nach[f] ? nach[f].md5 : md5(soll[f])])), json: Object.fromEntries(DATEIEN.filter((f) => f.endsWith('.json')).map((f) => [f, JSON.stringify(JSON.parse(soll[f]))])), fremd: fremdVor }, null, 1));
console.log(gut ? 'ALLES GLEICH' : 'ABWEICHUNG');
process.exit(gut ? 0 : 1);
