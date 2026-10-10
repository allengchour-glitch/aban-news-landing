// familienset_werte.mjs — Auswahlfeld von Familien-/Partnerlook-Sets deutsch und ohne Lieferantentext (10.10.2026).
// Übersetzer: tools/varianten_deutsch.mjs (12.09., 56 Selbsttests, Grössen-Wächter). Dieser Aufsatz entscheidet STRENG,
// ob das Ergebnis besser ist als das Original — sonst bleibt die Option, wie sie ist.
// Anlass: Familien-Weihnachtspyjamas ranken bei Google auf Pos. 21–26 («familien-weihnachtspyjama», Nachfrage steigt
// bis Dezember), aber 43 Optionen zeigten «Gray-Father S», «Hat Print-S For Mother», «White-DadS», «Mother's Size L».
// Der Übersetzer allein lieferte bei weiten Läufen Denglisch («Schwarz And Weiss», «Lemon Gelb Half Rice» am Bettbezug,
// «5562 · Herren M» mit Artikelcode) — darum: nur Familien-Titel, kein englischer Rest, kein Code, Grössen buchstabengleich.
// Benutzt von automation/familienset_auswahl.py (Bestand + Aufseher) und den CJ-Importern (buildFashion).
import { uebersetze, groessenUnveraendert, hatLieferantenKennung } from '../tools/varianten_deutsch.mjs';

export const FAMILIE_TITEL = /famil|partnerlook|eltern|mutter|vater|mama|papa|mommy|daddy|parent|mutter-tochter|vater-sohn/i;
const ROLLE_ROH = /\b(dad|daddy|mom|mommy|mother|father|mama|papa|kid|kids|child|children|baby|romper|tong)\b|\b(dad|mom)(?=[SMLX0-9])/i;
// Englischer Rest nach der Übersetzung → Option bleibt (lieber Englisch als Denglisch)
const ENGLISCH = /\b(and|for|to|size|picture|color|colou?r|parent|child|children|boy|boys|girl|girls|suit|hat|print|sweater|autumn|winter|mixed|white|black|red|blue|green|gray|grey|yellow|brown|purple|light|dark|coat|pants|dress|long|short|sleeve|style|women|men|kid|kids|mother|father|dad|mom|half|meters?|lemon|rice|flesh|lotus|new|flower|deer)\b/i;
const CODE_VORN = /^\s*\d{3,}|^\s*[A-Z]{1,4}\s?\d{2,}\b/;   // auch «SD60-Dad 3XL» → «SD 60 · Papa 3XL»
const ELTERN_ROH = /\b(dad|daddy|mom|mommy|mother|father)\b|\b(dad|mom)(?=[SMLX0-9])/i;
// Zahlenpaar «3 4» darf die Übersetzung nicht NEU erzeugen («Kids3 4Y» → «Kind 3 4Y»); stand es schon im Original
// («Rot-Kinder 3 4», «White-Baby 60 0to3M»), bleibt es, wie es war — gemessen 10.10.: 2 Sets fielen sonst unnötig durch
const ZWEI_ZAHLEN = /\d\s+\d/g;
const zahlenpaare = s => (String(s).match(ZWEI_ZAHLEN) || []).length;
const WORT_DOPPELT = s => { const w = s.toLowerCase().split(/[\s·]+/).filter(x => /^[a-zäöü]{3,}$/.test(x)); return new Set(w).size !== w.length; };                       // «5562 · Herren M», «230Green · Papa L»
const FARB_UND = /\b(Schwarz|Weiss|Rot|Blau|Grün|Gelb|Grau|Braun|Lila|Pink|Beige|Khaki|Rosa|Orange|Gold|Silber|Navy|Marineblau) And (Schwarz|Weiss|Rot|Blau|Grün|Gelb|Grau|Braun|Lila|Pink|Beige|Khaki|Rosa|Orange|Gold|Silber|Marineblau)\b/g;
const GROESSE_ENDE = /(?:^|\s)(?:\d?X{0,3}[SML]|\d+XL|X[SL]|\d{1,3}(?:T|Y|M|J)?|\d{1,3}\s?cm|\d{1,2}to\d{1,2}(?:T|Y)?|\d{1,2}m)$/i;

// Deutsches Farbpaar «Schwarz-Weiss» darf der Übersetzer nicht am Strich zerlegen («Schwarz · Weiss · Baby»)
const FARBEN_DE = 'Schwarz|Weiss|Rot|Blau|Grün|Gelb|Grau|Braun|Lila|Pink|Beige|Khaki|Rosa|Orange|Gold|Silber|Marineblau|Weinrot|Dunkelblau|Hellblau|Dunkelgrün|Hellgrau|Dunkelgrau|Kaffeebraun';
const PAAR_DE = new RegExp(`\\b(${FARBEN_DE})-(${FARBEN_DE})\\b`, 'g');
const schuetzen = w => String(w || '').replace(PAAR_DE, '$1\u2010$2');
const freigeben = s => s.replace(/\u2010/g, '-');

