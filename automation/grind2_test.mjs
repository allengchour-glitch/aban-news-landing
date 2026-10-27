// Tests für grind2.mjs («Grind 2.0», die Pipeline). Teil 1: reine Funktionen mit Gegenproben in BEIDE Richtungen. Teil 2: der ganze Lauf gegen ein SIMULIERTES Netz
// (CJ, Shopify, Gemini/Groq, Bild-Server, Produktseite — nichts davon ist echt; jede unbekannte Adresse wirft). Die Zusammenfassung steht am ENDE, Exit 1 bei einem Fehler.
// Lauf: node automation/grind2_test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  EXIT, KOSTEN, konfigAus, schutzPruefen, bedarfAus, schreibZaehlerAusLedger, baumAbflachen, cjPfadVertraut, cjQuellenFuer, listeUrl, quellenSchluessel,
  sperrwort, vorfilter, rangiere, vorfilterListe, verteile, titelBereinigen, titelPruefen, uebersetzungBrauchbar, TITEL_AUFTRAG, LABEL_AUFTRAG,
  productTypeTabelle, productTypeFuer, tagsFuer, preisMinFuer, preisUrteil, fristKopf, ledgerZeile, ledgerZeileGeschrieben, variantenVerbrauch, variantenBudget,
  toreNachAnlage, kanaeleAusReferenz, kontaktbogen, cjClient, modellJson, bilderPruefen, bildAliasBauen, ladeKategorienExtra, lauf, saisonSperre, zubehoerKonflikt, istEnglisch, faktenSprachfilter, faktenBlock,
} from './grind2.mjs';
import { ledgerGedaechtnis } from './lib/varianten_sicherheit.mjs';
import { baueIndex } from './lib/grind_dubletten.mjs';
import { preiseFuerVarianten } from './lib/grind_preis.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};
const wahr = (name, bed) => ist(name, !!bed, true);
const wirft = (name, fn, muster) => {
  try { fn(); fehl++; console.log('FEHLER', name, '\n  soll werfen, hat aber nicht geworfen'); }
  catch (e) { if (!muster || muster.test(String(e.message))) ok++; else { fehl++; console.log('FEHLER', name, '\n  falsche Meldung:', e.message); } }
};
const wirftAsync = async (name, fn, muster) => {
  try { await fn(); fehl++; console.log('FEHLER', name, '\n  soll werfen, hat aber nicht geworfen'); }
  catch (e) { if (!muster || muster.test(String(e.message))) ok++; else { fehl++; console.log('FEHLER', name, '\n  falsche Meldung:', e.message); } }
};
const klon = x => JSON.parse(JSON.stringify(x));
const img = n => `https://cf.cjdropshipping.com/test/${n}.jpg`;

// ─────────────────────────── Fixtures: CJ-Datenblätter im Format echter product/query-Antworten (synthetisch) ───────────────────────────
function webcam(pid = '2000000000000000001') {
  const g = [img('w1'), img('w2'), img('w3'), img('w4'), img('w5')];
  return {
    pid, productNameEn: 'Hot Sale 2024 Full HD 1080P USB Webcam With Microphone For PC Laptop', productSku: 'CJTS1234567', productKeyEn: 'Color',
    categoryId: 'CAT-COMPUTER-ACC', categoryName: 'Computer & Office > Office Electronics > Computer Tablet Accessories', status: '3', productType: 'ORDINARY_PRODUCT', isTestProduct: false,
    bigImage: g[0], productImage: JSON.stringify(g), materialNameEnSet: ['ABS'], packingNameEnSet: ['Color box'], productWeight: '120.00',
    description: '<p>Resolution: 1920x1080 pixels</p><p>Interface: USB 2.0</p><p>Cable length: 1.5 m</p><p>Package includes: 1 x webcam, 1 x manual</p>',
    variants: [
      { vid: '2000000000000000101', variantSku: 'CJTS123456701AZ', variantKey: 'Black', variantImage: img('wv1'), variantWeight: 120, variantSellPrice: 5.5 },
      { vid: '2000000000000000102', variantSku: 'CJTS123456702BY', variantKey: 'White', variantImage: img('wv2'), variantWeight: 125, variantSellPrice: 5.9 },
    ],
  };
}
function lichterkette(pid = '2000000000000000002') {
  const g = [img('l1'), img('l2'), img('l3'), img('l4')];
  return {
    pid, productNameEn: 'Solar Powered Garden String Lights Waterproof Outdoor Fairy Lights', productSku: 'CJJD7654321', productKeyEn: 'Color-Length',
    categoryId: 'CAT-STRING-LIGHTS', categoryName: 'Home Improvement > Outdoor Lighting > String Lights', status: '3', productType: 'ORDINARY_PRODUCT', isTestProduct: false,
    bigImage: g[0], productImage: JSON.stringify(g), materialNameEnSet: ['Copper wire'], productWeight: '200.00',
    description: '<p>Solar panel included. Length: 5 m or 10 m. Material: copper wire.</p>',
    variants: [
      { vid: '2000000000000000201', variantSku: 'CJJD765432101AZ', variantKey: 'Warm White-5m', variantImage: img('lv1'), variantWeight: 200, variantSellPrice: 3.2 },
      { vid: '2000000000000000202', variantSku: 'CJJD765432102BY', variantKey: 'Warm White-10m', variantImage: img('lv2'), variantWeight: 350, variantSellPrice: 4.8 },
      { vid: '2000000000000000203', variantSku: 'CJJD765432103CX', variantKey: 'Colorful-5m', variantImage: img('lv3'), variantWeight: 200, variantSellPrice: 3.4 },
      { vid: '2000000000000000204', variantSku: 'CJJD765432104DW', variantKey: 'Colorful-10m', variantImage: img('lv4'), variantWeight: 350, variantSellPrice: 5.0 },
    ],
  };
}
/** Listeneintrag (product/list v1) zu einem Datenblatt. */
const listeneintrag = (c, extra = {}) => ({ pid: c.pid, productNameEn: c.productNameEn, productSku: c.productSku, productImage: c.bigImage, productType: 'ORDINARY_PRODUCT', categoryId: c.categoryId,
  categoryName: c.categoryName.split(' > ').pop(), sellPrice: String(c.variants[0].variantSellPrice), listedNum: 120, shippingCountryCodes: ['CN', 'CN_US'], isTestProduct: false, customizationVersion: 0, ...extra });

// ═══════════════════════════ TEIL 1: reine Funktionen ═══════════════════════════
const cfg0 = konfigAus({}, '/tmp/xx-wurzel');

// ── Konfiguration
ist('Vorgabe: Trockenlauf', [cfg0.live, cfg0.publish, cfg0.modus], [false, false, 'lauf']);
ist('Vorgabe: 5 % von 10 000 Varianten, Gesamtgrenze 9 000, Reserve 15 000', [cfg0.tageslimit, cfg0.anteil, cfg0.gesamtMax, cfg0.reserve], [10000, 0.05, 9000, 15000]);
ist('Vorgabe: Wellen S und 1, nur ORDINARY_PRODUCT', [cfg0.wellen, cfg0.produktarten], [['S', '1'], ['ORDINARY_PRODUCT']]);
ist('Vorgabe: Freigabedatei liegt unter dropship/GRIND2-FREI.txt', cfg0.pfade.freigabeDatei, '/tmp/xx-wurzel/dropship/GRIND2-FREI.txt');
ist('Vorgabe: Ledger dropship/grind2_ledger.txt', cfg0.pfade.ledger, '/tmp/xx-wurzel/dropship/grind2_ledger.txt');
const probe = konfigAus({ MODUS: 'probe' }, '/tmp/xx-wurzel');
ist('Probe: zwei Zielblätter (Webcams, Lichterketten), 10 Kandidaten, 600 Punkte', [probe.ziele, probe.limit, probe.punkteMax, probe.proZiel], [['webcams', 'lichterketten'], 10, 600, 5]);
ist('Probe: Bericht nach /tmp/grind2/bau/probe.md', probe.pfade.out, '/tmp/grind2/bau/probe.md');
ist('Umgebung überschreibt: LIMIT, ZIELE, GRIND_ANTEIL (Saison-Welle)', (c => [c.limit, c.ziele, c.anteil])(konfigAus({ LIMIT: '3', ZIELE: 'a, b', GRIND_ANTEIL: '0.2' }, '/x')), [3, ['a', 'b'], 0.2]);
wirft('Konfig: LIMIT=abc wirft statt still die Vorgabe zu nehmen', () => konfigAus({ LIMIT: 'abc' }), /LIMIT/);
wirft('Konfig: LIMIT=0 wirft', () => konfigAus({ LIMIT: '0' }), /LIMIT/);
wirft('Konfig: LIMIT=2.5 wirft (ganze Zahl)', () => konfigAus({ LIMIT: '2.5' }), /ganze/);
wirft('Konfig: Anteil über 50 % wirft', () => konfigAus({ GRIND_ANTEIL: '0.9' }), /GRIND_ANTEIL/);
wirft('Konfig: unbekannter MODUS wirft', () => konfigAus({ MODUS: 'scharf' }), /MODUS/);
wirft('Konfig: AUFSCHLAG unter 1 wirft (Verkauf unter Einstand)', () => konfigAus({ AUFSCHLAG: '0.9' }), /AUFSCHLAG/);

// ── Schutz: alle Kombinationen
ist('Schutz: nichts gesetzt = trocken', schutzPruefen(konfigAus({}, '/x'), { freigabe: false }), 'trocken');
ist('Schutz: Probe = probe', schutzPruefen(konfigAus({ MODUS: 'probe' }, '/x'), { freigabe: false }), 'probe');
ist('Schutz: LIVE mit Freigabedatei = live', schutzPruefen(konfigAus({ LIVE: '1' }, '/x'), { freigabe: true }), 'live');
ist('Schutz: LIVE + PUBLISH mit Freigabedatei', schutzPruefen(konfigAus({ LIVE: '1', PUBLISH: '1' }, '/x'), { freigabe: true }), 'live+publish');
wirft('Schutz: LIVE=1 OHNE Freigabedatei wirft', () => schutzPruefen(konfigAus({ LIVE: '1' }, '/x'), { freigabe: false }), /Freigabedatei/);
wirft('Schutz: Freigabedatei allein (ohne LIVE=1) schreibt trotzdem nicht', () => { if (schutzPruefen(konfigAus({}, '/x'), { freigabe: true }) !== 'trocken') throw new Error('falsch'); throw new Error('trocken, wie gewollt'); }, /trocken, wie gewollt/);
wirft('Schutz: PUBLISH=1 ohne LIVE wirft', () => schutzPruefen(konfigAus({ PUBLISH: '1' }, '/x'), { freigabe: true }), /PUBLISH=1 braucht LIVE/);
wirft('Schutz: Probe mit LIVE wirft', () => schutzPruefen(konfigAus({ MODUS: 'probe', LIVE: '1' }, '/x'), { freigabe: true }), /Probe-Modus/);
wirft('Schutz: Probe mit PUBLISH wirft', () => schutzPruefen(konfigAus({ MODUS: 'probe', PUBLISH: '1' }, '/x'), { freigabe: true }), /Probe-Modus/);

// ── Stufe 1: Bedarf
const LUECKEN = { ziele: [
  { id: 'a', name: 'A', rang: 2, welle: '1', ziel: 45, luecke: 40, cj: '', cjSuche: 'aa · bb' },
  { id: 'b', name: 'B', rang: 1, welle: '1', ziel: 45, luecke: 44, cj: '', cjSuche: 'bb' },
  { id: 's', name: 'S', rang: 3, welle: 'S (Saison jetzt)', ziel: 30, luecke: 28, cj: '', cjSuche: 'ss' },
  { id: 'r', name: 'R', rang: 4, welle: 'R (zurückgestellt)', ziel: 45, luecke: 30, cj: '', cjSuche: 'rr' },
  { id: 'z', name: 'Z', rang: 5, welle: 'Z (später)', ziel: 45, luecke: 30, cj: '', cjSuche: 'zz' },
  { id: 'voll', name: 'Voll', rang: 6, welle: '1', ziel: 30, luecke: 5, cj: '', cjSuche: 'vv' },
] };
ist('Bedarf: Saison-Welle zuerst, dann Welle 1 nach Rang; R und Z bleiben draussen', bedarfAus(LUECKEN).map(z => z.id), ['s', 'b', 'a', 'voll']);
ist('Bedarf: Restbedarf = Lücke minus Geschriebenes; ein erfülltes Ziel fällt weg', bedarfAus(LUECKEN, { geschrieben: new Map([['a', 10], ['voll', 5]]) }).map(z => [z.id, z.rest]), [['s', 28], ['b', 44], ['a', 30]]);
ist('Bedarf: gewählte Ziele gelten ohne Welle, in genannter Reihenfolge', bedarfAus(LUECKEN, { ziele: ['r', 'a'] }).map(z => z.id), ['r', 'a']);
ist('Bedarf: Suchwörter werden an « · » getrennt', bedarfAus(LUECKEN, { ziele: ['a'] })[0].cjSuche, ['aa', 'bb']);
ist('Bedarf: andere Wellenwahl', bedarfAus(LUECKEN, { wellen: ['Z'] }).map(z => z.id), ['z']);
wirft('Bedarf: unbekanntes Ziel wirft', () => bedarfAus(LUECKEN, { ziele: ['nix'] }), /unbekannte Zielblätter nix/);
wirft('Bedarf: Datei ohne «ziele» wirft', () => bedarfAus({}), /keine Liste/);
wirft('Bedarf: Lücke keine Zahl wirft', () => bedarfAus({ ziele: [{ id: 'x', luecke: 'viel' }] }), /ohne gültige Lücke/);
ist('Schreibzähler: nur GESCHRIEBEN-Zeilen mit Ziel zählen', [...schreibZaehlerAusLedger([
  'p1 · 2026-10-27T10:00:00.000Z · GESCHRIEBEN · 5 Varianten · h1 · gid://1 · webcams',
  'p2 · 2026-10-27T10:00:00.000Z · GESCHRIEBEN · 3 Varianten · h2 · gid://2 · webcams',
  'p3 · 2026-10-27T10:00:00.000Z · UEBERSPRUNGEN · Dublette',
  'p4 · 2026-10-27T10:00:00.000Z · GESCHRIEBEN · 2 Varianten',                       // alte Form ohne Ziel
  'h5 · 2026-10-27T10:00:00.000Z · GESCHRIEBEN · 9 Varianten · x · y · lichterketten'].join('\n'))], [['webcams', 2], ['lichterketten', 1]]);

// ── Stufe 2: Quellen
const BAUM = [{ categoryFirstName: 'Home Improvement', categoryFirstList: [{ categorySecondName: 'Outdoor Lighting', categorySecondList: [
  { categoryId: 'ID-STRING', categoryName: 'String Lights' }, { categoryId: 'ID-FLOOD', categoryName: 'Flood Lights' }] }] },
{ categoryFirstName: 'Pet Supplies', categoryFirstList: [{ categorySecondName: 'Pet Bedding', categorySecondList: [{ categoryId: 'ID-BEDS', categoryName: 'Pet Beds' }, { categoryId: 'ID-MATS', categoryName: 'Pet Mats' }] },
  { categorySecondName: 'Accessories', categorySecondList: [{ categoryId: 'ID-ACC1', categoryName: 'Accessories' }] }] },
{ categoryFirstName: 'Toys', categoryFirstList: [{ categorySecondName: 'Accessories', categorySecondList: [{ categoryId: 'ID-ACC2', categoryName: 'Accessories' }] }] }];
const KN = baumAbflachen(BAUM);
ist('Baum: jede Ebene mit ID wird ein Knoten (hier nur Blätter tragen eine ID)', KN.map(k => [k.id, k.name, k.ebene]), [['ID-STRING', 'String Lights', 3], ['ID-FLOOD', 'Flood Lights', 3], ['ID-BEDS', 'Pet Beds', 3], ['ID-MATS', 'Pet Mats', 3], ['ID-ACC1', 'Accessories', 3], ['ID-ACC2', 'Accessories', 3]]);
ist('Baum: Pfad des Knotens enthält die Eltern', KN[0].pfad, ['Home Improvement', 'Outdoor Lighting', 'String Lights']);
ist('Baum: unbekannte Form oder null = leere Liste (dann zählen Suchwörter)', [baumAbflachen(null).length, baumAbflachen({ x: 1 }).length, baumAbflachen('text').length], [0, 0, 0]);
ist('Baum: auch Knoten mit ID in den oberen Ebenen (Gruppen)', baumAbflachen([{ categoryId: 'G1', categoryName: 'Gruppe', children: [{ categoryId: 'B1', categoryName: 'Blatt' }] }]).map(k => [k.id, k.ebene]), [['G1', 1], ['B1', 2]]);
ist('Vertrauen: belegte Kategorie', cjPfadVertraut({ cj: 'Home Improvement > Outdoor Lighting > String Lights' }), true);
ist('Vertrauen: «(Zuordnung bei CJ nicht belegt)» = nein', cjPfadVertraut({ cj: 'Computer & Office > Office Electronics > Computer Tablet Accessories (Zuordnung bei CJ nicht belegt)' }), false);
ist('Vertrauen: «(Zuordnung offen)» = nein', cjPfadVertraut({ cj: 'Sports & Outdoors > Other Sports Equipment > Skiing & Snowboarding (Zuordnung offen)' }), false);
ist('Vertrauen: «(6 Blätter)» ist kein Mangel', cjPfadVertraut({ cj: 'Health, Beauty & Hair > Wigs & Extensions (6 Blätter)' }), true);
ist('Vertrauen: leer = nein', cjPfadVertraut({ cj: '' }), false);
ist('Quellen: belegte Kategorie zuerst, dann die Suchwörter', cjQuellenFuer({ cj: 'Home Improvement > Outdoor Lighting > String Lights', cjSuche: ['string lights', 'fairy lights'] }, KN),
  [{ art: 'kategorie', id: 'ID-STRING', name: 'String Lights' }, { art: 'suche', wort: 'string lights' }, { art: 'suche', wort: 'fairy lights' }]);
