/** Unabhaengige Gegenpruefung: liest NUR die JSON und wendet die Regeln wörtlich nach der Aufgabenstellung an. */
import fs from 'fs';
import { geschlecht } from './damen-bekleidung_regeln.mjs';
const j = JSON.parse(fs.readFileSync('/tmp/mode_taxonomie/damen-bekleidung.json', 'utf8'));
const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const re = s => new RegExp(s, 'i');
function gehoert(k, p, ge) {
  const gOk = k.g_prefix.length ? k.g_prefix.some(x => (p.g || '').startsWith(x)) : k.titel_muss.some(s => re(s).test(p.title));
  const gesOk = ge === k.geschlecht || (ge === 'unisex' && ['damen', 'herren'].includes(k.geschlecht));
  const muss = !k.titel_muss.length || k.titel_muss.some(s => re(s).test(p.title));
  const nicht = !k.titel_nicht.some(s => re(s).test(p.title));
  const gn = !k.g_nicht.some(x => (p.g || '').startsWith(x));
  const tn = !k.tags_nicht.some(t => p.tags.includes(t));
  const tm = !k.tags_muss_eines.length || k.tags_muss_eines.some(t => p.tags.includes(t));
  return gOk && gesOk && muss && nicht && gn && tn && tm;
}
let fehler = 0; const zaehl = new Map();
const pflicht = ['handle', 'titel', 'eltern', 'geschlecht', 'g_prefix', 'g_nicht', 'titel_muss', 'titel_nicht', 'tags_muss_eines', 'tags_nicht', 'beschreibung', 'unterfilter', 'gemessen'];
for (const k of j.kategorien) {
  for (const f of pflicht) if (!(f in k)) { console.log('Feld fehlt', k.handle, f); fehler++; }
  let n = 0;
  for (const p of daten) if (gehoert(k, p, geschlecht(p))) { n++; zaehl.set(p.handle, (zaehl.get(p.handle) || 0) + 1); }
  if (n !== k.gemessen.treffer) { console.log('Trefferzahl weicht ab', k.handle, n, k.gemessen.treffer); fehler++; }
  if (n < 15) { console.log('Kategorie unter 15', k.handle); fehler++; }
  if (k.gemessen.falsch > Math.floor(0.03 * k.gemessen.stichprobe)) { console.log('falsch > 3 %', k.handle); fehler++; }
  for (const u of k.unterfilter) {
    const m = daten.filter(p => gehoert(k, p, geschlecht(p)) && u.titel_muss.some(s => re(s).test(p.title)) && !u.titel_nicht.some(s => re(s).test(p.title))).length;
    if (m < 15) { console.log('Unterfilter unter 15', u.handle, m); fehler++; }
  }
}
const doppelt = [...zaehl.values()].filter(v => v > 1).length;
const handles = j.kategorien.flatMap(k => [k.handle, ...k.unterfilter.map(u => u.handle)]);
const dupH = handles.length - new Set(handles).size;
const verteilung = j.kategorien.map(k => k.gemessen.treffer); const summe = verteilung.reduce((a, b) => a + b, 0);
console.log(`Kategorien ${j.kategorien.length} | Unterfilter ${j.kategorien.reduce((a, k) => a + k.unterfilter.length, 0)} | Produkte in Kategorien ${zaehl.size} (Summe ${summe}) | doppelt ${doppelt} | doppelte Handles ${dupH} | groesster Anteil ${(100 * Math.max(...verteilung) / summe).toFixed(1)} % | Fehler ${fehler + doppelt + dupH}`);
