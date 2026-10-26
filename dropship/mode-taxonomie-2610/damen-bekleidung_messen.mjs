/**
 * Messung der Damen-Bekleidung-Regeln am Datensatz /tmp/mode_daten.json.
 *   node damen-bekleidung_messen.mjs                 -> Uebersicht (Treffer, Ueberschneidung, Rest, Geschlecht)
 *   node damen-bekleidung_messen.mjs --stich         -> schreibt stichproben/<handle>.txt (30 zufaellige Treffer, fester Seed)
 *   node damen-bekleidung_messen.mjs --zeige <handle> [n]  -> druckt die Stichprobe nummeriert
 *   node damen-bekleidung_messen.mjs --rest [n]      -> zufaellige Rest-Titel
 *   node damen-bekleidung_bauen.mjs                  -> schreibt damen-bekleidung.json (gemessen aus damen-bekleidung_urteile.json)
 *   node damen-bekleidung_pruefen.mjs                -> unabhaengige Gegenpruefung der JSON
 *   node damen-bekleidung_geschlecht.mjs             -> Messung der Geschlechtsregel (Quellen, Widersprueche)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KATEGORIEN, geschlecht, istMitglied, istInUnterfilter, GESCHLECHT_RE, NUR_WEIBLICH_G } from './damen-bekleidung_regeln.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const args = process.argv.slice(2);

import { stichprobe } from './damen-bekleidung_messen_lib.mjs';
const kurzG = g => (g || '(leer)').replace('Apparel & Accessories > Clothing', 'C').replace(/^C > /, '');

const gesch = new Map(daten.map(p => [p.handle, geschlecht(p)]));
const mitglieder = Object.fromEntries(KATEGORIEN.map(k => [k.handle, daten.filter(p => istMitglied(k, p, gesch.get(p.handle)))]));

if (args[0] === '--zeige') {
  const k = KATEGORIEN.find(x => x.handle === args[1]); const n = +(args[2] || 30);
  let liste = mitglieder[k.handle]; let key = k.handle;
  if (args[3]) { const u = k.unterfilter.find(x => x.handle === args[3]); liste = liste.filter(p => istInUnterfilter(u, p)); key = u.handle; }
  console.log(`# ${key}: ${liste.length} Treffer, Stichprobe ${Math.min(n, liste.length)}`);
  stichprobe(liste, n, key).forEach((p, i) => console.log(`${String(i + 1).padStart(2)} ${p.title.slice(0, 95)} [${kurzG(p.g)}|${gesch.get(p.handle)[0]}]`));
  process.exit(0);
}
if (args[0] === '--zeigeh') { // gleiche Stichprobe mit Handles (fuer falsche_beispiele)
  const k = KATEGORIEN.find(x => x.handle === args[1]); const nrs = args.slice(2).map(Number);
  let liste = mitglieder[k.handle];
  stichprobe(liste, 30, k.handle).forEach((p, i) => { if (nrs.includes(i + 1)) console.log(`${i + 1} ${p.handle}: ${p.title}`); });
  process.exit(0);
}

const kein = daten.filter(p => !Object.values(mitglieder).some(l => l.includes(p)));
const universe = daten.filter(p => ['damen', 'unisex'].includes(gesch.get(p.handle)) && p.g && p.g.startsWith('Apparel & Accessories > Clothing > '));
const rest = universe.filter(p => !Object.values(mitglieder).some(l => l.includes(p)));

if (args[0] === '--rest') {
  console.log('# Rest', rest.length);
  stichprobe(rest, +(args[1] || 40), 'rest').forEach(p => console.log(`${p.title.slice(0, 90)} [${kurzG(p.g)}|${gesch.get(p.handle)[0]}]`));
  process.exit(0);
}

// Ueberschneidung
const cnt = new Map();
for (const [h, l] of Object.entries(mitglieder)) for (const p of l) { (cnt.get(p.handle) || cnt.set(p.handle, []).get(p.handle)).push(h); }
const doppelt = [...cnt.entries()].filter(([, v]) => v.length > 1);
console.log('Damen-/Unisex-Bekleidung (g unter Clothing >):', universe.length, '| in Kategorien:', universe.length - rest.length, '| Rest:', rest.length, '| Doppelt:', doppelt.length);
for (const k of KATEGORIEN) {
  const l = mitglieder[k.handle];
  const gc = {}; for (const p of l) gc[gesch.get(p.handle)] = (gc[gesch.get(p.handle)] || 0) + 1;
  console.log(String(l.length).padStart(5), k.handle.padEnd(28), JSON.stringify(gc));
  for (const u of k.unterfilter) {
    const n = l.filter(p => istInUnterfilter(u, p)).length;
    console.log('       ', String(n).padStart(5), u.handle, n < 15 ? '  <<< unter 15' : '');
  }
}
if (doppelt.length) console.log('DOPPELT-Beispiele:', doppelt.slice(0, 8).map(([h, v]) => h + ' -> ' + v.join('+')));
// ausserhalb: Mitglieder, die nicht Damen/Unisex sind
const geschl = {}; for (const p of daten.filter(p => p.g && p.g.startsWith('Apparel & Accessories > Clothing > '))) geschl[gesch.get(p.handle)] = (geschl[gesch.get(p.handle)] || 0) + 1;
console.log('Geschlecht ueber alle Kleidung:', JSON.stringify(geschl));
const rg = {}; for (const p of rest) rg[kurzG(p.g)] = (rg[kurzG(p.g)] || 0) + 1;
console.log('Rest nach g:', JSON.stringify(rg));

if (args[0] === '--stich') {
  fs.mkdirSync(path.join(HERE, 'stichproben'), { recursive: true });
  for (const k of KATEGORIEN) {
    const l = stichprobe(mitglieder[k.handle], 30, k.handle);
    fs.writeFileSync(path.join(HERE, 'stichproben', k.handle + '.txt'), l.map((p, i) => `${i + 1}\t${p.handle}\t${p.title}\t${kurzG(p.g)}`).join('\n'));
  }
  console.log('Stichproben geschrieben.');
}
