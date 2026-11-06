// Tests für die Preisformel «Selbst gestalten» (kein Netz). Lauf: /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel_test.mjs
// Jedes Beispiel ist unten VON HAND gerechnet (in Rappen); die Zahlen stehen in den Kommentaren, nicht aus dem Code abgeleitet.
// Die Gegenprobe liest preise_gegenprobe.json: 334 echte Varianten der 37 Printful-Produkte (Shop-Preis, Printful-Katalogpreis, Printful-Versand CH, Schätzung), gemessen 05.11.2026.
import { readFileSync } from 'node:fs';
import { REGEL, usdZuRp, gebuehrRp, kostenRp, nettoRp, kostenpreisRp, richtwertRp, aufpreisAufgerechnetRp, aufpreisChf, aufX90Rp, abrechnungsEk, endpreis, pruefePreis, chfVonRp } from './preisformel.mjs';
import { endpreis as endpreisAlt } from '../../../automation/lib/pod_preise.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const wirft = (n, f, teil) => { let m = ''; try { f(); } catch (e) { m = String(e.message); } ist(n, m.includes(teil), true); };
const nah = (n, a, b, tol = 0.011) => ist(n, Math.abs(a - b) <= tol, true) || (Math.abs(a - b) > tol && console.log(`   (ist ${a}, soll ${b})`));
const kurz = (r) => [r.preisChf, r.mindestpreisChf, r.bindend, r.nettoChf];

// ── Konstanten (Setzungen und Messwerte, siehe Kopf von preisformel.mjs)
ist('Konstanten der Regel', [REGEL.kurs, REGEL.kursMess, REGEL.mwst, REGEL.gebuehrProzent, REGEL.gebuehrFix, REGEL.nettoMin, REGEL.faktor, REGEL.aufschlagFix, REGEL.kundenVersandAnrechnen, REGEL.gratisAb],
  [0.90, 0.82435, 0.081, 0.034, 0.30, 4, 2.3, 12, 0, 50]);
wirft('Regel ist eingefroren', () => { 'use strict'; REGEL.kurs = 1; }, 'read only');

// ── Bausteine
ist('USD → Rappen: 11.92 × 0.90 = 10.728 → 1073', usdZuRp(11.92), 1073);
ist('USD → Rappen: 10.39 × 0.90 = 9.351 → 935', usdZuRp(10.39), 935);
ist('USD → Rappen: 5.95 × 0.90 = 5.355 → 536 (Gleichstand .5 rundet auf)', usdZuRp(5.95), 536);
ist('USD → Rappen: 1.15 × 0.90 = 1.035 → 104 (Gleitkomma liefert 103.4999…, die Rundung muss .5 aufrunden)', usdZuRp(1.15), 104);
ist('USD → Rappen: 0 ist erlaubt (kein Aufpreis)', usdZuRp(0), 0);
ist('USD → Rappen mit Messkurs: 10.00 × 0.82435 = 8.2435 → 824', usdZuRp(10, REGEL.kursMess), 824);
ist('Gebühr auf 2790 Rp: round(94.86) + 30 = 125', gebuehrRp(2790), 125);
ist('Gebühr auf 1690 Rp: round(57.46) + 30 = 87', gebuehrRp(1690), 87);
ist('Kosten T-Shirt S: 1073 + 935 = 2008', kostenRp({ ekUsd: 11.92, versandUsd: 10.39 }), 2008);
ist('Kosten mit Rückseite: 2008 + 536 = 2544', kostenRp({ ekUsd: 11.92, versandUsd: 10.39, aufpreisUsd: 5.95 }), 2544);
// Netto bei P = 2790, Kosten 2008: 2790/1.081 = 2580.94 − 125 − 2008 = 447.94
nah('Netto 2790 Rp, Kosten 2008: 447.94 Rp', nettoRp(2790, 2008), 447.94, 0.01);
// Kostenpreis: kleinstes P mit Netto ≥ 400. P=2736: 2530.99 − 123 − 2008 = 399.99 ✗ · P=2737: 2531.92 − 123 − 2008 = 400.92 ✓
ist('Kostenpreis bei Kosten 2008: 2737', kostenpreisRp(2008), 2737);
// Kosten 1051 (Magnet): P=1662: 1537.46 − 87 − 1051 = 399.46 ✗ · P=1663: 1538.39 − 87 − 1051 = 400.39 ✓
ist('Kostenpreis bei Kosten 1051: 1663', kostenpreisRp(1051), 1663);
nah('Richtwert 1073 Rp (11.92 USD): max(1073 × 2.3 = 2467.9, 1073 + 1200 = 2273) = 2467.9', richtwertRp({ ekUsd: 11.92 }), 2467.9, 0.001);
ist('Richtwert 305 Rp (3.39 USD): max(701.5, 305 + 1200 = 1505) = 1505', richtwertRp({ ekUsd: 3.39 }), 1505);
ist('Aufrunden auf X.90: 2737 → 2790', aufX90Rp(2737), 2790);
ist('Aufrunden auf X.90: 2790 bleibt', aufX90Rp(2790), 2790);
ist('Aufrunden auf X.90: 2791 → 2890', aufX90Rp(2791), 2890);
ist('Aufrunden auf X.90: 10338.5 → 10390', aufX90Rp(10338.5), 10390);
ist('Aufrunden auf X.90: 0 → 90 (nie unter 0.90)', aufX90Rp(0), 90);
ist('chfVonRp(2790) = 27.9', chfVonRp(2790), 27.9);

