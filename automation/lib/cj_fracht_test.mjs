// Tests für lib/cj_fracht.mjs: reine Auswertung von logistic/freightCalculate + dünne Netzfunktionen mit Attrappe (kein echtes Netz, kein echtes Warten).
// Lauf: /opt/node22/bin/node automation/lib/cj_fracht_test.mjs
// Die Antwortformen sind die ECHTEN vom 26.10.2026 (/tmp/grind2/raw/21…36, /tmp/mr/pruefung/cj_phase2.json): gleiche Felder, gleiche Namen und Preise.
// Gegenproben in BEIDE Richtungen; die Zusammenfassung steht am ENDE.
import { existsSync, readFileSync } from 'node:fs';
import {
  FRACHT_PUNKTE, FRACHT_URL, PAUSE_MS, USD_CHF, frachtAnfrage, frachtAuswerten, frachtFuerKosten, frachtHolen, frachtProdukt, landekostenChf, ledgerGrund,
  linienArt, parseTage, punkteMerken, punkteStand, waehleMessvarianten, messKlassen, messPlan, frachtJeVariante, frachtKeineZahlGrund,
} from './cj_fracht.mjs';
import { lieferurteil } from './lieferbarkeit.mjs';
import { ledgerGedaechtnis } from './varianten_sicherheit.mjs';
import { preisFuer } from './cj_varianten.mjs';
import { USD_CHF as USD_CHF_ABGLEICH } from './auswahl_abgleich.mjs';

let bestanden = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) bestanden++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const wirft = (name, fn, muster) => {
  let msg = null;
  try { fn(); } catch (e) { msg = String(e.message); }
  ist(name, msg !== null && muster.test(msg), true);
  if (msg === null || !muster.test(msg)) console.log('     Meldung:', msg);
};
const wirftAsync = async (name, fn, muster) => {
  let msg = null;
  try { await fn(); } catch (e) { msg = String(e.message); }
  ist(name, msg !== null && muster.test(msg), true);
  if (msg === null || !muster.test(msg)) console.log('     Meldung:', msg);
};

// ---------------------------------------------------------------- echte Antwortformen
// Eine echte Linie (Bett, «CJPacket Ordinary F»): alle 42 Felder, fast alle null.
const VORLAGE = JSON.parse('{"logisticAging":"5-12","logisticPrice":20.09,"logisticPriceCn":124.5,"logisticName":"CJPacket Ordinary F","channelId":null,"error":null,"errorEn":null,"optionId":null,"postage":null,"postageCNY":null,"priceIncreases":null,"reSort":null,"remoteFee":null,"remoteFeeCNY":null,"tip":null,"orderId":null,"unWeightChargeTarget":null,"volumeWeight":null,"floatMaxPrice":null,"floatMinPrice":null,"logisticsParamRespDTO":null,"message":null,"wrapPostage":null,"wrapPostageCNY":null,"wrapWeight":null,"ruleTipTypes":null,"stopWords":null,"channel":null,"cjRespDTO":null,"destArea":null,"srcArea":null,"option":null,"zonePrice":[],"allRuleTips":null,"ruleTips":null,"taxesFee":0,"clearanceOperationFee":0,"recommendLogisticsTypeList":[],"timePrioritySort":null,"pricePrioritySort":null,"compositeRecommendSort":null,"totalPostageFee":20.09}');
const linie = ([name, preis, aging], extra = {}) => ({ ...VORLAGE, logisticName: name, logisticPrice: preis, logisticPriceCn: Math.round(preis * 6.2 * 100) / 100, logisticAging: aging, totalPostageFee: preis, ...extra });
const PUNKTE = { total: 70171, usedToday: 100090, remaining: 35409 };
const gut = (zeilen, punkte = PUNKTE) => ({ code: 200, result: true, message: 'Success', data: zeilen.map(z => linie(z)), requestId: 'a48c25a889af4451b520f7ba8d38a79a', pointsInfo: punkte, success: true });
const LEER = (punkte = PUNKTE) => ({ code: 200, result: true, message: 'Success', data: [], requestId: 'a48c25a889af4451b520f7ba8d38a79a', pointsInfo: punkte, success: true });
const FEHLER_1602000 = { code: 1602000, result: false, message: 'Variant not found, vid: 0000000000000000000', data: null, requestId: '0d3d233c1c464b37b9b745190dc8702c', pointsInfo: { total: 70171, usedToday: 100490, remaining: 35297 }, success: false };

const BETT_1250 = [['CJPacket Ordinary F', 20.09, '5-12'], ['CJPacket EQ Ordinary', 20.51, '5-9'], ['CJPacket Ordinary VIP', 19.99, '7-10'], ['CJPacket EQ Sensitive', 23.13, '6-10'], ['CJPacket YT Ordinary', 23.29, '9-10'], ['YunExpress Ordinary', 25.32, '8-15'], ['CJPacket Sensitive', 26.72, '5-10'], ['YunExpress Sensitive', 29.09, '8-17'], ['CJPacket Eub', 28.02, '12-50'], ['CJPacket Sensitive Pro', 31.88, '15-35'], ['CJPacket Ordinary', 28.43, '5-11'], ['CJPacket Liquid Line', 28.48, '5-10'], ['CJPacket Fast Ordinary', 29.18, '5-8'], ['PostNL', 34.32, '15-45'], ['CJPacket Postal', 36.23, '12-50'], ['DHL Official', 49.59, '3-7']];
const WARENKORB = [['CJPacket EQ Ordinary', 30.59, '5-9'], ['CJPacket Ordinary VIP', 29.81, '7-10'], ['CJPacket Ordinary F', 31.11, '5-12'], ['CJPacket EQ Sensitive', 34.72, '6-10'], ['CJPacket YT Ordinary', 36.69, '9-10'], ['YunExpress Ordinary', 39.88, '8-15'], ['CJPacket Sensitive', 41.68, '5-10'], ['CJPacket Sensitive Pro', 49.5, '15-35'], ['CJPacket Fast Ordinary', 44.29, '5-8'], ['CJPacket Ordinary', 44.8, '5-11'], ['DHL Official', 65.34, '3-7']];
const LEICHT_320 = [['CJPacket EQ Ordinary', 9.02, '5-9'], ['CJPacket Ordinary VIP', 8.79, '7-10'], ['CJPacket Ordinary F', 9.17, '5-12'], ['CJPacket YT Ordinary', 9.29, '9-10'], ['YunExpress Ordinary', 10.09, '8-15'], ['CJPacket EQ Sensitive', 9.69, '6-10'], ['YunExpress Sensitive', 10.74, '8-17'], ['CJPacket Sensitive', 10.16, '5-10'], ['CJPacket Ordinary', 10.32, '5-11'], ['CJPacket Eub', 10.77, '12-50'], ['CJPacket Liquid Line', 10.88, '5-10'], ['CJPacket Sensitive Pro', 12.38, '15-35'], ['CJPacket Fast Ordinary', 11.15, '5-8'], ['CJPacket Postal', 12.6, '12-50'], ['PostNL', 13.62, '15-45'], ['DHL Official', 37.19, '3-7']];
const LOETPASTE = [['CJPacket EQ Sensitive', 5.14, '6-10'], ['CJPacket Liquid Line', 5.49, '5-10'], ['CJPacket Sensitive Pro', 6.4, '15-35']];      // keine «Ordinary»-Linie (Grund am Datenblatt nicht geprüft)
const ROBOTER = [['CJPacket EQ Sensitive', 12.18, '6-10'], ['YunExpress Sensitive', 14.07, '8-17'], ['PostNL', 15.12, '15-45'], ['CJPacket Sensitive', 16.61, '5-10'], ['CJPacket Sensitive Pro', 19.97, '15-35'], ['CJPacket Liquid Line', 17.74, '5-10'], ['CJPacket Postal', 21.8, '12-50']];   // ferngesteuert mit Sound/Licht: nur PostNL und Postal ohne Sonderkennzeichen

