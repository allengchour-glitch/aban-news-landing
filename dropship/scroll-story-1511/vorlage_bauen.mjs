// Baut templates/index.lxstory.json aus der heutigen templates/index.json (unverändert übernommen) + Kapitel + Medien-Adressen.
// Aufruf: node vorlage_bauen.mjs <index.json> <medien.json> <aus.json>
import fs from 'node:fs';
const [quelle, medienDatei, aus] = process.argv.slice(2);
const roh = fs.readFileSync(quelle, 'utf8');
const idx = JSON.parse(roh.slice(roh.indexOf('{', roh.indexOf('*/'))));
const kap = JSON.parse(fs.readFileSync(new URL('./kapitel.json', import.meta.url)));
const medien = JSON.parse(fs.readFileSync(medienDatei, 'utf8'));
if (!idx.order.includes('luxe_home')) throw new Error('luxe_home fehlt in index.json');
const blocks = {}, order = [];
kap.forEach((k, i) => {
  const m = medien[k.id];
  for (const f of ['video_quer', 'video_hoch', 'poster_quer', 'poster_hoch']) if (!m || !/^https:\/\/cdn\.shopify\.com\//.test(m[f])) throw new Error(`${k.id}: ${f} fehlt oder nicht cdn.shopify.com`);
  const id = 'kapitel_' + (i + 1);
  blocks[id] = { type: 'kapitel', settings: { wort: k.wort, zeile: k.zeile, wort_fr: k.wort_fr, zeile_fr: k.zeile_fr, produkt: k.produkt, variante: k.variante,
    video_quer: m.video_quer, video_hoch: m.video_hoch, poster_quer: m.poster_quer, poster_hoch: m.poster_hoch, fokus_quer: k.fokus_quer, fokus_hoch: k.fokus_hoch, variante_zeigen: k.variante_zeigen !== false, bis: k.bis || '' } };
  order.push(id);
});
const sections = { lx_story_test: { type: 'lx-story-testseite', settings: {} }, lx_story_platz: { type: 'lx-story-platz', settings: { kapitel: kap.length } } };
for (const [k, v] of Object.entries(idx.sections)) {
  sections[k] = v;
  if (k === 'luxe_home') sections.lx_story = { type: 'lx-story', blocks, block_order: order, settings: { platz: 'nach_hero', titel: 'Sechs Kapitel aus unserem Sortiment', titel_fr: 'Six chapitres de notre sélection' } };
}
const neuOrder = [];
for (const k of idx.order) { if (k === 'luxe_home') neuOrder.push('lx_story_test', 'lx_story_platz', 'luxe_home', 'lx_story'); else neuOrder.push(k); }
const out = { sections, order: neuOrder };
fs.writeFileSync(aus, JSON.stringify(out, null, 2) + '\n');
console.log('geschrieben', aus, neuOrder.join(','));
