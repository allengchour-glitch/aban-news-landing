// Katalogfenster «Selbst gestalten»: EIN gemeinsamer Stand aus zwei fertigen Paketen (Stand 06.11.2026, nichts davon live):
//   (A) katalog-nur-bestellbar-0511  «nur bestellbare anzeigen»        (patches.mjs, wird IMPORTIERT, nicht kopiert; Marke LX-NURBESTELLBAR-0511)
//   (B) katalog-texte-de-0611        «Schweizer Masse, kein Englisch»   (patch_bauen.py, als Datenstruktur in texte_ersetzungen.mjs; Marke LX-KATALOGTEXTE-0511)
// Beide ändern assets/luxe-clothing.js, sections/luxe-clothing.liquid, locales/de.json und locales/en.default.json aus demselben Ausgangsstand
// (gleiche MD5 wie in MD5_VOR). Wer zuerst schreibt, ändert die Prüfsumme, der zweite bricht ab: darum ein Stand, ein Einspielschritt.
//
// Reihenfolge: (A) anwenden() auf die neun Live-Dateien, danach die 22 verankerten Ersetzungen von (B) auf das Ergebnis; jede muss GENAU EINMAL
// vorkommen, sonst Abbruch mit Dateiname, laufender Nummer und Anfang des Ankers. Eine Ersetzung von (B) trifft nach (A) nicht mehr: die Zeile
// mit t('original_variants',…) (siehe KOLLISION unten). Alles andere passt unverändert.
// Neue Dateien (drei): assets/luxe-clothing-ausblenden.json, assets/luxe-clothing-variantenkarte.json (beide (A)) und assets/luxe-clothing-texts-de.json ((B)).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as A from '../katalog-nur-bestellbar-0511/patches.mjs';
import { TEXTE_PAARE, TEXTE_SCHLUESSEL } from './texte_ersetzungen.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const A_ORDNER = HIER + '../katalog-nur-bestellbar-0511/';
const B_ORDNER = HIER + '../katalog-texte-de-0611/';
const md5 = (s) => createHash('md5').update(s).digest('hex');

export const DATEIEN = A.DATEIEN;
export const NEUE_DATEIEN = { ...A.NEUE_DATEIEN, TEXTE: 'assets/luxe-clothing-texts-de.json' };
export const MD5_VOR = A.MD5_VOR;
export const MARKE = A.MARKE;
export const MARKE_TEXTE = 'LX-KATALOGTEXTE-0511';
export const MARKEN = [MARKE, MARKE_TEXTE];
export { ausblendenText } from '../katalog-nur-bestellbar-0511/patches.mjs';

// Pinnen der drei Datenquellen: eine Quelle, die sich seit dem Bau und Test geändert hat, darf nie unbemerkt eingespielt werden.
export const DATEN_MD5 = {
  ausblenden: 'a39d55ad8ae5835175a97e260198e7e6', // katalog-nur-bestellbar-0511/daten/ausblenden-quelle.json
  karte: '5790968bda235f40049578e0471e9899',      // katalog-nur-bestellbar-0511/daten/variantenkarte.json
  texte: '86cbb8664cddc2e10a3ead2297bc9482',      // katalog-texte-de-0611/luxe-clothing-texts-de.json (unverändert übernommen)
};
export function lesenDaten() {
  const roh = {
    ausblenden: readFileSync(A_ORDNER + 'daten/ausblenden-quelle.json', 'utf8'),
    karte: readFileSync(A_ORDNER + 'daten/variantenkarte.json', 'utf8'),
    texte: readFileSync(B_ORDNER + 'luxe-clothing-texts-de.json', 'utf8'),
  };
  for (const k of Object.keys(roh)) if (md5(roh[k]) !== DATEN_MD5[k]) throw new Error(`Datenquelle «${k}» hat nicht die erwartete Prüfsumme (ist ${md5(roh[k])}, erwartet ${DATEN_MD5[k]}): seit dem Test verändert`);
  return { ausblenden: JSON.parse(roh.ausblenden), karte: roh.karte, texte: roh.texte };
}

// Sprachschlüssel beider Pakete (de/en: (A) und (B), fr: nur (A))
export const TEXTE = { de: { ...A.TEXTE.de, ...TEXTE_SCHLUESSEL.de }, en: { ...A.TEXTE.en, ...TEXTE_SCHLUESSEL.en }, fr: { ...A.TEXTE.fr } };
export const NEUE_SCHLUESSEL_A = A.NEUE_SCHLUESSEL;
export const NEUE_SCHLUESSEL_B = Object.keys(TEXTE_SCHLUESSEL.de);
export const NEUE_SCHLUESSEL = [...NEUE_SCHLUESSEL_A, ...NEUE_SCHLUESSEL_B];