// ================================================================ 1. Echte Antworten
{
  const r = frachtAuswerten(gut(BETT_1250), { status: 200, vid: '0DE470C5-7660-461A-8E48-88E774FC08C9' });
  ist('Bett 1250 g: lieferbar', [r.lieferbar, r.urteil, r.unbekannt, r.tag], [true, 'lieferbar', false, null]);
  ist('Bett: 16 Linien, nichts verworfen', [r.linien.length, r.verworfen], [16, 0]);
  ist('Bett: günstigste normale Linie = 19.99 «CJPacket Ordinary VIP»', [r.guenstigsteUsd, r.guenstigsteLinie], [19.99, 'CJPacket Ordinary VIP']);
  ist('Bett: günstigste Sonderlinie = 23.13 (EQ Sensitive), nicht nur Sensitive', [r.guenstigsteSensitivUsd, r.nurSensitiv], [23.13, false]);
  ist('Bett: Linien aufsteigend nach Preis', r.linien.map(l => l.preisUsd), [...BETT_1250.map(z => z[1])].sort((a, b) => a - b));
  ist('Bett: erste Linie ganz', r.linien[0], { name: 'CJPacket Ordinary VIP', preisUsd: 19.99, tage: { min: 7, max: 10 }, art: 'normal' });
  ist('Bett: 5 Sonderlinien (4 × Sensitive, 1 × Liquid), 11 normale', [r.linien.filter(l => l.art === 'sensitiv').length, r.linien.filter(l => l.art === 'normal').length], [5, 11]);
  ist('Bett: «DHL Official» (3-7 Tage) ist die teuerste, aber normal', r.linien.at(-1), { name: 'DHL Official', preisUsd: 49.59, tage: { min: 3, max: 7 }, art: 'normal' });
  ist('Bett: Grund und Tag kommen aus lieferbarkeit.mjs', r.grund, lieferurteil({ cjCode: 200, vid: 'x', linien: 16 }).grund);
}
{
  const r = frachtAuswerten(gut(WARENKORB), { status: 200 });
  ist('Warenkorb (11 Linien, 5 weniger als beim Einzelstück): lieferbar, 29.81', [r.lieferbar, r.linien.length, r.guenstigsteUsd], [true, 11, 29.81]);
}
{
  const leicht = frachtAuswerten(gut(LEICHT_320)), schwer = frachtAuswerten(gut(BETT_1250));
  ist('leichte Variante 320 g: 8.79 USD, 16 Linien', [leicht.guenstigsteUsd, leicht.linien.length], [8.79, 16]);
  ist('die schwere Variante kostet mehr als die leichte (deshalb die SCHWERSTE für Landekosten)', schwer.guenstigsteUsd > leicht.guenstigsteUsd, true);
}
{
  const r = frachtAuswerten(LEER(), { status: 200 });
  ist('LEERE Liste = nicht lieferbar (Luftkühler)', [r.lieferbar, r.urteil, r.unbekannt, r.tag, r.fehler], [false, 'nicht_lieferbar', false, 'cj-nicht-versendbar-ch', undefined]);
  ist('…ohne Linien, ohne Zahl', [r.linien, r.guenstigsteUsd, r.guenstigsteSensitivUsd, r.nurSensitiv], [[], null, null, false]);
  ist('…und nie eine Frachtzahl für die Kosten', frachtFuerKosten(r), null);
}
{
  const r = frachtAuswerten(FEHLER_1602000, { status: 200 });
  ist('Fehler 1602000 = unbekannt, NICHT nicht lieferbar', [r.lieferbar, r.urteil, r.unbekannt, r.tag, r.fehler], [false, 'unbekannt', true, null, 'api-1602000']);
}
{
  const r = frachtAuswerten(gut(LOETPASTE));
  ist('Lötpaste: lieferbar, aber NUR Sonderlinien', [r.lieferbar, r.nurSensitiv, r.guenstigsteUsd, r.guenstigsteSensitivUsd], [true, true, null, 5.14]);
  ist('…ohne Ausweg keine Frachtzahl für die Kosten', frachtFuerKosten(r), null);
  ist('…mit ausdrücklichem Ausweg die Sonderlinie', frachtFuerKosten(r, { sensitivAlsAusweg: true }), 5.14);
}
{
  const r = frachtAuswerten(gut(ROBOTER));
  ist('Roboter: PostNL ist normal → 15.12 für die Kosten, Sonderlinie 12.18 getrennt', [r.nurSensitiv, r.guenstigsteUsd, r.guenstigsteLinie, r.guenstigsteSensitivUsd], [false, 15.12, 'PostNL', 12.18]);
  ist('…der Ausweg greift nur, wenn es KEINE normale Linie gibt', frachtFuerKosten(r, { sensitivAlsAusweg: true }), 15.12);
}

// ================================================================ 2. lieferbar / nicht lieferbar: beide Richtungen
{
  const r = frachtAuswerten(gut([['CJPacket Ordinary VIP', 7.5, '7-10']]));
  ist('GEGENPROBE: eine einzige Linie genügt (wenige Linien sind kein Befund)', [r.lieferbar, r.guenstigsteUsd], [true, 7.5]);
}
for (const [name, data] of [['null', null], ['fehlt', undefined], ['Objekt', {}], ['Text', 'Success'], ['Zahl', 0]]) {
  const a = { code: 200, result: true, message: 'Success', data, pointsInfo: PUNKTE };
  if (data === undefined) delete a.data;
  const r = frachtAuswerten(a, { status: 200 });
  ist(`data ${name}: unbekannt (null ist KEINE leere Liste), nie «nicht lieferbar»`, [r.urteil, r.tag, r.lieferbar, r.fehler], ['unbekannt', null, false, 'format-data']);
}
{
  const kaputt = { code: 200, result: true, message: 'Success', data: [linie(['', 5, '5-9']), linie(['X', null, '5-9']), null, 'text', { logisticPrice: 3 }] };
  const r = frachtAuswerten(kaputt);
  ist('lauter Linien ohne Namen oder Preis: unbekannt (nicht lieferbar wäre geraten)', [r.urteil, r.fehler, r.tag], ['unbekannt', 'format-linien', null]);
}
{
  const r = frachtAuswerten({ code: 200, result: true, data: [linie(['CJPacket Ordinary VIP', 9.99, '7-10']), linie(['Kaputt', null, '5-9'])] });
  ist('GEGENPROBE: eine gute und eine kaputte Linie: lieferbar mit den guten, 1 verworfen', [r.lieferbar, r.linien.length, r.verworfen], [true, 1, 1]);
}
// Preise: die Falle Number(null) === 0
for (const [name, preis] of [['null', null], ['leer', ''], ['0', 0], ['negativ', -3], ['Text', 'abc'], ['Komma', '1,5'], ['NaN', NaN], ['true', true], ['Liste', []]]) {
  const r = frachtAuswerten({ code: 200, result: true, data: [linie(['CJPacket Ordinary VIP', preis, '7-10'])] });
  ist(`Preis ${name}: keine Linie, nie als Preis 0`, [r.urteil, r.guenstigsteUsd, r.linien.length], ['unbekannt', null, 0]);
}
ist('Preis als Text «20.09» wird gelesen', frachtAuswerten({ code: 200, result: true, data: [linie(['A Ordinary', '20.09', '5-9'])] }).guenstigsteUsd, 20.09);
ist('totalPostageFee höher als logisticPrice (Gebühren): der höhere Wert gilt',
  frachtAuswerten({ code: 200, result: true, data: [linie(['A Ordinary', 20, '5-9'], { totalPostageFee: 21.5, taxesFee: 1.5 })] }).guenstigsteUsd, 21.5);
