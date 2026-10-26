// Gemeinsame Helfer fuer Schuhe & Accessoires (Messung am Datensatz /tmp/mode_daten.json)
import fs from 'fs';
export const daten = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
export const B = 'a-zäöüß';
export const W = s => new RegExp(`(^|[^${B}])(${s})(?![${B}])`, 'i');   // eigenes Wort
export const A = s => new RegExp(`(^|[^${B}])(${s})`, 'i');             // Wortanfang
export const E = s => new RegExp(`(${s})(?![${B}])`, 'i');              // Wortende
export function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function stichprobe(liste, n, key) {
  const r = prng(hash(key)); const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
export const kurzG = g => (g || '(leer)').replace('Apparel & Accessories > ', '');
