#!/usr/bin/env node
/**
 * varianten_deutsch.mjs — uebersetzt rohe Lieferanten-Variantentexte ins Deutsche.
 *
 *   node tools/varianten_deutsch.mjs --selbsttest
 *   node tools/varianten_deutsch.mjs "Red-FatherS" "Picture Color-Tong 2"
 *   node tools/varianten_deutsch.mjs --datei werte.txt     (Zeilen "id|Wert")
 *
 * WARUM (gemessen 2026-09-12): bei den Familien-Pyjamas steckt die GANZE Variantenmatrix in
 * einer einzigen Option namens "Farbe", mit Werten wie `Red-FatherS`, `Black-Mom 4XL`,
 * `Picture Color-Tong 2` oder `New Flower Deer-Xl For Father`. "Tong" ist chinesisch fuer
 * Kind, "Picture Color" heisst "wie abgebildet". Ein Schweizer Kunde soll daraus im
 * Farbwaehler auswaehlen. Von 250 geprueften Produkten hatten 11 solche Texte (4,4 %).
 *
 * HARTE SICHERHEITSREGEL: Groessen werden NIE veraendert. Wer aus "0XL" ein "XL" macht, laesst
 * Leute die falsche Groesse bestellen. Erlaubt ist einzig Gross-/Kleinschreibung ("Xl" → "XL").
 * Geprueft wird das nach jeder Uebersetzung vom Waechter `groessenUnveraendert`.
 *
 * WAS BEWUSST NICHT UEBERSETZT WIRD: Designnamen ("Vineyard", "Muwa Manor", "New Flower Deer")
 * und Lieferanten-Kennungen ("JJF106230color-"). Raten waere schlimmer als Englisch stehen zu
 * lassen — und eine Kennung wegzuwerfen wuerde zwei verschiedene Muster zum selben Namen machen.
 * Werte mit solcher Kennung meldet das Werkzeug als "nicht anfassen".
 */

/** Phrasen, laengste zuerst. Nur Eindeutiges — "Beige", "Pink", "Khaki", "Navy" sind im
 *  Deutschen ueblich und bleiben. */
const PHRASEN = [
  // Farben und Muster
  ['Picture Color', 'Wie abgebildet'], ['As Picture', 'Wie abgebildet'], ['As shown', 'Wie abgebildet'],
  ['Leopard Print Yellow', 'Leopardenmuster Gelb'], ['Navy Blue', 'Marineblau'],
  ['Striped Suit', 'Gestreift'], ['Rose Red', 'Rosarot'],
  ['Black', 'Schwarz'], ['White', 'Weiss'], ['Red', 'Rot'], ['Blue', 'Blau'],
  ['Green', 'Grün'], ['Yellow', 'Gelb'], ['Brown', 'Braun'], ['Purple', 'Lila'],
  ['Grey', 'Grau'], ['Gray', 'Grau'],
  // Traeger und Kleidungsstuecke im Familien-Set
  ['Grandmother', 'Grossmama'], ['Grandfather', 'Grosspapa'],
  ['Pet Clothes', 'Haustier-Kleidung'], ['Puppy Scarf', 'Hunde-Halstuch'],
  ["Mother's", 'Mama'], ["Children's", 'Kind'], ["Men's", 'Herren'], ["Women's", 'Damen'],
  ['Children', 'Kind'], ['Child', 'Kind'], ['Kids', 'Kind'], ['Kid', 'Kind'], ['Tong', 'Kind'],
  ['Father', 'Papa'], ['Dad', 'Papa'], ['Mother', 'Mama'], ['Mom', 'Mama'],
  ['Women', 'Damen'], ['Female', 'Damen'], ['Men', 'Herren'], ['Male', 'Herren'],
  ['Puppy', 'Hund'], ['Dog', 'Hund'],
  ['Romper', 'Strampler'], ['Bodysuit', 'Body'], ['Adult', 'Erwachsene'],
];
/** Woerter, die einen Traeger bezeichnen — nach der Uebersetzung. */
const TRAEGER_DE = new Set(['Papa', 'Mama', 'Kind', 'Baby', 'Hund', 'Herren', 'Damen',
  'Grossmama', 'Grosspapa', 'Erwachsene', 'Strampler', 'Body', 'Haustier-Kleidung', 'Hunde-Halstuch']);
