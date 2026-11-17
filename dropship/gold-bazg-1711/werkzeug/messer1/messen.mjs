#!/usr/bin/env node
// messer1: Gold / Platin / Palladium / plattierte Ware in den aktiven LuxeStyle-Produkten (NUR LESEN).
// Aufruf: node messen.mjs [produkte.jsonl] [ausgabe.json]
// Klassen (Prüfreihenfolge A, E, B, C, D):
//   A massiv (Gold-Feingehalt/Karat/Echtgold/«aus Gold» ohne jede Plattierung)
//   E Platin/Palladium als Metall der Ware
//   B plattiert MIT Karat-/Feingehaltszahl
//   C plattiert OHNE Zahl (Metall genannt: Gold, Silber, Platin, Rhodium)
//   D nur Farbe «gold»-Wort (auch Roségold, goldfarben ...), keine Plattierung mit Metallnamen
// Gelesen werden Titel, Beschreibung (ohne Shop-Fusszeile ab «Sorglos shoppen») und Optionen. Tags werden nicht gewertet.
import fs from 'fs';
import readline from 'readline';

const PFAD = process.argv[2] || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/edel/produkte.jsonl';
const AUS = process.argv[3] || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/edel/agenten/messer1/ergebnis.json';

// ---------- Text ----------
export function textVon(p) {
  let d = p.description || '';
  const i = d.indexOf('🛡️ Sorglos shoppen');
  if (i >= 0) d = d.slice(0, i);
  const o = (p.options || [])
    .filter((x) => !(x.name === 'Title' && (x.values || []).join() === 'Default Title'))
    .map((x) => x.name + ': ' + (x.values || []).join(', '))
    .join(' | ');
  return { t: p.title || '', d, o, alles: (p.title || '') + ' ‖ ' + d + ' ‖ ' + o };
}
function norm(s) {
  // längengleich: Strichvarianten -> '-', geschütztes Leerzeichen -> ' ', Shop-Vorlagensatz neutralisieren
  return s
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\u00a0/g, ' ')
    // Vorlagentext des Shops (Platzhalter, keine Aussage zur Ware): «Material: wie im Titel angegeben (z. B. Edelstahl, vergoldet, Zirkonia)»
    .replace(/\(z\. ?b\. edelstahl, vergoldet, zirkonia\)/gi, (m) => '(' + ' '.repeat(m.length - 2) + ')');
}

// ---------- Ausschlüsse (Wörter mit «gold», die kein Material/keine Farbe der Ware sind) ----------
const GOLD_KEIN_MATERIAL = new RegExp(
  '(?:goldfisch\\w*|goldfish|goldfinch|goldburg|goldmine|goldstandard|goldmedaille|golddetektor|goldschmied\\w*|goldkröte|goldzertifikat|goldbarren\\d*|' +
    'goldwasserkaffee|goldbohnen|goldrad|goldlöckchen|golden retriever|golden gate|goldig\\w*|goldesches|marigold|goldkapseln|goldbart|goldhamster|goldsieb|' +
    'goldfadenkiefer|goldpalme|goldmünzen|gold obsidian|gold-obsidian|goldschuppen|goldkleber|goldgefiederter|goldhaut|goldschmiedearbeiten|goldschmiedewerkstatt|' +
    'goldpartikel|golden state|goldstern|goldkopf)',
  'gi'
);
const KOSMETIK = /(anti-aging|serum|peeling|reinigungsgel|hauttyp|hyaluron|gesichts|lidschatten|make-up|augenserum|tonikum|goldpartikel|schmink|nagellack)/i;

// ---------- Verneinte Sätze entfernen ----------
const NEGATION = [
  /(?:kein(?:e[nmrs]?)?|nicht|ohne)\s+(?:\w+\s+){0,3}?(?:massiv\w*|echt\w*|reine?[nms]?|solide\w*|feines?)\s*-?\s*gold\w*/gi,
  /nicht\s+um\s+(?:echten?|reinen?|massiven?)\s+gold\w*/gi,
  /kein\s+(?:echtes?\s+|reines?\s+|massives?\s+)gold/gi,
  /(?:kein|nicht)\s+(?:aus\s+)?(?:echt\w*|massiv\w*)\s+gold\w*/gi,
];
function ohneNegation(s) {
  let r = s;
  let n = 0;
  for (const re of NEGATION) {
    r = r.replace(re, (m) => {
      n++;
      return ' '.repeat(m.length);
    });
  }
  return { r, n };
}

