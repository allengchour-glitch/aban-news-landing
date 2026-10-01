#!/usr/bin/env node
/**
 * preis_marge.mjs — rechnet die Rohmarge des Katalogs aus Verkaufspreis und Einkaufspreis.
 *
 *   node tools/preis_marge.mjs --selbsttest
 *   node tools/preis_marge.mjs [datei.csv]        Standard: dropship/preise-kosten-*.csv (neueste)
 *
 * WOHER DIE DATEN KOMMEN: `inventoryItem.unitCost` aus der Shopify-Admin-API, eingesammelt
 * ueber die Shopify-MCP (dieser Container hat keine Shopify-Zugangsdaten, ein Skript kann
 * also nicht selbst abrufen). Die CSV liegt in `dropship/` — dort greift weder der
 * Voice-Linter noch `build-pages.sh`.
 *
 * ⚠️ DREI GRENZEN, die in jeder Auswertung mitgesagt werden muessen:
 *  1. **Kein Einkaufspreis heisst UNBEKANNT, nicht 0.** Ein Produkt ohne `unitCost` als
 *     "100 % Marge" zu zaehlen erzeugt genau die Zahl, die niemand nachrechnet.
 *  2. **`unitCost` enthaelt den Versand NICHT.** Jede Marge hier ist eine Obergrenze; bei
 *     CJ-Kleinware liegt der Versand erfahrungsgemaess im Bereich weniger Franken, bei
 *     Sperrgut deutlich hoeher. Wer knapp ueber null liegt, verdient in Wirklichkeit nichts.
 *  3. **Die Waehrung wurde geprueft:** Shop und `unitCost` stehen beide in CHF
 *     (`shop.currencyCode` = CHF, `unitCost.currencyCode` = CHF, 2026-09-13 gemessen).
 *     Ohne diese Pruefung waere jede Rechnung wertlos.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Gutschein WELCOME10: der Shop verschenkt 10 % im Ankuendigungsband an jeden. */
export const GUTSCHEIN = 0.10;
/** Ab dieser Schwelle traegt der Shop den Versand. */
export const GRATIS_AB = 50;

/** CSV `sku,preis,kosten` → Datensaetze. Leeres Kostenfeld ⇒ kosten === null (unbekannt). */
export function lies(text) {
  return String(text).trim().split(/\r?\n/).slice(1)
    .filter(z => z.trim())
    .map(z => {
      const [sku, preis, kosten] = z.split(',');
      return {
        sku: (sku || '').trim(),
        preis: Number(preis),
        kosten: kosten === undefined || kosten.trim() === '' ? null : Number(kosten),
      };
    });
}

/**
 * Rohmarge in Prozent des Verkaufspreises. `null`, wenn der Einkaufspreis fehlt —
 * NICHT 0 und nicht 100.
 */
export function marge(d) {
  if (d.kosten === null || !Number.isFinite(d.kosten) || !d.preis) return null;
  return ((d.preis - d.kosten) / d.preis) * 100;
}

/** Dieselbe Rechnung, nachdem der Kunde WELCOME10 eingeloest hat. */
export function margeMitGutschein(d) {
  if (d.kosten === null || !Number.isFinite(d.kosten) || !d.preis) return null;
  const erloes = d.preis * (1 - GUTSCHEIN);
  return ((erloes - d.kosten) / erloes) * 100;
}

