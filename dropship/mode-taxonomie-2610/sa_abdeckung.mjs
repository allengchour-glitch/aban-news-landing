// Abdeckung: in wie vielen Blatt-Kategorien steht jedes Produkt der Abteilung? (aus dem Bau)
import { baueAlle, daten, gesch } from './schuhe-accessoires_bauen.mjs';
import { gruppeVon } from './sa_regeln.mjs';
import { AUSSCHLUSS } from './sa_ausschluss.mjs';
const alle = baueAlle().filter(k => !k.verworfen);
const inK = new Map();
for (const k of alle) for (const p of k._mitglieder) (inK.get(p.handle) || inK.set(p.handle, []).get(p.handle)).push(k.handle);
const uni = daten.filter(p => gruppeVon(p));
const stat = {}; const bsp = {};
for (const p of uni) {
  const g = gesch.get(p.handle)[0]; const ks = inK.get(p.handle) || [];
  const erw = g === 'unisex' ? 2 : 1;
  const key = `${gruppeVon(p)}|${g}|${ks.length}${ks.length === erw ? ' ok' : ks.length === 0 ? ' NULL' : ' ABWEICHUNG'}`;
  stat[key] = (stat[key] || 0) + 1; (bsp[key] = bsp[key] || []).push(p);
}
for (const [k, v] of Object.entries(stat).sort()) console.log(String(v).padStart(5), k, k.includes('ok') ? '' : '  e.g. ' + bsp[k].slice(0, 2).map(p => p.title.slice(0, 40)).join(' || '));