// ── Von Hand gerechnete Endpreise
// 1) T-Shirt S (Bella+Canvas 3001, 4011): ek 11.92, Versand 10.39 USD → Kosten 2008 Rp. Kostenpreis 2737, Richtwert 2467.9 → Kosten binden → 2790 = 27.90.
//    Netto bei 2790: 2580.94 − 125 − 2008 = 447.94 → 4.48.
ist('Beispiel 1: Kostenboden bindet', kurz(endpreis({ ekUsd: 11.92, versandUsd: 10.39 })), [27.90, 27.90, 'kosten', 4.48]);
// 2) dasselbe mit Rückseite (+5.95 USD): Kosten 2544. P=3337: 3086.96 − 143 − 2544 = 399.96 ✗ · P=3338: 3087.88 − 143 − 2544 = 400.88 ✓ → 3338 → 3390 = 33.90.
//    Richtwert: 2467.9 + 536/0.891069 (= 601.5) = 3069.4 < 3338 → Kosten.
ist('Beispiel 2: Rückseite wird 1:1 mitgerechnet', kurz(endpreis({ ekUsd: 11.92, versandUsd: 10.39, aufpreisUsd: 5.95 })), [33.90, 33.90, 'kosten', 4.47]);
// 3) Tasse 11 oz (1320): ek 6.07 → 546, Versand 10.79 → 971, Kosten 1517. P=2185: 2021.28 − 104 − 1517 = 400.28 ✓ · P=2184: 2020.35 − 104 − 1517 = 399.35 ✗ → 2185 → 2190 = 21.90.
ist('Beispiel 3: Tasse', kurz(endpreis({ ekUsd: 6.07, versandUsd: 10.79 })), [21.90, 21.90, 'kosten', 4.05]);
// 4) Bomberjacke (390): ek 49.94 → 4495, Versand 11.39 → 1025, Kosten 5520. Kostenpreis 6678. Richtwert 4495 × 2.3 = 10338.5 → 10390 = 103.90 (Richtwert bindet).
//    Mindestpreis: 6678 → 6690 = 66.90. Netto bei 10390: 9611.47 − 383 (Gebühr 353 + 30) − 5520 = 3708.47 → 37.08.
ist('Beispiel 4: Richtwert bindet, Mindestpreis tiefer', kurz(endpreis({ ekUsd: 49.94, versandUsd: 11.39 })), [103.90, 66.90, 'richtwert', 37.08]);
// 5) Magnet 7,6 × 7,6 cm: ek 3.39 → 305, Versand 8.29 → 746, Kosten 1051. Kostenpreis 1663 → 1690 = 16.90. Richtwert 1505 < 1663 → Kosten.
ist('Beispiel 5: Magnet (heute CHF 7.90 im Shop)', kurz(endpreis({ ekUsd: 3.39, versandUsd: 8.29 })), [16.90, 16.90, 'kosten', 4.25]);
// 6) Die Schätzung hebt die Kosten: Katalog 11.92, Rechnung 13.00 → Boden mit 13.00; Richtwert bleibt auf dem Katalog (24.68).
//    ek 13.00 → 1170, Versand 935, Kosten 2105. P=2845: 2631.82 − (96.73→97+30=127) − 2105 = 399.82 ✗ · P=2846: 2632.75 − 127 − 2105 = 400.75 ✓ → 2846 → 2890 = 28.90.
//    Netto bei 2890: 2673.45 − 128 (Gebühr 98 + 30) − 2105 = 440.45 → 4.40.
ist('Beispiel 6: höhere Rechnung hebt den Boden, nicht den Richtwert', kurz(endpreis({ ekUsd: 13.00, versandUsd: 10.39, ekRichtwertUsd: 11.92 })), [28.90, 28.90, 'kosten', 4.40]);
nah('Beispiel 6: Richtwert bleibt 24.68', endpreis({ ekUsd: 13.00, versandUsd: 10.39, ekRichtwertUsd: 11.92 }).richtwertChf, 24.68);
// Beim Messkurs (0.82435) bleibt mehr übrig: T-Shirt S → Kosten 983 + 856 = 1839 (±1 Rp je Rundung) → Netto = 2580.94 − 125 − 1839 = 616.94 → 6.17
nah('Beispiel 1 beim Messkurs: Netto rund 6.17', endpreis({ ekUsd: 11.92, versandUsd: 10.39 }).nettoBeiMesskursChf, 6.17, 0.02);

