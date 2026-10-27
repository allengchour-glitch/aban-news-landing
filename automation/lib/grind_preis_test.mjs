// Tests für grind_preis.mjs (Preis und Marge neuer Produkte). Gegenproben in beide Richtungen; die Zusammenfassung steht am ENDE.
// Lauf: node automation/lib/grind_preis_test.mjs   (Exit 1 bei einem Fehler)
import { existsSync, readFileSync } from 'node:fs';
import {
  AUFSCHLAG, PREIS_MIN, MARGE_WARN, MENGENRABATT_MARGE, USD_CHF, KURS_PLAUSIBEL, FLAGGEN_TEXT,
  parseSpanne, runde2, margeVon, margeErreicht, mengenrabattStufe, preisAusKosten, preisNeu, preiseFuerVarianten,
} from './grind_preis.mjs';
import { aufrunden90, preisFuer } from './cj_varianten.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const wirft = (name, fn, muster) => {
  try { fn(); } catch (e) {
    if (!muster || muster.test(String(e?.message))) ok++; else { fehl++; console.log('FEHLER', name, '— falsche Meldung:', String(e?.message)); }
    return;
  }
  fehl++; console.log('FEHLER', name, '— wirft nicht');
};
const K = USD_CHF;                                   // Kurs der Beispiele: derselbe wie im Repo (cj_varianten.mjs)

// ─────────────────────────── Konstanten (die SETZUNGEN stehen als Zahl fest) ───────────────────────────
ist('Aufschlag 1,45', AUFSCHLAG, 1.45);
ist('Untergrenze 14.90', PREIS_MIN, 14.9);
ist('Warnschwelle 30 %', MARGE_WARN, 0.3);
ist('Mengenrabatt-Schwellen 45 / 37 %', MENGENRABATT_MARGE, { a: 0.45, b: 0.37 });
ist('Flaggen haben einen Klartext', Object.keys(FLAGGEN_TEXT).sort(), ['fracht_dominiert', 'fracht_null', 'kurs_ungewoehnlich', 'marge_unter_30', 'spanne']);
ist('Kurs-Spanne enthält den Repo-Kurs', USD_CHF > KURS_PLAUSIBEL.min && USD_CHF < KURS_PLAUSIBEL.max, true);

// ─────────────────────────── parseSpanne ───────────────────────────
ist('Zahl', parseSpanne(4.34), { ok: true, min: 4.34, max: 4.34, spanne: false });
ist('Null ist lesbar (die Preisregel lehnt sie ab, nicht der Parser)', parseSpanne(0), { ok: true, min: 0, max: 0, spanne: false });
ist('Text', parseSpanne('4.34'), { ok: true, min: 4.34, max: 4.34, spanne: false });
ist('Text mit Rand', parseSpanne('  4.34 \n'), { ok: true, min: 4.34, max: 4.34, spanne: false });
ist('CJ-Liste «4.34 -- 5.44»', parseSpanne('4.34 -- 5.44'), { ok: true, min: 4.34, max: 5.44, spanne: true });
ist('CJ-Detail «3.44-17.01»', parseSpanne('3.44-17.01'), { ok: true, min: 3.44, max: 17.01, spanne: true });
ist('CJ-Vorschlag «18.75 - 240.51»', parseSpanne('18.75 - 240.51'), { ok: true, min: 18.75, max: 240.51, spanne: true });
ist('Gedankenstrich', parseSpanne('4.34 – 5.44'), { ok: true, min: 4.34, max: 5.44, spanne: true });
ist('Geschütztes Leerzeichen', parseSpanne('4.34 -- 5.44'), { ok: true, min: 4.34, max: 5.44, spanne: true });
ist('Dezimalkomma', parseSpanne('4,34'), { ok: true, min: 4.34, max: 4.34, spanne: false });
ist('Dezimalkomma in der Spanne', parseSpanne('4,34 -- 5,44'), { ok: true, min: 4.34, max: 5.44, spanne: true });
ist('Gleiche Ränder sind keine Spanne', parseSpanne('4.00 -- 4.00'), { ok: true, min: 4, max: 4, spanne: false });
ist('Ganze Zahl', parseSpanne('12'), { ok: true, min: 12, max: 12, spanne: false });
// Gegenproben: was nicht sicher lesbar ist, ist «nicht ok» — nie ein geratener Wert
for (const [n, w] of [['leer', ''], ['nur Leerraum', '   '], ['null', null], ['undefined', undefined], ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity],
  ['negative Zahl', -1], ['negativer Text', '-1'], ['Exponent', '1e3'], ['Text', 'abc'], ['Währungszeichen', '$4.34'], ['Währungstext', 'USD 4.34'],
  ['offene Spanne rechts', '4.34 --'], ['offene Spanne links', '-- 5.44'], ['verkehrte Spanne', '5.44 -- 4.34'], ['drei Zahlen', '1 -- 2 -- 3'],
  ['Tausenderkomma', '1,234'], ['Tausender und Dezimalpunkt', '1,234.56'], ['doppelter Punkt', '4..34'], ['Wahrheitswert', true], ['Objekt', {}], ['Liste', [4.34]], ['BigInt', 5n]]) {
  ist(`ungültig: ${n}`, parseSpanne(w).ok, false);
}
ist('Fehlergrund steht im Ergebnis', typeof parseSpanne('abc').grund, 'string');

// ─────────────────────────── runde2, margeVon, margeErreicht, mengenrabattStufe ───────────────────────────
ist('runde2 halbe Rappen auf', [runde2(1.005), runde2(2.675), runde2(0.285), runde2(4.12175), runde2(12.36525)], [1.01, 2.68, 0.29, 4.12, 12.37]);
ist('runde2 ganze Rappen bleiben', runde2(14.9), 14.9);
ist('margeVon', margeVon(20, 11), 0.45);
ist('margeVon: Preis 0 → null', margeVon(0, 5), null);
ist('margeVon: Text → null', margeVon('x', 5), null);
ist('margeVon: NaN → null', margeVon(NaN, 5), null);
ist('margeVon: Verlust ist negativ', margeVon(10, 12.5) < 0, true);

