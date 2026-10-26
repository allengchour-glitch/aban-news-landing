import { baueAlle, daten, gesch } from './schuhe-accessoires_bauen.mjs';
import { gruppeVon, SPERR_TAGS, FREMD_TAGS } from './sa_regeln.mjs';
import { AUSSCHLUSS } from './sa_ausschluss.mjs';
import { stichprobe } from './sa_lib.mjs';
const alle = baueAlle().filter(k => !k.verworfen);
const inK = new Set(); for (const k of alle) for (const p of k._mitglieder) inK.add(p.handle);
const uni = daten.filter(p => gruppeVon(p));
const grund = {}; const liste = {};
for (const p of uni) {
  if (inK.has(p.handle)) continue;
  const gr = gruppeVon(p); let g = 'REST';
  if (p.tags.some(t => SPERR_TAGS.includes(t))) g = 'sperrtag'; else if (p.tags.some(t => FREMD_TAGS.includes(t))) g = 'fortura';
  else { const m = (AUSSCHLUSS[gr] || []).find(x => new RegExp(x.re, 'i').test(p.title)); if (m) g = 'ausschluss:' + gr + ':' + m.id; }
  const k = g + (g === 'REST' ? '|' + gr + '|' + gesch.get(p.handle)[0] : ''); grund[k] = (grund[k] || 0) + 1; (liste[k] = liste[k] || []).push(p);
}
for (const [k, v] of Object.entries(grund).sort()) console.log(String(v).padStart(4), k);
const arg = process.argv[2];
if (arg) for (const [k, l] of Object.entries(liste)) if (k.startsWith(arg)) { console.log('##', k); for (const p of l.slice(0, 45)) console.log('   ', p.title.slice(0, 90), '|', p.g.replace('Apparel & Accessories > ', '').slice(0, 40)); }
