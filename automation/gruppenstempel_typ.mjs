// gruppenstempel_typ.mjs — Uhren/Schmuck aus der CJ-Gruppe «elektronik» bekommen ihren Warentyp (09.10.2026).
// Regel: automation/data/gruppenstempel_typ.json — dieselbe Datei liest automation/gruppenstempel_typ.py (Bestand, täglich,
// Gegenprobe py=js: `python3 automation/gruppenstempel_typ.py --selbsttest`). Gemessen: 1'089 aktive Uhren/Armbänder mit Typ
// «Elektronik» fehlten in der Menü-Kollektion «Schmuck & Uhren» (filtert nach Typ).
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/gruppenstempel_typ.json', import.meta.url), 'utf8'));
const GERAET = new RegExp(R.geraet_wort, 'i'), UHR = new RegExp(R.uhr_wort, 'i'), SMART = new RegExp(R.smart_wort, 'i'),
  NICHT_UHR = new RegExp(R.nicht_uhr, 'i');

// Titel im Schmuck-Zweig → 'Uhren' | 'Schmuck' | null (bleibt Gruppentyp)
export function typAusStempel(titel, uhrzweig = false) {
  const t = String(titel || '');
  if (GERAET.test(t)) return null;
  if (UHR.test(t)) return 'Uhren';
  if (SMART.test(t)) return null;
  return uhrzweig ? 'Uhren' : 'Schmuck';
}
// Importer: (Typ, Google-Pfad, Titel, Tags) → {typ, tags} — nur wenn Typ = Gruppenstempel und Pfad im Schmuck-Zweig.
export function stempelKorrigieren(typ, gkat, titel, tags) {
  if (typ !== R.stempel) return null;
  const g = String(gkat || ''), t0 = String(titel || '');
  let neu = null;
  if (g.startsWith(R.google_praefix)) neu = typAusStempel(t0, R.google_uhrzweig.some(z => g === z || g.startsWith(z + ' > ')));
  else if (UHR.test(t0) && !GERAET.test(t0) && !NICHT_UHR.test(t0)) neu = 'Uhren';   // feine Kategorie fehlt beim Import noch
  if (!neu) return null;
  const t = [...tags];
  if (neu === 'Uhren' && !t.some(x => R.uhren_tags.includes(String(x).toLowerCase()))) t.push(R.uhren_tag_neu);
  return { typ: neu, tags: t };
}
export const kanarienGruen = () => R.kanarien.every(([t, s, z]) => typAusStempel(t, z) === s)
  && R.importer_kanarien.every(([t, g, s]) => ((stempelKorrigieren(R.stempel, g, t, []) || {}).typ || null) === s);
export default typAusStempel;