// Die Gleitkomma-Falle ist echt: ohne Toleranz wäre 16.90 / 11.83 (exakt 30 %) «unter 30 %».
ist('Falle gibt es: naiv 30 % verfehlt', (16.9 - 11.83) / 16.9 < 0.3, true);
ist('… mit Toleranz exakt 30 % erreicht', margeErreicht(margeVon(16.9, 11.83), 0.3), true);
ist('… einen Rappen mehr Kosten: darunter', margeErreicht(margeVon(16.9, 11.84), 0.3), false);
ist('Falle 45 %: naiv 15.40 / 8.47 verfehlt', (15.4 - 8.47) / 15.4 < 0.45, true);
ist('exakt 45 % → Stufe a (20 / 11)', mengenrabattStufe(margeVon(20, 11)), 'a');
ist('exakt 45 % → Stufe a (15.40 / 8.47, naiv zu klein)', mengenrabattStufe(margeVon(15.4, 8.47)), 'a');
ist('45 % minus einen Rappen → Stufe b', mengenrabattStufe(margeVon(20, 11.01)), 'b');
ist('exakt 37 % → Stufe b (30 / 18.90)', mengenrabattStufe(margeVon(30, 18.9)), 'b');
ist('exakt 37 % → Stufe b (17 / 10.71, naiv zu klein)', mengenrabattStufe(margeVon(17, 10.71)), 'b');
ist('37 % minus einen Rappen → keine Stufe', mengenrabattStufe(margeVon(30, 18.91)), null);
ist('Stufe bei null', mengenrabattStufe(null), null);
ist('Stufe bei NaN', mengenrabattStufe(NaN), null);
ist('Stufe bei 100 %', mengenrabattStufe(1), 'a');
ist('Stufe bei negativer Marge', mengenrabattStufe(-0.2), null);

// Rappen-genaue Referenz (ganze Zahlen, keine Gleitkomma): (P − K) · 100 ≥ G · P
{
  let fehler = 0, n = 0;
  for (const g of [30, 37, 45]) for (let p = 1490; p <= 9990; p += 10) for (let k = 1; k <= p; k += (k < 200 ? 1 : 7)) {
    n++;
    const soll = (p - k) * 100 >= g * p;
    const is = margeErreicht(margeVon(p / 100, k / 100), g / 100);
    if (soll !== is) { fehler++; if (fehler <= 3) console.log('  Abweichung', { g, p, k, soll, is }); }
  }
  ist(`Marge gegen Rappen-Referenz (${n} Paare × 3 Schwellen)`, fehler, 0);
}
// Dicht an den Schwellen und bei hohen Preisen (bis CHF 3000): Kosten = Preis × (1 − Schwelle), je ±2 Rappen
{
  let fehler = 0, n = 0, exakt = 0;
  for (const g of [30, 37, 45]) for (let p = 1490; p <= 300000; p += 1) for (let d = -2; d <= 2; d++) {
    const k = Math.round(p * (100 - g) / 100) + d;
    if (k < 1) continue; n++;
    const soll = (p - k) * 100 >= g * p; if ((p - k) * 100 === g * p) exakt++;
    if (soll !== margeErreicht(margeVon(p / 100, k / 100), g / 100)) { fehler++; if (fehler <= 3) console.log('  Abweichung', { g, p, k, soll }); }
  }
  ist(`Marge an den Schwellen bis CHF 3000 (${n} Paare, davon ${exakt} exakt auf der Schwelle)`, fehler, 0);
}

// ─────────────────────────── preisAusKosten ───────────────────────────
ist('Beispiel: Kosten 4.12 → Untergrenze', preisAusKosten(4.12), { ok: true, kosten: 4.12, preis: 14.9, regel: 'untergrenze' });
ist('Beispiel: Kosten 12.37 → 18.90', preisAusKosten(12.37), { ok: true, kosten: 12.37, preis: 18.9, regel: 'aufschlag' });
ist('Kosten als Text (so liefert Shopify unitCost)', preisAusKosten('13.05'), { ok: true, kosten: 13.05, preis: 19.9, regel: 'aufschlag' });
ist('Kosten werden auf Rappen gerundet', preisAusKosten(12.3649).kosten, 12.36);
// Gleitkomma-Grenzen von aufrunden90: Einstand × 1,45 ist mathematisch EXAKT x.90 — es darf nicht eine Stufe höher springen.
ist('22.00 × 1,45 = 31.90 exakt (nicht 32.90)', preisAusKosten(22).preis, 31.9);
ist('22.01 × 1,45 = 31.9145 → 32.90', preisAusKosten(22.01).preis, 32.9);
ist('42.00 × 1,45 = 60.90 exakt', preisAusKosten(42).preis, 60.9);
ist('42.01 → 61.90', preisAusKosten(42.01).preis, 61.9);
ist('Untergrenze: 10.27 × 1,45 = 14.8915 → 14.90 (Untergrenze)', [preisAusKosten(10.27).preis, preisAusKosten(10.27).regel], [14.9, 'untergrenze']);
ist('Gegenprobe: 10.28 × 1,45 = 14.906 → 15.90 (Aufschlag)', [preisAusKosten(10.28).preis, preisAusKosten(10.28).regel], [15.9, 'aufschlag']);
ist('Untergrenze trifft exakt (Aufschlag 1,49 × 10.00 = 14.90)', [preisAusKosten(10, { aufschlag: 1.49 }).preis, preisAusKosten(10, { aufschlag: 1.49 }).regel], [14.9, 'untergrenze']);
ist('Gegenprobe: 10.01 mit 1,49 → 15.90', [preisAusKosten(10.01, { aufschlag: 1.49 }).preis, preisAusKosten(10.01, { aufschlag: 1.49 }).regel], [15.9, 'aufschlag']);
ist('Eigene Untergrenze 16.90', preisAusKosten(5, { preisMin: 16.9 }).preis, 16.9);
ist('Untergrenze 16 wird wie jeder Preis auf x.90 gebracht', preisAusKosten(5, { preisMin: 16 }).preis, 16.9);
ist('Gegenprobe: hohe Kosten ignorieren die Untergrenze', preisAusKosten(100, { preisMin: 16.9 }).preis, 145.9);
ist('Aufschlag 1: Preis = aufgerundete Kosten', preisAusKosten(20, { aufschlag: 1 }).preis, 20.9);
// Rappen-genau über 40 000 Einstände und drei Regeln (ganze Zahlen als Referenz)
{
  const refRappen = (k, prozent, minR) => {
    const noetig = Math.max(minR, Math.floor((k * prozent + 99) / 100));
    const n = noetig <= 90 ? 0 : Math.floor((noetig - 90 + 99) / 100);
    return 100 * n + 90;
  };
  for (const [prozent, minR] of [[145, 1490], [130, 1490], [125, 1690], [200, 1490], [100, 1490]]) {
    let fehler = 0;
    for (let k = 1; k <= 40000; k++) {
      const r = preisAusKosten(k / 100, { aufschlag: prozent / 100, preisMin: minR / 100 });
      if (Math.round(r.preis * 100) !== refRappen(k, prozent, minR)) { fehler++; if (fehler <= 3) console.log('  Abweichung', { prozent, minR, k, ist: r.preis, soll: refRappen(k, prozent, minR) / 100 }); }
    }
    ist(`Preis gegen Rappen-Referenz (Aufschlag ${prozent / 100}, Untergrenze ${minR / 100}, 40 000 Einstände)`, fehler, 0);
  }
}
// Monotonie über alle Einstände
{
  let letzter = 0, rueck = 0;
  for (let k = 1; k <= 40000; k++) { const p = preisAusKosten(k / 100).preis; if (p < letzter) rueck++; letzter = p; }
  ist('Preis fällt nie, wenn der Einstand steigt (40 000 Schritte)', rueck, 0);
}
// Gegenproben: ungültige Kosten
for (const [n, w] of [['null', null], ['undefined', undefined], ['leer', ''], ['NaN', NaN], ['Text', 'viel'], ['negativ', -3], ['null Franken', 0], ['unter einem Rappen', 0.004], ['Spanne', '3 -- 4'], ['Infinity', Infinity]]) {
  ist(`Kosten ungültig: ${n}`, preisAusKosten(w).ok, false);
}