// ---------- Muster ----------
const KARAT = String.raw`(?:\b(?:8|9|10|14|18|21|22|24)\s?-?\s?(?:k|kt|karat|carat)(?![a-zäöüß0-9])(?!\s?(?:hz|ohm|mah|bild|video|drohne|kamera|uhd|auflösung)))`;
const FEIN = String.raw`(?:\b(?:333|375|417|585|750|916|999)(?:er)?\b)`;
const AUZ = String.raw`(?:\bau\s?-?\s?(?:333|375|417|585|750|916|999)\b|\bpt\s?-?\s?(?:850|900|950|999)\b|\bpd\s?-?\s?(?:500|950)\b)`;
const GOLDWORT = String.raw`[a-zäöü]*gold[a-zäöü]*`;
const PLATWORT = String.raw`(?:vergold\w*|\w*gold-?plat\w*|\w*gold-?plät\w*|\w*gold-?platier\w*|gold-?überz\w*|\w*goldüberz\w*|gold-?beschicht\w*|gold-?auflage|gold-?verplatt\w*|gold-?schicht|gold-?lack\w*|gold-?gefüllt\w*|gold-?füllung|gold\s?-?filled|gold-?galvan\w*|echt-?vergold\w*|vakuum-?vergold\w*|pvd-?gold|gold-?pvd|gold-?elektro\w*|gold-?plating|gold\s?plated)`;

// Plattierungs-Begriffe mit genanntem Edelmetall in der Nähe (Gold, Silber, Platin, Rhodium)
const METALL_NAME = String.raw`(?:gold\w*|silber\w*|platin\w*|rhodium\w*)`;
const VERFAHREN = String.raw`(?:galvan\w*|elektro-?plat\w*|electro-?plat\w*|plattier\w*|plätt\w*|platier\w*|plating|plated|beschicht\w*|überzog\w*|überzug|überzieh\w*|überzieht|verplatt\w*|pvd\w*|veredel\w*|vakuum\w*|lackiert\w*|lackierung|auflage|aufgetragen\w*|filled|gefüllt\w*)`;

