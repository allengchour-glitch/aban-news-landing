// Gemeinsame Auswertung (ohne Nebenwirkungen). Die Semantik ist genau die der Aufgabenstellung:
// Produkt gehört zur Kategorie k, wenn (g beginnt mit einem g_prefix ODER, falls g_prefix leer, der Titel passt)
// UND titel_muss (falls vorhanden: mindestens ein Treffer) UND kein titel_nicht-Treffer UND kein g_nicht-Treffer
// UND kein Tag aus tags_nicht UND (falls tags_muss_eines nicht leer: mindestens eines) UND Geschlecht passt.
import { d, isCl, geschlecht } from './herren_gen.mjs';
export const rx = s => new RegExp(s, 'i');
export function passt(k, p, gen) {
  const g = p.g || '', t = p.title || '';
  if (k.g_prefix?.length) { if (!k.g_prefix.some(x => g.startsWith(x))) return false; }
  else if (!k.titel_muss?.length) return false;
  if (k.titel_muss?.length && !k.titel_muss.some(s => rx(s).test(t))) return false;
  if (k.titel_nicht?.some(s => rx(s).test(t))) return false;
  if (k.g_nicht?.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht?.some(x => (p.tags || []).includes(x))) return false;
  if (k.tags_muss_eines?.length && !k.tags_muss_eines.some(x => (p.tags || []).includes(x))) return false;
  return k.geschlecht === 'herren' ? ['herren', 'unisex'].includes(gen) : gen === k.geschlecht;
}
export function unterfilterPasst(f, p) {
  const t = p.title || '';
  return f.titel_muss.some(s => rx(s).test(t)) && !(f.titel_nicht || []).some(s => rx(s).test(t));
}
export const alle = d.filter(isCl).map(p => ({ p, gen: geschlecht(p) }));
export const pool = alle.filter(x => ['herren', 'unisex'].includes(x.gen));
export function zuordnen(kats, liste = pool) {
  const m = new Map(), mehr = [];
  for (const { p, gen } of liste) {
    const t = kats.filter(k => passt(k, p, gen)).map(k => k.handle);
    m.set(p.handle, t); if (t.length > 1) mehr.push([p.handle, t]);
  }
  return { m, mehr };
}
// Zufallsstichprobe mit festem Seed (wiederholbar)
export function stichprobe(arr, n, seed) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return arr.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map(a => a[1]);
}