const entklebt = w => String(w || '');   // Vergleich gegen das Original, wie es dasteht
function nachbessern(s) {
  return s.replace(FARB_UND, '$1-$2');               // «Schwarz And Weiss» → «Schwarz-Weiss»
}

/** Werte EINER Option → { werte, name } oder null (nicht anfassen). */
export function familienWerte(werte, titel = '', optName = 'Farbe') {
  // Familien-Titel ODER mindestens zwei Werte mit Elternwort («Black-Father S Size» im «Pyjama-Set im Karomuster»)
  if (!FAMILIE_TITEL.test(titel || '') && werte.filter(w => ELTERN_ROH.test(w || '')).length < 2) return null;
  if (werte.filter(w => ROLLE_ROH.test(w || '')).length < 2) return null;
  if (werte.some(w => hatLieferantenKennung(w))) return null;          // «JJF106230color-Dad 3XL»: Kennung trennt Muster
  // Dieselbe reine Artikelnummer vor ALLEN Werten («5562-Herren M», «5562-Baby 3») unterscheidet nichts → weg
  const nr = (String(werte[0] || '').match(/^(\d{3,})-/) || [])[1];
  const ohneNr = nr && werte.every(w => String(w).startsWith(nr + '-')) ? werte.map(w => String(w).slice(nr.length + 1)) : werte;
  const neu = [];
  for (const w of ohneNr) {
    const n = nachbessern(freigeben(uebersetze(schuetzen(w))));
    if (!n || !groessenUnveraendert(w, n) || ENGLISCH.test(n) || CODE_VORN.test(n)) return null;
    if (n !== w && (zahlenpaare(n) > zahlenpaare(entklebt(w)) || WORT_DOPPELT(n))) return null;   // «Kid03 children» → «Kind 03 Kind»
    neu.push(n);
  }
  if (new Set(neu.map(x => x.toLowerCase())).size !== neu.length) return null;
  if (neu.every((x, i) => x === werte[i])) return null;
  let name = optName;
  if (/^(farbe|color|colou?r)$/i.test(optName)) name = neu.some(x => GROESSE_ENDE.test(x)) ? 'Ausführung & Grösse' : 'Ausführung';
  return { werte: neu, name };
}

