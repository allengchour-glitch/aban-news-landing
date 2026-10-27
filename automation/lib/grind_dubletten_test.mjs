// Tests für lib/grind_dubletten.mjs: Dublettenindex des Grind 2.0. Rein, kein Netz, keine Datei ausser einer Attrappe für ladeIndex.
// Lauf: /opt/node22/bin/node automation/lib/grind_dubletten_test.mjs
// Die Fälle sind ECHTE Datensätze aus dem Shop (Bulk vom 27.10.2026, 87 765 Produkte) und aus dem CJ-Datenblatt-Zwischenspeicher; Handles, Titel, SKUs und pids
// wörtlich übernommen. Erfundene Fälle sind als «gebaut» gekennzeichnet. Gegenproben in BEIDE Richtungen; die Zusammenfassung steht am ENDE.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORM_BEKANNT, LEDGER_HANDLES, LEDGER_PIDS, MIN_KERN, BULK_LAUFENDE_ABFRAGE, baueIndex, bulkSammler, fuegeHinzu, indexKennzahlen, istDublette, istFrisch, jaccard, kandidatAus, ladeIndex,
  ledgerHandlesAusText, ledgerPidsAusText, naheTitel, pidAusSku, pidNorm, produktSkuOk, produkteAusJsonl, restOk, skuNorm, titelKern,
} from './grind_dubletten.mjs';

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
const ZW = String.fromCharCode(0x200B), NBSP = String.fromCharCode(0xA0);

// ───────────────────────── pidNorm ─────────────────────────
ist('pid: 19 Ziffern bleiben', pidNorm('2605250738171630300'), '2605250738171630300');
ist('pid: cj:-Vorsatz (cj_niche_done)', pidNorm('cj:2059843910675750913'), '2059843910675750913');
ist('pid: pid:-Vorsatz (cj_gaps_done)', pidNorm('pid:2065344692071587842'), '2065344692071587842');
ist('pid: CJ--Vorsatz (Shop-SKU)', pidNorm('CJ-2070751604042739713'), '2070751604042739713');
ist('pid: führende Nullen fallen weg (gleiche pid wie ohne)', pidNorm('02605250738171630300'), '2605250738171630300');
ist('pid: viele führende Nullen', pidNorm('0000002605250738171630300'), pidNorm('2605250738171630300'));
ist('pid: 15 Ziffern sind die untere Grenze', pidNorm('123456789012345'), '123456789012345');
ist('pid: 14 Ziffern zu kurz', pidNorm('12345678901234'), null);
ist('pid: 15 Nullen sind keine pid', pidNorm('000000000000000'), null);
ist('pid: 15 Ziffern mit führender Null schrumpfen unter die Grenze', pidNorm('012345678901234'), null);
ist('pid: 21 Ziffern zu lang', pidNorm('123456789012345678901'), null);
ist('pid: Apostroph aus der Tabellenkalkulation', pidNorm("'2605250738171630300"), '2605250738171630300');
ist('pid: Leerraum und Nullbreitenzeichen', pidNorm(`${NBSP} 2605250738171630300${ZW}`), '2605250738171630300');
ist('pid: Zahlenschreibweise 2.6052E+18 ist unrettbar', pidNorm('2.6052507381716E+18'), null);
ist('pid: Buchstaben', pidNorm('CJYD2926337'), null);
ist('pid: null / undefined / leer', [pidNorm(null), pidNorm(undefined), pidNorm('')], [null, null, null]);
ist('pid: gid ist keine pid', pidNorm('gid://shopify/Product/15422934647169'), null);
ist('pid: UUID in Grossbuchstaben (CJ führt UUID-pids)', pidNorm('489c08e7-c0da-4a2a-a3ef-2ecaaa1f3d7c'), '489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C');
ist('pid: cj:-Vorsatz an UUID (98 Zeilen in cj_niche_done)', pidNorm('cj:489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C'), '489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C');
// Eine Zahl über 2^53 hat Stellen verloren: lieber null als eine falsche pid.
ist('pid: grosse Zahl (verlustbehaftet) wird abgelehnt', pidNorm(2605250738171630300), null);
ist('pid: sichere 15-stellige Zahl geht', pidNorm(123456789012345), '123456789012345');
ist('pid: BigInt geht', pidNorm(2605250738171630301n), '2605250738171630301');
// Gebaut: zwei verschiedene 19-stellige pids, die als Number zusammenfallen. In den echten 33 358 pids (Shop + Ledger) gibt es 0 solche Paare — der Textvergleich ist Vorsorge.
{
  const a = '2605250738171630301', b = '2605250738171630302';
  ist('Beweis: als Zahl sind a und b gleich, als Text verschieden', [Number(a) === Number(b), a === b], [true, false]);
  const ix = baueIndex({ produkte: [{ id: 'x1', handle: 'a', title: '', status: 'ACTIVE', skus: ['CJ-' + a] }] });
  ist('pid-Zwilling als Zahl wäre ein Fehltreffer; als Text nicht', [istDublette({ pid: a }, ix).dublette, istDublette({ pid: b }, ix).dublette], [true, false]);
}

// ───────────────────────── skuNorm / pidAusSku / restOk / produktSkuOk ─────────────────────────
ist('SKU: CJ-CJ… und blankes CJ… sind dieselbe SKU (5 echte Paare im Shop)', skuNorm('CJ-CJYD292633701AZ'), skuNorm('CJYD292633701AZ'));
ist('SKU: Grossschreibung und Leerraum', skuNorm('  cj-cjyd292633701az '), 'CJYD292633701AZ');
ist('SKU: CJ-<pid> behält den Vorsatz (sonst wäre die pid eine blanke Zahl)', skuNorm('CJ-2605050908281601400'), 'CJ-2605050908281601400');
ist('SKU: Leerzeichen im Zusatz werden vereinheitlicht', skuNorm('CJJJJTJT35117-Light  wood grain-EU'), 'CJJJJTJT35117-LIGHT WOOD GRAIN-EU');
ist('SKU: leer / null', [skuNorm(''), skuNorm(null), skuNorm(undefined)], ['', '', '']);
ist('SKU: Nullbreitenzeichen', skuNorm('CJ' + ZW + 'YD292633701AZ'), 'CJYD292633701AZ');

ist('pidAusSku: CJ-<19 Ziffern> (23 050 Shop-Varianten)', pidAusSku('CJ-2605050908281601400'), '2605050908281601400');
ist('pidAusSku: blanke pid', pidAusSku('2605050908281601400'), '2605050908281601400');
ist('pidAusSku: CJ-<UUID> (4 712 Shop-Varianten)', pidAusSku('CJ-F4342E6A-A93C-4D78-8178-B267E288561F'), 'F4342E6A-A93C-4D78-8178-B267E288561F');
ist('pidAusSku: blanke UUID klein geschrieben (10 Shop-Varianten)', pidAusSku('aee8d787-63c4-41a9-a942-622ef948bd44'), 'AEE8D787-63C4-41A9-A942-622EF948BD44');
ist('pidAusSku: variantSku ist keine pid', pidAusSku('CJYD292633701AZ'), null);
ist('pidAusSku: eigene SKU', pidAusSku('LX-11-PREMIUM-BAMBUS-AROMA-DIF'), null);
ist('pidAusSku: eingebettete Ziffernfolge zählt nicht', pidAusSku('ABC-2605050908281601400-X'), null);
ist('pidAusSku: Dropship-Vorlage 9000001_10163', pidAusSku('9000001_10163'), null);

