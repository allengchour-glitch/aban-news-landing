#!/usr/bin/env node
/**
 * varianten_preis.mjs — misst die Marge je PRODUKT ueber ALLE seine Varianten.
 *
 *   node tools/varianten_preis.mjs --selbsttest
 *   node tools/varianten_preis.mjs dropship/preise-varianten-*.csv
 *
 * WARUM ES DIESES GERAET GIBT (die Luecke von `tools/preis_marge.mjs`):
 * `preis_marge.mjs` liest eine Zeile JE PRODUKT — den Einkaufspreis der ERSTEN Variante.
 * Bei Kleidern und Schuhen steigt `unitCost` aber mit der Groesse: die erste Variante ist
 * fast immer die BILLIGSTE. Ein Produkt, das in Groesse S 40 % Marge hat und in 3XL unter
 * dem Einkaufspreis liegt, sieht dort gesund aus. Dieses Geraet rechnet deshalb mit
 * `kosten_max` gegen `preis_min` — also mit der schlechtesten Variante, die ein Kunde
 * tatsaechlich kaufen kann.
 *
 * DATENFORMAT (eine Zeile je Produkt):
 *   produkt,preis_min,preis_max,kosten_min,kosten_max,varianten
 * Leere Kostenfelder heissen UNBEKANNT — nicht 0 und nicht 100 % Marge.
 *
 * ⚠️ GRENZEN, die in jeder Auswertung mitzusagen sind:
 *  1. `unitCost` enthaelt den Versand NICHT. Jede Marge hier ist eine Obergrenze.
 *  2. Die Stichprobe ist eine Stichprobe. `productsCount` deckelt bei 10000 und liefert
 *     mit und ohne Statusfilter dieselbe Zahl — die wahre Zahl aktiver Produkte ist
 *     unbekannt, also darf aus einem Prozentsatz keine Katalogzahl hochgerechnet werden.
 *  3. Waehrung geprueft: Shop CHF, `unitCost` CHF (2026-09-13 gemessen).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Gutschein WELCOME10 — steht im Klartext im Ankuendigungsband, also nimmt ihn jeder mit. */
export const GUTSCHEIN = 0.10;
/** Zielmarge NACH dem Gutschein. Unter diesem Wert traegt der Versand den Rest auf. */
export const ZIEL_NACH_GUTSCHEIN = 0.38;

const zahl = (s) => (s === undefined || String(s).trim() === '' ? null : Number(s));

/** CSV → Datensaetze. Kopfzeile wird uebersprungen, Leerzeilen fallen raus. */
export function lies(text) {
  return String(text).trim().split(/\r?\n/).slice(1)
    .filter((z) => z.trim())
    .map((z) => {
      const [produkt, pMin, pMax, kMin, kMax, varianten] = z.split(',');
      return {
        produkt: (produkt || '').trim(),
        preis_min: zahl(pMin),
        preis_max: zahl(pMax),
        kosten_min: zahl(kMin),
        kosten_max: zahl(kMax),
        varianten: zahl(varianten) ?? 1,
      };
    });
}

/**
 * Schlechteste Rohmarge, die ein Kunde tatsaechlich erwischen kann:
 * guenstigste Variante gegen teuersten Einkauf. `null`, wenn kein Einkaufspreis bekannt ist.
 */
export function margeSchlimmst(d) {
  if (d.kosten_max === null || !Number.isFinite(d.kosten_max) || !d.preis_min) return null;
  return ((d.preis_min - d.kosten_max) / d.preis_min) * 100;
}

/** Beste Rohmarge — genau die Zahl, die eine Messung je Produkt faelschlich meldet. */
export function margeBest(d) {
  if (d.kosten_min === null || !Number.isFinite(d.kosten_min) || !d.preis_max) return null;
  return ((d.preis_max - d.kosten_min) / d.preis_max) * 100;
}

/** Schlechteste Marge, nachdem der Kunde WELCOME10 eingeloest hat. */
export function margeSchlimmstMitGutschein(d) {
  if (d.kosten_max === null || !Number.isFinite(d.kosten_max) || !d.preis_min) return null;
  const erloes = d.preis_min * (1 - GUTSCHEIN);
  return ((erloes - d.kosten_max) / erloes) * 100;
}