ist('GEGENPROBE: totalPostageFee kleiner oder fehlend: logisticPrice gilt',
  [frachtAuswerten({ code: 200, result: true, data: [linie(['A Ordinary', 20, '5-9'], { totalPostageFee: 5 })] }).guenstigsteUsd,
    frachtAuswerten({ code: 200, result: true, data: [linie(['A Ordinary', 20, '5-9'], { totalPostageFee: null })] }).guenstigsteUsd], [20, 20]);
ist('Reihenfolge der Antwort ist egal, gleiche Preise sortieren nach Name',
  frachtAuswerten({ code: 200, result: true, data: [linie(['B Ordinary', 5, '5-9']), linie(['A Ordinary', 5, '5-9']), linie(['C Ordinary', 4, '5-9'])] }).linien.map(l => l.name), ['C Ordinary', 'A Ordinary', 'B Ordinary']);

// Linienart und Tage
ist('Linienart: Sensitive/Liquid → sensitiv', ['CJPacket Sensitive', 'CJPacket EQ Sensitive', 'YunExpress Sensitive', 'CJPacket Sensitive Pro', 'CJPacket Liquid Line'].map(linienArt), Array(5).fill('sensitiv'));
ist('Linienart GEGENPROBE: Ordinary, Eub, Postal, PostNL, DHL → normal', ['CJPacket Ordinary F', 'CJPacket EQ Ordinary', 'CJPacket Eub', 'CJPacket Postal', 'PostNL', 'DHL Official', 'CJPacket Fast Ordinary'].map(linienArt), Array(7).fill('normal'));
ist('Linienart: Gross-/Kleinschreibung egal, leer → normal', [linienArt('cjpacket SENSITIVE'), linienArt(''), linienArt(null)], ['sensitiv', 'normal', 'normal']);
ist('Tage «5-12»', parseTage('5-12'), { min: 5, max: 12 });
ist('Tage «7» einzeln', parseTage('7'), { min: 7, max: 7 });
ist('Tage «5 – 9» mit Gedankenstrich und Leerzeichen', parseTage('5 – 9'), { min: 5, max: 9 });
ist('Tage GEGENPROBE: Unsinn → null, nie geraten', [parseTage(''), parseTage(null), parseTage('bald'), parseTage('12-5'), parseTage('5-')], [null, null, null, null, null]);
ist('Linie mit unlesbarer Laufzeit hat keinen Schlüssel «tage»', 'tage' in frachtAuswerten({ code: 200, result: true, data: [linie(['A Ordinary', 5, 'bald'])] }).linien[0], false);

// ================================================================ 3. Fehler: JEDER ist unbekannt, nie lieferbar, nie «nicht lieferbar»
const FEHLERFAELLE = [
  ['HTTP 429', { message: 'Too many requests' }, { status: 429 }, 'drosselung'],
  ['HTTP 500', { message: 'Server Error' }, { status: 500 }, 'http-500'],
  ['HTTP 503', null, { status: 503 }, 'http-503'],
  ['HTTP 404', { code: 404 }, { status: 404 }, 'http-404'],
  ['HTTP 200 mit 429-Text im Körper: kein Sonderfall', { result: false, code: 1600200, message: 'Too many requests' }, { status: 200 }, 'drosselung'],
  ['Punkte erschöpft (Meldung)', { result: false, code: 16900500, message: 'Insufficient API points. Used today: 68875' }, { status: 200 }, 'quota'],
  ['Punkte erschöpft MIT HTTP 429', { result: false, message: 'Insufficient api points' }, { status: 429 }, 'quota'],
  ['API-Code 1602000', FEHLER_1602000, { status: 200 }, 'api-1602000'],
  ['API-Code 1602001/2', { result: false, code: 1602002, message: 'Product has been removed from shelves' }, {}, 'api-1602002'],
  ['kein result', { code: 200, data: [] }, {}, 'api-200'],
  ['result true, Code 500', { code: 500, result: true, data: [linie(['A Ordinary', 5, '5-9'])] }, {}, 'format-code'],
  ['result true ohne Code', { result: true, data: [linie(['A Ordinary', 5, '5-9'])] }, {}, 'format-code'],
  ['null', null, {}, 'format-antwort'],
  ['undefined', undefined, {}, 'format-antwort'],
  ['Liste statt Objekt', [], {}, 'format-antwort'],
  ['Text', 'Success', {}, 'format-antwort'],
];
for (const [name, antwort, opt, fehler] of FEHLERFAELLE) {
  const r = frachtAuswerten(antwort, opt);
  ist(`Fehlerfall «${name}»: unbekannt, nie lieferbar, nie nicht lieferbar (${fehler})`,
    [r.urteil, r.lieferbar, r.unbekannt, r.tag, r.fehler, r.guenstigsteUsd, r.linien.length, frachtFuerKosten(r)], ['unbekannt', false, true, null, fehler, null, 0, null]);
}
ist('Fehlerfall: der Code im Fehlertext wird gesäubert (keine Zeilenumbrüche, höchstens 40 Zeichen)',
  frachtAuswerten({ result: false, code: 'a\nb<script>' + 'x'.repeat(100) }).fehler.length <= 'api-'.length + 40, true);

// ================================================================ 4. Punkte
ist('punkteStand: echte pointsInfo', punkteStand(LEER()), PUNKTE);
ist('punkteStand GEGENPROBE: fehlt / kaputt → null', [punkteStand({}), punkteStand(null), punkteStand({ pointsInfo: { remaining: null } }), punkteStand({ pointsInfo: { remaining: 'viel' } })], [null, null, null, null]);
{
  const s = {};
  ist('punkteMerken schreibt in das Zustandsobjekt', [punkteMerken(s, LEER()) !== null, s], [true, PUNKTE]);
  ist('punkteMerken GEGENPROBE: Antwort ohne pointsInfo lässt den Stand unberührt', [punkteMerken(s, { result: true }), s], [null, PUNKTE]);
}
ist('Kosten je Aufruf: 10 Punkte (GEMESSEN)', FRACHT_PUNKTE, 10);

// ================================================================ 5. Landekosten
ist('Landekosten = (EK + Fracht) × Kurs, am Shop belegt: Dusch-Organizer EK 2.62 + «Ordinary F» 6.35 → 7.39 CHF (Shop-Kosten 7.39)', landekostenChf(6.35, 2.62), 7.39);
ist('Landekosten, eigene Rechnung', landekostenChf(10, 5, 0.8), 12);
ist('Landekosten auf Rappen gerundet', landekostenChf(1.234, 1.234, 1), 2.47);
ist('Kurs: derselbe wie preisFuer() und der Abgleich', [USD_CHF, USD_CHF_ABGLEICH], [0.82435, 0.82435]);
ist('Kurs gegen preisFuer() gemessen: Kosten steigen um (20 − 10) × Kurs', preisFuer({ basisPreis: 20, basisKostenChf: 10, ekBasisUsd: 10, ekUsd: 20 }).kostenChf, Math.round((10 + 10 * USD_CHF) * 100) / 100);
ist('GEGENPROBE: fehlende oder unsinnige Angaben → null, NIE 0 und nie nur der EK (Number(null) ist 0)',
  [landekostenChf(null, 5), landekostenChf(undefined, 5), landekostenChf('', 5), landekostenChf(5, null), landekostenChf(5, 0), landekostenChf(5, -1), landekostenChf(-1, 5),
    landekostenChf(5, 5, 0), landekostenChf(5, 5, null), landekostenChf(NaN, 5), landekostenChf(true, 5), landekostenChf(5, '3.44-17.01')], Array(12).fill(null));
