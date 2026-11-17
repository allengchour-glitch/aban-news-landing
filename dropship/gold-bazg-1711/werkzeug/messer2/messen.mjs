// messer2: Gold / Platin / Palladium / plattierte Ware in den aktiven LuxeStyle-Produkten.
// NUR LESEN: liest produkte.jsonl zeilenweise und schreibt ausschliesslich nach agenten/messer2/.
//
//   node messen.mjs                      Vollauf, schreibt ergebnis.json, handles_A.txt, handles_E.txt, klassen_*.txt
//   node messen.mjs --pruefe=B --n=25 --seed=7     zufällige Produkte einer Klasse mit Belegen (Sichtprüfung)
//   node messen.mjs --handle=<handle>    Entscheid und Belege eines Produkts
//
// Klassen (Prüfreihenfolge A, E, B, C, D; jedes Produkt in genau eine):
//   A  massiv: Text sagt "aus Gold" / nennt Feingehalt oder Karat ohne Plattierungswort im ganzen Produkt
//   E  Platin/Palladium als Metall der Ware
//   B  plattiert MIT Zahl (18K, 14K, 750 ...), auch wenn nur Grundmetall + "18K Gold" als Farbe steht
//   C  plattiert OHNE Zahl (vergoldet, plattiert, versilbert, platiniert; "generisch" = nur Elektroplattierung + Goldfarbe)
//   D  nur Goldfarbe (Farbname, Optik)
//   X  Treffer ohne Edelmetallbezug (Fehltreffer, nicht gezählt)
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import crypto from 'crypto';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const EINGABE = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/edel/produkte.jsonl';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

// ---------- Normalisierung (längenerhaltend: Offsets passen auf den Originaltext) ----------
const norm = s => String(s ?? '').toLowerCase().replace(/[\u2010\u2011]/g, '-').replace(/\s/g, ' ');
const FELDER = ['T', 'D', 'O', 'P'];
const rohFelder = p => ({
  T: String(p.title ?? ''),
  D: String(p.description ?? ''),
  O: (p.options || []).map(o => `${o.name}: ${(o.values || []).join('; ')}`).join(' || '),
  P: String(p.productType ?? ''),
});

// ---------- Muster ----------
const U = '[üu]e?';
// Plattierung / Beschichtung mit Gold
const PL_AU = new RegExp([
  '(?<!sil)vergold', 'vergülde',
  'gold[\\s\\-]?(?:plat+i(?!n)|plät+i|plated|plating|platierung|plattierung|verplat|verplät)',
  'gold[\\s\\-]?(?:filled|fill\\b|füll|full\\b|gef[üu]ll|gefull)',
  `gold[\\s\\-]?(?:${U}berz|${U}berzug|${U}berzieh|auflage|schicht|beschicht|galvan|elektro|electro|veredel|tauch)`,
  `(?:${U}berzogen|beschichtet|plattiert|platiert|veredelt|galvanisiert|elektroplattiert)\\s+(?:mit\\s+|in\\s+|von\\s+)?(?:[\\p{L}\\d]+[\\s\\-]){0,2}gold`,
  `(?:pvd|vakuum\\w*|galvan\\w*|electro\\w*|elektro\\w*)[\\s\\-]?(?:[\\p{L}\\d]+[\\s\\-]){0,2}gold`,
  `(?:gold|silber)-?\\s?(?:oder|und|\\/)\\s?(?:gold|silber)(?:beschicht|plattier|${U}berz|auflage)`,
  'veredelung\\s*[:=]\\s*(?:[\\p{L}\\d]+[\\s,\\-]+){0,2}gold',
  'doublé', 'plaqué', 'vermeil',
  '\\d{1,2}\\s?-?\\s?(?:k|kt|karat)[\\s\\-]?(?:veredel|beschicht|plattier|[üu]berz|finish|lack|elektro|galvan|vakuum)',
].join('|'), 'u');
const PL_AG = /versilber|silber[\s\-]?(?:plat+i(?!n)|plät+i|plated|plating|beschicht|überz|ueberz|auflage)|silbergepl[aä]|mit silber (?:überzogen|beschichtet|plattiert)/u;
const PL_PT = /platinier|platiniert|platinbeschicht|platin[\s\-]?plat|platin[\s\-]?(?:überz|ueberz)|platinum[\s\-]?plat|rhodinier|rhodium|goldplatinier|in platin lackiert|platin-?veredel|platin- ?und gold-?veredel|platin-?\/?gold-?veredel/u;
// Plattierung ohne Metallnennung
const PL_GEN = /elektro[\s\-]?plat|electro[\s\-]?plat|elektro[\s\-]?plating|electroplat|galvanis|galvanik|galvano|plattiert|plattierung|\bplating\b|verplatt|vakuumplat|vakuumbeschicht|vakuumveredel|\bpvd\b|\bplated\b/u;
// Verneinung direkt vor einem Plattierungswort ("ohne Vergoldung", "unvergoldet")
const NEG_PL = /(?:\bnicht|\bkein(?:e|en|er)?|\bohne)\s?(?:\p{L}+\s)?(?:vergold|goldplatt|goldüberz|goldbeschicht)|\bunvergold|\bunplatt/u;

