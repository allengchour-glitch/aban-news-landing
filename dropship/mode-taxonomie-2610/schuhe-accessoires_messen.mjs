/**
 * Messung der Abteilung «Schuhe & Accessoires» — liest NUR schuhe-accessoires.json und /tmp/mode_daten.json und wertet die Regeln
 * genau so aus, wie die Aufgabe es vorschreibt (eigene Auswertung, ohne istMitglied aus sa_regeln.mjs).
 *   node schuhe-accessoires_messen.mjs                      -> Uebersicht (Treffer, Abteilung, Geschlechter, Ueberschneidung, Rest)
 *   node schuhe-accessoires_messen.mjs --zeige <handle> [n] -> die Stichprobe (fester Seed) nummeriert
 *   node schuhe-accessoires_messen.mjs --uf <handle> [n]    -> Stichprobe je Unterfilter
 *   node schuhe-accessoires_messen.mjs --stich              -> schreibt stichproben/<handle>.txt
 *   node schuhe-accessoires_messen.mjs --rest [n]           -> Titel ohne Kategorie
 * Das Geschlecht je Produkt kommt aus geschlecht() (sa_regeln.mjs) = die in `geschlecht_regel` beschriebene Stufenfolge.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geschlecht, gruppeVon } from './sa_regeln.mjs';
import { stichprobe, kurzG } from './sa_lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const J = JSON.parse(fs.readFileSync(path.join(HERE, 'schuhe-accessoires.json'), 'utf8'));
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const args = process.argv.slice(2);
const gesch = new Map(daten.map(p => [p.handle, geschlecht(p)]));
const rx = new Map(); const R = s => rx.get(s) || (rx.set(s, new RegExp(s, 'i')), rx.get(s));

/** Aufgabentext: g beginnt mit g_prefix (oder, falls leer, Titel passt) UND titel_muss UND kein titel_nicht UND kein g_nicht UND kein Tag aus tags_nicht UND tags_muss_eines UND Geschlecht passt */
export function mitglied(k, p) {
  const t = p.title, g = p.g || '', tags = p.tags;
  const gOk = k.g_prefix.length ? k.g_prefix.some(x => g.startsWith(x)) : (k.titel_muss.length ? k.titel_muss.some(x => R(x).test(t)) : false);
  if (!gOk) return false;
  if (k.titel_muss.length && !k.titel_muss.some(x => R(x).test(t))) return false;
  if (k.titel_nicht.some(x => R(x).test(t))) return false;
  if (k.g_nicht.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht.some(x => tags.includes(x))) return false;
  if (k.tags_muss_eines.length && !k.tags_muss_eines.some(x => tags.includes(x))) return false;
  const pg = gesch.get(p.handle)[0];
  return k.geschlecht === 'kinder' ? pg === 'kinder' : k.geschlecht === 'unisex' ? pg === 'unisex' : (pg === k.geschlecht || pg === 'unisex');
}
export function imUnterfilter(u, p) {
  const t = p.title;
  return (!u.titel_muss.length || u.titel_muss.some(x => R(x).test(t))) && !u.titel_nicht.some(x => R(x).test(t));
}

export const mitglieder = Object.fromEntries(J.kategorien.map(k => [k.handle, daten.filter(p => mitglied(k, p))]));
const find = h => J.kategorien.find(k => k.handle === h);
const kurz = p => `${p.title.slice(0, 92)} [${kurzG(p.g).replace('Handbags, Wallets & Cases > ', 'H>').replace('Clothing Accessories > ', 'CA>').slice(0, 26)}|${gesch.get(p.handle)[0]}]`;

if (args[0] === '--zeige') {
  const k = find(args[1]); const n = +(args[2] || 30); const l = mitglieder[k.handle];
  console.log(`# ${k.handle}: ${l.length} Treffer, Stichprobe ${Math.min(n, l.length)}`);
  stichprobe(l, n, k.handle).forEach((p, i) => console.log(String(i + 1).padStart(2), process.env.KURZ ? p.title.slice(0, 84) + ' [' + gesch.get(p.handle)[0][0] + ']' : kurz(p)));
  process.exit(0);
}
if (args[0] === '--uf') {
  const k = find(args[1]); const n = +(args[2] || 8);
  for (const u of k.unterfilter) { const l = mitglieder[k.handle].filter(p => imUnterfilter(u, p)); console.log(`## ${u.handle}: ${l.length}`); stichprobe(l, n, u.handle).forEach((p, i) => console.log('  ', String(i + 1).padStart(2), kurz(p))); }
  process.exit(0);
}
if (args[0] === '--zeigeh') { // Handles zu Nummern der Stichprobe (fuer falsche_beispiele)
  const k = find(args[1]); const nrs = args.slice(2).map(Number);
  stichprobe(mitglieder[k.handle], 30, k.handle).forEach((p, i) => { if (nrs.includes(i + 1)) console.log(`${i + 1}\t${p.handle}\t${p.title}`); });
  process.exit(0);
}
if (args[0] === '--stich') {
  fs.mkdirSync(path.join(HERE, 'stichproben'), { recursive: true });
  for (const k of J.kategorien) fs.writeFileSync(path.join(HERE, 'stichproben', k.handle + '.txt'), stichprobe(mitglieder[k.handle], 30, k.handle).map((p, i) => `${i + 1}\t${p.handle}\t${p.title}\t${kurzG(p.g)}`).join('\n'));
  console.log('Stichproben geschrieben:', J.kategorien.length);
  process.exit(0);
}