ist('Rest: leer, -Zusatz, 01AZ, 100VE, 0002 sind dieselbe Ware', ['', '-LIME', '01AZ', '100VE', '187EV', '0002'].map(r => restOk(r)), [true, true, true, true, true, true]);
ist('Rest: 701AZ (eine fremde, längere productSku) gehört nicht dazu', restOk('701AZ'), false);
ist('Rest: 300AZ / 5 Ziffern / Buchstaben / Zusatz ohne Strich', [restOk('300AZ'), restOk('00002'), restOk('ABC'), restOk('X')], [false, false, false, false]);
ist('Rest: unbekannte Form lässt nur leer und -Zusatz zu', [restOk('01AZ', false), restOk('0002', false), restOk('', false), restOk('-X', false)], [false, false, true, true]);
ist('productSku-Form: CJYD2926337 und CJJJJTJT35117 sind bekannt', [FORM_BEKANNT.test('CJYD2926337'), FORM_BEKANNT.test('CJJJJTJT35117')], [true, true]);
ist('productSku-Form: eine Ziffer weniger / mehr ist unbekannt', [FORM_BEKANNT.test('CJYD292633'), FORM_BEKANNT.test('CJYD29263370')], [false, false]);
ist('productSku brauchbar: echte Formen', ['CJYD2926337', 'CJJJJTJT35117', 'CJNS2725146'].map(produktSkuOk), [true, true, true]);
ist('productSku unbrauchbar: zu kurz, pid, Zusatz, leer, fremd', ['CJ', 'CJAB', 'CJ2605050908281601400', 'CJYD2926337-X', '', 'LX-11', '9000001_10163'].map(produktSkuOk), [false, false, false, false, false, false, false]);

// ───────────────────────── Titelkern ─────────────────────────
ist('Kern: gleiche Ware, andere Zahlen/Farbe/Füllwörter/Reihenfolge → gleicher Kern',
  titelKern('Smartwatch Herren Fitness Armband Schwarz 1.69 Zoll'), titelKern('Fitness-Smartwatch für Herren – Armband (Blau, 2024)'));
ist('Kern: Inhalt (sortiert, gestammt)', titelKern('Smartwatch Herren Fitness Armband Schwarz 1.69 Zoll'), ['armband', 'fitnes', 'herr', 'smartwatch']);
ist('Kern: Umlaute und ß gefaltet', titelKern('Rüschen Kleid für Größe'), titelKern('Ruschen Kleid fur Grosse'));
ist('Kern: Zahlen und Masse fallen weg', titelKern('Powerbank 20000mAh 45W 10 cm'), ['powerbank']);
ist('Kern: Farben (DE und EN) fallen weg, Eigenschaften (mini) bleiben', titelKern('Mini Projektor Schwarz Black Rot Blue'), ['mini', 'projektor']);
ist('Kern: Gegenprobe — Damen und Herren bleiben verschieden', titelKern('Smartwatch Damen Fitness Armband') === titelKern('Smartwatch Herren Fitness Armband'), false);
ist('Kern: Kleider/Kleid, Armbänder/Armband werden gleich', [titelKern('Kleider Sommer')[0] === titelKern('Kleid Sommer')[0], titelKern('Armbänder')[0] === titelKern('Armband')[0]], [true, true]);
ist('Kern: Echt-Paar Wasserdichte Outdoor Sportuhr Herren (Titel im Shop vs. Nachbar) hat Jaccard 1', jaccard(titelKern('Wasserdichte Outdoor Sportuhr Herren'), titelKern('Wasserdichte Outdoor-Sportuhr für Herren')), 1);
ist('Kern: leer / null', [titelKern(''), titelKern(null)], [[], []]);
ist('Jaccard: 0,6 bei 3 gemeinsamen von 5 Wörtern', jaccard(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'e']), 0.6);
ist('Jaccard: leere Liste', jaccard([], ['a']), 0);

// ───────────────────────── Ledger lesen ─────────────────────────
{
  const niche = 'cj:2059843910675750913\ncj:489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C\n\ncj:kaputt';
  const r = ledgerPidsAusText(niche, 'niche');
  ist('Ledger niche: 19 Ziffern und UUID gelesen, kaputte Zeile gezählt', [r.map(e => e.pid), r.ungueltig, r[0].quelle], [['2059843910675750913', '489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C'], 1, 'niche']);
  ist('Ledger gaps: pid:-Zeile', ledgerPidsAusText('pid:2065344692071587842', 'gaps').map(e => e.pid), ['2065344692071587842']);
  const top = ledgerPidsAusText('2077583157631160322 · 2026-10-24 · keine-ch-fracht · Portable Bladeless Air Cooler Fan   6 Speed Silent Desk Fan With Humid\n2607260814301633700 · 2026-10-24 · lieferbar-ch · Air Purifier Humidifier', 'top');
  ist('Ledger top: pid vorn, Ausgang als Detail', [top.map(e => e.pid), top[0].detail.startsWith('2026-10-24 · keine-ch-fracht')], [['2077583157631160322', '2607260814301633700'], true]);
  const g2 = ledgerPidsAusText([
    '2606130513001629500 · 2026-10-28T01:02:03.000Z · GESCHRIEBEN · 6 Varianten · a-linien-kleid-mit-neckholder-und-stickerei-629500 · gid://shopify/Product/1',
    '2606010938551618200 · 2026-10-28T01:05:00.000Z · UEBERSPRUNGEN · zurückgestellt: Fracht unbekannt',
    '2606010914311626400 · 2026-10-28T01:06:00.000Z · FEHLER · Daily variant creation limit reached',
    '2607010958251615500 · 2026-10-28T01:07:00.000Z · ZURUECK · Rücknahme'].join('\n'), 'grind2');
  ist('Ledger grind2: nur GESCHRIEBEN zählt (UEBERSPRUNGEN/FEHLER/ZURUECK legen nichts an)', g2.map(e => e.pid), ['2606130513001629500']);
  ist('Ledger-pids: Handle-Zeilen (cj_varianten_ledger) sind keine kaputten pid-Zeilen', ledgerPidsAusText('vintage-vorhang-mit-spitze-und-perlen-607300 · 2026-10-25T21:43:52.189Z · GESCHRIEBEN · 9 Varianten').length === 0 && ledgerPidsAusText('vintage-vorhang-mit-spitze-und-perlen-607300 · 2026-10-25T21:43:52.189Z · GESCHRIEBEN · 9 Varianten').ungueltig === 0, true);

  const hv = ledgerHandlesAusText('vintage-vorhang-mit-spitze-und-perlen-607300 · 2026-10-25T21:43:52.189Z · GESCHRIEBEN · 9 Varianten\nschwingerhose-fgahb2887ml · 2026-10-24 · 2610240115184481100 · schon-bezahlt-und-erstattet', 'varianten');
  ist('Ledger-Handles: Handle vorn (varianten, sourcing)', hv.map(e => e.handle), ['vintage-vorhang-mit-spitze-und-perlen-607300', 'schwingerhose-fgahb2887ml']);
  const hg = ledgerHandlesAusText([
    '2606130513001629500 · 2026-10-28T01:02:03.000Z · GESCHRIEBEN · 6 Varianten · a-linien-kleid-mit-neckholder-und-stickerei-629500 · gid://shopify/Product/1',
    '2606010938551618200 · 2026-10-28T01:05:00.000Z · UEBERSPRUNGEN · x'].join('\n'), 'grind2');
  ist('Ledger-Handles: grind2-Zeile liefert den Handle aus dem 5. Feld, UEBERSPRUNGEN keinen', hg.map(e => e.handle), ['a-linien-kleid-mit-neckholder-und-stickerei-629500']);
  ist('Ledger-Handles: pid-Zeilen (niche, top) liefern keinen Handle', [ledgerHandlesAusText('cj:2059843910675750913').length, ledgerHandlesAusText('2077583157631160322 · 2026-10-24 · keine-ch-fracht · Fan').length], [0, 0]);
  ist('Ledger: Kommentarzeilen und Leerzeilen', [ledgerPidsAusText('# Kopf\n\n  \ncj:2059843910675750913').length, ledgerHandlesAusText('# Kopf\n\n').length], [1, 0]);
}

