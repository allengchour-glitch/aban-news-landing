/**
 * Abgleich mit den Nachbar-Abteilungen (nur lesen): Überschneidungen (ein Produkt in Kinder UND Damen/Herren) und Waisen
 * (Damen- oder Herren-Regel nennt das Produkt «kinder»/«partner», aber keine Kinder-Kategorie nimmt es auf).
 *   node kinder-baby-bekleidung_abgleich.mjs
 */
import fs from 'fs';
import { KATEGORIEN as KIND, geschlechtQuelle as gKind, istMitglied as mKind } from './kinder-baby-bekleidung_regeln.mjs';
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const R = s => new RegExp(s, 'i');
const passt = (k, p, gen) => { // Semantik der Aufgabe, für fremde JSON-Kategorien
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  if (k.g_prefix?.length) { if (!k.g_prefix.some(x => g.startsWith(x))) return false; } else if (!k.titel_muss?.length) return false;
  if (k.titel_muss?.length && !k.titel_muss.some(s => R(s).test(t))) return false;
  if (k.titel_nicht?.some(s => R(s).test(t))) return false;
  if (k.g_nicht?.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht?.some(x => tg.includes(x))) return false;
  if (k.tags_muss_eines?.length && !k.tags_muss_eines.some(x => tg.includes(x))) return false;
  return k.geschlecht === 'damen' ? ['damen', 'unisex'].includes(gen) : k.geschlecht === 'herren' ? ['herren', 'unisex'].includes(gen) : gen === k.geschlecht;
};
const nachbarn = {};
const lade = async () => {
  try {
    const dm = await import('./damen-bekleidung_regeln.mjs'); const dj = JSON.parse(fs.readFileSync('./damen-bekleidung.json', 'utf8'));
    nachbarn.damen = { kats: dj.kategorien, gen: p => dm.geschlechtQuelle(p)[0] };
  } catch (e) { console.log('Damen nicht ladbar:', e.message); }
  try {
    const hg = await import('./herren_gen.mjs'); const hj = JSON.parse(fs.readFileSync('./herren-bekleidung.json', 'utf8'));
    nachbarn.herren = { kats: hj.kategorien, gen: p => hg.geschlecht(p) };
  } catch (e) { console.log('Herren nicht ladbar:', e.message); }
};
await lade();
const meine = new Map();
for (const k of KIND) for (const p of d) if (mKind(k, p, gKind(p)[0])) meine.set(p.handle, k.handle);
console.log('Kinder-Abteilung: Produkte in Kategorien:', meine.size);
for (const [name, n] of Object.entries(nachbarn)) {
  let ueber = [], waisen = [], kindFuerSie = 0;
  const uni = d.filter(p => /^Apparel & Accessories > Clothing( >|$)/.test(p.g || '') || !p.g);
  for (const p of uni) {
    const gen = n.gen(p);
    const mem = n.kats.filter(k => passt(k, p, gen)).map(k => k.handle);
    if (mem.length && meine.has(p.handle)) ueber.push([p.handle, mem[0], meine.get(p.handle)]);
    if ((gen === 'kinder' || gen === 'partner') && !meine.has(p.handle) && !p.tags.includes('fortura')) waisen.push([p.handle, gen, p.title.slice(0, 60)]);
    if (gen === 'kinder') kindFuerSie++;
  }
  console.log(`${name}: Produkte, die ${name} selbst als kinder einstuft: ${kindFuerSie}; Überschneidungen mit Kinder-Kategorien: ${ueber.length}; kinder/partner laut ${name}, aber in keiner Kinder-Kategorie (ohne fortura): ${waisen.length}`);
  for (const u of ueber.slice(0, 10)) console.log('   Überschneidung', u.join(' | '));
  for (const w of waisen.slice(0, 25)) console.log('   Waise', w.join(' | '));
}
// Umgekehrt: Kinder-Kategorie-Produkte, die Damen/Herren nicht als kinder sehen
for (const [name, n] of Object.entries(nachbarn)) {
  const abw = [...meine.keys()].map(h => d.find(p => p.handle === h)).filter(p => !['kinder', 'partner'].includes(n.gen(p)));
  console.log(`${name} sieht ${abw.length} meiner ${meine.size} Kinder-Produkte NICHT als kinder/partner:`);
  for (const p of abw.slice(0, 12)) console.log('   ', n.gen(p), '|', p.title.slice(0, 70));
}