export const KANARIEN = [
  // [Titel, Optionsname, Werte, erwartet (null = bleibt)]
  ['Familien-Outfits für Eltern und Kinder', 'Farbe', ['Gray-Father S', 'Gray-Mom M'], { werte: ['Grau · Papa S', 'Grau · Mama M'], name: 'Ausführung & Grösse' }],
  ['Weihnachts-Pyjama im Partnerlook', 'Farbe', ['White-DadS', 'White-DadM', 'Red-Mom L'], { werte: ['Weiss · Papa S', 'Weiss · Papa M', 'Rot · Mama L'], name: 'Ausführung & Grösse' }],
  ['Familien-Weihnachtsanzüge mit Streifen', 'Farbe', ['Red-S For Mother', "Red-Mother's Size L", 'Red-Father S Size'], { werte: ['Rot · Mama S', 'Rot · Mama L', 'Rot · Papa S'], name: 'Ausführung & Grösse' }],
  ['Partnerlook-Freizeitanzug Schwarz-Weiss', 'Farbe', ['Black And White-Dad S', 'Black And White-Mom M'], { werte: ['Schwarz-Weiss · Papa S', 'Schwarz-Weiss · Mama M'], name: 'Ausführung & Grösse' }],
  ['Partnerlook Hausanzug für die ganze Familie', 'Farbe', ['Dad', 'Mom', 'Kinder', 'Baby'], { werte: ['Papa', 'Mama', 'Kinder', 'Baby'], name: 'Ausführung' }],
  ['Gestreiftes Familien-Set für Weihnachten', 'Farbe', ['5562-Herren M', '5562-Damen S', '5562-Baby 3', '5562-Baby 6'], { werte: ['Herren M', 'Damen S', 'Baby 3', 'Baby 6'], name: 'Ausführung & Grösse' }],
  ['Kariertes Freizeit-Set für die ganze Familie', 'Farbe', ['5562-Dad L', '5563-Mom S'], null],
  ['Einfacher Homewear Pyjama-Anzug', 'Farbe', ['Dad M', 'Dad L', 'SD60-Dad 3XL', 'Mom S'], null],
  ['Mutter-Tochter Sweater', 'Grösse', ['Mother S', 'Mother M', 'Mädchen 2Y'], { werte: ['Mama S', 'Mama M', 'Mädchen 2Y'], name: 'Grösse' }],
  // bleibt: Kennung, Code vorn, englischer Rest, kein Familien-Titel, Kollision
  ['Weihnachts-Pyjama-Set für die ganze Familie', 'Farbe', ['Dad', 'JJF106230color-Dad 3XL', 'Kid'], null],
  ['Gestreiftes Familien-Set für Weihnachten', 'Farbe', ['5562-Herren M', '5562-Dad L', '5562-Mom S'], { werte: ['Herren M', 'Papa L', 'Mama S'], name: 'Ausführung & Grösse' }],
  ['Kariertes Freizeit-Set für die ganze Familie', 'Farbe', ['230Green-Dad 2XL', '230Green-Kid 2Y'], null],
  ['Weihnachts-Partnerlook für die ganze Familie', 'Farbe', ['Hat Print-S For Mother', 'Hat Print-Mother M'], null],
  ['Partnerlook-Outfits für die ganze Familie', 'Farbe', ["Blue-Girls' Suit Size 80", 'Blue-Dad L', 'Blue-Mom S'], null],
  ['Cotton-Bettbezug', 'Ausführung', ['Lemon Yellow Half Rice', 'Baby Pink-Mom'], null],
  ['Baby-Overall aus Baumwolle', 'Farbe', ['Beige Romper', 'Coffee Color Romper'], null],
  ['Weihnachts-Homewear für die ganze Familie', 'Farbe', ['Kid', 'Kids', 'Mom S'], null],
  ['Weihnachts-Pyjama im Partnerlook', 'Farbe', ['Rot · Papa S', 'Rot · Mama M'], null],
  ['Partnerlook T-Shirt für die ganze Familie', 'Farbe', ['Daddy', 'Mommy', 'Kid03 children', 'Baby04 children'], null],
  ['Partnerlook Pullover für Mutter und Tochter', 'Grösse', ['Mother M', 'Mother L', 'Kid03 children'], null],
  ['Familien-Weihnachtsanzüge mit Streifen', 'Farbe', ['Red-S For Mother', 'Rot-Kinder 3 4', 'Rot-Baby 0 6'], { werte: ['Rot · Mama S', 'Rot · Kinder 3 4', 'Rot · Baby 0 6'], name: 'Ausführung & Grösse' }],
  ['Weihnachts Pyjama-Set im rot-schwarzen Karomuster', 'Farbe', ['Black-Father S Size', 'Black-Mom 2XL'], { werte: ['Schwarz · Papa S', 'Schwarz · Mama 2XL'], name: 'Ausführung & Grösse' }],
  ['Mom Jeans mit hoher Taille', 'Farbe', ['Blue', 'Black'], null],
  ['Familien-Pyjama-Set mit Tiermotiven', 'Farbe', ['Picture Color-BOY 3 to 4Y', 'Picture Color-Mom S'], null],
  ['Hawaii Familien-Look für 4 Personen', 'Grösse', ['Mother S', 'Mother M', 'Girl 3to4Y'], { werte: ['Mama S', 'Mama M', 'Mädchen 3to4Y'], name: 'Grösse' }],
  ['Partnerlook-Freizeitanzug Schwarz-Weiss', 'Farbe', ['Schwarz-Weiss-Baby 9 m', 'Schwarz-Weiss-Dad S', 'Schwarz-Weiss-Mom M'], { werte: ['Schwarz-Weiss · Baby 9 m', 'Schwarz-Weiss · Papa S', 'Schwarz-Weiss · Mama M'], name: 'Ausführung & Grösse' }],
  ['Baby-Strampler Set', 'Farbe', ['Baby Pink-Romper', 'Baby Blue-Romper'], null],
];

export function kanarienGruen(laut = false) {
  let f = 0;
  for (const [t, n, w, soll] of KANARIEN) {
    const ist = familienWerte(w, t, n);
    if (JSON.stringify(ist) !== JSON.stringify(soll)) { f++; if (laut) console.log(`  ✗ ${t}: ${JSON.stringify(w)} → ${JSON.stringify(ist)} (soll ${JSON.stringify(soll)})`); }
  }
  if (laut) console.log(`FAMILIENSET-KANARIEN ${KANARIEN.length - f}/${KANARIEN.length}`);
  return f === 0;
}

if (process.argv[1] && process.argv[1].endsWith('familienset_werte.mjs')) {
  const fs = await import('node:fs');
  if (process.argv.includes('--test')) process.exit(kanarienGruen(true) ? 0 : 1);
  if (process.argv.includes('--stapel')) {          // stdin: [{title, opt, werte}] → stdout: [ergebnis|null]
    const ein = JSON.parse(fs.readFileSync(0, 'utf8'));
    process.stdout.write(JSON.stringify(ein.map(o => familienWerte(o.werte, o.title, o.opt))));
  }
}