// Gold-Zahlen
const RE_KARAT = /(?<![\p{L}\d.,/])(8|9|10|12|14|15|16|18|20|21|22|23|24)\s?-?\s?(k|kt|karat|carat)(?![\p{L}\d])/gu;
const RE_FEIN = /(?<![\p{L}\d.,/])(?:333|375|417|585|750|916|999)\s?(?:er\s)?-?\s?(?:feingold|gold|au\b)|(?:gold|(?<![\p{L}\d])au)[\s:\-]{0,3}(?:333|375|417|585|750|916|999)(?![\p{L}\d.,]|\s?(?:ml|g\b|gramm|w\b|mm|cm|l\b|stk|stück|lumen|mah|v\b))|(?<![\p{L}\d])(?:333|375|417|585|750|916|999)er\s?(?:gold|feingold)|feingold|999er/gu;
const RE_KGOLD = /(?<![\p{L}\d])k[\s\-]?gold(?![\p{L}])/gu;
// massive Behauptungen
const RE_MASSIV = /echt(?:es|er|em|en)?[\s\-]?gold(?!\p{L}*(?:plat|beschicht|überz|ueberz|galvan|elektro|schicht|finish|lack|pvd|auflage))|solid[\s\-]gold|real[\s\-]gold(?![\s\-]?(?:plat|fill))|massiv(?:es|em|en|er)?[\s\-]?gold(?![\p{L}\-])|massivgold|reines? gold|reingold|pure[\s\-]gold|genuine gold/gu;
const RE_AUSGOLD = /(?:aus|von|besteht aus)\s+(?:echtem\s+|reinem\s+|massivem\s+|\d{1,2}\s?-?\s?(?:k|kt|karat)\s+)gold(?![\p{L}\-])|(?:gefertigt|hergestellt|gemacht)\s+aus\s+gold(?![\p{L}\-])|\baus\s+gold\b(?!\s*(?:und|oder|,|-|\/|obsidian))/gu;
// Platin / Palladium als Metall
const RE_PT_METALL = /palladium|(?<![\p{L}\d])pt[\s\-]?(?:950|900|850|999)(?![\p{L}\d])|platin\s?(?:950|900|999)|(?:aus|von)\s+(?:echtem\s+|reinem\s+)?platin(?![\p{L}])|echtes?\s+platin|massiv(?:es|em)?\s+platin|platinmetall|reinplatin|(?<![\p{L}\d])pd\s?(?:950|500)(?![\p{L}\d])|schmelzen von (?:legierungen, )?platin/gu;
const RE_PLATIN_ANY = /platin(?!e(?![\p{L}])|en(?![\p{L}])|ier)/u;
// Gold als Wort; Ausschlüsse (kein Metallbezug)
const RE_GOLD = /gold/u;
const RE_X_GOLD = /golden[\s\-]retriever|goldfisch|goldschmied|golden[\s\-]hour|goldene[rnms]? stunde|golden delicious|goldfadenkiefer|goldbart|marigold|goldkaffee|kaffeegold|kaffee-gold|teegold|sesamgold|goldobsidian|gold obsidian|goldzertifikat|goldkeramik|gold-keramik|goldkapseln|goldpuder|gold-puder|goldblatt|blattgold|flussgold|minengold|lokalgold|raumgold|goldmuschel|goldnagel|goldnadel|silbergold|iridium-gold|goldwurzel/gu;
// Kosmetik / Pflege (Gold als Wirkstoff oder Effekt)
const RE_KOSMETIK_T = /anti-?aging|serum|peeling|gesichts|creme|lippenstift|lidschatten|lippenbalsam|nagellack|make-?up|maske|elixir|tonikum|reinigungsgel|hautpflege|lipgloss|foundation/u;
const BASIS = /edelstahl|rostfrei|stainless|(?<![\p{L}])stahl(?![\p{L}])|titan|kupfer|copper|messing|brass|legierung|alloy|zink|bronze|nickel/u;
const PLATT_WORT = /(vergold|plat+i(?!n)|plät+i|plated|plating|überz|ueberz|beschicht|finish|lack|elektro|electro|galvan|auflage|füll|full|filled|fill\b|veredel|pvd|vakuum|tauch|doublé|plaqué|vermeil|coating|coated|überzieh|schicht)/u;

const EDELWARE = /schmuck|ring|halskette|armband|ohrring|uhr|kette|anhänger|charm|besteck|geschirr|kerzen/u;
const wf = (s, i, len, w) => s.slice(Math.max(0, i - w), Math.min(s.length, i + len + w));
const snip = (roh, i, len, w = 38) => roh.slice(Math.max(0, i - w), Math.min(roh.length, i + len + w)).replace(/[\r\n\t]+/g, ' ').trim();