// ─────────────────────────── preisNeu: Beispiele ───────────────────────────
{
  const a = preisNeu({ ekUsd: 3, frachtUsd: 2, kurs: K });
  ist('EK 3 + Fracht 2: Einstand', [a.einstandUsd, a.kosten], [5, 4.12]);
  ist('EK 3 + Fracht 2: Untergrenze 14.90', [a.preis, a.regel], [14.9, 'untergrenze']);
  ist('EK 3 + Fracht 2: Marge', Math.round(a.marge * 10000) / 10000, 0.7235);
  ist('EK 3 + Fracht 2: Stufe a, Fracht 40 %', [a.mengenrabatt, a.frachtAnteil], ['a', 0.4]);
  ist('EK 3 + Fracht 2: keine Flagge', a.flaggen, []);
  const b = preisNeu({ ekUsd: 10, frachtUsd: 5, kurs: K });
  ist('EK 10 + Fracht 5: Kosten 12.37, Preis 18.90', [b.kosten, b.preis, b.regel], [12.37, 18.9, 'aufschlag']);
  ist('EK 10 + Fracht 5: Marge 34,6 %, keine Stufe', [Math.round(b.marge * 10000) / 10000, b.mengenrabatt], [0.3455, null]);
  const c = preisNeu({ ekUsd: 20, frachtUsd: 10, kurs: K });
  ist('EK 20 + Fracht 10: Kosten 24.73 × 1,45 = 35.86 → Preis 35.90', [c.kosten, c.preis], [24.73, 35.9]);
  ist('Grösste Eingabe gleicht den Kern: Preis aus preisAusKosten', c.preis, preisAusKosten(c.einstandUsd * K).preis);
  // QUELLE import_audit.md M16 (Grössenordnung der Taschenlampe: EK 1,66 USD, im Shop unitCost 6.49 → die Fracht ist 5,12 CHF ≈ 6,21 USD)
  const t = preisNeu({ ekUsd: 1.66, frachtUsd: 6.21, kurs: K });
  ist('Taschenlampe: Einstand 6.49, Untergrenze 14.90', [t.kosten, t.preis, t.regel], [6.49, 14.9, 'untergrenze']);
  ist('Taschenlampe: die Fracht dominiert', t.flaggen, ['fracht_dominiert']);
  ist('Taschenlampe: Fracht ist 79 % des Einstands', Math.round(t.frachtAnteil * 100), 79);
  const text = preisNeu({ ekUsd: '10.00', frachtUsd: '5', kurs: K });
  ist('Beträge als Text', [text.kosten, text.preis], [12.37, 18.9]);
  ist('Ergebnis ist rein: gleiche Eingabe, gleiches Ergebnis', JSON.stringify(preisNeu({ ekUsd: 10, frachtUsd: 5, kurs: K })), JSON.stringify(b));
  const eingefroren = Object.freeze({ ekUsd: 10, frachtUsd: 5, kurs: K });
  ist('Eingabe wird nicht verändert (eingefroren)', preisNeu(eingefroren).preis, 18.9);
}

// Stufen aus der Marge bei Preis 14.90 (Untergrenze): Kosten 8.19 → 45,03 % (a), 8.20 → 44,97 % (b), 9.38 → 37,05 % (b), 9.39 → 36,98 % (keine)
// (kurs = 1, damit der Einstand genau die Kosten ist)
{
  const f = kosten => preisNeu({ ekUsd: kosten - 1, frachtUsd: 1, kurs: 1, aufschlag: 1.0 }).mengenrabatt;
  ist('Kosten 8.19 → Stufe a', f(8.19), 'a');
  ist('Kosten 8.20 → Stufe b', f(8.2), 'b');
  ist('Kosten 9.38 → Stufe b', f(9.38), 'b');
  ist('Kosten 9.39 → keine Stufe', f(9.39), null);
}