ist('Quellen: unbelegte Zuordnung → NUR Suchwörter (Webcams stünden sonst unter Tablet-Zubehör)', cjQuellenFuer({ cj: 'Computer & Office > Office Electronics > Computer Tablet Accessories (Zuordnung bei CJ nicht belegt)', cjSuche: ['webcam'] }, KN), [{ art: 'suche', wort: 'webcam' }]);
ist('Quellen: mehrdeutiger Name («Accessories») ohne Eltern-Hinweis = keine Kategorie', cjQuellenFuer({ cj: 'X > Accessories', cjSuche: [] }, KN), []);
ist('Quellen: mehrdeutiger Name wird über den Elternpfad eindeutig', cjQuellenFuer({ cj: 'Pet Supplies > Accessories', cjSuche: [] }, KN), [{ art: 'kategorie', id: 'ID-ACC1', name: 'Accessories' }]);
ist('Quellen: Alternativen « / » und Pluszeichen', cjQuellenFuer({ cj: 'Pet Supplies > Pet Bedding > Pet Beds / Pet Mats', cjSuche: [] }, KN).map(q => q.id), ['ID-BEDS', 'ID-MATS']);
ist('Quellen: Name nicht im Baum = keine Kategorie, Suchwort bleibt', cjQuellenFuer({ cj: 'A > B > Gibt es nicht', cjSuche: ['x'] }, KN), [{ art: 'suche', wort: 'x' }]);
ist('Quellen: Suchwort als Text mit « · »', cjQuellenFuer({ cj: '', cjSuche: 'a · b' }, []).map(q => q.wort), ['a', 'b']);
ist('Quellen: doppelte Suchwörter fallen weg', cjQuellenFuer({ cj: '', cjSuche: ['a', 'A', 'b'] }, []).map(q => q.wort), ['a', 'b']);
ist('Quellen: ohne Baum keine Kategorie', cjQuellenFuer({ cj: 'Home Improvement > Outdoor Lighting > String Lights', cjSuche: [] }, []), []);
ist('Liste: Kategorie, absteigend nach listedNum, 200 je Seite', listeUrl({ kategorieId: 'ID-1', seite: 2, groesse: 200 }), 'https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=2&pageSize=200&orderBy=listedNum&sort=desc&categoryId=ID-1');
ist('Liste: Suchwort wird kodiert (%20, nicht +)', listeUrl({ suche: 'string lights' }).endsWith('&productNameEn=string%20lights'), true);
wirft('Liste: weder Kategorie noch Suchwort wirft', () => listeUrl({}), /weder Kategorie noch Suchwort/);
ist('Zwischenspeicher-Schlüssel ist dateinamentauglich', quellenSchluessel({ art: 'suche', wort: 'String Lights / Fairy' }, 1), 'suche-string_lights_fairy-p1');
ist('Zwischenspeicher-Schlüssel mit Kategorie', quellenSchluessel({ art: 'kategorie', id: 'EA85-15' }, 2), 'kategorie-ea85_15-p2');

// ── Stufe 3: Vorfilter
const INDEX0 = baueIndex({ produkte: [{ id: 'g1', handle: 'schon-da-111111', title: 'Alte Ware', status: 'ACTIVE', skus: ['CJ-2000000000000000999', 'CJDUP0000001-X'] }], ledgerPids: [], ledgerHandles: [] }, { stand: new Date().toISOString() });
const gut = (extra = {}) => ({ pid: '2111111111111111111', productNameEn: 'USB Desk Fan Mini Quiet', productSku: 'CJAB1111111', productImage: 'https://x/y.jpg', productType: 'ORDINARY_PRODUCT', sellPrice: '3.20 -- 4.10',
  listedNum: 50, shippingCountryCodes: ['CN'], isTestProduct: false, customizationVersion: 0, ...extra });
const vf = (t, extra = {}) => vorfilter(t, { cfg: cfg0, index: INDEX0, erledigt: new Set(), ...extra });
ist('Vorfilter: guter Treffer geht durch (Preisspanne → unterer Wert)', (r => [r.nehmen, r.pid, r.u.preis, r.u.laeden])(vf(gut())), [true, '2111111111111111111', 3.2, 50]);
ist('Vorfilter: Ledger (schon geprüft)', vf(gut(), { erledigt: new Set(['2111111111111111111']) }).grund, 'ledger');
ist('Vorfilter: pid unlesbar', vf(gut({ pid: 'abc' })).grund, 'pid-ungueltig');
ist('Vorfilter: SUPPLIER_SHIPPED_PRODUCT fällt (Vorgabe nur ORDINARY)', vf(gut({ productType: 'SUPPLIER_SHIPPED_PRODUCT' })).grund, 'produktart:SUPPLIER_SHIPPED_PRODUCT');
ist('Vorfilter: ...bleibt aber erlaubt, wenn die Konfiguration es erlaubt', vorfilter(gut({ productType: 'SUPPLIER_SHIPPED_PRODUCT' }), { cfg: { ...cfg0, produktarten: ['ORDINARY_PRODUCT', 'SUPPLIER_SHIPPED_PRODUCT'] }, index: INDEX0 }).nehmen, true);
ist('Vorfilter: leere Produktartenliste = keine Einschränkung', vorfilter(gut({ productType: 'WAS_AUCH_IMMER' }), { cfg: { ...cfg0, produktarten: [] }, index: INDEX0 }).nehmen, true);
ist('Vorfilter: Personalisierung (DIY)', vf(gut({ customizationVersion: 2 })).grund, 'personalisiert');
ist('Vorfilter: Lager nur in ES/US/DE (Fracht ab CN nicht aussagekräftig)', vf(gut({ shippingCountryCodes: ['ES'] })).grund, 'lager:ES');
ist('Vorfilter: Lager CN und CN_US geht', vf(gut({ shippingCountryCodes: ['CN', 'CN_US', 'US'] })).nehmen, true);
ist('Vorfilter: Lager unbekannt (Feld fehlt) wird NICHT als Ablehnung gewertet', vf(gut({ shippingCountryCodes: undefined })).nehmen, true);
ist('Vorfilter: listedNum unter der Schwelle', vf(gut({ listedNum: 2 })).grund, 'zu-wenig-erprobt');
ist('Vorfilter: Schwelle gilt genau (5 geht, 4 nicht)', [vf(gut({ listedNum: 5 })).nehmen, vf(gut({ listedNum: 4 })).nehmen], [true, false]);
ist('Vorfilter: zu teuer (EK über 40 USD)', vf(gut({ sellPrice: '55.00' })).grund, 'zu-teuer');
ist('Vorfilter: Preis unlesbar = unbekannt, nicht billig', vf(gut({ sellPrice: null })).grund, 'preis-unbekannt');
ist('Vorfilter: Testprodukt', vf(gut({ isTestProduct: true })).grund, 'testprodukt');
ist('Vorfilter: Messer (englisch!)', vf(gut({ productNameEn: 'Folding Pocket Knife' })).grund, 'klinge-waffenrecht');
ist('Vorfilter: Marke (englisch!)', vf(gut({ productNameEn: 'Samsung Galaxy Case' })).grund, 'markenware');
ist('Vorfilter: Waffe', vf(gut({ productNameEn: 'Airsoft Scope Mount' })).grund.startsWith('sperrwort:Waffe'), true);
ist('Vorfilter: Erwachsenen-Ware', vf(gut({ productNameEn: 'Vibrating Massager Adult Toys' })).grund.startsWith('sperrwort:Erwachsene'), true);
ist('Vorfilter: Tabak', vf(gut({ productNameEn: 'Electronic Cigarette Vape Pen' })).grund.startsWith('sperrwort:Tabak'), true);
ist('Vorfilter: Auto-Zigarettenanzünder ist KEIN Tabak', vf(gut({ productNameEn: 'Car Cigarette Lighter Socket Splitter' })).grund.startsWith('sperrwort:Tabak'), false);
ist('Vorfilter: Lizenzfigur (je nach Muster als Marke oder Lizenz abgelehnt, nie durchgelassen)', (r => !r.nehmen && /markenware|sperrwort:Lizenz/.test(r.grund))(vf(gut({ productNameEn: 'Harry Potter Wand Light' }))), true);
ist('Sperrwort: Lizenzfigur wird auch ohne Markenmuster erkannt', sperrwort('Batman Night Light'), 'Lizenz «Batman»');
ist('Vorfilter: Steckdosenleiste', vf(gut({ productNameEn: 'Smart Power Strip With USB' })).grund.startsWith('sperrwort:Steckdose'), true);
ist('Vorfilter: Baby/Kinder (Merchant-Risiko)', vf(gut({ productNameEn: 'Baby Monitor Camera' })).grund.startsWith('merchant:'), true);
ist('Vorfilter: Dublette über die pid-SKU im Shop', (r => [r.nehmen, r.grund])(vf(gut({ pid: '2000000000000000999' }))), [false, 'dublette']);
ist('Vorfilter: Dublette über productSku-Präfix im Shop', (r => [r.nehmen, r.grund])(vf(gut({ productSku: 'CJDUP0000001' }))), [false, 'dublette']);
ist('Vorfilter: ohne Index keine Dublettenprüfung (Gegenprobe: dasselbe Produkt geht durch)', vorfilter(gut({ pid: '2000000000000000999' }), { cfg: cfg0 }).nehmen, true);
ist('Sperrwort: harmloser Titel hat keins', sperrwort('Full HD USB Webcam With Microphone'), null);
ist('Sperrwort: «unisex» ist kein Sex-Wort, «analog» kein Anal-Wort', [sperrwort('Unisex Analog Watch'), sperrwort('Essex Style Mug')], [null, null]);
const LISTE = [gut(), gut({ pid: '2111111111111111112', listedNum: 900 }), gut({ pid: '2111111111111111112', listedNum: 900 }), gut({ pid: '2111111111111111113', productType: 'DIY_PRODUCT' }),
  gut({ pid: '2111111111111111114', listedNum: 900, sellPrice: '1.00' }), gut({ pid: '2111111111111111115', productNameEn: 'Pocket Knife' })];
const VL = vorfilterListe(LISTE, { cfg: cfg0, index: INDEX0, erledigt: new Set() });
ist('Vorfilterliste: Rangfolge listedNum absteigend, dann tieferer Einkauf', VL.durch.map(d => d.pid), ['2111111111111111114', '2111111111111111112', '2111111111111111111']);
ist('Vorfilterliste: Ablehnungen nach Grund gezählt, doppelte pid zählt nicht doppelt', VL.abgelehnt, { produktart: 1, 'klinge-waffenrecht': 1 });
ist('Vorfilterliste: je Grund ein Beispielname', VL.beispiele['klinge-waffenrecht'], 'Pocket Knife');
ist('Vorfilterliste: Nicht-Liste ist leer, kein Absturz', vorfilterListe(null, { cfg: cfg0 }).durch, []);
ist('Rangfolge: bei gleicher listedNum und gleichem Preis entscheidet die pid (stabil)', rangiere([{ pid: 'b', u: { laeden: 5, preis: 1 } }, { pid: 'a', u: { laeden: 5, preis: 1 } }]).map(x => x.pid), ['a', 'b']);
const jz = (id, n, rest = 99) => ({ ziel: { id, rest }, kandidaten: Array.from({ length: n }, (_, i) => ({ pid: `${id}${i}` })) });
ist('Verteilen: reihum, höchstens proZiel je Zielblatt', verteile([jz('a', 4), jz('b', 4)], { limit: 10, proZiel: 2 }).map(x => x.k.pid), ['a0', 'b0', 'a1', 'b1']);
ist('Verteilen: limit schneidet ab, auch mitten in einer Runde', verteile([jz('a', 4), jz('b', 4), jz('c', 4)], { limit: 4, proZiel: 5 }).map(x => x.k.pid), ['a0', 'b0', 'c0', 'a1']);
ist('Verteilen: ein leeres Zielblatt hält die anderen nicht auf', verteile([jz('a', 0), jz('b', 3)], { limit: 5, proZiel: 5 }).map(x => x.k.pid), ['b0', 'b1', 'b2']);
ist('Verteilen: der Restbedarf deckelt das Zielblatt', verteile([jz('a', 5, 1), jz('b', 5, 3)], { limit: 10, proZiel: 5 }).map(x => x.k.pid), ['a0', 'b0', 'b1', 'b2']);
ist('Verteilen: nichts zu verteilen = leer', verteile([], { limit: 5 }), []);

// ── Titel
ist('Titel säubern: ß, Anführungszeichen, Schlusspunkt, Leerraum', titelBereinigen('  „Fußmatte   aus Gummi“. '), 'Fussmatte aus Gummi');
ist('Titel säubern: Steuerzeichen', titelBereinigen('Webcam\nmit\tMikrofon'), 'Webcam mit Mikrofon');
const QW = 'Product name: Hot Sale 2024 Full HD 1080P USB Webcam With Microphone\nMaterial (supplier field): ABS\nDescription:\nResolution: 1920x1080 pixels\nInterface: USB 2.0';
const tp = (titel, quelle = QW, cjName = 'Full HD 1080P USB Webcam') => titelPruefen(titel, { cjName, quelle });
ist('Titel: guter Titel besteht', tp('Full HD USB-Webcam mit Mikrofon').ok, true);
ist('Titel: Zahl aus dem Datenblatt ist erlaubt (1080)', tp('Webcam 1080P mit Mikrofon').ok, true);
ist('Titel: erfundene Zahl fällt', tp('Webcam 4K mit Mikrofon').probleme, ['Zahl im Titel steht nicht im Datenblatt']);
ist('Titel: zu kurz', tp('Cam').probleme.includes('Titel zu kurz'), true);
ist('Titel: zu lang', tp('W'.repeat(95)).probleme.some(p => p.startsWith('Titel zu lang')), true);
ist('Titel: englischer Rest (Farbwort)', tp('Webcam Black mit Mikrofon').probleme.some(p => p.startsWith('englischer Rest')), true);
ist('Titel: Marke/Werbewort aus VERBOTEN', tp('Apple Webcam mit Mikrofon').probleme.some(p => p.startsWith('verbotenes Wort')), true);
ist('Titel: chinesische Zeichen', tp('Webcam 摄像头 mit Mikrofon').probleme.some(p => p.includes('chinesische')), true);
ist('Titel: «Edelstahl» ohne Beleg fällt', tp('Edelstahl Webcam Halterung').probleme.includes('«Edelstahl» im Titel, aber kein Beleg im Datenblatt'), true);
ist('Titel: «Edelstahl» MIT Beleg besteht', tp('Edelstahl Halterung für Webcam', QW + '\nMaterial (supplier field): Stainless steel').ok, true);
ist('Titel: «Leder» ohne Beleg fällt', tp('Leder Hülle für Webcam').probleme.some(p => p.includes('Leder')), true);
ist('Titel: «Kunstleder» ist ehrlich und besteht (kein Echtleder-Versprechen)', tp('Kunstleder Hülle für Webcam').ok, true);
ist('Titel: «PU-Leder» ist ehrlich', tp('PU-Leder Hülle für Webcam', QW + '\nMaterial: PU leather').ok, true);
ist('Titel: «Leder» bei Datenblatt «PU leather» fällt', tp('Leder Hülle für Webcam', QW + '\nMaterial: PU leather').probleme.includes('Datenblatt nennt Kunst-/PU-Leder'), true);
ist('Titel: «Leder» bei echtem Leder (genuine leather) besteht', tp('Leder Hülle für Webcam', QW + '\nMaterial: genuine leather').ok, true);
ist('Titel: «wasserfest» ohne Beleg fällt (auch ohne VERBOTEN-Treffer)', tp('Wasserfeste Webcam').probleme.includes('«wasserdicht» im Titel, aber kein Beleg im Datenblatt'), true);
ist('Titel: «wasserdicht» nur im Lieferantennamen genügt nicht', tp('Wasserfeste Webcam', 'Product name: Waterproof Webcam\nMaterial: ABS').probleme.includes('«wasserdicht» steht nur im Lieferantennamen (Werbetext), nicht im Datenblatt'), true);
ist('Titel: «wasserfest» mit Schutzklasse im Datenblatt besteht (Gegenprobe: kein VERBOTEN-Treffer bei «wasserfest»)', tp('Wasserfeste Webcam', 'Product name: Webcam\nDescription:\nProtection: IPX7').ok, true);
ist('Titel: «Baumwolle» ohne Beleg', tp('Baumwolle Tasche').probleme.length > 0, true);
ist('Titel: kein Treffer bei Wörtern, die nur ähnlich klingen (Federleicht, Seidenmatt)', [tp('Federleichte Webcam').ok, tp('Seidenmatte Webcam').ok], [true, true]);
ist('Titel: «Seidenschal» ist dagegen eine Seide-Behauptung und braucht Beleg', [tp('Seidenschal mit Webcam-Motiv').ok, tp('Seidenschal mit Webcam-Motiv', QW + '\nMaterial: 100% silk').ok], [false, true]);
ist('Titelauftrag verbietet «wasserdicht» und Erfindungen', /nie verwenden/.test(TITEL_AUFTRAG) && /Nichts hinzufügen/.test(TITEL_AUFTRAG) && /JSON-Array/.test(TITEL_AUFTRAG), true);
ist('Labelauftrag ist der des Nachziehers', LABEL_AUFTRAG.startsWith('Übersetze diese Variantenbezeichnungen'), true);
ist('Übersetzung brauchbar: echte Übersetzung', uebersetzungBrauchbar({ weg: 'gemini', texte: ['Warmweiss'] }, ['Warm White']), true);
ist('Übersetzung unbrauchbar: Dienst hat nicht geantwortet (weg original)', uebersetzungBrauchbar({ weg: 'original', texte: ['Warm White'] }, ['Warm White']), false);
ist('Übersetzung unbrauchbar: «Oil Painting Blue» unverändert zurück', uebersetzungBrauchbar({ weg: 'gemini', texte: ['Oil Painting Blue'] }, ['Oil Painting Blue']), false);
ist('Übersetzung brauchbar: ein einzelnes Wort unverändert («Cyan», «Khaki»)', uebersetzungBrauchbar({ weg: 'gemini', texte: ['Cyan'] }, ['Cyan']), true);
ist('Übersetzung unbrauchbar: einzelnes englisches Farbwort unverändert («Black»)', uebersetzungBrauchbar({ weg: 'gemini', texte: ['Black'] }, ['Black']), false);
ist('Übersetzung unbrauchbar: falsche Anzahl', uebersetzungBrauchbar({ weg: 'gemini', texte: ['A'] }, ['a', 'b']), false);
ist('Übersetzung unbrauchbar: zu lang', uebersetzungBrauchbar({ weg: 'gemini', texte: ['x'.repeat(41)] }, ['a']), false);
ist('Übersetzung unbrauchbar: leerer Eintrag', uebersetzungBrauchbar({ weg: 'gemini', texte: [''] }, ['a']), false);