export function median(zahlen) {
  const s = [...zahlen].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function auswerten(daten) {
  const mitKosten = daten.filter(d => marge(d) !== null);
  const ohneKosten = daten.filter(d => marge(d) === null);
  const margen = mitKosten.map(marge);
  const mitGutschein = mitKosten.map(margeMitGutschein);

  const verlust = mitKosten.filter(d => d.kosten > d.preis);
  const verlustMitGutschein = mitKosten.filter(d => d.kosten > d.preis * (1 - GUTSCHEIN));
  const duenn = mitKosten.filter(d => { const m = marge(d); return m !== null && m >= 0 && m < 30; });

  // Nach Preisklasse getrennt — die entscheidende Frage ist nicht „wie hoch ist die Marge",
  // sondern „ab welchem Preis traegt sie ueberhaupt".
  const BAENDER = [[0, 20], [20, 30], [30, 40], [40, 50], [50, Infinity]];
  const baender = BAENDER.map(([von, bis]) => {
    const teil = mitKosten.filter(d => d.preis >= von && d.preis < bis);
    return {
      von, bis,
      anzahl: teil.length,
      median: median(teil.map(marge)),
      verlust: teil.filter(d => d.kosten > d.preis).length,
      unter30: teil.filter(d => { const m = marge(d); return m >= 0 && m < 30; }).length,
    };
  });

  return {
    baender,
    gesamt: daten.length,
    mit_kosten: mitKosten.length,
    ohne_kosten: ohneKosten.length,
    median_marge: median(margen),
    median_marge_gutschein: median(mitGutschein),
    verlust: verlust.map(d => ({ ...d, fehlbetrag: +(d.kosten - d.preis).toFixed(2) }))
      .sort((a, b) => b.fehlbetrag - a.fehlbetrag),
    verlust_mit_gutschein: verlustMitGutschein.length,
    duenn: duenn.map(d => ({ ...d, marge: +marge(d).toFixed(1) }))
      .sort((a, b) => a.marge - b.marge),
    unter_gratis_versand: daten.filter(d => d.preis < GRATIS_AB).length,
  };
}

function bericht(a) {
  const z = (v) => (v === null ? 'unbekannt' : v.toFixed(1) + ' %');
  const L = [];
  L.push(`Datensaetze: ${a.gesamt}  ·  mit Einkaufspreis ${a.mit_kosten}  ·  ohne ${a.ohne_kosten} (UNBEKANNT, nicht 0)`);
  L.push(`Median-Rohmarge: ${z(a.median_marge)}   ·   nach WELCOME10: ${z(a.median_marge_gutschein)}`);
  L.push(`Unter der Gratis-Versand-Schwelle (CHF ${GRATIS_AB}): ${a.unter_gratis_versand} von ${a.gesamt}`);
  L.push('');
  L.push('Nach Preisklasse (nur Produkte mit bekanntem Einkaufspreis):');
  for (const b of a.baender) {
    if (!b.anzahl) continue;
    const name = b.bis === Infinity ? `ab CHF ${b.von}` : `CHF ${b.von}–${b.bis}`;
    L.push(`   ${name.padEnd(14)} ${String(b.anzahl).padStart(3)} Produkte · Median ${z(b.median).padStart(7)}` +
      ` · Verlust ${b.verlust} · unter 30 % ${b.unter30}`);
  }
  L.push('');
  L.push(`🔴 Verkaufspreis UNTER Einkaufspreis: ${a.verlust.length}`);
  for (const d of a.verlust) {
    L.push(`   ${d.sku.padEnd(22)} VK ${d.preis.toFixed(2)}  EK ${d.kosten.toFixed(2)}  →  −${d.fehlbetrag.toFixed(2)} je Stueck`);
  }
  L.push(`🟠 Mit WELCOME10 unter dem Einkaufspreis: ${a.verlust_mit_gutschein}`);
  L.push('');
  L.push(`🟡 Rohmarge unter 30 % (Versand noch NICHT abgezogen): ${a.duenn.length}`);
  for (const d of a.duenn.slice(0, 20)) {
    L.push(`   ${d.sku.padEnd(22)} VK ${d.preis.toFixed(2)}  EK ${d.kosten.toFixed(2)}  →  ${d.marge.toFixed(1)} %`);
  }
  if (a.duenn.length > 20) L.push(`   … und ${a.duenn.length - 20} weitere`);
  return L.join('\n');
}

function selbsttest() {
  console.log('Selbsttest preis_marge.mjs\n' + '-'.repeat(64));
  let fehler = 0;
  const p = (ok, was) => { console.log(`  ${ok ? 'OK ' : 'FEHLER'} ${was}`); fehler += ok ? 0 : 1; };

  const d = lies('sku,preis,kosten\nA,40.00,20.00\nB,20.00,\nC,16.90,27.55\nD,10.00,10.00\n');
  p(d.length === 4, `vier Zeilen gelesen: ${d.length}`);
  p(d[1].kosten === null, 'leeres Kostenfeld wird null, nicht 0');
  p(marge(d[0]) === 50, `Marge gerechnet: ${marge(d[0])}`);
  p(marge(d[1]) === null, 'Gegenprobe: ohne Einkaufspreis gibt es KEINE Marge (nicht 100 %)');
  p(marge(d[3]) === 0, 'Einkauf gleich Verkauf ergibt genau 0 %, nicht "in Ordnung"');
  p(marge(d[2]) < 0, `Verkauf unter Einkauf ergibt eine negative Marge: ${marge(d[2]).toFixed(1)} %`);

  // Der Gutschein senkt den Erloes, nicht die Kosten.
  p(Math.abs(margeMitGutschein(d[0]) - 44.4) < 0.1,
    `WELCOME10 druckt die Marge von 50 % auf ${margeMitGutschein(d[0]).toFixed(1)} %`);
  p(margeMitGutschein(d[1]) === null, 'Gegenprobe: auch mit Gutschein bleibt Unbekanntes unbekannt');

  const a = auswerten(d);
  p(a.mit_kosten === 3 && a.ohne_kosten === 1, `gezaehlt: ${a.mit_kosten} mit / ${a.ohne_kosten} ohne`);
  p(a.verlust.length === 1 && a.verlust[0].sku === 'C', 'genau ein Verlustfall gefunden');
  p(Math.abs(a.verlust[0].fehlbetrag - 10.65) < 0.01, `Fehlbetrag: ${a.verlust[0].fehlbetrag}`);
  p(a.verlust_mit_gutschein === 2, `mit Gutschein sind es 2 statt 1: ${a.verlust_mit_gutschein}`);
  p(a.duenn.length === 1 && a.duenn[0].sku === 'D', 'die 0-%-Zeile zaehlt als duenn, die negative NICHT doppelt');
  p(a.median_marge === 0, `Median ueber 50/0/−63: ${a.median_marge}`);
  p(a.unter_gratis_versand === 4, 'alle vier liegen unter CHF 50');

  const b = auswerten(lies('sku,preis,kosten\nA,15.00,14.00\nB,45.00,15.00\nC,15.00,20.00\n'));
  const b0 = b.baender.find(x => x.von === 0), b40 = b.baender.find(x => x.von === 40);
  p(b0.anzahl === 2 && b40.anzahl === 1, `Preisklassen getrennt: ${b0.anzahl} unter 20, ${b40.anzahl} bei 40–50`);
  p(b0.verlust === 1 && b40.verlust === 0, 'der Verlustfall liegt in der richtigen Klasse');
  p(b.baender.find(x => x.von === 20).anzahl === 0 &&
    b.baender.find(x => x.von === 20).median === null,
    'Gegenprobe: eine leere Preisklasse behauptet keinen Median');

  const leer = auswerten(lies('sku,preis,kosten\n'));
  p(leer.gesamt === 0 && leer.median_marge === null,
    'Gegenprobe: ohne Daten wird KEIN Median behauptet');
  const nurOhne = auswerten(lies('sku,preis,kosten\nX,20.00,\nY,30.00,\n'));
  p(nurOhne.mit_kosten === 0 && nurOhne.median_marge === null && nurOhne.verlust.length === 0,
    'Gegenprobe: nur unbekannte Kosten ergeben keine einzige Aussage ueber Margen');

  console.log('-'.repeat(64));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

function neuesteDatei() {
  const dir = 'dropship';
  const treffer = readdirSync(dir).filter(f => /^preise-kosten-.*\.csv$/.test(f)).sort();
  if (!treffer.length) throw new Error('keine dropship/preise-kosten-*.csv gefunden');
  return join(dir, treffer[treffer.length - 1]);
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selbsttest')) process.exit(selbsttest());
  const datei = argv.find(a => !a.startsWith('--')) || neuesteDatei();
  const a = auswerten(lies(readFileSync(datei, 'utf8')));
  console.log(`Quelle: ${datei}\n${'='.repeat(64)}`);
  console.log(bericht(a));
  console.log('\n⚠️ Der Versand ist in `unitCost` NICHT enthalten — jede Marge hier ist eine Obergrenze.');
}
