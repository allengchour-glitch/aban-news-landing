// Spielt die Scroll-Geschichte als NEUE Dateien ins MAIN-Theme (Trockenlauf Vorgabe).
//   node apply_story.mjs                 Trockenlauf: zeigt, was geschrieben würde, prüft dass keine Datei schon existiert (oder gleich unserem Stand ist)
//   LIVE=1 node apply_story.mjs          schreibt, liest frisch zurück (md5), prüft unveränderte Fremddateien
//   ZURUECK=1 LIVE=1 node apply_story.mjs  löscht NUR die eigenen Dateien, und nur wenn sie noch genau unserem Stand entsprechen
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
import { gql, mainTheme, themeLesen } from './shop.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const DATEIEN = ['assets/lx-story.js', 'sections/lx-story.liquid', 'sections/lx-story-platz.liquid', 'sections/lx-story-testseite.liquid', 'templates/index.lxstory.json'];
const FREMD = ['templates/index.json', 'layout/theme.liquid', 'sections/luxe-edit-home.liquid', 'assets/luxe-edit.css', 'assets/luxe-edit.js', 'templates/index.lxszene.json', 'sections/lx-scroll-szene.liquid', 'assets/lx-scroll-szene.js'];
const BUCH = path.join(HIER, 'eingespielt.json');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const t = await mainTheme();
console.log('MAIN:', t.id, t.name, LIVE ? 'LIVE' : 'Trockenlauf', ZURUECK ? 'ZURÜCK' : '');
const vorher = await themeLesen(t.id, [...DATEIEN, ...FREMD]);
const fremdVor = Object.fromEntries(FREMD.map((f) => [f, vorher[f] ? vorher[f].md5 : null]));
console.log('Fremddateien vorher:', JSON.stringify(fremdVor));
if (ZURUECK) {
  const buch = JSON.parse(fs.readFileSync(BUCH, 'utf8'));
  if (buch.theme !== t.id) throw new Error('anderes MAIN-Theme als beim Einspielen: ' + buch.theme);
  const weg = [];
  for (const f of DATEIEN) {
    const ist = vorher[f];
    if (!ist) { console.log('fehlt schon:', f); continue; }
    if (!buch.dateien[f]) { console.log('nicht im Buch, bleibt:', f); continue; }
    if (ist.md5 !== buch.dateien[f]) { console.log('NICHT gelöscht (fremd verändert):', f, ist.md5, '≠', buch.dateien[f]); continue; }
    weg.push(f);
  }
  console.log('zu löschen:', weg.join(', '));
  if (LIVE && weg.length) {
    const d = await gql(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, f: weg });
    console.log(JSON.stringify(d.themeFilesDelete));
  }
  process.exit(0);
}
const soll = {};
for (const f of DATEIEN) soll[f] = fs.readFileSync(path.join(HIER, 'theme', f), 'utf8');
let buch = {}; try { buch = JSON.parse(fs.readFileSync(BUCH, 'utf8')).dateien || {}; } catch {}
const schreiben = [];
for (const f of DATEIEN) {
  const ist = vorher[f];
  if (ist && ist.md5 !== buch[f] && ist.md5 !== md5(soll[f])) throw new Error('ABBRUCH: ' + f + ' existiert schon mit fremdem Inhalt (' + ist.md5 + ')');
  if (ist && ist.md5 === md5(soll[f])) { console.log('gleich:', f); continue; }
  schreiben.push(f);
  console.log((ist ? 'ersetzen (eigener Stand): ' : 'neu: ') + f, soll[f].length, 'Zeichen, md5', md5(soll[f]));
}
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
for (const f of schreiben) {
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, files: [{ filename: f, body: { type: 'TEXT', value: soll[f] } }] });
  const e = d.themeFilesUpsert.userErrors;
  if (e.length) throw new Error('Fehler beim Schreiben ' + f + ': ' + JSON.stringify(e));
  console.log('geschrieben:', f);
}
// Nicht mehr gebrauchte eigene Dateien entfernen (nur wenn noch genau unser früherer Stand)
const ALT = { 'assets/lx-story.css': 'd789f1ee728081ae62866a7afdbaf1e5', 'snippets/lx-story-stil.liquid': '0f340d8674ff85b6d98a710f054e7554' };
const altIst = await themeLesen(t.id, Object.keys(ALT));
for (const [f, m] of Object.entries(ALT)) {
  if (!altIst[f]) continue;
  if (altIst[f].md5 !== m) { console.log('alte Datei fremd verändert, bleibt:', f); continue; }
  const d = await gql(`mutation($id:ID!,$f:[String!]!){themeFilesDelete(themeId:$id,files:$f){deletedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, f: [f] });
  console.log('entfernt (nicht mehr gebraucht):', f, JSON.stringify(d.themeFilesDelete.userErrors));
}
// frisch zurücklesen (mit Wiederholung, das Rücklesen kann kurz nachhinken)
let nach;
for (let v = 0; v < 6; v++) {
  await new Promise((r) => setTimeout(r, v ? 10000 : 3000));
  nach = await themeLesen(t.id, [...DATEIEN, ...FREMD]);
  if (DATEIEN.every((f) => nach[f] && nach[f].md5 === md5(soll[f]))) break;
}
let gut = true;
for (const f of DATEIEN) { const ok = nach[f] && nach[f].md5 === md5(soll[f]); if (!ok) gut = false; console.log('Rücklesen', f, ok ? 'GLEICH' : 'ABWEICHUNG', nach[f] && nach[f].md5); }
for (const f of FREMD) { const ok = (nach[f] ? nach[f].md5 : null) === fremdVor[f]; if (!ok) gut = false; console.log('Fremddatei', f, ok ? 'unverändert' : 'VERÄNDERT', nach[f] && nach[f].md5); }
fs.writeFileSync(BUCH, JSON.stringify({ theme: t.id, zeit: new Date().toISOString(), dateien: Object.fromEntries(DATEIEN.map((f) => [f, md5(soll[f])])), fremd: fremdVor }, null, 1));
console.log(gut ? 'ALLES GLEICH' : 'ABWEICHUNG');
process.exit(gut ? 0 : 1);