ist('Fracht 0 ist als ausdrückliche Zahl erlaubt (kostenfrei), EK als Text «3.5» auch', [landekostenChf(0, 5), landekostenChf(2, '3.5')], [4.12, 4.53]);
ist('frachtFuerKosten: unbekannt und nicht lieferbar liefern nie eine Zahl', [frachtFuerKosten(null), frachtFuerKosten(undefined), frachtFuerKosten(frachtAuswerten(FEHLER_1602000)), frachtFuerKosten(frachtAuswerten(LEER()))], [null, null, null, null]);
ist('frachtFuerKosten: normale Linie → Zahl', frachtFuerKosten(frachtAuswerten(gut(BETT_1250))), 19.99);

// ================================================================ 6. Anfrage: eine vid, nie bündeln
ist('Körper wie in cj_api.md (CN→CH, 1 Stück, eine vid)', frachtAnfrage({ vid: '0DE470C5-7660-461A-8E48-88E774FC08C9' }),
  { startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid: '0DE470C5-7660-461A-8E48-88E774FC08C9' }] });
ist('Körper: Ziffern-vid, Menge 3, Leerzeichen weg', frachtAnfrage({ vid: ' 2607080852561629300 ', menge: 3 }).products, [{ quantity: 3, vid: '2607080852561629300' }]);
ist('Körper: anderes Lager (DE → CH)', frachtAnfrage({ vid: '2112467322870534146', start: 'DE' }).startCountryCode, 'DE');
wirft('vid-Liste (bündeln) wirft', () => frachtAnfrage({ vid: ['0DE470C5-7660-461A-8E48-88E774FC08C9', '241958CB-2B86-49B3-A6B8-E9A07AE88060'] }), /nie bündeln.*eine Liste/);
wirft('vid als Zahl wirft (ab 16 Stellen gehen Ziffern verloren)', () => frachtAnfrage({ vid: 2607080852561629300 }), /nie als Zahl.*number/);
wirft('leere vid wirft', () => frachtAnfrage({ vid: '' }), /vid muss/);
wirft('fehlende vid wirft', () => frachtAnfrage({}), /vid muss/);
wirft('vid mit Anführungszeichen wirft', () => frachtAnfrage({ vid: 'abc"def123' }), /vid muss/);
for (const m of [0, -1, 1.5, '2', 1000, NaN, null]) wirft(`Menge ${JSON.stringify(m)} wirft`, () => frachtAnfrage({ vid: '2607080852561629300', menge: m }), /Menge/);
wirft('Ländercode klein wirft', () => frachtAnfrage({ vid: '2607080852561629300', ziel: 'ch' }), /ziel/);

// ================================================================ 7. Netz mit Attrappe
const antwortObj = (body, status = 200) => ({ status, json: async () => body });
function netz(schritte) {                           // letzter Schritt wiederholt sich; Schritt = Antwort, Error oder Funktion(Körper)
  const log = []; let n = 0;
  const f = async (url, init) => {
    const body = init?.body ? JSON.parse(init.body) : null;
    log.push({ url, methode: init?.method, token: init?.headers?.['CJ-Access-Token'], typ: init?.headers?.['Content-Type'], body });
    const s = schritte[Math.min(n++, schritte.length - 1)];
    const a = typeof s === 'function' ? s(body) : s;
    if (a instanceof Error) throw a;
    return a;
  };
  return { f, log };
}
const VID_A = '0DE470C5-7660-461A-8E48-88E774FC08C9';
const lauf = (n, extra = {}) => { const gewartet = []; return { gewartet, opt: { token: 'T0K', fetch: n.f, warte: ms => { gewartet.push(ms); }, basisMs: 1, versuche: 2, ...extra } }; };

{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n), stand = {};
  const r = await frachtHolen({ ...l.opt, vid: VID_A, stand });
  ist('frachtHolen: eine Anfrage, POST an freightCalculate, Token im Kopf, Körper wie erwartet',
    [n.log.length, n.log[0].url, n.log[0].methode, n.log[0].token, n.log[0].typ, n.log[0].body],
    [1, FRACHT_URL, 'POST', 'T0K', 'application/json', { startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid: VID_A }] }]);
  ist('frachtHolen: Ergebnis lieferbar, günstigste 19.99, vid und Menge im Ergebnis', [r.lieferbar, r.guenstigsteUsd, r.vid, r.menge], [true, 19.99, VID_A, 1]);
  ist('frachtHolen: Punktestand im Ergebnis und im gemeinsamen Zustand', [r.punkte, stand], [PUNKTE, PUNKTE]);
  ist('frachtHolen: Pause NACH dem Aufruf (1,2 s), sonst nichts', l.gewartet, [PAUSE_MS]);
  ist('frachtHolen: ohne Reserve keine Warnung', r.reserveUnterschritten, false);
}
{
  const n = netz([antwortObj(LEER())]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('frachtHolen: leere Liste = nicht lieferbar, kein Fehler, keine Wiederholung', [r.urteil, r.lieferbar, r.unbekannt, n.log.length], ['nicht_lieferbar', false, false, 1]);
  ist('…Ledger-Grund endgültig', ledgerGrund(r), 'keine Versandlinie CN→CH');
}
{
  const n = netz([antwortObj(FEHLER_1602000)]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: '0000000000000000000' });
  ist('frachtHolen: API-Fehler 1602000 wird NICHT geworfen: unbekannt, eine Anfrage', [r.urteil, r.fehler, r.lieferbar, r.tag, n.log.length], ['unbekannt', 'api-1602000', false, null, 1]);
}
{
  const n = netz([antwortObj({ code: 200, result: true, message: 'Success', data: null, pointsInfo: PUNKTE })]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('frachtHolen: Erfolg mit data null: unbekannt (nie «nicht lieferbar»)', [r.urteil, r.fehler, r.tag], ['unbekannt', 'format-data', null]);
}
{
  const n = netz([antwortObj({ result: false, message: 'Not found' }, 404)]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('frachtHolen: HTTP 404 → unbekannt http-404', [r.urteil, r.fehler], ['unbekannt', 'http-404']);
}
{
  const n = netz([new Error('ECONNRESET')]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('frachtHolen: Netz bleibt weg (2 Versuche) → unbekannt netz, nicht geworfen', [r.urteil, r.fehler, n.log.length], ['unbekannt', 'netz', 2]);
}
{
  const n = netz([{ status: 200, json: async () => { throw new Error('Unexpected token <'); } }]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('frachtHolen: Antwort ist kein JSON → unbekannt json', [r.urteil, r.fehler], ['unbekannt', 'json']);
}
{
  const n = netz([antwortObj({ message: 'Too many requests' }, 429), antwortObj(gut(BETT_1250))]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A });
  ist('GEGENPROBE: eine einzelne 429 wird abgewartet (cjFetch), das Produkt wird gemessen', [r.lieferbar, n.log.length], [true, 2]);
}
// Lauf-Fehler werden WEITERGEREICHT (geworfen), nicht als Produktergebnis verschluckt
{
  const n = netz([antwortObj({ message: 'Too many requests' }, 429)]), l = lauf(n);
  await wirftAsync('Dauer-429 → CJ_THROTTLED fliegt', () => frachtHolen({ ...l.opt, vid: VID_A }), /^CJ_THROTTLED/);
  ist('…nach den Versuchen (2), nicht endlos', n.log.length, 2);
}
{
  const n = netz([antwortObj({ message: 'Server Error' }, 503)]), l = lauf(n);
  await wirftAsync('Dauer-503 → CJ_THROTTLED fliegt', () => frachtHolen({ ...l.opt, vid: VID_A }), /^CJ_THROTTLED/);
}
{
  const n = netz([antwortObj({ result: false, message: 'Insufficient API points. Used today: 68875' }), antwortObj(gut(BETT_1250))]), l = lauf(n);
  await wirftAsync('Punkte erschöpft → CJ_QUOTA fliegt', () => frachtHolen({ ...l.opt, vid: VID_A }), /^CJ_QUOTA/);
  ist('…sofort, ohne zweiten Versuch', n.log.length, 1);
}
{
  const n = netz([antwortObj({ result: false, code: 1600200, message: 'Too many requests per second' })]), l = lauf(n);
  await wirftAsync('CJ-Code 1600200 (zu viele Aufrufe je Sekunde) → CJ_THROTTLED fliegt', () => frachtHolen({ ...l.opt, vid: VID_A }), /^CJ_THROTTLED/);
}
{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: ['a', 'b'] });
  ist('frachtHolen: schlechte Eingabe (Liste) sendet NICHTS und urteilt nicht über CJ', [n.log.length, r.urteil, r.fehler, r.punkte, l.gewartet], [0, 'unbekannt', 'anfrage', null, []]);
}
await wirftAsync('frachtHolen ohne Token wirft', () => frachtHolen({ vid: VID_A, fetch: netz([antwortObj(LEER())]).f }), /kein CJ-Token/);

// Reserve (Punkte für den Auswahl-Lauf)
{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n);
  await wirftAsync('Reserve: 5009 − 10 < 5000 → CJ_RESERVE VOR dem Aufruf', () => frachtHolen({ ...l.opt, vid: VID_A, stand: { remaining: 5009 }, reserve: 5000 }), /^CJ_RESERVE/);
  ist('…nichts gesendet', n.log.length, 0);
}
{
  const n = netz([antwortObj(gut(BETT_1250, { total: 70171, usedToday: 1, remaining: 5000 }))]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A, stand: { remaining: 5010 }, reserve: 5000 });
  ist('Reserve GEGENPROBE: 5010 − 10 = 5000 ist erlaubt (Grenze)', [n.log.length, r.lieferbar, r.reserveUnterschritten], [1, true, false]);
}
{
  const n = netz([antwortObj(gut(BETT_1250, { total: 70171, usedToday: 1, remaining: 4999 })), antwortObj(gut(BETT_1250))]), l = lauf(n), stand = {};
  const r = await frachtHolen({ ...l.opt, vid: VID_A, stand, reserve: 5000 });
  ist('Reserve: unbekannter Anfangsstand → der erste Aufruf läuft, das Ergebnis bleibt gültig, aber die Warnung steht', [r.lieferbar, r.reserveUnterschritten, stand.remaining], [true, true, 4999]);
  await wirftAsync('…der nächste Aufruf wird verweigert', () => frachtHolen({ ...l.opt, vid: VID_A, stand, reserve: 5000 }), /^CJ_RESERVE/);
  ist('…und es blieb bei einem Aufruf', n.log.length, 1);
}
{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n);
  const r = await frachtHolen({ ...l.opt, vid: VID_A, stand: { remaining: 3 }, reserve: 0 });
  ist('Reserve 0 = keine Prüfung', [n.log.length, r.lieferbar], [1, true]);
}
{
  const n = netz([antwortObj({ code: 200, result: true, message: 'Success', data: BETT_1250.map(z => linie(z)) })]), l = lauf(n), stand = { remaining: 9999 };
  const r = await frachtHolen({ ...l.opt, vid: VID_A, stand, reserve: 100 });
  ist('Antwort ohne pointsInfo: kein Absturz, Stand unverändert, keine Warnung', [r.lieferbar, r.punkte, stand.remaining, r.reserveUnterschritten], [true, null, 9999, false]);
}