// ───────────────────────── Bulk-Sammler ─────────────────────────
{
  const s = bulkSammler();
  // Kinder können VOR dem Elternteil stehen (die Bulk-Ausgabe garantiert die Reihenfolge nicht)
  s.add('{"id":"gid://shopify/ProductVariant/9","sku":"VOR-ELTERN","__parentId":"gid://shopify/Product/1"}');
  s.add('{"id":"gid://shopify/Product/1","handle":"a","title":"Titel A","status":"ACTIVE"}');
  s.add('{"id":"gid://shopify/ProductVariant/10","sku":"NACH-ELTERN","__parentId":"gid://shopify/Product/1"}');
  s.add('{"id":"gid://shopify/ProductVariant/11","sku":"","__parentId":"gid://shopify/Product/1"}');
  s.add('{"id":"gid://shopify/ProductVariant/12","sku":null,"__parentId":"gid://shopify/Product/1"}');
  s.add('{"id":"gid://shopify/Product/2","handle":"b","title":"Titel B","status":"DRAFT"}');
  s.add('{"id":"gid://shopify/ProductVariant/13","sku":"WAISE","__parentId":"gid://shopify/Product/99"}');
  s.add('das ist kein JSON');
  s.add('');
  const e = s.ergebnis();
  ist('Bulk: Kinder vor und nach dem Elternteil, leere SKUs gezählt', e.produkte.map(p => [p.handle, p.status, p.skus]), [['a', 'ACTIVE', ['VOR-ELTERN', 'NACH-ELTERN']], ['b', 'DRAFT', []]]);
  ist('Bulk: Statistik (kaputte Zeile, Waise, Varianten ohne SKU)', e.stat, { zeilen: 8, kaputt: 1, produkte: 2, varianten: 5, variantenOhneSku: 2, waisen: 1 });
  ist('Bulk: Produkt ohne Handle-Feld ist keine Produktzeile', (() => { const t = bulkSammler(); t.add('{"id":"gid://shopify/Product/3"}'); return t.ergebnis().stat.produkte; })(), 0);
}
{
  const txt = '{"id":"p1","handle":"a","title":"A","status":"ACTIVE","skus":["X1"]}\n\nkaputt\n{"id":"p2","handle":"b","title":"B","status":"DRAFT","skus":[]}\n';
  const l = produkteAusJsonl(txt);
  ist('skus.jsonl: zwei Produkte, eine kaputte Zeile gezählt', [l.map(p => p.handle), l.kaputt], [['a', 'b'], 1]);
}

// ───────────────────────── Shop-Fixture (echte Datensätze) ─────────────────────────
const SHOP = [
  { id: 'gid://shopify/Product/15422934647169', handle: 'abendkleid-aurora-satin-spaghettitrager-schlitz', title: 'Abendkleid «Aurora» · Satin, Spaghettiträger & Schlitz', status: 'ACTIVE',
    skus: ['CJYD292633701AZ', 'CJYD292633702BY', 'CJYD292633703CX'] },                                               // blanke Form
  { id: 'gid://shopify/Product/15512313725313', handle: 'elegantes-satin-abendkleid-mit-mesh-einsatzen-612300', title: 'Elegantes Satin-Abendkleid mit Mesh-Einsätzen', status: 'ACTIVE',
    skus: ['CJ-CJYD292633701AZ', 'CJ-CJYD292633702BY'] },                                                            // dieselbe CJ-Ware, Form «CJ-CJ…», anderer Titel
  { id: 'gid://shopify/Product/15445282750849', handle: 'uv-led-nageltrockner-120w-439234', title: 'UV/LED Nageltrockner 120W', status: 'ACTIVE', skus: ['CJ-CJZJ25718660002', 'CJ-CJZJ25718660006'] },   // 4-Ziffern-Index
  { id: 'gid://shopify/Product/15453897359745', handle: '10-in-1-reinigungburste-mit-sprachassistenz-601400', title: '10-in-1-Reinigungbürste mit Sprachassistenz', status: 'ACTIVE', skus: ['CJ-2605050908281601400'] },   // nur pid-SKU
  { id: 'gid://shopify/Product/9001', handle: 'mini-teekocher-fur-zuhause-615500', title: 'Mini-Teekocher für Zuhause', status: 'DRAFT', skus: ['CJ-2607010958251615500'] },       // gleiche pid, anderer Status und Titel
  { id: 'gid://shopify/Product/9002', handle: 'keramik-holzkohleofen-615500', title: 'Keramik-Holzkohleofen', status: 'ACTIVE', skus: ['CJ-2607010958251615500'] },
  { id: 'gid://shopify/Product/9003', handle: 'portables-roll-up-piano-mit-88-tasten-88561f', title: 'Portables Roll-Up Piano mit 88 Tasten', status: 'ACTIVE', skus: ['CJ-F4342E6A-A93C-4D78-8178-B267E288561F'] },   // UUID-pid
  { id: 'gid://shopify/Product/9004', handle: 'aroma-diffuser-holzoptik-hohl-design-ultraschall-luftbefeuchter-mit-led-licht', title: 'Aromadiffusor Holzmaserung', status: 'ACTIVE', skus: ['CJJJJTJT35117-Light wood grain-EU'] },   // Form mit Zusatz
  { id: 'gid://shopify/Product/9005', handle: 'liebes-hoodie-449152', title: 'Unisex-Hoodie «Love»', status: 'ACTIVE', skus: ['CJWY173158301AZ', 'CJWY1731583100VE', 'CJWY1731583112HS'] },   // Index ab 100
  { id: 'gid://shopify/Product/9006', handle: 'wasserdichte-outdoor-sportuhr-herren-511744', title: 'Wasserdichte Outdoor Sportuhr Herren', status: 'ACTIVE', skus: ['CJSY160104501AZ'] },
  { id: 'gid://shopify/Product/9007', handle: 'herren-strickhemd-mit-stehkragen-und-rei-versc-608600', title: 'Herren Strickhemd mit Stehkragen und Reissverschluss', status: 'ACTIVE', skus: ['CJ-CJYD280269901AZ'] },
  { id: 'gid://shopify/Product/9008', handle: 'schweiz-sticker-matterhorn', title: 'Schweiz-Sticker «Matterhorn» · 1 Stück', status: 'ACTIVE', skus: ['9000001_10163', '9000001_10164'] },   // Dropship-Vorlage, kein CJ
  { id: 'gid://shopify/Product/9009', handle: 'schweiz-sticker-edelweiss-line', title: 'Schweiz-Sticker «Edelwyss» · 1 Stück', status: 'ACTIVE', skus: ['9000001_10163', '9000001_10164'] },
  { id: 'gid://shopify/Product/9010', handle: 'tennis-armband-bunt-zirkonia', title: 'Tennis-Armband Bunt · Zirkonia funkelnd', status: 'ARCHIVED', skus: ['CJ-CJSL293135501AZ'] },
  { id: 'gid://shopify/Product/9011', handle: 'vintage-eulen-fusskettchen-aus-legierung-601100', title: 'Vintage Eulen-Fusskettchen aus Legierung', status: 'DRAFT', skus: ['CJSL293135501AZ', 'CJSL293135502BY'] },
];
const LEDGER_P = [{ pid: '2059843910675750913', quelle: 'niche', detail: '' }, '1983071052649439234', { pid: '2607260814301633700', quelle: 'top', detail: '2026-10-24 · lieferbar-ch · Air Purifier Humidifier' }];
const LEDGER_H = [{ handle: 'vintage-vorhang-mit-spitze-und-perlen-607300', quelle: 'varianten', detail: '2026-10-25 · GESCHRIEBEN · 9 Varianten' }];
const ix = baueIndex({ produkte: SHOP, ledgerPids: LEDGER_P, ledgerHandles: LEDGER_H }, { stand: '2026-10-27T05:08:33.289Z' });
const harte = r => r.treffer.filter(t => t.staerke === 'hart').map(t => t.art);

