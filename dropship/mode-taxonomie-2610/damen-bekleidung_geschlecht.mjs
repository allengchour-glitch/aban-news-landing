/** Misst die Geschlechtsregel: Quellen, Widersprueche Tag/Titel, Verteilung. node damen-bekleidung_geschlecht.mjs */
import fs from 'fs';
import { geschlechtQuelle, GESCHLECHT_RE } from './damen-bekleidung_regeln.mjs';
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const cl = d.filter(p => (p.g || '').startsWith('Apparel & Accessories > Clothing > '));
const dist = {}, quelle = {};
for (const p of cl) { const [g, q] = geschlechtQuelle(p); dist[g] = (dist[g] || 0) + 1; quelle[g + '/' + q] = (quelle[g + '/' + q] || 0) + 1; }
console.log('Kleidung gesamt', cl.length, JSON.stringify(dist)); console.log(JSON.stringify(quelle));
// Widerspruch: Titel nennt eine Zielgruppe, Tag eine andere
const tagG = p => { const t = p.tags; const td = t.includes('damen'), th = t.includes('herren') || t.includes('maenner'), tk = t.includes('kinder'); return td && th ? 'unisex' : td ? 'damen' : th ? 'herren' : tk ? 'kinder' : null; };
const wid = {}; const bsp = {}; let n = 0, mitTag = 0;
for (const p of cl) {
  const [g, q] = geschlechtQuelle(p); const tg = tagG(p);
  if (tg) mitTag++;
  if (q === 'titel' && tg && tg !== g) { const k = `Tag ${tg} -> Titel ${g}`; wid[k] = (wid[k] || 0) + 1; (bsp[k] = bsp[k] || []).push(p.title.slice(0, 70)); n++; }
}
console.log('Produkte mit Tag:', mitTag, '| Widersprueche Titel gegen Tag:', n, JSON.stringify(wid));
for (const [k, v] of Object.entries(bsp)) console.log(' ', k, '->', v.slice(0, 4));
// Titel nennt Zielgruppe: wie oft stimmt der Tag?
const stimmt = cl.filter(p => geschlechtQuelle(p)[1] === 'titel' && tagG(p)).length;
console.log('Titel nennt Zielgruppe und Tag vorhanden:', stimmt, '| davon uebereinstimmend:', stimmt - n);
// Nur-Tag-Faelle (kein Titelwort): Gegenprobe Typ-Feld
let tagTyp = 0, tagTypGleich = 0;
for (const p of cl) if (geschlechtQuelle(p)[1] === 'tag') { tagTyp++; const t = p.type === 'Damenmode' ? 'damen' : p.type === 'Herrenmode' ? 'herren' : p.type === 'Baby & Kinder' || p.type === 'Kinder' ? 'kinder' : null; if (t && t === geschlechtQuelle(p)[0]) tagTypGleich++; }
console.log('Entscheidung per Tag:', tagTyp, '| Typ-Feld gleich:', tagTypGleich);
// feminine-only Kleidungsarten, die als herren gelten
const fem = cl.filter(p => /Dresses|Skirts|Skorts|Bras|Lingerie|Nightgowns/.test(p.g) && ['herren', 'kinder'].includes(geschlechtQuelle(p)[0]));
console.log('Kleider/Roecke/BH usw. mit Geschlecht herren/kinder:', fem.length, fem.slice(0, 8).map(p => geschlechtQuelle(p)[0] + ': ' + p.title.slice(0, 60)));