/** Fuellwoerter der Lieferantentexte ("Xl For Father", "Mother's Size L"). */
const FUELLER = new Set(['for', 'size', 'für', 'the']);
/** Groessen-Kennungen. Was hier passt, wird NIE inhaltlich veraendert. */
const GROESSE = /^(?:\d?X{0,3}[SML]|\d+XL|X[SL]|\d{1,3}(?:T|Y|M|J)?|\d{1,3}\s?cm|\d{1,2}to\d{1,2}(?:T|Y)?|Einheitsgrösse)$/i;
/** Nur diese Groessen-Form darf in der Schreibweise vereinheitlicht werden (Xl → XL).
 *  BEWUSST ohne "Ziffer + einzelner Buchstabe": "6m" sind sechs MONATE, kein Groesse M.
 *  Die erste Fassung machte daraus "6M" und aus "12m" nichts — in derselben Liste. */
const BUCHSTABEN_GROESSE = /^(?:[SML]|X{1,3}[SL]|\d{1,2}X{1,2}L)$/i;
/** Lieferanten-Kennung: mindestens zwei Grossbuchstaben direkt vor mindestens vier Ziffern. */
const LIEFERANTEN_KENNUNG = /[A-Z]{2,}\d{4,}/;

export function hatLieferantenKennung(wert) {
  return LIEFERANTEN_KENNUNG.test(String(wert || ''));
}

/** Zusammengeklebtes trennen: "FatherS" → "Father S", "3XLFather" → "3XL Father",
 *  "Baby14" → "Baby 14". Ziffer-vor-Buchstabe bleibt unberuehrt, sonst wuerde aus "2XL" ein
 *  "2 XL". */
function entkleben(s) {
  return s
    .replace(/([a-zäöü])([A-ZÄÖÜ])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-zäöü])/g, '$1 $2')
    // Nur ein GANZES Wort vor einer Ziffer trennen. Ohne die Wortgrenze wurde aus dem
    // Altersbereich "3to4" ein "3to 4" (2026-09-12 vom Waechter gefangen).
    .replace(/\b([A-Za-zÄÖÜäöü]+)(\d)/g, '$1 $2');
}

