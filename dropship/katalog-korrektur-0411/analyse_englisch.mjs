import { readFileSync, writeFileSync } from 'node:fs';
const D = (process.env.ARBEIT || '/tmp/katalog-korrektur-0411/') + '';
const zeilen = readFileSync(D + 'scan.jsonl', 'utf8').split('\n').filter(Boolean).map((z) => JSON.parse(z));
// Nur Wörter, die im Deutschen NICHT gebräuchlich sind (Pink, Gold, Beige, Khaki, Orange, Camel, Rose, Mini, Set, Top, Baby gelten als eingedeutscht)
const ENG = new Set('blue red black white green yellow purple gray grey brown navy sky light dark deep milk sea salt cream wine army velvet fluff fufu cat paw size color colour double single small large medium long short thick thin plain flower lace leather suede wood metal plastic clear matte glossy fashion vintage front back left right with and for the without style pcs pieces piece pack type version model silver apricot coffee mixed random golden rosegold'.split(' '));
const proWort = {}, prod = [];
for (const p of zeilen) {
  const treffer = [];
  for (const o of p.opts) {
    if (/^title$/i.test(o.n) && o.v.length === 1 && /^default title$/i.test(o.v[0])) continue;
    for (const v of o.v) {
      const w = String(v).toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);
      const e = w.filter((x) => ENG.has(x));
      if (e.length) { treffer.push(v); for (const x of new Set(e)) proWort[x] = (proWort[x] || 0) + 1; }
    }
  }
  if (treffer.length) prod.push({ handle: p.handle, title: p.title, werte: treffer });
}
console.log('Produkte mit englischem Wort in Optionswerten (eng gefasst):', prod.length, 'von', zeilen.length);
console.log('Wörter:', JSON.stringify(Object.entries(proWort).sort((a, b) => b[1] - a[1]).slice(0, 40)));
// Anteil rein englische Werte (kein deutsches Wort) gegen gemischt (wie Katzenhängematte)
const nameEng = zeilen.filter((p) => p.opts.some((o) => /^(color|colour|size|style|material|type|model|specification|pattern|length|capacity|quantity)$/i.test(o.n))).length;
console.log('Produkte mit englischem Optionsnamen (Color, Size, Style, …):', nameEng);
const zufall = [...prod].sort((a, b) => (a.handle < b.handle ? -1 : 1)).filter((_, i) => i % Math.ceil(prod.length / 30) === 0);
for (const x of zufall) console.log('  ', x.handle.slice(0, 50), '|', x.werte.slice(0, 5).join(' / ').slice(0, 100));
writeFileSync(D + 'englisch_eng.json', JSON.stringify(prod));