// ── Aufpreis 1:1 (USD → CHF, mit Kurs, MWST und Gebühr aufgerechnet, auf 10 Rappen aufgerundet)
// 5.95 USD → 536 Rp → 536 / (1/1.081 − 0.034) = 536 / 0.891069 = 601.5 Rp → 6.015 → 6.10
ist('Aufpreis Rückseite 5.95 USD → CHF 6.10', aufpreisChf(5.95), 6.10);
// 2.49 USD → 224 Rp (224.1) → 251.4 Rp → 2.514 → 2.60
ist('Aufpreis Ärmel/Etikett 2.49 USD → CHF 2.60', aufpreisChf(2.49), 2.60);
// 2.95 USD → 266 Rp (265.5 → 266) → 298.5 Rp → 2.985 → 3.00
ist('Aufpreis Stickerei 2.95 USD → CHF 3.00', aufpreisChf(2.95), 3.00);
// 6.50 USD (Digitalisierung einmalig) → 585 Rp → 656.5 Rp → 6.565 → 6.60
ist('Einmalgebühr Digitalisierung 6.50 USD → CHF 6.60', aufpreisChf(6.50), 6.60);
ist('Aufpreis 0 → 0', aufpreisChf(0), 0);
nah('Aufpreis roh 5.95 USD: 601.5 Rp', aufpreisAufgerechnetRp(5.95), 601.5, 0.1);

// ── abrechnungsEk
ist('Einkauf: die Schätzung ist höher → Schätzung', abrechnungsEk({ katalogUsd: 16.6, schaetzungUsd: 17.5 }), { ekUsd: 17.5, quelle: 'schaetzung' });
ist('Einkauf: die Schätzung ist tiefer → Katalog bleibt (sicher)', abrechnungsEk({ katalogUsd: 9.44, schaetzungUsd: 7.25 }), { ekUsd: 9.44, quelle: 'katalog' });
ist('Einkauf: ohne Schätzung → Katalog, und die Quelle sagt es', abrechnungsEk({ katalogUsd: 9.44 }), { ekUsd: 9.44, quelle: 'katalog' });