function uebersetzeAbschnitt(roh) {
  // Lieferanten-Kennungen bleiben Zeichen fuer Zeichen stehen: sie unterscheiden zwei Muster
  // voneinander, und das Trennen von Buchstaben und Ziffern wuerde sie unkenntlich machen.
  if (LIEFERANTEN_KENNUNG.test(roh)) return roh.trim();
  let s = entkleben(roh);
  for (const [en, de] of PHRASEN) {
    const re = new RegExp('(^|[\\s/])' + en.replace(/'/g, "'") + '(?=$|[\\s/])', 'i');
    if (re.test(s)) s = s.replace(re, (_m, p1) => p1 + de);
  }
  // Schreibweise der Buchstaben-Groessen vereinheitlichen: "Xl" → "XL", "xxl" → "XXL"
  let teile = s.split(/\s+/).filter(Boolean)
    .map(t => BUCHSTABEN_GROESSE.test(t) ? t.toUpperCase() : t);

  // Umstellen: "S For Mother" / "Mother's Size L" / "2XL Father" → "Mama S" / "Mama L" / "Papa 2XL".
  // Nur wenn es genau EINEN Traeger und genau EINE Groesse gibt und sonst nur Fuellwoerter
  // uebrig bleiben — sonst bliebe Text auf der Strecke.
  const traeger = teile.filter(t => TRAEGER_DE.has(t));
  const groessen = teile.filter(t => GROESSE.test(t));
  const rest = teile.filter(t => !TRAEGER_DE.has(t) && !GROESSE.test(t));
  if (traeger.length === 1 && groessen.length === 1 && rest.every(t => FUELLER.has(t.toLowerCase()))) {
    teile = [traeger[0], groessen[0]];
  }
  return teile.join(' ');
}

export function uebersetze(wert) {
  if (!wert) return wert;
  const abschnitte = String(wert).split(/\s*-\s*/).map(uebersetzeAbschnitt).filter(Boolean);
  let s = abschnitte.join(' · ');
  s = s.replace(/(\d)\s*cm\b/gi, '$1 cm');           // "80cm" → "80 cm"
  return s.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Waechter: keine Groessen-Kennung darf sich inhaltlich geaendert haben.
 *
 * Warum nicht einfach beide Seiten in Wortteile schneiden und die Listen vergleichen: das
 * Werkzeug ergaenzt absichtlich ein fehlendes Leerzeichen ("Father0XL" → "Papa 0XL"). Dabei
 * wird die Groesse nicht veraendert, sondern erst sichtbar — der Listenvergleich meldete das
 * als Verfaelschung (gemessen 2026-09-12). Geprueft wird darum buchstabengenau in beide
 * Richtungen: jede Groesse im Ergebnis muss in der Quelle vorkommen, ohne dass ihr dort eine
 * Ziffer vorangeht oder eine Groessen-Kennung folgt (sonst waere aus "0XL" ein "XL"
 * geschnitten), und jede Groesse der Quelle muss im Ergebnis noch stehen.
 */
function groessenTeile(s) {
  return String(s).split(/[\s\-/·]+/).filter(t => GROESSE.test(t)).map(t => t.toUpperCase());
}
function kommtSauberVor(quelle, groesse) {
  const q = String(quelle).toUpperCase();
  for (let i = q.indexOf(groesse); i !== -1; i = q.indexOf(groesse, i + 1)) {
    const davor = i === 0 ? '' : q[i - 1];
    const danach = q[i + groesse.length] || '';
    if (/\d/.test(davor)) continue;                              // "XL" aus "0XL" geschnitten
    if (/\d/.test(danach)) continue;                             // "1" aus "14" geschnitten
    if (/X$/.test(groesse) && /[SML]/.test(danach)) continue;    // "2X" aus "2XL" geschnitten
    // Ein anderer Buchstabe danach gehoert zum naechsten Wort, nicht zur Groesse:
    // "2XL" in "2XLMom" ist die volle Groesse (2026-09-12 als Fehlalarm erkannt).
    return true;
  }
  return false;
}
/** "130cm" und "130 cm" sind dieselbe Groesse — das Leerzeichen setzt das Werkzeug absichtlich. */
function ohneCmLuecke(s) { return String(s).replace(/(\d)\s+cm\b/gi, '$1cm'); }
export function groessenUnveraendert(vorher, nachher) {
  const v = ohneCmLuecke(vorher), n = ohneCmLuecke(nachher);
  for (const g of groessenTeile(n)) if (!kommtSauberVor(v, g)) return false;
  for (const g of groessenTeile(v)) if (!String(n).toUpperCase().includes(g)) return false;
  return true;
}

/**
 * Prueft eine ganze Optionsliste: uebersetzt, laesst den Waechter laufen und schlaegt Alarm,
 * wenn zwei verschiedene Rohwerte auf denselben deutschen Text fallen wuerden (Shopify
 * lehnt doppelte Optionswerte ab — und der Kunde koennte die Varianten nicht unterscheiden).
 */
export function pruefeListe(paare) {
  const ergebnis = [];
  const probleme = [];
  const gesehen = new Map();
  for (const { id, name } of paare) {
    if (hatLieferantenKennung(name)) { probleme.push(`Lieferanten-Kennung, nicht anfassen: "${name}"`); continue; }
    const neu = uebersetze(name);
    if (!groessenUnveraendert(name, neu)) { probleme.push(`Groesse veraendert: "${name}" → "${neu}"`); continue; }
    if (gesehen.has(neu) && gesehen.get(neu) !== name) {
      probleme.push(`Doppelter Wert: "${gesehen.get(neu)}" und "${name}" ergeben beide "${neu}"`);
      continue;
    }
    gesehen.set(neu, name);
    if (neu !== name) ergebnis.push({ id, alt: name, neu });
  }
  return { ergebnis, probleme };
}

function selbsttest() {
  console.log('Selbsttest varianten_deutsch.mjs\n' + '-'.repeat(64));
  let fehler = 0;
  const pruefe = (ein, soll, was = '') => {
    const ist = uebersetze(ein);
    const ok = ist === soll;
    console.log(`  ${ok ? 'OK ' : 'FEHLER'} "${ein}" → "${ist}"${ok ? '' : `  (erwartet "${soll}")`}${was}`);
    fehler += ok ? 0 : 1;
  };
  // 1) Grundfaelle aus dem echten Bestand
  pruefe('Red-FatherS', 'Rot · Papa S');
  pruefe('Red-Mother M', 'Rot · Mama M');
  pruefe('Red-Children 2', 'Rot · Kind 2');
  pruefe('Red-Baby 3', 'Rot · Baby 3');
  pruefe('Red-Dog XXL', 'Rot · Hund XXL');
  pruefe('Black-Dad 2XL', 'Schwarz · Papa 2XL');
  pruefe('Picture Color-Father S', 'Wie abgebildet · Papa S');
  pruefe('Picture Color-Tong 2', 'Wie abgebildet · Kind 2');
  pruefe('Picture Color-Baby14', 'Wie abgebildet · Baby 14');
  pruefe('Red-Child2T', 'Rot · Kind 2T');
  pruefe('White-Puppy S', 'Weiss · Hund S');
  pruefe("Navy Blue-Children's 4T", 'Marineblau · Kind 4T');
  // 2) Umstellen: Groesse vor Traeger, Fuellwoerter
  pruefe('Picture Color-S For Mother', 'Wie abgebildet · Mama S');
  pruefe("Picture Color-Mother's Size L", 'Wie abgebildet · Mama L');
  pruefe('Picture Color-Father M Size', 'Wie abgebildet · Papa M');
  pruefe('Red-2XL Father', 'Rot · Papa 2XL');
  pruefe('Red-3XLFather', 'Rot · Papa 3XL');
  pruefe('Red-2XLMom', 'Rot · Mama 2XL');
  pruefe('Picture Color-Children 3to4', 'Wie abgebildet · Kind 3to4', '   (Altersbereich bleibt ganz)');
  pruefe('Striped Suit-Size M For Women', 'Gestreift · Damen M');
  pruefe("Striped Suit-Men's XXL", 'Gestreift · Herren XXL');
  pruefe('Red-Father Xl', 'Rot · Papa XL', '   (Schreibweise Xl → XL)');
  pruefe('Red-Mom xxl', 'Rot · Mama XXL');
  pruefe('Red-Baby6m', 'Rot · Baby 6m', '   (Monate bleiben klein)');
  pruefe('Red-Baby12m', 'Rot · Baby 12m');
  pruefe('Red-Baby3M', 'Rot · Baby 3M');
  // 3) Kleidungsstuecke und Masse
  pruefe('New Flower Deer-Puppy Scarf XL', 'New Flower Deer · Hunde-Halstuch XL');
  pruefe('JJF111889color-Pet Clothes L', 'JJF111889color · Haustier-Kleidung L');
  pruefe('Striped Suit-Bodysuit 50cm', 'Gestreift · Body 50 cm');
  pruefe('Vineyard Children-80cm', 'Vineyard Kind · 80 cm');
  pruefe('Vineyard Adult', 'Vineyard Erwachsene');
  // 4) Gegenproben: was schon deutsch oder unbekannt ist, bleibt
  pruefe('Schwarz / S', 'Schwarz / S');
  pruefe('Wie abgebildet', 'Wie abgebildet');
  pruefe('Beige', 'Beige');
  pruefe('Khaki', 'Khaki');
  pruefe('Einheitsgrösse', 'Einheitsgrösse');
  pruefe('110 cm', '110 cm');
  pruefe('Muwa Manor Adult', 'Muwa Manor Erwachsene');

  console.log('  ' + '-'.repeat(60));
  // 5) Die harte Regel: Groessen duerfen sich nie aendern
  const groessen = ['Red-Father0XL', 'Black-Mom 3XL', 'Picture Color-Children 14', 'Pink / 1XL',
    'Grün / XS', 'Striped Suit-Children 130cm', 'Green-Tong 10Y', 'White-Baby 90'];
  for (const g of groessen) {
    const n = uebersetze(g);
    const ok = groessenUnveraendert(g, n);
    console.log(`  ${ok ? 'OK ' : 'FEHLER'} Groessen unveraendert: "${g}" → "${n}"`);
    fehler += ok ? 0 : 1;
  }
  // 6) Gegenproben des Waechters: er MUSS ausschlagen
  const gegenproben = [
    ['Pink / 0XL', 'Pink / XL', 'Groesse verkuerzt (0XL → XL)'],
    ['Pink / XL', 'Pink / 2XL', 'Groesse aufgeblasen (XL → 2XL)'],
    ['Pink / 2XL', 'Pink', 'Groesse verschwunden'],
    ['Pink / M', 'Pink / L', 'Groesse getauscht (M → L)'],
    ['Kind 10Y', 'Kind 10T', 'Einheit getauscht (10Y → 10T)'],
    ['Kind 130cm', 'Kind 13 cm', 'Zentimeter verkuerzt (130cm → 13 cm)'],
    ['Mama 2XL', 'Mama 2X', 'Groesse angeschnitten (2XL → 2X)'],
    ['Kind 3to4', 'Kind 3to 4', 'Altersbereich zerrissen (3to4 → 3to 4)'],
  ];
  for (const [a, b, was] of gegenproben) {
    const schlaegtAus = !groessenUnveraendert(a, b);
    console.log(`  ${schlaegtAus ? 'OK ' : 'FEHLER'} Gegenprobe: Waechter erkennt ${was}`);
    fehler += schlaegtAus ? 0 : 1;
  }
  // 7) Listen-Pruefung: Doppelte und Lieferanten-Kennungen muessen auffallen
  const l1 = pruefeListe([{ id: 'a', name: 'Picture Color-Mother L' }, { id: 'b', name: "Picture Color-Mother's Size L" }]);
  const okDoppelt = l1.probleme.some(p => p.startsWith('Doppelter Wert'));
  console.log(`  ${okDoppelt ? 'OK ' : 'FEHLER'} Gegenprobe: zwei Rohwerte mit demselben Ergebnis fallen auf`);
  fehler += okDoppelt ? 0 : 1;
  const l2 = pruefeListe([{ id: 'a', name: 'JJF106230color-Dad 3XL' }]);
  const okKennung = l2.ergebnis.length === 0 && l2.probleme.length === 1;
  console.log(`  ${okKennung ? 'OK ' : 'FEHLER'} Gegenprobe: Lieferanten-Kennung wird nicht angefasst`);
  fehler += okKennung ? 0 : 1;
  const l3 = pruefeListe([{ id: 'a', name: 'Schwarz / S' }]);
  const okRuhe = l3.ergebnis.length === 0 && l3.probleme.length === 0;
  console.log(`  ${okRuhe ? 'OK ' : 'FEHLER'} Gegenprobe: ein schon deutscher Wert erzeugt keine Aenderung`);
  fehler += okRuhe ? 0 : 1;

  console.log('-'.repeat(64));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selbsttest')) process.exit(selbsttest());
  const i = argv.indexOf('--datei');
  if (i !== -1) {
    const paare = fs.readFileSync(argv[i + 1], 'utf8').split('\n').filter(z => z.includes('|'))
      .map(z => { const [id, ...r] = z.split('|'); return { id: id.trim(), name: r.join('|').trim() }; });
    const { ergebnis, probleme } = pruefeListe(paare);
    for (const p of probleme) console.log('  !! ' + p);
    console.log(JSON.stringify(ergebnis.map(e => ({ id: e.id, name: e.neu })), null, 0));
    console.error(`${ergebnis.length} von ${paare.length} Werten geaendert, ${probleme.length} Probleme`);
    for (const e of ergebnis) console.error(`   ${e.alt}  →  ${e.neu}`);
    process.exit(probleme.length ? 1 : 0);
  }
  for (const a of argv) console.log(`${a}  →  ${uebersetze(a)}`);
}