// frachtProdukt
const BETT_VARIANTEN = [['0DE470C5-7660-461A-8E48-88E774FC08C9', 1250], ['241958CB-2B86-49B3-A6B8-E9A07AE88060', 420], ['7F2FB5BD-F6CE-4835-B898-291D0B0E0B13', 520],
  ['7FF80A42-A2E7-4644-A4FD-300DEB34816C', 3600], ['A4A846C4-0CCA-447D-8CD1-5E6D2F1801FB', 320], ['FD26E8A5-F799-415A-814A-B75641992ABA', 2168]].map(([vid, variantWeight]) => ({ vid, variantWeight, variantKey: 'x' }));
const SCHWER = '7FF80A42-A2E7-4644-A4FD-300DEB34816C', LEICHT = 'A4A846C4-0CCA-447D-8CD1-5E6D2F1801FB';
const nurEine = log => log.every(x => x.body.products.length === 1);
{
  const m = waehleMessvarianten(BETT_VARIANTEN);
  ist('Messvarianten: schwerste 3600 g (nicht die erste, nicht die 1250 g), leichteste 320 g', [m.schwerste, m.leichteste], [{ vid: SCHWER, gewichtG: 3600 }, { vid: LEICHT, gewichtG: 320 }]);
  ist('Messvarianten: gewichtG statt variantWeight geht auch, Texte als Gewicht auch',
    waehleMessvarianten([{ vid: 'aaaaaa-1', gewichtG: '50' }, { vid: 'bbbbbb-2', gewichtG: 70 }]).schwerste.vid, 'bbbbbb-2');
  ist('Messvarianten GEGENPROBE: Gleichstand → die erste', [waehleMessvarianten([{ vid: 'aaaaaa-1', gewichtG: 5 }, { vid: 'bbbbbb-2', gewichtG: 5 }]).schwerste.vid, waehleMessvarianten([{ vid: 'aaaaaa-1', gewichtG: 5 }, { vid: 'bbbbbb-2', gewichtG: 5 }]).leichteste.vid], ['aaaaaa-1', 'aaaaaa-1']);
  const o = waehleMessvarianten([{ vid: 'aaaaaa-1' }, { vid: 'bbbbbb-2', variantWeight: 0 }, { vid: 'cccccc-3', variantWeight: null }]);
  ist('Messvarianten: ganz ohne Gewicht → die erste, ehrlich als «Gewicht unbekannt» markiert', [o.schwerste.vid, o.gewichtUnbekannt], ['aaaaaa-1', true]);
  const g = waehleMessvarianten([{ vid: 'aaaaaa-1' }, { vid: 'bbbbbb-2', variantWeight: 40 }]);
  ist('Messvarianten: teils ohne Gewicht → gewogene zählen, die ohne werden mitgezählt', [g.schwerste.vid, g.ohneGewicht], ['bbbbbb-2', 1]);
  ist('Messvarianten: Zahl als vid, leere vid, null fallen weg; nichts übrig → null',
    waehleMessvarianten([{ vid: 2607080852561629300, variantWeight: 10 }, { vid: '', variantWeight: 10 }, null, {}]).schwerste, null);
  ist('Messvarianten: keine Liste → null', [waehleMessvarianten(undefined).schwerste, waehleMessvarianten('x').schwerste], [null, null]);
}
{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n), stand = {};
  const r = await frachtProdukt({ ...l.opt, stand, varianten: BETT_VARIANTEN });
  ist('frachtProdukt: lieferbar → EINE Anfrage, mit der schwersten Variante', [n.log.length, n.log[0].body.products[0].vid, r.lieferbar, r.gemessen, r.teilweise], [1, SCHWER, true, [SCHWER], false]);
  ist('frachtProdukt: schwerste im Ergebnis', r.schwerste, { vid: SCHWER, gewichtG: 3600, urteil: 'lieferbar', lieferbar: true, guenstigsteUsd: 19.99 });
  ist('frachtProdukt: Punkte und Pause', [r.punkte, l.gewartet], [PUNKTE, [PAUSE_MS]]);
}
{
  const n = netz([b => antwortObj(b.products[0].vid === SCHWER ? LEER() : gut(LEICHT_320))]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN });
  ist('frachtProdukt: schwerste ohne Linie, leichteste mit → lieferbar, TEILWEISE, zwei Anfragen', [n.log.length, r.lieferbar, r.teilweise, r.gemessen], [2, true, true, [SCHWER, LEICHT]]);
  ist('…Kosten von der leichtesten, die schwerste ist ausgewiesen als nicht lieferbar', [r.guenstigsteUsd, r.schwerste.lieferbar, r.schwerste.urteil, r.leichteste.lieferbar, r.leichteste.guenstigsteUsd], [8.79, false, 'nicht_lieferbar', true, 8.79]);
  ist('…jede Anfrage enthält genau EIN Produkt', nurEine(n.log), true);
}
{
  const n = netz([antwortObj(LEER())]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN });
  ist('frachtProdukt: beide ohne Linie → nicht lieferbar (zwei Anfragen)', [r.urteil, r.lieferbar, r.teilweise, n.log.length, r.tag], ['nicht_lieferbar', false, false, 2, 'cj-nicht-versendbar-ch']);
}
{
  const n = netz([b => antwortObj(b.products[0].vid === SCHWER ? LEER() : FEHLER_1602000)]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN });
  ist('frachtProdukt: schwerste leer, leichteste FEHLER → unbekannt, nie «nicht lieferbar»', [r.urteil, r.lieferbar, r.tag, r.fehler, ledgerGrund(r).startsWith('vorläufig')], ['unbekannt', false, null, 'api-1602000', true]);
}
{
  const n = netz([antwortObj(FEHLER_1602000)]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN });
  ist('frachtProdukt: schwerste FEHLER → unbekannt, KEINE zweite Anfrage (kostet nur Punkte)', [r.urteil, n.log.length, r.gemessen], ['unbekannt', 1, [SCHWER]]);
}
{
  const n = netz([antwortObj(LEER())]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: [{ vid: VID_A, variantWeight: 300 }] });
  ist('frachtProdukt: Einzelvariante ohne Linie → nicht lieferbar, dieselbe Variante nicht zweimal messen', [r.urteil, n.log.length], ['nicht_lieferbar', 1]);
}
{
  const n = netz([antwortObj(gut(BETT_1250))]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: [{ vid: 123456789, variantWeight: 10 }, { vid: '' }] });
  ist('frachtProdukt: keine verwertbare vid → unbekannt, nichts gesendet', [r.urteil, r.fehler, n.log.length, r.gemessen], ['unbekannt', 'keine-variante', 0, []]);
}
{
  const n = netz([antwortObj({ message: 'Too many requests' }, 429)]), l = lauf(n);
  await wirftAsync('frachtProdukt reicht CJ_THROTTLED weiter', () => frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN }), /^CJ_THROTTLED/);
}
{
  const n = netz([antwortObj(gut(BETT_1250, { total: 1, usedToday: 1, remaining: 5000 }))]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: BETT_VARIANTEN, reserve: 5000 });
  ist('frachtProdukt: Reserve-Warnung der letzten Anfrage wird durchgereicht', [r.lieferbar, r.reserveUnterschritten], [true, false]);
  const n2 = netz([antwortObj(gut(BETT_1250, { total: 1, usedToday: 1, remaining: 4990 }))]), l2 = lauf(n2);
  ist('…unterschritten → true', (await frachtProdukt({ ...l2.opt, varianten: BETT_VARIANTEN, reserve: 5000 })).reserveUnterschritten, true);
}