const RE = {
  karat: new RegExp(KARAT, 'gi'),
  fein: new RegExp(FEIN, 'gi'),
  auz: new RegExp(AUZ, 'gi'),
  // Zahl nahe Gold (28 Zeichen vor/hinter)
  zahlGold1: new RegExp(`(${KARAT}|${FEIN}|${AUZ})[^\\n‖]{0,28}?(${GOLDWORT})`, 'gi'),
  zahlGold2: new RegExp(`(${GOLDWORT})[^\\n‖]{0,28}?(${KARAT}|${FEIN}|${AUZ})`, 'gi'),
  // Zahl nahe Verfahren (45 Zeichen)
  zahlVerf1: new RegExp(`(${KARAT})[^\\n‖]{0,45}?(${VERFAHREN})`, 'gi'),
  zahlVerf2: new RegExp(`(${VERFAHREN})[^\\n‖]{0,45}?(${KARAT})`, 'gi'),
  platwort: new RegExp(PLATWORT, 'gi'),
  // starke Plattierungs-Aussagen mit genanntem Edelmetall (eng gefasst)
  stark: [
    ['gold', /\b[a-zäöü]*(?<!sil)vergold\w*|\bkupfergoldvergold\w*/gi],
    ['silber', /\b[a-zäöü]*versilber\w*/gi],
    ['platin', /platinier\w*|\bplatiniert\w*|\bgoldplatiniert\w*/gi],
    ['rhodium', /rhodinier\w*|\brhodiniert\w*|rhodium-?(?:beschicht\w*|plat\w*|überz\w*)/gi],
    ['gold', /(?<![a-zäöü])(?<!titan-)(?<!titan )(?:gold|weissgold|weißgold|roségold|rosegold|rosé-?gold)-?\s?(?:plat\w*|plät\w*|beschicht\w*|überz\w*|überzieh\w*|auflage|verplatt\w*|schicht\b|lack\w*|galvan\w*|elektro\w*|filled|füllung|gefüllt\w*|plating|plated|pvd\w*|veredel\w*|vakuum\w*|verplät\w*)/gi],
    ['silber', /(?<![a-zäöü])silber-?\s?(?:plat\w*|plät\w*|beschicht\w*|überz\w*|überzieh\w*|auflage|verplatt\w*|schicht\b|lack\w*|galvan\w*|elektro\w*|plating|plated|veredel\w*)/gi],
    ['platin', /(?<![a-zäöü])platin(?:um)?-?\s?(?:plat\w*|plät\w*|beschicht\w*|überz\w*|auflage|lack\w*|galvan\w*|elektro\w*|plating|plated|veredel\w*)/gi],
    ['gold', /(?:plattier\w*|plätt\w*|beschichtet\w*|beschichtung|überzug|überzogen\w*|galvani\w*|elektropl\w*|lackiert\w*|lackierung|veredel\w*|aufgetragen\w*|plating|plated)\s+(?:in|mit|aus|durch)\s+(?:einer?\s+|dem\s+|der\s+)?(?:\w+\s+){0,1}?(?:weiss|weiß|rosé|rose)?gold(?!farb|ton|opt|-farb|-ton|-opt|\s?farb|en\b|ene\b|enem\b|ener\b)\w*/gi],
    ['gold', /(?:mit|in|aus)\s+(?:\w+\s+){0,1}?(?:weiss|weiß)?gold(?!farb|ton|opt)\w*\s+(?:überzogen\w*|beschichtet\w*|plattiert\w*|galvanisiert\w*|veredelt\w*|elektroplattiert\w*|lackiert\w*|gefüllt\w*)/gi],
    ['silber', /(?:plattier\w*|plätt\w*|beschichtet\w*|beschichtung|überzug|überzogen\w*|galvani\w*|elektropl\w*|lackiert\w*|veredel\w*|plating|plated)\s+(?:in|mit|aus|durch)\s+(?:einer?\s+|dem\s+|der\s+)?(?:\w+\s+){0,1}?silber(?!farb|ton|opt|-farb|-ton|-opt|\s?farb|n\b|ne\b|nen\b|ner\b|nem\b)\w*/gi],
    ['gold', /veredelung\s*:\s*(?:\w+\s+(?:oder|und)\s+)?(?:weiss|weiß)?gold(?!farb)/gi],
    ['gold', /gold[-\s]?oberfl\w+\s+(?:durch|mit|per)\s+(?:galvan\w*|elektro\w*|plattier\w*|beschicht\w*)/gi],
    ['plaque', /\bplaqué\b|\bdoublé\b|\bvermeil\b|gold[- ]vermeil|\bgold[- ]?filled\b|goldgefüllt\w*|gold-?füllung|gold-?plating|gold[- ]plated|plated gold|silver[- ]plated|platinum[- ]plated/gi],
  ],
  plattBare: /galvan\w*|elektro-?plat\w*|electro-?plat\w*|elektro-?plät\w*|plattier\w*|plätt\w*|\bplating\b|\bplated\b|beschicht\w*|überzog\w*|überzug|pvd\w*|vakuum-?(?:veredel\w*|plat\w*|beschicht\w*)|elektropli\w*|verplatt\w*/gi,
  // Massiv-Hinweise
  echtgold: /echt-?\s?gold|echtes?\s+gold|real\s+gold|solid\s+gold|massive[rsnm]?\s+gold|massiv-?gold|reine[mrsn]?\s+gold|pure\s+gold|feingold|reingold|\bk-gold\b|\bkgold\b|hartgold/gi,
  ausGold: /(?:material\s*:\s*gold\b|(?:besteht|bestehen|gefertigt|hergestellt|gehäuse(?:\s+\w+){0,2}\s+ist|ist|sind|kette)\s+aus\s+(?:reinem\s+|echtem\s+|massivem\s+|feinem\s+)?gold\b(?!\s*-?\s*(?:obsidian|samt|velvet|thread|foil))|in\s+reinem\s+gold)/gi,
  vollgold: /vollgold\w*|massivgold|ganzgold|voll\s+gold|komplett\s+gold|ganz\s+in\s+gold/gi,
  platinMetall: /\bpt\s?-?\s?(?:850|900|950|999)\b|\bpallad\w*|\bpd\s?-?\s?(?:500|950)\b|(?:aus|material\s*:|inlay-material\s*:|einlagematerial\s*:)\s*(?:reinem\s+|echtem\s+)?platin(?:um)?\b|\bplatin(?:um)?\s*\/\s*k-gold|platinum\s+und\s+k-gold|echtes?\s+platin|reines?\s+platin|platin-?(?:ring|schmuck|barren|münze)/gi,
  platinWort: /(?<![a-zäöü])platin(?!g|e\b|en\b|enhalter|enträger|ensatz|enfixierung)\w*/gi,
  farbWorte: /farb\w*|ton\b|töne\w*|optik|finish|look|schimmer|glanz|erhältlich|verfügbar|farbe/gi,
};

