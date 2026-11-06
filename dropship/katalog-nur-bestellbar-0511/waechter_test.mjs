// Test für waechter_kern.mjs (reine Rechnung, kein Netz): jede Regel mit einem Fall, der sie auslöst, und einem, der sie nicht auslöst; Schwellen an den Grenzen.
//   node dropship/katalog-nur-bestellbar-0511/waechter_test.mjs
import { bewerten, exitCode, GRENZE, WARNSCHWELLE, ALTER_TAGE, TAG } from './waechter_kern.mjs';

let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const JETZT = new Date('2026-11-06T12:00:00Z');
const karte = { schemaVersion: 1, modelle: { 19: [[1320, 'White', '11 oz'], [4830, 'White', '15 oz']], 71: [[4011, 'Black', 'S'], [4012, 'Black', 'M']], 574: [[20898, 'Black', '10']] } };
const ausb = (stand = '2026-11-05', modelle = [574], varianten = {}) => ({ schemaVersion: 1, stand, modelle, varianten });
const angebot = (vid, produkt = 'P1', available = true) => ({ printfulVariantId: String(vid), shopifyProductId: produkt, variantId: String(vid) + '0', available });
const normal = () => ({ angebote: [angebot(1320, 'P1'), angebot(4011, 'P2'), angebot(4012, 'P2')], karte, ausblenden: ausb(), sammlung: { anzahl: 18, getaggt: 2 }, jetzt: JETZT });
const codes = (e) => e.befunde.map((b) => b.code).sort();
const mit = (aend) => { const e = normal(); aend(e); return bewerten(e); };