// ── Abdeckung je Abteilung
const uni = daten.filter(p => gruppeVon(p));
const inAbt = abt => { const m = new Map(); for (const k of J.kategorien.filter(k => k.eltern === abt)) for (const p of mitglieder[k.handle]) (m.get(p.handle) || m.set(p.handle, []).get(p.handle)).push(k.handle); return m; };
const abts = { damen: inAbt('damen'), herren: inAbt('herren'), kinder: inAbt('kinder') };
const fremdSet = new Set(J.fremdkoerper.map(f => f.handle)); const restSet = new Set();
let fehler = 0;

if (args[0] === '--rest') {
  const rest = uni.filter(p => !Object.values(abts).some(m => m.has(p.handle)) && !fremdSet.has(p.handle));
  console.log('# Rest (nicht in Kategorie, nicht fremd):', rest.length);
  stichprobe(rest, +(args[1] || 40), 'rest').forEach(p => console.log(kurz(p)));
  process.exit(0);
}

console.log(`Datensatz: ${daten.length} Produkte, davon ${uni.length} in den Warengruppen der Abteilung. Kategorien: ${J.kategorien.length}`);
for (const abt of ['damen', 'herren', 'kinder']) {
  const ks = J.kategorien.filter(k => k.eltern === abt);
  const tot = new Set(ks.flatMap(k => mitglieder[k.handle].map(p => p.handle))).size;
  console.log(`\n== ${abt}: ${ks.length} Kategorien, ${tot} verschiedene Produkte`);
  for (const k of ks) {
    const l = mitglieder[k.handle]; const gc = {}; for (const p of l) gc[gesch.get(p.handle)[0]] = (gc[gesch.get(p.handle)[0]] || 0) + 1;
    const anteil = (100 * l.length / tot).toFixed(0);
    const marke = l.length < 15 ? '  <<< unter 15' : +anteil > 60 ? '  <<< ALARM Anteil' : l.length !== k.gemessen.treffer ? '  <<< JSON-Zahl weicht ab (' + k.gemessen.treffer + ')' : '';
    if (l.length !== k.gemessen.treffer || l.length < 15) fehler++;
    console.log(String(l.length).padStart(5), (anteil + '%').padStart(4), k.handle.padEnd(30), JSON.stringify(gc), marke);
    for (const u of k.unterfilter) { const n = l.filter(p => imUnterfilter(u, p)).length; if (n < 15 || n > 0.9 * l.length) { fehler++; console.log('       UF', u.handle, n, '<<< Unterfilter zu klein bzw. gleich gross wie die Kategorie'); } }
  }
  // je Produkt: erwartete Anzahl Blatt-Kategorien
  const m = abts[abt]; let ueber = 0, falschAbt = 0; const ueberB = [];
  for (const [h, v] of m) { if (v.length > 1) { ueber++; ueberB.push(h + ' -> ' + v.join('+')); } }
  for (const p of uni) { const g = gesch.get(p.handle)[0]; const soll = abt === 'kinder' ? g === 'kinder' : (g === abt || g === 'unisex'); if (m.has(p.handle) && !soll) falschAbt++; }
  console.log(`   mehrfach in ${abt}: ${ueber} ${ueberB.slice(0, 3).join(' | ')}; Produkte mit falschem Geschlecht in der Abteilung: ${falschAbt}`);
  if (ueber || falschAbt) fehler++;
  // Produkte, die laut Geschlecht in die Abteilung gehoeren, aber in keiner Kategorie stehen
  const soll = uni.filter(p => { const g = gesch.get(p.handle)[0]; return abt === 'kinder' ? g === 'kinder' : (g === abt || g === 'unisex'); });
  const fehlt = soll.filter(p => !m.has(p.handle));
  const fb = fehlt.filter(p => fremdSet.has(p.handle)).length;
  console.log(`   gehoeren laut Geschlecht hierher: ${soll.length} | in Kategorie: ${soll.length - fehlt.length} | als Fremdkoerper/Sperr genannt: ${fb} | Rest: ${fehlt.length - fb}`);
}
// Handle-Eindeutigkeit, Regex-Gueltigkeit
const hs = J.kategorien.flatMap(k => [k.handle, ...k.unterfilter.map(u => u.handle)]); if (new Set(hs).size !== hs.length) { fehler++; console.log('DOPPELTE HANDLES'); }
for (const k of J.kategorien) for (const s of [...k.titel_muss, ...k.titel_nicht, ...k.unterfilter.flatMap(u => [...u.titel_muss, ...u.titel_nicht])]) { try { new RegExp(s, 'i'); } catch (e) { fehler++; console.log('UNGUELTIGES MUSTER', k.handle, s); } }
const existing = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8')); const exh = new Set(existing.map(c => c.handle));
for (const h of hs) if (exh.has(h)) { fehler++; console.log('HANDLE EXISTIERT SCHON IM SHOP:', h); }
console.log('\nFremdkoerper genannt:', J.fremdkoerper.length, '| Rest:', J.rest.anzahl, '| Fehler/Auffaelligkeiten:', fehler);
process.exitCode = fehler ? 1 : 0;