function alle(re, s, max = 3) {
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    out.push({ i: m.index, t: m[0] });
    if (m[0].length === 0) re.lastIndex++;
    if (out.length >= max) break;
  }
  return out;
}
function beleg(s, i, len = 40, vor = 28, nach = 36) {
  const a = Math.max(0, i - vor);
  const b = Math.min(s.length, i + len + nach);
  return s.slice(a, b).replace(/\s+/g, ' ').trim();
}
function kurzBeleg(s, h, lo = 0, hi = s.length) {
  // s: Originaltext (gleiche Länge wie der normierte Text), h: Treffer {i,t}; lo/hi: Feldgrenzen (Beleg bleibt in EINEM Feld)
  // Ergebnis möglichst 60 bis 100 Zeichen wörtlich (kürzer nur, wenn das Feld selbst kürzer ist)
  const ende = h.i + h.t.length;
  let a = Math.max(lo, h.i - 28);
  let b = Math.min(hi, Math.max(ende + 32, a + 70));
  if (b - a > 100) b = a + 100;
  if (ende > b) { b = Math.min(hi, ende + 4); a = Math.max(lo, b - 100); }
  if (b - a < 60) { a = Math.max(lo, b - 60); if (b - a < 60) b = Math.min(hi, a + 60); }
  // an Wortgrenzen kürzen (nur wenn die Länge dabei nicht unter 56 fällt und der Treffer drin bleibt)
  let a2 = a, b2 = b;
  if (a2 > lo && /\S/.test(s[a2 - 1]) && /\S/.test(s[a2])) { const k = s.slice(a2, h.i).search(/\s/); if (k >= 0) a2 = a2 + k + 1; }
  if (b2 < hi && /\S/.test(s[b2 - 1]) && /\S/.test(s[b2])) { const k = s.slice(ende, b2).lastIndexOf(' '); if (k >= 0) b2 = ende + k; }
  if (a2 <= h.i && b2 >= ende && b2 - a2 >= 60) { a = a2; b = b2; }
  return s.slice(a, b).replace(/\s+/g, ' ').trim();
}

const SCHMUCK_TYPEN = new Set(['Schmuck', 'Uhren', 'Halskette', 'Ring', 'Ohrringe', 'Armband']);
const SCHMUCK_WORT = /\b(ring|ringe|kette|ketten|halskette|armband|armbänder|armreif|ohrring|ohrringe|ohrstecker|ohrhänger|ohrclip|anhänger|schmuck|collier|brosche|uhr|uhren|armbanduhr|taschenuhr|manschettenknöpfe|piercing|charm|fusskette|fußkette|kettchen|bracelet|bangle|necklace|earring)\w*/i;