// 1. Normalfall
{
  const e = bewerten(normal());
  gleich([e.stufe, codes(e)], ['OK', []], 'Normalfall: alles in Ordnung');
  gleich(e.zahlen, { angebote: 3, produkteMitAngebot: 2, sammlung: 18, getaggt: 2, sichtbareModelle: 2, bestellbareAusfuehrungen: 3 }, 'Normalfall: Zahlen (2 Modelle, 3 Ausführungen)');
  gleich([exitCode('OK'), exitCode('WARNUNG'), exitCode('ALARM')], [0, 3, 4], 'Exitcodes');
}
// 2. Sammlung an den Grenzen
gleich([GRENZE, WARNSCHWELLE, ALTER_TAGE, TAG], [50, 45, 14, 'printful_personalized_product'], 'Konstanten');
for (const [anzahl, soll] of [[44, []], [45, ['sammlung-nah-an-grenze']], [50, ['sammlung-nah-an-grenze']], [51, ['sammlung-ueber-grenze']]]) {
  const e = mit((x) => { x.sammlung.anzahl = anzahl; });
  gleich(codes(e), soll, `Sammlung mit ${anzahl} Produkten`);
  gleich(e.stufe, anzahl > 50 ? 'ALARM' : anzahl >= 45 ? 'WARNUNG' : 'OK', `Sammlung mit ${anzahl} Produkten: Stufe`);
}
// 3. Leere Angebotsliste: Alarm nur, wenn es Produkte mit dem Tag gibt oder die Sammlung über der Grenze liegt
{
  const e = mit((x) => { x.angebote = []; x.sammlung = { anzahl: 18, getaggt: 3 }; });
  gleich([e.stufe, codes(e)], ['ALARM', ['keine-angebote']], 'leere Liste bei 3 getaggten Produkten: Alarm');
  const e2 = mit((x) => { x.angebote = []; x.sammlung = { anzahl: 60, getaggt: 0 }; });
  gleich([e2.stufe, codes(e2).includes('keine-angebote'), codes(e2).includes('sammlung-ueber-grenze')], ['ALARM', true, true], 'leere Liste bei Sammlung über der Grenze: Alarm (auch ohne getaggte Produkte)');
  const e3 = mit((x) => { x.angebote = []; x.sammlung = { anzahl: 5, getaggt: 0 }; });
  ok(!codes(e3).includes('keine-angebote'), 'leere Liste ohne getaggte Produkte: kein Alarm (der ehrliche Satz im Fenster stimmt)');
  const e4 = mit((x) => { x.angebote = []; x.sammlung = { anzahl: null, getaggt: null }; });
  ok(!codes(e4).includes('keine-angebote'), 'leere Liste bei unbekannter Sammlung: kein Alarm (nichts zu belegen)');
  const e5 = mit((x) => { x.angebote = []; x.sammlung = { anzahl: 18, getaggt: 3 }; });
  ok(!codes(e5).includes('produkt-ohne-angebot'), 'leere Liste: kein zweiter Befund «Produkt ohne Angebot» daneben');
}
// 4. Sichtbarkeit wie im JS: Zusatzschutz, available, Karte
{
  const e = mit((x) => { x.angebote = [angebot(20898, 'P3')]; x.sammlung.getaggt = 1; });
  gleich([e.stufe, codes(e), e.zahlen.sichtbareModelle], ['ALARM', ['angebot-ausgeblendet', 'sichtbar-null'], 0], 'nur Angebote auf einem ausgeblendeten Modell: Hinweis und Alarm «sichtbar-null»');
  const e2 = mit((x) => { x.ausblenden = ausb('2026-11-05', [], { 71: [4011, 4012] }); });
  gleich([e2.zahlen.sichtbareModelle, e2.zahlen.bestellbareAusfuehrungen, codes(e2)], [1, 1, ['angebot-ausgeblendet']], 'ausgeblendete Varianten zählen nicht');
  const e3 = mit((x) => { x.angebote = [angebot(1320, 'P1', false), angebot(4011, 'P2')]; });
  gleich([e3.zahlen.sichtbareModelle, e3.zahlen.bestellbareAusfuehrungen], [1, 1], 'ein nicht lieferbares Angebot macht die Ausführung unsichtbar');
  const e4 = mit((x) => { x.angebote = [angebot(1320, 'P1', false), angebot(1320, 'P1b', true)]; });
  gleich(e4.zahlen.bestellbareAusfuehrungen, 1, 'zwei Angebote für dieselbe Ausführung, eines lieferbar: die Ausführung ist bestellbar');
  const e5 = mit((x) => { x.angebote = [angebot(1320, 'P1', false)]; x.sammlung.getaggt = 1; });
  gleich([e5.stufe, codes(e5)], ['ALARM', ['sichtbar-null']], 'alle Angebote nicht lieferbar: Alarm «sichtbar-null»');
  const e6 = mit((x) => { x.angebote.push(angebot(99999, 'P9')); });
  gleich([e6.stufe, codes(e6)], ['WARNUNG', ['angebot-ohne-karte']], 'Angebot auf einer Variante ohne Karteneintrag: Warnung');
  ok(/99999/.test(e6.befunde[0].text), 'Angebot ohne Karte: nennt die Variantennummer');
}
// 5. Zusatzschutz-Datei
for (const [stand, soll] of [['2026-11-05', []], ['2026-10-23', []], ['2026-10-22', ['ausblenden-veraltet']], ['kaputt', ['ausblenden-veraltet']], [undefined, ['ausblenden-veraltet']]]) {
  const e = mit((x) => { x.ausblenden = ausb(stand); if (stand === undefined) delete x.ausblenden.stand; });
  gleich(codes(e), soll, `Zusatzschutz mit Stand ${stand}`);
}
gleich(codes(mit((x) => { x.ausblenden = null; })), ['ausblenden-fehlt'], 'Zusatzschutz-Datei fehlt: Warnung');
gleich(codes(mit((x) => { x.karte = null; })), ['karte-fehlt'], 'Variantenkarte fehlt: Warnung');
// 6. Produkte mit Tag ohne Angebot
{
  const e = mit((x) => { x.sammlung = { anzahl: 18, getaggt: 5 }; });
  gleich([e.stufe, codes(e)], ['WARNUNG', ['produkt-ohne-angebot']], '5 getaggte Produkte, 2 mit Angebot: Warnung');
  ok(/3 von 5/.test(e.befunde[0].text), 'Produkt ohne Angebot: nennt 3 von 5');
  gleich(codes(mit((x) => { x.sammlung = { anzahl: 18, getaggt: 2 }; })), [], '2 getaggte Produkte, 2 mit Angebot: kein Befund');
}
// 7. Stufen und Abbruchfreiheit bei fehlenden Eingaben
{
  const e = bewerten({ jetzt: JETZT });
  gleich([e.stufe, codes(e)], ['WARNUNG', ['ausblenden-fehlt', 'karte-fehlt']], 'ohne jede Eingabe: nur die zwei Warnungen, kein Absturz');
  const e2 = bewerten({ angebote: [angebot(1320, 'P1'), angebot(4011, 'P2')], karte, ausblenden: ausb(), sammlung: { anzahl: '18', getaggt: '2' }, jetzt: JETZT });
  gleich(e2.stufe, 'OK', 'Zahlen als Zeichenketten werden gelesen');
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