// ── Eingaben prüfen: Unbekanntes bleibt unbekannt
wirft('ohne Versand: Fehler', () => endpreis({ ekUsd: 10 }), 'versandUsd');
wirft('Versand null: Fehler', () => endpreis({ ekUsd: 10, versandUsd: null }), 'versandUsd');
wirft('Einkauf 0: Fehler', () => endpreis({ ekUsd: 0, versandUsd: 5 }), 'ekUsd');
wirft('Einkauf negativ: Fehler', () => endpreis({ ekUsd: -1, versandUsd: 5 }), 'ekUsd');
wirft('Einkauf NaN: Fehler', () => endpreis({ ekUsd: NaN, versandUsd: 5 }), 'ekUsd');
wirft('Einkauf als Text: Fehler', () => endpreis({ ekUsd: '11.92', versandUsd: 5 }), 'ekUsd');
wirft('Aufpreis negativ: Fehler', () => endpreis({ ekUsd: 10, versandUsd: 5, aufpreisUsd: -2 }), 'aufpreisUsd');
wirft('Katalogpreis fehlt: Fehler', () => abrechnungsEk({ schaetzungUsd: 5 }), 'katalogUsd');
ist('Versand 0 ist erlaubt (Printful liefert nie 0, aber ein Test darf)', typeof endpreis({ ekUsd: 10, versandUsd: 0 }).preisChf, 'number');
ist('maxPreis: ueberMax meldet, kappt nie', [endpreis({ ekUsd: 100, versandUsd: 20 }, { ...REGEL, maxPreis: 149.90 }).ueberMax, endpreis({ ekUsd: 100, versandUsd: 20 }, { ...REGEL, maxPreis: 149.90 }).preisChf > 149.90], [true, true]);
ist('maxPreis: darunter kein Hinweis', endpreis({ ekUsd: 10, versandUsd: 10 }, { ...REGEL, maxPreis: 149.90 }).ueberMax, false);

// ── Versandbeitrag des Kunden (Vorgabe 0 = gar nichts anrechnen)
// Magnet mit angerechneten CHF 7: Kostenpreis rund 962 (siehe Rechnung unten), Richtwert 1505 → 1590 = 15.90 (Richtwert bindet, der Boden liegt unter 9.90)
//   Boden: P=890: Erlös 1590 → 1470.9 − 84 − 1051 = 335.9 ✗ · P=990: Erlös 1690 → 1563.4 − 87 − 1051 = 425.4 ✓ → Mindestpreis 9.90
const mitVersand = endpreis({ ekUsd: 3.39, versandUsd: 8.29 }, { ...REGEL, kundenVersandAnrechnen: 7 });
ist('Magnet mit Versandbeitrag 7: Mindestpreis 9.90, Preis 15.90 (Richtwert)', [mitVersand.mindestpreisChf, mitVersand.preisChf, mitVersand.bindend], [9.90, 15.90, 'richtwert']);
{
  const regel7 = { ...REGEL, kundenVersandAnrechnen: 7 };
  ist('Versandbeitrag gilt unter CHF 50.00, bei genau 50.00 nicht mehr (Sprung > CHF 5)', [nettoRp(4999, 3000, regel7) - nettoRp(5000, 3000, regel7) > 500, nettoRp(5000, 3000, regel7) === nettoRp(5000, 3000)], [true, true]);
}
// Sprung bei CHF 50: ein Preis ab 50 bekommt keinen Versandbeitrag mehr, das Netto fällt → die Suche muss darüber hinaus weiter nach oben gehen
{
  const regel7 = { ...REGEL, kundenVersandAnrechnen: 7 };
  const K = 3300;   // Kosten so, dass der Boden knapp unter 5000 liegt
  const p = kostenpreisRp(K, regel7);
  ist('Mit Versandbeitrag: kleinster Preis mit Netto ≥ 4 (Rappen) – der Preis davor genügt nicht', [nettoRp(p, K, regel7) >= 400, nettoRp(p - 1, K, regel7) < 400], [true, true]);
}