// ================================================================ 8. Ledger: unbekannt wird NIE 14 Tage gemerkt
{
  const JETZT = Date.parse('2026-10-27T12:00:00Z');
  const zeile = (h, stunden, grund) => `${h} · ${new Date(JETZT - stunden * 3600e3).toISOString()} · UEBERSPRUNGEN · ${grund}`;
  const unb = ledgerGrund(frachtAuswerten(FEHLER_1602000)), nicht = ledgerGrund(frachtAuswerten(LEER()));
  ist('ledgerGrund: lieferbar → null (kein Überspringen)', ledgerGrund(frachtAuswerten(gut(BETT_1250))), null);
  ist('ledgerGrund: unbekannt trägt «vorläufig» und den Fehler', unb, 'vorläufig: Fracht unbekannt (api-1602000)');
  ist('ledgerGrund: nichts / unbrauchbar → vorläufig, nie endgültig', [ledgerGrund(undefined).startsWith('vorläufig'), ledgerGrund({ lieferbar: false }).startsWith('vorläufig')], [true, true]);
  const text = [zeile('a-unbekannt-10h', 10, unb), zeile('b-unbekannt-21h', 21, unb), zeile('c-unbekannt-5tage', 120, unb),
    zeile('d-nicht-10tage', 240, nicht), zeile('e-nicht-15tage', 360, nicht)].join('\n');
  const erledigt = ledgerGedaechtnis(text, { jetzt: JETZT });
  ist('Ledger-Gedächtnis: unbekannt ruht 20 Stunden, danach wird neu gemessen', [erledigt.has('a-unbekannt-10h'), erledigt.has('b-unbekannt-21h'), erledigt.has('c-unbekannt-5tage')], [true, false, false]);
  ist('Ledger-Gedächtnis GEGENPROBE: «nicht lieferbar» (0 Linien) ruht 14 Tage', [erledigt.has('d-nicht-10tage'), erledigt.has('e-nicht-15tage')], [true, false]);
}

// ================================================================ 9. Gegen die echten Rohdateien (nur wo vorhanden; in der CI fehlt /tmp/grind2)
{
  const R = '/tmp/grind2/raw/', lies = f => JSON.parse(readFileSync(R + f, 'utf8'));
  if (existsSync(R + '21_freight_CN_CH_petbed.json')) {
    const erwartet = [['21_freight_CN_CH_petbed.json', 'lieferbar', 16, 19.99], ['23_freight_CN_CH_two_products.json', 'lieferbar', 11, 29.81], ['32_freight_CN_CH_lightVariant_320g.json', 'lieferbar', 16, 8.79],
      ['22_freight_CN_CH_airCooler_noLines.json', 'nicht_lieferbar', 0, null], ['31_freight_CN_CH_mixed_cart_ok_plus_noLines.json', 'nicht_lieferbar', 0, null],
      ['29_freight_CN_CH_DEproduct.json', 'nicht_lieferbar', 0, null], ['36_freight_CN_CH_unknown_vid.json', 'unbekannt', 0, null]];
    for (const [f, urteil, linien, guenstigste] of erwartet) {
      const r = frachtAuswerten(lies(f), { status: 200 });
      ist(`Rohdatei ${f}`, [r.urteil, r.linien.length, r.guenstigsteUsd], [urteil, linien, guenstigste]);
    }
    const roh = lies('21_freight_CN_CH_petbed.json');
    ist('Rohdatei 21: Punktestand', punkteStand(roh), { total: 70171, usedToday: 100090, remaining: 35409 });
    ist('Rohdatei 21: unser Nachbau der Linie hat dieselben Schlüssel wie die echte', Object.keys(linie(['X', 1, '1-2'])), Object.keys(roh.data[0]));
  } else console.log('übersprungen: /tmp/grind2/raw fehlt (nur lokal vorhanden; die Antwortformen oben sind eingebettet)');
  const p2 = '/tmp/mr/pruefung/cj_phase2.json';
  if (existsSync(p2)) {
    const alle = JSON.parse(readFileSync(p2, 'utf8')).flatMap(p => Object.values(p.fracht));
    ist('Rohdatei cj_phase2: alle 10 echten Antworten werden gelesen, keine ist unbekannt', [alle.length, alle.filter(f => frachtAuswerten(f, { status: 200 }).unbekannt).length], [10, 0]);
    ist('Rohdatei cj_phase2: nur die Lötpaste (beide Mengen) hat ausschliesslich Sonderlinien', alle.map(f => frachtAuswerten(f).nurSensitiv).filter(Boolean).length, 2);
  }
}