// ---------- Rohauswertung eines Produkts ----------
export function sammle(p) {
  const roh = rohFelder(p);
  const f = {}; for (const k of FELDER) f[k] = norm(roh[k]);
  const fo = {}; for (const k of FELDER) fo[k] = f[k].replace(RE_X_GOLD, m => ' '.repeat(m.length)); // X-Wörter liefern kein "gold"
  const alle = FELDER.map(k => fo[k]).join(' | ');
  const r = { roh, f, fo, ev: { platAu: [], platAg: [], platPt: [], platGen: [], zahl: [], massiv: [], pt: [] }, hatGold: RE_GOLD.test(alle), hatPlatin: RE_PLATIN_ANY.test(alle), kosmetikTitel: RE_KOSMETIK_T.test(f.T) || RE_KOSMETIK_T.test(f.P) };

  const scan = (re, fn) => { for (const k of FELDER) { const s = fo[k]; if (!s) continue; const rr = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = rr.exec(s))) { if (m[0] === '') { rr.lastIndex++; continue; } fn(k, s, m); } } };
  const plat = (arr, re) => scan(re, (k, s, m) => {
    if (NEG_PL.test(wf(s, m.index, m[0].length, 18))) return;
    arr.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], beleg: snip(roh[k], m.index, m[0].length) });
  });
  plat(r.ev.platAu, PL_AU); plat(r.ev.platAg, PL_AG); plat(r.ev.platPt, PL_PT); plat(r.ev.platGen, PL_GEN);
  // "silberbeschichtet/Silberbeschichtung" bei Nicht-Schmuck ist meist technisch (Kontakte, Sonnenschutzgewebe): nicht zählen
  if (!EDELWARE.test(f.P)) r.ev.platAg = r.ev.platAg.filter(e => !/beschicht|überz|ueberz/u.test(e.tok));

  scan(RE_KARAT, (k, s, m) => {
    const eng = wf(s, m.index, m[0].length, 25), weit = wf(s, m.index, m[0].length, 60);
    const goldNah = /gold|vergold/u.test(eng);
    const karatWort = /^karat|^carat/u.test(m[2]) && /gold|vergold|echt|feingehalt|veredel|beschicht|plat|überz|ueberz|purität|reinheit/u.test(weit);
    // "18K PVD-Beschichtung", "14K Elektroplattierung": übliche Goldkarat-Zahl mit Plattierungswort im engen Fenster und Gold irgendwo im Produkt
    const platNah = [9, 10, 14, 18, 22, 24].includes(+m[1]) && /vergold|plat+i(?!n)|plät+i|plating|plated|pvd|beschicht|überz|ueberz|galvan|elektro|electro|finish|veredel|vakuum|schicht|auflage|füll|filled/u.test(eng) && RE_GOLD.test(alle);
    if (!(goldNah || karatWort || platNah)) return;
    if (/moissan|diamant|zirkon|brillant|\bstein|\bct\b/u.test(eng) && !goldNah) return; // Steingewicht
    r.ev.zahl.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], art: 'karat', w: weit, beleg: snip(roh[k], m.index, m[0].length) });
  });
  scan(RE_FEIN, (k, s, m) => { r.ev.zahl.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], art: 'fein', w: wf(s, m.index, m[0].length, 60), beleg: snip(roh[k], m.index, m[0].length) }); });
  scan(RE_KGOLD, (k, s, m) => { r.ev.zahl.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], art: 'kgold', w: wf(s, m.index, m[0].length, 60), beleg: snip(roh[k], m.index, m[0].length) }); });

  for (const R of [RE_MASSIV, RE_AUSGOLD]) {
    scan(R, (k, s, m) => {
      const neg = /(?:kein(?:e|en|er|es)?|nicht|ohne|statt|anstatt|anstelle)\W+(?:\p{L}+\W+){0,3}(?:massiv|echt|reines?|gold)|(?:massiv|echt)\w*\s+gold\w*\s+(?:ist|sind)\s+(?:er|sie|es)\s+nicht|nicht\s+um\s+echten|(?:massiv|echt)\w*\s+gold\w*\W+(?:\p{L}+\W+){0,3}nicht|kein massives/u.test(wf(s, m.index, m[0].length, 40));
      r.ev.massiv.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], neg, w: wf(s, m.index, m[0].length, 60), ausGold: R === RE_AUSGOLD, beleg: snip(roh[k], m.index, m[0].length) });
    });
  }
  scan(RE_PT_METALL, (k, s, m) => { r.ev.pt.push({ feld: k, i: m.index, len: m[0].length, tok: m[0], beleg: snip(roh[k], m.index, m[0].length) }); });
  return r;
}