// ─────────────────────────── Spanne ───────────────────────────
{
  const hoch = preisNeu({ ekUsd: '4.34 -- 5.44', frachtUsd: 2, kurs: K });
  const tief = preisNeu({ ekUsd: '4.34 -- 5.44', frachtUsd: 2, kurs: K, spanne: 'min' });
  ist('Spanne: Vorgabe rechnet mit dem oberen Rand', [hoch.ekUsd, hoch.kosten], [5.44, 6.13]);
  ist('Spanne: «min» rechnet mit dem unteren Rand', [tief.ekUsd, tief.kosten], [4.34, 5.23]);
  ist('Spanne: Flagge in beiden Fällen', [hoch.flaggen, tief.flaggen], [['spanne'], ['spanne']]);
  const gross = preisNeu({ ekUsd: '3.44-17.01', frachtUsd: 20, kurs: K });
  ist('Spanne «3.44-17.01» + Fracht 20: Kosten 30.51 × 1,45 = 44.24 → Preis 44.90', [gross.kosten, gross.preis], [30.51, 44.9]);
  ist('Gegenprobe: gleiche Ränder, keine Flagge', preisNeu({ ekUsd: '4.00 -- 4.00', frachtUsd: 2, kurs: K }).flaggen, []);
  ist('Spanne auch bei der Fracht', preisNeu({ ekUsd: 3, frachtUsd: '2 -- 4', kurs: K }).frachtUsd, 4);
}

// ─────────────────────────── Fracht dominiert ───────────────────────────
ist('Fracht gleich Einkauf: keine Flagge', preisNeu({ ekUsd: 3, frachtUsd: 3, kurs: K }).flaggen, []);
ist('Fracht einen Cent über dem Einkauf: Flagge', preisNeu({ ekUsd: 3, frachtUsd: 3.01, kurs: K }).flaggen, ['fracht_dominiert']);
ist('Fracht einen Cent unter dem Einkauf: keine Flagge', preisNeu({ ekUsd: 3, frachtUsd: 2.99, kurs: K }).flaggen, []);
ist('Gleitkomma: 0.1 + 0.2 gegen 0.3 ist «gleich»', preisNeu({ ekUsd: 0.3, frachtUsd: 0.1 + 0.2, kurs: K }).flaggen.includes('fracht_dominiert'), false);
ist('Fracht 20-mal der Einkauf', preisNeu({ ekUsd: 0.5, frachtUsd: 10, kurs: K }).flaggen, ['fracht_dominiert']);
ist('Fracht 0: eigene Flagge, nicht «dominiert»', preisNeu({ ekUsd: 3, frachtUsd: 0, kurs: K }).flaggen, ['fracht_null']);
ist('Fracht 0 als Text', preisNeu({ ekUsd: 3, frachtUsd: '0', kurs: K }).flaggen, ['fracht_null']);
ist('Fracht-Anteil ohne Fracht', preisNeu({ ekUsd: 3, frachtUsd: 0, kurs: K }).frachtAnteil, 0);
{
  // Der Kleinwaren-Grenzfall in Zahlen: Einkauf 0.50 USD, Fracht 6 USD → der Preis hängt zu 92 % an der Fracht. Fast verdoppelt sich die Fracht (11 USD), bleibt der Preis, weil die Untergrenze trägt.
  const r1 = preisNeu({ ekUsd: 0.5, frachtUsd: 6, kurs: K }), r2 = preisNeu({ ekUsd: 0.5, frachtUsd: 11, kurs: K });
  ist('Kleinware: Fracht-Anteil 92 %', Math.round(r1.frachtAnteil * 100), 92);
  ist('Kleinware: fast doppelte Fracht → derselbe Preis (Untergrenze), keine Marge-Warnung', [r1.preis, r2.preis, r2.flaggen.includes('marge_unter_30')], [14.9, 14.9, false]);
  const r3 = preisNeu({ ekUsd: 0.5, frachtUsd: 30, kurs: K });
  ist('Kleinware: Fracht 30 USD → Preis folgt dem Aufschlag', [r3.regel, r3.flaggen], ['aufschlag', ['fracht_dominiert']]);
}

// ─────────────────────────── Marge-Warnung statt Rundung ───────────────────────────
{
  const w = preisNeu({ ekUsd: 20, frachtUsd: 10, kurs: K, aufschlag: 1.25 });
  ist('Aufschlag 1,25: Warnung', w.flaggen, ['marge_unter_30']);
  ist('… der Preis bleibt, wie die Regel ihn ergibt (nicht still angehoben)', w.preis, aufrunden90(24.73 * 1.25));
  ist('… die Marge bleibt sichtbar (22,5 %)', Math.round(w.marge * 1000) / 1000, 0.225);
  // Rappen-Grenze: Preis 16.90 bei Kosten 11.83 ist exakt 30,000 % → keine Warnung; bei Kosten 11.84 sind es 29,94 % → Warnung
  const gr = (kosten) => preisNeu({ ekUsd: kosten - 3, frachtUsd: 3, kurs: 1, aufschlag: 16.9 / kosten, preisMin: 14.9 });
  ist('Grenze: 16.90 / 11.83 = exakt 30 % → keine Warnung', [gr(11.83).preis, gr(11.83).flaggen], [16.9, []]);
  ist('Grenze: 16.90 / 11.84 = 29,9 % → Warnung', [gr(11.84).preis, gr(11.84).flaggen], [16.9, ['marge_unter_30']]);
  // Der Standard-Aufschlag kann die Schwelle nicht unterschreiten: kleinste Marge über 1…500 CHF Einstand
  let min = 1, bei = 0;
  for (let k = 1; k <= 50000; k++) { const r = preisAusKosten(k / 100); const m = margeVon(r.preis, r.kosten); if (m < min) { min = m; bei = k / 100; } }
  ist('Standardregel: Marge nie unter 31 % (kleinste über 50 000 Einstände)', min >= 0.31, true);
  console.log(`  (Info: kleinste Marge der Standardregel ${(min * 100).toFixed(3)} % bei Einstand ${bei.toFixed(2)})`);
}