// ---------- Die eine echte Textkollision ----------
// (B) ersetzt in der Detailansicht die Zeile «N Originalvarianten aus dem Herstellerkatalog» durch Einzahl/Mehrzahl über 'original_variants(_one)'.
// (A) hat dieselbe Stelle schon umgebaut: sie zählt jetzt nur BESTELLBARE Ausführungen (variantsFor filtert, `variants` ist die Liste der bestellbaren)
// und hat die Einzahl «1 bestellbare Ausführung» ('orderable_variants_one'). Der Anker von (B) kommt nach (A) nicht mehr vor.
// Gemeinsame Fassung = die Zeile von (A) (Zahl der bestellbaren Ausführungen, Einzahl bei genau einer, de/en/fr über die Schlüssel von (A), kein
// Zoll, kein oz: es steht nur eine Anzahl darin), mit einem Kommentar, der beide Pakete nennt. Die Schlüssel 'original_variants_one' von (B)
// bleiben in Sprachdateien und Sektion stehen (harmlos, ungenutzt), damit alle anderen Ersetzungen von (B) unverändert bleiben.
export const KOLLISION = {
  datei: A.DATEIEN.JS,
  b_anker: "const count=el('p','lcl-small',t('original_variants',{count:variants.length}));",
  a_stand: "const count=el('p','lcl-small',(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* " + A.MARKE + " */,{count:variants.length})));",
  gemeinsam: "const count=el('p','lcl-small',(variants.length===1?t('orderable_variants_one'):t('orderable_variants'/* " + A.MARKE + " */,{count:variants.length}))/* " + MARKE_TEXTE + ": gemeinsame Zeile mit " + A.MARKE + ": nur bestellbare Ausführungen, Einzahl bei einer */);",
};

const zaehle = (text, teil) => text.split(teil).length - 1;
function einmal(text, alt, neu, name) {
  const n = zaehle(text, alt);
  if (n !== 1) throw new Error(`Ersetzung «${name}» kommt ${n}× vor (erwartet genau 1): «${alt.slice(0, 70).replace(/\n/g, '\\n')}»`);
  return text.split(alt).join(neu); // split/join statt replace: ein «$» im Ersatztext bleibt erhalten
}

// Der Teil von (B): die 22 verankerten Ersetzungen auf das Ergebnis von (A) (out wird verändert und zurückgegeben); jede muss genau einmal vorkommen.
export function anwendenTexte(out) {
  for (const p of TEXTE_PAARE) {
    const name = `${p.datei} Nr. ${p.nr}`;
    if (typeof out[p.datei] !== 'string') throw new Error(`Ersetzung «${name}»: Datei fehlt im Ergebnis von (A)`);
    if (p.datei === KOLLISION.datei && p.alt === KOLLISION.b_anker) {
      if (zaehle(out[p.datei], KOLLISION.b_anker) !== 0) throw new Error(`Kollision «${name}»: der Anker von (B) kommt nach (A) noch vor; die Kollision ist nicht mehr die erwartete, KOLLISION prüfen`);
      out[p.datei] = einmal(out[p.datei], KOLLISION.a_stand, KOLLISION.gemeinsam, name + ' (gemeinsame Fassung)');
      continue;
    }
    out[p.datei] = einmal(out[p.datei], p.alt, p.neu, name);
  }
  if (!TEXTE_PAARE.some((p) => p.datei === KOLLISION.datei && p.alt === KOLLISION.b_anker)) throw new Error('Die Ersetzung der Kollision fehlt in texte_ersetzungen.mjs (Anker von (B) geändert?)');
  return out;
}

// dateien: {Dateiname: Text} der neun Live-Dateien (Ausgangsstand); daten: {ausblenden: Objekt, karte: Text, texte: Text} (lesenDaten())
// Rückgabe: {Dateiname: neuer Text} für die neun geänderten UND die drei neuen Dateien
export function anwendenKombi(dateien, daten) {
  if (typeof daten.texte !== 'string' || !daten.texte) throw new Error('daten.texte fehlt (Text der Datei luxe-clothing-texts-de.json)');
  for (const f of Object.values(DATEIEN)) if (typeof dateien[f] === 'string' && dateien[f].includes(MARKE_TEXTE)) throw new Error(`Datei ${f} trägt die Marke ${MARKE_TEXTE} schon (Texte-Paket schon eingespielt)`);
  const out = A.anwenden(dateien, daten); // wirft selbst, wenn (A) schon eingespielt ist oder ein Anker nicht genau einmal vorkommt
  anwendenTexte(out);
  out[NEUE_DATEIEN.TEXTE] = daten.texte;
  return out;
}