// ── productType, Tags, Preis
const KATALOG = [
  ...Array.from({ length: 8 }, () => ({ productType: 'Elektronik', g: 'Cameras & Optics > Cameras > Webcams' })),
  ...Array.from({ length: 3 }, () => ({ productType: 'Gadget', g: 'Cameras & Optics > Cameras > Webcams' })),
  ...Array.from({ length: 6 }, () => ({ productType: 'Beleuchtung', g: 'Home & Garden > Lighting > Light Ropes & Strings' })),
  ...Array.from({ length: 4 }, () => ({ productType: 'Beleuchtung', g: 'Home & Garden > Lighting > Lamps' })),
  { productType: 'Haushalt & Wohnen', g: 'Home & Garden > Lighting > Lamps' }, { productType: '', g: 'Home & Garden > X' }, { productType: 'Gadget', g: '' },
];
const PT = productTypeTabelle(KATALOG);
ist('productType: häufigster Typ bei ≥ 60 % und ≥ 5 Produkten', productTypeFuer('Cameras & Optics > Cameras > Webcams', PT)?.typ, 'Elektronik');
ist('productType: Anteil und Zahl stehen dabei', (t => [t.n, Math.round(t.anteil * 100)])(productTypeFuer('Cameras & Optics > Cameras > Webcams', PT)), [11, 73]);
ist('productType: tieferer Pfad fällt auf die Elternebene zurück', productTypeFuer('Home & Garden > Lighting > Light Ropes & Strings > Solar', PT)?.typ, 'Beleuchtung');
{ const t2 = productTypeTabelle([...Array.from({ length: 5 }, () => ({ productType: 'A', g: 'X > Y' })), ...Array.from({ length: 5 }, () => ({ productType: 'B', g: 'X > Y' }))]);
  ist('productType: 50 zu 50 = kein Typ (nie raten)', [productTypeFuer('X > Y', t2), t2.size], [null, 0]);
  ist('productType: unter 5 Produkten kein Typ', productTypeFuer('X', productTypeTabelle(Array.from({ length: 4 }, () => ({ productType: 'A', g: 'X' })))), null); }
ist('productType: unbekannter Pfad = null', productTypeFuer('Toys & Games > Puzzles', PT), null);
ist('productType: ohne Tabelle oder Pfad = null', [productTypeFuer('x', null), productTypeFuer('', PT)], [null, null]);
ist('productType: Produkte ohne Typ oder Pfad werden ignoriert', PT.has('Home & Garden > X'), false);
const T0 = Date.parse('2026-10-27T12:00:00Z');
ist('Tags: Rücknahme-Marken, Text offen und sort-Tags, sortiert, ohne Doppelte', tagsFuer({ sortTags: ['sort-b', 'sort-a', 'sort-a'], jetzt: T0 }), ['grind2', 'grind2-20261027', 'sort-a', 'sort-b', 'text-offen']);
ist('Tags: ohne «Text offen» wenn der Text fertig ist', tagsFuer({ sortTags: [], jetzt: T0, textOffen: false }), ['grind2', 'grind2-20261027']);
ist('Preisuntergrenze: Gadget 14.90, Kleidung und Schuhe 16.90', [preisMinFuer('Cameras & Optics > Cameras > Webcams', cfg0), preisMinFuer('Apparel & Accessories > Clothing > Dresses', cfg0), preisMinFuer('Apparel & Accessories > Shoes', cfg0), preisMinFuer('Apparel & Accessories > Jewelry > Rings', cfg0)], [14.9, 16.9, 16.9, 14.9]);
const PR = preiseFuerVarianten([{ vid: 'a', ekUsd: 5.5 }, { vid: 'b', ekUsd: 5.9 }], { kurs: 0.82435, frachtUsd: 4.2 });
ist('Preisurteil: normale Ware besteht', preisUrteil(PR, cfg0).ok, true);
ist('Preisurteil: Einstand unter 2 CHF fällt', preisUrteil(preiseFuerVarianten([{ vid: 'a', ekUsd: 0.4 }], { kurs: 0.82435, frachtUsd: 0.5 }), cfg0).ok, false);
ist('Preisurteil: ...Gegenprobe knapp darüber besteht', preisUrteil(preiseFuerVarianten([{ vid: 'a', ekUsd: 1.5 }], { kurs: 0.82435, frachtUsd: 1.5 }), cfg0).ok, true);
ist('Preisurteil: Preis über der Obergrenze fällt', preisUrteil(preiseFuerVarianten([{ vid: 'a', ekUsd: 39 }], { kurs: 0.82435, frachtUsd: 100 }), cfg0).ok, false);
ist('Preisurteil: ...Gegenprobe: Preis 118.90 besteht bei Obergrenze 150 (Vorgabe ist 80)', [preisUrteil(preiseFuerVarianten([{ vid: 'a', ekUsd: 39 }], { kurs: 0.82435, frachtUsd: 60 }), { ...cfg0, maxPreis: 150 }).ok, cfg0.maxPreis], [true, 80]);
ist('Preisurteil: eine Variante ohne gültigen EK macht das Produkt unplanbar', (r => [r.ok, r.frist])(preisUrteil(preiseFuerVarianten([{ vid: 'a', ekUsd: 5 }, { vid: 'b', ekUsd: null }], { kurs: 0.82435, frachtUsd: 3 }), cfg0)), [false, 'zurueckgestellt']);
ist('Preisurteil: keine Preise = vorläufig', preisUrteil(null, cfg0).frist, 'vorlaeufig');

