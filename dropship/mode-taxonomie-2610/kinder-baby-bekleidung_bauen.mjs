/**
 * Baut /tmp/mode_taxonomie/kinder-baby-bekleidung.json aus den Regeln (kinder-baby-bekleidung_regeln.mjs), dem Datensatz und den
 * gelesenen Urteilen (kinder-baby-bekleidung_urteile.json). Prüft danach, dass ein unabhängiger Auswerter, der NUR die JSON liest,
 * genau die gleichen Mitglieder liefert wie der Code.
 *   node kinder-baby-bekleidung_bauen.mjs            -> schreibt JSON + Stichprobenliste
 *   node kinder-baby-bekleidung_bauen.mjs --vorschau -> nur Zahlen
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KATEGORIEN, UNTERFILTER, FAMILIE, KINDER_TITEL, KINDER_TITEL_NICHT, KINDER_TAGS, KINDER_TYPEN, BTC, geschlechtQuelle, istMitglied, istInUnterfilter } from './kinder-baby-bekleidung_regeln.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8'));
const vorschau = process.argv.includes('--vorschau');
const urteile = fs.existsSync(path.join(HERE, 'kinder-baby-bekleidung_urteile.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'kinder-baby-bekleidung_urteile.json'), 'utf8')) : { kategorien: {} };
const CL = 'Apparel & Accessories > Clothing';
const imUniversum = p => (p.g || '').startsWith(CL) || !p.g;          // Kleidung + Kleidungs-Zubehör + leer
const istKleidung = p => (p.g || '').startsWith(CL + ' > ') || !p.g;  // wie Damen/Herren: «Clothing > …» oder leer
const kurz = (t, n = 80) => (t || '').replace(/\s+/g, ' ').slice(0, n);
const pct = (a, b) => (100 * a / b).toFixed(1).replace('.', ',') + ' %';

/* ---------- Seeded Zufallsstichprobe ---------- */
function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function stichprobe(liste, n, key) { const r = prng(hash(key)); const a = liste.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

/* ---------- Mitglieder ---------- */
const gesch = new Map(d.map(p => [p.handle, geschlechtQuelle(p)]));
const mit = Object.fromEntries(KATEGORIEN.map(k => [k.handle, d.filter(p => istMitglied(k, p, gesch.get(p.handle)[0]))]));
const kategorieVon = new Map();
for (const k of KATEGORIEN) for (const p of mit[k.handle]) kategorieVon.set(p.handle, [...(kategorieVon.get(p.handle) || []), k.handle]);
const mehrfach = [...kategorieVon].filter(([, v]) => v.length > 1);
if (mehrfach.length) { console.error('FEHLER: Produkte in mehreren Blatt-Kategorien:', mehrfach.slice(0, 5)); process.exit(1); }

/* ---------- Geschlecht: Zahlen ---------- */
const uni = d.filter(imUniversum);
const kl = d.filter(istKleidung);
const dist = {}, quelle = {};
for (const p of kl) { const [g, q] = gesch.get(p.handle); dist[g] = (dist[g] || 0) + 1; if (g === 'kinder') quelle[q] = (quelle[q] || 0) + 1; }
const tagG = p => { const t = p.tags; const td = t.includes('damen'), th = t.includes('herren') || t.includes('maenner'), tk = t.includes('kinder'); return td && th ? 'beide' : td ? 'damen' : th ? 'herren' : tk ? 'kinder' : null; };
const wid = {}; let titelUndTag = 0, widerspruch = 0;
for (const p of kl) {
  const [g, q] = gesch.get(p.handle); const tg = tagG(p);
  if (g === 'kinder' && ['familie', 'google', 'titel'].includes(q) && tg) { titelUndTag++; if (tg !== 'kinder') { widerspruch++; const k = `Tag ${tg} -> ${q === 'familie' ? 'Familie' : 'Kinder'}`; wid[k] = (wid[k] || 0) + 1; } }
}
const tagKinderOhneErkennung = kl.filter(p => p.tags.includes('kinder') && gesch.get(p.handle)[0] !== 'kinder').length;
const adultTagKinder = kl.filter(p => gesch.get(p.handle)[0] === 'kinder' && ['damen', 'herren'].includes(tagG(p))).length;
// Wie oft stimmt der Tag «kinder» mit dem starken Signal (Google/Titel/Familie) überein?
const starkMitTagKinder = kl.filter(p => ['familie', 'google', 'titel'].includes(gesch.get(p.handle)[1]) && p.tags.includes('kinder')).length;
const typKinder = kl.filter(p => KINDER_TYPEN.includes(p.type)).length;
const typKinderUndKinder = kl.filter(p => KINDER_TYPEN.includes(p.type) && gesch.get(p.handle)[0] === 'kinder').length;
const typUnerkannt = kl.filter(p => KINDER_TYPEN.includes(p.type) && gesch.get(p.handle)[0] !== 'kinder').map(p => p.handle);

/* ---------- Rest + Fremdkörper ---------- */
const alleMit = new Set(kategorieVon.keys());
const rest = uni.filter(p => gesch.get(p.handle)[0] === 'kinder' && !alleMit.has(p.handle));
function fremd(p) {
  const t = p.title, g = p.g || '', tags = p.tags;
  if (tags.includes('fortura') || /^Kostüm/i.test(t)) return ['Kostüm (Tag fortura / Titel «Kostüm»), eigene Kostüm-Kategorien', 'Kostüme (fortura, ft-*)'];
  if (/puppe/i.test(t)) return ['Puppenkleidung, also Spielzeug und keine Kinderkleidung', 'Spielzeug > Puppen & Puppenhaus (spielzeug-puppen)'];
  if (/reit(leggings|weste|hose)/i.test(t)) return ['Reitsport-Ware für Erwachsene UND Kinder (gemischte Grössen), kein Kinder-Kleidungsstück und kein Familien-Look; Damen- und Herren-Regel nehmen sie wegen «Kinder» im Titel auch nicht auf', 'Sport & Outdoor (Reitsport)'];
  if (/mädchen-?(stil|haft)/i.test(t)) return ['«Mädchenstil» ist ein Stil, kein Kind: Tag damen, Typ Damenmode, Tag maedchenstil; die Damen- und die Herren-Regel stufen es wegen des Wortanfangs «Mädchen» fälschlich als kinder ein', 'damen-nachtwaesche (Abteilung Damen)'];
  if (g.startsWith('Apparel & Accessories > Clothing Accessories > Hair Accessories')) return ['Haarschmuck, kein Kleidungsstück', 'Accessoires (Haarschmuck)'];
  if (g.startsWith('Apparel & Accessories > Clothing Accessories')) return ['Kleidungs-Zubehör (Mütze, Handschuhe, Halswärmer), Google-Kategorie «Clothing Accessories», nicht «Clothing»', 'Accessoires (Mützen, Handschuhe, Schals); wer es auch unter Kinder will: Querschnitt-Sammlung'];
  if (/handschuh/i.test(t)) return ['Winter-Zubehör-Set (Mütze, Schal, Handschuhe), Google-Kategorie «Outfit Sets» ist falsch gewählt', 'Accessoires (Mützen, Handschuhe, Schals)'];
  return null;
}
const fremdkoerper = [], restOffen = [];
for (const p of rest) { const f = fremd(p); if (f) fremdkoerper.push({ handle: p.handle, grund: `${f[0]} («${kurz(p.title, 60)}»)`, gehoert_nach: f[1] }); else restOffen.push(p); }
// Mädchenstil: wird von mir als nicht-kinder geführt, Damen/Herren sehen es als kinder -> Waise, steht deshalb nicht in rest (Geschlecht «andere»)
for (const p of uni.filter(p => /mädchen-?(stil|haft)/i.test(p.title))) if (!fremdkoerper.some(f => f.handle === p.handle)) { const f = fremd(p); fremdkoerper.push({ handle: p.handle, grund: `${f[0]} («${kurz(p.title, 60)}»)`, gehoert_nach: f[1] }); }
// In der alten Kinder-Collection (Tag sort-kinder-baby) stehende Erwachsenen-Kleidung/Kostüme
const imAlten = d.filter(p => p.tags.includes('sort-kinder-baby') && imUniversum(p) && gesch.get(p.handle)[0] !== 'kinder');
for (const p of imAlten) if (!fremdkoerper.some(f => f.handle === p.handle)) {
  const f = tagsFort(p);
  fremdkoerper.push({ handle: p.handle, grund: `${f[0]} («${kurz(p.title, 60)}»); steht heute in der Collection «Kinder & Baby» (sub-baby-kids, Tag sort-kinder-baby)`, gehoert_nach: f[1] });
}
function tagsFort(p) {
  if (p.tags.includes('fortura')) return ['Kostüm-/Plüschartikel (Tag fortura), Erwachsenen- bzw. Verkleidungsware', 'Kostüme (fortura, ft-*)'];
  if (p.tags.includes('herren')) return ['Herren-Hemd: «im jungen Casual-Stil» ist ein Adjektiv («jungen»), keine Jungen-Ware; Tag herren', 'herren-hemden (Abteilung Herren)'];
  return ['Erwachsenen-Ware ohne Kinderbezug', 'Abteilung Damen/Herren'];
}
// Sperr-Tags: Kinder-Ware, die wegen Sperr-Tags in keiner Kategorie steht
const sperrKinder = uni.filter(p => gesch.get(p.handle)[0] === 'kinder' && (KATEGORIEN[0].tags_nicht || []).some(x => p.tags.includes(x) && x !== 'fortura'));

/* ---------- Kinder-Waren in fremden Google-Bereichen (nur nennen) ---------- */
const nichtUni = d.filter(p => !imUniversum(p) && gesch.get(p.handle)[0] === 'kinder');
const nachBereich = {};
for (const p of nichtUni) { const k = (p.g || '(leer)').split(' > ').slice(0, 2).join(' > '); nachBereich[k] = (nachBereich[k] || 0) + 1; }
const kinderSchuhe = d.filter(p => (p.g || '').startsWith('Apparel & Accessories > Shoes') && gesch.get(p.handle)[0] === 'kinder');
const kinderUhren = d.filter(p => (p.g || '').startsWith('Apparel & Accessories > Jewelry > Watches') && gesch.get(p.handle)[0] === 'kinder');
fs.writeFileSync(path.join(HERE, 'kinder-baby-bekleidung_kinderschuhe.json'), JSON.stringify({ hinweis: 'Schuhe für Kinder (Google-Kategorie Apparel & Accessories > Shoes, Geschlecht kinder nach der Kinder-Regel). Baut die Schuh-Abteilung, hier nur genannt.', anzahl: kinderSchuhe.length, typ_kinderschuhe: kinderSchuhe.filter(p => p.type === 'Kinderschuhe').length, handles: kinderSchuhe.map(p => p.handle) }));

/* ---------- Altbestand: wo stehen Kinder-Kleider heute? (nur Zählung gegen vorhandene Collections) ---------- */
const cols = JSON.parse(fs.readFileSync('/tmp/vorhandene_collections.json', 'utf8'));
function cond(c) { let m; if ((m = c.match(/^TAG EQUALS (.+)$/))) return p => (p.tags || []).includes(m[1]); if ((m = c.match(/^TITLE CONTAINS (.+)$/))) { const s = m[1].toLowerCase(); return p => (p.title || '').toLowerCase().includes(s); } if ((m = c.match(/^TYPE EQUALS (.+)$/))) return p => p.type === m[1]; return null; }
function compile(r) { if (typeof r !== 'string' || r === 'manuell' || /PRODUCT_CATEGORY|VARIANT_|VENDOR|IS_PRICE|COLLECTION/.test(r)) return null; const ors = r.split(' ODER ').map(a => a.split(' UND ').map(cond)); return ors.some(a => a.some(f => !f)) ? null : (p => ors.some(a => a.every(f => f(p)))); }
const kidSet = new Set(uni.filter(p => gesch.get(p.handle)[0] === 'kinder' && istKleidung(p)).map(p => p.handle));
const altIn = [];
for (const c of cols) { const f = compile(c.regeln); if (!f) continue; const m = d.filter(f); const kid = m.filter(p => kidSet.has(p.handle)).length; if (kid) altIn.push({ handle: c.handle, n: c.n, kid }); }
altIn.sort((a, b) => b.kid - a.kid);
const inDamenHerren = altIn.filter(c => /^(damen|herren|fur-ihn|für-ihn)/.test(c.handle) || ['sub-kleider', 't-shirts-tops', 'shorts-bermudas', 'jumpsuits-overalls', 'loungewear', 'nachtwaesche-pyjamas', 'sub-bademode', 'westen-gilets'].includes(c.handle));

/* ---------- Unterfilter-Zahlen ---------- */
const ufZahlen = {};
for (const k of KATEGORIEN) ufZahlen[k.handle] = k.unterfilter.map(u => [u.titel, mit[k.handle].filter(p => istInUnterfilter(u, p)).length]);
for (const k of KATEGORIEN) for (const [t, n] of ufZahlen[k.handle]) if (n < 5) { console.error(`FEHLER: Unterfilter «${t}» in ${k.handle} hat nur ${n} Treffer`); process.exit(1); }

/* ---------- Stichproben (alle gelesen; Liste zur Kontrolle) ---------- */
const zeilen = [];
const gemessen = {};
for (const k of KATEGORIEN) {
  const m = mit[k.handle]; const u = urteile.kategorien?.[k.handle] || { falsch: [] };
  const falsch = (u.falsch || []).filter(f => m.some(p => p.handle === f.handle));      // nur noch zählen, was die FINALE Regel enthält
  gemessen[k.handle] = { treffer: m.length, stichprobe: m.length, falsch: falsch.length, falsche_beispiele: falsch.map(f => `${f.handle}: ${f.grund}`) };
  const probe = new Set(stichprobe(m, Math.min(30, m.length), k.handle).map(p => p.handle));
  zeilen.push(`===== ${k.handle} (${m.length} Treffer; alle gelesen; * = Teil der festen Zufallsstichprobe von ${Math.min(30, m.length)})`);
  for (const p of m) zeilen.push(`${probe.has(p.handle) ? '*' : ' '} ${p.handle} | ${gesch.get(p.handle)[1].padEnd(7)} | ${(p.g || '').replace('Apparel & Accessories > Clothing > ', '').replace('Baby & Toddler Clothing', 'BTC').slice(0, 34).padEnd(34)} | ${kurz(p.title, 100)}`);
}
if (!vorschau) fs.writeFileSync(path.join(HERE, 'kinder-baby-bekleidung_stichproben.txt'), zeilen.join('\n') + '\n');

/* ---------- Texte ---------- */
const FAM_S = FAMILIE.join('  ODER  ');
const geschlecht_regel = [
  'Ergebnis je Produkt: kinder | andere. «kinder» umfasst Baby, Kleinkind, Mädchen, Jungen, Teenager, Familien-/Eltern-Kind-Looks; «andere» heisst: nicht Kind, die Abteilungen Damen/Herren bestimmen damen | herren | unisex nach ihren Regeln (Titelwörter Damen/Herren/Unisex, Tags, Typ, Google-Kategorie; hier nicht neu bestimmt). Alle Muster sind Regex-Strings (JavaScript, Flag i) und werden auf den Produkttitel angewendet; der erste zutreffende Schritt gilt.',
  `1. FAMILIE: Titel trifft einen dieser Ausdrücke -> kinder (Familien-Look, Kategorie «Familien-Looks»): ${FAM_S}. Ein Elternwort allein (z. B. «Baseball-Cap «Mama»», «Dad-Cap») genügt nicht, es muss ein Kind- oder Familienwort dazukommen.`,
  `2. GOOGLE: Google-Kategorie beginnt mit «${BTC}» (CJ-Kategorie Baby & Toddler Clothing) oder «Apparel & Accessories > Clothing Accessories > Baby & Toddler Clothing Accessories» -> kinder.`,
  `3. TITEL: Titel trifft ${KINDER_TITEL.join('  ODER  ')} und trifft keinen dieser Ausnahme-Ausdrücke (${KINDER_TITEL_NICHT.join('  ODER  ')}) -> kinder. Die Ausnahmen fangen «Babydoll», «Baby-Tee» und Farbwörter, «Mädchenstil» (Erwachsenen-Stil) und das Adjektiv «im jungen Casual-Stil» ab.`,
  `4. TAG: Tag ${KINDER_TAGS.join(', ')} -> kinder.`,
  `5. TYP: Feld type «${KINDER_TYPEN.join('» oder «')}» -> kinder.`,
  '6. Sonst andere.',
  'Nicht bestimmt wird das Alter: CJ liefert keins. «Teenager» im Titel gilt wie bei Damen und Herren als kinder, «Jugendliche» nicht (dort steht der Tag herren/damen, und die Ware ist im Katalog Erwachsenen-Ware in kleinen Grössen).',
  `GEMESSEN an ${kl.length} Produkten mit Google-Kategorie unter «Clothing > » oder leer (Damen- und Herren-Universum): kinder ${dist.kinder || 0} (davon Schritt 1 Familie ${quelle.familie || 0}, Google ${quelle.google || 0}, Titel ${quelle.titel || 0}, Tag ${quelle.tag || 0}, Typ ${quelle.typ || 0}), andere ${dist.andere || 0}.`,
  `Titel gegen Tag: nennt das starke Signal (Familie, Google, Titel) ein Kind UND ist ein Geschlechts-Tag vorhanden (${titelUndTag} Produkte), widerspricht der Tag in ${widerspruch} Fällen (${pct(widerspruch, titelUndTag)}): ${Object.entries(wid).map(([k, v]) => `${k} ${v}`).join(', ')}. Der Titel gewinnt, weil er die Zielgruppe wörtlich nennt; der Tag damen/herren ist ein Sammel-Tag des Imports. Er führt alle ${wid['Tag damen -> Familie'] || 0} Familien-Produkte mit Tag damen und ${(wid['Tag damen -> Kinder'] || 0) + (wid['Tag herren -> Kinder'] || 0)} Kinder-Artikel (z. B. «Mädchen Prinzessinnenkleid aus Baumwolle», «Bagger Sweatshirt für Jungen», sechs «für Teenager») falsch.`,
  `Umgekehrt: Tag kinder ohne Kinder-Erkennung in Schritt 1-3: ${tagKinderOhneErkennung} (Schritt 4 ergänzt ihn, nur ${kl.filter(p => gesch.get(p.handle)[1] === 'tag').length} Produkte hängen allein am Tag, z. B. «Wickeloverall», «Sport-Set mit Top und Hose»). Das Feld type «Baby & Kinder»/«Kinder» stimmt: ${typKinderUndKinder} von ${typKinder} Produkten mit diesem Typ sind nach Schritt 1-4 schon kinder${typUnerkannt.length ? `, ${typUnerkannt.length} nicht: ${typUnerkannt.join(', ')}` : ''}. Schritt 5 ändert im heutigen Datensatz darum kein Ergebnis (${quelle.typ || 0}); er bleibt als Absicherung für künftige Importe.`,
].join('\n');

const json = {
  abteilung: 'Kinder- und Baby-Bekleidung',
  geschlecht_regel,
  kategorien: KATEGORIEN.map(k => ({ ...k, gemessen: gemessen[k.handle] })),
  rest: {
    anzahl: rest.length,
    beispiele: rest.slice(0, 20).map(p => `${p.handle}: ${kurz(p.title, 70)} (${(p.g || '(leer)').replace('Apparel & Accessories > ', '')})`),
    vorschlag: `${rest.length} Produkte sind nach der Kinder-Regel Kinderware, stehen aber in keiner Kinder-Kategorie. ${rest.length - restOffen.length} davon sind Fremdkörper mit klarem Ziel (siehe fremdkoerper: Kostüme, Puppenkleider, Reitsport, Kinder-Mützen/-Handschuhe/-Haarschmuck für die Accessoires-Abteilung); ${restOffen.length} bleiben ohne Ziel${restOffen.length ? ': ' + restOffen.map(p => p.handle).join(', ') : ''}. Kinder-Zubehör (Mützen, Handschuhe, Halswärmer, Strohhut, Sportvisier, Balaclava: ${rest.filter(p => (p.g || '').startsWith('Apparel & Accessories > Clothing Accessories') && !/Hair/.test(p.g)).length} Produkte) erreicht die Mindestgrösse 15 nicht und gehört nach Google-Kategorie ohnehin zu Accessoires; als Querschnitt «Kinder-Zubehör» wäre es möglich.`,
  },
  fremdkoerper,
  widersprueche_tag_titel: {
    anzahl: widerspruch,
    regel: `Nennt der Titel (Schritt 1-3) ein Kind oder eine Familie und der Tag sagt damen oder herren, gewinnt der Titel. Gemessen ${widerspruch} von ${titelUndTag} Fällen mit Titelangabe und Tag (${pct(widerspruch, titelUndTag)}); ${Object.entries(wid).map(([k, v]) => `${k}: ${v}`).join(', ')}. Der Tag kinder widerspricht dem Titel nie: von ${titelUndTag} Produkten mit starkem Signal und Geschlechts-Tag tragen ${titelUndTag - widerspruch} den Tag kinder, ${widerspruch} damen oder herren.`,
  },
  offene_fragen: [], // unten gefüllt
};

/* ---------- Offene Fragen / Messprotokoll ---------- */
const cnt = h => mit[h].length;
const offene = [];
const nMaed = d.filter(p => alleMit.has(p.handle) && /(^|[^a-zäöüß])(mädchen|maedchen)(?![a-zäöüß])/i.test(p.title)).length;
const nJung = d.filter(p => alleMit.has(p.handle) && /(^|[^a-zäöüß])(jungen|jungs|jungens)(?![a-zäöüß])/i.test(p.title)).length;
const ufN = (h, t) => (ufZahlen[h].find(x => x[0] === t) || [0, 0])[1];
offene.push(`Grösse: nur ${alleMit.size} Produkte sind Kinder-/Baby-Bekleidung (${pct(alleMit.size, kl.length)} der ${kl.length} Kleidungsprodukte). Darum 7 Kategorien: Die im Auftrag genannten Gruppen erreichen einzeln keine 15 Produkte (Kinder-Jacken, Ponchos und Anzüge ${mit['kinder-oberteile-kleider-hosen'].filter(p => /Outerwear|Suits/.test(p.g || '')).length}, Bademode ${ufN('kinder-nachtwaesche-bademode', 'Bademode')}, Kleider ${ufN('kinder-oberteile-kleider-hosen', 'Kleider')}), und Mädchen (${nMaed} Produkte mit dem Wort im Titel) und Jungen (${nJung}) verteilen sich auf alle Warenarten. Sie sind deshalb keine eigenen Kategorien, sondern Unterfilter «Für Mädchen»/«Für Jungen», wo sie mindestens 5 Treffer haben. Wer eine Mädchen- und eine Jungen-Seite will, nimmt eine Querschnitt-Sammlung: Titel «Mädchen» (${nMaed}) bzw. «Jungen|Jungs|Jungens» (${nJung}) über alle sieben Kategorien; das ist erlaubt, weil Querschnitt-Sammlungen nicht zur Blatt-Einteilung zählen.`);
offene.push(`Menü-Gruppierung (nur Vorschlag, die Struktur ist flach): Baby = kinder-baby-sets, kinder-baby-strampler-bodys, kinder-baby-kleider-oberteile (${cnt('kinder-baby-sets') + cnt('kinder-baby-strampler-bodys') + cnt('kinder-baby-kleider-oberteile')} Produkte); Kinder = kinder-sets-outfits, kinder-oberteile-kleider-hosen; Für alle = kinder-nachtwaesche-bademode (Baby UND Kinder), kinder-familien-looks. Baby-Kategorien heissen nach der CJ-Kategorie «Baby & Toddler Clothing»: ob ein Produkt Baby oder Kind ist, entscheidet allein die Google-Kategorie, nie das Alter (nicht belegt).`);
offene.push(`Alter: keine Alterskategorien, weil das Alter nicht belegt ist. Nur ${uni.filter(p => gesch.get(p.handle)[0] === 'kinder' && /neugeboren|\d+\s*[-–]\s*\d+\s*monat|gr\.?\s?\d{2,3}/i.test(p.title)).length} Titel nennen es ausdrücklich («Neugeborene», «0-3 Monate», «6–12 Monate», «Gr. 110–180»); das ist unter 15 und taugt nicht als Filter. Wer Alter will, muss es bei der Anlage in Titel oder Tag eintragen.`);
offene.push('Unterfilter sind Facetten (Chips): ein Produkt kann in mehreren stehen, jeder gilt nur innerhalb seiner Kategorie, alle verlangen ein Titelwort und haben mindestens 5 Treffer (Grenze kleiner als bei Damen, weil die ganze Abteilung nur ' + alleMit.size + ' Produkte hat). Treffer: ' + KATEGORIEN.map(k => ufZahlen[k.handle].length ? `${k.titel}: ` + ufZahlen[k.handle].map(([t, n]) => `${t} ${n}`).join(', ') : null).filter(Boolean).join(' | '));
offene.push(`Kategorie «Baby-Kleider, Oberteile & Jacken» hat genau ${cnt('kinder-baby-kleider-oberteile')} Produkte (Grenze 15). Sie fasst die CJ-Unterkategorien Tops, Bottoms, Dresses und Outerwear, die allgemeine Baby-Kleidung (Google-Kategorie nur «Baby & Toddler Clothing») und den Anzug «Baby Anzug mit Krawatte» (Google-Kategorie nur «Baby & Toddler») zusammen. Fällt sie unter 15, wird sie mit «Baby-Sets & Outfits» zu «Baby-Sets & Einzelteile» zusammengelegt. Die zwei Artikel mit der Google-Kategorie nur «Baby & Toddler» (Anzug, «Baumwoll Body für Neugeborene», der Body steht in Strampler, Bodys & Overalls) kommen über g_prefix «Baby & Toddler» plus Titelwörter in titel_muss in ihre Kategorie; g_nicht «Baby & Toddler >» hält Sitze, Spielzeug und Pflegeartikel draussen.`);
offene.push('Vorrang: Familien-Looks haben Vorrang vor jeder anderen Kinder-Kategorie (alle anderen Kategorien schliessen die Familien-Wörter per titel_nicht aus), darum steht kein Produkt in zwei Kategorien (gemessen: 0 Mehrfachzuordnungen).');
const ab = [];
ab.push(`Abgleich mit Damen und Herren (kinder-baby-bekleidung_abgleich.mjs, nur lesen): 1 Überschneidung: «Partnerlook T-Shirt "Just A Dad Who Loves His Girl"» (Vater-Tochter-Shirt) steht bei Damen in damen-t-shirts (die Damen-Regel kennt «dad» nicht) UND bei mir in kinder-familien-looks. Entscheid beim Zusammenführen: entweder Damen nimmt «dad» in ihren Schritt 1 auf, oder das Wort «dad» fliegt aus meinem FAMILIE-Muster (dann bleibt das Produkt bei Damen als unisex).`);
ab.push(`Waise «Zuckersüss Mädchenstil Langarm-Einfarbiges Pyjama-Nachthemd»: Damen- UND Herren-Regel stufen es wegen «Mädchen» als kinder ein, ich nicht (Mädchenstil = Erwachsenen-Stil, Tag damen, Tag maedchenstil, Typ Damenmode, g Nightgowns). Folge: es steht in keiner Abteilung. Vorschlag: Damen nimmt es mit Ausnahmemuster «mädchen-?(stil|haft)» in damen-nachtwaesche auf.`);
ab.push(`Waisen (Damen oder Herren stufen das Produkt als kinder ein, keine Kinder-Kategorie nimmt es auf, Ziele in fremdkoerper): Reitleggings und Reitweste «für Erwachsene und Kinder» (gemischte Grössen, Ziel Sport/Reitsport), Mützen-Schal-Handschuhe-Set (Accessoires), zwei Puppenkleider (Spielzeug), das Mädchenstil-Nachthemd (Damen). Davon steht keines in Damen oder Herren. Herren führt ausserdem 35 Produkte als «partner» (Paarlooks wie «Couple T-Shirts», «für Paare»), die in keiner Herren-Kategorie stehen und bei Damen als unisex laufen; sie sind keine Kinder-/Familien-Ware und nicht Sache dieser Abteilung. Regeln unterscheiden sich auch bei «Girl(s)» (Herren: kinder, z. B. «Mori Girl Leinenrock», «Spice Girls Stil», «Runaway Girl»; Damen und ich: nicht kinder).`);
ab.push(`Damen und Herren behandeln Familien-Sets verschieden (Damen: kinder; Herren: partner). Ich nehme alle Titel mit Familien- oder Eltern-Kind-Wort (${quelle.familie || 0} Produkte, davon ${wid['Tag damen -> Familie'] || 0} mit Tag damen) in «Familien-Looks» auf, weil sie sonst nirgends stehen. Paar-Looks ohne Familienwort gehören nicht dazu.`);
offene.push(...ab);
offene.push(`Bekannte Grenze der Geschlechtsregel: Ein Erwachsenen-Artikel, der ein Kinderwort nur im Motiv trägt («Kindermotiv», «Baby Schriftzug-Print»), gilt als Kind, weil der Titel das Wort wörtlich nennt. Im heutigen Datensatz betrifft das einen Artikel (Sweatshirt mit Baby Schriftzug-Print, als Grenzfall gezählt; dafür sprechen Typ Kinder und der Tag kat-kinder-baby). Die Gegenproben (kinder-baby-bekleidung_messen.mjs, 28 Fälle) und eine Mutationsprobe der Geschlechtsregel (_mut/lauf.sh: 10 gebrochene Stellen, alle von den Gegenproben erkannt) sichern die übrigen Fehlgriffe ab, die beim Lesen auftauchten (Babydoll, Baby-Tee, Mädchenstil, «im jungen Stil», «Teenage», Elternwort allein, Tag- und Typ-Schritt, Google-Schritt).`);
offene.push(`Fremdkörper: ${fremdkoerper.length} Produkte (siehe fremdkoerper): Kostüme/Plüschware mit Tag fortura, Puppenkleider, Reitsport, Kinder-Zubehör (Mützen/Handschuhe/Haarschmuck), ein Erwachsenen-Nachthemd und ein Herrenhemd, das wegen des Adjektivs «jungen» in der alten Collection «Kinder & Baby» (Tag sort-kinder-baby) steht. Die alte Collection ist sonst sauber: von ${d.filter(p => p.tags.includes('sort-kinder-baby') && imUniversum(p)).length} Kleidungs-/Zubehör-Produkten darin sind ${imAlten.length} Erwachsenen- oder Kostümware.`);
const swad = d.filter(p => (p.g || '').startsWith('Baby & Toddler > Swaddling') && /schlafsack|pucksack/i.test(p.title));
offene.push(`Kinder-Schuhe (nur genannt, baut die Schuh-Abteilung): ${kinderSchuhe.length} Produkte mit Google-Kategorie Shoes und Kinder-Geschlecht nach dieser Regel, davon ${kinderSchuhe.filter(p => p.type === 'Kinderschuhe').length} mit Typ «Kinderschuhe»; Handles in kinder-baby-bekleidung_kinderschuhe.json. Kinder-Uhren: ${kinderUhren.length} (gehören zu Uhren). Schlafsack-/Pucksack-Artikel mit Google-Kategorie «Baby & Toddler > Swaddling» (${swad.length}: ${swad.map(p => '«' + kurz(p.title, 50) + '»').join(', ') || '-'}) stehen bei der Baby-Ausstattung (Tag sort-baby), nicht hier, weil ihre Google-Kategorie Zubehör und keine Kleidung ist.`);
offene.push(`Bestehende Collections, die sich mit der neuen Struktur ändern: «babykleidung» (251, Shopify-Kategorie), «baby-kinder-sets» (118, Shopify-Kategorie; ${cnt('kinder-baby-sets')} + ${cnt('kinder-sets-outfits')} = ${cnt('kinder-baby-sets') + cnt('kinder-sets-outfits')} in meinen beiden Set-Kategorien), «weihnachtspyjama-familie» (30, Tag such-weihnachtspyjama; meine Unterfilter «Weihnachts-Looks» ${ufZahlen['kinder-familien-looks'].find(x => x[0] === 'Weihnachts-Looks')[1]} und «Pyjamas & Hausanzüge» ${ufZahlen['kinder-familien-looks'].find(x => x[0] === 'Pyjamas & Hausanzüge')[1]}), «baby-kleinkind» (4350, Tag baby/kinder/Titel: enthält Schuhe und Spielzeug), «sub-baby-kids» (4520, Tag sort-kinder-baby) und «baby-kids» (302) sind Sammelbecken und sollten durch diese Kategorien ersetzt werden, nicht ergänzt.`);
offene.push(`Kinder-Kleidung steckt heute auch in Damen-/Herren-/Themen-Collections (lokal nach deren Regel gezählt, ungefähre Zahlen): ${inDamenHerren.slice(0, 10).map(c => `${c.handle} ${c.kid}`).join(', ')}. Das ist der eigentliche Fremdkörper-Fall: «damen-mode» (Typ Damenmode ODER Tag kleid …) enthält ${altIn.find(c => c.handle === 'damen-mode')?.kid || 0} Kinder-Produkte. Diese Collections müssen ihre Regel auf Geschlecht umstellen (Tag damen/herren allein reicht nicht).`);
offene.push(`Sperr-Tags: ${sperrKinder.length ? sperrKinder.length + ' Kinder-Produkte tragen einen Sperr-Tag und stehen deshalb in keiner Kategorie: ' + sperrKinder.map(p => p.handle).join(', ') : 'kein Kinder-Produkt trägt einen der Sperr-Tags (adult-nicht-bewerben, 18plus, lizenz-nicht-bewerben …)'}. Die Sperrliste und «fortura» stehen trotzdem in tags_nicht jeder Kategorie, damit spätere Importe nicht durchrutschen; fortura (Kostüme) betrifft heute ${uni.filter(p => gesch.get(p.handle)[0] === 'kinder' && p.tags.includes('fortura')).length} Kinder-Produkte.`);
const gl = urteile.grenzfaelle || [];
function KW_SCAN(liste) { return liste.filter(p => gesch.get(p.handle)[0] === 'andere' && /(kinder|baby|mädchen|jungen|jungs|kids|teen|girl|boy|kleinkind|säugling|neugeboren)/i.test(p.title)); }
offene.push(`Messprotokoll (wiederholbar mit kinder-baby-bekleidung_bauen.mjs; die gelesene Liste steht in kinder-baby-bekleidung_stichproben.txt): weil die ganze Abteilung nur ${alleMit.size} Produkte hat, wurde JEDER Treffer jeder Kategorie einzeln gelesen (nicht nur 30), dazu eine feste Zufallsstichprobe von 30 pro Kategorie markiert. Beim Lesen gefundene und danach per Regel behobene Fehltreffer: «Mütze, Schal & Handschuhe Set für Kinder» in Kinder-Sets (Google-Kategorie Outfit Sets falsch gewählt; Regel: titel_nicht «handschuh»), «Zuckersüss Mädchenstil … Nachthemd» in Nachtwäsche (Regel: Ausnahme «mädchen-?(stil|haft)»), «Baseball-Cap «Mama»» und «Dad-Cap» als Familie (Regel: Elternwort braucht ein Kind-Wort), «Casual Jeans … für Jugendliche» in Kleider/Hosen (Tag herren, Typ Herrenmode, kein Kinderartikel; Regel: «Jugendliche» nicht aufgenommen), «Japanisches Langarmhemd im jungen Casual-Stil» (Adjektiv «jungen»; Regel: Ausnahme). Ausserdem Vollscans: alle ${uni.filter(p => gesch.get(p.handle)[0] === 'kinder').length} Kinder-Produkte des Universums (Google-Kategorie Clothing*, Clothing Accessories oder leer) wurden nach Kategorie oder Fremdkörper-Grund durchgesehen (in Kategorien ${uni.filter(p => alleMit.has(p.handle)).length}, Fremdkörper ${rest.length}; dazu 2 Baby-Artikel mit Google-Kategorie nur «Baby & Toddler»), und alle ${KW_SCAN(kl).length} Kleidungstitel mit einem Kinderwort (auch Girl/Boy), die NICHT als kinder gelten, wurden gelesen: ${KW_SCAN(kl).map(p => '«' + kurz(p.title, 70) + '»').join(', ') || 'keiner'}. Grenzfälle, die als richtig gezählt sind: ${gl.map(g => `«${g.titel}» (${g.grund})`).join('; ')}. Eine Stichprobe beweist keine 97 %; hier ist jedoch jeder Treffer gelesen, falsch ${Object.values(gemessen).reduce((a, g) => a + g.falsch, 0)} von ${alleMit.size}.`);
json.offene_fragen = offene;

/* ---------- Unabhängige Gegenprobe: nur aus der JSON auswerten ---------- */
const R = s => new RegExp(s, 'i');
function istMitgliedJson(k, p, gen) {
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  if (k.g_prefix?.length) { if (!k.g_prefix.some(x => g.startsWith(x))) return false; } else if (!k.titel_muss?.length) return false;
  if (k.titel_muss?.length && !k.titel_muss.some(s => R(s).test(t))) return false;
  if (k.titel_nicht?.some(s => R(s).test(t))) return false;
  if (k.g_nicht?.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht?.some(x => tg.includes(x))) return false;
  if (k.tags_muss_eines?.length && !k.tags_muss_eines.some(x => tg.includes(x))) return false;
  return gen === k.geschlecht;
}
const text = JSON.stringify(json, null, 1);
const neu = JSON.parse(text);
let abweichung = 0;
for (const k of neu.kategorien) {
  const a = new Set(mit[k.handle].map(p => p.handle));
  const b = new Set(d.filter(p => istMitgliedJson(k, p, gesch.get(p.handle)[0])).map(p => p.handle));
  if (a.size !== b.size || [...a].some(h => !b.has(h))) { abweichung++; console.error('ABWEICHUNG JSON gegen Code:', k.handle, a.size, b.size); }
}
if (abweichung) process.exit(1);
// Format-Prüfung
const KEYS = ['handle', 'titel', 'eltern', 'geschlecht', 'g_prefix', 'g_nicht', 'titel_muss', 'titel_nicht', 'tags_muss_eines', 'tags_nicht', 'beschreibung', 'unterfilter', 'gemessen'];
for (const k of neu.kategorien) for (const key of KEYS) if (!(key in k)) { console.error('Schlüssel fehlt', k.handle, key); process.exit(1); }
for (const k of neu.kategorien) for (const f of k.unterfilter) for (const key of ['handle', 'titel', 'titel_muss', 'titel_nicht']) if (!(key in f)) { console.error('Unterfilter-Schlüssel fehlt', f.handle, key); process.exit(1); }
for (const k of neu.kategorien) for (const s of [...k.titel_muss, ...k.titel_nicht, ...k.unterfilter.flatMap(u => [...u.titel_muss, ...u.titel_nicht])]) { try { new RegExp(s, 'i'); } catch (e) { console.error('Regex ungültig', k.handle, s); process.exit(1); } }

console.log('Kategorien:', KATEGORIEN.map(k => `${k.handle} ${mit[k.handle].length}`).join(' | '));
console.log('Produkte in Kategorien:', alleMit.size, '| Rest:', rest.length, '(Fremdkörper mit Ziel', rest.length - restOffen.length, ', ohne Ziel', restOffen.length, ') | fremdkoerper-Einträge:', fremdkoerper.length);
console.log('Geschlecht:', JSON.stringify(dist), JSON.stringify(quelle), '| Widersprüche', widerspruch, 'von', titelUndTag);
console.log('JSON gegen Code: identisch.');
if (!vorschau) { fs.writeFileSync(path.join(HERE, 'kinder-baby-bekleidung.json'), text + '\n'); console.log('geschrieben: /tmp/mode_taxonomie/kinder-baby-bekleidung.json', (text.length / 1024).toFixed(0) + ' KB'); }