ist('Index: Kennzahlen', (({ produkte, nachStatus, shopPids, shopPidsZiffern, shopPidsUuid, ledgerPids, ledgerHandles, ledgerUngueltig, handles }) => ({ produkte, nachStatus, shopPids, shopPidsZiffern, shopPidsUuid, ledgerPids, ledgerHandles, ledgerUngueltig, handles }))(indexKennzahlen(ix)),
  { produkte: 15, nachStatus: { ACTIVE: 12, DRAFT: 2, ARCHIVED: 1 }, shopPids: 3, shopPidsZiffern: 2, shopPidsUuid: 1, ledgerPids: 3, ledgerHandles: 1, ledgerUngueltig: 0, handles: 15 });

// ── Richtung 1: bekannte Shop-Produkte MÜSSEN erkannt werden ──
{
  // Echt: Datenblatt (Zwischenspeicher) der Abendkleid-Ware: pid 2606080925471612300, productSku CJYD2926337. Im Shop steht KEINE pid-SKU (Auswahl-Lauf hat sie ersetzt).
  const r = istDublette({ pid: '2606080925471612300', productSku: 'CJYD2926337', titel: 'Satin Evening Dress With Mesh' }, ix);
  ist('productSku findet die Ware, obwohl die pid-SKU fehlt (zwei Produkte, beide Schreibweisen; 3 verschiedene normalisierte SKUs)', [r.dublette, harte(r), r.treffer[0].n, r.treffer[0].getroffen, r.treffer[0].produkte.map(p => p.handle).sort()],
    [true, ['productSku'], 2, 3, ['abendkleid-aurora-satin-spaghettitrager-schlitz', 'elegantes-satin-abendkleid-mit-mesh-einsatzen-612300']]);
  ist('Grund nennt Schlüssel, Handle und Status', /^Dublette: productSku CJYD2926337 ist Präfix von 3 SKUs im Shop-Produkt \S+ \(ACTIVE, \+1 weitere\)$/.test(r.grund), true);
}
{
  const r = istDublette({ pid: '2605050908281601400', productSku: 'CJYD2869988' }, ix);
  ist('pid findet das Produkt, dessen SKU nur die pid trägt (productSku allein fände es NICHT)', [r.dublette, harte(r), r.treffer[0].produkte[0].handle], [true, ['pid'], '10-in-1-reinigungburste-mit-sprachassistenz-601400']);
  const nurPs = istDublette({ productSku: 'CJYD2869988' }, ix);
  ist('Gegenprobe: ohne pid bleibt dieses Produkt unsichtbar → Kandidat MUSS beide Schlüssel mitbringen', [nurPs.dublette, nurPs.fehlt], [false, ['pid', 'variantSku']]);
}
{
  const r = istDublette({ pid: '2607010958251615500' }, ix);
  ist('gleiche pid in zwei Produkten (Entwurf + aktiv, ganz andere Titel): beide gemeldet', [r.dublette, r.treffer[0].n, r.treffer[0].produkte.map(p => p.status).sort()], [true, 2, ['ACTIVE', 'DRAFT']]);
}
{
  const r = istDublette({ pid: 'f4342e6a-a93c-4d78-8178-b267e288561f' }, ix);
  ist('UUID-pid, klein geschrieben, findet CJ-<UUID>', [r.dublette, harte(r)], [true, ['pid']]);
}
{
  const r = istDublette({ pid: '0002605050908281601400' }, ix);
  ist('pid mit führenden Nullen findet dasselbe Produkt wie ohne', [r.dublette, r.treffer[0].produkte[0].handle], [true, '10-in-1-reinigungburste-mit-sprachassistenz-601400']);
  ist('pid: gleiche Antwort mit und ohne Vorsatz cj:', istDublette({ pid: 'cj:2605050908281601400' }, ix).treffer[0].schluessel, istDublette({ pid: '2605050908281601400' }, ix).treffer[0].schluessel);
}
{
  const r = istDublette({ productSku: 'CJZJ2571866' }, ix);
  ist('productSku mit 4-Ziffern-Index (CJZJ2571866 → …0002; 420 Shop-SKUs, an CJ belegt)', [r.dublette, r.treffer[0].getroffen, r.treffer[0].produkte[0].handle], [true, 2, 'uv-led-nageltrockner-120w-439234']);
}
{
  const r = istDublette({ productSku: 'CJJJJTJT35117' }, ix);
  ist('productSku mit -Zusatz (CJJJJTJT35117-Light wood grain-EU)', [r.dublette, r.treffer[0].beispielSku], [true, 'CJJJJTJT35117-LIGHT WOOD GRAIN-EU']);
}
{
  const r = istDublette({ productSku: 'CJWY1731583' }, ix);
  ist('productSku mit 3-stelligem Index ab 100 (Hoodie mit 99+ Varianten)', [r.dublette, r.treffer[0].getroffen], [true, 3]);
}
{
  const r = istDublette({ variantSkus: ['CJYD292633701AZ', 'CJ-CJYD292633799ZZ', 'cjyd292633702by'] }, ix);
  ist('variantSku exakt, beide Schreibweisen und Kleinschreibung (2 von 3 getroffen)', [r.dublette, r.treffer[0].art, r.treffer[0].getroffen, r.treffer[0].von, r.treffer[0].n], [true, 'variantSku', 2, 3, 2]);
  const roh = istDublette({ pid: '1', variants: [{ variantSku: 'CJ-CJSL293135501AZ' }] }, ix);
  ist('rohes product/query-Objekt (variants[].variantSku) wird gelesen', [roh.dublette, harte(roh)], [true, ['variantSku']]);
}
{
  const r = istDublette({ productSku: 'CJSL2931355' }, ix);
  ist('archiviert und Entwurf zählen mit (Status steht im Treffer)', [r.dublette, r.treffer[0].produkte.map(p => p.status).sort()], [true, ['ARCHIVED', 'DRAFT']]);
}
{
  const r = istDublette({ handle: 'Keramik-Holzkohleofen-615500' }, ix);
  ist('Handle gleich (Gross/klein egal): Upsert würde das Produkt überschreiben', [r.dublette, harte(r), r.geprueft], [true, ['handle'], ['handle']]);
}
{
  const r = istDublette({ pid: '2059843910675750913' }, ix);
  ist('nur im Ledger (Produkt gelöscht): harter Treffer mit Quelle', [r.dublette, harte(r), r.treffer[0].quelle, r.unbekannt], [true, ['ledger-pid'], 'niche', false]);
  const w = istDublette({ pid: '2059843910675750913' }, ix, { ledgerGilt: false });
  ist('ledgerGilt:false macht den Ledger-Treffer zur Warnung', [w.dublette, w.warnung, w.treffer[0].staerke], [false, true, 'warnung']);
  const h = istDublette({ handle: 'vintage-vorhang-mit-spitze-und-perlen-607300' }, ix);
  ist('Handle nur im Ledger: hart', [h.dublette, harte(h)], [true, ['ledger-handle']]);
}