/** Mindestens eine kaufbare Variante liegt unter dem Einkaufspreis. */
export function istVerlust(d) {
  const m = margeSchlimmst(d);
  return m !== null && m < 0;
}

/**
 * DER BLINDE FLECK: die erste Variante sieht gesund aus, eine spaetere macht Verlust.
 * Genau diese Klasse meldet eine Messung mit einer Zeile je Produkt als "in Ordnung".
 */
export function nurTeilVerlust(d) {
  const schlimm = margeSchlimmst(d);
  const gut = margeBest(d);
  return schlimm !== null && gut !== null && schlimm < 0 && gut > 0;
}

/**
 * Gleiche Ware, verschiedene Preise: die Preisspanne hat keinen Grund im Einkauf.
 * Nur dann ein Befund — unterschiedliche Einkaufspreise rechtfertigen Preisstufen.
 */
export function preisSpanneOhneKostengrund(d) {
  if (d.preis_min === null || d.preis_max === null) return false;
  if (d.preis_max <= d.preis_min) return false;
  if (d.kosten_min === null || d.kosten_max === null) return false;
  return d.kosten_min === d.kosten_max;
}

/** Hauseigene Preisleiter: 9.90, 14.90, 19.90, … — der Shop nutzt keine anderen Endungen. */
export function preisLeiter(bis = 300) {
  const leiter = [];
  for (let p = 9.9; p <= bis; p += 5) leiter.push(Math.round(p * 100) / 100);
  return leiter;
}

/**
 * Kleinster Preis auf der Leiter, bei dem NACH dem Gutschein noch die Zielmarge bleibt.
 * `null` bei unbekanntem Einkaufspreis — ein Zielpreis ohne Kostenbasis waere geraten.
 */
export function zielpreis(kosten, ziel = ZIEL_NACH_GUTSCHEIN) {
  if (kosten === null || !Number.isFinite(kosten) || kosten <= 0) return null;
  const noetig = kosten / ((1 - GUTSCHEIN) * (1 - ziel));
  return preisLeiter(Math.max(300, noetig + 10)).find((p) => p >= noetig) ?? null;
}

/** Median. Eine leere Liste hat keinen Median — dann `null`, nicht 0. */
export function median(werte) {
  const w = werte.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!w.length) return null;
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
}