// ── Saison, Zubehör, Sprachfilter, KOSTEN
ist('Kosten: product/getCategory kostet 0 Punkte (gemessen)', [KOSTEN.kategorien, KOSTEN.liste, KOSTEN.query, KOSTEN.fracht], [0, 50, 10, 10]);
ist('Saison: Halloween-Ware im Oktober ist zu spät (CJ liefert in 10–20 Werktagen)', saisonSperre('Halloween Pumpkin LED Lights', 10)?.anlass, 'Halloween');
ist('Saison: ...im August und September ist sie im Fenster', [saisonSperre('Halloween Pumpkin LED Lights', 8), saisonSperre('Halloween Pumpkin LED Lights', 9)], [null, null]);
ist('Saison: Weihnachtsware im Oktober und November ist im Fenster, im Januar und Juni nicht', [saisonSperre('Christmas Tree Lights', 10), saisonSperre('Christmas Tree Lights', 11), saisonSperre('Christmas Tree Lights', 1)?.anlass, saisonSperre('Christmas Tree Lights', 6)?.anlass], [null, null, 'Weihnachten', 'Weihnachten']);
ist('Saison: auch deutsche Titel («Kürbis», «Weihnachts…») und Ostern/Valentinstag', [saisonSperre('Kürbis Laterne', 11)?.anlass, saisonSperre('Weihnachtsbaum Kugeln', 7)?.anlass, saisonSperre('Easter Egg Decor', 11)?.anlass, saisonSperre('Valentine Gift Box', 5)?.anlass, saisonSperre('Easter Egg Decor', 2)], ['Halloween', 'Weihnachten', 'Ostern', 'Valentinstag', null]);
ist('Saison: Ware ohne Anlass ist nie gesperrt (auch «Skull Ring» nicht)', [saisonSperre('Skull Ring Stainless Steel', 11), saisonSperre('USB Webcam', 3)], [null, null]);
ist('Saison: ungültiger Monat sperrt nicht', [saisonSperre('Halloween Lights', 0), saisonSperre('Halloween Lights', 13), saisonSperre('Halloween Lights', undefined), saisonSperre('Halloween Lights', 10.5)], [null, null, null, null]);
ist('Vorfilter: Saisonware ausserhalb des Fensters (Monat 11, Halloween)', vf(gut({ productNameEn: 'Halloween Pumpkin String Light' }), { monat: 11 }).grund, 'saison:Halloween');
ist('Vorfilter: ...im Fenster (Monat 9) geht sie durch; ohne Monat wird nicht geprüft', [vf(gut({ productNameEn: 'Halloween Pumpkin String Light' }), { monat: 9 }).nehmen, vf(gut({ productNameEn: 'Halloween Pumpkin String Light' })).nehmen], [true, true]);
const WEBCAMS = 'Cameras & Optics > Cameras > Webcams';
ist('Zubehör: «Abdeckung» im Titel, Pfad nennt das Gerät → Konflikt (der Fall der ersten Probe)', zubehoerKonflikt({ titel: 'Webcam Laptop Linse Tablet Privatsphäre Kamera Abdeckung', cjName: 'Webcam cover', pfad: WEBCAMS }), { wort: 'abdeckung', quelle: 'Titel' });
ist('Zubehör: Wortende zählt auch in Zusammensetzungen («Kameraabdeckung»)', zubehoerKonflikt({ titel: 'Kameraabdeckung', pfad: WEBCAMS })?.wort, 'abdeckung');
ist('Zubehör: Zubehörwort nur im englischen CJ-Namen', zubehoerKonflikt({ titel: 'Webcam Schutz', cjName: 'Webcam Privacy Cover Slider', pfad: WEBCAMS }), { wort: 'cover', quelle: 'CJ-Name' });
ist('Zubehör: Pfad nennt Zubehör (Cases, Tripods …) → kein Konflikt', [zubehoerKonflikt({ titel: 'Handyhülle Etui', pfad: 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases' }), zubehoerKonflikt({ titel: 'Webcam Stativ', pfad: 'Cameras & Optics > Camera & Optic Accessories > Tripods' })], [null, null]);
ist('Zubehör: eine echte Webcam («mit Mikrofon») löst nichts aus', zubehoerKonflikt({ titel: 'Full HD USB-Webcam mit Mikrofon', cjName: 'Hot Sale Full HD 1080P USB Webcam With Microphone For PC Laptop', pfad: WEBCAMS }), null);
ist('Zubehör: «Zubehör» allein ist kein Konflikt (Küchenzubehör ist ein Hauptprodukt)', zubehoerKonflikt({ titel: 'Küchenzubehör Set', pfad: 'Home & Garden > Kitchen & Dining' }), null);
ist('Zubehör: kein Pfad = keine Aussage', zubehoerKonflikt({ titel: 'Abdeckung', pfad: '' }), null);
ist('Zubehör: «Tasche» und «Hülle» allein sind bewusst NICHT in der Liste (Handtaschen und Schutzhüllen sind Hauptprodukte)', [zubehoerKonflikt({ titel: 'Damen Handtasche', pfad: 'Apparel & Accessories > Handbags' }), zubehoerKonflikt({ titel: 'Notebook Hülle', pfad: 'Luggage & Bags > Briefcases' })], [null, null]);
ist('Sprache: englische Werte werden erkannt, deutsche nicht', [istEnglisch('Plastic'), istEnglisch('white'), istEnglisch('can be used indoor and outdoor'), istEnglisch('Kunststoff'), istEnglisch('Schwarz'), istEnglisch('Länge 70 mm'), istEnglisch('USB 2.0')], [true, true, true, false, false, false, false]);
ist('Sprache: englische Werkstoffe («Metal», «Wood») werden erkannt, deutsche («Metall», «Holz», «Glas» als Teil von «Glasfaser») nicht', [istEnglisch('Metal'), istEnglisch('Wood'), istEnglisch('Metall'), istEnglisch('Holz'), istEnglisch('Glasfaser')], [true, true, false, false, false]);
ist('Sprache: «in», «an», «um» sind deutsche Wörter und kein Englisch-Befund', istEnglisch('Für den Einsatz in Haus und Garten'), false);
{
  const s = faktenSprachfilter({ daten: [{ label: 'Material', wert: 'Plastic' }, { label: 'Material', wert: 'Kunststoff' }, { label: 'Farbe', wert: 'white' }], lieferumfang: ['1 Webcam', '1 manual with cable'], anleitung: ['Kleben Sie die Fläche auf'], hinweise: ['can be used indoor and outdoor', 'Nur im Innenbereich verwenden'], verworfen: ['alt'] });
  ist('Sprachfilter: englische Einträge fallen einzeln weg, deutsche bleiben, belegt wird neu gezählt', [s.daten.map(d => d.wert), s.lieferumfang, s.anleitung, s.hinweise, s.belegt, s.verworfen.length], [['Kunststoff'], ['1 Webcam'], ['Kleben Sie die Fläche auf'], ['Nur im Innenbereich verwenden'], 4, 5]);
}

// ── Ledger und Budget
ist('Frist-Köpfe', [fristKopf('endgueltig'), fristKopf('zurueckgestellt'), fristKopf('vorlaeufig'), fristKopf(null)], ['', 'zurückgestellt: ', 'vorläufig: ', '']);
ist('Ledger-Zeile: ein «·» im Detail würde die Felder verschieben und wird ersetzt', ledgerZeile('p1', 'UEBERSPRUNGEN', 'a · b\nc', T0), 'p1 · 2026-10-27T12:00:00.000Z · UEBERSPRUNGEN · a b c\n');
ist('Ledger-Zeile: Detail wird auf 140 Zeichen gekürzt', ledgerZeile('p', 'FEHLER', 'x'.repeat(500), T0).trim().split(' · ')[3].length, 140);
ist('Ledger-Zeile GESCHRIEBEN: sieben Felder, Format des Varianten-Ledgers plus Zielblatt', ledgerZeileGeschrieben({ pid: '2000000000000000001', n: 2, handle: 'webcam-000001', gid: 'gid://shopify/Product/1', zielId: 'webcams' }, T0),
  '2000000000000000001 · 2026-10-27T12:00:00.000Z · GESCHRIEBEN · 2 Varianten · webcam-000001 · gid://shopify/Product/1 · webcams\n');
{ // Rundreise: was das Werkzeug schreibt, versteht das Gedächtnis
  const ledger = [ledgerZeile('p-end', 'UEBERSPRUNGEN', 'Dublette: x', T0), ledgerZeile('p-zur', 'UEBERSPRUNGEN', fristKopf('zurueckgestellt') + 'Titel nicht sicher', T0), ledgerZeile('p-vor', 'UEBERSPRUNGEN', fristKopf('vorlaeufig') + 'Fracht unbekannt', T0),
    ledgerZeile('p-feh', 'FEHLER', 'Plan: x', T0), ledgerZeileGeschrieben({ pid: 'p-ges', n: 3, handle: 'h', gid: 'g', zielId: 'z' }, T0)].join('');
  const tage = d => ledgerGedaechtnis(ledger, { jetzt: T0 + d * TAG });
  var TAG = 24 * 3600 * 1000;
  ist('Gedächtnis nach 10 Stunden: alles gemerkt', [...tage(10 / 24)].sort(), ['p-end', 'p-feh', 'p-ges', 'p-vor', 'p-zur']);
  ist('Gedächtnis nach 2 Tagen: vorläufig und Fehler vergessen (20 h)', [...tage(2)].sort(), ['p-end', 'p-ges', 'p-zur']);
  ist('Gedächtnis nach 8 Tagen: zurückgestellt vergessen (7 Tage)', [...tage(8)].sort(), ['p-end', 'p-ges']);
  ist('Gedächtnis nach 15 Tagen: nur GESCHRIEBEN bleibt', [...tage(15)].sort(), ['p-ges']);
}
const JETZT = Date.now(), H = 3600 * 1000;
const iso = ms => new Date(ms).toISOString();
const G2 = [`p1 · ${iso(JETZT - 2 * H)} · GESCHRIEBEN · 40 Varianten · h · g · z`, `p2 · ${iso(JETZT - 30 * H)} · GESCHRIEBEN · 99 Varianten · h · g · z`, `p3 · ${iso(JETZT - 1 * H)} · UEBERSPRUNGEN · x`].join('\n');
const AW = [`h1 · ${iso(JETZT - 3 * H)} · GESCHRIEBEN · 400 Varianten`, `h2 · ${iso(JETZT - 25 * H)} · GESCHRIEBEN · 700 Varianten`].join('\n');
ist('Verbrauch: nur das 24-h-Fenster, nur GESCHRIEBEN', variantenVerbrauch([G2], JETZT), { summe: 40, zeilen: 1, ungueltig: 0 });
ist('Verbrauch: beide Ledger-Formate (Handle/pid vorn) zusammen', variantenVerbrauch([G2, AW], JETZT).summe, 440);
ist('Verbrauch: Fenstergrenze genau 24 h zählt nicht mehr', variantenVerbrauch([`p · ${iso(JETZT - 24 * H)} · GESCHRIEBEN · 5 Varianten`], JETZT).summe, 0);
ist('Verbrauch: eine Minute innerhalb der Grenze zählt', variantenVerbrauch([`p · ${iso(JETZT - 24 * H + 60000)} · GESCHRIEBEN · 5 Varianten`], JETZT).summe, 5);
ist('Verbrauch: Zeile ohne Variantenzahl oder mit kaputtem Datum wird gezählt als ungültig, nicht als 0 verschwiegen', variantenVerbrauch([`p · ${iso(JETZT)} · GESCHRIEBEN · viele`, `p · kein-datum · GESCHRIEBEN · 5 Varianten`], JETZT), { summe: 0, zeilen: 0, ungueltig: 2 });
ist('Verbrauch: Datum Tage in der Zukunft (Uhrfehler) ist ungültig und sperrt nicht dauerhaft', variantenVerbrauch([`p · ${iso(JETZT + 5 * 24 * H)} · GESCHRIEBEN · 500 Varianten`], JETZT), { summe: 0, zeilen: 0, ungueltig: 1 });
ist('Verbrauch: leeres Ledger', variantenVerbrauch(['', undefined], JETZT).summe, 0);
ist('Budget: Anteil 500 minus eigene 40 = 460; Gesamtgrenze (9000 − 440) lässt das zu', variantenBudget({ grind2Text: G2, auswahlText: AW, jetzt: JETZT, cfg: cfg0 }), { grind2: 40, auswahl: 400, gesamt: 440, anteilMax: 500, gesamtMax: 9000, frei: 460 });
ist('Budget: der Auswahl-Lauf hat fast alles verbraucht → die Gesamtgrenze bindet', variantenBudget({ grind2Text: '', auswahlText: `h · ${iso(JETZT - H)} · GESCHRIEBEN · 8900 Varianten`, jetzt: JETZT, cfg: cfg0 }).frei, 100);
ist('Budget: Gesamtgrenze überschritten = 0, nie negativ', variantenBudget({ grind2Text: '', auswahlText: `h · ${iso(JETZT - H)} · GESCHRIEBEN · 9500 Varianten`, jetzt: JETZT, cfg: cfg0 }).frei, 0);
ist('Budget: der eigene Anteil bindet auch bei leerem Auswahl-Lauf', variantenBudget({ grind2Text: `p · ${iso(JETZT - H)} · GESCHRIEBEN · 500 Varianten · h`, auswahlText: '', jetzt: JETZT, cfg: cfg0 }).frei, 0);
ist('Budget: Saison-Welle mit höherem Anteil per Umgebung (20 % = 2000)', variantenBudget({ grind2Text: '', auswahlText: '', jetzt: JETZT, cfg: konfigAus({ GRIND_ANTEIL: '0.2' }, '/x') }).frei, 2000);

// ── Tore nach dem Anlegen
const EINGABE = {
  title: 'Full HD USB-Webcam mit Mikrofon', handle: 'webcam-000001', tags: ['cj-real', 'dropship', 'grind2', 'text-offen', 'sort-pc-homeoffice'],
  productOptions: [{ name: 'Farbe', values: [{ name: 'Schwarz' }, { name: 'Weiss' }] }],
  variants: [{ price: '14.90', file: { originalSource: 'a' }, inventoryItem: { sku: 'S1', cost: '9.00' } }, { price: '14.90', file: { originalSource: 'b' }, inventoryItem: { sku: 'S2', cost: '9.00' } }],
  files: [{}, {}, {}, {}], metafields: [{ namespace: 'mm-google-shopping', key: 'google_product_category', value: 'Cameras & Optics > Cameras > Webcams' }],
};
const FRISCH = () => ({ id: 'gid://shopify/Product/1', status: 'DRAFT', title: EINGABE.title, tags: [...EINGABE.tags], descriptionHtml: `<!-- ls-var-v1 --><!-- ls-fakten-v1 -->${'<li>Angabe</li>'.repeat(30)}`,
  variantsCount: { count: 2 }, options: [{ name: 'Farbe', values: ['Weiss', 'Schwarz'] }],
  variants: { nodes: [{ sku: 'S1', price: '14.90', media: { nodes: [{ id: 'm1' }] }, inventoryItem: { unitCost: { amount: '9.00' } } }, { sku: 'S2', price: '14.90', media: { nodes: [{ id: 'm2' }] }, inventoryItem: { unitCost: { amount: '9.00' } } }] },
  media: { nodes: [{ id: 'a', status: 'READY' }, { id: 'b', status: 'READY' }, { id: 'c', status: 'READY' }, { id: 'd', status: 'READY' }] },
  mf: { value: 'Cameras & Optics > Cameras > Webcams' }, resourcePublicationsV2: { nodes: [] } });
const tore = (mut, o) => { const p = FRISCH(); if (mut) mut(p); return toreNachAnlage(EINGABE, p, o); };
const falsch = t => t.tore.filter(x => x.ok !== true).map(x => x.name);
ist('Tore: alles in Ordnung', (t => [t.ok, t.offen, falsch(t)])(tore()), [true, false, []]);
ist('Tore: Produkt weg', toreNachAnlage(EINGABE, null).ok, false);
ist('Tore: Status ACTIVE vor der Freigabe ist ein Fehler (jemand hat veröffentlicht)', falsch(tore(p => { p.status = 'ACTIVE'; })), ['status']);
ist('Tore: nach der Freigabe muss ACTIVE sein und ein Kanal', falsch(tore(p => { p.status = 'ACTIVE'; }, { nachFreigabe: true })), ['kanaele']);
ist('Tore: ...mit Kanal besteht es', tore(p => { p.status = 'ACTIVE'; p.resourcePublicationsV2.nodes = [{ isPublished: true, publication: { id: 'P1' } }]; }, { nachFreigabe: true }).ok, true);
ist('Tore: anderer Titel', falsch(tore(p => { p.title = 'Anders'; })), ['titel']);
ist('Tore: zu wenig Varianten im Shop (die fehlende hat dann auch kein Bild und keinen Preis)', falsch(tore(p => { p.variantsCount.count = 1; p.variants.nodes.pop(); })), ['varianten-zahl', 'skus', 'variantenbilder', 'preise-wie-geplant']);
ist('Tore: fremde SKU (der geplante Preis der SKU S2 ist damit auch nicht auffindbar)', falsch(tore(p => { p.variants.nodes[1].sku = 'XX'; })), ['skus', 'preise-wie-geplant']);
ist('Tore: Optionswerte weichen ab', falsch(tore(p => { p.options[0].values = ['Weiss', 'Rot']; })), ['optionen']);
ist('Tore: ein Medium FAILED (bei 4 Medien bleiben 3 fertige: genug)', falsch(tore(p => { p.media.nodes[0].status = 'FAILED'; })), ['medien-fehlerfrei']);
ist('Tore: Medien noch in Verarbeitung = offen (null), nicht falsch', (t => [t.ok, t.offen, t.tore.filter(x => x.ok === null).map(x => x.name)])(tore(p => { p.media.nodes[0].status = 'PROCESSING'; p.media.nodes[1].status = 'UPLOADED'; })), [false, true, ['medien-fertig', 'medien-zahl']]);
ist('Tore: zu wenig fertige Bilder ohne laufende Verarbeitung = falsch', falsch(tore(p => { p.media.nodes = p.media.nodes.slice(0, 2); })), ['medien-zahl']);
ist('Tore: Variantenbild nicht verknüpft', falsch(tore(p => { p.variants.nodes[1].media.nodes = []; })), ['variantenbilder']);
ist('Tore: Google-Metafeld fehlt', falsch(tore(p => { p.mf = null; })), ['google-pfad']);
ist('Tore: Google-Metafeld anders', falsch(tore(p => { p.mf.value = 'Home & Garden'; })), ['google-pfad']);
ist('Tore: sort-Tag fehlt', falsch(tore(p => { p.tags = p.tags.filter(t => t !== 'sort-pc-homeoffice'); })), ['tags']);
ist('Tore: Sperr-Tag am Produkt', falsch(tore(p => { p.tags.push('18plus'); })), ['keine-sperr-tags']);
ist('Tore: Sperr-Tag nach Muster (nicht-bewerben)', falsch(tore(p => { p.tags.push('nicht-google-bewerben'); })), ['keine-sperr-tags']);
ist('Tore: Preis unter Kosten × 1,2', falsch(tore(p => { p.variants.nodes[0].price = '10.00'; })), ['preise', 'preise-wie-geplant']);
ist('Tore: Kosten fehlen', falsch(tore(p => { p.variants.nodes[0].inventoryItem.unitCost = null; })), ['preise']);
ist('Tore: Preis weicht vom Plan ab (aber über Kosten × 1,2)', falsch(tore(p => { p.variants.nodes[0].price = '19.90'; })), ['preise-wie-geplant']);
ist('Tore: Beschreibung ohne Fakten-Block', falsch(tore(p => { p.descriptionHtml = `<p>${'Text '.repeat(60)}</p>`; })), ['text']);
ist('Tore: Fakten-Block, aber zu kurz', falsch(tore(p => { p.descriptionHtml = '<!-- ls-fakten-v1 --><li>x</li>'; })), ['text']);
ist('Tore: Fliesstext v2 genügt als Text', tore(p => { p.descriptionHtml = `<!-- ls-text-v2 -->${'<p>Satz.</p>'.repeat(40)}<!-- /ls-text-v2 -->`; }).ok, true);
ist('Kanäle: Mehrheit der Referenzprodukte (≥ 75 %)', kanaeleAusReferenz([{ pubs: ['P1', 'P2', 'P3'] }, { pubs: ['P1', 'P2', 'P3', 'P4'] }, { pubs: ['P1', 'P2', 'P3'] }, { pubs: ['P1', 'P2', 'P3'] }]), ['P1', 'P2', 'P3']);
ist('Kanäle: ein Kanal bei nur der Hälfte fällt weg', kanaeleAusReferenz([{ pubs: ['P1', 'P2'] }, { pubs: ['P1'] }, { pubs: ['P1', 'P2'] }, { pubs: ['P1'] }]), ['P1']);
ist('Kanäle: weniger als 3 Referenzen = nicht ableitbar (dann wird nicht veröffentlicht)', kanaeleAusReferenz([{ pubs: ['P1'] }, { pubs: ['P1'] }]), null);
ist('Kanäle: keine Referenz oder Unsinn = null', [kanaeleAusReferenz([]), kanaeleAusReferenz(null)], [null, null]);
ist('Kanäle: ein doppelt genannter Kanal zählt nur einmal je Produkt', kanaeleAusReferenz([{ pubs: ['P1', 'P1'] }, { pubs: [] }, { pubs: [] }]), null);

// ── Kontaktbogen
{
  const md = kontaktbogen([{ bild: 'https://x/y.jpg', titel: 'Full HD | Webcam', zielName: 'Webcams', blatt: 'Tablet Accessories', einstandMin: 8.1, einstandMax: 8.4, frachtUsd: 4.2, frachtLinie: 'CJPacket Ordinary',
    preisMin: 14.9, preisMax: 14.9, margeMin: 0.456, varianten: 2, optionen: 'Farbe 2', google: 'Cameras & Optics > Cameras > Webcams', googleSicherheit: 'titel', sortTags: ['sort-a', 'sort-b'], tore: { ok: 22, gesamt: 22, falsch: [] }, entscheid: 'PLAN: alle Tore bestanden' },
  { titelEn: 'Nur Englisch', zielName: 'Webcams', entscheid: 'übersetzt nicht' }], { titel: 'T', kopf: 'Kopf', vorfilter: [{ ziel: 'Webcams', quelle: 'Suche «webcam»', treffer: 200, durch: 12, abgelehnt: { ledger: 3, dublette: 50 } }] });
  wahr('Kontaktbogen: Kopfzeile und Trennlinie', md.includes('| # | Bild | Titel (DE) |') && md.includes('|---|---|'));
  wahr('Kontaktbogen: Bild als img-Tag, Pipe im Titel entschärft, Zahlen formatiert', md.includes('<img src="https://x/y.jpg" width="80">') && md.includes('Full HD / Webcam') && md.includes('8.10–8.40') && md.includes('45.6 %') && md.includes('22/22'));
  wahr('Kontaktbogen: Zeile ohne Messwerte zeigt Striche statt Unsinn', md.includes('| Nur Englisch |') && /Nur Englisch \| Webcams \/  \| – \| – \| – \| – \| – \| – \| – \| – \| übersetzt nicht/.test(md));
  ist('Kontaktbogen: Preis-Flaggen stehen in der Preis-Zelle (ausser «spanne»)', kontaktbogen([{ preisMin: 61.9, preisMax: 102.9, preisFlaggen: ['fracht_dominiert', 'spanne'] }]).includes('61.90–102.90 ⚑ fracht_dominiert |'), true);
wahr('Kontaktbogen: Vorfilter-Tabelle mit Gründen nach Häufigkeit', md.includes('dublette 50, ledger 3'));
  ist('Kontaktbogen: ohne Zeilen nur Kopf', kontaktbogen([]).includes('| # | Bild'), true);
}

// ═══════════════════════════ TEIL 2: Netz-Bausteine ═══════════════════════════
const antwort = (body, status = 200, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const keineWarte = async () => {};

// ── cjClient
{
  const aufrufe = []; let rest = 20000;
  const f = async (url) => { aufrufe.push(String(url)); rest -= 10; return antwort({ code: 200, result: true, message: 'Success', data: { list: [] }, pointsInfo: { total: 70000, usedToday: 1, remaining: rest } }); };
  const stand = {};
  const c = cjClient({ token: 't', fetch: f, warte: keineWarte, stand, reserve: 15000, punkteMax: 120, basisMs: 0 });
  await c.einstellungen(); ist('cjClient: setting/get kostet nichts und liefert den Stand', [c.z.punkte, stand.remaining], [0, 19990]);
  await c.liste({ suche: 'x' }); await c.query('1');
  ist('cjClient: Buchführung nach Preisliste (Liste 50 + Abfrage 10)', [c.z.punkte, c.z.aufrufe.liste, c.z.aufrufe.query], [60, 1, 1]);
  ist('cjClient: pointsInfo wird nach jedem Aufruf gelesen', stand.remaining, 19970);
  await wirftAsync('cjClient: eigene Punktegrenze wirft VOR dem Aufruf', async () => { await c.liste({ suche: 'y' }); await c.liste({ suche: 'z' }); }, /^CJ_BUDGET/);
  const n = aufrufe.length; await wirftAsync('cjClient: ...und sendet dann nichts mehr', () => c.liste({ suche: 'q' }), /CJ_BUDGET/);
  ist('cjClient: kein Aufruf nach der Grenze', aufrufe.length, n);
  stand.remaining = 15040;
  const c2 = cjClient({ token: 't', fetch: f, warte: keineWarte, stand, reserve: 15000, basisMs: 0 });
  await wirftAsync('cjClient: Reserve (Liste 50 Punkte würden 14 990 lassen) wirft VOR dem Aufruf', () => c2.liste({ suche: 'x' }), /^CJ_RESERVE/);
  ist('cjClient: ...eine Abfrage (10 Punkte) passt noch', (await c2.query('1')).result, true);
  const c3 = cjClient({ token: 't', fetch: async () => antwort({ code: 1600200, result: false, message: 'Insufficient API points' }), warte: keineWarte, basisMs: 0 });
  await wirftAsync('cjClient: erschöpfte Punkte kommen als CJ_QUOTA durch', () => c3.query('1'), /^CJ_QUOTA/);
  let fehlerStand = {};
  const c4 = cjClient({ token: 't', fetch: async () => antwort({ code: 1602001, result: false, message: 'Product not found', data: null }), warte: keineWarte, stand: fehlerStand, basisMs: 0 });
  ist('cjClient: weiche Antwort 1602001 ist eine Antwort, kein Fehler', (await c4.query('1')).code, 1602001);
  ist('cjClient: Fracht wird mit 10 Punkten je gemessener Variante gebucht', await (async () => {
    const ff = async () => antwort({ code: 200, result: true, message: 'Success', data: [{ logisticName: 'CJPacket Ordinary', logisticPrice: 4, logisticAging: '5-10' }], pointsInfo: { remaining: 40000 } });
    const c5 = cjClient({ token: 't', fetch: ff, warte: keineWarte, basisMs: 0 });
    const r = await c5.fracht([{ vid: '2000000000000000101', gewichtG: 100 }, { vid: '2000000000000000102', gewichtG: 200 }]);
    return [r.urteil, r.guenstigsteUsd, c5.z.punkte];
  })(), ['lieferbar', 4, 10]);
}

// ── modellJson
{
  const gem = o => antwort({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] });
  const grq = o => antwort({ choices: [{ message: { content: JSON.stringify(o) } }] });
  ist('modellJson: Gemini zuerst', (await modellJson('p', { fetch: async () => gem({ a: 1 }), geminiKey: 'g', groqKey: 'q' })), { o: { a: 1 }, weg: 'gemini' });
  ist('modellJson: Groq als Rückfall, wenn Gemini 402 meldet', (await modellJson('p', { fetch: async u => (String(u).includes('googleapis') ? antwort({ error: { message: 'credits' } }, 402) : grq({ b: 2 })), geminiKey: 'g', groqKey: 'q' })), { o: { b: 2 }, weg: 'groq' });
  ist('modellJson: kein Dienst antwortet = o null mit Gründen', (r => [r.o, r.weg, r.gruende.length >= 3])(await modellJson('p', { fetch: async () => antwort({}, 500), geminiKey: 'g', groqKey: 'q' })), [null, 'keins', true]);
  ist('modellJson: ohne Schlüssel kein Aufruf', (await modellJson('p', { fetch: async () => { throw new Error('darf nicht gerufen werden'); }, geminiKey: ' ', groqKey: '' })).o, null);
  ist('modellJson: JSON in Codezaun wird gelesen', (await modellJson('p', { fetch: async () => antwort({ candidates: [{ content: { parts: [{ text: '```json\n{"c":3}\n```' }] } }] }), geminiKey: 'g' })).o, { c: 3 });
}

// ── bilderPruefen
{
  const log = [];
  const f = async (u, init) => {
    log.push([init.method, u]);
    if (u.endsWith('/ok.jpg')) return new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg' } });
    if (u.endsWith('/tot.jpg')) return new Response(null, { status: 404 });
    if (u.endsWith('/kopf405.jpg')) return init.method === 'HEAD' ? new Response(null, { status: 405 }) : new Response(null, { status: 206, headers: { 'content-type': 'image/png' } });
    if (u.endsWith('/html.jpg')) return new Response(null, { status: 200, headers: { 'content-type': 'text/html' } });
    if (u.endsWith('/netz.jpg')) throw new Error('timeout');
    throw new Error('unerwartet ' + u);
  };
  const r = await bilderPruefen(['https://c/ok.jpg', 'https://c/tot.jpg', 'https://c/kopf405.jpg', 'https://c/html.jpg', 'https://c/netz.jpg', 'https://c/ok.jpg', ''], { fetch: f });
  ist('Bilder: 200 und 206(GET nach 405) sind gut', [...r.ok].sort(), ['https://c/kopf405.jpg', 'https://c/ok.jpg']);
  ist('Bilder: 404, falscher Typ und Netzfehler sind schlecht, mit Grund', Object.fromEntries(r.schlecht), { 'https://c/tot.jpg': 'HTTP 404', 'https://c/html.jpg': 'kein Bild (text/html)', 'https://c/netz.jpg': 'Netz: timeout' });
  ist('Bilder: doppelte und leere Adressen kosten keinen Aufruf', log.filter(([, u]) => u.endsWith('/ok.jpg')).length, 1);
  ist('Bilder: 404 fällt NICHT auf GET zurück (nur 400/403/405/501)', log.filter(([, u]) => u.endsWith('/tot.jpg')).map(([m]) => m), ['HEAD']);
}

// ── bildAliasBauen
{
  const sig = u => (u.includes('fehl') ? null : u);
  const gleich = (a, b) => ({ w1: 'v1', w2: 'v2' }[b.split('/').pop()] === a.split('/').pop() ? { dh: 0, farbe: 0 } : null);
  const r = await bildAliasBauen(['https://c/w1', 'https://c/w2'], ['https://c/v1', 'https://c/v2', 'https://c/v3', 'https://c/fehl', 'https://c/w1'], { sig, gleich });
  ist('Alias: Variantenbild, das visuell ein Galeriebild ist, wird abgebildet; Fremdes und Unlesbares nicht', r.alias, { 'https://c/v1': 'https://c/w1', 'https://c/v2': 'https://c/w2' });
  ist('Alias: jedes neue Bild wird einmal verglichen (das schon in der Galerie nicht)', r.geprueft, 4);
  ist('Alias: zwei fast gleiche Treffer = mehrdeutig = kein Alias', (await bildAliasBauen(['g1', 'g2'], ['v'], { sig: u => u, gleich: () => ({ dh: 1, farbe: 1 }) })).alias, {});
  ist('Alias: ein klarer Sieger unter zwei Treffern zählt', (await bildAliasBauen(['g1', 'g2'], ['v'], { sig: u => u, gleich: (a, b) => (b === 'g1' ? { dh: 0, farbe: 0 } : { dh: 3, farbe: 8 }) })).alias, { v: 'g1' });
  ist('Alias: über 60 verschiedene Bilder wird nicht verglichen', (r2 => [r2.alias, r2.geprueft, !!r2.grund])(await bildAliasBauen(['g'], Array.from({ length: 61 }, (_, i) => 'v' + i), { sig: u => u, gleich: () => ({ dh: 0, farbe: 0 }) })), [{}, 0, true]);
  ist('Alias: ohne Prüffunktionen keine Arbeit und keine Absturzgefahr', (await bildAliasBauen(['g'], ['v'], {})).alias, {});
}

// ── Kategorien aus Bereichsdateien
{
  const d = mkdtempSync(join(tmpdir(), 'grind2-bereich-'));
  mkdirSync(join(d, 'bereiche'));
  writeFileSync(join(d, 'kern.mjs'), 'export const passt = (k, p) => new RegExp(k.titel_muss[0], "i").test(p.title);\nexport const imUnterfilter = (u, p) => new RegExp(u.titel_muss[0], "i").test(p.title);\nexport const normiere = p => ({ ...p, type: p.productType ?? "" });\n');
  writeFileSync(join(d, 'bereiche', 'test.json'), JSON.stringify({ kategorien: [{ handle: 'webcams-x', titel: 'Webcams', titel_muss: ['webcam'], unterfilter: [{ handle: 'webcams-hd', titel: 'HD', titel_muss: ['hd'] }] }] }));
  writeFileSync(join(d, 'bereiche', 'kaputt.json'), '{ nicht json');
  const k = await ladeKategorienExtra(d);
  ist('Bereichsdateien: Kategorie und Unterfilter werden geladen, eine kaputte Datei wird gemeldet statt verschluckt', [k.kategorien.map(x => x.tag), k.geladen, k.fehler.length], [['sort-webcams-x', 'sort-webcams-hd'], ['test'], 1]);
  ist('Bereichsdateien: die Regel wirkt (Treffer / Nichttreffer / Unterfilter braucht die Eltern)', [k.kategorien[0].passt({ title: 'HD Webcam' }), k.kategorien[0].passt({ title: 'Maus' }), k.kategorien[1].passt({ title: 'HD Webcam' }), k.kategorien[1].passt({ title: 'Webcam' })], [true, false, true, false]);
  ist('Bereichsdateien: fehlender Ordner = leer, mit Meldung', (r => [r.kategorien.length, r.fehler.length])(await ladeKategorienExtra('/nix/da')), [0, 1]);
  rmSync(d, { recursive: true, force: true });
}

// ═══════════════════════════ TEIL 3: der ganze Lauf gegen ein simuliertes Netz ═══════════════════════════
const LABELS_DE = { 'Warm White': 'Warmweiß' };         // die KI schreibt gern ß; die Pipeline muss ss daraus machen
/**
 * Eine Testwelt: Temp-Verzeichnis mit Bedarfsdatei, Shop-SKU-Index und Ledgern, dazu ein simuliertes Netz.
 * sz: produkte {pid → Datenblatt} · listen {'suche:webcam' | 'kategorie:ID' → [Einträge]} · fracht {vid → 'leer'|'http500'|'quota'|Linienliste} · titel {englisch → deutsch}
 *     ki 'down' · set 'ok'|'limit'|'usererror' · medien 'READY'|'FAILED'|'LANGSAM' · seite404 · fremdSku {sku → Produkt} · vorhanden {handle → Produkt} · punkte {remaining}
 */
function welt(sz = {}, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'grind2-lauf-'));
  mkdirSync(join(dir, 'dropship'), { recursive: true });
  const p = n => join(dir, n);
  writeFileSync(p('luecken.json'), JSON.stringify({ ziele: [
    { id: 'webcams', name: 'Webcams', rang: 1, welle: '1', ziel: 60, luecke: 57, cj: 'Computer & Office > Office Electronics > Computer Tablet Accessories (Zuordnung bei CJ nicht belegt)', cjSuche: 'webcam' },
    { id: 'lichterketten', name: 'Lichterketten', rang: 10, welle: 'S (Saison jetzt)', ziel: 60, luecke: 51, cj: 'Home Improvement > Outdoor Lighting > String Lights', cjSuche: 'string lights · fairy lights' },
    { id: 'verlobung', name: 'Verlobung', rang: 4, welle: 'R (zurückgestellt)', ziel: 60, luecke: 53, cj: '', cjSuche: 'ring' },
  ] }));
  writeFileSync(p('skus.jsonl'), JSON.stringify({ id: 'gid://shopify/Product/9', handle: 'altes-produkt-999999', title: 'Altes Produkt', status: 'ACTIVE', skus: ['CJ-2999999999999999999'] }) + '\n');
  writeFileSync(p('skus.jsonl.meta.json'), JSON.stringify({ stand: new Date(Date.now() - 3600 * 1000).toISOString() }));
  const e = {
    GRIND2_BEDARF: p('luecken.json'), GRIND_SKUS_DATEI: p('skus.jsonl'), LEDGER: p('dropship/grind2_ledger.txt'), FREIGABE_LEDGER: p('dropship/grind2_freigabe_ledger.txt'),
    VARIANTEN_LEDGER: p('dropship/cj_varianten_ledger.txt'), FREIGABE_DATEI: p('dropship/GRIND2-FREI.txt'), GRIND2_BEREICHE: p('keine-bereiche'), GRIND2_KATALOG: p('kein-katalog.json'),
    PLAN_DIR: p('plan'), GRIND2_CACHE: p('cache'), CJ_FAKTEN_CACHE: p('faktenCache'), OUT: p('bericht.md'), BILDHASH: '0', ...env,
  };
  const cfg = konfigAus(e, dir);
  const log = [];                                              // jede Anfrage
  const shop = { produkte: new Map(), n: 0 };                  // was «angelegt» wurde
  const punkte = sz.punkte || { remaining: 40000 };
  const kiAussetzer = { n: 0 };
  const kosten = u => (/\/product\/list/.test(u) ? 50 : /setting\/get|getCategory/.test(u) ? 0 : 10);
  const cjOk = (data, u) => { punkte.remaining -= kosten(u); return antwort({ code: 200, result: true, message: 'Success', data, requestId: 'r', pointsInfo: { total: 70171, usedToday: 1, remaining: punkte.remaining } }); };
  const kiAntwort = (modell, text) => {
    const m = text.includes('Produkttitel') ? 'titel' : text.includes('Variantenbezeichnungen') ? 'labels' : 'fakten';
    if (sz.ki === 'down') return modell === 'gemini' ? antwort({ error: { message: 'credits depleted' } }, 402) : antwort({}, 500);
    if ((sz.kiAussetzer || 0) > kiAussetzer.n && ++kiAussetzer.n) return antwort({}, 500);
    let inhalt;
    if (m === 'fakten') {
      const titel = (text.match(/^Produkt: (.*)$/m) || [])[1] || '';
      inhalt = (sz.fakten && sz.fakten(titel)) || (/Lichterkette/.test(titel)
        ? { daten: [{ label: 'Material', wert: 'Kupferdraht' }, { label: 'Länge', wert: '5 m oder 10 m' }], lieferumfang: ['1 Solarpanel'], anleitung: [], hinweise: ['Solarpanel im Lieferumfang'] }
        : { daten: [{ label: 'Material', wert: 'ABS' }, { label: 'Länge', wert: '1.5 m' }], lieferumfang: ['1 Webcam', '1 Anleitung'], anleitung: [], hinweise: ['Schnittstelle USB 2.0'] });
    } else {
      const texte = JSON.parse(text.slice(text.lastIndexOf('[')));
      inhalt = texte.map(t => (m === 'titel' ? ((sz.titel || {})[t] ?? 'Full HD USB-Webcam mit Mikrofon') : (LABELS_DE[t] ?? t)));
    }
    log.push({ k: 'ki', art: m, modell });
    return modell === 'gemini' ? antwort({ candidates: [{ content: { parts: [{ text: JSON.stringify(inhalt) }] } }] }) : antwort({ choices: [{ message: { content: JSON.stringify(inhalt) } }] });
  };
  const frisch = (id) => {
    const st = shop.produkte.get(id); if (!st) return null;
    const e2 = st.input, lang = sz.medien === 'LANGSAM' && (st.reads = (st.reads || 0) + 1) <= 2;
    return { id, handle: e2.handle, status: st.status, title: e2.title, tags: [...e2.tags], productType: e2.productType, descriptionHtml: e2.descriptionHtml, onlineStoreUrl: `https://luxestyle.ch/products/${e2.handle}`,
      variantsCount: { count: e2.variants.length }, options: e2.productOptions.map(o => ({ name: o.name, values: o.values.map(v => v.name) })),
      variants: { nodes: e2.variants.map((v, i) => ({ id: `v${i}`, sku: v.inventoryItem.sku, price: v.price, selectedOptions: [], media: { nodes: v.file ? [{ id: `m${i}` }] : [] }, inventoryItem: { unitCost: { amount: v.inventoryItem.cost } } })) },
      media: { nodes: e2.files.map((_, i) => ({ id: `f${i}`, status: sz.medien === 'FAILED' && i === 0 ? 'FAILED' : lang ? 'PROCESSING' : 'READY' })) },
      mf: { value: (e2.metafields.find(m => m.key === 'google_product_category') || {}).value }, resourcePublicationsV2: { nodes: (st.pubs || []).map(id2 => ({ isPublished: true, publication: { id: id2 } })) } };
  };
  const netz = async (url, init = {}) => {
    const u = String(url), body = init.body ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : null;
    if (/^https:\/\/cf\.cjdropshipping\.com\//.test(u)) { log.push({ k: 'bild', m: init.method }); return (sz.badBilder || []).includes(u) ? new Response(null, { status: 404 }) : new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg' } }); }
    if (/^https:\/\/luxestyle\.ch\/products\//.test(u)) { log.push({ k: 'seite', u }); return new Response('<html>', { status: sz.seite404 ? 404 : 200 }); }
    if (/developers\.cjdropshipping\.com/.test(u)) {
      const pfad = new URL(u).pathname.replace('/api2.0/v1/', '');
      log.push({ k: 'cj', pfad });
      if (pfad === 'setting/get') return cjOk({ qpsLimit: 100 }, u);
      if (pfad === 'product/getCategory') return cjOk(sz.baum || [{ categoryFirstName: 'Home Improvement', categoryFirstList: [{ categorySecondName: 'Outdoor Lighting', categorySecondList: [{ categoryId: 'CAT-STRING-LIGHTS', categoryName: 'String Lights' }] }] }], u);
      if (pfad === 'product/list') {
        if (sz.quotaBeiListe) return antwort({ code: 16900500, result: false, message: 'Insufficient API points' });
        const q = new URL(u).searchParams, key = q.get('categoryId') ? `kategorie:${q.get('categoryId')}` : `suche:${q.get('productNameEn')}`;
        log.push({ k: 'liste', key, sort: q.get('orderBy') + ':' + q.get('sort'), groesse: q.get('pageSize') });
        const items = (sz.listen || {})[key] || [];
        return cjOk({ pageNum: 1, pageSize: 200, total: items.length, list: items }, u);
      }
      if (pfad === 'product/query') {
        const pid = new URL(u).searchParams.get('pid'), c = (sz.produkte || {})[pid];
        if (sz.quotaBeiQuery) return antwort({ code: 16900500, result: false, message: 'Insufficient API points' });
        if (!c) { punkte.remaining -= 10; return antwort({ code: 1602001, result: false, message: 'Product not found', data: null, pointsInfo: { remaining: punkte.remaining } }); }
        return cjOk(c, u);
      }
      if (pfad === 'logistic/freightCalculate') {
        const vid = body.products[0].vid, modus = (sz.fracht || {})[vid];
        log.push({ k: 'fracht', vid });
        if (modus === 'http500') return antwort({ result: false, code: 500, message: 'Server Error' }, 500);
        if (modus === 'apifehler') { punkte.remaining -= 10; return antwort({ code: 1602000, result: false, message: 'Variant not found', data: null, pointsInfo: { remaining: punkte.remaining } }); }
        if (modus === 'leer') return cjOk([], u);
        return cjOk(Array.isArray(modus) ? modus : [{ logisticName: 'CJPacket Ordinary', logisticPrice: 4.2, logisticAging: '10-15', totalPostageFee: 4.2 }, { logisticName: 'YunExpress Sensitive', logisticPrice: 6.1, logisticAging: '7-12' }], u);
      }
      throw new Error('Test-Netz: unbekannter CJ-Pfad ' + pfad);
    }
    if (/generativelanguage\.googleapis\.com/.test(u)) return kiAntwort('gemini', body.contents[0].parts[0].text);
    if (/api\.groq\.com/.test(u)) return kiAntwort('groq', body.messages[0].content);
    if (/\/admin\/oauth\/access_token$/.test(u)) { log.push({ k: 'shop-token' }); return antwort({ access_token: 'tok' }); }
    if (/\/admin\/api\/[^/]+\/graphql\.json$/.test(u)) {
      const q = String(body.query), v = body.variables || {};
      if (q.includes('productSet(')) {
        const modus = sz.set || 'ok';
        log.push({ k: 'productSet', hatIdentifier: v.identifier !== undefined, handle: v.input?.handle, varianten: v.input?.variants?.length, status: v.input?.status });
        if (modus === 'limit') return antwort({ errors: [{ message: 'Daily variant creation limit reached' }] });
        if (modus === 'usererror') return antwort({ data: { productSet: { product: null, userErrors: [{ field: ['input'], message: 'Ungültig', code: 'INVALID' }] } } });
        const id = `gid://shopify/Product/${++shop.n}`; shop.produkte.set(id, { input: v.input, status: 'DRAFT', pubs: [] });
        return antwort({ data: { productSet: { product: { id, handle: v.input.handle, status: 'DRAFT', variantsCount: { count: v.input.variants.length }, options: [], media: { nodes: [] } }, userErrors: [] } } });
      }
      if (q.includes('products(first:3')) { log.push({ k: 'sku-abfrage', q: v.q }); const sku = (v.q.match(/sku:"(.*)"/) || [])[1]; const f = (sz.fremdSku || {})[sku]; const eigene = [...shop.produkte.entries()].filter(([, s]) => s.input.variants.some(x => x.inventoryItem.sku === sku)).map(([id, s]) => ({ id, handle: s.input.handle, status: s.status, tags: s.input.tags, variantsCount: { count: s.input.variants.length } })); return antwort({ data: { products: { nodes: f ? [f] : eigene } } }); }
      if (q.includes('productByIdentifier')) { log.push({ k: 'handle-abfrage', h: v.h }); const w = (sz.vorhanden || {})[v.h]; const s = [...shop.produkte.entries()].find(([, x]) => x.input.handle === v.h); return antwort({ data: { productByIdentifier: w || (s ? { id: s[0], handle: v.h, status: s[1].status, tags: s[1].input.tags, variantsCount: { count: s[1].input.variants.length } } : null) } }); }
      if (q.includes('product(id:$id)')) { log.push({ k: 'tore', id: v.id }); return antwort({ data: { product: frisch(v.id) } }); }
      if (q.includes('tagsAdd')) { log.push({ k: 'tagsAdd', id: v.id, t: v.t }); const s = shop.produkte.get(v.id); if (s) s.input.tags.push(...v.t); return antwort({ data: { tagsAdd: { userErrors: [] } } }); }
      if (q.includes('productUpdate')) { log.push({ k: 'status', id: v.p.id, status: v.p.status }); const s = shop.produkte.get(v.p.id); if (s) s.status = v.p.status; return antwort({ data: { productUpdate: { product: { id: v.p.id, status: v.p.status }, userErrors: [] } } }); }
      if (q.includes('publishablePublish')) { log.push({ k: 'publish', id: v.id, pubs: v.p.map(x => x.publicationId) }); const s = shop.produkte.get(v.id); if (s) s.pubs = v.p.map(x => x.publicationId); return antwort({ data: { publishablePublish: { userErrors: [] } } }); }
      if (q.includes('sortKey:CREATED_AT')) { log.push({ k: 'kanal-referenz' }); const pubs = ['gid://P1', 'gid://P2', 'gid://P3']; return antwort({ data: { products: { nodes: Array.from({ length: 4 }, (_, i) => ({ id: 'r' + i, resourcePublicationsV2: { nodes: pubs.map(id2 => ({ isPublished: true, publication: { id: id2 } })) } })) } } }); }
      throw new Error('Test-Netz: unbekannte GraphQL-Abfrage: ' + q.slice(0, 80));
    }
    throw new Error('Test-Netz: unerwartete Adresse (kein echtes Netz im Test): ' + u.slice(0, 120));
  };
  const kategorienExtra = sz.kategorienExtra || { kategorien: [{ tag: 'sort-test-lichterketten', passt: pr => /lichterkette/i.test(pr.title) }], geladen: ['test'], fehler: [] };
  const io = { fetch: netz, warte: keineWarte, basisMs: 0, cjToken: 'cj', shopToken: 'tok', shop: 'test.myshopify.com', geminiKey: 'g', groqKey: 'q', kategorienExtra, productTypeTab: sz.pt || new Map(), env: {}, ...(sz.io || {}) };
  return { dir, p, cfg, io, log, shop, punkte, aus: (art) => log.filter(x => x.k === art), weg: () => rmSync(dir, { recursive: true, force: true }) };
}
const standardSz = () => {
  const w = webcam(), l = lichterkette();
  return { produkte: { [w.pid]: w, [l.pid]: l }, titel: { [w.productNameEn]: 'Full HD USB-Webcam mit Mikrofon', [l.productNameEn]: 'Solarbetriebene Lichterkette für den Garten' },
    listen: { 'suche:webcam': [listeneintrag(w)], 'kategorie:CAT-STRING-LIGHTS': [listeneintrag(l)] }, pt: new Map([['Cameras & Optics > Cameras > Webcams', { typ: 'Elektronik', n: 9, anteil: 1 }]]) };
};
const lesen = p => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// ── Probe: nichts wird geschrieben
{
  const W = welt(standardSz(), { MODUS: 'probe' });
  const r = await lauf(W.cfg, W.io);
  ist('Probe: Exit 0', r.exit, EXIT.OK);
  ist('Probe: zwei Pläne (Webcam, Lichterkette), Zählung', r.bericht.zaehl, { PLAN: 2 });
  ist('Probe: KEIN Zugriff auf den Shop (weder Token noch Abfrage noch Schreiben)', W.log.filter(x => /shop-token|sku-abfrage|handle-abfrage|productSet|tore|tagsAdd|status|publish|kanal/.test(x.k)).length, 0);
  ist('Probe: kein Ledger, keine Freigabe-Ledger', [existsSync(W.cfg.pfade.ledger), existsSync(W.cfg.pfade.freigabeLedger)], [false, false]);
  ist('Probe: beide Zielblätter wurden gelistet, ABSTEIGEND nach listedNum, 200 je Seite; die Kategorie der Lichterketten liefert nur 1 Treffer, darum kommt das erste Suchwort dazu', W.aus('liste').map(x => [x.key, x.sort, x.groesse]),
  [['suche:webcam', 'listedNum:desc', '200'], ['kategorie:CAT-STRING-LIGHTS', 'listedNum:desc', '200'], ['suche:string lights', 'listedNum:desc', '200']]);
  ist('Probe: Webcams werden mit Suchwort gesucht (Zuordnung unbelegt), Lichterketten über die Kategorie; der Baum wird dafür einmal gelesen', [W.aus('cj').filter(x => x.pfad === 'product/getCategory').length], [1]);
  ist('Probe: nicht gewählte Zielblätter (Verlobung, Welle R) wurden nie gelistet', W.aus('liste').some(x => x.key === 'suche:ring'), false);
  const zeilen = r.bericht.zeilen;
  ist('Probe: Titel und Google-Pfad je Kandidat', zeilen.map(z => [z.titel, z.google]), [['Full HD USB-Webcam mit Mikrofon', 'Cameras & Optics > Cameras > Webcams'], ['Solarbetriebene Lichterkette für den Garten', 'Home & Garden > Lighting > Light Ropes & Strings']]);
  wahr('Probe: Webcam hat sort-Tags aus den live bekannten Kategorien (KATEGORIEN)', zeilen[0].sortTags.length > 0 && zeilen[0].sortTags.every(t => t.startsWith('sort-')));
  ist('Probe: Lichterkette bekommt den Tag aus der übergebenen Bereichskategorie nicht allein (kein Muss), aber mindestens einen sort-Tag', zeilen[1].sortTags.length > 0, true);
  ist('Probe: Tore 22 von 22 beim Endplan', zeilen.map(z => z.tore), [{ ok: 22, gesamt: 22, falsch: [] }, { ok: 22, gesamt: 22, falsch: [] }]);
  ist('Probe: Preise und Marge stehen im Kontaktbogen (Einstand = (EK + Fracht 4.20) × 0.82435, auf Rappen)', zeilen.map(z => [z.frachtUsd, z.einstandMin, z.preisMin]), [[4.2, 8.0, 14.9], [4.2, 6.1, 14.9]]);
  wahr('Probe: Marge mindestens 30 %', zeilen.every(z => z.margeMin >= 0.3));
  ist('Probe: Auswahl wird gebaut (Webcam Farbe 2; Lichterkette Farbe × Länge, «Warm White» wurde per KI übersetzt)', zeilen.map(z => z.optionen), ['Farbe 2', 'Farbe 2 × Länge 2']);
  ist('Probe: Punkte nach Preisliste: 3 Listen (150) + Baum (0, gemessen) + 2 Abfragen (20) + 2 Frachten (20)', [W.punkte.remaining, 40000 - W.punkte.remaining], [39810, 190]);
  ist('Probe: Bericht nennt Start, Ende, eigene Aufrufe', [r.bericht.punkte.start, r.bericht.punkte.ende, r.bericht.punkte.eigene], [40000, 39810, 190]);
  const md = lesen(W.cfg.pfade.out);
  wahr('Probe: Kontaktbogen-Datei mit beiden Kandidaten und Betriebsart', md.includes('probe') && md.includes('Solarbetriebene Lichterkette für den Garten') && md.includes('Full HD USB-Webcam mit Mikrofon') && md.includes('## Vorfilter'));
  ist('Probe: Plan-Dateien liegen im Zwischenspeicher', [existsSync(join(W.cfg.pfade.planDir, '2000000000000000001.json')), existsSync(join(W.cfg.pfade.planDir, '2000000000000000002.json'))], [true, true]);
  const plan = JSON.parse(lesen(join(W.cfg.pfade.planDir, '2000000000000000001.json'))).plan;
  ist('Plan: DRAFT, vendor, echte CJ-SKUs, Kosten als Text, Google-Metafeld, Rücknahme-Tags', [plan.eingabe.status, plan.eingabe.vendor, plan.eingabe.variants.map(v => v.inventoryItem.sku), plan.eingabe.variants[0].inventoryItem.cost, plan.eingabe.metafields[0].value],
    ['DRAFT', 'LuxeStyle', ['CJTS123456701AZ', 'CJTS123456702BY'], '8.00', 'Cameras & Optics > Cameras > Webcams']);
  wahr('Plan: Tags enthalten grind2, Datum, text-offen, cj-real, dropship', ['grind2', 'text-offen', 'cj-real', 'dropship'].every(t => plan.eingabe.tags.includes(t)) && plan.eingabe.tags.some(t => /^grind2-\d{8}$/.test(t)));
  ist('Plan: productType aus dem Katalog der Webcams', plan.eingabe.productType, 'Elektronik');
  wahr('Plan: Beschreibung = Kopf + Fakten-Block, keine erfundene Zahl', plan.eingabe.descriptionHtml.includes('<!-- ls-fakten-v1 -->') && plan.eingabe.descriptionHtml.includes('1.5 m'));
  W.weg();
}

// ── Trockenlauf wiederholt: Pläne aus dem Zwischenspeicher kosten keine Punkte
{
  const W = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  const r1 = await lauf(W.cfg, W.io);
  const punkte1 = W.punkte.remaining, queries1 = W.aus('cj').filter(x => x.pfad === 'product/query').length;
  const r2 = await lauf(W.cfg, W.io);
  ist('Trockenlauf: Betriebsart und Zählung', [r1.bericht.betriebsart, r1.bericht.zaehl], ['trocken', { PLAN: 2 }]);
  ist('Trockenlauf wiederholt: gleiche Zählung', r2.bericht.zaehl, { PLAN: 2 });
  ist('Trockenlauf wiederholt: keine zweite Produktabfrage, kein zweiter Listenaufruf, keine Punkte (Listen und Pläne kommen aus dem Zwischenspeicher)', [W.aus('cj').filter(x => x.pfad === 'product/query').length, W.punkte.remaining], [queries1, punkte1]);
  ist('Trockenlauf: schreibt nichts im Shop, kein Ledger, legt nichts für die Text-Kette ab', [existsSync(W.cfg.pfade.ledger), W.aus('shop-token').length, existsSync(W.cfg.pfade.faktenCache)], [false, 0, false]);
  W.weg();
}

// ── LIVE: Sperren
{
  const W = welt(standardSz(), { LIVE: '1' });
  await wirftAsync('Lauf: LIVE=1 ohne Freigabedatei wirft, bevor irgendein Netzzugriff geschieht', () => lauf(W.cfg, W.io), /Freigabedatei/);
  ist('Lauf: ...und es gab keinen einzigen Aufruf', W.log.length, 0);
  W.weg();
  const W2 = welt(standardSz(), { PUBLISH: '1' });
  await wirftAsync('Lauf: PUBLISH=1 ohne LIVE wirft', () => lauf(W2.cfg, W2.io), /PUBLISH=1 braucht LIVE/);
  W2.weg();
  const W3 = welt(standardSz(), { MODUS: 'probe', LIVE: '1' });
  writeFileSync(W3.cfg.pfade.freigabeDatei, 'frei');
  await wirftAsync('Lauf: Probe + LIVE wirft auch mit Freigabedatei', () => lauf(W3.cfg, W3.io), /Probe-Modus/);
  W3.weg();
  const W4 = welt(standardSz(), { LIVE: '1' });
  writeFileSync(W4.cfg.pfade.freigabeDatei, 'frei');
  W4.io.index = baueIndex({ produkte: [] }, { stand: new Date(Date.now() - 30 * 3600 * 1000).toISOString() });
  await wirftAsync('Lauf: LIVE mit einem Shop-SKU-Index von vor 30 Stunden wirft (alles seither Angelegte wäre unsichtbar)', () => lauf(W4.cfg, W4.io), /nicht frisch/);
  W4.weg();
  const W5 = welt(standardSz(), {});
  W5.io.index = baueIndex({ produkte: [] }, { stand: new Date(Date.now() - 30 * 3600 * 1000).toISOString() });
  ist('Lauf: im Trockenlauf genügt ein Hinweis zum alten Index', (await lauf(W5.cfg, W5.io)).bericht.hinweise.some(h => h.includes('nicht frisch')), true);
  W5.weg();
}

// ── LIVE: anlegen als DRAFT, Tore, KEIN Veröffentlichen ohne PUBLISH
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Live: Exit 0, zwei Produkte geschrieben', [r.exit, r.bericht.zaehl], [0, { PLAN: 2, GESCHRIEBEN: 2 }]);
  const ps = W.aus('productSet');
  ist('Live: productSet OHNE identifier (legt nur an, kann nie ein fremdes Produkt überschreiben), Status DRAFT', ps.map(x => [x.hatIdentifier, x.status, x.varianten]), [[false, 'DRAFT', 2], [false, 'DRAFT', 4]]);
  ist('Live: vor dem Anlegen SKU- und Handle-Abfrage', [W.aus('sku-abfrage').length, W.aus('handle-abfrage').length], [2, 2]);
  ist('Live: SKU-Abfrage mit der echten CJ-SKU der ersten Variante in Anführungszeichen', W.aus('sku-abfrage')[0].q, 'sku:"CJTS123456701AZ"');
  const L = lesen(W.cfg.pfade.ledger).trim().split('\n');
  ist('Live: Ledger hat zwei GESCHRIEBEN-Zeilen mit sieben Feldern', L.map(z => { const f = z.split(' · '); return [f[0], f[2], f[3], f.length, f[6]]; }), [['2000000000000000001', 'GESCHRIEBEN', '2 Varianten', 7, 'webcams'], ['2000000000000000002', 'GESCHRIEBEN', '4 Varianten', 7, 'lichterketten']]);
  ist('Live: Freigabe-Ledger FREI (alle Tore bestanden), beide noch DRAFT', [lesen(W.cfg.pfade.freigabeLedger).trim().split('\n').map(z => z.split(' · ')[2]), [...W.shop.produkte.values()].map(s => s.status)], [['FREI', 'FREI'], ['DRAFT', 'DRAFT']]);
  ist('Live ohne PUBLISH: weder aktiv gesetzt noch in Kanälen veröffentlicht, Kanalreferenz nie gelesen', [W.aus('status').length, W.aus('publish').length, W.aus('kanal-referenz').length], [0, 0, 0]);
  ist('Live: das Datenblatt liegt für die Text-Kette unter /tmp/cj_fakten_cache/<handle>.json (einmal bezahlt, zweimal genutzt)', [JSON.parse(lesen(join(W.cfg.pfade.faktenCache, handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001') + '.json')) || '{}').pid], ['2000000000000000001']);
  ist('Live: das Gedächtnis kennt beide pids für immer', [...ledgerGedaechtnis(lesen(W.cfg.pfade.ledger), { jetzt: Date.now() + 365 * 24 * 3600 * 1000 })].sort(), ['2000000000000000001', '2000000000000000002']);
  ist('Live: Budget wurde um die angelegten Varianten belastet', r.bericht.budget.genutzt, 6);
  // Wiederholung: Idempotenz
  const n1 = W.aus('productSet').length, q1 = W.aus('cj').filter(x => x.pfad === 'product/query').length;
  const r2 = await lauf(W.cfg, W.io);
  ist('Live wiederholt: nichts mehr zu tun (beide pids stehen im Ledger), kein zweites productSet, keine neue Produktabfrage', [W.aus('productSet').length, W.aus('cj').filter(x => x.pfad === 'product/query').length, r2.bericht.zaehl], [n1, q1, {}]);
  ist('Live wiederholt: der Vorfilter nennt «ledger» als Grund', r2.bericht.vorfilter.map(v => v.abgelehnt.ledger || 0).reduce((a, b) => a + b, 0) >= 2, true);
  // Restbedarf sinkt
  const bed = bedarfAus(JSON.parse(lesen(W.cfg.pfade.bedarf)), { geschrieben: schreibZaehlerAusLedger(lesen(W.cfg.pfade.ledger)), ziele: ['webcams', 'lichterketten'] });
  ist('Restbedarf nach dem Lauf: Lücke minus Geschriebenes', bed.map(z => [z.id, z.rest]), [['webcams', 56], ['lichterketten', 50]]);
  W.weg();
}

// ── LIVE + PUBLISH
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Publish: beide veröffentlicht', [r.exit, r.bericht.zaehl.VEROEFFENTLICHT, r.bericht.veroeffentlicht.length], [0, 2, 2]);
  ist('Publish: ACTIVE gesetzt und in die Kanäle der Mehrheit der Referenzprodukte veröffentlicht', [W.aus('status').map(x => x.status), W.aus('publish')[0].pubs], [['ACTIVE', 'ACTIVE'], ['gid://P1', 'gid://P2', 'gid://P3']]);
  ist('Publish: Produktseite wurde mit Cache-Buster abgerufen', W.aus('seite').every(x => /\?cb=\d+$/.test(x.u)) && W.aus('seite').length >= 2, true);
  ist('Publish: nach dem Veröffentlichen wurden die Tore noch einmal gelesen (zweimal je Produkt)', W.aus('tore').length, 4);
  ist('Publish: Freigabe-Ledger hat FREI (Entwurf) und FREI (veröffentlicht)', lesen(W.cfg.pfade.freigabeLedger).trim().split('\n').map(z => z.split(' · ')[2]), ['FREI', 'FREI', 'FREI', 'FREI']);
  W.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', PUBLISH_MAX: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Publish: PUBLISH_MAX=1 veröffentlicht nur eines, das andere bleibt DRAFT', [r.bericht.zaehl.VEROEFFENTLICHT, [...W.shop.produkte.values()].map(s => s.status)], [1, ['ACTIVE', 'DRAFT']]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), seite404: true }, { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Publish: Produktseite nicht erreichbar → zurück auf DRAFT, ZURUECK im Freigabe-Ledger', [r.bericht.zaehl.VEROEFFENTLICHT ?? 0, [...W.shop.produkte.values()].map(s => s.status), lesen(W.cfg.pfade.freigabeLedger).trim().split('\n').map(z => z.split(' · ')[2])], [0, ['DRAFT'], ['FREI', 'ZURUECK']]);
  W.weg();
}

// ── LIVE: Übernahme, fremde Dublette, Tageslimit
{
  const sz = standardSz();
  const W = welt({ ...sz, vorhanden: { [handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001')]: { id: 'gid://shopify/Product/77', handle: handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001'), status: 'DRAFT', tags: ['grind2', 'cj-real'], variantsCount: { count: 2 } } } },
    { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Übernahme: ein früherer Lauf hat das Produkt angelegt, bevor die Ledger-Zeile geschrieben wurde → übernommen, KEIN zweites productSet', [W.aus('productSet').length, r.bericht.zaehl.GESCHRIEBEN, lesen(W.cfg.pfade.ledger).includes('gid://shopify/Product/77')], [0, 1, true]);
  ist('Übernahme: ...und die Tore laufen gegen das vorhandene Produkt (hier schlagen sie fehl, weil der Test es nicht kennt — kein Veröffentlichen)', [W.aus('status').length, r.bericht.zaehl.TOR_FEHLER ?? 0].length, 2);
  W.weg();
}
function handleVon(titel, pid) { return `${titel.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 46).replace(/-+$/g, '')}-${pid.slice(-6)}`; }
{
  const W = welt({ ...standardSz(), fremdSku: { CJTS123456701AZ: { id: 'gid://shopify/Product/5', handle: 'fremde-kamera-123456', status: 'ACTIVE', tags: [], variantsCount: { count: 1 } } } }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Fremde Dublette live: SKU gehört schon einem anderen Produkt → übersprungen, nichts geschrieben, endgültig im Ledger', [W.aus('productSet').length, r.bericht.zaehl.UEBERSPRUNGEN, lesen(W.cfg.pfade.ledger).includes('UEBERSPRUNGEN · Dublette (live): SKU CJTS123456701AZ gehört fremde-kamera-123456')], [0, 1, true]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), set: 'limit' }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Tageslimit: Shopify meldet «Daily variant creation limit» → Exit 4, Lauf endet nach dem ersten Versuch', [r.exit, W.aus('productSet').length], [EXIT.VARIANTEN, 1]);
  ist('Tageslimit: das ist KEIN Fehler des Produkts → keine FEHLER-Zeile im Ledger', lesen(W.cfg.pfade.ledger).includes('FEHLER'), false);
  W.weg();
}
{
  const W = welt({ ...standardSz(), set: 'usererror' }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Schreibfehler (userErrors): FEHLER im Ledger, der Lauf geht weiter, Exit 0', [r.exit, r.bericht.zaehl.FEHLER, lesen(W.cfg.pfade.ledger).trim().split('\n').filter(z => z.includes(' · FEHLER · productSet:')).length], [0, 2, 2]);
  ist('Schreibfehler: nichts davon steht als GESCHRIEBEN im Ledger', lesen(W.cfg.pfade.ledger).includes('GESCHRIEBEN'), false);
  W.weg();
}
{
  const W = welt({ ...standardSz(), set: 'usererror' }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_FEHLER_FOLGE: '2' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Fehlerserie: nach MAX_FEHLER_FOLGE Schreibfehlern endet der Lauf mit Exit 1 (ein Dienst scheint auszufallen)', r.exit, EXIT.FEHLER);
  W.weg();
}
{
  const W = welt({ ...standardSz(), medien: 'FAILED' }, { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Tor «Medien»: ein FAILED-Bild → Tag grind2-tor-fehler, FEHLER im Freigabe-Ledger, KEIN Veröffentlichen', [r.bericht.zaehl.TOR_FEHLER, W.aus('tagsAdd').map(x => x.t), W.aus('status').length, lesen(W.cfg.pfade.freigabeLedger).includes(' · FEHLER · medien-fehlerfrei: 1 Medium/Medien FAILED')], [1, [['grind2-tor-fehler']], 0, true]);
  ist('Tor «Medien»: das Produkt BLEIBT im Ledger als GESCHRIEBEN (es existiert als DRAFT)', lesen(W.cfg.pfade.ledger).includes(' · GESCHRIEBEN · '), true);
  W.weg();
}
{
  const W = welt({ ...standardSz(), medien: 'LANGSAM' }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Tor «Medien»: werden die Bilder erst nach einigen Sekunden fertig, wartet der Lauf und liest neu (3 Lesungen), dann FREI', [W.aus('tore').length, r.bericht.zaehl.TOR_FEHLER ?? 0, lesen(W.cfg.pfade.freigabeLedger).includes(' · FREI · ')], [3, 0, true]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), medien: 'LANGSAM' }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1', MEDIEN_WARTE_S: '5' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Tor «Medien»: läuft die Wartezeit ab, ohne dass die Bilder fertig sind, gilt das NICHT als bestanden', [W.aus('tore').length, r.bericht.zaehl.TOR_FEHLER], [1, 1]);
  W.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  W.io.warte = async () => { if (W.aus('productSet').length === 1 && existsSync(W.cfg.pfade.freigabeDatei)) rmSync(W.cfg.pfade.freigabeDatei); };
  const r = await lauf(W.cfg, W.io);
  ist('Stopp: wird die Freigabedatei während des Laufs gelöscht (hier mitten in der Planung des zweiten Produkts), entsteht kein weiteres Produkt', [W.aus('productSet').length, r.bericht.hinweise.some(h => h.includes('verschwunden'))], [1, true]);
  W.weg();
}

// ── Budget
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', GRIND_ANTEIL: '0.0004' });         // 0,04 % von 10 000 = 4 Varianten
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Budget: Anteil 4 Varianten: die Webcam (2) wird angelegt, die Lichterkette (4) passt nicht mehr → Exit 4', [r.exit, W.aus('productSet').length, r.bericht.zaehl.GESCHRIEBEN, r.bericht.zaehl.BUDGET], [EXIT.VARIANTEN, 1, 1, 1]);
  wahr('Budget: der Plan der Lichterkette bleibt im Zwischenspeicher (kostet morgen keine Punkte mehr), steht aber NICHT im Ledger', existsSync(join(W.cfg.pfade.planDir, '2000000000000000002.json')) && !lesen(W.cfg.pfade.ledger).includes('2000000000000000002'));
  W.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  appendFileSync(W.cfg.pfade.auswahlLedger, `irgendein-produkt · ${new Date(Date.now() - 3600 * 1000).toISOString()} · GESCHRIEBEN · 8990 Varianten\n`);
  const r = await lauf(W.cfg, W.io);
  ist('Budget: der Auswahl-Lauf hat 8 990 verbraucht → Gesamtgrenze 9 000 lässt nur 10 zu; Grind darf ihn nie verdrängen, die Webcam (2) passt noch', [r.bericht.budget.frei, r.bericht.budget.auswahl, r.bericht.zaehl.GESCHRIEBEN], [10, 8990, 1]);
  W.weg();
}
{
  const W = welt(standardSz(), { MODUS: 'probe', ZIELE: 'webcams,lichterketten', LIMIT: '4', GRIND_ANTEIL: '0.0001' });
  const r = await lauf(W.cfg, W.io);
  ist('Budget: die Probe schreibt nichts und ignoriert das Budget (zeigt es nur an)', [r.exit, r.bericht.zaehl, r.bericht.budget.frei], [0, { PLAN: 2 }, 1]);
  W.weg();
}

// ── CJ-Ausfälle und Punkte
{
  const W = welt({ ...standardSz(), quotaBeiListe: true }, { ZIELE: 'webcams' });
  const r = await lauf(W.cfg, W.io);
  ist('CJ: erschöpfte Punkte beim Listen → Exit 3, Bericht wird trotzdem geschrieben', [r.exit, existsSync(W.cfg.pfade.out)], [EXIT.CJ, true]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), quotaBeiQuery: true }, { ZIELE: 'webcams' });
  const r = await lauf(W.cfg, W.io);
  ist('CJ: erschöpfte Punkte bei der Produktabfrage → Exit 3, kein FEHLER-Eintrag für das Produkt', [r.exit, r.bericht.zaehl.FEHLER ?? 0], [EXIT.CJ, 0]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), punkte: { remaining: 15030 } }, { ZIELE: 'webcams' });
  const r = await lauf(W.cfg, W.io);
  ist('CJ: unter der Reserve (15 030 < 15 000 + 50) → Exit 3 ohne einen einzigen Listenaufruf, schon vor Stufe 2 mit klarer Meldung', [r.exit, W.aus('liste').length, r.bericht.hinweise.some(h => h.includes('nur noch 15030 CJ-Punkte, Reserve 15000'))], [EXIT.CJ, 0, true]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), punkte: { remaining: 15100 } }, { ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  const r = await lauf(W.cfg, W.io);
  ist('CJ: die Reserve wird nie unterschritten — der Lauf endet mit Exit 3, sobald der nächste Aufruf sie anbrechen würde', [r.exit, W.punkte.remaining >= 15000], [EXIT.CJ, true]);
  W.weg();
}
{
  const W = welt(standardSz(), { MODUS: 'probe', PUNKTE_MAX: '120' });
  const r = await lauf(W.cfg, W.io);
  ist('CJ: eigene Punktegrenze (hier 120) wird nie überschritten, Exit 3', [r.exit, 40000 - W.punkte.remaining <= 120], [EXIT.CJ, true]);
  W.weg();
}
{
  const w = webcam();
  const W = welt({ ...standardSz(), fracht: { [w.variants[0].vid]: 'leer', [w.variants[1].vid]: 'leer' } }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Fracht: keine Versandlinie → endgültig übersprungen (14 Tage), beide Gewichtsklassen gemessen, nichts angelegt', [r.bericht.zaehl.UEBERSPRUNGEN, W.aus('fracht').length, W.aus('productSet').length, lesen(W.cfg.pfade.ledger).includes(' · UEBERSPRUNGEN · keine Versandlinie CN→CH')], [1, 2, 0, true]);
  W.weg();
}
{
  const w = webcam();
  const W = welt({ ...standardSz(), fracht: { [w.variants[1].vid]: 'apifehler' } }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  const z = lesen(W.cfg.pfade.ledger).trim();
  ist('Fracht: API-Fehler (1602000) = UNBEKANNT, nicht «nicht lieferbar» → vorläufig (20 Stunden), nichts angelegt', [r.bericht.zaehl.UEBERSPRUNGEN, W.aus('productSet').length, z.includes(' · UEBERSPRUNGEN · vorläufig: Fracht unbekannt')], [1, 0, true]);
  ist('Fracht: ...und nach 21 Stunden wird das Produkt wieder versucht, nach 1 Stunde nicht', [ledgerGedaechtnis(z, { jetzt: Date.now() + 21 * 3600 * 1000 }).has('2000000000000000001'), ledgerGedaechtnis(z, { jetzt: Date.now() + 3600 * 1000 }).has('2000000000000000001')], [false, true]);
  W.weg();
}
{
  const w = webcam();
  const W = welt({ ...standardSz(), fracht: { [w.variants[1].vid]: 'leer', [w.variants[0].vid]: [{ logisticName: 'CJPacket Ordinary', logisticPrice: 3.1, logisticAging: '9-14' }] } }, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Fracht: schwerste Variante ohne Linie, leichteste mit → nur teilweise lieferbar → zurückgestellt (Gewichtsklassen dazwischen unbekannt)', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('zurueckgestellt') && r.bericht.zeilen[0].entscheid.includes('nur die leichteste')], [1, true]);
  W.weg();
}
{
  const l = lichterkette();
  const nurSens = [{ logisticName: 'YunExpress Sensitive', logisticPrice: 6.1, logisticAging: '7-12' }, { logisticName: 'CJPacket Liquid Line', logisticPrice: 7.5 }];
  const sz = { ...standardSz(), fracht: Object.fromEntries(l.variants.map(v => [v.vid, nurSens])) };
  const W = welt(sz, { ZIELE: 'lichterketten', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Fracht: nur Sonderlinien (Batterie/Flüssigkeit) → zurückgestellt, nicht mit der teuren Sonderlinie gerechnet', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('nur Sonderlinien')], [1, true]);
  W.weg();
  const W2 = welt(sz, { ZIELE: 'lichterketten', LIMIT: '1', SENSITIV_AUSWEG: '1' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Fracht: ...mit SENSITIV_AUSWEG=1 wird die günstigste Sonderlinie (6.10) genommen', [r2.bericht.zaehl.PLAN, r2.bericht.zeilen[0].frachtUsd], [1, 6.1]);
  W2.weg();
}

{
  const w = webcam(), l = lichterkette();
  const W = welt({ ...standardSz(), fracht: { [w.variants[1].vid]: 'http500', [l.variants[1].vid]: 'http500' } }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('Fracht: HTTP 500 bleibt nach allen Wiederholungen bestehen = CJ drosselt. Das erste Produkt wird als FEHLER gemerkt, das zweite hintereinander beendet den Lauf (Exit 3)', [r.exit, r.bericht.zaehl.FEHLER, lesen(W.cfg.pfade.ledger).trim().split('\n').length], [EXIT.CJ, 1, 1]);
  W.weg();
}

// ── Stecker, KI, Kategorien, Text, Bilder
{
  const l = lichterkette();
  l.productKeyEn = 'Color-Plug';
  l.variants = l.variants.map((v, i) => ({ ...v, variantKey: `Warm White-${['US', 'UK', 'AU', 'US'][i]}`, variantSku: v.variantSku }));
  const W = welt({ ...standardSz(), produkte: { [l.pid]: l } }, { ZIELE: 'lichterketten', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Stecker: nur Fremdstecker (US/UK/AU) → übersprungen, KEINE Fracht mehr bezahlt (der Vorplan fängt es ab)', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('Fremdstecker'), W.aus('fracht').length], [1, true, 0]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), ki: 'down' }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_KI_FOLGE: '2' });
  writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
  const r = await lauf(W.cfg, W.io);
  ist('KI-Ausfall: zwei Mal hintereinander → Exit 5, beide vorläufig im Ledger (20 Stunden), nichts angelegt', [r.exit, W.aus('productSet').length, lesen(W.cfg.pfade.ledger).trim().split('\n').filter(z => z.includes('UEBERSPRUNGEN · vorläufig: KI-Dienst nicht erreichbar')).length], [EXIT.KI, 0, 2]);
  W.weg();
  const W2 = welt({ ...standardSz(), ki: 'down' }, { ZIELE: 'webcams', LIMIT: '1' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('KI-Ausfall: ein einzelner Ausfall ist noch kein Abbruch (Exit 0)', [r2.exit, r2.bericht.zaehl.UEBERSPRUNGEN], [0, 1]);
  W2.weg();
}
{
  const sz = standardSz(); const w = webcam();
  sz.titel[w.productNameEn] = 'Webcam 4K Ultra HD mit Mikrofon';          // 4K steht nicht im Datenblatt → erfundene Zahl
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Titel-Wahrheit: ein Titel mit erfundener Zahl wird zweimal versucht, dann zurückgestellt (nicht repariert, nicht angelegt)', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('Titel nicht sicher'), W.aus('ki').filter(x => x.art === 'titel').length], [1, true, 2]);
  W.weg();
}
{
  const sz = standardSz(); const w = webcam();
  sz.titel[w.productNameEn] = 'Dekorativer Gegenstand für Zuhause';       // keine bekannte Warenart → keine sichere Google-Kategorie
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Kategorie: ohne sichere Google-Kategorie wird NICHT angelegt, die Fracht nicht bezahlt', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('keine sichere Google-Kategorie'), W.aus('fracht').length], [1, true, 0]);
  W.weg();
}
{
  const sz = standardSz(); const l = lichterkette();
  sz.titel[l.productNameEn] = 'LED Lichterkette mit USB-Anschluss';       // Pfad klar, aber KEIN sort-Tag in den bekannten Kategorien
  const W = welt({ ...sz, kategorienExtra: { kategorien: [], geladen: [], fehler: [] } }, { ZIELE: 'lichterketten', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Kategorie: sicherer Pfad, aber kein sort-Tag («in die passende Kategorie» nicht erfüllt) → zurückgestellt, nicht angelegt', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('keine passende Kategorie')], [1, true]);
  W.weg();
}
{
  const W = welt({ ...standardSz(), fakten: () => ({ daten: [{ label: 'Material', wert: 'ABS' }], lieferumfang: [], anleitung: [], hinweise: [] }) }, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Text: zu wenig belegte Angaben → «Text offen», zurückgestellt (lieber kurz als erfunden)', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('Text offen')], [1, true]);
  W.weg();
  const W2 = welt({ ...standardSz(), fakten: () => ({ daten: [{ label: 'Material', wert: 'ABS' }], lieferumfang: [], anleitung: [], hinweise: [] }) }, { ZIELE: 'webcams', LIMIT: '1', DUENN_OK: '1' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Text: mit DUENN_OK=1 wird geplant (Beschreibung leer, Tag text-offen bleibt)', [r2.bericht.zaehl.PLAN, JSON.parse(lesen(join(W2.cfg.pfade.planDir, '2000000000000000001.json'))).plan.eingabe.tags.includes('text-offen')], [1, true]);
  W2.weg();
  const W3 = welt({ ...standardSz(), fakten: () => ({ daten: [{ label: 'Material', wert: 'ABS' }, { label: 'Länge', wert: '9.9 m' }], lieferumfang: ['1 Webcam'], anleitung: [], hinweise: [] }) }, { ZIELE: 'webcams', LIMIT: '1' });
  const r3 = await lauf(W3.cfg, W3.io);
  ist('Text: eine Zahl, die nicht im Datenblatt steht («9.9 m»), wird aus dem Block geworfen → dann zu dünn', [r3.bericht.zaehl.UEBERSPRUNGEN, r3.bericht.zeilen[0].entscheid.includes('Text offen')], [1, true]);
  W3.weg();
}
{
  const w = webcam();
  const W = welt({ ...standardSz(), badBilder: [img('w1'), img('w2'), img('w3')] }, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Bilder: nur 2 Galeriebilder mit HTTP 200 (Bild-Falle) → Tor «bilder» fällt, vorläufig (kann ein Zeitfehler sein)', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('vorlaeufig') && r.bericht.zeilen[0].entscheid.includes('bilder')], [1, true]);
  void w;
  W.weg();
}
{
  const sz = standardSz();
  const W = welt({ ...sz, io: { bildSig: async u => u, bildGleich: (a, b) => (a.replace('wv', 'w') === b ? { dh: 0, farbe: 0 } : null) } }, { ZIELE: 'webcams', LIMIT: '1', BILDHASH: '1' });
  const r = await lauf(W.cfg, W.io);
  const plan = JSON.parse(lesen(join(W.cfg.pfade.planDir, '2000000000000000001.json'))).plan;
  ist('Bildvergleich: die Variantenbilder wv1/wv2 sind visuell w1/w2 → kein zweiter Upload (5 Galeriebilder statt 7 Dateien)', [r.bericht.zaehl.PLAN, plan.eingabe.files.length, plan.eingabe.variants.map(v => v.file.originalSource)], [1, 5, [img('w1'), img('w2')]]);
  W.weg();
  const W2 = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W2.cfg, W2.io);
  ist('Bildvergleich: ohne ihn bleiben es 7 Dateien (Gegenprobe)', JSON.parse(lesen(join(W2.cfg.pfade.planDir, '2000000000000000001.json'))).plan.eingabe.files.length, 7);
  W2.weg();
}
{
  const w = webcam();
  const W = welt({ ...standardSz(), produkte: { [w.pid]: w }, listen: { 'suche:webcam': [listeneintrag(w), listeneintrag(w, { pid: '2000000000000000777', productSku: 'CJXX0000000' })] } }, { ZIELE: 'webcams', LIMIT: '2' });
  const r = await lauf(W.cfg, W.io);
  ist('Unbekannte pid bei CJ (1602001): übersprungen als «CJ ohne Daten», endgültig, kein Fehler', [r.bericht.zaehl.PLAN, r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[1].entscheid], [1, 1, 'übersprungen (endgueltig): CJ ohne Daten (code 1602001)']);
  W.weg();
}
{
  const w = webcam();
  const sz = standardSz();
  const W = welt({ ...sz, listen: { 'suche:webcam': [listeneintrag(w), listeneintrag(w, { pid: '2999999999999999999' })] } }, { ZIELE: 'webcams', LIMIT: '2' });
  const r = await lauf(W.cfg, W.io);
  ist('Dublette im Shop-Index (pid-SKU CJ-2999999999999999999): schon im Vorfilter erkannt, keine Punkte dafür ausgegeben', [r.bericht.zaehl.PLAN, W.aus('cj').filter(x => x.pfad === 'product/query').length, r.bericht.vorfilter[0].abgelehnt], [1, 1, { dublette: 1 }]);
  W.weg();
}
{
  // Zwei Listeneinträge, die nach der Abfrage dasselbe Produkt sind (gleiche productSku): der zweite wird als Dublette des ersten erkannt, weil geplante Produkte in den Index aufgenommen werden
  const w = webcam(), w2 = webcam('2000000000000000555');
  const sz = standardSz();
  const W = welt({ ...sz, produkte: { [w.pid]: w, [w2.pid]: w2 }, listen: { 'suche:webcam': [listeneintrag(w), listeneintrag(w2, { listedNum: 50, productSku: 'CJVERSCHIEDEN1' })] } }, { ZIELE: 'webcams', LIMIT: '2' });
  const r = await lauf(W.cfg, W.io);
  ist('Doppelte Ware im selben Lauf: der zweite Kandidat teilt productSku/SKUs mit dem ersten und wird als Dublette erkannt', [r.bericht.zaehl.PLAN, r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[1].entscheid.includes('Dublette')], [1, 1, true]);
  W.weg();
}
{
  // Hinweis: Zielblatt ohne jede CJ-Quelle
  const W = welt(standardSz(), { ZIELE: 'verlobung', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Zielblatt mit Suchwort ohne Treffer: kein Absturz, keine Kandidaten, Exit 0', [r.exit, r.bericht.zeilen.length], [0, 0]);
  W.weg();
}

// ── Lehren aus der ersten echten Probe (27.10.2026): Zubehör im Gerätepfad, Saisonware, englischer Rest im Text, KI-Aussetzer, ß, Datenblatt-Zwischenspeicher
{
  const sz = standardSz(); const w = webcam();
  sz.titel[w.productNameEn] = 'Webcam Laptop Linse Tablet Privatsphäre Kamera Abdeckung';
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Zubehör-Wächter im Lauf: die Linsenabdeckung mit Kopfwort «Webcam» landet NICHT in der Webcam-Kategorie, und die Fracht wird nicht bezahlt', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('Zubehör-Konflikt: «abdeckung»'), W.aus('fracht').length], [1, true, 0]);
  W.weg();
}
{
  const hal = { ...webcam('2000000000000000333'), productNameEn: 'Halloween Pumpkin Lantern LED String Lights', productSku: 'CJHAL000001' };
  const w = webcam(), sz = standardSz();
  sz.produkte[hal.pid] = hal; sz.listen['suche:webcam'] = [listeneintrag(hal, { listedNum: 900 }), listeneintrag(w)];
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '2', GRIND2_X: '1' });
  W.io.jetzt = () => Date.parse('2026-10-27T12:00:00Z');
  const r = await lauf(W.cfg, W.io);
  ist('Saison im Lauf (27. Oktober): die Halloween-Laterne mit der höchsten listedNum fällt schon im Vorfilter, ohne dass Punkte dafür ausgegeben werden', [r.bericht.vorfilter[0].abgelehnt.saison, W.aus('cj').filter(x => x.pfad === 'product/query').length, r.bericht.zaehl], [1, 1, { PLAN: 1 }]);
  W.weg();
  const weih = { ...webcam('2000000000000000444'), productNameEn: 'Christmas Tree LED Lights', productSku: 'CJWEI000001' };
  const sz2 = standardSz(); sz2.produkte[weih.pid] = weih; sz2.listen['suche:webcam'] = [listeneintrag(weih)];
  const W2 = welt(sz2, { ZIELE: 'webcams', LIMIT: '1' });
  W2.io.jetzt = () => Date.parse('2027-01-15T12:00:00Z');
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Saison im Lauf (15. Januar): Weihnachtsware ist ausserhalb des Fensters', [r2.bericht.vorfilter[0].abgelehnt.saison, r2.bericht.zeilen.length], [1, 0]);
  W2.weg();
  const W3 = welt(sz2, { ZIELE: 'webcams', LIMIT: '1' });
  W3.io.jetzt = () => Date.parse('2026-10-27T12:00:00Z');
  const r3 = await lauf(W3.cfg, W3.io);
  ist('Saison im Lauf (27. Oktober): dieselbe Weihnachtsware ist im Fenster und kommt in die Prüfung', r3.bericht.zeilen.length, 1);
  W3.weg();
}
{
  const W = welt({ ...standardSz(), fakten: () => ({ daten: [{ label: 'Material', wert: 'Plastic' }, { label: 'Farbe', wert: 'white' }, { label: 'Länge', wert: '1.5 m' }], lieferumfang: ['1 manual'], anleitung: [], hinweise: ['can be used indoor and outdoor'] }) }, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('Text im Lauf: liefert das Modell nur englische Werte («Plastic», «white»), bleibt nichts Belegtes übrig → «Text offen», kein halb englischer Seitentext', [r.bericht.zaehl.UEBERSPRUNGEN, r.bericht.zeilen[0].entscheid.includes('Text offen')], [1, true]);
  W.weg();
  const W2 = welt({ ...standardSz(), fakten: () => ({ daten: [{ label: 'Material', wert: 'Plastic' }, { label: 'Material', wert: 'ABS' }, { label: 'Länge', wert: '1.5 m' }], lieferumfang: ['1 Webcam', '1 Anleitung'], anleitung: [], hinweise: [] }) }, { ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W2.cfg, W2.io);
  const html = JSON.parse(lesen(join(W2.cfg.pfade.planDir, '2000000000000000001.json'))).plan.eingabe.descriptionHtml;
  ist('Text im Lauf: der englische Eintrag («Plastic») fällt einzeln weg, die deutschen bleiben', [html.includes('Plastic'), html.includes('ABS'), html.includes('1.5 m')], [false, true, true]);
  W2.weg();
}
{
  const W = welt({ ...standardSz(), kiAussetzer: 3 }, { ZIELE: 'webcams', LIMIT: '1' });      // Gemini + beide Groq-Modelle fallen im ersten Versuch aus
  const r = await lauf(W.cfg, W.io);
  ist('KI-Aussetzer: ein einzelner Fehlschlag von Gemini UND Groq wird nach kurzer Pause wiederholt (kein «Ausfall»), das Produkt wird geplant', [r.bericht.zaehl, r.bericht.zeilen[0].titel], [{ PLAN: 1 }, 'Full HD USB-Webcam mit Mikrofon']);
  W.weg();
}
{
  const W = welt(standardSz(), { ZIELE: 'lichterketten', LIMIT: '1' });
  await lauf(W.cfg, W.io);
  const e = JSON.parse(lesen(join(W.cfg.pfade.planDir, '2000000000000000002.json'))).plan.eingabe;
  const werte = e.productOptions.flatMap(o => o.values.map(v => v.name));
  ist('Schweizer Rechtschreibung: die KI schreibt «Warmweiß», die Auswahl trägt «Warmweiss» (kein ß in Optionswerten)', [werte.includes('Warmweiss'), werte.some(x => x.includes('ß'))], [true, false]);
  W.weg();
}
{
  const W = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W.cfg, W.io);
  const q1 = W.aus('cj').filter(x => x.pfad === 'product/query').length, f1 = W.aus('fracht').length;
  rmSync(W.cfg.pfade.planDir, { recursive: true, force: true });
  await lauf(W.cfg, W.io);
  ist('Datenblatt-Zwischenspeicher: ohne Plan wird neu geplant, aber das Datenblatt nicht noch einmal bei CJ bezahlt (Abfrage 10 Punkte gespart), die Fracht schon neu gemessen', [W.aus('cj').filter(x => x.pfad === 'product/query').length, W.aus('fracht').length > f1], [q1, true]);
  W.weg();
}
{ // faktenBlock einzeln
  const gem = o => antwort({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] });
  const reich = { daten: [{ label: 'Material', wert: 'ABS' }, { label: 'Länge', wert: '1.5 m' }], lieferumfang: ['1 Webcam'], anleitung: [], hinweise: [] };
  const r = await faktenBlock(webcam(), 'Webcam', { fetch: async () => gem(reich), geminiKey: 'g', groqKey: '', warte: keineWarte });
  ist('faktenBlock: genug belegte Angaben → HTML mit Marker', [r.ok, r.html.startsWith('<!-- ls-fakten-v1 -->'), r.belegt], [true, true, 3]);
  let n = 0;
  const r2 = await faktenBlock(webcam(), 'Webcam', { fetch: async () => { n++; return antwort({}, 500); }, geminiKey: 'g', groqKey: '', warte: keineWarte });
  ist('faktenBlock: Modell ohne Antwort wird einmal wiederholt, dann Ausfall (nicht «zu dünn»)', [r2.ok, r2.kiAusfall, n], [false, true, 2]);
  n = 0;
  const r3 = await faktenBlock(webcam(), 'Webcam', { fetch: async () => (++n === 1 ? antwort({}, 500) : gem(reich)), geminiKey: 'g', groqKey: '', warte: keineWarte });
  ist('faktenBlock: der zweite Versuch gelingt', [r3.ok, n], [true, 2]);
}

// ── Zusammenfassung
console.log(`\n${ok} ok, ${fehl} Fehler`);
if (fehl) process.exit(1);