// ── Richtung 2: GEGENPROBE — Neues darf nicht blockiert werden ──
{
  const r = istDublette({ pid: '1999999999999999999', productSku: 'CJXX9999999', variantSkus: ['CJXX999999901AZ'], titel: 'Zzzz Qqqq Wwww Vvvv', handle: 'zzzz-qqqq-999999' }, ix);
  ist('völlig neue Ware: keine Dublette, keine Warnung, alle Schlüssel geprüft', [r.dublette, r.warnung, r.unbekannt, r.geprueft, r.fehlt], [false, false, false, ['pid', 'variantSku', 'productSku', 'handle', 'titel'], []]);
  ist('Grund nennt, was geprüft wurde', r.grund, 'kein Treffer (geprüft: pid, variantSku, productSku, handle, titel)');
}
{
  ist('Nachbarnummer: productSku +1 ist ein anderes Produkt', istDublette({ productSku: 'CJYD2926338' }, ix).dublette, false);
  ist('Nachbarnummer: pid +1 ist ein anderes Produkt', istDublette({ pid: '2605050908281601401' }, ix).dublette, false);
  ist('Nachbarnummer: variantSku +1', istDublette({ variantSkus: ['CJYD292633799AZ'] }, ix).dublette, false);
  // Präfix-Falle: «CJYD292633» (6 Ziffern) ist Anfang von CJYD292633701AZ — aber eine andere, kürzere Nummer
  const kurz = istDublette({ productSku: 'CJYD292633' }, ix);
  ist('Präfix-Falle: kürzere fremde productSku trifft nicht (unbekannte Form: nur leer/-Zusatz)', [kurz.dublette, kurz.hinweise.length], [false, 1]);
  ist('Präfix-Falle auch bei bekannter Form: längere fremde Nummer CJYD29263370 trifft nicht', istDublette({ productSku: 'CJYD29263370' }, ix).dublette, false);
  ist('Präfix-Falle: eine zu kurze productSku wird gar nicht gesucht', [istDublette({ productSku: 'CJ' }, ix).geprueft.includes('productSku'), istDublette({ productSku: 'CJ' }, ix).fehlt], [false, ['pid', 'variantSku', 'productSku (Form unbrauchbar)']]);
  ist('eigene Dropship-SKU 9000001_10163 ist kein CJ-Schlüssel (productSku-Prüfung entfällt)', istDublette({ productSku: '9000001_10163' }, ix).geprueft, []);
  ist('Zahl-Falle: pid kommt als Zahl an → nicht prüfbar statt falsch', [istDublette({ pid: 2605050908281601400 }, ix).dublette, istDublette({ pid: 2605050908281601400 }, ix).fehlt], [false, ['pid', 'variantSku', 'productSku']]);
}
{
  const r = istDublette({}, ix);
  ist('leerer Kandidat: unbekannt, nicht «keine Dublette»', [r.dublette, r.unbekannt, r.geprueft, /^nicht prüfbar/.test(r.grund)], [false, true, [], true]);
  const t = istDublette({ titel: 'Zzzz Qqqq Wwww' }, ix);
  ist('nur Titel, ohne Treffer: unbekannt (kein harter Schlüssel)', [t.dublette, t.unbekannt, t.geprueft], [false, true, ['titel']]);
  ist('null als Kandidat', istDublette(null, ix).unbekannt, true);
}

// ── Titel: Warnung, nie allein ein Nein ──
{
  const r = istDublette({ titel: 'Wasserdichte Outdoor-Sportuhr für Herren' }, ix);
  ist('gleicher Kern: Warnung mit Trefferliste, KEINE Dublette', [r.dublette, r.warnung, r.treffer[0].art, r.treffer[0].jaccard, r.treffer[0].produkte[0].handle], [false, true, 'titelkern-gleich', 1, 'wasserdichte-outdoor-sportuhr-herren-511744']);
  ist('Grund beginnt mit «keine Dublette, aber Warnung»', r.grund.startsWith('keine Dublette, aber Warnung: gleicher Titelkern wie 1 Shop-Produkt(e)'), true);
  const j = istDublette({ titel: 'Herren Fleecejacke mit Stehkragen und Reissverschluss' }, ix);
  ist('Jaccard 0,6: ähnlicher Titel (andere Ware, die Warnung ist ein Hinweis, kein Urteil)', [j.dublette, j.warnung, j.treffer[0].art, j.treffer[0].jaccard], [false, true, 'titel-aehnlich', 0.6]);
  const hoch = istDublette({ titel: 'Herren Fleecejacke mit Stehkragen und Reissverschluss' }, ix, { schwelle: 0.7 });
  ist('höhere Schwelle: keine Warnung mehr', [hoch.warnung, hoch.treffer], [false, []]);
  // Echtes Paar: dieselbe CJ-Ware (productSku CJYD2926337) unter zwei ganz anderen Titeln. Der Titel fängt sie NICHT (Jaccard 0,29), der SKU-Schlüssel schon.
  const nurMesh = baueIndex({ produkte: [SHOP[1]] });
  const ausTitel = istDublette({ titel: SHOP[0].title }, nurMesh);
  const ausSku = istDublette({ productSku: 'CJYD2926337' }, nurMesh);
  ist('echtes Paar «Aurora»/«Mesh-Einsätzen»: Titel allein sagt nichts (Jaccard unter 0,3), productSku sagt Dublette',
    [ausTitel.warnung, ausTitel.dublette, jaccard(titelKern(SHOP[0].title), titelKern(SHOP[1].title)) < 0.3, ausSku.dublette], [false, false, true, true]);
  const kurz = istDublette({ titel: 'Smartwatch Herren' }, ix);
  ist(`Kern unter ${MIN_KERN} Wörtern liefert kein Signal`, [kurz.warnung, kurz.geprueft, kurz.fehlt.some(f => f.startsWith('titel'))], [false, [], true]);
}
{
  // Reihenfolge der Nachbarn: höherer Jaccard zuerst, bei Gleichstand aktiv vor Entwurf
  const mini = baueIndex({ produkte: [
    { id: 'a', handle: 'a-ent', title: 'Wasserdichte Outdoor Sportuhr Herren', status: 'DRAFT', skus: [] },
    { id: 'b', handle: 'b-akt', title: 'Wasserdichte Outdoor Sportuhr Herren Premium', status: 'ACTIVE', skus: [] },
    { id: 'c', handle: 'c-nah', title: 'Wasserdichte Outdoor Sportuhr Damen Kinder', status: 'ACTIVE', skus: [] }] });
  const n = naheTitel(mini, titelKern('Wasserdichte Outdoor Sportuhr Herren'), { schwelle: 0.5 });
  ist('naheTitel: Gleichstand (Jaccard 1) → aktiv zuerst; Rest nach Jaccard', n.map(g => [mini.produkte[g.idx].handle, g.jaccard]), [['b-akt', 1], ['a-ent', 1], ['c-nah', 0.5]]);
  ist('naheTitel: Standardschwelle 0,6 lässt den Treffer mit Jaccard 0,5 weg', naheTitel(mini, titelKern('Wasserdichte Outdoor Sportuhr Herren')).map(g => mini.produkte[g.idx].handle), ['b-akt', 'a-ent']);
  ist('naheTitel: «ohne» blendet das eigene Produkt aus', naheTitel(mini, titelKern('Wasserdichte Outdoor Sportuhr Herren'), { ohne: 1 }).map(g => mini.produkte[g.idx].handle), ['a-ent']);
}