/** Produkte, die doppelt in derselben Datei stehen — sonst zaehlt die Statistik sie zweimal. */
export function doppelte(saetze) {
  const zaehler = new Map();
  for (const d of saetze) zaehler.set(d.produkt, (zaehler.get(d.produkt) || 0) + 1);
  return [...zaehler.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

export function auswertung(saetze) {
  const mitKosten = saetze.filter((d) => d.kosten_max !== null);
  return {
    produkte: saetze.length,
    mit_kosten: mitKosten.length,
    ohne_kosten: saetze.length - mitKosten.length,
    doppelte: doppelte(saetze),
    median_schlimmst: median(saetze.map(margeSchlimmst)),
    median_best: median(saetze.map(margeBest)),
    verlust: saetze.filter(istVerlust),
    nur_teil_verlust: saetze.filter(nurTeilVerlust),
    unter_ziel: mitKosten.filter((d) => {
      const m = margeSchlimmstMitGutschein(d);
      return m !== null && m >= 0 && m < ZIEL_NACH_GUTSCHEIN * 100;
    }),
    preisspanne_ohne_grund: saetze.filter(preisSpanneOhneKostengrund),
  };
}

/* ------------------------------- Selbsttest ------------------------------- */

function selbsttest() {
  let ok = 0; const fehler = [];
  const pruefe = (name, bedingung) => { if (bedingung) ok++; else fehler.push(name); };
  const p = (o) => ({ produkt: 'x', preis_min: null, preis_max: null, kosten_min: null, kosten_max: null, varianten: 1, ...o });

  // --- Grundrechnung
  pruefe('Marge 50 % bei 20.00 aus 10.00',
    margeSchlimmst(p({ preis_min: 20, preis_max: 20, kosten_min: 10, kosten_max: 10 })) === 50);
  pruefe('EK = VK ergibt GENAU 0, nicht "fast gut"',
    margeSchlimmst(p({ preis_min: 15, preis_max: 15, kosten_min: 15, kosten_max: 15 })) === 0);
  pruefe('Verlust wird negativ, nicht 0',
    margeSchlimmst(p({ preis_min: 10, preis_max: 10, kosten_min: 20, kosten_max: 20 })) < 0);

  // --- Gegenprobe: Unbekannt bleibt unbekannt
  pruefe('ohne Einkaufspreis ist die Marge UNBEKANNT (null), nicht 100 %',
    margeSchlimmst(p({ preis_min: 20, preis_max: 20 })) === null);
  pruefe('ohne Einkaufspreis auch kein Zielpreis', zielpreis(null) === null);
  pruefe('Einkaufspreis 0 ergibt keinen Zielpreis statt "unendlich Marge"', zielpreis(0) === null);

  // --- DER BLINDE FLECK, um den es hier geht
  const zweiseitig = p({ preis_min: 17.9, preis_max: 17.9, kosten_min: 9.8, kosten_max: 18.5 });
  pruefe('erste Variante sieht gesund aus', margeBest(zweiseitig) > 40);
  pruefe('letzte Variante macht Verlust', margeSchlimmst(zweiseitig) < 0);
  pruefe('genau das meldet nurTeilVerlust', nurTeilVerlust(zweiseitig) === true);
  pruefe('ein durchweg gesundes Produkt meldet es NICHT',
    nurTeilVerlust(p({ preis_min: 30, preis_max: 30, kosten_min: 10, kosten_max: 12 })) === false);
  pruefe('ein durchweg verlustiges Produkt ist kein TEIL-Verlust',
    nurTeilVerlust(p({ preis_min: 10, preis_max: 10, kosten_min: 12, kosten_max: 14 })) === false);

  // --- Preisspanne nur dann melden, wenn sie keinen Grund im Einkauf hat
  pruefe('gleiche Ware, verschiedene Preise wird gemeldet',
    preisSpanneOhneKostengrund(p({ preis_min: 14.9, preis_max: 51.9, kosten_min: 16.92, kosten_max: 16.92 })) === true);
  pruefe('verschiedene Einkaufspreise rechtfertigen Preisstufen — kein Befund',
    preisSpanneOhneKostengrund(p({ preis_min: 21.9, preis_max: 22.9, kosten_min: 17, kosten_max: 20 })) === false);
  pruefe('ein einziger Preis ist nie eine Spanne',
    preisSpanneOhneKostengrund(p({ preis_min: 20, preis_max: 20, kosten_min: 5, kosten_max: 5 })) === false);

  // --- Gutschein senkt den Erloes, er senkt nicht die Kosten
  const g = p({ preis_min: 20, preis_max: 20, kosten_min: 10, kosten_max: 10 });
  pruefe('mit Gutschein ist die Marge kleiner als ohne', margeSchlimmstMitGutschein(g) < margeSchlimmst(g));
  pruefe('und zwar genau (18-10)/18', Math.abs(margeSchlimmstMitGutschein(g) - ((18 - 10) / 18) * 100) < 1e-9);

  // --- Die Preisleiter reproduziert die sieben Entscheidungen vom 2026-09-13
  const gestern = [[27.55, 49.9], [28.79, 54.9], [41.0, 74.9], [20.17, 39.9], [20.84, 39.9], [20.37, 39.9], [16.92, 34.9]];
  pruefe('Zielpreis-Regel trifft alle 7 Preise vom Vortag',
    gestern.every(([ek, soll]) => zielpreis(ek) === soll));
  pruefe('Leiter kennt nur .90-Endungen', preisLeiter(60).every((x) => Math.abs((x * 100) % 500 - 490) < 1e-6));

  // --- Median und Doppelte
  pruefe('leere Liste hat KEINEN Median (null, nicht 0)', median([]) === null);
  pruefe('Median ignoriert unbekannte Werte', median([null, 10, 20, 30, null]) === 20);
  pruefe('doppelte Produkt-IDs werden gefunden',
    doppelte([p({ produkt: 'a' }), p({ produkt: 'b' }), p({ produkt: 'a' })]).join() === 'a');
  pruefe('ohne Doppelte meldet es keine', doppelte([p({ produkt: 'a' }), p({ produkt: 'b' })]).length === 0);

  // --- Lesen
  const gelesen = lies('produkt,preis_min,preis_max,kosten_min,kosten_max,varianten\n1,15.90,15.90,,,3\n');
  pruefe('leeres Kostenfeld wird null', gelesen[0].kosten_max === null);
  pruefe('Variantenzahl wird gelesen', gelesen[0].varianten === 3);

  console.log(`${ok} Pruefungen bestanden, ${fehler.length} gescheitert`);
  for (const f of fehler) console.log('  ✗ ' + f);
  return fehler.length === 0;
}

/* --------------------------------- Bericht -------------------------------- */

function neuesteDatei() {
  const dir = 'dropship';
  const treffer = readdirSync(dir).filter((f) => /^preise-varianten-.*\.csv$/.test(f)).sort();
  if (!treffer.length) throw new Error('Keine dropship/preise-varianten-*.csv gefunden.');
  return join(dir, treffer[treffer.length - 1]);
}

function bericht(datei) {
  const saetze = lies(readFileSync(datei, 'utf8'));
  const a = auswertung(saetze);
  const pz = (x) => (x === null ? 'unbekannt' : x.toFixed(1) + ' %');

  console.log(`\nDatei: ${datei}`);
  console.log(`Produkte: ${a.produkte} · mit Einkaufspreis ${a.mit_kosten} · ohne ${a.ohne_kosten} (UNBEKANNT, nicht 0)`);
  if (a.doppelte.length) console.log(`⚠️ doppelt in dieser Datei: ${a.doppelte.join(', ')}`);
  console.log(`Median-Rohmarge schlechteste Variante: ${pz(a.median_schlimmst)}`);
  console.log(`Median-Rohmarge beste Variante (so misst eine Zeile je Produkt): ${pz(a.median_best)}`);
  console.log(`🔴 mindestens eine Variante unter dem Einkaufspreis: ${a.verlust.length}`);
  console.log(`   davon von einer Messung je Produkt NICHT gefunden: ${a.nur_teil_verlust.length}`);
  console.log(`🟡 nach WELCOME10 unter ${ZIEL_NACH_GUTSCHEIN * 100} % Rohmarge (Versand noch nicht abgezogen): ${a.unter_ziel.length}`);
  console.log(`⚠️ gleiche Ware, verschiedene Preise ohne Kostengrund: ${a.preisspanne_ohne_grund.length}`);

  if (a.verlust.length) {
    console.log('\nVerlustfaelle (Produkt · guenstigster Preis · teuerster Einkauf · Marge · Zielpreis):');
    for (const d of a.verlust.sort((x, y) => margeSchlimmst(x) - margeSchlimmst(y))) {
      console.log(`  ${d.produkt}  ${d.preis_min.toFixed(2)}  EK ${d.kosten_max.toFixed(2)}  ${pz(margeSchlimmst(d))}  → ${zielpreis(d.kosten_max)?.toFixed(2) ?? '—'}  (${d.varianten} Var.)`);
    }
  }
}

// Nur ausfuehren, wenn die Datei direkt aufgerufen wird. Ohne diese Schranke laeuft der
// Bericht auch dann, wenn ein anderes Skript nur `zielpreis` importieren will.
const direktAufgerufen = process.argv[1] && process.argv[1].endsWith('varianten_preis.mjs');
if (direktAufgerufen) {
  const arg = process.argv[2];
  if (arg === '--selbsttest') process.exit(selbsttest() ? 0 : 1);
  else bericht(arg || neuesteDatei());
}
