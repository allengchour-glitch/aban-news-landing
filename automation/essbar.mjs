// essbar.mjs — Essbares aus China (CJ) wird nicht verkauft (09.10.2026). Regel: automation/data/essbar_regel.json,
// dieselbe Datei liest automation/essbar_wache.py (Bestand, täglich). Gegenprobe: essbar_gleichlauf_test.mjs.
// Anlass: «Hundegesundheits-Tabletten 200 g» kam als CJ-Neuimport ACTIVE in 6 Kanäle — Ergänzungsfutter aus China ist
// ohne Registrierung/BLV-Bewilligung nicht einführbar (dieselbe Klasse wie die zurückgeschickte Klinge #1017).
import fs from 'fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/essbar_regel.json', import.meta.url), 'utf8'));
const KAT = new RegExp(R.kategorie), TITEL = new RegExp(R.titel, 'i'), EN = new RegExp(R.en, 'i'), NICHT = new RegExp(R.nicht, 'i');

// Gibt den Grund ('kategorie' | 'titel' | 'cj-name') oder null. Nur Titel, CJ-Name, Kategorie — nie der Beschreibungstext.
export function essbar(titel, en = '', kategorie = '', sku = '') {
  const s = String(sku || '').toLowerCase();
  if (R.schweiz_sku.some(p => s.startsWith(p))) return null;
  const t = String(titel || ''), e = String(en || '');
  if (NICHT.test(`${t} ${e}`)) return null;
  if (KAT.test(String(kategorie || ''))) return 'kategorie';
  if (TITEL.test(t)) return 'titel';
  if (EN.test(e)) return 'cj-name';
  return null;
}
export default essbar;