// ── kandidatAus: rohe CJ-Formen ──
ist('kandidatAus: product/list v1 (pid, productSku, productNameEn)', kandidatAus({ pid: '2109917869136715777', productSku: 'CJCD3253074', productNameEn: '45W High Speed PD Fast Charging 20000mAh Portable Power Bank' }),
  { pid: '2109917869136715777', productSku: 'CJCD3253074', variantSkus: [], titel: '45W High Speed PD Fast Charging 20000mAh Portable Power Bank', handle: '' });
ist('kandidatAus: product/listV2 (id, sku, nameEn)', kandidatAus({ id: '1617790452378382336', sku: 'CJGY1667382', nameEn: 'Pet Bed Handmade Rattan Woven Pet Bed Sofa For Dogs' }),
  { pid: '1617790452378382336', productSku: 'CJGY1667382', variantSkus: [], titel: 'Pet Bed Handmade Rattan Woven Pet Bed Sofa For Dogs', handle: '' });
ist('kandidatAus: product/query (variants[].variantSku, doppelte fallen weg)', kandidatAus({ pid: '82A7EADE-8023-4643-88BA-5B39434767E1', productSku: 'CJJJCWGY00594', variants: [{ variantSku: 'CJJJCWGY00594-Coffee-S' }, { variantSku: 'cjjjcwgy00594-coffee-s' }] }),
  { pid: '82A7EADE-8023-4643-88BA-5B39434767E1', productSku: 'CJJJCWGY00594', variantSkus: ['CJJJCWGY00594-COFFEE-S'], titel: '', handle: '' });
ist('kandidatAus: Shopify-gid als id ist keine pid', kandidatAus({ id: 'gid://shopify/Product/1' }).pid, null);

// ── fuegeHinzu: Kandidaten desselben Laufs sehen einander ──
{
  const lauf = baueIndex({ produkte: SHOP });
  ist('vorher: unbekannte Ware', istDublette({ pid: '2606130513001629500', productSku: 'CJLY2932597' }, lauf).dublette, false);
  fuegeHinzu(lauf, { id: 'geplant-1', handle: 'a-linien-kleid-mit-neckholder-und-stickerei-629500', title: 'A-Linien Kleid mit Neckholder und Stickerei', status: 'GEPLANT', pid: '2606130513001629500', productSku: 'CJLY2932597', skus: ['CJLY293259701AZ', 'CJLY293259702BY'] });
  const r = istDublette({ pid: '2606130513001629500', productSku: 'CJLY2932597' }, lauf);
  ist('nachher: gleiche Ware wird erkannt (pid + productSku), Status GEPLANT', [r.dublette, harte(r), r.treffer[0].produkte[0].status], [true, ['pid', 'productSku'], 'GEPLANT']);
  ist('nachher: auch über die SKU-Form des Shops (CJ-CJ…) und alte Treffer bleiben', [istDublette({ variantSkus: ['CJ-CJLY293259701AZ'] }, lauf).dublette, istDublette({ productSku: 'CJYD2926337' }, lauf).dublette], [true, true]);
  // sortierte SKU-Liste bleibt sortiert (Binärsuche!)
  ist('SKU-Liste bleibt nach dem Einfügen sortiert', lauf.skuListe.every((s, i) => i === 0 || lauf.skuListe[i - 1] < s), true);
  ist('Kennzahl zählt das neue Produkt', indexKennzahlen(lauf).produkte, SHOP.length + 1);
}

// ── Frische ──
{
  const jetzt = Date.parse('2026-10-27T12:00:00Z');
  ist('frisch: 7 h alt', istFrisch(ix, 24, jetzt), true);
  ist('nicht frisch: 30 h alt', istFrisch(ix, 24, Date.parse('2026-10-28T11:30:00Z')), false);
  ist('Stand unbekannt = nicht frisch', istFrisch(baueIndex({ produkte: [] }), 24, jetzt), false);
  ist('Stand in der Zukunft = nicht frisch', istFrisch(ix, 24, Date.parse('2026-10-26T00:00:00Z')), false);
}

// ── Index-Bau: schlechte Eingaben werden gezählt, nicht verschluckt ──
{
  const schlecht = baueIndex({ produkte: [{ handle: 'x' }, { handle: 'y', skus: ['', null, 'CJ-2605050908281601400'] }], ledgerPids: ['kaputt', '2.6E+18', { pid: '2605050908281601400' }], ledgerHandles: ['Ungültig Mit Leerzeichen', 'ok-handle'] });
  const k = indexKennzahlen(schlecht);
  ist('Index: unbrauchbare Ledger-Einträge gezählt', [k.ledgerUngueltig, k.ledgerPids, k.ledgerHandles], [3, 1, 1]);
  ist('Index: leere SKUs gezählt, Produkt ohne Felder ok', [k.skusLeer, k.produkte, k.shopPids], [2, 2, 1]);
  ist('Index ohne Eingabe', indexKennzahlen(baueIndex()).produkte, 0);
}