// ── Lieferzeit-Grenze (maxTage): die günstigste NORMALE Linie, die höchstens maxTage braucht (Prüfung Schnittstellen 27.10.2026; Laufzeiten GEMESSEN: Eub/Postal 12-50, PostNL 15-45, Sensitive Pro 15-35)
{
  const mk = linien => frachtAuswerten({ code: 200, result: true, data: linien.map(([n, p, t]) => ({ logisticName: n, logisticPrice: p, logisticAging: t, totalPostageFee: p })) });
  const gemischt = mk([['CJPacket Eub', 3.1, '12-50'], ['CJPacket Ordinary VIP', 5.0, '7-10'], ['YunExpress Ordinary', 6.0, '8-15']]);
  ist('maxTage 20: die billigere, aber langsame Linie (Eub 12-50) wird übersprungen → 5.00', frachtFuerKosten(gemischt, { maxTage: 20 }), 5.0);
  ist('ohne maxTage bleibt es bei der günstigsten (3.10): das alte Verhalten ist unverändert', frachtFuerKosten(gemischt), 3.1);
  ist('maxTage 9: nur die Linie mit 7-10 Tagen fällt auch heraus → keine passende Linie', frachtFuerKosten(gemischt, { maxTage: 9 }), null);
  ist('maxTage 10: genau die Grenze zählt (7-10 passt)', frachtFuerKosten(gemischt, { maxTage: 10 }), 5.0);
  ist('nur langsame normale Linien → null (zurückstellen, nicht raten)', frachtFuerKosten(mk([['CJPacket Eub', 3.1, '12-50'], ['PostNL', 3.9, '15-45']]), { maxTage: 20 }), null);
  ist('Linie ohne lesbare Laufzeit gilt nicht als schnell', frachtFuerKosten(mk([['CJPacket Ordinary VIP', 5.0, 'schnell'], ['PostNL', 7.0, '15-45']]), { maxTage: 20 }), null);
  ist('Sonderlinien zählen nicht als normale: schnelle Sensitive-Linie ohne Ausweg → null', frachtFuerKosten(mk([['CJPacket Sensitive', 4.0, '5-10']]), { maxTage: 20 }), null);
  ist('...mit sensitivAlsAusweg wie bisher die Sonderlinie', frachtFuerKosten(mk([['CJPacket Sensitive', 4.0, '5-10']]), { maxTage: 20, sensitivAlsAusweg: true }), 4.0);
  ist('unbekannt und nicht lieferbar liefern auch mit maxTage nie eine Zahl', [frachtFuerKosten(frachtAuswerten({ code: 200, result: true, data: [] }), { maxTage: 20 }), frachtFuerKosten(frachtAuswerten(null), { maxTage: 20 })], [null, null]);
}


// ── Sonderlinie MIT Lieferzeit: auch der Ausweg über «Sensitive» muss schnell sein; normale Linien, aber keine schnelle → keine Sonderlinie als Ersatz
{
  const mk = linien => frachtAuswerten({ code: 200, result: true, data: linien.map(([n, p, t]) => ({ logisticName: n, logisticPrice: p, logisticAging: t, totalPostageFee: p })) });
  ist('Ausweg über die Sonderlinie gilt nur für eine SCHNELLE (Sensitive Pro 15-35 ist zu langsam) → null', frachtFuerKosten(mk([['CJPacket Sensitive Pro', 4.0, '15-35']]), { maxTage: 20, sensitivAlsAusweg: true }), null);
  ist('...die schnellere Sonderlinie wird gewählt, die günstigere langsame übersprungen', frachtFuerKosten(mk([['CJPacket Sensitive Pro', 4.0, '15-35'], ['CJPacket Sensitive', 5.5, '5-10']]), { maxTage: 20, sensitivAlsAusweg: true }), 5.5);
  ist('Normale Linien nur langsam + schnelle Sonderlinie vorhanden: auch MIT Ausweg keine Sonderlinie als Ersatz (null)', frachtFuerKosten(mk([['CJPacket Eub', 3.1, '12-50'], ['CJPacket Sensitive', 4.0, '5-10']]), { maxTage: 20, sensitivAlsAusweg: true }), null);
  ist('frachtKeineZahlGrund: nennt die Linien mit ihren Tagen / «nur Sonderlinien» / «unbekannt» / «keine Versandlinie»', [
    frachtKeineZahlGrund(mk([['CJPacket Eub', 3.1, '12-50'], ['PostNL', 3.9, '15-45']]), { maxTage: 20 }),
    frachtKeineZahlGrund(mk([['CJPacket Sensitive', 4.0, '5-10']]), { maxTage: 20 }),
    frachtKeineZahlGrund(frachtAuswerten(null), { maxTage: 20 }),
    frachtKeineZahlGrund(frachtAuswerten({ code: 200, result: true, data: [] }), { maxTage: 20 })],
  ['keine normale Versandlinie CN→CH mit höchstens 20 Tagen Lieferzeit (Linien: CJPacket Eub 12-50, PostNL 15-45)', 'nur Sonderlinien (Sensitive/Liquid) nach CH, keine normale Linie', 'Fracht unbekannt', 'keine Versandlinie CN→CH']);
}