// ---------- Entscheidungstabelle für einzeln im Volltext gelesene Grenzfälle ----------
// klasse = Zielklasse, grund = warum. Wird beim Sichten gefüllt (siehe unten); Vorrang vor den Regeln.
export const ENTSCHEIDE = {
  // A: im Volltext gelesen. unter = Art der Aussage
  'seewasserperle-hanf-armband-14k-gold-8bf2bf': { klasse: 'A', unter: 'klar', grund: 'Text: "Armband aus 14 Karat Gold", "Material: 14 Karat Gold, Hanf"; kein Plattierungswort, kein Grundmetall' },
  'diy-gold-perle-fur-individuellen-schmuck-619300': { klasse: 'A', unter: 'klar', grund: 'Text: "Hergestellt aus 999er Feingold"; kein Plattierungswort' },
  'perlen-ohrhanger-damen-1e5228': { klasse: 'A', unter: 'klar', grund: 'Text: "14k Gold Ohrhänger"; kein Plattierungswort, kein Grundmetall' },
  'perlenarmband-aus-susswasserperlen-439a4d': { klasse: 'A', unter: 'klar', grund: 'Text: "14K-Gold-Kette" (Titel/Text); kein Plattierungswort' },
  'perlen-halskette-mit-18k-gold-5bf6ea': { klasse: 'A', unter: 'klar', grund: 'Titel "mit 18K Gold", Text "Edles Material: 18K Gold"; Farbe rose gold; kein Plattierungswort' },
  '18k-gold-akoya-perlen-armband-fcb661': { klasse: 'A', unter: 'klar', such: { feld: 'D', text: 'aus 18 Kaltgold' }, grund: 'Titel "18K-Gold", Text "aus 18 Kaltgold" (vermutlich 18K-Gold), "Kaltgold-Mosaikmaterial in Rosé- und Weissgold"; kein Plattierungswort' },
  'gold-pearl-halskette-631800': { klasse: 'A', unter: 'grundmetall', grund: 'Text: "besteht aus Edelstahl und 18k Gold"; Grundmetall genannt, kein Plattierungswort (vermutlich plattiert, Wortlaut nennt es nicht)' },
  'gold-case-uhr-mit-goldteller-mediterraner-stil-602500': { klasse: 'A', unter: 'wortlaut_farbe_vermutet', grund: 'Text: "Das Gehäuse ist aus Gold gefertigt"; Material "Metall", Farben Gold-Schwarz: wörtlich massiv, nach Lage der Dinge Goldfarbe' },
  // Zahl nur als Farb-/Ausführungsname, Grundmetall genannt, kein Plattierungswort: plattiert mit Zahl (erschlossen)
  'armband-mit-zirkonia-edelsteinen-610800': { klasse: 'B', unter: 'zahl_als_farbe_grundmetall', grund: 'Kupfer; "Erhältlich in den edlen Farben Platin, Roségold und 18K Gold": 18K ist ein Farbname, kein Material' },
  'minimalistischer-ring-aus-silber-mit-geometris-601500': { klasse: 'B', unter: 'zahl_als_farbe_grundmetall', grund: 'Ring "aus Silber gefertigt und in 18K Gold oder Platin erhältlich": Variantenangabe auf Silberbasis, kein Plattierungswort; Grenzfall zu A (massives 18K möglich, nicht belegt)' },
  // Gold nur als Variante/Farbe
  'kleiner-hammer-mit-messinggriff-fa8a81': { klasse: 'D', unter: 'zahl_im_farbnamen', grund: '"Erhältlich in 18K Gold Version" ist ein Variantenname eines Hammers mit Messinggriff' },
  // E
  'lotpaste-fur-bga-reparaturen-625000': { klasse: 'E', unter: 'wortlaut_loetpaste', grund: 'Text: "63% Zinn und 37% Palladium"; Lötpaste, kein Schmuck; Angabe vermutlich Übersetzungsfehler (Sn63/Pb37 = Blei)' },
  'hochtemperatur-quarzschale-c87af8': { klasse: 'X', unter: 'werkzeug', grund: 'Schale zum Schmelzen von Platin und Gold; Ware ist nicht aus Platin' },
};