// ───────────────────────── ladeIndex (Attrappe statt Dateisystem) ─────────────────────────
{
  const dateien = {
    '/s/skus.jsonl': SHOP.slice(0, 4).map(p => JSON.stringify(p)).join('\n') + '\n',
    '/s/skus.jsonl.meta.json': JSON.stringify({ stand: '2026-10-27T05:08:33.289Z' }),
    '/d/cj_niche_done.txt': 'cj:2059843910675750913\ncj:489C08E7-C0DA-4A2A-A3EF-2ECAAA1F3D7C\n',
    '/d/cj_gaps_done.txt': 'pid:2065344692071587842\n',
    '/d/cj_varianten_ledger.txt': 'vintage-vorhang-mit-spitze-und-perlen-607300 · 2026-10-25T21:43:52.189Z · GESCHRIEBEN · 9 Varianten\n',
  };
  const opt = { skusDatei: '/s/skus.jsonl', ledgerDir: '/d', lies: p => { if (!(p in dateien)) throw new Error('ENOENT ' + p); return dateien[p]; }, existiert: p => p in dateien };
  const { index, bericht } = ladeIndex(opt);
  ist('ladeIndex: Produkte und Ledger gelesen', [indexKennzahlen(index).produkte, indexKennzahlen(index).ledgerPids, indexKennzahlen(index).ledgerHandles, index.stand], [4, 3, 1, '2026-10-27T05:08:33.289Z']);
  ist('ladeIndex: fehlende Ledger stehen im Bericht (nicht still übergangen)', bericht.fehlend.sort(), ['cj_sourcing_ledger.txt', 'cj_variantenbilder_ledger.txt', 'grind2_freigabe_ledger.txt', 'grind2_ledger.txt', 'grind2_ledger.txt'].sort());
  ist('ladeIndex: Bericht je gelesene Datei', bericht.ledger.map(l => [l.datei, l.art, l.eintraege]), [['cj_niche_done.txt', 'pid', 2], ['cj_gaps_done.txt', 'pid', 1], ['cj_varianten_ledger.txt', 'handle', 1]]);
  ist('ladeIndex: Index prüft wie ein gebauter', istDublette({ productSku: 'CJYD2926337' }, index).dublette, true);
  wirft('ladeIndex: ohne SKU-Datei Fehler mit Hinweis auf das Lese-Skript', () => ladeIndex({ ...opt, skusDatei: '/s/fehlt.jsonl' }), /grind_skus_lesen\.mjs/);
  const ohneMeta = ladeIndex({ ...opt, existiert: p => p in dateien && !p.endsWith('.meta.json'), lies: p => { if (p.endsWith('.meta.json')) throw new Error('weg'); return dateien[p]; } });
  ist('ladeIndex: ohne Meta-Datei kein Stand → nicht frisch, im Bericht vermerkt', [ohneMeta.index.stand, istFrisch(ohneMeta.index), ohneMeta.bericht.fehlend.some(f => f.includes('meta.json'))], [null, false, true]);
  // Geld F5 (Prüfung 27.10.2026): ein unvollständiger oder leerer Index darf nie als «frisch» durchgehen
  {
    const jetzt = new Date().toISOString();
    const mit = (meta, skus = dateien['/s/skus.jsonl'], min) => ladeIndex({ ...opt, mindestProdukte: min, lies: p => (p === '/s/skus.jsonl.meta.json' ? JSON.stringify(meta) : p === '/s/skus.jsonl' ? skus : dateien[p]) });
    const frisch = (meta, skus, min) => { const r = mit(meta, skus, min); return [istFrisch(r.index, 24), r.bericht.unvollstaendig ?? null]; };
    ist('ladeIndex: vollständige Meta + genug Produkte = frisch, ohne Lücken im Bericht', frisch({ stand: jetzt, vollstaendig: true, waisen: 0, kaputteZeilen: 0 }, undefined, 4), [true, null]);
    ist('ladeIndex: vollstaendig:false → nicht frisch, Grund im Bericht', (r => [r[0], /vollstaendig=false/.test(r[1]?.join(' '))])(frisch({ stand: jetzt, vollstaendig: false })), [false, true]);
    ist('ladeIndex: verwaiste Zeilen in der Meta → nicht frisch', (r => [r[0], /3 verwaiste/.test(r[1]?.join(' '))])(frisch({ stand: jetzt, vollstaendig: true, waisen: 3 })), [false, true]);
    ist('ladeIndex: kaputte Zeilen in der Meta → nicht frisch', (r => [r[0], /5 kaputte/.test(r[1]?.join(' '))])(frisch({ stand: jetzt, vollstaendig: true, kaputteZeilen: 5 })), [false, true]);
    ist('ladeIndex: eine abgeschnittene SKU-Datei (kaputte letzte Zeile) → nicht frisch, Zahl der kaputten Zeilen im Bericht', (r => [r[0], /2 kaputte Zeilen in der Datei/.test(r[1]?.join(' '))])(frisch({ stand: jetzt, vollstaendig: true }, dateien['/s/skus.jsonl'] + '{"id":"gid://x","handle":"abge\n{nicht json\n')), [false, true]);
    ist('ladeIndex: eine LEERE Datei ist nicht frisch (sonst fehlte die ganze Dublettenprüfung)', frisch({ stand: jetzt, vollstaendig: true }, '', 1)[0], false);
    ist('ladeIndex: weniger Produkte als erwartet (abgeschnittene Datei) → nicht frisch, Zahl im Bericht', (r => [r[0], /nur 4 Produkte \(erwartet mindestens 50000\)/.test(r[1]?.join(' '))])(frisch({ stand: jetzt, vollstaendig: true }, undefined, 50000)), [false, true]);
    ist('ladeIndex: ohne mindestProdukte (alte Aufrufer) bleibt die Zahl unbeachtet', frisch({ stand: jetzt, vollstaendig: true })[0], true);
    ist('ladeIndex: ein Index mit Lücken trägt keinen Stand', mit({ stand: jetzt, vollstaendig: false }).index.stand, null);
  }
  // Das Leseskript (grind_skus_lesen.mjs) stempelt «stand» NUR, wenn die Datei vollständig ist (offline: NUR_AUFBEREITEN=1 liest eine fertige Bulk-Rohdatei, kein Netz)
  {
    const skript = fileURLToPath(new URL('../grind_skus_lesen.mjs', import.meta.url));
    const dir = mkdtempSync(join(tmpdir(), 'skus-lesen-'));
    const lauf = (roh, kopf) => {
      const ziel = join(dir, 'skus-' + Math.random().toString(36).slice(2) + '.jsonl');
      writeFileSync(ziel + '.roh', roh);
      if (kopf) writeFileSync(ziel + '.meta.json', JSON.stringify(kopf));
      const r = spawnSync(process.execPath, [skript, ziel], { env: { PATH: process.env.PATH, NUR_AUFBEREITEN: '1' }, encoding: 'utf8', timeout: 30000 });
      return { exit: r.status, meta: existsSync(ziel + '.meta.json') ? JSON.parse(readFileSync(ziel + '.meta.json', 'utf8')) : null, out: ziel };
    };
    const P = (n, sku) => [JSON.stringify({ id: 'gid://shopify/Product/' + n, handle: 'h' + n, title: 'T' + n, status: 'ACTIVE' }), JSON.stringify({ id: 'gid://shopify/ProductVariant/' + n + '1', sku, __parentId: 'gid://shopify/Product/' + n })].join('\n') + '\n';
    const ganz = lauf(P(1, 'CJ-1') + P(2, 'CJ-2'), { objectCount: 4 });
    ist('SKU-Leser: vollständige Rohdatei (4 von 4 Objekten) → Exit 0, «stand» gestempelt, vollstaendig true', [ganz.exit, typeof ganz.meta.stand, ganz.meta.vollstaendig, ganz.meta.produkte, ganz.meta.varianten], [0, 'string', true, 2, 2]);
    const zuWenig = lauf(P(1, 'CJ-1'), { objectCount: 4 });
    ist('SKU-Leser: Shopify meldete 4 Objekte, die Datei hat nur 2 → Exit 3, KEIN «stand» (der Index gilt dann nie als frisch)', [zuWenig.exit, zuWenig.meta.stand, zuWenig.meta.vollstaendig, typeof zuWenig.meta.gelesenAm], [3, null, false, 'string']);
    const kaputt = lauf(P(1, 'CJ-1') + '{abgeschnitten\n', { objectCount: 3 });
    ist('SKU-Leser: eine kaputte Zeile → Exit 3, KEIN «stand», Zahl der kaputten Zeilen in der Meta', [kaputt.exit, kaputt.meta.stand, kaputt.meta.kaputteZeilen], [3, null, 1]);
    const waise = lauf(JSON.stringify({ id: 'gid://shopify/ProductVariant/91', sku: 'CJ-9', __parentId: 'gid://shopify/Product/999' }) + '\n' + P(1, 'CJ-1'), { objectCount: 3 });
    ist('SKU-Leser: eine Variante ohne Produkt (Waise) → Exit 3, KEIN «stand»', [waise.exit, waise.meta.stand, waise.meta.waisen], [3, null, 1]);
    // ohne Zugang oder mit fremdem Host: Exit 1 BEVOR irgendetwas gesendet wird
    const fremd = spawnSync(process.execPath, [skript, join(dir, 'x.jsonl')], { env: { PATH: process.env.PATH, SHOPIFY_SHOP: 'evil.example.com', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'geheim' }, encoding: 'utf8', timeout: 30000 });
    ist('SKU-Leser: fremder Host → Exit 1 mit Meldung, ohne Netzzugriff (client_secret geht nie an evil.example.com)', [fremd.status, /myshopify\.com/.test(fremd.stderr), /evil\.example\.com\/admin/.test(fremd.stderr + fremd.stdout)], [1, true, false]);
    rmSync(dir, { recursive: true, force: true });
  }
  ist('Standard-Ledgerlisten: drei pid- und fünf Handle-Quellen; das Prüf-Ledger cj_top_ledger zählt nicht als Import', [LEDGER_PIDS.map(l => l[0]), LEDGER_HANDLES.map(l => l[0])], [
    ['cj_niche_done.txt', 'cj_gaps_done.txt', 'grind2_ledger.txt'],
    ['cj_varianten_ledger.txt', 'cj_variantenbilder_ledger.txt', 'cj_sourcing_ledger.txt', 'grind2_ledger.txt', 'grind2_freigabe_ledger.txt']]);
}