// ── Eigenschaften über 3000 Zufallsfälle (feste Zufallsfolge)
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
{
  const r = prng(20261105); const f2 = (x) => Math.round(x * 100) / 100;
  let n = 0, nicht90 = 0, unterNetto = 0, unterMess = 0, unterRw = 0, mindestZuHoch = 0, nichtMonoton = 0, aufpreisAb = 0, verlustMess = 0, stress = 0;
  for (let i = 0; i < 3000; i++) {
    const ek = f2(1 + r() * 70), vs = f2(5 + r() * 50), ap = r() < 0.5 ? 0 : f2(r() * 14);
    const e = endpreis({ ekUsd: ek, versandUsd: vs, aufpreisUsd: ap }); n++;
    const pRp = Math.round(e.preisChf * 100);
    if (pRp % 100 !== 90) nicht90++;
    const K = kostenRp({ ekUsd: ek, versandUsd: vs, aufpreisUsd: ap });
    if (nettoRp(pRp, K) + 1e-9 < 400) unterNetto++;
    if (nettoRp(pRp, kostenRp({ ekUsd: ek, versandUsd: vs, aufpreisUsd: ap }, REGEL.kursMess)) + 1e-9 < 400) unterMess++;
    if (pRp + 1e-9 < richtwertRp({ ekUsd: ek, aufpreisUsd: ap })) unterRw++;
    if (e.mindestpreisChf > e.preisChf) mindestZuHoch++;
    // Monotonie: mehr Einkauf, mehr Versand, mehr Aufpreis → nie ein tieferer Preis
    if (endpreis({ ekUsd: ek + 1, versandUsd: vs, aufpreisUsd: ap }).preisChf < e.preisChf) nichtMonoton++;
    if (endpreis({ ekUsd: ek, versandUsd: vs + 1, aufpreisUsd: ap }).preisChf < e.preisChf) nichtMonoton++;
    if (endpreis({ ekUsd: ek, versandUsd: vs, aufpreisUsd: ap + 1 }).preisChf < e.preisChf) nichtMonoton++;
    // Aufpreis 1:1: der Preisunterschied liegt höchstens eine Rundungsstufe (CHF 1.00) neben dem Aufpreis
    if (ap > 0 && Math.abs((e.preisChf - endpreis({ ekUsd: ek, versandUsd: vs }).preisChf) - aufpreisChf(ap)) > 1.011) aufpreisAb++;
    // Verlustfrei beim Messkurs und auch, wenn die Rechnung 11 % über Ware, Versand und Aufpreis liegt (Messwert: Schätzung bis +26 % über dem Katalog, Stickeraufträge +11 % über der Schätzung)
    const marge = e.preisChf / 1.081 - (ek + vs + ap) * REGEL.kursMess; if (marge < 0) verlustMess++;
    const stressNetto = e.preisChf / 1.081 - (0.034 * e.preisChf + 0.30) - (ek + vs + ap) * 1.11 * REGEL.kursMess; if (stressNetto < 0) stress++;
  }
  ist(`${n} Zufallsfälle: jeder Preis endet auf .90`, nicht90, 0);
  ist('… Netto ≥ 4.00 bei Kurs 0.90 (Rappen genau)', unterNetto, 0);
  ist('… Netto ≥ 4.00 auch beim Messkurs 0.82435', unterMess, 0);
  ist('… nie unter dem Richtwert', unterRw, 0);
  ist('… Mindestpreis ≤ Preis', mindestZuHoch, 0);
  ist('… monoton in Einkauf, Versand und Aufpreis', nichtMonoton, 0);
  ist('… Aufpreis wird 1:1 weitergegeben (±1 Rundungsstufe)', aufpreisAb, 0);
  ist('… kein Verlust beim Messkurs (Marge ohne Gebühr ≥ 0)', verlustMess, 0);
  ist('… kein Verlust nach Gebühr, wenn die Rechnung 11 % über allen Printful-Posten liegt', stress, 0);
}

// ── Die alte Regel ist ein Sonderfall: mit ihren Parametern (keine MWST, Netto ≥ 12, Versandbeitrag 7) gibt die Formel überall dasselbe wie automation/lib/pod_preise.mjs
{
  const alt = { ...REGEL, mwst: 0, nettoMin: 12, kundenVersandAnrechnen: 7 };
  const r = prng(27102026); let gleich = 0, n = 0; const abw = [];
  for (let i = 0; i < 1500; i++) {
    const ek = Math.round((1 + r() * 70) * 100) / 100, vs = Math.round((5 + r() * 50) * 100) / 100;
    const a = endpreisAlt({ einkaufUsd: ek, versandUsd: vs }), b = endpreis({ ekUsd: ek, versandUsd: vs }, alt); n++;
    if (a.ok ? a.preisChf === b.preisChf : false) gleich++; else if (a.ok) abw.push([ek, vs, a.preisChf, b.preisChf]);
  }
  const unlösbar = n - gleich - abw.length;   // alte Regel gab {ok:false} (Preis über 149.90): dort gibt es nichts zu vergleichen
  ist('Alte Regel (pod_preise.mjs) wird mit ihren Parametern genau getroffen', [abw.length, gleich + unlösbar], [0, n]);
}

