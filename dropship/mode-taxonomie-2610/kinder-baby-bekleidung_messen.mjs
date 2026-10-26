/**
 * Misst die Kinder-/Baby-Taxonomie am Datensatz (nur lesen). Wiederholbar:  node kinder-baby-bekleidung_messen.mjs [--stichprobe]
 * Liest die fertige kinder-baby-bekleidung.json und wertet sie mit einem unabhängigen Auswerter aus (nicht mit dem Code der Regeldatei):
 *  1. Trefferzahl je Kategorie und Unterfilter, grösster Anteil (Alarm ab 60 % auf ein Ziel)
 *  2. Überschneidung der Kategorien (muss 0 sein: genau eine Blatt-Kategorie)
 *  3. Gegenproben der Geschlechtsregel (Wortgrenzen, Fehlgriffe, die schon einmal vorkamen) gegen den Code
 *  4. Verteilung des Geschlechts im Universum
 *  5. Mit --stichprobe: 30 zufällige Treffer je Kategorie zum Lesen
 */
import fs from 'fs';
import { geschlechtQuelle } from './kinder-baby-bekleidung_regeln.mjs';

const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const J = JSON.parse(fs.readFileSync(new URL('./kinder-baby-bekleidung.json', import.meta.url), 'utf8'));
const R = s => new RegExp(s, 'i');
const gen = new Map(d.map(p => [p.handle, geschlechtQuelle(p)[0]]));
function mitglied(k, p) {
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  if (k.g_prefix?.length) { if (!k.g_prefix.some(x => g.startsWith(x))) return false; } else if (!k.titel_muss?.length) return false;
  if (k.titel_muss?.length && !k.titel_muss.some(s => R(s).test(t))) return false;
  if (k.titel_nicht?.some(s => R(s).test(t))) return false;
  if (k.g_nicht?.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht?.some(x => tg.includes(x))) return false;
  if (k.tags_muss_eines?.length && !k.tags_muss_eines.some(x => tg.includes(x))) return false;
  return gen.get(p.handle) === k.geschlecht;
}
const unter = (u, p) => u.titel_muss.some(s => R(s).test(p.title)) && !(u.titel_nicht || []).some(s => R(s).test(p.title));
let fehler = 0;
const ok = (b, msg) => { if (!b) { fehler++; console.log('  FEHLER:', msg); } };

console.log('== 1. Trefferzahlen');
const mit = {}; const von = new Map();
for (const k of J.kategorien) {
  mit[k.handle] = d.filter(p => mitglied(k, p));
  for (const p of mit[k.handle]) von.set(p.handle, [...(von.get(p.handle) || []), k.handle]);
  console.log(`  ${k.handle.padEnd(34)} ${String(mit[k.handle].length).padStart(4)}  (JSON sagt ${k.gemessen.treffer}, falsch ${k.gemessen.falsch})`);
  ok(mit[k.handle].length === k.gemessen.treffer, `Trefferzahl ${k.handle}`);
  ok(mit[k.handle].length >= 15, `Mindestgrösse 15 verletzt: ${k.handle}`);
  for (const u of k.unterfilter) { const n = mit[k.handle].filter(p => unter(u, p)).length; console.log(`      ${u.titel.padEnd(30)} ${String(n).padStart(3)}`); ok(n >= 5, `Unterfilter ${u.titel} < 5`); }
}
const gesamt = von.size;
const gross = Math.max(...Object.values(mit).map(m => m.length));
console.log(`  Produkte in Kategorien: ${gesamt}; grösster Anteil ${(100 * gross / gesamt).toFixed(1)} % ${gross / gesamt > 0.6 ? '(ALARM)' : '(unauffällig)'}`);
ok(gross / gesamt <= 0.6, 'ein Ziel hat über 60 %');

console.log('== 2. Überschneidung');
const mehr = [...von].filter(([, v]) => v.length > 1);
console.log(`  Produkte in mehr als einer Kategorie: ${mehr.length}`);
ok(mehr.length === 0, 'Mehrfachzuordnung');