// ───────────────────────── Gegenlesung 27.10.2026 («Geld und Tore»; «CJ und Shopify»): Waisen im Index, productSku des geplanten Produkts, Bulk-Reihenfolge ─────────────────────────
{
  // Y07 (Mutationsprobe): fuegeHinzu trägt die productSku des geplanten Produkts ein — ein zweiter Kandidat mit derselben productSku (anderer Titel, andere Varianten-SKUs) ist eine Dublette
  const ix = baueIndex({ produkte: [{ id: 'gid://shopify/Product/9', handle: 'altes-999999', title: 'Altes Produkt', status: 'ACTIVE', skus: ['CJ-2999999999999999999'] }] }, { stand: new Date().toISOString() });
  fuegeHinzu(ix, { handle: 'neues-123456', title: 'Neues Produkt', status: 'GEPLANT', pid: '2000000000000000001', productSku: 'CJTS1234567', skus: [] });
  const d = istDublette({ pid: '2000000000000000777', productSku: 'CJTS1234567', variantSkus: ['CJTS123456799ZZ'], titel: 'Ganz anders formuliert' }, ix);
  ist('Y07: die productSku eines GEPLANTEN Produkts steht im Index: ein zweiter Kandidat mit derselben productSku (andere pid, andere Varianten-SKU) ist eine Dublette über den Schlüssel productSku', [d.dublette, d.treffer.find(t => t.staerke === 'hart')?.art], [true, 'productSku']);
  ist('Y07-Gegenprobe: eine andere productSku ist keine Dublette', istDublette({ pid: '2000000000000000778', productSku: 'CJTS7654321', titel: 'Ganz anders formuliert' }, ix).dublette, false);

  // Waisen: der Sammler behält von den Tags nur die Marken grind2…, der Index trägt sie, die Trefferliste nennt sie
  const sam = bulkSammler();
  sam.add(JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'waise-000001', title: 'Waise', status: 'DRAFT', tags: ['cj-real', 'dropship', 'grind2', 'grind2-20261027', 'text-offen', 'sort-haushalt'] }));
  sam.add(JSON.stringify({ id: 'gid://shopify/ProductVariant/11', sku: 'CJTS123456701AZ', __parentId: 'gid://shopify/Product/1' }));
  sam.add(JSON.stringify({ id: 'gid://shopify/Product/2', handle: 'fremd-000002', title: 'Fremd', status: 'ACTIVE', tags: ['sort-haushalt', 'f:farbe'] }));
  sam.add(JSON.stringify({ id: 'gid://shopify/Product/3', handle: 'alt-000003', title: 'Alt', status: 'ACTIVE' }));
  const erg = sam.ergebnis();
  ist('Bulk-Sammler: nur die Marken grind2… bleiben (keine 87 765 Tag-Listen im Index), Produkte ohne tags gehen weiter', erg.produkte.map(p => [p.handle, p.tags ?? null]), [['waise-000001', ['grind2', 'grind2-20261027']], ['fremd-000002', null], ['alt-000003', null]]);
  const ix2 = baueIndex({ produkte: erg.produkte }, { stand: new Date().toISOString() });
  const dw = istDublette({ pid: '2000000000000000001', productSku: 'CJTS1234567', variantSkus: ['CJTS123456701AZ'], titel: 'x' }, ix2);
  ist('Index: der Treffer der Waise trägt ihre Marken und den Status DRAFT (daran erkennt der Lauf sie)', dw.treffer.find(t => t.staerke === 'hart').produkte.map(p => [p.handle, p.status, p.tags]), [['waise-000001', 'DRAFT', ['grind2', 'grind2-20261027']]]);

  // Bulk: die laufende Operation ist die NEUESTE → ohne reverse (GEMESSEN 27.10.2026: mit reverse:true kommt die älteste zuerst)
  ist('BULK_LAUFENDE_ABFRAGE: nach Erstellung sortiert, Status running/created, OHNE reverse', [/sortKey:CREATED_AT/.test(BULK_LAUFENDE_ABFRAGE), /status:running OR status:created/.test(BULK_LAUFENDE_ABFRAGE), /reverse/i.test(BULK_LAUFENDE_ABFRAGE)], [true, true, false]);
  const lesen = readFileSync(fileURLToPath(new URL('../grind_skus_lesen.mjs', import.meta.url)), 'utf8');
  {
    // das Leseskript (offline, NUR_AUFBEREITEN) schreibt die Marken grind2… in die Zeile des Produkts
    const skript = fileURLToPath(new URL('../grind_skus_lesen.mjs', import.meta.url)), dir = mkdtempSync(join(tmpdir(), 'skus-tags-')), ziel = join(dir, 'skus.jsonl');
    writeFileSync(ziel + '.roh', [JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'waise-000001', title: 'Waise', status: 'DRAFT', tags: ['cj-real', 'grind2', 'grind2-20261027'] }), JSON.stringify({ id: 'gid://shopify/ProductVariant/11', sku: 'CJ-1', __parentId: 'gid://shopify/Product/1' })].join('\n') + '\n');
    writeFileSync(ziel + '.meta.json', JSON.stringify({ objectCount: 2 }));
    const r = spawnSync(process.execPath, [skript, ziel], { env: { PATH: process.env.PATH, NUR_AUFBEREITEN: '1' }, encoding: 'utf8', timeout: 30000 });
    ist('SKU-Leser: die Zeile des Produkts trägt die Marken grind2… (und nur sie), Exit 0', [r.status, JSON.parse(readFileSync(ziel, 'utf8').trim().split('\n')[0]).tags], [0, ['grind2', 'grind2-20261027']]);
    rmSync(dir, { recursive: true, force: true });
  }
  ist('grind_skus_lesen.mjs benutzt BULK_LAUFENDE_ABFRAGE (keine eigene Abfrage mit reverse:true) und liest die Tags mit', [/q\(BULK_LAUFENDE_ABFRAGE\)/.test(lesen), /reverse\s*:\s*true/.test(lesen), /status tags variants/.test(lesen)], [true, false, true]);
}

console.log(`${bestanden} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
