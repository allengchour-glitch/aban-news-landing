// Misst die heutigen einfachen Herren-Collections (Tag + Titel-Substring) gegen die neue Einteilung. Nur lesen.
import fs from 'fs';
import { d, geschlecht } from './herren_gen.mjs';
import { KATEGORIEN } from './herren_regeln.mjs';
import { bauKategorien } from './herren_bauen_lib.mjs';
import { passt } from './herren_lib.mjs';
const kats = bauKategorien(KATEGORIEN);
const alt = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8'));
const einfach = (r) => { // "TAG EQUALS a UND TITLE CONTAINS b UND TITLE NOT_CONTAINS c" (nur UND)
  if (r.includes(' ODER ') || typeof r !== 'string') return null;
  const parts = r.split(' UND ').map(s => s.trim());
  const fs_ = [];
  for (const s of parts) {
    let m;
    if ((m = /^TAG EQUALS (.+)$/.exec(s))) fs_.push(p => p.tags.includes(m[1]));
    else if ((m = /^TITLE CONTAINS (.+)$/.exec(s))) fs_.push(p => p.title.toLowerCase().includes(m[1].toLowerCase()));
    else if ((m = /^TITLE NOT_CONTAINS (.+)$/.exec(s))) fs_.push(p => !p.title.toLowerCase().includes(m[1].toLowerCase()));
    else return null;
  }
  return p => fs_.every(f => f(p));
};
const res = [];
for (const h of ['herren-shirts', 'herren-hemden', 'herren-hosen', 'herren-sets-sub']) {
  const c = alt.find(x => x.handle === h); if (!c) continue;
  const f = einfach(c.regeln); if (!f) continue;
  const mem = d.filter(f);
  const verteilung = {}; let falschG = 0;
  const kurz = g => (g || '(leer)').replace('Apparel & Accessories > ', '');
  for (const p of mem) {
    const gen = geschlecht(p);
    const k = kats.filter(k => passt(k, p, gen)).map(k => k.handle.replace('herren-', ''));
    const key = k.length ? k[0] : (/Clothing/.test(p.g || '') || !p.g ? 'ohne neue Kategorie (' + gen + ')' : 'Nicht-Kleidung: ' + kurz(p.g).split(' > ').slice(0, 2).join(' > '));
    verteilung[key] = (verteilung[key] || 0) + 1;
  }
  res.push({ handle: h, regel: c.regeln, n_alt: c.n, n_daten: mem.length, verteilung });
}
fs.writeFileSync('herren-bekleidung_altbestand.json', JSON.stringify(res, null, 1));
for (const r of res) { console.log('##', r.handle, r.n_alt, '->', r.n_daten); console.log(Object.entries(r.verteilung).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + ' ' + k).join('\n')); }
