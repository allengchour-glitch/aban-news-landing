// Auswertung von scan.jsonl (nur lesen): (A) Material-Widersprüche Faktenzeile gegen Text, (B) englische Wörter in Optionswerten und -namen.
import { readFileSync, writeFileSync } from 'node:fs';
const D = (process.env.ARBEIT || '/tmp/katalog-korrektur-0411/') + '';
const zeilen = readFileSync(D + 'scan.jsonl', 'utf8').split('\n').filter(Boolean).map((z) => JSON.parse(z));
console.log('Produkte', zeilen.length, '| mit Faktenblock', zeilen.filter((p) => p.feed).length, '| mit Material-Zeile', zeilen.filter((p) => p.mat).length);

// ---- A) Material
const FAM = {
  holz: /holz|bambus|eiche|kiefer|teak|walnuss|buche|birke|mdf|sperrholz/,
  stoff: /stoff|textil|baumwoll|polyester|plüsch|plusch|samt|flausch|leinen|canvas|vlies|filz|nylon|fleece|wolle|strick|gewebe|jersey|seide|satin|chiffon|spandex|elastan|denim|jeans|mikrofaser|oxford/,
  kunststoff: /kunststoff|plastik|\babs\b|pvc|polypropylen|\bpp\b|silikon|acryl|harz|\btpu\b|gummi|latex|\beva\b|polycarbonat/,
  metall: /metall|edelstahl|stahl|aluminium|zink|legierung|eisen|kupfer|messing|titan/,
  leder: /leder/,
  glas: /\bglas\b|glass/,
  keramik: /keramik|porzellan|steingut/,
  papier: /papier|karton|pappe/,
};
const fams = (t) => Object.entries(FAM).filter(([, re]) => re.test(t.toLowerCase())).map(([k]) => k);
const matVerteilung = {};
for (const p of zeilen) if (p.mat) matVerteilung[p.mat] = (matVerteilung[p.mat] || 0) + 1;
console.log('\nA) Material-Zeile, häufigste Werte:', JSON.stringify(Object.entries(matVerteilung).sort((a, b) => b[1] - a[1]).slice(0, 25)));
const widerspruch = [];
for (const p of zeilen) {
  if (!p.mat) continue;
  const f = fams(p.mat); if (!f.length) continue;
  const t = fams(p.title + ' ' + p.prosa); if (!t.length) continue;
  if (!f.some((x) => t.includes(x))) widerspruch.push({ handle: p.handle, title: p.title, mat: p.mat, factFam: f, textFam: t });
}
console.log('\nWiderspruch Faktenzeile gegen Titel/Text (nur Familien-Vergleich):', widerspruch.length);
const proFam = {}; for (const w of widerspruch) { const k = w.factFam.join('+') + ' ⇢ Text sagt ' + w.textFam.join('+'); proFam[k] = (proFam[k] || 0) + 1; }
console.log(JSON.stringify(Object.entries(proFam).sort((a, b) => b[1] - a[1]).slice(0, 25), null, 0));
const holz = widerspruch.filter((w) => w.factFam.includes('holz'));
console.log('davon Faktenzeile «Holz»:', holz.length);
for (const w of holz.slice(0, 15)) console.log('  ', w.handle.slice(0, 60), '|', w.mat, '| Text:', w.textFam.join('+'));
const holzAlle = zeilen.filter((p) => p.mat && /holz/i.test(p.mat));
console.log('Faktenzeile enthält «Holz» insgesamt:', holzAlle.length, '| davon Titel/Text erwähnt Holz/Bambus:', holzAlle.filter((p) => FAM.holz.test((p.title + ' ' + p.prosa).toLowerCase())).length);
writeFileSync(D + 'widerspruch.json', JSON.stringify(widerspruch));

// ---- B) Englisch in Optionen
const ENG = new Set('blue red black white green yellow pink purple gray grey brown orange khaki beige apricot coffee navy sky light dark deep silver gold rose milk sea salt cream wine army camel velvet fluff fufu cat paw size color colour model version double single small large medium big round square long short thick thin plain pattern flower lace leather suede wood metal plastic transparent clear matte glossy fashion vintage piece pieces with and for the of without high low left right front back top bottom male female men women kids boy girl baby adult summer winter spring autumn warm cool hot cold fresh sweet mixed random default title style pack pcs type color:'.split(' '));
const NAMEN_ENG = new Set(['color', 'colour', 'size', 'style', 'title', 'material', 'type', 'model', 'specification', 'specifications', 'pattern', 'length', 'width', 'capacity', 'version', 'plug type', 'quantity', 'flavor', 'scent']);
const proWort = {}; const prod = []; const nameEng = [];
for (const p of zeilen) {
  let treffer = [];
  for (const o of p.opts) {
    if (NAMEN_ENG.has(String(o.n).toLowerCase())) nameEng.push({ handle: p.handle, name: o.n });
    for (const v of o.v) {
      const w = String(v).toLowerCase().split(/[^a-zäöüß]+/).filter(Boolean);
      const e = w.filter((x) => ENG.has(x));
      if (e.length) { treffer.push(v); for (const x of e) proWort[x] = (proWort[x] || 0) + 1; }
    }
  }
  if (treffer.length) prod.push({ handle: p.handle, title: p.title, werte: treffer.slice(0, 6) });
}
console.log('\nB) Produkte mit englischem Wort in Optionswerten:', prod.length);
console.log('häufigste Wörter:', JSON.stringify(Object.entries(proWort).sort((a, b) => b[1] - a[1]).slice(0, 30)));
console.log('Optionsnamen englisch:', nameEng.length, JSON.stringify([...new Set(nameEng.map((x) => x.name))].slice(0, 12)));
for (const x of prod.slice(0, 20)) console.log('  ', x.handle.slice(0, 55), '|', x.werte.join(' / ').slice(0, 90));
writeFileSync(D + 'englisch_optionen.json', JSON.stringify(prod));