// ── pruefePreis: die Urteile an den Grenzen (Marge = Preis ohne MWST − Printful-Ware − Printful-Versand beim Messkurs)
// T-Shirt S heute 24.90: 2490 / 1.081 = 2303.4 − (983 + 856 = 1839; 11.92 × 82.435 = 982.7 → 983, 10.39 × 82.435 = 856.5 → 856 oder 857) = 464 → 4.64 → ok
ist('pruefePreis: T-Shirt S heute CHF 24.90 → ok (Marge 4.64)', ((r) => [r.urteil, Math.round(r.margeChf)])(pruefePreis({ preisChf: 24.90, ekUsd: 11.92, versandUsd: 10.39 })), ['ok', 5]);
ist('pruefePreis: Marge zwischen 4 und 5 ist ok, unter 4 ist unter4, unter 0 ist verlust',
  [pruefePreis({ preisChf: 24.90, ekUsd: 11.92, versandUsd: 10.39 }).urteil, pruefePreis({ preisChf: 23.90, ekUsd: 11.92, versandUsd: 10.39 }).urteil, pruefePreis({ preisChf: 17.90, ekUsd: 11.92, versandUsd: 10.39 }).urteil],
  ['ok', 'unter4', 'verlust']);

// ── Gegenprobe mit den echten Preisen der 37 Produkte (334 Varianten mit Printful-Nummer und gemessenem Versand)
{
  const d = JSON.parse(readFileSync(new URL('./preise_gegenprobe.json', import.meta.url), 'utf8'));
  const sp = Object.fromEntries(d.spalten.map((s, i) => [s, i]));
  const zeilen = d.zeilen.map((z) => ({ handle: z[sp.handle], sku: z[sp.sku], preis: z[sp.preisChf], ekK: z[sp.ekKatalogUsd], vs: z[sp.versandUsd], ekS: z[sp.ekSchaetzungUsd] }));
  ist('Gegenprobe: 334 Varianten in 37 Produkten', [zeilen.length, new Set(zeilen.map((z) => z.handle)).size], [334, 37]);
  ist('Gegenprobe: 317 Varianten mit Schätzung der Rechnung', zeilen.filter((z) => z.ekS != null).length, 317);

  // (a) Wie viele heutige Preise unterschreiten die Messlatten? (Marge = Preis ohne MWST − Printful-Ware − Printful-Versand, Messkurs, Kunde zahlt keinen Versand)
  const heute = zeilen.map((z) => ({ z, k: pruefePreis({ preisChf: z.preis, ekUsd: z.ekK, versandUsd: z.vs }), h: pruefePreis({ preisChf: z.preis, ekUsd: abrechnungsEk({ katalogUsd: z.ekK, schaetzungUsd: z.ekS }).ekUsd, versandUsd: z.vs }) }));
  ist('Heute mit Katalogpreis: 2 Varianten mit Verlust, 9 unter CHF 4 Marge', [heute.filter((x) => x.k.urteil === 'verlust').length, heute.filter((x) => x.k.margeChf < 4).length], [2, 9]);
  ist('Heute mit höherem von Katalog und Schätzung: 2 mit Verlust, 10 unter CHF 4', [heute.filter((x) => x.h.urteil === 'verlust').length, heute.filter((x) => x.h.margeChf < 4).length], [2, 10]);
  ist('Verlust: beide Magnete 7,6 × 7,6 und 10 × 10 cm', heute.filter((x) => x.k.urteil === 'verlust').map((x) => x.z.sku), ['9000001_16366', '9000001_16367']);
  ist('Unter CHF 4 (Katalog): 4 Aufkleber, 3 Magnete, 2 Kissen', heute.filter((x) => x.k.margeChf < 4).map((x) => x.z.sku).sort(),
    ['3424232_10163', '3424232_10164', '3424232_10165', '3424232_16362', '9000001_16366', '9000001_16367', '9000001_16465', '9000001_4532', '9000001_9513']);
  // Von Hand in Rappen: Magnet 7,6 cm: 790 / 1.081 = 730.8 − (279 + 683 = 962; je Posten gerundet: 3.39 × 82.435 = 279.5 → 279, 8.29 × 82.435 = 683.4 → 683) = −231.2 → −2.31
  //   (ungerundet gerechnet −2.32: 7.3081 − 9.6291)
  ist('Magnet 7,6 cm: Marge −2.31 (je Posten auf Rappen gerundet)', heute.find((x) => x.z.sku === '9000001_16366').k.margeChf, -2.31);

  // (b) Die Formel gegen die heutigen Preise
  let gleich = 0, hoeher = 0, tiefer = 0, sumH = 0, sumT = 0, unterMindest = 0, zwischen = 0, kostenBindend = 0, minNetto = 1e9, minMarge = 1e9, verlustNeu = 0, minStress = 1e9;
  const tieferSkus = [];
  for (const z of zeilen) {
    const { ekUsd } = abrechnungsEk({ katalogUsd: z.ekK, schaetzungUsd: z.ekS });
    const e = endpreis({ ekUsd, versandUsd: z.vs, ekRichtwertUsd: z.ekK });
    const dl = Math.round((e.preisChf - z.preis) * 100) / 100;
    if (dl === 0) gleich++; else if (dl > 0) { hoeher++; sumH += dl; } else { tiefer++; sumT += dl; tieferSkus.push(z.sku); }
    if (z.preis < e.mindestpreisChf - 1e-9) unterMindest++; else if (dl > 0) zwischen++;
    if (e.bindend === 'kosten') kostenBindend++;
    const m = pruefePreis({ preisChf: e.preisChf, ekUsd, versandUsd: z.vs });
    minNetto = Math.min(minNetto, m.nettoChf); minMarge = Math.min(minMarge, m.margeChf); if (m.margeChf < 0) verlustNeu++;
    minStress = Math.min(minStress, e.preisChf / 1.081 - (0.034 * e.preisChf + 0.30) - (ekUsd + z.vs) * 1.11 * REGEL.kursMess);
  }
  ist('Formel gegen heute: 114 gleich, 203 höher (+385.00), 17 tiefer (−34.00)', [gleich, hoeher, Math.round(sumH * 100) / 100, tiefer, Math.round(sumT * 100) / 100], [114, 203, 385, 17, -34]);
  ist('Warum höher: 109 heutige Preise liegen unter dem Kostenboden, 94 zwischen Boden und Richtwert', [unterMindest, zwischen], [109, 94]);
  ist('Der Kostenboden bindet bei 185 Varianten, der Richtwert bei 149', [kostenBindend, zeilen.length - kostenBindend], [185, 149]);
  ist('Formelpreise: nie Verlust (0), Marge beim Messkurs mindestens 5.91, Netto nach Gebühr mindestens 5.00', [verlustNeu, minMarge, minNetto], [0, 5.91, 5]);
  ist('Formelpreise: auch mit 11 % höherer Rechnung bleibt nach Gebühr mindestens CHF 2.60 (≥ 0)', Math.round(minStress * 100) / 100 >= 2.6, true);
  ist('Die 17 tieferen Preise: 4 Ringgarn-T-Shirts, 3 klassische T-Shirts, 8 Poster, 1 Umhängetasche, 1 Tragetasche',
    tieferSkus.map((s) => s.split('_')[0]).sort(), ['5485122', '5599797', '5599797', '5599797', '5599797', '8481330', '8481330', '8481330', '9000001', '9000001', '9000001', '9000001', '9000001', '9000001', '9000001', '9000001', '9000001']);
  // Von Hand: Ringgarn-T-Shirt 5599797_17235: ek 19.75 → 1778 Rp (1777.5 → 1778), Richtwert 1778 × 2.3 = 4089.4 → 4090 = 40.90; heute 42.90
  ist('Beispiel Gegenprobe: 5599797_17235 heute 42.90, Formel 40.90 (Richtwert)', (() => { const z = zeilen.find((x) => x.sku === '5599797_17235'); const e = endpreis({ ekUsd: z.ekK, versandUsd: z.vs }); return [z.preis, e.preisChf, e.bindend]; })(), [42.90, 40.90, 'richtwert']);
  ist('Magnet 7,6 cm: Formel 16.90 (heute 7.90), Boden = Preis', (() => { const z = zeilen.find((x) => x.sku === '9000001_16366'); const e = endpreis({ ekUsd: z.ekK, versandUsd: z.vs }); return [z.preis, e.preisChf, e.mindestpreisChf]; })(), [7.90, 16.90, 16.90]);
}

console.log(`${ok} bestanden, ${fehl} fehlgeschlagen`);
if (fehl) process.exit(1);