// ─────────────────────────── Eingaben: Unbekanntes bleibt unbekannt ───────────────────────────
{
  const gut = { ekUsd: 3, frachtUsd: 2, kurs: K };
  ist('Gegenprobe: gültige Eingabe → ok', preisNeu(gut).ok, true);
  ist('ohne Eingabe', [preisNeu().ok, preisNeu().grund], [false, 'EK unbekannt']);
  ist('null als Eingabe', preisNeu(null).ok, false);
  for (const [n, ek] of [['null', null], ['undefined', undefined], ['leer', ''], ['Leerraum', '  '], ['NaN', NaN], ['Text', 'abc'], ['null Dollar', 0], ['null als Text', '0'], ['negativ', -1], ['Infinity', Infinity], ['Wahrheitswert', true], ['Liste', []], ['Objekt', {}], ['Währung', '$3']]) {
    const r = preisNeu({ ...gut, ekUsd: ek });
    ist(`EK ungültig: ${n} → ok:false, kein Preis`, [r.ok, r.preis, r.kosten, r.marge], [false, null, null, null]);
  }
  ist('EK unbekannt: Grund', preisNeu({ ...gut, ekUsd: null }).grund, 'EK unbekannt');
  ist('EK null: Grund', preisNeu({ ...gut, ekUsd: 0 }).grund, 'EK nicht positiv');
  ist('EK Text: Grund nennt «EK»', /^EK ungültig/.test(preisNeu({ ...gut, ekUsd: 'abc' }).grund), true);
  for (const [n, fr] of [['null', null], ['undefined', undefined], ['leer', ''], ['NaN', NaN], ['Text', 'viel'], ['negativ', -1], ['Infinity', Infinity]]) {
    const r = preisNeu({ ...gut, frachtUsd: fr });
    ist(`Fracht ungültig: ${n} → ok:false`, [r.ok, r.preis], [false, null]);
  }
  ist('Fracht fehlt: Grund', preisNeu({ ...gut, frachtUsd: undefined }).grund, 'Fracht unbekannt');
  for (const [n, ku] of [['fehlt', undefined], ['null', null], ['leer', ''], ['NaN', NaN], ['null Franken', 0], ['negativ', -0.8], ['Text', '0.82'], ['Infinity', Infinity]]) {
    const r = preisNeu({ ...gut, kurs: ku });
    ist(`Kurs ungültig: ${n} → ok:false`, [r.ok, r.preis], [false, null]);
  }
  ist('Kurs fehlt: Grund', preisNeu({ ekUsd: 3, frachtUsd: 2 }).grund, 'Kurs unbekannt');
  ist('Einkauf unter einem Rappen', preisNeu({ ekUsd: 0.001, frachtUsd: 0, kurs: K }).grund, 'Kosten unter einem Rappen');
  ist('Kurs verdreht (CHF je USD statt USD je CHF): Flagge, kein Abbruch', preisNeu({ ...gut, kurs: 1 / K }).flaggen, ['kurs_ungewoehnlich']);
  ist('Kurs 82: Flagge', preisNeu({ ...gut, kurs: 82 }).flaggen.includes('kurs_ungewoehnlich'), true);
  ist('Gegenprobe: Repo-Kurs → keine Flagge', preisNeu(gut).flaggen.includes('kurs_ungewoehnlich'), false);
}

// Konfigurationsfehler sind Programmierfehler: sie werfen
for (const [n, o, m] of [
  ['Aufschlag unter 1', { aufschlag: 0.9 }, /aufschlag/], ['Aufschlag NaN', { aufschlag: NaN }, /aufschlag/], ['Aufschlag als Text', { aufschlag: '1.45' }, /aufschlag/],
  ['Aufschlag 0', { aufschlag: 0 }, /aufschlag/], ['Untergrenze 0', { preisMin: 0 }, /preisMin/], ['Untergrenze negativ', { preisMin: -5 }, /preisMin/],
  ['Untergrenze als Text', { preisMin: '14.90' }, /preisMin/], ['Stück 0', { stueck: 0 }, /stueck/], ['Stück 1,5', { stueck: 1.5 }, /stueck/], ['Stück als Text', { stueck: '2' }, /stueck/],
  ['Spanne «mittel»', { spanne: 'mittel' }, /spanne/], ['Verhältnis «x»', { verhaeltnis: 'x' }, /verhaeltnis/],
]) {
  wirft(`preisNeu: ${n}`, () => preisNeu({ ekUsd: 3, frachtUsd: 2, kurs: K, ...o }), m);
  wirft(`preiseFuerVarianten: ${n}`, () => preiseFuerVarianten([{ ekUsd: 3 }], { frachtUsd: 2, kurs: K, ...o }), m);
}
wirft('preisAusKosten: Aufschlag unter 1', () => preisAusKosten(10, { aufschlag: 0.5 }), /aufschlag/);
ist('Gegenprobe: Aufschlag genau 1 ist erlaubt', preisNeu({ ekUsd: 3, frachtUsd: 2, kurs: K, aufschlag: 1 }).ok, true);
ist('Gegenprobe: null als Optionen nimmt die Vorgaben (12 × 1,45 = 17.40 → 17.90)', preisAusKosten(12, null).preis, 17.9);

// ─────────────────────────── Stück: Preis je Stück für den Marktvergleich ───────────────────────────
{
  const z = preisNeu({ ekUsd: 10, frachtUsd: 10, kurs: K, stueck: 10 });
  ist('10er-Set: Preis und Preis je Stück (Einstand 16.49 × 1,45 = 23.91 → 24.90)', [z.preis, z.stueck, z.preisProStueck], [24.9, 10, 2.49]);
  ist('Rundung auf Rappen: 14.90 / 3 = 4.97', preisNeu({ ekUsd: 3, frachtUsd: 2, kurs: K, stueck: 3 }).preisProStueck, 4.97);
  ist('Gegenprobe: ein Stück → gleicher Preis', preisNeu({ ekUsd: 10, frachtUsd: 10, kurs: K }).preisProStueck, 24.9);
}