// ---------- Entscheidung ----------
export function entscheide(p) {
  const r = sammle(p);
  const { ev } = r;
  const E = { handle: p.handle, titel: p.title, klasse: null, unter: '' };
  const GOLDNAH = /gold|vergold|silber|plat/u;
  const hatPlatAu = ev.platAu.length > 0, hatPlatAg = ev.platAg.length > 0, hatPlatPt = ev.platPt.length > 0, hatPlatGen = ev.platGen.length > 0;
  const hatPlatEdel = hatPlatAu || hatPlatAg || hatPlatPt;
  const kosm = r.kosmetikTitel;

  // Zahlen: nur echte Karat-/Feingehaltszahlen; "K-Gold" ohne Zahl ist keine Zahl (kgold)
  const zahlPlatt = [], zahlOhnePlatt = [];
  for (const z of ev.zahl) {
    if (z.art === 'kgold') continue;
    const platFenster = PLATT_WORT.test(z.w) && GOLDNAH.test(z.w);
    if (platFenster || hatPlatAu || hatPlatGen) zahlPlatt.push(z); else zahlOhnePlatt.push(z);
  }
  // massive Behauptungen: nicht verneint, nicht in Optionswerten (dort sind "Massivgold/Reingold" Farbnamen), keine Gold-Plattierung im Produkt
  const massivStark = ev.massiv.filter(m => !m.neg && m.feld !== 'O' && !hatPlatAu && !hatPlatGen && !(!m.ausGold && /(überz|ueberz|beschicht|plat+i(?!n)|vergold|elektro|galvan)/u.test(m.w)));

  const aKand = [];
  for (const z of zahlOhnePlatt) { if (kosm) continue; aKand.push({ art: 'zahl', ...z }); }
  for (const m of massivStark) aKand.push({ art: m.ausGold ? 'ausGold' : 'massiv', ...m });
  const eKand = ev.pt;

  Object.assign(r, { aKand, eKand, zahlPlatt, zahlOhnePlatt, hatPlatAu, hatPlatAg, hatPlatPt, hatPlatGen, E });

  const hand = ENTSCHEIDE[p.handle];
  if (hand) { E.klasse = hand.klasse; E.unter = hand.unter || ''; E.grund = hand.grund; E.hand = true; r.klasse = hand.klasse; return r; }

  const setze = (k, u = '') => { E.klasse = k; E.unter = u; r.klasse = k; return r; };
  if (aKand.length) return setze('A', 'ungeprueft');
  if (eKand.length) return setze('E', 'ungeprueft');
  if (hatPlatEdel && zahlPlatt.length) return setze('B', 'mit_Plattierungswort');
  if (zahlPlatt.length && !kosm) return setze('B', 'Zahl_im_Plattierungsfenster');
  if (hatPlatEdel) return setze('C', hatPlatAu ? 'gold' : (hatPlatAg ? 'silber' : 'platin'));
  if (hatPlatGen && r.hatGold) return setze('C', 'generisch');
  if (r.hatGold) return kosm && ev.zahl.length ? setze('X', 'kosmetik') : setze('D');
  if (hatPlatGen) return setze('X', 'plattiert_ohne_metall_ohne_goldwort');
  if (r.hatPlatin) return setze('X', 'platin_nur_farbe_oder_marke');
  return setze('X', 'kein_gold');
}

// ---------- Hauptlauf ----------
export async function lauf(visit) {
  const rl = readline.createInterface({ input: fs.createReadStream(EINGABE), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) { if (!line.trim()) continue; n++; visit(JSON.parse(line)); }
  return n;
}
export { norm, rohFelder };

const istMain = process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1]);

// ---------- Ausgabe-Hilfen ----------
function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WARENGRUPPE = pt => /^(schmuck|ring|halskette|armband|ohrringe)$/iu.test(pt || '') ? 'Schmuck' : /uhr/iu.test(pt || '') ? 'Uhren' : 'Sonstige';
// Fenster an Wortgrenzen kürzen (wörtlicher Ausschnitt, 60 bis 100 Zeichen)
const wortfenster = (roh, a, b) => {
  let a2 = a, b2 = b, n = 0;
  while (a2 > 0 && a2 < b2 && roh[a2 - 1] !== ' ' && n++ < 18) a2++;
  n = 0; while (b2 < roh.length && b2 > a2 && roh[b2] !== ' ' && n++ < 18) b2--;
  const t = roh.slice(a2, b2).replace(/[\r\n\t]+/g, ' ').trim();
  return t.length >= 60 ? t : roh.slice(a, b).replace(/[\r\n\t]+/g, ' ').trim();
};
const beleg = (r, klasse) => {
  // wörtlicher Beleg, 60 bis 100 Zeichen: Fenster um den besten Treffer im Originaltext
  const cand = [];
  const add = (arr, prio) => arr.forEach(e => cand.push({ ...e, prio }));
  if (klasse === 'A') { add(r.aKand, 0); }
  if (klasse === 'E') { add(r.ev.pt, 0); }
  if (klasse === 'B') { add(r.ev.zahl.filter(z => z.art !== 'kgold'), 0); add(r.ev.platAu, 1); }
  if (klasse === 'C') { add(r.ev.platAu, 0); add(r.ev.platAg, 0); add(r.ev.platPt, 0); add(r.ev.platGen, 1); }
  if (klasse === 'D') {
    for (const k of FELDER) { const s = r.fo[k]; const m = /gold/u.exec(s || ''); if (m) cand.push({ feld: k, i: m.index, len: m[0].length, prio: k === 'D' ? 0 : k === 'O' ? 1 : 2 }); }
  }
  cand.sort((a, b) => (a.prio - b.prio) || ((a.feld === 'D' ? 0 : a.feld === 'O' ? 1 : 2) - (b.feld === 'D' ? 0 : b.feld === 'O' ? 1 : 2)));
  for (const c of cand) {
    const roh = r.roh[c.feld]; if (!roh) continue;
    if (roh.length < 60) continue;
    const L = 92; let a = Math.max(0, c.i - 40); let b = Math.min(roh.length, a + L); a = Math.max(0, b - L);
    const text = wortfenster(roh, a, b);
    if (text.length >= 60) return { feld: c.feld, text };
  }
  for (const c of cand) { const roh = r.roh[c.feld]; if (roh) return { feld: c.feld, text: roh.slice(0, 100).replace(/[\r\n\t]+/g, ' ').trim(), kurz: true }; }
  return { feld: '-', text: '' };
};