// ── Gewichtsklassen (Prüfung Qualität 27.10.2026: Lichterkette 170 / 348 / 1386 / 3770 g = 6.77 / 9.17 / 21.59 / 49.44 USD)
{
  ist('messKlassen: bis zu vier verschiedene Gewichte werden alle gemessen, Doppelte zählen einmal, Nicht-Zahlen und ≤ 0 fallen weg', [messKlassen([170, 170, 348, 1386, 3770], 4), messKlassen([0, -5, 'x', null, 100], 4)], [[170, 348, 1386, 3770], [100]]);
  ist('messKlassen: leichteste und schwerste sind immer dabei, höchstens max Klassen', [messKlassen([100, 200, 300, 400, 500, 600, 700], 4).length, messKlassen([100, 700], 4), messKlassen([100, 200, 300, 400, 500, 600, 700], 4)[0], messKlassen([100, 200, 300, 400, 500, 600, 700], 4).at(-1)], [4, [100, 700], 100, 700]);
  ist('messKlassen: keine Liste → leer', [messKlassen(undefined), messKlassen('x')], [[], []]);
  const vs = (gew) => gew.map((g, i) => ({ vid: `V${i + 1}-AAAAAAAAAA`, variantWeight: g }));
  ist('messPlan: Gewicht spannt weniger als Faktor 2 → nur die schwerste (wie bisher)', messPlan(vs([300, 350, 400, 590]), { klassenMax: 4 }), [{ vid: 'V4-AAAAAAAAAA', gewichtG: 590 }]);
  ist('messPlan: spannt es mehr als Faktor 2 → vier Klassen, aufsteigend, die schwerste zuletzt', messPlan(vs([170, 348, 1386, 3770]), { klassenMax: 4 }).map(m => m.gewichtG), [170, 348, 1386, 3770]);
  ist('messPlan: klassenMax 1 (altes Verhalten) → nur die schwerste, auch bei breiter Spanne', messPlan(vs([170, 3770]), { klassenMax: 1 }).map(m => m.gewichtG), [3770]);
  ist('messPlan: ohne Gewicht → eine Messung (gewichtUnbekannt), ohne Varianten → leer', [messPlan([{ vid: 'V1-AAAAAAAAAA' }, { vid: 'V2-AAAAAAAAAA' }], { klassenMax: 4 }).length, messPlan([], { klassenMax: 4 })], [1, []]);
  ist('messPlan: Gleichstand beim Gewicht → eine Variante je Gewicht', messPlan(vs([100, 100, 100, 1000]), { klassenMax: 4 }).map(m => [m.vid, m.gewichtG]), [['V1-AAAAAAAAAA', 100], ['V4-AAAAAAAAAA', 1000]]);

  const mk = (preis, tage = '7-10') => frachtAuswerten({ code: 200, result: true, data: [{ logisticName: 'CJPacket Ordinary VIP', logisticPrice: preis, logisticAging: tage, totalPostageFee: preis }] });
  const klassen = [{ gewichtG: 170, r: mk(6.77) }, { gewichtG: 348, r: mk(9.17) }, { gewichtG: 1386, r: mk(21.59) }, { gewichtG: 3770, r: mk(49.44) }];
  const fj = frachtJeVariante([{ vid: 'a', gewichtG: 170 }, { vid: 'b', gewichtG: 400 }, { vid: 'c', gewichtG: 3770 }, { vid: 'd' }, { vid: 'e', gewichtG: 5000 }, { vid: 'f', gewichtG: 1 }], klassen);
  ist('frachtJeVariante: die nächst SCHWERERE gemessene Klasse (400 g → 1386-g-Klasse), ohne Gewicht und über der schwersten die schwerste, leichter als alle → die leichteste Klasse', fj.map(x => x.frachtUsd), [6.77, 21.59, 49.44, 49.44, 49.44, 6.77]);
  ist('frachtJeVariante: ohne gemessene Klasse null (nie raten), unsortierte Eingabe wird sortiert', [frachtJeVariante([{ vid: 'a', gewichtG: 5 }], []), frachtJeVariante([{ vid: 'a', gewichtG: 200 }], [klassen[3], klassen[0]])[0].frachtUsd], [null, 49.44]);
  const langsam = [{ gewichtG: 170, r: mk(6.77) }, { gewichtG: 3770, r: mk(30, '12-50') }];
  const fl = frachtJeVariante([{ vid: 'a', gewichtG: 170 }, { vid: 'b', gewichtG: 3770 }], langsam, { maxTage: 20 });
  ist('frachtJeVariante: eine Klasse ohne schnelle Linie bekommt null mit Grund, die andere behält ihre Zahl', [fl.map(x => x.frachtUsd), /höchstens 20 Tagen/.test(fl[1].grund), fl[0].grund], [[6.77, null], true, undefined]);
  const leerKl = [{ gewichtG: 170, r: frachtAuswerten({ code: 200, result: true, data: [] }) }, { gewichtG: 3770, r: mk(49.44) }];
  ist('frachtJeVariante: eine nicht versendbare Klasse (0 Linien) → null «keine Versandlinie», nie die Zahl der schwereren', frachtJeVariante([{ vid: 'a', gewichtG: 170 }], leerKl)[0], { vid: 'a', gewichtG: 170, klasseG: 170, frachtUsd: null, grund: 'keine Versandlinie CN→CH' });
}
{
  // frachtProdukt mit Klassen: Aufrufe, Reihenfolge, Abbruch bei Unbekanntem
  const V = [['A1-AAAAAAAAAA', 170], ['A2-AAAAAAAAAA', 348], ['A3-AAAAAAAAAA', 1386], ['A4-AAAAAAAAAA', 3770]].map(([vid, variantWeight]) => ({ vid, variantWeight }));
  const preisVon = { 'A1-AAAAAAAAAA': 6.77, 'A2-AAAAAAAAAA': 9.17, 'A3-AAAAAAAAAA': 21.59, 'A4-AAAAAAAAAA': 49.44 };
  const n = netz([b => antwortObj(gut([['CJPacket Ordinary VIP', preisVon[b.products[0].vid], '7-10']]))]), l = lauf(n);
  const r = await frachtProdukt({ ...l.opt, varianten: V, klassenMax: 4 });
  ist('frachtProdukt mit Klassen: vier Anfragen (die schwerste zuerst), jede mit EINER vid, Klassen aufsteigend', [n.log.map(x => x.body.products[0].vid), nurEine(n.log), r.klassen.map(k => [k.gewichtG, k.r.guenstigsteUsd]), r.gemessen.length], [['A4-AAAAAAAAAA', 'A1-AAAAAAAAAA', 'A2-AAAAAAAAAA', 'A3-AAAAAAAAAA'], true, [[170, 6.77], [348, 9.17], [1386, 21.59], [3770, 49.44]], 4]);
  ist('...massgeblich bleibt die schwerste (Lieferbarkeit), das Ergebnis trägt die leichteste', [r.lieferbar, r.guenstigsteUsd, r.leichteste?.vid, r.schwerste.vid], [true, 49.44, 'A1-AAAAAAAAAA', 'A4-AAAAAAAAAA']);
  const n1 = netz([antwortObj(gut(BETT_1250))]), l1 = lauf(n1);
  const r1 = await frachtProdukt({ ...l1.opt, varianten: V });
  ist('frachtProdukt ohne klassenMax (Vorgabe 1): wie bisher EINE Anfrage; das Ergebnis trägt trotzdem die eine Klasse', [n1.log.length, r1.klassen.length], [1, 1]);
  const nl = netz([b => antwortObj(b.products[0].vid === 'A4-AAAAAAAAAA' ? gut(BETT_1250) : b.products[0].vid === 'A1-AAAAAAAAAA' ? FEHLER_1602000 : gut(BETT_1250))]), ll = lauf(nl);
  const rl = await frachtProdukt({ ...ll.opt, varianten: V, klassenMax: 4 });
  ist('frachtProdukt: ein FEHLER in einer leichteren Klasse macht das ganze Produkt unbekannt und beendet die Messung (nur 2 Anfragen)', [rl.unbekannt, rl.fehler, nl.log.length], [true, 'api-1602000', 2]);
  const nn = netz([b => antwortObj(b.products[0].vid === 'A4-AAAAAAAAAA' ? LEER() : gut(BETT_1250))]), ln = lauf(nn);
  const rn = await frachtProdukt({ ...ln.opt, varianten: V, klassenMax: 4 });
  ist('frachtProdukt: ist die schwerste nicht lieferbar, gilt weiter der alte Weg (leichteste → teilweise), keine Klassen-Messungen', [rn.teilweise, nn.log.length], [true, 2]);
  const gleich = [['B1-AAAAAAAAAA', 300], ['B2-AAAAAAAAAA', 350], ['B3-AAAAAAAAAA', 400]].map(([vid, variantWeight]) => ({ vid, variantWeight }));
  const ng = netz([antwortObj(gut(BETT_1250))]), lg = lauf(ng);
  await frachtProdukt({ ...lg.opt, varianten: gleich, klassenMax: 4 });
  ist('frachtProdukt: Gewichtsspanne unter Faktor 2 → trotz klassenMax 4 nur EINE Anfrage (kein Punkteverbrauch ohne Nutzen)', ng.log.length, 1);
}

// ── Punkte leer (16900500) als HTTP-200-Antwort ist ein Lauf-Fehler (CJ_QUOTA), keine Aussage über das Produkt
{
  const n = netz([antwortObj({ code: 16900500, result: false, message: 'Quota gone', data: null })]), l = lauf(n);
  await wirftAsync('frachtHolen: code 16900500 → CJ_QUOTA (nicht «unbekannt» und nicht CJ_THROTTLED)', () => frachtHolen({ ...l.opt, vid: VID_A }), /^CJ_QUOTA/);
  const n2 = netz([antwortObj({ code: 1600200, result: false, message: 'Too Many Requests', data: null })]), l2 = lauf(n2);
  await wirftAsync('frachtHolen: code 1600200 → CJ_THROTTLED', () => frachtHolen({ ...l2.opt, vid: VID_A }), /^CJ_THROTTLED/);
}

console.log(`${bestanden} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