console.log('== 3. Gegenproben Geschlecht (Titel, g, Tags, Typ -> erwartet)');
const C = 'Apparel & Accessories > Clothing > ';
const F = (title, g, tags, type, erwartet) => ({ title, g: g || C + 'Shirts & Tops', tags: tags || [], type: type || 'Mode', erwartet });
const faelle = [
  F('Baseball-Cap «Mama» · Mintgrün', 'Apparel & Accessories > Clothing Accessories > Hats', ['damen'], 'Hüte & Caps', 'andere'),
  F('Dad-Cap – Selbst gestalten', 'Apparel & Accessories > Clothing Accessories > Hats', [], 'Accessoires', 'andere'),
  F('Babydoll Negligé aus Spitze', C + 'Sleepwear & Loungewear > Nightgowns', ['damen'], 'Damenmode', 'andere'),
  F('Baby-Tee Crop Top Y2K', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'andere'),
  F('Kleid in Baby-Blau mit Spitze', C + 'Dresses', ['damen'], 'Damenmode', 'andere'),
  F('Mori Girl Leinenrock mit Schnürung', C + 'Skirts', ['damen'], 'Damenmode', 'andere'),
  F('Japanisches Langarmhemd im jungen Casual-Stil', C + 'Shirts & Tops', ['herren'], 'Herrenmode', 'andere'),
  F('Zuckersüss Mädchenstil Langarm-Pyjama-Nachthemd', C + 'Sleepwear & Loungewear > Nightgowns', ['damen'], 'Damenmode', 'andere'),
  F('Bluse mit Perlmutter-Knöpfen', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'andere'),
  F('Vatertag Geschenk Shirt', C + 'Shirts & Tops', ['herren'], 'Herrenmode', 'andere'),
  F('Teenage Dreams T-Shirt', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'andere'),
  F('Casual Jeans Trendig und cool für Jugendliche', C + 'Pants', ['herren'], 'Herrenmode', 'andere'),
  F('Baby Strampler aus Baumwolle', C + 'Baby & Toddler Clothing > Baby One-Pieces', [], 'Baby & Kinder', 'kinder'),
  F('Strickjacke', C + 'Baby & Toddler Clothing > Baby & Toddler Outerwear', [], 'Herrenmode', 'kinder'),        // nur die Google-Kategorie sagt Baby
  F('Mädchen Prinzessinnenkleid', C + 'Dresses', ['damen'], 'Damenmode', 'kinder'),
  F('Jungen Streifen-Set', C + 'Outfit Sets', [], 'Mode', 'kinder'),
  F('Kinderjacke mit Kapuze', C + 'Outerwear > Coats & Jackets', ['herren'], 'Herrenmode', 'kinder'),
  F('Hoodie für Teenager', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'kinder'),
  F('Mutter-Tochter Pullover', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'kinder'),
  F('Pullover für Mama und Kind', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'kinder'),
  F('Just A Dad Who Loves His Girl Shirt', C + 'Shirts & Tops', ['damen'], 'Damenmode', 'kinder'),
  F('Pyjama für die ganze Familie', C + 'Sleepwear & Loungewear > Pajamas', ['damen'], 'Damenmode', 'kinder'),
  F('Jeans mit Kids-Print', C + 'Pants', [], 'Mode', 'kinder'),
  F('Sweatshirt', C + 'Shirts & Tops', ['kinder'], 'Mode', 'kinder'),                                          // nur der Tag sagt Kind
  F('Einfaches Set', C + 'Outfit Sets', [], 'Baby & Kinder', 'kinder'),                                         // nur der Typ sagt Kind
  F('Damen Sommerkleid', C + 'Dresses', ['damen'], 'Damenmode', 'andere'),
  F('Herren Poloshirt', C + 'Shirts & Tops', ['herren'], 'Herrenmode', 'andere'),
];
for (const f of faelle) { const [g] = geschlechtQuelle({ title: f.title, g: f.g, tags: f.tags, type: f.type }); const gut = g === f.erwartet; if (!gut) console.log(`  ${f.title} -> ${g}, erwartet ${f.erwartet}`); ok(gut, `Gegenprobe «${f.title}»`); }
console.log(`  ${faelle.length} Gegenproben, ${faelle.filter(f => geschlechtQuelle({ title: f.title, g: f.g, tags: f.tags, type: f.type })[0] === f.erwartet).length} bestanden`);

console.log('== 4. Geschlecht im Universum (Google-Kategorie Clothing > oder leer)');
const kl = d.filter(p => (p.g || '').startsWith(C) || !p.g);
const dist = {}; for (const p of kl) dist[gen.get(p.handle)] = (dist[gen.get(p.handle)] || 0) + 1;
console.log('  ', JSON.stringify(dist), 'von', kl.length);

console.log('== 5. Rest: Kinderware im Universum (Clothing*, Zubehör, leer) ohne Kategorie');
const rest = d.filter(p => ((p.g || '').startsWith('Apparel & Accessories > Clothing') || !p.g) && gen.get(p.handle) === 'kinder' && !von.has(p.handle));
console.log(`  ${rest.length} (JSON: ${J.rest.anzahl})`); ok(rest.length === J.rest.anzahl, 'Rest-Zahl');
const fk = new Set(J.fremdkoerper.map(f => f.handle));
const ohneZiel = rest.filter(p => !fk.has(p.handle)); console.log(`  davon ohne Eintrag in fremdkoerper: ${ohneZiel.length}`); ok(ohneZiel.length === 0, 'Rest ohne Ziel');

if (process.argv.includes('--stichprobe')) {
  console.log('== 6. Stichprobe (30 je Kategorie, fester Seed)');
  const prng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  for (const k of J.kategorien) { const r = prng(hash(k.handle)); const a = mit[k.handle].slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } console.log('  --', k.handle); for (const p of a.slice(0, 30)) console.log('     ', p.title.slice(0, 95)); }
}
console.log(fehler ? `\n${fehler} FEHLER` : '\nalles in Ordnung');
process.exit(fehler ? 1 : 0);