// ---------- Klassifikation eines Produkts ----------
const FARB_VOR = /(?:farb\w*|erhältlich in|verfügbar in|erhältlich als|wahlweise|zur wahl|ausführung|varianten?|in den tönen|töne)[^.‖|]{0,24}$/i;
const GRUNDMETALL = /(?:aus|besteht aus|gefertigt aus|hergestellt aus|material\s*:)\s+(?:\w+\s+){0,2}?(?:kupfer\w*|edelstahl|titanstahl|titan|messing|legierung|zink\w*|eisen|stahl|aluminium|silber|kunststoff|holz)/i;
const FINISH_NAH = (m) => new RegExp(`(${KARAT})[^\\n‖]{0,25}?(finish|veredel\\w*|optik|schicht|lackier\\w*|vakuum\\w*)|(finish|veredel\\w*|schicht|lackier\\w*|vakuum\\w*)[^\\n‖]{0,25}?(${KARAT})`, 'gi');

function suche(sl) {
  const r = {};
  r.ps = [];
  for (const [quelle, re] of RE.stark) for (const h of alle(re, sl, 2)) r.ps.push({ ...h, quelle });
  r.ps.sort((a, b) => a.i - b.i);
  r.pb = alle(RE.plattBare, sl, 2);
  r.zg = [...alle(RE.zahlGold1, sl, 2), ...alle(RE.zahlGold2, sl, 2)];
  r.zv = [...alle(RE.zahlVerf1, sl, 2), ...alle(RE.zahlVerf2, sl, 2)];
  r.fin = alle(FINISH_NAH(), sl, 2);
  r.kar = alle(RE.karat, sl, 2);
  r.eg = alle(RE.echtgold, sl, 3);
  r.aug = alle(RE.ausGold, sl, 2);
  r.vg = alle(RE.vollgold, sl, 2);
  r.pm = alle(RE.platinMetall, sl, 2);
  const o = sl.replace(GOLD_KEIN_MATERIAL, ' ');
  r.goldTok = alle(/[a-zäöü0-9]*gold[a-zäöü0-9]*/gi, o, 3);
  r.platinTok = alle(RE.platinWort, sl, 3);
  return r;
}
function farbKontext(sl, h) {
  const vor = sl.slice(Math.max(0, h.i - 45), h.i);
  return FARB_VOR.test(vor);
}