// ---------- Fehltreffer-Zählung (Rohmuster, GEMESSEN über alle Produkte) ----------
const FEHL = [
  ['2K bis 8K Auflösung oder Kleidungs-Kürzel (Zahl+K, nicht Gold)', /(?<![\p{L}\d.,/])(?:2|3|4|5|6|8)\s?-?k(?![\p{L}\d])/giu],
  ['20K Hz / 128K ROM / 000K (Frequenz, Speicher, Zahlen)', /(?<![\p{L}\d.,/])\d{1,3}k\s?(?:hz|rom|ram|ohm)/giu],
  ['14CT/11CT Stichzahl (Kreuzstich-Stoff)', /(?<![\p{L}\d])(?:11|14|16|18|28)\s?ct(?![\p{L}\d])/giu],
  ['Karat als Steingewicht (Moissanit, Diamant, Zirkon)', /(?:\d\s?-?\s?(?:karat|ct)\b[^.|]{0,40}(?:moissan|diamant|zirkon|stein)|(?:moissan|diamant|zirkon)[^.|]{0,40}\d\s?-?\s?(?:karat|ct)\b)/giu],
  ['Wörter mit "karat" ohne Goldbezug (Karate, Ankarat, Nacarat, antikarativ)', /(?<![\p{L}])(?:\p{L}*karat[eoi]\p{L}*|ankarat|nacarat|antikarat\p{L}*)(?![\p{L}])/giu],
  ['PD (Power Delivery) als Palladium-Kürzel', /(?<![\p{L}\d])pd(?![\p{L}\d])/giu],
  ['Platin/Platinum als Farbname oder Marke (Uhr, Sneaker, Haarglätter)', /platin(?:um)?(?![\p{L}])/giu],
  ['Platine/Einplatinencomputer (Leiterplatte)', /einplatinen\p{L}*|(?<![\p{L}])platine(?![\p{L}])/giu],
  ['Double (Double B, Double Barrel, Double-Button, Sofa Single/Double) statt Doublé', /(?<![\p{L}])double(?![\p{L}é])/giu],
  ['Golden Retriever / Goldfisch / Goldschmied / Golden Hour / Golden Delicious', /golden[\s-]retriever|goldfisch|goldschmied|golden[\s-]hour|goldene[rnms]? stunde|golden delicious|marigold/giu],
  ['Gold in Farb- oder Sortennamen ohne Metall (Goldkaffee, Raumgold, Lokalgold, Flussgold, Goldobsidian, Goldblatt, Goldmuschel)', /goldkaffee|kaffeegold|kaffee-gold|teegold|sesamgold|goldobsidian|gold obsidian|goldzertifikat|goldkapseln|goldpuder|goldblatt|blattgold|flussgold|minengold|lokalgold|raumgold|goldmuschel|goldnagel|goldnadel|silbergold|iridium-gold/giu],
  ['Vollgold / Massivgold / Reingold als Uhren-Farboption', /(?:voll|massiv|rein)gold/giu],
  ['Gold-Samt / Goldfolie / Goldprint / Goldblatt (Textil, Druck, Effekt)', /gold[\s-]?(?:samt|velvet|velours|folie|print|blatt|puder|stickerei|prägung|faden)|goldfolien/giu],
  ['Goldkeramik / Goldschale (Haarstyler, Uhren) als Farbbezeichnung', /gold[\s-]?(?:keramik|schale|gehäuse|muschel|nagel|ziffer\p{L}*)/giu],
  ['Gold lackiert / Goldlack / Gold-Lackierung (Farbanstrich, kein Edelmetall)', /gold[\s-]?lack\p{L}*|gold(?:farbe)? lackiert/giu],
  ['au 585 im Wortteil ("blau 585 Stk")', /(?<=\p{L})au\s?(?:333|375|417|585|750|916|999)(?![\p{L}\d])/giu],
  ['pinkgold/kgold im Wortteil (pin-KGOLD)', /(?<=\p{L})k-?gold/giu],
  ['GF als Glasfaser (PA+30% GF), GP/GF-Token', /(?<![A-Za-zÄÖÜäöü0-9])(?:GF|GP)(?![A-Za-zÄÖÜäöü0-9])/g],
  ['24K/24 Karat in Kosmetik (Anti-Aging, Peeling, Make-up-Öl; Gold als Wirkstoff)', /24[\s-]*(?:k|karat)(?![\p{L}\d])/giu, p => RE_KOSMETIK_T.test(norm(p.title) + ' ' + norm(p.productType))],
  ['"aus Gold"/"in Gold" als Farbangabe ("erhältlich in Gold", "in Gold gehalten")', /(?:erhältlich|verfügbar|gehalten|wählbar)[^.|]{0,12}\bin gold\b|\bin gold (?:gehalten|oder|und)\b/giu],
  ['Elektroplating/Nickel plating ohne Edelmetall (Diamantschleifer, Hüllen, Schraubensätze)', /nickel plating|electroplating-verst|elektroplating-verfahren aufgebracht/giu],
];