// ─────────────────────────── preiseFuerVarianten ───────────────────────────
{
  const opt = { kurs: K, frachtUsd: 2 };
  ist('Eine Variante = die Einzelregel', preiseFuerVarianten([{ vid: 'a', ekUsd: 10 }], opt).varianten[0].preis, preisNeu({ ekUsd: 10, frachtUsd: 2, kurs: K }).preis);
  ist('Eine Variante: Basis 0, Mindestpreis = Höchstpreis', (() => { const r = preiseFuerVarianten([{ ekUsd: 10 }], opt); return [r.ok, r.basisIndex, r.minPreis === r.maxPreis]; })(), [true, 0, true]);

  const vs = [{ vid: 'a', ekUsd: 3 }, { vid: 'b', ekUsd: 3.02 }, { vid: 'c', ekUsd: 9 }, { vid: 'd', ekUsd: 12 }];
  const r = preiseFuerVarianten(vs, opt);
  ist('4 Varianten: ok, Basis a', [r.ok, r.basisIndex, r.ungueltig], [true, 0, []]);
  ist('Basis-Preis = Einzelregel (Untergrenze)', [r.varianten[0].preis, r.varianten[0].regel, r.varianten[0].basis], [14.9, 'untergrenze', true]);
  ist('Mehr-Einstand unter 5 Rappen kostet nichts (EK +0.02 USD)', [r.varianten[1].preis, r.varianten[1].regel], [14.9, 'mindestpreis']);
  // Dieselbe Funktion wie im Auswahl-Lauf: jede Zahl gegen einen DIREKTEN Aufruf von preisFuer()
  const basis = r.varianten[0];
  const lit = preiseFuerVarianten(vs, { ...opt, verhaeltnis: 'basis' });
  for (const i of [1, 2, 3]) {
    const direktBasis = preisFuer({ basisPreis: basis.preis, basisKostenChf: basis.kosten, ekBasisUsd: basis.einstandUsd, ekUsd: r.varianten[i].einstandUsd, usdChf: K });
    ist(`Variante ${'abcd'[i]}: Vorgabe «basis» = preisFuer() mit dem Preis der Basis (wie der Auswahl-Lauf)`, lit.varianten[i].preis, direktBasis.preis);
    // Vorgabe «regel»: auf der Untergrenze rechnet preisFuer() mit dem Verhältnis der Regel (Kosten × 1,45) statt dem aufgeblähten 14.90 / 4.12
    const direktRegel = preisFuer({ basisPreis: basis.kosten * AUFSCHLAG, basisKostenChf: basis.kosten, ekBasisUsd: basis.einstandUsd, ekUsd: r.varianten[i].einstandUsd, usdChf: K });
    ist(`Variante ${'abcd'[i]}: Vorgabe «regel» = preisFuer() mit dem Verhältnis der Regel, mindestens der Basispreis`, r.varianten[i].preis, Math.max(basis.preis, direktRegel.preis));
  }
  ist('Basis steht auf der Untergrenze: Verhältnis 14.90 / 4.12 = 3,6 …', Math.round(basis.preis / basis.kosten * 100) / 100, 3.62);
  ist('Vorgabe «basis»: Variante c (EK 9, Einstand 9.07) erbt dieses Verhältnis → 32.90', lit.varianten[2].preis, 32.9);
  ist('Vorgabe «regel»: dieselbe Variante nach dem Aufschlag → 14.90 (= Einzelregel, Mindestpreis)', [r.varianten[2].preis, r.varianten[2].regelPreis, r.varianten[2].regel], [14.9, 14.9, 'mindestpreis']);
  ist('Vorgabe «regel»: Preise steigen mit dem Einstand', r.varianten.map(v => v.preis), [14.9, 14.9, 14.9, 16.9]);
  ist('Vorgabe «regel»: Variante d (Einstand 11.54) = Einzelregel 11.54 × 1,45 = 16.73 → 16.90', [r.varianten[3].preis, r.varianten[3].regel], [16.9, 'verhaeltnis']);
  ist('Vorgabe «basis»: Preise steigen mit dem Einstand', lit.varianten.map(v => v.preis), [14.9, 14.9, 32.9, 41.9]);
  ist('Mindestpreis und Höchstpreis («regel»)', [r.minPreis, r.maxPreis], [14.9, 16.9]);
  ist('Mindestpreis und Höchstpreis («basis»)', [lit.minPreis, lit.maxPreis], [14.9, 41.9]);
  ist('Marge-Minimum («regel»): Variante d mit 16.90 / 11.54', Math.round(r.margeMin * 1000) / 1000, 0.317);
  ist('Marge-Minimum («basis»): Variante b mit 14.90 / 4.14', Math.round(lit.margeMin * 1000) / 1000, 0.722);
}
{
  // Basis über der Untergrenze: beide Betriebsarten stimmen überein (es gibt nichts Aufgeblähtes zu neutralisieren)
  const vs = [{ ekUsd: 40 }, { ekUsd: 45 }, { ekUsd: 60 }, { ekUsd: 40.03 }];
  const a = preiseFuerVarianten(vs, { kurs: K, frachtUsd: 10 }), b = preiseFuerVarianten(vs, { kurs: K, frachtUsd: 10, verhaeltnis: 'basis' });
  ist('Basis über der Untergrenze: Basispreis = Einzelregel', [a.varianten[0].preis, a.varianten[0].regel], [preisNeu({ ekUsd: 40, frachtUsd: 10, kurs: K }).preis, 'aufschlag']);
  ist('… «regel» und «basis» geben dieselben Preise', a.varianten.map(v => v.preis), b.varianten.map(v => v.preis));
  ist('… der Mehr-Einstand von 3 Rappen (EK 40.03) kostet nichts', [a.varianten[3].preis, a.varianten[3].regel], [a.varianten[0].preis, 'mindestpreis']);
  ist('… kein Variantenpreis unter der Einzelregel', a.varianten.every(v => v.preis >= v.regelPreis), true);
}
{
  // Reihenfolge der Eingabe ist egal: die Basis ist der kleinste Einstand, nicht der erste Eintrag
  const vs = [{ vid: 'teuer', ekUsd: 20 }, { vid: 'billig', ekUsd: 5 }, { vid: 'mitte', ekUsd: 10 }];
  const r = preiseFuerVarianten(vs, { kurs: K, frachtUsd: 3 });
  ist('Basis ist der kleinste Einstand', [r.basisIndex, r.varianten[r.basisIndex].vid], [1, 'billig']);
  ist('vid bleibt an der Variante, Reihenfolge bleibt', r.varianten.map(v => v.vid), ['teuer', 'billig', 'mitte']);
  const umgekehrt = preiseFuerVarianten([...vs].reverse(), { kurs: K, frachtUsd: 3 });
  const jeVid = x => x.varianten.map(v => `${v.vid}=${v.preis}`).sort();
  ist('Gleiche Preise je vid bei umgekehrter Reihenfolge', jeVid(umgekehrt), jeVid(r));
  // Gleichstand beim Einstand → gleicher Preis
  const g = preiseFuerVarianten([{ ekUsd: 8 }, { ekUsd: 8 }, { ekUsd: 8 }], { kurs: K, frachtUsd: 3 });
  ist('Gleicher Einstand → gleicher Preis, Basis = erste', [new Set(g.varianten.map(v => v.preis)).size, g.basisIndex], [1, 0]);
}
{
  // Fracht je Variante: eine schwerere Variante mit gleichem EK ist teurer (der Einstand zählt, nicht nur der EK)
  const r = preiseFuerVarianten([{ ekUsd: 20, frachtUsd: 5 }, { ekUsd: 20, frachtUsd: 25 }], { kurs: K });
  ist('Fracht je Variante zählt: schwerere Variante ist teurer', r.varianten[1].preis > r.varianten[0].preis, true);
  ist('… Basis ist die mit der kleineren Fracht', r.basisIndex, 0);
  ist('Eigene Fracht schlägt die gemeinsame', preiseFuerVarianten([{ ekUsd: 20, frachtUsd: 5 }], { kurs: K, frachtUsd: 99 }).varianten[0].frachtUsd, 5);
  ist('CJ-Feld variantSellPrice wird als EK gelesen', preiseFuerVarianten([{ variantSellPrice: 10 }], { kurs: K, frachtUsd: 5 }).varianten[0].preis, 18.9);
  ist('ekUsd geht vor variantSellPrice', preiseFuerVarianten([{ ekUsd: 20, variantSellPrice: 10 }], { kurs: K, frachtUsd: 10 }).varianten[0].ekUsd, 20);
  ist('Spanne in einer Variante: Flagge am Produkt', preiseFuerVarianten([{ ekUsd: '5 -- 6' }], { kurs: K, frachtUsd: 3 }).flaggen, ['spanne']);
  ist('Stück: Preis je Stück an jeder Variante', preiseFuerVarianten([{ ekUsd: 10 }, { ekUsd: 30 }], { kurs: K, frachtUsd: 10, stueck: 10 }).varianten.map(v => v.preisProStueck), [2.49, 4.99]);
}
{
  // Ungültige Varianten: die gültigen werden trotzdem gepreist, das Ganze ist nicht ok; ungültige sind nie die Basis
  const r = preiseFuerVarianten([{ vid: 'x' }, { vid: 'y', ekUsd: 5 }, { vid: 'z', ekUsd: 'abc' }, { vid: 'w', ekUsd: 8 }], { kurs: K, frachtUsd: 2 });
  ist('Teilweise ungültig: ok:false, Indizes, Basis unter den gültigen', [r.ok, r.ungueltig, r.basisIndex], [false, [0, 2], 1]);
  ist('… die gültigen haben Preise, die ungültigen nicht', r.varianten.map(v => v.preis !== null), [false, true, false, true]);
  ist('… Grund nennt die Zahl', r.grund, '2 von 4 Varianten ohne gültigen Einstand');
  ist('Fracht fehlt überall → keine Variante preisbar', [preiseFuerVarianten([{ ekUsd: 5 }, { ekUsd: 6 }], { kurs: K }).ok, preiseFuerVarianten([{ ekUsd: 5 }], { kurs: K }).basisIndex], [false, null]);
  ist('Kurs fehlt → nichts gepreist', preiseFuerVarianten([{ ekUsd: 5 }], { frachtUsd: 2 }).varianten[0].preis, null);
  for (const [n, v] of [['leere Liste', []], ['null', null], ['undefined', undefined], ['kein Array', { ekUsd: 5 }], ['Text', 'abc']]) {
    const x = preiseFuerVarianten(v, { kurs: K, frachtUsd: 2 });
    ist(`Varianten ungültig: ${n}`, [x.ok, x.grund, x.minPreis], [false, 'keine Varianten', null]);
  }
  ist('Elemente null/Text in der Liste → ungültig, kein Absturz', preiseFuerVarianten([null, 'x', { ekUsd: 5 }], { kurs: K, frachtUsd: 2 }).ungueltig, [0, 1]);
  ist('Ohne Optionen: kein Absturz', preiseFuerVarianten([{ ekUsd: 5 }]).ok, false);
  const eingefroren = Object.freeze([Object.freeze({ vid: 'a', ekUsd: 5 }), Object.freeze({ vid: 'b', ekUsd: 9 })]);
  ist('Eingefrorene Eingabe wird nicht verändert', preiseFuerVarianten(eingefroren, Object.freeze({ kurs: K, frachtUsd: 2 })).ok, true);
}
{
  // Marge-Warnung am Produkt, wenn eine Variante unter 30 % fällt (eigener Aufschlag 1,25): die teurere Variante wird nach dem Basis-Verhältnis berechnet
  const r = preiseFuerVarianten([{ ekUsd: 20 }, { ekUsd: 30 }], { kurs: K, frachtUsd: 10, aufschlag: 1.25 });
  ist('Aufschlag 1,25 → Warnung an den Varianten und am Produkt', [r.varianten.map(v => v.flaggen.includes('marge_unter_30')), r.flaggen.includes('marge_unter_30')], [[true, true], true]);
  ist('… Preis nicht angehoben', r.varianten[0].preis, aufrunden90(24.73 * 1.25));
  ist('Gegenprobe: Standardaufschlag → keine Warnung', preiseFuerVarianten([{ ekUsd: 20 }, { ekUsd: 30 }], { kurs: K, frachtUsd: 10 }).flaggen.includes('marge_unter_30'), false);
}