export function klassifiziere(p) {
  const tx = textVon(p);
  const { r: td0, n: negN } = ohneNegation(norm(tx.t + ' ‖ ' + tx.d));
  const td = td0.toLowerCase();
  const op = norm(tx.o).toLowerCase();
  const T = suche(td); // Titel + Beschreibung
  const O = suche(op); // Optionen
  const sBel = tx.t + ' ‖ ' + tx.d; // Original für wörtliche Belege
  const tLen = tx.t.length;
  const belTD = (h) => (h.i < tLen ? kurzBeleg(sBel, h, 0, tLen) : kurzBeleg(sBel, h, tLen + 3, sBel.length));
  const sBelO = tx.o;

  const kosm = KOSMETIK.test(td) && !SCHMUCK_WORT.test(p.title + ' ' + (p.productType || ''));
  const schmuck = SCHMUCK_TYPEN.has(p.productType || '');

  const psAll = [...T.ps, ...O.ps];
  const hatStark = psAll.length > 0;
  const hatBare = T.pb.length + O.pb.length > 0;
  const hatFinishZahl = T.fin.length > 0 || O.fin.length > 0;
  const hatPlatt = hatStark || hatBare || hatFinishZahl;
  const zahlTD = [...T.zg, ...T.zv, ...T.fin];
  const zahlO = [...O.zg, ...O.zv, ...O.fin];
  const hatZahl = zahlTD.length + zahlO.length > 0;
  // massive Evidenz nur aus Titel/Beschreibung (Optionen sind meist Farbnamen)
  const massivTD = [...T.zg, ...T.eg, ...T.aug].filter((h) => !farbKontext(td, h));
  const farbZahl = [...T.zg, ...T.eg, ...T.aug].filter((h) => farbKontext(td, h));
  const grund = GRUNDMETALL.test(td);

  let klasse = null, unterklasse = '', bel = null;
  const bl = (arr) => (arr[0] ? belTD(arr[0]) : null);

  if (kosm && (T.zg.length || T.eg.length || T.kar.length) && !hatStark) {
    klasse = 'X'; unterklasse = 'kosmetik-goldpartikel'; bel = bl(T.zg.length ? T.zg : T.eg.length ? T.eg : T.kar);
  } else if (massivTD.length && !hatPlatt) {
    klasse = 'A';
    unterklasse = (T.zg.length ? 'zahl' : T.eg.length ? 'echt' : 'aus-gold') + (grund ? '+grundmetall' : '');
    { const bevorzugt = [...massivTD].sort((x, y) => (y.i >= tLen) - (x.i >= tLen) || x.i - y.i)[0]; bel = belTD(bevorzugt); }
  } else if ((T.pm.length || O.pm.length) && !psAll.some((x) => x.quelle === 'platin')) {
    klasse = 'E'; bel = T.pm[0] ? belTD(T.pm[0]) : kurzBeleg(sBelO, O.pm[0]);
  } else if (hatPlatt && hatZahl) {
    klasse = 'B';
    const h = zahlTD[0] || zahlO[0];
    bel = zahlTD[0] ? belTD(h) : kurzBeleg(sBelO, h);
    unterklasse = hatStark ? 'metall-genannt' : 'verfahren-ohne-metall';
  } else if (hatStark) {
    klasse = 'C';
    // Metall der Plattierung: Gold vor Platin vor Rhodium vor Silber (nur Silber = «nur-silber»)
    const qs = new Set(psAll.map((x) => (x.quelle === 'plaque' ? 'gold' : x.quelle)));
    unterklasse = qs.has('gold') ? 'gold' : qs.has('platin') ? 'platin' : qs.has('rhodium') ? 'rhodium' : 'nur-silber';
    const bevorzugt = (T.ps.find((x) => (x.quelle === 'plaque' ? 'gold' : x.quelle) === (unterklasse === 'nur-silber' ? 'silber' : unterklasse)) || O.ps.find((x) => (x.quelle === 'plaque' ? 'gold' : x.quelle) === (unterklasse === 'nur-silber' ? 'silber' : unterklasse)));
    const h = bevorzugt || T.ps[0] || O.ps[0];
    bel = T.ps.includes(h) ? belTD(h) : kurzBeleg(sBelO, h);
  } else if (T.goldTok.length + O.goldTok.length > 0) {
    klasse = 'D';
    const h = T.goldTok[0] || O.goldTok[0];
    bel = T.goldTok[0] ? belTD(h) : kurzBeleg(sBelO, h);
    unterklasse = hatBare ? 'galvanik-ohne-metall' : (farbZahl.length || zahlO.length || O.eg.length ? 'zahl/echt-nur-als-farbe' : '');
  } else if (T.platinTok.length + O.platinTok.length > 0) {
    klasse = 'P'; unterklasse = 'platin-nur-farbe-oder-name';
    bel = T.platinTok[0] ? belTD(T.platinTok[0]) : kurzBeleg(sBelO, O.platinTok[0]);
  }
  return { klasse, unterklasse, beleg: bel, schmuck, negation: negN };
}

export { RE, suche, alle };

// ---------- Lauf ----------
async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(PFAD), crlfDelay: Infinity });
  const klassen = { A: [], E: [], B: [], C: [], D: [], X: [], P: [] };
  let n = 0;
  const sub = {};
  for await (const line of rl) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    n++;
    const k = klassifiziere(p);
    if (!k.klasse) continue;
    klassen[k.klasse].push({ handle: p.handle, titel: p.title, beleg: k.beleg, unterklasse: k.unterklasse, schmuck: k.schmuck });
    const key = k.klasse + (k.unterklasse ? ':' + k.unterklasse : '') + (k.schmuck ? '|schmuck' : '|andere');
    sub[key] = (sub[key] || 0) + 1;
  }
  const out = { gelesen: n, anzahl: Object.fromEntries(Object.entries(klassen).map(([k, v]) => [k, v.length])), sub, klassen };
  fs.writeFileSync(AUS, JSON.stringify(out));
  console.log(JSON.stringify({ gelesen: n, anzahl: out.anzahl, sub }, null, 1));
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
