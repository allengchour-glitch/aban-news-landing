// Arbeitswerkzeug beim Bauen der Regeln: Überblick / Rest / Probe. (Die endgültige Messung macht herren-bekleidung_messen.mjs am JSON.)
import { KATEGORIEN } from './herren_regeln.mjs';
import { pool, zuordnen, stichprobe } from './herren_lib.mjs';
import { bauKategorien } from './herren_bauen_lib.mjs';
const kats = bauKategorien(KATEGORIEN);
const modus = process.argv[2] || 'ueberblick';
const { m, mehr } = zuordnen(kats);
if (modus === 'rest') {
  const f = process.argv[3] || '';
  const r = pool.filter(x => !m.get(x.p.handle).length && (x.p.g || '(leer)').includes(f));
  const c = {}; for (const x of r) { const g = (x.p.g || '(leer)').replace('Apparel & Accessories > Clothing', 'C'); c[g] = (c[g] || 0) + 1; }
  console.log('Rest', r.length, c);
  for (const x of r.slice(0, +process.argv[4] || 60)) console.log('  ', x.p.title, '|', (x.p.g || '(leer)').replace('Apparel & Accessories > Clothing', 'C'));
} else if (modus === 'probe') {
  const h = process.argv[3], n = +process.argv[4] || 30, seed = +process.argv[5] || 1;
  const t = pool.filter(x => m.get(x.p.handle).includes(h));
  console.log(h, t.length);
  for (const x of stichprobe(t, n, seed)) console.log('  ', x.p.title, '|', (x.p.g || '').replace('Apparel & Accessories > Clothing', 'C'));
} else {
  const c = {}; for (const [, t] of m) for (const x of t) c[x] = (c[x] || 0) + 1;
  console.log('Pool', pool.length, 'zugeordnet', [...m.values()].filter(t => t.length).length, 'mehrfach', mehr.length);
  console.log(c);
  for (const [h, t] of mehr.slice(0, 20)) console.log('MEHRFACH', h, t);
}