if (istMain) {
  const t0 = Date.now();
  const stat = fs.statSync(EINGABE);
  const sha = crypto.createHash('sha256'); sha.update(fs.readFileSync(EINGABE));
  const ordner = {};
  const klassen = { A: [], E: [], B: [], C: [], D: [], X: [] };
  const sub = {}, wg = {}, fuell = {};
  const treffer = []; // alle Produkte mit Treffer, für Beispiele
  const stat2 = { B_karat: {}, B_titel_zahl_ohne_plattwort: 0, D_titel_goldschmuckwort: [], D_titel_gold: 0, C_goldfarbe_nur_optionen: 0, plat_in_titel: 0, sort_vergoldet_tag_ohne_text: [], platin_gesamt: 0, platin_E: 0, mit_gold_gesamt: 0 };
  const fz = FEHL.map(f => ({ name: f[0], produkte: 0, bsp: [] }));
  let n = 0; let fehlerZeilen = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(EINGABE), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue; n++;
    let p; try { p = JSON.parse(line); } catch { fehlerZeilen++; continue; }
    // Fehltreffer-Zählung über den Rohtext
    const roh = rohFelder(p); const allRoh = [roh.T, roh.D, roh.O].join(' | ');
    FEHL.forEach((f, i) => {
      const re = new RegExp(f[1].source, f[1].flags.includes('g') ? f[1].flags : f[1].flags + 'g');
      // Muster mit i-Flag oder Grossbuchstaben (GF/GP) laufen auf dem Rohtext, die übrigen auf dem kleingeschriebenen
      const ziel = (f[1].flags.includes('i') || /[A-Z]/.test(f[1].source.replace(/\\[A-Za-z]|\\p\{[A-Za-z]+\}/g, ''))) ? allRoh : norm(allRoh);
      const m = re.exec(ziel);
      if (m && (!f[2] || f[2](p))) { fz[i].produkte++; if (fz[i].bsp.length < 3) fz[i].bsp.push(p.handle); }
    });
    const r = entscheide(p);
    if (r.hatGold) stat2.mit_gold_gesamt++;
    if (r.hatPlatin) stat2.platin_gesamt++;
    const relevant = r.hatGold || r.hatPlatin || r.ev.pt.length || r.ev.platAu.length || r.ev.platAg.length || r.ev.platPt.length || r.ev.zahl.length;
    // Tag "vergoldet" ohne Textbeleg
    if ((p.tags || []).some(t => /vergoldet|vergoldung|goldplatt|plaque|doubl/u.test(t)) && !(r.ev.platAu.length)) stat2.sort_vergoldet_tag_ohne_text.push(p.handle);
    if (!relevant) continue;
    const gruppe = WARENGRUPPE(p.productType);
    const rec = { handle: p.handle, titel: p.title, unter: r.E.unter, wg: gruppe, pt: p.productType };
    klassen[r.klasse].push(rec);
    const key = r.klasse + ':' + (r.E.unter || '-'); sub[key] = (sub[key] || 0) + 1;
    const wk = r.klasse + ':' + gruppe; wg[wk] = (wg[wk] || 0) + 1;
    if (['A', 'E', 'B', 'C', 'D'].includes(r.klasse)) {
      let bel = beleg(r, r.klasse);
      const such = ENTSCHEIDE[p.handle]?.such;
      if (such) { const roh2 = r.roh[such.feld]; const ix = roh2.toLowerCase().indexOf(such.text.toLowerCase()); if (ix >= 0) { let a = Math.max(0, ix - 45); const b = Math.min(roh2.length, a + 92); a = Math.max(0, b - 92); bel = { feld: such.feld, text: wortfenster(roh2, a, b) }; } }
      treffer.push({ rec, bel, hand: !!r.E.hand, grund: r.E.grund || '' });
    }
    if (r.klasse === 'B') {
      const ks = new Set(r.ev.zahl.filter(z => z.art !== 'kgold').map(z => (z.tok.match(/\d+/) || [''])[0] + 'K'));
      ks.forEach(k => { stat2.B_karat[k] = (stat2.B_karat[k] || 0) + 1; });
      const titelZahl = r.ev.zahl.some(z => z.feld === 'T' && z.art !== 'kgold');
      const titelPlatt = r.ev.platAu.some(e => e.feld === 'T') || r.ev.platGen.some(e => e.feld === 'T');
      if (titelZahl && !titelPlatt) stat2.B_titel_zahl_ohne_plattwort++;
    }
    if (r.klasse === 'D') {
      if (/gold/u.test(r.fo.T)) stat2.D_titel_gold++;
      if (/gold(?:kette|armband|ring|ohrring|anhänger|halskette|schmuck|creole|stecker|uhr|armreif)/u.test(r.fo.T)) stat2.D_titel_goldschmuckwort.push(p.handle);
    }
  }

  // Beispiele: 15 je Klasse, zufällig (festes Seed), gestreut über Warengruppen
  const rnd = prng(20261117);
  const beispiele = {};
  for (const k of ['A', 'E', 'B', 'C', 'D']) {
    const pool = treffer.filter(t => t.rec && klassen[k].includes(t.rec));
    let arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    // Belege aus der Beschreibung (60 bis 100 Zeichen) zuerst, damit die Beispiele vollständige Sätze zeigen
    const gut = t => t.bel.feld === 'D' && !t.bel.kurz && t.bel.text.length >= 60 && t.bel.text.length <= 100;
    arr = [...arr.filter(gut), ...arr.filter(t => !gut(t))];
    // Streuung: erst je Warengruppe/Unterklasse reihum
    const gruppen = {}; for (const t of arr) { const g = t.rec.unter + '|' + t.rec.wg; (gruppen[g] ||= []).push(t); }
    const reihe = []; const keys = Object.keys(gruppen);
    let more = true; let idx = 0;
    while (reihe.length < 15 && more) { more = false; for (const g of keys) { if (gruppen[g][idx]) { reihe.push(gruppen[g][idx]); more = true; if (reihe.length >= 15) break; } } idx++; }
    beispiele[k] = reihe.slice(0, 15).map(t => ({ handle: t.rec.handle, titel: t.rec.titel, unter: t.rec.unter, warengruppe: t.rec.wg, beleg_feld: t.bel.feld, beleg: t.bel.text, ...(t.grund ? { grund: t.grund } : {}) }));
  }

  const zaehl = {}; for (const k of Object.keys(klassen)) zaehl[k] = klassen[k].length;
  const ergebnis = {
    analyst: 'messer2',
    datei: { pfad: EINGABE, bytes: stat.size, geaendert_utc: stat.mtime.toISOString(), sha256: sha.digest('hex'), zeilen: n, defekte_zeilen: fehlerZeilen },
    gelaufen_utc: new Date().toISOString(),
    zaehlung: zaehl, unterklassen: sub, warengruppen: wg, statistik: { ...stat2, D_titel_goldschmuckwort: stat2.D_titel_goldschmuckwort.length, sort_vergoldet_tag_ohne_text: stat2.sort_vergoldet_tag_ohne_text.length },
    fehltreffer_muster: fz.map(f => ({ muster: f.name, produkte: f.produkte, beispiel_handles: f.bsp })),
    beispiele,
    handles: { A: klassen.A.map(x => x.handle), E: klassen.E.map(x => x.handle) },
    handentscheide: Object.fromEntries(Object.entries(ENTSCHEIDE).map(([h, e]) => [h, { klasse: e.klasse, unter: e.unter, grund: e.grund }])),
    D_titel_goldschmuckwort_handles: stat2.D_titel_goldschmuckwort,
    sort_vergoldet_tag_ohne_text_handles: stat2.sort_vergoldet_tag_ohne_text,
  };
  fs.writeFileSync(path.join(DIR, 'ergebnis.json'), JSON.stringify(ergebnis, null, 1));
  for (const k of ['A', 'E', 'B', 'C', 'D', 'X']) fs.writeFileSync(path.join(DIR, `klasse_${k}.tsv`), klassen[k].map(x => [x.handle, x.unter, x.wg, x.titel.replace(/\t/g, ' ')].join('\t')).join('\n') + '\n');
  fs.writeFileSync(path.join(DIR, 'handles_A.txt'), klassen.A.map(x => x.handle).join('\n') + '\n');
  fs.writeFileSync(path.join(DIR, 'handles_E.txt'), klassen.E.map(x => x.handle).join('\n') + '\n');

  console.log('Produkte gelesen', n, '| Datei', stat.size, 'Byte, geändert', stat.mtime.toISOString(), '| defekte Zeilen', fehlerZeilen);
  for (const k of ['A', 'E', 'B', 'C', 'D', 'X']) console.log(k, klassen[k].length);
  console.log('Summe A–E', ['A', 'E', 'B', 'C', 'D'].reduce((a, k) => a + klassen[k].length, 0));
  console.log(JSON.stringify(sub, null, 1)); console.log(JSON.stringify(wg));
  console.log('Statistik', JSON.stringify({ ...stat2, D_titel_goldschmuckwort: stat2.D_titel_goldschmuckwort.length, sort_vergoldet_tag_ohne_text: stat2.sort_vergoldet_tag_ohne_text.length }));
  for (const f of fz) console.log(String(f.produkte).padStart(5), f.name);
  console.log('Sekunden', (Date.now() - t0) / 1000);
}
