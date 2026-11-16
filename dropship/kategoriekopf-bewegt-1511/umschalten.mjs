// SPAETER (nur auf Ja des Besitzers): stellt den LIVE-Kategoriekopf auf die bewegte Fassung um.
// Aendert in templates/collection.json genau EINEN Wert: sections.lux_hero.settings.custom_liquid
//   von  {% render 'lx-kopf-kompakt' %}
//   auf  {% render 'lx-kopf-bewegt', teil: 'kopf' %}{% render 'lx-kopf-kompakt' %}{% render 'lx-kopf-bewegt', teil: 'fuss' %}
//   node umschalten.mjs                    Trockenlauf (Vorgabe): zeigt den Unterschied, schreibt nichts
//   LIVE=1 node umschalten.mjs             sichert collection.json nach sicherung/, schreibt, liest zurueck
//   ZURUECK=1 LIVE=1 node umschalten.mjs   schreibt die juengste Sicherung zurueck (nur wenn die Datei noch unserem Stand entspricht)
// Bricht ab, wenn collection.json nicht mehr die erwartete Pruefsumme hat (ERWARTET_MD5=<neu> bestaetigt bewusst einen neuen Stand),
// oder wenn snippets/lx-kopf-bewegt.liquid im Theme fehlt oder nicht unserem Stand entspricht.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
import { gql, mainTheme, themeLesen } from './shop.mjs';
import { ALT, NEU, ohneKommentar, umbauen } from './vorlage_bauen.mjs';
const HIER = path.dirname(new URL(import.meta.url).pathname);
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const ERWARTET = process.env.ERWARTET_MD5 || 'f7592acb1a336cbcd98552693fd08ff4';
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const F = 'templates/collection.json', S = 'snippets/lx-kopf-bewegt.liquid';
const t = await mainTheme();
console.log(new Date().toISOString(), 'MAIN:', t.id, t.name, LIVE ? 'LIVE' : 'Trockenlauf', ZURUECK ? 'ZURÜCK' : '');
const ist = await themeLesen(t.id, [F, S]);
if (!ist[F]) throw new Error(F + ' fehlt');
const d = JSON.parse(ohneKommentar(ist[F].content));
const jetzt = d.sections && d.sections.lux_hero && d.sections.lux_hero.settings && d.sections.lux_hero.settings.custom_liquid;
console.log(F, 'md5', ist[F].md5, '| lux_hero:', JSON.stringify(jetzt));
if (ZURUECK) {
  const sich = fs.readdirSync(path.join(HIER, 'sicherung')).filter((n) => n.startsWith('collection.json.vor-')).sort().pop();
  if (!sich) throw new Error('keine Sicherung vorhanden');
  if (jetzt !== NEU) throw new Error('ABBRUCH: lux_hero ist nicht unsere umgestellte Fassung, nichts zurückgeschrieben');
  const alt = fs.readFileSync(path.join(HIER, 'sicherung', sich), 'utf8');
  const altJ = JSON.parse(ohneKommentar(alt));
  const probe = JSON.parse(JSON.stringify(altJ)); probe.sections.lux_hero.settings.custom_liquid = NEU;
  if (JSON.stringify(probe) !== JSON.stringify(d)) console.log('HINWEIS: collection.json wurde seit dem Umschalten auch anderswo geändert. Zurückgeschrieben wird nur lux_hero.');
  d.sections.lux_hero.settings.custom_liquid = ALT;
  const text = JSON.stringify(d, null, 2) + '\n';
  console.log('würde schreiben: lux_hero =', JSON.stringify(ALT), '(Sicherung', sich + ')');
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
  const r = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, files: [{ filename: F, body: { type: 'TEXT', value: text } }] });
  if (r.themeFilesUpsert.userErrors.length) throw new Error(JSON.stringify(r.themeFilesUpsert.userErrors));
  await new Promise((r2) => setTimeout(r2, 4000));
  const n = await themeLesen(t.id, [F]);
  console.log('Rücklesen lux_hero:', JSON.parse(ohneKommentar(n[F].content)).sections.lux_hero.settings.custom_liquid === ALT ? 'GLEICH (zurück)' : 'ABWEICHUNG');
  process.exit(0);
}
if (jetzt === NEU) { console.log('Bereits umgestellt, nichts zu tun.'); process.exit(0); }
if (ist[F].md5 !== ERWARTET) throw new Error('ABBRUCH: ' + F + ' hat md5 ' + ist[F].md5 + ' statt ' + ERWARTET + '. Erst lesen, dann mit ERWARTET_MD5=<neu> bewusst bestätigen.');
const buch = JSON.parse(fs.readFileSync(path.join(HIER, 'eingespielt.json'), 'utf8'));
if (!ist[S]) throw new Error('ABBRUCH: ' + S + ' fehlt im Theme (zuerst LIVE=1 node apply_bewegt.mjs)');
if (ist[S].md5 !== buch.dateien[S]) throw new Error('ABBRUCH: ' + S + ' entspricht nicht unserem Stand (' + ist[S].md5 + ')');
const neu = umbauen(ist[F].content);
const text = JSON.stringify(neu, null, 2) + '\n';
const vergleich = JSON.parse(ohneKommentar(ist[F].content)); vergleich.sections.lux_hero.settings.custom_liquid = NEU;
if (JSON.stringify(vergleich) !== JSON.stringify(neu)) throw new Error('interner Fehler: mehr als ein Wert geändert');
console.log('Änderung: lux_hero.custom_liquid');
console.log('  alt:', JSON.stringify(ALT));
console.log('  neu:', JSON.stringify(NEU));
console.log('  sonst unverändert (geprüft), neue Länge', text.length, 'Zeichen');
if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
const sichName = 'collection.json.vor-' + new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(path.join(HIER, 'sicherung', sichName), ist[F].content);
console.log('Sicherung:', sichName, md5(ist[F].content));
const r = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename code message}}}`, { id: t.id, files: [{ filename: F, body: { type: 'TEXT', value: text } }] });
if (r.themeFilesUpsert.userErrors.length) throw new Error(JSON.stringify(r.themeFilesUpsert.userErrors));
await new Promise((r2) => setTimeout(r2, 4000));
const n = await themeLesen(t.id, [F]);
const ok = JSON.stringify(JSON.parse(ohneKommentar(n[F].content))) === JSON.stringify(neu);
console.log('Rücklesen:', ok ? 'GLEICH' : 'ABWEICHUNG', n[F].md5);
process.exit(ok ? 0 : 1);