// Eigenschaftstest mit festem Zufall: viele Produkte, beide Betriebsarten, zwei Kurse.
// «regel» darf bis zu eine Stufe unter der Einzelregel liegen: die Einzelregel rechnet mit den auf Rappen gerundeten Kosten der Variante, preisFuer() mit Basis-Kosten + Mehr-Einstand (±0.5 Rappen Unterschied).
{
  let s = 123456789;
  const zufall = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const logEk = () => Math.round(Math.exp(Math.log(0.2) + zufall() * (Math.log(90) - Math.log(0.2))) * 100) / 100;
  const schlecht = { monoton: 0, basis: 0, minimum: 0, untergrenze: 0, marge: 0, regelUnter: 0, mindest: 0, gleich: 0, stufe: 0, basisBilliger: 0, ungleich: 0 };
  let produkte = 0, varianten = 0;
  for (let i = 0; i < 3000; i++) {
    const n = 1 + Math.floor(zufall() * 25), kurs = i % 2 ? 0.9 : K;
    const proVariante = zufall() < 0.5;
    const vs = Array.from({ length: n }, (_, j) => ({ vid: `v${j}`, ekUsd: logEk(), ...(proVariante ? { frachtUsd: Math.round((0.5 + zufall() * 30) * 100) / 100 } : {}) }));
    const fracht = Math.round((0.5 + zufall() * 30) * 100) / 100;
    const beide = {};
    for (const verhaeltnis of ['regel', 'basis']) {
      const r = preiseFuerVarianten(vs, { kurs, frachtUsd: fracht, verhaeltnis });
      beide[verhaeltnis] = r;
      produkte++; varianten += n;
      if (!r.ok) { schlecht.basis++; continue; }
      const sortiert = [...r.varianten].sort((a, b) => a.einstandUsd - b.einstandUsd);
      for (let j = 1; j < sortiert.length; j++) if (sortiert[j].preis < sortiert[j - 1].preis) schlecht.monoton++;
      const basis = r.varianten[r.basisIndex];
      const einzel = preisNeu({ ekUsd: basis.ekUsd, frachtUsd: basis.frachtUsd, kurs });
      if (basis.preis !== einzel.preis) schlecht.basis++;
      if (r.minPreis !== basis.preis) schlecht.minimum++;
      if (r.varianten.some(v => v.preis < PREIS_MIN)) schlecht.untergrenze++;
      if (r.varianten.some(v => !margeErreicht(v.marge, MARGE_WARN))) schlecht.marge++;
      // unter der Einzelregel liegt eine Variante nur, wenn ihr Mehr-Einstand höchstens 5 Rappen beträgt (Regel von preisFuer) — dann kostet sie genau so viel wie die Basis
      if (verhaeltnis === 'basis' && r.varianten.some(v => v.preis < v.regelPreis && !(v.preis === basis.preis && (v.einstandUsd - basis.einstandUsd) * kurs <= 0.05 + 1e-9))) schlecht.regelUnter++;
      if (r.varianten.some(v => v.preis < basis.preis)) schlecht.mindest++;
      for (let j = 1; j < sortiert.length; j++) if (Math.abs(sortiert[j].einstandUsd - sortiert[j - 1].einstandUsd) < 1e-12 && sortiert[j].preis !== sortiert[j - 1].preis) schlecht.gleich++;
      // Verhältnis 'regel': nie mehr als eine Preisstufe (1.00) unter der Einzelregel — Rappen-Rundung der Kosten, siehe Kommentar oben
      if (verhaeltnis === 'regel' && r.varianten.some(v => v.preis < v.regelPreis - 1 - 1e-9)) schlecht.stufe++;
      // 'basis' ist nie billiger als 'regel'
    }
    if (beide.regel.ok && beide.basis.ok) {
      if (beide.regel.varianten.some((v, j) => v.preis > beide.basis.varianten[j].preis)) schlecht.basisBilliger++;
      if (beide.regel.varianten[beide.regel.basisIndex].regel !== 'untergrenze' && beide.regel.varianten.some((v, j) => v.preis !== beide.basis.varianten[j].preis)) schlecht.ungleich++;
    }
  }
  ist(`Eigenschaften über ${produkte} Produkte / ${varianten} Varianten: Preis steigt monoton mit dem Einstand`, schlecht.monoton, 0);
  ist('… Basis-Preis = Einzelregel der Basis', schlecht.basis, 0);
  ist('… Mindestpreis = Preis der Basis', schlecht.minimum, 0);
  ist('… nie unter der Untergrenze', schlecht.untergrenze, 0);
  ist('… keine Variante unter 30 % Marge', schlecht.marge, 0);
  ist('… keine Variante billiger als die Basis', schlecht.mindest, 0);
  ist('… gleicher Einstand → gleicher Preis', schlecht.gleich, 0);
  ist('… Vorgabe «basis»: unter der Einzelregel nur bei höchstens 5 Rappen Mehr-Einstand (dann = Basispreis)', schlecht.regelUnter, 0);
  ist('… Vorgabe «regel»: höchstens eine Preisstufe unter der Einzelregel', schlecht.stufe, 0);
  ist('… «regel» ist nie teurer als «basis»', schlecht.basisBilliger, 0);
  ist('… Basis über der Untergrenze: «regel» und «basis» geben dieselben Preise', schlecht.ungleich, 0);
}

// ─────────────────────────── Aufbau: nichts nachgebaut ───────────────────────────
{
  const quelle = readFileSync(new URL('./grind_preis.mjs', import.meta.url), 'utf8');
  ist('aufrunden90 und preisFuer kommen aus cj_varianten.mjs', /import \{[^}]*\baufrunden90\b[^}]*\bpreisFuer\b[^}]*\} from '\.\/cj_varianten\.mjs'/.test(quelle), true);
  ist('Gegenprobe: keine eigene Kopie von aufrunden90 / preisFuer', /function\s+(aufrunden90|preisFuer)\b/.test(quelle), false);
  ist('Keine Netz- und Dateizugriffe in der Lib', /\b(fetch|readFileSync|writeFileSync|process\.env|child_process)\b/.test(quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false);
}
// Schwellen gegen die Quelle, sobald mengenrabatt.mjs im Repo liegt (heute noch im Zweig des Mengenrabatts: dann wird übersprungen)
if (existsSync(new URL('./mengenrabatt.mjs', import.meta.url))) {
  const m = await import('./mengenrabatt.mjs');
  ist('Schwellen wie in mengenrabatt.mjs (STUFEN)', { a: m.STUFEN.a.margeMin, b: m.STUFEN.b.margeMin }, MENGENRABATT_MARGE);
  ist('Warnschwelle wie MARGE_ZIEL_MIN in mengenrabatt.mjs', m.MARGE_ZIEL_MIN, MARGE_WARN);
} else console.log('  (Info: mengenrabatt.mjs liegt hier noch nicht im Repo — Schwellen-Abgleich übersprungen)');

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
