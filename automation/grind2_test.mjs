// Tests für grind2.mjs («Grind 2.0», die Pipeline). Teil 1: reine Funktionen mit Gegenproben in BEIDE Richtungen. Teil 2: der ganze Lauf gegen ein SIMULIERTES Netz
// (CJ, Shopify, Gemini/Groq, Bild-Server, Produktseite — nichts davon ist echt; jede unbekannte Adresse wirft). Die Zusammenfassung steht am ENDE, Exit 1 bei einem Fehler.
// Lauf: node automation/grind2_test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, appendFileSync, unlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import {
  EXIT, KOSTEN, konfigAus, schutzPruefen, bedarfAus, schreibZaehlerAusLedger, baumAbflachen, cjPfadVertraut, cjQuellenFuer, listeUrl, quellenSchluessel,
  sperrwort, vorfilter, rangiere, vorfilterListe, verteile, titelBereinigen, titelPruefen, uebersetzungBrauchbar, TITEL_AUFTRAG, LABEL_AUFTRAG,
  productTypeTabelle, productTypeFuer, tagsFuer, preisMinFuer, preisUrteil, fristKopf, ledgerZeile, ledgerZeileGeschrieben, variantenVerbrauch, variantenBudget,
  toreNachAnlage, kanaeleAusReferenz, kontaktbogen, cjClient, modellJson, bilderPruefen, bildAliasBauen, ladeKategorienExtra, lauf, saisonSperre, zubehoerKonflikt, istEnglisch, faktenSprachfilter, faktenBlock,
  bestandJeVid, ledgerNeuesterStand, auswahlLedgerWaehlen, liveSortTags, hatLiveCollection, planVersion, planGueltig, planSchluessel, HANDPRUEFUNG_ZIELE, istHandpruefung, sperreHolen, sperreHerz, shopZugang,
  auswahlLedgerAndere, VARIANTEN_LIMIT_RE, CJ_LAUF_RE, VERTRAUEN_HAND,
} from './grind2.mjs';
import * as GM from './grind2.mjs';
import * as PL from './lib/grind_plan.mjs';
import * as DB from './lib/grind_dubletten.mjs';
import { ledgerGedaechtnis } from './lib/varianten_sicherheit.mjs';
import { KATEGORIEN } from './lib/kategorien.mjs';
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
ist('Vorfilter: Baby/Kinder (Merchant-Risiko oder Kinderware-Sperrwort des englischen Namens)', /^(merchant:|sperrwort:Kinderware)/.test(vf(gut({ productNameEn: 'Baby Monitor Camera' })).grund), true);
ist('F11: Vorfilter - die Merchant-Prüfung (Marken-/Safety-Risiko) sperrt, was weder Markenmuster noch Sperrwort kennen («Gucci Style Belt»)', vf(gut({ productNameEn: 'Gucci Style Belt' })).grund, 'merchant:Marken-/Safety-Risiko');
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
ist('Zubehör: Zubehörwort nur im englischen CJ-Namen (Kopfglied «… Cover»)', zubehoerKonflikt({ titel: 'Webcam Schutz', cjName: 'Webcam Privacy Cover', pfad: WEBCAMS }), { wort: 'cover', quelle: 'CJ-Name' });
ist('Zubehör: Fälle der Probe fallen weiter durch (Sticker/Schieber, Halterung, Ständer)', ['Webcam Laptop Linse Sticker Tablet Kamera Telefon Schieber', 'Halterung für Webcam', 'Webcam Ständer'].map(t => zubehoerKonflikt({ titel: t, pfad: WEBCAMS })?.wort), ['sticker', 'halterung', 'ständer']);
ist('Zubehör: Beigaben nach «mit» sind keine Sperre (Mikrofon mit Stativ, Beamer mit Halterung, Schale mit Holzdeckel)', [zubehoerKonflikt({ titel: 'USB Kondensator-Mikrofon mit Stativ', cjName: 'USB Condenser Microphone with Stand', pfad: 'Electronics > Audio > Audio Components > Microphones' }), zubehoerKonflikt({ titel: 'Smart Beamer mit PTZ-Halterung', cjName: 'Smart Projector with PTZ Mount', pfad: 'Electronics > Video > Projectors' }), zubehoerKonflikt({ titel: 'Keramik-Schale mit Holzdeckel', cjName: 'Ceramic Bowl with Wooden Lid', pfad: 'Home & Garden > Kitchen & Dining > Tableware > Serveware > Serving Bowls' })], [null, null, null]);
ist('Zubehör: Kissenbezug ist die Ware («Pillow Cover»), nie Zubehör', [zubehoerKonflikt({ titel: 'Kissenbezug mit Fransen', cjName: 'Denim Ribbon Fringe Jacquard Pillow Cover', pfad: 'Home & Garden > Decor > Throw Pillows' }), zubehoerKonflikt({ titel: 'Bettbezug 200x200', cjName: 'Duvet Cover', pfad: 'Home & Garden > Linens & Bedding > Bedding' })], [null, null]);
ist('Zubehör: Wortgrenze am Ende («Ständerlampe» ist kein Ständer), Zusammensetzungen am Ende zählen («Netzadapter»)', [zubehoerKonflikt({ titel: 'Ständerlampe Holz', pfad: 'Home & Garden > Lighting' }), zubehoerKonflikt({ titel: 'Netzadapter', pfad: 'Electronics > Computers > Laptops' })?.wort], [null, 'adapter']);
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
const FRISCH = () => ({ id: 'gid://shopify/Product/1', status: 'DRAFT', title: EINGABE.title, handle: EINGABE.handle, tags: [...EINGABE.tags], descriptionHtml: `<!-- ls-var-v1 --><!-- ls-fakten-v1 -->${'<li>Angabe</li>'.repeat(30)}`,
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
  ist('Bilder: doppelte und leere Adressen kosten keinen Aufruf (ein HEAD je Adresse; ohne content-length kommt eine Bereichsanfrage dazu)', log.filter(([m, u]) => m === 'HEAD' && u.endsWith('/ok.jpg')).length, 1);
  ist('Bilder: 404 fällt NICHT auf GET zurück (nur 400/403/405/501)', log.filter(([, u]) => u.endsWith('/tot.jpg')).map(([m]) => m), ['HEAD']);
}

// ── Bilder: Shopify nimmt PNG, GIF, JPEG, WEBP, HEIC bis 20 MB
{
  const MB = 1024 * 1024;
  const f = async (u, init) => {
    const kopf = (typ, groesse) => new Response(null, { status: 200, headers: { 'content-type': typ, ...(groesse ? { 'content-length': String(groesse) } : {}) } });
    if (u.endsWith('/gross.jpg')) return kopf('image/jpeg', 30 * MB);
    if (u.endsWith('/genau20.jpg')) return kopf('image/jpeg', 20 * MB);
    if (u.endsWith('/knapp.jpg')) return kopf('image/jpeg', 20 * MB + 1);
    if (u.endsWith('/heic.heic')) return kopf('image/heic', MB);
    if (u.endsWith('/svg.svg')) return kopf('image/svg+xml', 1000);
    if (u.endsWith('/avif.avif')) return kopf('image/avif', 1000);
    if (u.endsWith('/webp.webp')) return kopf('image/webp', 1000);
    throw new Error('unerwartet ' + u);
  };
  const r = await bilderPruefen(['gross.jpg', 'genau20.jpg', 'knapp.jpg', 'heic.heic', 'svg.svg', 'avif.avif', 'webp.webp'].map(x => 'https://c/' + x), { fetch: f });
  ist('Bilder: bis genau 20 MB sowie HEIC und WEBP sind gut', [...r.ok].sort(), ['https://c/genau20.jpg', 'https://c/heic.heic', 'https://c/webp.webp']);
  ist('Bilder: über 20 MB, SVG und AVIF sind schlecht, mit Grund (kein stiller FAILED-Upload später)', Object.fromEntries(r.schlecht), { 'https://c/gross.jpg': 'zu gross (30 MB, Shopify: höchstens 20 MB)', 'https://c/knapp.jpg': 'zu gross (20 MB, Shopify: höchstens 20 MB)', 'https://c/svg.svg': 'kein Bild (image/svg+xml)', 'https://c/avif.avif': 'kein Bild (image/avif)' });
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
    GRIND2_TEST: '1', INDEX_MIN_PRODUKTE: '0', AUSWAHL_LEDGER_MAX_H: '0', PLAN_DIR: p('plan'), GRIND2_CACHE: p('cache'), CJ_FAKTEN_CACHE: p('faktenCache'), OUT: p('bericht.md'), BILDHASH: '0', ...env,
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
      if (pfad === 'product/stock/getInventoryByPid') { punkte.remaining -= 10; const pid = new URL(u).searchParams.get('pid'); return antwort({ success: true, code: 200, message: '', data: { inventories: [], variantInventories: (sz.bestand || {})[pid] || [] }, pointsInfo: { total: 70171, usedToday: 1, remaining: punkte.remaining } }); }
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
        const id = `gid://shopify/Product/${++shop.n}`;
        // sz.handleModus 'suffix': Shopify nummeriert den Handle still um (die Doku schweigt, ob productSet das tut) — hier hängt der simulierte Shop «-1» an
        const eingabe = sz.handleModus === 'suffix' ? { ...v.input, handle: `${v.input.handle}-1` } : v.input;
        shop.produkte.set(id, { input: eingabe, status: 'DRAFT', pubs: [] });
        return antwort({ data: { productSet: { product: { id, handle: eingabe.handle, status: 'DRAFT', variantsCount: { count: v.input.variants.length }, options: [], media: { nodes: [] } }, userErrors: [] } } });
      }
      if (q.includes('collections(first:250')) {
        // Smart-Collections mit sort-Tag-Regeln; Vorgabe: jedes Tag der Basis-Kategorien existiert als Collection. sz.liveSort = Tag-Liste (leer = keine), sz.liveSortSeiten = [[…],[…]] (mehrere Seiten)
        const seiten = sz.liveSortSeiten || [sz.liveSort || [...KATEGORIEN.map(k => k.tag).filter(Boolean), 'sort-test-lichterketten']];
        const i = v.after ? Number(String(v.after).replace('cursor', '')) : 0;
        log.push({ k: 'sammlungen', after: v.after || null });
        const knoten = (seiten[i] || []).map(t => ({ ruleSet: { rules: [{ column: 'TAG', relation: 'EQUALS', condition: t }] } }));
        return antwort({ data: { collections: { nodes: knoten, pageInfo: { hasNextPage: i + 1 < seiten.length, endCursor: 'cursor' + (i + 1) } } } });
      }
      if (q.includes('tag:grind2 status:active')) {
        // Aufräumen nach einem Absturz: aktive Produkte mit der Marke grind2 samt ihren veröffentlichten Kanälen (aus dem Zustand des simulierten Shops)
        log.push({ k: 'aufraeumen' });
        const nodes = [...shop.produkte.entries()].filter(([, st]) => st.status === 'ACTIVE' && st.input.tags.includes('grind2'))
          .map(([id, st]) => ({ id, handle: st.input.handle, status: st.status, tags: [...st.input.tags], resourcePublicationsV2: { nodes: (st.pubs || []).map(() => ({ isPublished: true })) } }));
        return antwort({ data: { products: { nodes } } });
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
  ist('Probe: Tore 23 von 23 beim Endplan', zeilen.map(z => z.tore), [{ ok: 23, gesamt: 23, falsch: [] }, { ok: 23, gesamt: 23, falsch: [] }]);
  ist('Probe: Preise und Marge stehen im Kontaktbogen (Einstand = (EK + Fracht 4.20) × 0.82435, auf Rappen)', zeilen.map(z => [z.frachtUsd, z.einstandMin, z.preisMin]), [[4.2, 8.0, 14.9], [4.2, 6.1, 14.9]]);
  wahr('Probe: Marge mindestens 30 %', zeilen.every(z => z.margeMin >= 0.3));
  ist('Probe: Auswahl wird gebaut (Webcam Farbe 2; Lichterkette Farbe × Länge, «Warm White» wurde per KI übersetzt)', zeilen.map(z => z.optionen), ['Farbe 2', 'Farbe 2 × Länge 2']);
  ist('Probe: Punkte nach Preisliste: 3 Listen (150) + Baum (0, gemessen) + 2 Abfragen (20) + 2 Lagerabfragen (20) + 2 Frachten (20)', [W.punkte.remaining, 40000 - W.punkte.remaining], [39790, 210]);
  ist('Probe: Bericht nennt Start, Ende, eigene Aufrufe', [r.bericht.punkte.start, r.bericht.punkte.ende, r.bericht.punkte.eigene], [40000, 39790, 210]);
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




// >>> EINSCHUB PRUEFUNG-2710 (von spleisse.mjs)

// ═══════════════════════════ PRÜFUNG 27.10.2026, TEIL I: reine Funktionen ═══════════════════════════
// Jeder Fund der drei unabhängigen Prüfungen (Schnittstellen, Geld/Sicherheit, Qualität) hat hier oder im Lauf-Teil darunter einen Test, der auf dem alten Code rot war.

// ── Konfiguration: unsinnige Werte werfen (Geld F4/F13), neue Schalter
{
  const c = konfigAus({}, '/x');
  ist('Vorgaben: Fracht-Klassen 4, Lieferzeit 20 Tage, Bestand wird geprüft, Index mindestens 50 000 Produkte, Auswahl-Ledger höchstens 14 h alt', [c.frachtKlassen, c.maxTage, c.bestandPruefen, c.indexMin, c.auswahlLedgerMaxH], [4, 20, true, 50000, 14]);
  ist('BESTAND_PRUEFEN=0 schaltet die Lagerabfrage ab (nur zum Sparen im Trockenlauf)', konfigAus({ BESTAND_PRUEFEN: '0' }, '/x').bestandPruefen, false);
  wirft('AUFSCHLAG=1 wirft (Marge 2,5 %, Preis 28.90 bei Kosten 28.19 — gemessen)', () => konfigAus({ AUFSCHLAG: '1' }), /AUFSCHLAG/);
  wirft('AUFSCHLAG=1.1 wirft (Marge 11,6 %)', () => konfigAus({ AUFSCHLAG: '1.1' }), /AUFSCHLAG/);
  ist('AUFSCHLAG=1.34 (kleinste Marge 25,4 %) ist die Untergrenze und geht', konfigAus({ AUFSCHLAG: '1.34' }, '/x').aufschlag, 1.34);
  wirft('USD_CHF=0.5 wirft (unitCost 17.10 bei wahren Landekosten 28.19)', () => konfigAus({ USD_CHF: '0.5' }), /USD_CHF/);
  wirft('USD_CHF=1.5 wirft', () => konfigAus({ USD_CHF: '1.5' }), /USD_CHF/);
  wirft('GRIND_RESERVE=0 wirft (die Reserve schützt den Auswahl-Lauf)', () => konfigAus({ GRIND_RESERVE: '0' }), /GRIND_RESERVE/);
  wirft('TAGESLIMIT=50000 wirft (Shopify erlaubt 10 000 je 24 h)', () => konfigAus({ TAGESLIMIT: '50000' }), /TAGESLIMIT/);
  wirft('GESAMT_MAX=20000 wirft', () => konfigAus({ GESAMT_MAX: '20000' }), /GESAMT_MAX/);
  wirft('FRACHT_KLASSEN=0 wirft', () => konfigAus({ FRACHT_KLASSEN: '0' }), /FRACHT_KLASSEN/);
  wirft('FRACHT_KLASSEN=7 wirft (jede Klasse kostet 10 CJ-Punkte; höchstens 6 Messungen je Produkt)', () => konfigAus({ FRACHT_KLASSEN: '7' }), /FRACHT_KLASSEN/);
  ist('FRACHT_KLASSEN=6 und MAX_LIEFERTAGE=5/90 liegen noch in der Spanne', [konfigAus({ FRACHT_KLASSEN: '6' }).frachtKlassen, konfigAus({ MAX_LIEFERTAGE: '5' }).maxTage, konfigAus({ MAX_LIEFERTAGE: '90' }).maxTage], [6, 5, 90]);
  wirft('MAX_LIEFERTAGE=91 wirft (ein Lieferversprechen über 90 Tage ist keins)', () => konfigAus({ MAX_LIEFERTAGE: '91' }), /MAX_LIEFERTAGE/);
  ist('Handsicht-Schwelle ist 0,7 (gemessen: unter 0,7 nur 58 % exakt, ab 0,7 89,9 %)', VERTRAUEN_HAND, 0.7);
  wirft('MAX_LIEFERTAGE=2 wirft (kein Versand ist so schnell)', () => konfigAus({ MAX_LIEFERTAGE: '2' }), /MAX_LIEFERTAGE/);
  ist('F13: FREIGABE_DATEI wirkt nur mit GRIND2_TEST=1 (sonst genügte jede vorhandene Datei als «Freigabe»)', [konfigAus({ FREIGABE_DATEI: '/etc/hostname' }, '/x').pfade.freigabeDatei, konfigAus({ FREIGABE_DATEI: '/etc/hostname', GRIND2_TEST: '1' }, '/x').pfade.freigabeDatei], ['/x/dropship/GRIND2-FREI.txt', '/etc/hostname']);
}

// ── Preisurteil: hartes Margen- und Kurs-Tor
{
  const cfg = konfigAus({}, '/x');
  const p = (extra = {}) => ({ ok: true, varianten: [{ ok: true, kosten: 28 }], maxPreis: 40.9, margeMin: 0.311, flaggen: [], ...extra });
  ist('Marge 31,1 % geht durch', preisUrteil(p(), cfg).ok, true);
  ist('Marge genau 25 % geht durch, 24,9 % nicht (hartes Tor, Grenze scharf)', [preisUrteil(p({ margeMin: 0.25 }), cfg).ok, preisUrteil(p({ margeMin: 0.249 }), cfg).ok], [true, false]);
  ist('Marge 10 % (AUFSCHLAG=1.1) wird gesperrt, zurückgestellt', (r => [r.ok, r.frist, /Bruttomarge 10\.0 %/.test(r.grund)])(preisUrteil(p({ margeMin: 0.1 }), cfg)), [false, 'zurueckgestellt', true]);
  ist('Marge unlesbar (null/fehlt/NaN) gilt als zu klein — nie raten', [preisUrteil(p({ margeMin: null }), cfg).ok, preisUrteil(p({ margeMin: undefined }), cfg).ok, preisUrteil(p({ margeMin: NaN }), cfg).ok], [false, false, false]);
  ist('Flagge kurs_ungewoehnlich sperrt (Preise und unitCost wären falsch)', (r => [r.ok, /Kurs/.test(r.grund)])(preisUrteil(p({ flaggen: ['kurs_ungewoehnlich'] }), cfg)), [false, true]);
  ist('Flagge marge_unter_30 allein sperrt NICHT (sie warnt im Kontaktbogen; gesperrt wird unter 25 %)', preisUrteil(p({ margeMin: 0.27, flaggen: ['marge_unter_30'] }), cfg).ok, true);
  ist('Weggelassene Varianten (ok:false) zählen nicht beim Mindest-Einstand', preisUrteil(p({ varianten: [{ ok: false, kosten: 0.5 }, { ok: true, kosten: 28 }] }), cfg).ok, true);
  ist('Ohne eine einzige gültige Variante: nicht anlegen', preisUrteil(p({ varianten: [{ ok: false, kosten: 28 }] }), cfg).ok, false);
}

// ── Lagerbestand: je vid, nur das CN-Lager, unbekannt ist nie 0 (Schnittstellen 6)
{
  const inv = (vid, zeilen) => ({ vid, inventory: zeilen });
  const cn = n => ({ countryCode: 'CN', totalInventory: n, cjInventory: 0, factoryInventory: n });
  const a = { success: true, code: 200, data: { inventories: [], variantInventories: [inv('v1', [cn(500)]), inv('v2', [cn(0)]), inv('v3', [{ countryCode: 'DE', totalInventory: 80 }]), inv('v4', [cn(20), cn(30)]), inv('v5', [{ countryCode: 'CN', totalInventory: null }]), inv('v6', [{ countryCode: 'CN', totalInventory: '7' }]), { vid: 7, inventory: [cn(3)] }, inv('v8', 'kaputt')] } };
  const m = bestandJeVid(a);
  ist('bestandJeVid: CN-Bestand je vid; DE-Bestand zählt nicht; mehrere CN-Zeilen werden addiert; Textzahl geht', [m.get('v1'), m.get('v2'), m.get('v4'), m.get('v6')], [500, 0, 50, 7]);
  ist('bestandJeVid: ohne CN-Zeile, mit unlesbarer Zahl, mit Zahl als vid oder kaputter Liste fehlt die vid (unbekannt, nie 0)', [m.has('v3'), m.has('v5'), m.has(7), m.has('v8')], [false, false, false, false]);
  ist('bestandJeVid: unbekannte Form ergibt null (kein Urteil)', [bestandJeVid(null), bestandJeVid({ data: null }), bestandJeVid({ data: { variantInventories: 'x' } })], [null, null, null]);
  ist('bestandJeVid: eine fremde vid in der Antwort stört nicht (getInventoryByPid nennt mehr vids als product/query)', bestandJeVid({ data: { variantInventories: [inv('fremd', [cn(1)])] } }).get('fremd'), 1);
  const echt = '/tmp/grind2/raw/20_stock_getInventoryByPid.json';
  if (existsSync(echt)) { const e = bestandJeVid(JSON.parse(readFileSync(echt, 'utf8'))); ist('bestandJeVid gegen die ECHTE Rohantwort (26.10.2026): 9 vids, alle mit CN-Bestand', [e.size, [...e.values()].every(x => x > 0)], [9, true]); }
}

// ── Auswahl-Ledger: der jüngste Stand zählt (Geld F14)
{
  ist('ledgerNeuesterStand: jüngster Zeitstempel, unlesbare Zeilen zählen nicht', ledgerNeuesterStand('a · 2026-10-27T01:00:00.000Z · GESCHRIEBEN · 3 Varianten\nkaputt\nb · 2026-10-27T05:00:00.000Z · GESCHRIEBEN · 4 Varianten\nc · gestern · x'), Date.parse('2026-10-27T05:00:00.000Z'));
  ist('ledgerNeuesterStand: leer = 0', [ledgerNeuesterStand(''), ledgerNeuesterStand(null)], [0, 0]);
  const alt = 'x · 2026-10-26T12:08:00.000Z · GESCHRIEBEN · 88 Varianten', neu = 'x · 2026-10-27T06:07:00.000Z · GESCHRIEBEN · 4508 Varianten';
  const w = auswahlLedgerWaehlen([{ quelle: 'Arbeitsbaum', text: alt }, { quelle: 'Hauptrepo', text: neu }]);
  ist('auswahlLedgerWaehlen: der Hauptrepo-Stand (4 508 Varianten) schlägt den veralteten Arbeitsbaum (88)', [w.quelle, w.text === neu, w.alleQuellen.map(q => q.quelle)], ['Hauptrepo', true, ['Arbeitsbaum', 'Hauptrepo']]);
  ist('auswahlLedgerWaehlen: bei gleichem Stand gewinnt der längere Text, ohne Kandidaten bleibt ein leerer Stand', [auswahlLedgerWaehlen([{ quelle: 'a', text: alt }, { quelle: 'b', text: alt + '\n' }]).quelle, auswahlLedgerWaehlen([]).stand], ['b', 0]);
  ist('auswahlLedgerAndere: VARIANTEN_LEDGER_ALT (Komma-Liste), der eigene Pfad fällt heraus, kein git bei ausdrücklichem VARIANTEN_LEDGER', auswahlLedgerAndere({ VARIANTEN_LEDGER: '/a/led.txt', VARIANTEN_LEDGER_ALT: '/b/led.txt, /a/led.txt, /c/led.txt' }, '/wurzel'), ['/b/led.txt', '/c/led.txt']);
  ist('auswahlLedgerAndere: ohne Angaben und ohne git-Repo (Test) nichts', auswahlLedgerAndere({ GRIND2_TEST: '1' }, '/wurzel-ohne-git'), []);
}

// ── Live-Sammlungen (Qualität 1)
{
  const live = liveSortTags([{ ruleSet: { rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'sort-bueroelektronik' }] } }, { ruleSet: { rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'sort-x' }] } }, { ruleSet: { rules: [{ column: 'TITLE', relation: 'EQUALS', condition: 'sort-y' }] } }, { ruleSet: { rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'kein-sort-tag' }] } }, { ruleSet: null }, null]);
  ist('liveSortTags: nur Spalte TAG, Beziehung EQUALS und Präfix sort- zählen', [[...live], live.size], [['sort-bueroelektronik'], 1]);
  ist('liveSortTags: Spalte TAG mit anderer Beziehung (CONTAINS, STARTS_WITH, NOT_EQUALS) führt auf keine Kategorieseite und zählt nicht', [...liveSortTags([{ ruleSet: { rules: [{ column: 'TAG', relation: 'CONTAINS', condition: 'sort-z' }, { column: 'TAG', relation: 'STARTS_WITH', condition: 'sort-q' }, { column: 'TAG', relation: 'NOT_EQUALS', condition: 'sort-n' }] } }])], []);
  ist('hatLiveCollection: ein Tag mit Collection genügt; ohne eines nicht; leere Liste nicht', [hatLiveCollection(['sort-webcams-uebersetzer-rechner', 'sort-bueroelektronik'], live), hatLiveCollection(['sort-smartwatches', 'sort-smartwatches-anruf'], live), hatLiveCollection([], live)], [true, false, false]);
}

// ── Planversion (Qualität 9)
{
  const v1 = planVersion(['a', 'b']), v2 = planVersion(['a', 'c']);
  ist('planVersion/planGueltig: andere Inhalte = andere Version; Plan ohne oder mit alter Version ist ungültig', [v1 !== v2, planGueltig({ v: v1 }, v1), planGueltig({ v: v1 }, v2), planGueltig({}, v1), planGueltig(null, v1)], [true, true, false, false, false]);
  const c = konfigAus({}, '/x');
  ist('planSchluessel: gleiche Einstellungen = gleicher Schlüssel; Kurs, Aufschlag, Lieferzeit und Fracht-Klassen ändern ihn', [planSchluessel(c) === planSchluessel(konfigAus({}, '/y')), ...[{ USD_CHF: '0.9' }, { AUFSCHLAG: '1.6' }, { MAX_LIEFERTAGE: '12' }, { FRACHT_KLASSEN: '2' }, { MAX_PREIS: '60' }, { BESTAND_PRUEFEN: '0' }].map(e => planSchluessel(konfigAus(e, '/x')) !== planSchluessel(c))], [true, true, true, true, true, true, true]);
}

// ── Handprüfung: Kinder- und Babyware nie automatisch (Geld, offen)
{
  ist('HANDPRUEFUNG_ZIELE: Wickelunterlagen, 3D-Stifte, Kinderuhren, Motorradhelm-Headsets', Object.keys(HANDPRUEFUNG_ZIELE).sort(), ['3dstifte', 'kinderuhren', 'motorradheadset', 'wickelunterlagen']);
  ist('istHandpruefung: die vier Ziele, jedes Ziel mit Baby/Kind/Knopfzelle in Risiko oder Auflage; ein harmloses nicht', [istHandpruefung({ id: 'wickelunterlagen' }), istHandpruefung({ id: 'neu', risiko: 'Knopfzelle (Kinder-Sicherheit)' }), istHandpruefung({ id: 'neu', auflage: 'Alterskennzeichnung Kinderprodukt' }), istHandpruefung({ id: 'neu2', risiko: 'Babyprodukt' }), istHandpruefung({ id: 'webcams', risiko: 'Markenwettbewerb (Logitech)', auflage: 'ohne Funk (nur USB)' })], [true, true, true, true, false]);
  const l = { ziele: [{ id: 'wickelunterlagen', name: 'W', rang: 1, welle: '1', ziel: 45, luecke: 44, cj: '', cjSuche: 'x' }, { id: 'webcams', name: 'C', rang: 2, welle: '1', ziel: 45, luecke: 40, cj: '', cjSuche: 'y' }, { id: 'kinderuhren', name: 'K', rang: 3, welle: 'S (Saison jetzt)', ziel: 45, luecke: 20, cj: '', cjSuche: 'z', risiko: 'Knopfzelle (Kinder-Sicherheit)' }] };
  ist('Bedarf: Handprüfung-Ziele bekommen Welle R und kommen nie in die automatische Auswahl (auch nicht als Saison-Ziel)', bedarfAus(l).map(z => z.id), ['webcams']);
  ist('Bedarf: ausdrücklich gewählt bleibt es möglich (DRAFTs zur Handprüfung), mit Welle R', bedarfAus(l, { ziele: ['wickelunterlagen'] }).map(z => [z.id, z.welle]), [['wickelunterlagen', 'R']]);
}

// ── Sperre gegen zwei gleichzeitige LIVE-Läufe (Geld F6)
{
  const f = join(mkdtempSync(join(tmpdir(), 'lk-')), 'x.lock'), t0 = Date.now();
  ist('Sperre: der erste holt sie, der zweite nicht, nach 3 h gilt sie als Überrest eines abgestürzten Laufs', [sperreHolen(f, t0), sperreHolen(f, t0 + 1000), sperreHolen(f, t0 + 4 * 3600e3)], [true, false, true]);
  writeFileSync(f, 'kein json');
  ist('Sperre: eine unlesbare Sperrdatei gilt als Überrest', sperreHolen(f, t0), true);
  rmSync(dirname(f), { recursive: true, force: true });
}

// ── Zugangsdaten gehen nur an eine geprüfte Adresse (Schnittstellen 11)
{
  const anfragen = [];
  const spion = async (url, init) => { anfragen.push(String(url)); return antwort({ access_token: 'tok' }); };
  const env = { SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'geheim' };
  await wirftAsync('shopZugang: fremde Adresse wirft, BEVOR client_id/client_secret gesendet werden', () => shopZugang({}, spion, { ...env, SHOPIFY_SHOP: 'evil.example.com' }), /SHOPIFY_HOST/);
  await wirftAsync('shopZugang: myshopify.com mit Pfad/Zugangsdaten in der URL wirft', () => shopZugang({}, spion, { ...env, SHOPIFY_SHOP: 'https://user:pw@x.myshopify.com/' }), /SHOPIFY_HOST/);
  ist('shopZugang: nach den Fehlversuchen wurde NICHTS gesendet', anfragen.length, 0);
  await shopZugang({}, spion, { ...env, SHOPIFY_SHOP: 'https://Test-Shop.myshopify.com/' });
  ist('shopZugang: gültige Adresse (auch mit https:// und Grossschreibung) geht an den Token-Endpunkt der normalisierten Domain', anfragen, ['https://test-shop.myshopify.com/admin/oauth/access_token']);
  anfragen.length = 0;
  await shopZugang({ shopToken: 'tok', shop: 'a.myshopify.com' }, spion, env);
  ist('shopZugang: mit fertigem Token (Tests) kein Token-Aufruf', anfragen.length, 0);
}

// ── Handsicht-Hinweis im Lauf: ein Google-Pfad aus einer Handregel ohne Shop-Beleg (oder unter 70 %) steht mit Grund im Hinweis der Zeile; ein belegter Pfad (80 %) nicht
{
  const W = welt(standardSz(), { ZIELE: 'webcams,lichterketten', LIMIT: '4' });
  const r = await lauf(W.cfg, W.io);
  const z = Object.fromEntries(r.bericht.zeilen.map(x => [/Webcam/.test(x.titel) ? 'webcam' : 'kette', x]));
  ist('Handsicht: Webcam-Pfad aus Handregel ohne Shop-Beleg → Hinweis «von Hand ansehen» mit Grund', [z.webcam.googleSicherheit, z.webcam.vertrauen, /Google-Pfad von Hand ansehen \(Regel ohne Shop-Beleg\)/.test(z.webcam.hinweis || '')], ['titel', null, true]);
  ist('Handsicht: Lichterketten-Pfad mit Vertrauen 80 % → kein Hinweis, das Urteil bleibt PLAN', [z.kette.vertrauen, /Von Hand ansehen/i.test(z.kette.hinweis || ''), z.kette.entscheid], [0.8, false, 'PLAN: alle Tore bestanden']);
  W.weg();
}

// ── Kontaktbogen zeigt Fracht-Spanne, Vertrauen und Hinweise
{
  const md = kontaktbogen([{ titel: 'T', zielName: 'Z', blatt: 'B', frachtMin: 6.77, frachtUsd: 49.44, frachtLinie: 'CJPacket Ordinary VIP', preisMin: 14.9, preisMax: 63.9, margeMin: 0.31, varianten: 4, googleSicherheit: 'titel', vertrauen: 0.58, google: 'A > B', entscheid: 'PLAN', hinweis: '1 Variante ohne Bestand weggelassen' }], {});
  ist('Kontaktbogen: Fracht 6.77–49.44, Vertrauen 58 %, Hinweis hinter dem Entscheid', [md.includes('6.77–49.44'), md.includes('[titel 58 %]'), md.includes('PLAN — 1 Variante ohne Bestand weggelassen')], [true, true, true]);
}

// ── Vorfilter: Fremdstecker/110 V, Laser/Medizin/Pyro schon im englischen Namen (Geld F7/F8)
{
  ist('Sperrwort: Fremdstecker und 110 V im Namen', [sperrwort('Electric Heater 110V US Plug'), sperrwort('Hair Dryer 1800W AU Plug'), sperrwort('Wall Charger 65W GaN UK Plug')].map(x => /Fremdstecker/.test(x ?? '')), [true, true, true]);
  ist('Sperrwort: Laser-Taschenlampe, Blutdruckmessgerät, Hörgerät, Pulsoximeter, Pfefferspray, Feuerwerk', ['Tactical Flashlight with Laser', 'Blood Pressure Monitor Upper Arm', 'Rechargeable Hearing Aid', 'Fingertip Pulse Oximeter', 'Pepper Spray Keychain', 'Firework Smoke Bomb'].map(x => /heikel/.test(sperrwort(x) ?? '')), [true, true, true, true, true, true]);
  ist('Sperrwort: keine Fehlalarme (110-240V Weitbereich, Laser-Entfernungsmesser, Laser-Gravur, abnehmbar, Mediziner)', ['Travel Charger 110-240V', 'Laser Distance Meter 40m', 'Laser Engraver Machine', 'Removable Hip Bag', 'Doctor Costume'].map(x => sperrwort(x)), [null, null, null, null, null]);
}


// ═══════════════════════════ PRÜFUNG 27.10.2026, TEIL II: der ganze Lauf gegen das simulierte Netz ═══════════════════════════
const frei = W => writeFileSync(W.cfg.pfade.freigabeDatei, 'frei');
/** Anfrage abfangen: f(url, init, echt) liefert eine Antwort oder undefined (dann geht sie ans simulierte Netz). */
const mit = (W, f) => { const echt = W.io.fetch; W.io.fetch = async (u, init = {}) => { const r = await f(String(u), init, echt); return r === undefined ? echt(u, init) : r; }; };
const gqlText = init => { try { return JSON.parse(init.body).query || ''; } catch { return ''; } };
const gqlVars = init => { try { return JSON.parse(init.body).variables || {}; } catch { return {}; } };
const istGql = u => /graphql\.json/.test(u);
const invCn = (vid, n) => ({ vid, inventory: [{ countryCode: 'CN', totalInventory: n, cjInventory: 0, factoryInventory: n }] });
const linie = (name, preis, tage) => ({ logisticName: name, logisticPrice: preis, logisticAging: tage, totalPostageFee: preis });
const zeilenTypen = pfad => lesen(pfad).trim().split('\n').filter(Boolean).map(z => z.split(' · ')[2]);

// ── Schnittstellen 1: productSet-Tagesdrossel als HTTP 429 (die Doku) UND als «Daily variant creation limit» im GraphQL-Fehler → beides Exit 4, nie FEHLER-Zeilen
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  let versuche = 0;
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('productSet(')) { versuche++; return antwort({ errors: 'Too Many Requests' }, 429); } });
  const r = await lauf(W.cfg, W.io);
  ist('productSet bleibt bei HTTP 429: Exit 4 (Variantenlimit), der Lauf endet nach dem ersten Produkt', [r.exit, r.bericht.hinweise.some(h => /ABBRUCH.*Tageslimit/.test(h)), versuche > 0], [EXIT.VARIANTEN, true, true]);
  ist('...das ist kein Fehler des Produkts: weder FEHLER noch GESCHRIEBEN im Ledger (jedes Produkt einzeln zu verbuchen kostete je ~46 s Wartezeit)', [lesen(W.cfg.pfade.ledger).includes('FEHLER'), lesen(W.cfg.pfade.ledger).includes('GESCHRIEBEN'), r.bericht.zaehl.FEHLER ?? 0], [false, false, 0]);
  W.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('productSet(')) return antwort({ errors: [{ message: 'Daily variant creation limit reached. Try again in 24 hours.' }] }); });
  const r = await lauf(W.cfg, W.io);
  ist('productSet mit GraphQL-Fehler «Daily variant creation limit»: ebenfalls Exit 4', r.exit, EXIT.VARIANTEN);
  W.weg();
}
ist('VARIANTEN_LIMIT_RE und CJ_LAUF_RE erkennen die Fehlertexte, die der Lauf wirft', [VARIANTEN_LIMIT_RE.test('VARIANT_THROTTLE: HTTP 429 bleibt bestehen'), VARIANTEN_LIMIT_RE.test('Daily variant creation limit reached'), CJ_LAUF_RE.test('CJ_QUOTA: code=16900500 (query)'), CJ_LAUF_RE.test('CJ_THROTTLED: code=1600200 bleibt bestehen (liste)')], [true, true, true, true]);

// ── Schnittstellen 2: CJ-Drosselung (1600200) und leere Punkte (16900500) als HTTP-200-Antwort beenden den Lauf mit Exit 3, statt jedes Produkt zu einer FEHLER-Zeile zu machen
{
  const W = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  let n = 0;
  mit(W, async u => { if (/product\/query/.test(u)) { n++; return antwort({ code: 1600200, result: false, message: 'Too Many Requests', data: null, pointsInfo: { remaining: 39000 } }); } });
  const r = await lauf(W.cfg, W.io);
  ist('product/query mit code 1600200 (HTTP 200): Exit 3, höchstens ein Produkt als FEHLER verbucht, der Lauf wirft nicht', [r.exit, (r.bericht.zaehl.FEHLER ?? 0) <= 1, n >= 3], [EXIT.CJ, true, true]);
  W.weg();
}
{
  const W = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  mit(W, async u => { if (/product\/list/.test(u)) return antwort({ code: 1600200, result: false, message: 'Too Many Requests', data: null }); });
  const r = await lauf(W.cfg, W.io);
  ist('product/list mit code 1600200 (HTTP 200): Exit 3 statt Absturz', r.exit, EXIT.CJ);
  W.weg();
}
{
  const W = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  mit(W, async u => { if (/product\/list/.test(u)) return antwort({ code: 1600200, result: false, message: 'Too Many Requests' }, 429); });
  const r = await lauf(W.cfg, W.io);
  ist('product/list mit HTTP 429 dauerhaft: Exit 3', r.exit, EXIT.CJ);
  W.weg();
}
{
  const W = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  mit(W, async u => { if (/product\/query/.test(u)) return antwort({ code: 16900500, result: false, message: 'Quota gone', data: null }); });
  const r = await lauf(W.cfg, W.io);
  ist('Punkte leer als code 16900500 (ohne die Wörter «insufficient points» in der Meldung): Exit 3, kein FEHLER-Haufen', [r.exit, r.bericht.zaehl.FEHLER ?? 0], [EXIT.CJ, 0]);
  W.weg();
  const W2 = welt(standardSz(), { LIMIT: '4', ZIELE: 'webcams' });
  mit(W2, async u => { if (/freightCalculate/.test(u)) return antwort({ code: 16900500, result: false, message: 'Quota gone', data: null }); });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('...auch bei der Fracht-Abfrage: Exit 3', r2.exit, EXIT.CJ);
  W2.weg();
}

// ── Schnittstellen 3 / Geld F2, F3: ein Ausfall NACH dem Anlegen verliert das Produkt nicht und lässt kein ungeprüftes Produkt live
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('product(id:$id)')) return antwort({}, 500); });
  let fehler = null, r;
  try { r = await lauf(W.cfg, W.io); } catch (e) { fehler = e.message; }
  ist('Tore-Abfrage HTTP 500 nach productSet: der Lauf wirft nicht, geht mit dem nächsten Produkt weiter, beide stehen als GESCHRIEBEN im Ledger', [fehler, r?.exit, W.aus('productSet').length, zeilenTypen(W.cfg.pfade.ledger)], [null, 0, 2, ['GESCHRIEBEN', 'GESCHRIEBEN']]);
  ist('...beide bekommen im Freigabe-Ledger ein FEHLER und den Tag grind2-tor-fehler (kein Entwurf bleibt ohne Urteil)', [zeilenTypen(W.cfg.pfade.freigabeLedger), W.aus('tagsAdd').map(x => x.t[0]), r?.bericht.zaehl.TOR_AUSFALL], [['FEHLER', 'FEHLER'], ['grind2-tor-fehler', 'grind2-tor-fehler'], 2]);
  W.weg();
  const W2 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_FEHLER_FOLGE: '1' }); frei(W2);
  mit(W2, async (u, init) => { if (istGql(u) && gqlText(init).includes('product(id:$id)')) return antwort({}, 500); });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('...bei MAX_FEHLER_FOLGE=1 endet der Lauf nach dem ersten Ausfall mit Exit 1 (ein Dienst scheint auszufallen)', [r2.exit, W2.aus('productSet').length], [EXIT.FEHLER, 1]);
  W2.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('publishablePublish')) return antwort({}, 500); });
  let fehler = null, r;
  try { r = await lauf(W.cfg, W.io); } catch (e) { fehler = e.message; }
  ist('publishablePublish HTTP 500 nach ACTIVE: der Lauf wirft nicht, BEIDE Produkte stehen wieder auf DRAFT (kein ACTIVE ohne Kanal)', [fehler, [...W.shop.produkte.values()].map(s => s.status), r?.exit], [null, ['DRAFT', 'DRAFT'], 0]);
  ist('...das Freigabe-Ledger sagt ZURUECK (die Rücknahme ist bestätigt), nicht FREI', [zeilenTypen(W.cfg.pfade.freigabeLedger)], [['FREI', 'ZURUECK', 'FREI', 'ZURUECK']]);
  W.weg();
}

{
  // Das Tageslimit für neue Varianten meldet sich beim Lesen nach dem Anlegen: der Lauf endet mit Exit 4 (VARIANTEN), es ist kein «Tore nicht möglich»-Ausfall
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('product(id:$id)')) return antwort({ errors: [{ message: 'Daily variant creation limit reached' }] }); });
  const r = await lauf(W.cfg, W.io);
  ist('Tageslimit beim Lesen der Tore: Exit 4, nur EIN Produkt angelegt, kein TOR_AUSFALL', [r.exit, W.aus('productSet').length, r.bericht.zaehl.TOR_AUSFALL ?? 0], [EXIT.VARIANTEN, 1, 0]);
  W.weg();
}
{
  // Ausfälle nach dem Anlegen zählen IN FOLGE: Ausfall, Erfolg, Ausfall bei MAX_FEHLER_FOLGE=2 stoppt den Lauf nicht
  const sz = standardSz();
  // zwei weitere Webcams (eigene pid, SKU, vid, Bilder, Titel), damit ein Lauf drei Produkte anlegt
  const extra = n => {
    const w = webcam('200000000000000000' + n);
    w.productSku = 'CJTS765432' + n; w.productNameEn = `Pro ${n}K USB Webcam With Microphone For PC Laptop`;
    w.variants = w.variants.map((v, k) => ({ ...v, vid: `20000000000000003${n}${k}`, variantSku: `CJTS765432${n}0${k + 1}AZ`, variantImage: img(`w${n}v${k}`) }));
    w.bigImage = img(`w${n}1`); w.productImage = JSON.stringify([1, 2, 3, 4, 5].map(m => img(`w${n}${m}`)));
    sz.produkte[w.pid] = w; sz.titel[w.productNameEn] = `Pro ${n}K USB-Webcam mit Mikrofon`;
    return w;
  };
  sz.listen['suche:webcam'] = [...sz.listen['suche:webcam'], listeneintrag(extra(2)), listeneintrag(extra(3))];
  const lauf3 = async (fail) => {
    const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '6', PRO_ZIEL: '6', MAX_FEHLER_FOLGE: '2' }); frei(W);
    const reihe = new Map();
    mit(W, async (u, init) => {
      if (!(istGql(u) && gqlText(init).includes('product(id:$id)'))) return undefined;
      const id = gqlVars(init).id; if (!reihe.has(id)) reihe.set(id, reihe.size + 1);
      if (fail.includes(reihe.get(id))) return antwort({}, 500);
    });
    const r = await lauf(W.cfg, W.io);
    const aus = { exit: r.exit, angelegt: W.aus('productSet').length, ausfall: r.bericht.zaehl.TOR_AUSFALL ?? 0 };
    W.weg();
    return aus;
  };
  const a = await lauf3([1, 3]);
  ist('Ausfall, Erfolg, Ausfall (MAX_FEHLER_FOLGE=2): der Zähler wurde nach dem Erfolg zurückgesetzt, alle drei Produkte angelegt, Exit 0', [a.exit, a.angelegt, a.ausfall], [0, 3, 2]);
  const b = await lauf3([1, 2]);
  ist('Gegenprobe: zwei Ausfälle IN FOLGE stoppen den Lauf mit Exit 1 (ein Dienst scheint auszufallen)', [b.exit, b.ausfall], [EXIT.FEHLER, 2]);
}

// ── Geld F2 (Blocker): Netzfehler beim Lesen NACH dem Veröffentlichen → Rücknahme erzwungen
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  let reads = 0;
  // nur das Lesen der TORE (TORE_ABFRAGE trägt descriptionHtml) fällt aus; das Zurücklesen des Status bei der Rücknahme (STATUS_LESEN) geht durch
  mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('product(id:$id)') && gqlText(init).includes('descriptionHtml') && ++reads >= 2) throw new Error('fetch failed (simuliert)'); });
  let fehler = null, r;
  try { r = await lauf(W.cfg, W.io); } catch (e) { fehler = e.message; }
  ist('F2: Lesen der Tore nach dem Veröffentlichen scheitert dauerhaft: Lauf wirft nicht, das Produkt steht wieder auf DRAFT', [fehler, [...W.shop.produkte.values()].map(s => s.status)], [null, ['DRAFT']]);
  ist('F2: ZURUECK mit Grund «Fehler nach dem Aktivieren» im Freigabe-Ledger, Exit 0', [/ZURUECK · Fehler nach dem Aktivieren/.test(lesen(W.cfg.pfade.freigabeLedger)), r?.exit], [true, 0]);
  W.weg();
}
// ── Geld F3: scheitert die Rücknahme, steht «ZURUECK_FEHLGESCHLAGEN» im Ledger (nie «ZURUECK»), Exit 1, das nächste Produkt wird nicht mehr angefasst
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  mit(W, async (u, init) => { if (/luxestyle\.ch\/products/.test(u)) return new Response('x', { status: 404 }); if (istGql(u) && gqlText(init).includes('productUpdate') && gqlVars(init).p?.status === 'DRAFT') throw new Error('fetch failed (simuliert)'); });
  const r = await lauf(W.cfg, W.io);
  const fl = lesen(W.cfg.pfade.freigabeLedger);
  ist('F3: Rücknahme scheitert: Exit 1, Ledger ZURUECK_FEHLGESCHLAGEN (nicht ZURUECK), das zweite Produkt wird nicht mehr angelegt', [r.exit, /ZURUECK_FEHLGESCHLAGEN/.test(fl), / · ZURUECK · /.test(fl), W.aus('productSet').length], [EXIT.FEHLER, true, false, 1]);
  ist('F3: der Abbruchgrund nennt das Produkt, das live sein kann', r.bericht.hinweise.some(h => /ABBRUCH: Rücknahme von .* fehlgeschlagen.*LIVE/.test(h)), true);
  W.weg();
}
// ── Rücknahme mit userErrors zählt als gescheitert
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  mit(W, async (u, init) => { if (/luxestyle\.ch\/products/.test(u)) return new Response('x', { status: 404 }); if (istGql(u) && gqlText(init).includes('productUpdate') && gqlVars(init).p?.status === 'DRAFT') return antwort({ data: { productUpdate: { product: null, userErrors: [{ field: ['id'], message: 'gesperrt' }] } } }); });
  const r = await lauf(W.cfg, W.io);
  ist('Rücknahme mit userErrors: ebenfalls ZURUECK_FEHLGESCHLAGEN und Exit 1', [r.exit, /ZURUECK_FEHLGESCHLAGEN/.test(lesen(W.cfg.pfade.freigabeLedger))], [EXIT.FEHLER, true]);
  W.weg();
}

// ── Schnittstellen 4: Waisen abgestürzter Läufe
{
  const sz = standardSz();
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '2' }); frei(W);
  await lauf(W.cfg, W.io);
  const handle1 = W.aus('productSet')[0].handle;
  rmSync(W.cfg.pfade.ledger, { force: true }); rmSync(W.cfg.pfade.freigabeLedger, { force: true }); rmSync(W.cfg.pfade.planDir, { recursive: true, force: true });
  sz.titel[webcam().productNameEn] = 'USB-Webcam Full HD mit Mikrofon und Autofokus';       // die KI formuliert beim zweiten Lauf anders → anderer Handle
  const r2 = await lauf(W.cfg, W.io);
  ist('Waise (Absturz vor der Ledger-Zeile) mit ANDEREM Titel: übernommen statt 14 Tage als «Dublette» gesperrt, kein zweites productSet, kein zweites Produkt im Shop', [W.aus('productSet').length, W.shop.produkte.size, r2.bericht.zaehl.GESCHRIEBEN], [1, 1, 1]);
  ist('...das Ledger nennt den ECHTEN Handle des Shops (nicht den geplanten) und die Tore melden die Abweichung für die Handprüfung', [lesen(W.cfg.pfade.ledger).includes(handle1), (r2.bericht.zeilen[0].tore?.falsch || []).includes('titel'), (r2.bericht.zeilen[0].tore?.falsch || []).includes('handle'), r2.bericht.zaehl.TOR_FEHLER], [true, true, true, 1]);
  W.weg();
}
{
  const sz = standardSz();
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '2' }); frei(W);
  await lauf(W.cfg, W.io);
  rmSync(W.cfg.pfade.ledger, { force: true }); rmSync(W.cfg.pfade.freigabeLedger, { force: true }); rmSync(W.cfg.pfade.planDir, { recursive: true, force: true });
  const r2 = await lauf(W.cfg, W.io);
  ist('Waise mit GLEICHEM Titel: übernommen, alle Tore bestehen', [W.aus('productSet').length, r2.bericht.zaehl.GESCHRIEBEN, r2.bericht.zaehl.TOR_FEHLER ?? 0], [1, 1, 0]);
  W.weg();
}
{
  const sz = standardSz();
  const h = 'full-hd-usb-webcam-mit-mikrofon-000001';
  const halb = { id: 'gid://shopify/Product/777', handle: h, status: 'DRAFT', tags: ['grind2', 'cj-real'], variantsCount: { count: 1 } };
  sz.fremdSku = { CJTS123456701AZ: halb }; sz.vorhanden = { [h]: halb };
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '2' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('Halbes Produkt (1 von 2 Varianten, Lauf brach mitten im Produkt ab): NICHT als GESCHRIEBEN verbucht, FEHLER «halbes Produkt … von Hand prüfen», nichts neu angelegt', [r.bericht.zaehl.GESCHRIEBEN ?? 0, W.aus('productSet').length, /FEHLER · .*halbes Produkt/.test(lesen(W.cfg.pfade.ledger))], [0, 0, true]);
  W.weg();
}
{
  // Der erste productSet kam an, die Antwort ging verloren; die Wiederholung bekommt HANDLE_NOT_UNIQUE → das vorhandene eigene Produkt wird übernommen, nicht als Fehler verbucht
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  let erster = true;
  mit(W, async (u, init, echt) => {
    if (istGql(u) && gqlText(init).includes('productSet(') && erster) { erster = false; await echt(u, init); return antwort({ data: { productSet: { product: null, userErrors: [{ field: ['input', 'handle'], message: 'Handle already in use', code: 'HANDLE_NOT_UNIQUE' }] } } }); }
  });
  const r = await lauf(W.cfg, W.io);
  ist('HANDLE_NOT_UNIQUE nach einem Zeitfehler: das eigene Produkt wird übernommen (GESCHRIEBEN), nicht als FEHLER verbucht, kein zweites Produkt', [r.bericht.zaehl.GESCHRIEBEN, r.bericht.zaehl.FEHLER ?? 0, W.shop.produkte.size], [1, 0, 1]);
  W.weg();
  const W2 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W2);
  mit(W2, async (u, init) => { if (istGql(u) && gqlText(init).includes('productSet(')) return antwort({ data: { productSet: { product: null, userErrors: [{ field: ['input', 'handle'], message: 'Handle already in use', code: 'HANDLE_NOT_UNIQUE' }] } } }); });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('HANDLE_NOT_UNIQUE, aber der Handle gehört keinem eigenen Produkt: wird nicht übernommen, bleibt ein FEHLER', [r2.bericht.zaehl.GESCHRIEBEN ?? 0, r2.bericht.zaehl.FEHLER], [0, 1]);
  W2.weg();
}

{
  // Der Handle ist beim Anlegen noch frei (erste Abfrage leer), productSet meldet aber HANDLE_NOT_UNIQUE (jemand war schneller): die ZWEITE Abfrage entscheidet
  const h = 'full-hd-usb-webcam-mit-mikrofon-000001';
  const nicht = { data: { productSet: { product: null, userErrors: [{ field: ['input', 'handle'], message: 'Handle already in use', code: 'HANDLE_NOT_UNIQUE' }] } } };
  const fall = async (vorhanden) => {
    const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
    let abfragen = 0;
    mit(W, async (u, init) => {
      if (!istGql(u)) return undefined;
      const q = gqlText(init);
      if (q.includes('productByIdentifier') && ++abfragen >= 2) return antwort({ data: { productByIdentifier: vorhanden } });
      if (q.includes('productSet(')) return antwort(nicht);
    });
    const r = await lauf(W.cfg, W.io);
    const aus = { geschrieben: r.bericht.zaehl.GESCHRIEBEN ?? 0, fehler: r.bericht.zaehl.FEHLER ?? 0, uebersprungen: r.bericht.zaehl.UEBERSPRUNGEN ?? 0, ledger: lesen(W.cfg.pfade.ledger) };
    W.weg();
    return aus;
  };
  const fremd = await fall({ id: 'gid://shopify/Product/555', handle: h, status: 'ACTIVE', tags: ['dropship'], variantsCount: { count: 2 } });
  ist('HANDLE_NOT_UNIQUE, zweite Abfrage zeigt ein FREMDES Produkt (ohne Tag grind2): nie übernommen, UEBERSPRUNGEN «Handle belegt», nicht GESCHRIEBEN', [fremd.geschrieben, fremd.uebersprungen, /Handle .* belegt \(ACTIVE\)/.test(fremd.ledger)], [0, 1, true]);
  const halb = await fall({ id: 'gid://shopify/Product/556', handle: h, status: 'DRAFT', tags: ['grind2', 'cj-real'], variantsCount: { count: 1 } });
  ist('HANDLE_NOT_UNIQUE, zweite Abfrage zeigt ein HALBES eigenes Produkt (1 von 2 Varianten): FEHLER «halbes Produkt», nicht GESCHRIEBEN', [halb.geschrieben, halb.fehler, /halbes Produkt/.test(halb.ledger)], [0, 1, true]);
  const ganz = await fall({ id: 'gid://shopify/Product/557', handle: h, status: 'DRAFT', tags: ['grind2', 'cj-real'], variantsCount: { count: 2 } });
  ist('HANDLE_NOT_UNIQUE, zweite Abfrage zeigt ein VOLLSTÄNDIGES eigenes Produkt: übernommen (GESCHRIEBEN)', [ganz.geschrieben, ganz.fehler], [1, 0]);
}

// ── Schnittstellen 8: die Punkte-Reserve ist nie still wirkungslos
{
  const W = welt(standardSz(), { LIVE: '1', GRIND_RESERVE: '15000', LIMIT: '4', ZIELE: 'webcams,lichterketten' }); frei(W);
  mit(W, async (u, init, echt) => { if (!/developers\.cjdropshipping/.test(u)) return undefined; const r = await echt(u, init); const j = await r.json(); delete j.pointsInfo; return antwort(j); });
  const r = await lauf(W.cfg, W.io);
  ist('LIVE ohne pointsInfo.remaining: sofort Exit 3 (Reserve wäre wirkungslos), nur der kostenlose Einstellungsaufruf, nichts geschrieben', [r.exit, W.aus('cj').length, W.aus('productSet').length, r.bericht.hinweise.some(h => /pointsInfo\.remaining/.test(h))], [EXIT.CJ, 1, 0, true]);
  W.weg();
  const W2 = welt(standardSz(), { GRIND_RESERVE: '15000', LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  mit(W2, async (u, init, echt) => { if (!/developers\.cjdropshipping/.test(u)) return undefined; const r = await echt(u, init); const j = await r.json(); delete j.pointsInfo; return antwort(j); });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Trockenlauf ohne pointsInfo läuft weiter, meldet aber laut, dass die Reserve nicht greift', [r2.exit, r2.bericht.hinweise.some(h => /Reserve greift nicht/.test(h)), (r2.bericht.zaehl.PLAN ?? 0) > 0], [0, true, true]);
  W2.weg();
}

// ── Schnittstellen 5 + Qualität: Lieferzeit der Frachtlinie
{
  const sz = standardSz(); const w = webcam();
  sz.fracht = { [w.variants[0].vid]: [linie('CJPacket Eub', 3.1, '12-50'), linie('PostNL', 3.9, '15-45')], [w.variants[1].vid]: [linie('CJPacket Eub', 3.1, '12-50')] };
  const W = welt(sz, { LIMIT: '2', ZIELE: 'webcams' });
  const r = await lauf(W.cfg, W.io);
  ist('Nur langsame normale Linien (Eub 12–50, PostNL 15–45 Tage): zurückgestellt mit Grund Lieferzeit — früher «PLAN: alle Tore bestanden»', [r.bericht.zaehl, /höchstens 20 Tagen/.test(r.bericht.zeilen[0].entscheid), /zurueckgestellt/.test(r.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true, true]);
  W.weg();
  const sz2 = standardSz(); const w2 = webcam();
  const gemischt = [linie('CJPacket Eub', 3.1, '12-50'), linie('CJPacket Ordinary VIP', 5.0, '7-10'), linie('YunExpress Ordinary', 6.0, '8-15')];
  sz2.fracht = { [w2.variants[0].vid]: gemischt, [w2.variants[1].vid]: gemischt };
  const W2 = welt(sz2, { LIMIT: '2', ZIELE: 'webcams' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Gemischte Linien: gerechnet wird mit der günstigsten SCHNELLEN (5.00 statt 3.10), das Produkt wird geplant', [r2.bericht.zaehl, r2.bericht.zeilen[0].frachtUsd], [{ PLAN: 1 }, 5]);
  W2.weg();
  const W3 = welt(sz2, { LIMIT: '2', ZIELE: 'webcams', MAX_LIEFERTAGE: '9' });
  const r3 = await lauf(W3.cfg, W3.io);
  ist('MAX_LIEFERTAGE=9: nur 7–10 und 8–15 sind zu langsam → zurückgestellt (Grenze wirkt)', r3.bericht.zaehl, { UEBERSPRUNGEN: 1 });
  W3.weg();
}

// ── Qualität 2: Fracht je Gewichtsklasse (GEMESSEN 27.10.2026: 170 g 6.77 / 348 g 9.17 / 1386 g 21.59 / 3770 g 49.44 USD)
{
  const kamera = () => {
    const w = webcam(); w.productKeyEn = 'Color';
    const gew = [170, 348, 1386, 3770], ek = [1.74, 3.69, 12.0, 35.61], key = ['Black', 'White', 'Red', 'Blue'];
    w.variants = gew.map((g, i) => ({ vid: `20000000000000003${String(i).padStart(2, '0')}`, variantSku: `CJTS1234567${String(i + 1).padStart(2, '0')}KL`, variantKey: key[i], variantImage: img('kv' + i), variantWeight: g, variantSellPrice: ek[i] }));
    return w;
  };
  const szKlassen = () => {
    const sz = standardSz(), w = kamera(); sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
    const preis = [6.77, 9.17, 21.59, 49.44];
    sz.fracht = Object.fromEntries(w.variants.map((v, i) => [v.vid, [linie('CJPacket Ordinary VIP', preis[i], '7-10'), linie('CJPacket Eub', preis[i] - 1, '12-50')]]));
    return { sz, w };
  };
  const { sz, w } = szKlassen();
  const W = welt(sz, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0', MAX_PREIS: '1000' });
  const r = await lauf(W.cfg, W.io);
  const z = r.bericht.zeilen[0];
  ist('Vier Gewichtsklassen: vier Fracht-Aufrufe (40 Punkte), Fracht 6.77–49.44 im Bericht', [W.aus('fracht').length, z.frachtMin, z.frachtUsd, r.bericht.zaehl], [4, 6.77, 49.44, { PLAN: 1 }]);
  const e = JSON.parse(lesen(join(W.cfg.pfade.planDir, `${w.pid}.json`))).plan.eingabe;
  const preise = e.variants.map(v => Number(v.price)), kosten = e.variants.map(v => Number(v.inventoryItem.cost));
  ist('...jede Variante bekommt IHRE Fracht: die leichte Variante ist billig (unter 20 CHF), die schwere teuer, die Preise steigen mit dem Gewicht', [preise[0] < 20, preise[3] > 60, preise.every((p, i) => i === 0 || p > preise[i - 1])], [true, true, true]);
  ist('...die Kosten (unitCost) folgen derselben Fracht: (EK + Fracht) × Kurs', kosten.map((k, i) => Math.abs(k - (([1.74, 3.69, 12.0, 35.61][i] + [6.77, 9.17, 21.59, 49.44][i]) * 0.82435)) <= 0.011), [true, true, true, true]);
  W.weg();
  // Altes Verhalten zum Vergleich: FRACHT_KLASSEN=1 → eine Messung, die schwerste Fracht für alle (die leichte Variante wäre ein Mehrfaches teurer)
  const { sz: sz1 } = szKlassen();
  const W1 = welt(sz1, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0', FRACHT_KLASSEN: '1', MAX_PREIS: '1000' });
  const r1 = await lauf(W1.cfg, W1.io);
  ist('FRACHT_KLASSEN=1: eine Messung (10 Punkte) wie bisher, die schwerste Fracht gilt für alle (Preis der 170-g-Variante über 60 CHF)', [W1.aus('fracht').length, r1.bericht.zeilen[0].frachtMin ?? null, r1.bericht.zeilen[0].preisMin > 60], [1, 49.44, true]);
  W1.weg();
}
{
  // Varianten über der Preis-Obergrenze fallen weg, wenn mindestens zwei bleiben (früher: das ganze Produkt abgelehnt)
  const w = webcam(); w.variants = [170, 348, 1386, 3770].map((g, i) => ({ vid: `20000000000000004${String(i).padStart(2, '0')}`, variantSku: `CJTS1234567${String(i + 1).padStart(2, '0')}MN`, variantKey: ['Black', 'White', 'Red', 'Blue'][i], variantImage: img('mv' + i), variantWeight: g, variantSellPrice: [1.74, 3.69, 12.0, 35.61][i] }));
  const sz = standardSz(); sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
  const preis = [6.77, 9.17, 21.59, 49.44];
  sz.fracht = Object.fromEntries(w.variants.map((v, i) => [v.vid, [linie('CJPacket Ordinary VIP', preis[i], '7-10')]]));
  const W = welt(sz, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0', MAX_PREIS: '60' });
  const r = await lauf(W.cfg, W.io);
  const e = JSON.parse(lesen(join(W.cfg.pfade.planDir, `${w.pid}.json`))).plan.eingabe;
  ist('Obergrenze 60: die schwerste Variante (über 60 CHF) fällt weg, die drei anderen bleiben — das Produkt wird nicht komplett abgelehnt', [r.bericht.zaehl, e.variants.length, Math.max(...e.variants.map(v => Number(v.price))) <= 60, /über der Preisobergrenze/.test(r.bericht.zeilen[0].hinweis)], [{ PLAN: 1 }, 3, true, true]);
  W.weg();
  const W2 = welt(sz, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0', MAX_PREIS: '15' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Obergrenze 25: nur eine Variante bliebe — dann wird das ganze Produkt zurückgestellt (kein Einzelstück statt einer Auswahl)', [r2.bericht.zaehl, /Obergrenze/.test(r2.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true]);
  W2.weg();
  // Lieferzeit je Klasse: die schwerste Klasse hat nur langsame Linien → ihre Variante fällt weg, der Rest wird geplant
  const sz3 = standardSz(); sz3.produkte[w.pid] = w; sz3.listen['suche:webcam'] = [listeneintrag(w)];
  sz3.fracht = Object.fromEntries(w.variants.map((v, i) => [v.vid, i === 3 ? [linie('CJPacket Eub', 30, '12-50')] : [linie('CJPacket Ordinary VIP', preis[i], '7-10')]]));
  const W3 = welt(sz3, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0' });
  const r3 = await lauf(W3.cfg, W3.io);
  const e3 = JSON.parse(lesen(join(W3.cfg.pfade.planDir, `${w.pid}.json`))).plan.eingabe;
  ist('Klasse ohne schnelle Linie (3770 g nur Eub 12–50): diese Variante fällt weg, die drei leichteren werden geplant', [r3.bericht.zaehl, e3.variants.length, /ohne Versandlinie/.test(r3.bericht.zeilen[0].hinweis)], [{ PLAN: 1 }, 3, true]);
  W3.weg();
  // Eine leichtere Klasse kann nicht versendet werden (0 Linien): diese Variante fällt weg
  const sz4 = standardSz(); sz4.produkte[w.pid] = w; sz4.listen['suche:webcam'] = [listeneintrag(w)];
  sz4.fracht = Object.fromEntries(w.variants.map((v, i) => [v.vid, i === 0 ? 'leer' : [linie('CJPacket Ordinary VIP', preis[i], '7-10')]]));
  const W4 = welt(sz4, { LIMIT: '1', ZIELE: 'webcams', PLAN_TTL_H: '0', MAX_PREIS: '1000' });
  const r4 = await lauf(W4.cfg, W4.io);
  const e4 = JSON.parse(lesen(join(W4.cfg.pfade.planDir, `${w.pid}.json`))).plan.eingabe;
  ist('Leichteste Klasse ohne Versandlinie: nicht verkauft (nie raten), die schwereren bleiben', [r4.bericht.zaehl, e4.variants.length], [{ PLAN: 1 }, 3]);
  W4.weg();
}

// ── Schnittstellen 6: CJ-Lagerbestand (10 Punkte je Kandidat, GEMESSEN)
{
  const sz = standardSz(); const w = webcam(), l = lichterkette();
  sz.bestand = { [w.pid]: [invCn(w.variants[0].vid, 500), invCn(w.variants[1].vid, 0), invCn('FREMD-VID-000000', 99)], [l.pid]: l.variants.map(v => invCn(v.vid, 0)) };
  const W = welt(sz, { LIMIT: '4', ZIELE: 'webcams,lichterketten' });
  const r = await lauf(W.cfg, W.io);
  ist('Lager: Webcam eine Variante 0 → bleibt eine (planeNeu verlangt bei 2 CJ-Varianten mindestens 2: zurückgestellt); Lichterkette alle 0 → «kein Bestand bei CJ und Lieferant»', [r.bericht.zaehl, r.bericht.zeilen.map(z => /kein Bestand bei CJ/.test(z.entscheid))], [{ UEBERSPRUNGEN: 2 }, [false, true]]);
  ist('Lager: eine Bestandsabfrage je Kandidat (10 Punkte), gebucht als «bestand»', [W.aus('cj').filter(x => x.pfad === 'product/stock/getInventoryByPid').length, r.bericht.punkte.aufrufe.bestand], [2, 2]);
  W.weg();
  const sz2 = standardSz(); const l2 = lichterkette();
  sz2.bestand = { [l2.pid]: [invCn(l2.variants[0].vid, 0), invCn(l2.variants[1].vid, 80), invCn(l2.variants[2].vid, 80), invCn(l2.variants[3].vid, 80)] };
  const W2 = welt(sz2, { LIMIT: '4', ZIELE: 'lichterketten' });
  const r2 = await lauf(W2.cfg, W2.io);
  const e2 = JSON.parse(lesen(join(W2.cfg.pfade.planDir, `${l2.pid}.json`))).plan.eingabe;
  ist('Lager: bei 4 Varianten und einer mit Bestand 0 wird diese weggelassen (3 geplant, Hinweis im Bericht)', [r2.bericht.zaehl, e2.variants.length, /1 Variante\(n\) ohne Bestand weggelassen/.test(r2.bericht.zeilen[0].hinweis)], [{ PLAN: 1 }, 3, true]);
  ist('Lager: Bestand in DE hilft nicht — eine vid ohne CN-Zeile bleibt als «unbekannt» im Rennen', (() => { const m = bestandJeVid({ data: { variantInventories: [{ vid: 'a', inventory: [{ countryCode: 'DE', totalInventory: 50 }] }] } }); return m.has('a'); })(), false);
  W2.weg();
  const W3 = welt(sz, { LIMIT: '4', ZIELE: 'webcams,lichterketten', BESTAND_PRUEFEN: '0' });
  const r3 = await lauf(W3.cfg, W3.io);
  ist('BESTAND_PRUEFEN=0: keine Lagerabfrage, die Lichterkette mit Bestand 0 wird (wie früher) geplant', [W3.aus('cj').filter(x => x.pfad === 'product/stock/getInventoryByPid').length, r3.bericht.zaehl.PLAN], [0, 2]);
  W3.weg();
  // Die echte Antwort hat kein `result`-Feld: cjFetch lässt sie NUR mit der ausdrücklichen Angabe durch (die anderen Aufrufer bleiben streng)
  const W4 = welt(standardSz(), {});
  const c = cjClient({ token: 'cj', fetch: W4.io.fetch, warte: keineWarte, basisMs: 0, pauseMs: 0 });
  const b = await c.bestand(webcam().pid);
  ist('cjClient.bestand: die Antwort ohne «result» wird als Erfolg gelesen und kostet 10 Punkte', [b.success, b.code, c.z.punkte], [true, 200, 10]);
  W4.weg();
}

// ── Qualität 1: sort-Tag ohne Collection im Shop → zurückgestellt (die Seite wäre leer)
{
  const W = welt({ ...standardSz(), liveSort: ['sort-test-lichterketten'] }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('Live-Sammlungen: die Webcam trägt nur sort-Tags ohne Collection → zurückgestellt (kein productSet), die Lichterkette hat eine → angelegt', [r.bericht.zaehl, W.aus('productSet').length, /kein sort-Tag mit Collection im Shop/.test(r.bericht.zeilen.find(z => z.zielId === 'webcams').entscheid)], [{ UEBERSPRUNGEN: 1, PLAN: 1, GESCHRIEBEN: 1 }, 1, true]);
  ist('...genau EINMAL je Lauf gelesen (nur lesen), und im Ledger steht «zurückgestellt»', [W.aus('sammlungen').length, /zurückgestellt: kein sort-Tag mit Collection/.test(lesen(W.cfg.pfade.ledger))], [1, true]);
  W.weg();
  const W2 = welt({ ...standardSz(), liveSortSeiten: [['sort-a', 'sort-b'], ['sort-test-lichterketten']] }, { LIVE: '1', ZIELE: 'lichterketten', LIMIT: '4' }); frei(W2);
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Live-Sammlungen: mehrere Seiten werden gelesen (hasNextPage), das Tag der zweiten Seite zählt', [W2.aus('sammlungen').map(x => x.after), r2.bericht.zaehl.GESCHRIEBEN], [[null, 'cursor1'], 1]);
  W2.weg();
  const W3 = welt({ ...standardSz(), liveSort: [] }, { LIVE: '1', ZIELE: 'lichterketten', LIMIT: '4' }); frei(W3);
  let fehler = '';
  try { await lauf(W3.cfg, W3.io); } catch (e) { fehler = e.message; }
  ist('Live-Sammlungen: filtert im Shop KEINE Collection auf ein sort-Tag, bricht LIVE ab (nie auf einer leeren Menge entscheiden)', /SAMMLUNGEN/.test(fehler), true);
  W3.weg();
  // Trockenlauf: kein Shop-Zugriff; mit Datei wird das Tor geprüft, ohne Datei nur gemeldet
  const W4 = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1', LIVE_SORT_DATEI: join(tmpdir(), 'gibt-es-nicht-' + Date.now() + '.json') });
  const r4 = await lauf(W4.cfg, W4.io);
  ist('Trockenlauf ohne Datei: kein Shop-Zugriff, das Tor wird ausdrücklich als NICHT geprüft gemeldet', [W4.aus('sammlungen').length, r4.bericht.hinweise.some(h => /nicht bekannt.*NICHT geprüft/.test(h)), r4.bericht.zaehl], [0, true, { PLAN: 1 }]);
  W4.weg();
  const W5 = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  const datei = join(W5.dir, 'live_sort.json'); writeFileSync(datei, JSON.stringify(['sort-gibts-nicht']));
  W5.cfg.pfade.liveSort = datei;
  const r5 = await lauf(W5.cfg, W5.io);
  ist('Trockenlauf mit Datei der live filternden Tags: das Tor greift ohne Shop-Zugriff', [W5.aus('sammlungen').length, r5.bericht.zaehl], [0, { UEBERSPRUNGEN: 1 }]);
  W5.weg();
}
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  W.io.kategorienExtra = { kategorien: [], geladen: [], fehler: ['keine Bereichsdateien unter /x'] };
  let fehler = '';
  try { await lauf(W.cfg, W.io); } catch (e) { fehler = e.message; }
  ist('Bereichsdateien fehlen: LIVE bricht vor dem ersten Schreiben ab (sonst stellte der Lauf die meisten Kandidaten still als «keine passende Kategorie» zurück)', [/BEREICHE/.test(fehler), W.aus('productSet').length], [true, 0]);
  W.weg();
  const W2 = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  W2.io.kategorienExtra = { kategorien: [], geladen: [], fehler: ['keine Bereichsdateien unter /x'] };
  const r2 = await lauf(W2.cfg, W2.io);
  ist('...im Trockenlauf nur ein Hinweis', [r2.exit, r2.bericht.hinweise.some(h => /Probleme: keine Bereichsdateien/.test(h))], [0, true]);
  W2.weg();
}

// ── Qualität 9: der Plan-Zwischenspeicher hat einen Versionsschlüssel
{
  const W = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W.cfg, W.io);
  const q1 = W.aus('cj').filter(x => x.pfad === 'product/query').length, f1 = W.aus('fracht').length;
  await lauf(W.cfg, W.io);
  ist('Planversion: derselbe Plan derselben Version wird wiederverwendet (keine neue Fracht-Abfrage)', W.aus('fracht').length, f1);
  const datei = join(W.cfg.pfade.planDir, '2000000000000000001.json'), plan = JSON.parse(lesen(datei));
  ist('...der Plan trägt seine Version', typeof plan.v === 'string' && plan.v.length === 12, true);
  plan.v = 'alte-version'; writeFileSync(datei, JSON.stringify(plan));
  await lauf(W.cfg, W.io);
  ist('Planversion: ein Plan anderer Version (vor einer Korrektur) wird NICHT wiederverwendet, sondern neu gebaut (neue Fracht-Abfrage)', W.aus('fracht').length > f1, true);
  delete plan.v; writeFileSync(datei, JSON.stringify(plan));
  const f2 = W.aus('fracht').length;
  await lauf(W.cfg, W.io);
  ist('Planversion: ein Plan ohne Version (Altbestand) wird nicht wiederverwendet', W.aus('fracht').length > f2, true);
  W.weg();
  const W2 = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W2.cfg, W2.io);
  const f3 = W2.aus('fracht').length;
  W2.cfg.maxTage = 12;
  await lauf(W2.cfg, W2.io);
  ist('Planversion: ändert sich eine Einstellung im Plan (Lieferzeit), gilt der gespeicherte Plan nicht mehr', W2.aus('fracht').length > f3, true);
  W2.weg();
}

// ── Geld F14 / Hauptrepo: der Verbrauch des Auswahl-Laufs muss frisch sein
{
  const alt = new Date(Date.now() - 20 * 3600e3).toISOString(), neu = new Date(Date.now() - 2 * 3600e3).toISOString();
  const a = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1', AUSWAHL_LEDGER_MAX_H: '14' }); frei(a);
  writeFileSync(a.cfg.pfade.auswahlLedger, `ein-produkt · ${alt} · GESCHRIEBEN · 12 Varianten\n`);
  let msg = ''; try { await lauf(a.cfg, a.io); } catch (e) { msg = e.message; }
  ist('Auswahl-Ledger 20 h alt (erlaubt 14 h): LIVE bricht ab, bevor irgendetwas geschrieben wird', [/Auswahl-Ledger ist 20 h alt/.test(msg), a.aus('productSet').length], [true, 0]);
  a.weg();
  const b = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1', AUSWAHL_LEDGER_MAX_H: '14' }); frei(b);
  writeFileSync(b.cfg.pfade.auswahlLedger, `ein-produkt · ${neu} · GESCHRIEBEN · 12 Varianten\n`);
  const r = await lauf(b.cfg, b.io);
  ist('Auswahl-Ledger 2 h alt: LIVE läuft und zählt den Verbrauch (12) mit', [r.bericht.zaehl.GESCHRIEBEN, r.bericht.budget.auswahl], [1, 12]);
  b.weg();
  const c = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1', AUSWAHL_LEDGER_MAX_H: '14' });
  const r3 = await lauf(c.cfg, c.io);
  ist('Trockenlauf mit leerem Auswahl-Ledger: nur ein Hinweis', [r3.exit, r3.bericht.hinweise.some(h => /Auswahl-Ledger ist leer/.test(h))], [0, true]);
  c.weg();
  // Stand im Hauptrepo (VARIANTEN_LEDGER_ALT) ist frischer als der veraltete Arbeitsbaum → er zählt (4 508 Varianten statt 88)
  const d = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1', AUSWAHL_LEDGER_MAX_H: '14' }); frei(d);
  const haupt = join(d.dir, 'haupt-ledger.txt');
  writeFileSync(d.cfg.pfade.auswahlLedger, `ein-produkt · ${alt} · GESCHRIEBEN · 88 Varianten\n`);
  writeFileSync(haupt, `ein-produkt · ${neu} · GESCHRIEBEN · 8990 Varianten\n`);
  d.cfg.pfade.auswahlLedgerAlt = [haupt];
  const r4 = await lauf(d.cfg, d.io);
  ist('Hauptrepo-Ledger frischer als der Arbeitsbaum: LIVE läuft, der Verbrauch ist 8 990 (nicht 88), die Webcam (2 Varianten) passt gerade noch in die Gesamtgrenze 9 000 — Quelle im Bericht', [r4.bericht.budget.auswahl, r4.bericht.budget.frei, r4.bericht.auswahlLedger.quelle === haupt], [8990, 10, true]);
  d.weg();
}

// ── Geld F1: dieselbe pid in zwei Zielblättern wird nur einmal angelegt
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams,kameras2', LIMIT: '10' });
  const l = JSON.parse(lesen(W.cfg.pfade.bedarf)); l.ziele.push({ id: 'kameras2', name: 'Kameras 2', rang: 2, welle: '1', ziel: 60, luecke: 57, cj: '', cjSuche: 'webcam' }); writeFileSync(W.cfg.pfade.bedarf, JSON.stringify(l)); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('F1 dieselbe pid in zwei Zielblättern: ein productSet, eine GESCHRIEBEN-Zeile, kein Tor-Fehler-Tag auf dem veröffentlichten Produkt', [W.aus('productSet').length, zeilenTypen(W.cfg.pfade.ledger).filter(t => t === 'GESCHRIEBEN').length, W.aus('tagsAdd').length, r.bericht.zaehl.TOR_FEHLER ?? 0, r.bericht.zaehl.DOPPELT], [1, 1, 0, 0, 1]);
  W.weg();
}

// ── Handprüfung (Welle R): Kinder-/Babyware wird angelegt, wenn man sie ausdrücklich wählt, aber nie veröffentlicht
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' });
  const l = JSON.parse(lesen(W.cfg.pfade.bedarf)); l.ziele.find(z => z.id === 'webcams').risiko = 'Babyprodukt'; writeFileSync(W.cfg.pfade.bedarf, JSON.stringify(l)); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('Handprüfung: das Zielblatt mit Risiko «Babyprodukt» wird als DRAFT angelegt, die Tore laufen, aber trotz PUBLISH=1 wird NICHT veröffentlicht (kein ACTIVE, kein publishablePublish)', [r.bericht.zaehl.GESCHRIEBEN, W.aus('status').length, W.aus('publish').length, [...W.shop.produkte.values()].map(s => s.status), /Handprüfung/.test(r.bericht.zeilen[0].entscheid)], [1, 0, 0, ['DRAFT'], true]);
  W.weg();
  const W2 = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W2);
  const r2 = await lauf(W2.cfg, W2.io);
  ist('Gegenprobe: dasselbe Zielblatt ohne Risiko wird veröffentlicht', [r2.bericht.zaehl.VEROEFFENTLICHT, [...W2.shop.produkte.values()].map(s => s.status)], [1, ['ACTIVE']]);
  W2.weg();
}

// ── Geld F5/F6: unvollständiger Index, gleichzeitige Läufe
{
  const dir = mkdtempSync(join(tmpdir(), 'ix-')); mkdirSync(join(dir, 'led'));
  const mk = (z, meta) => { const f = join(dir, 's' + Math.random().toString(36).slice(2) + '.jsonl'); writeFileSync(f, z); writeFileSync(f + '.meta.json', JSON.stringify(meta)); return f; };
  const p1 = JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'a', title: 'Webcam', status: 'ACTIVE', skus: ['CJ-2000000000000000001'] }) + '\n', jetzt = new Date().toISOString();
  const frisch = (z, meta, min) => DB.istFrisch(DB.ladeIndex({ skusDatei: mk(z, meta), ledgerDir: join(dir, 'led'), mindestProdukte: min }).index, 24);
  ist('F5 Index: vollständig = frisch; vollstaendig:false, verwaiste Zeilen, kaputte Zeilen, leere Datei oder zu wenige Produkte = NICHT frisch', [frisch(p1, { stand: jetzt, vollstaendig: true }, 1), frisch(p1, { stand: jetzt, vollstaendig: false }, 1), frisch(p1, { stand: jetzt, vollstaendig: true, waisen: 4 }, 1), frisch(p1, { stand: jetzt, vollstaendig: true, kaputteZeilen: 3 }, 1), frisch('', { stand: jetzt, vollstaendig: true }, 1), frisch(p1, { stand: jetzt, vollstaendig: true }, 50000)], [true, false, false, false, false, false]);
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1', INDEX_MIN_PRODUKTE: '50000' }); frei(W);
  let msg = ''; try { await lauf(W.cfg, W.io); } catch (e) { msg = e.message; }
  ist('F5: LIVE mit zu kleinem Index bricht ab und nennt die Lücke', [/nicht frisch/.test(msg), /UNVOLLSTÄNDIG: nur 1 Produkte/.test(msg), W.aus('productSet').length], [true, true, 0]);
  W.weg(); rmSync(dir, { recursive: true, force: true });
}
{
  const A = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }), B = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  B.shop.produkte = A.shop.produkte; B.cfg.pfade.ledger = A.cfg.pfade.ledger; B.cfg.pfade.freigabeLedger = A.cfg.pfade.freigabeLedger;
  Object.defineProperty(B.shop, 'n', { get: () => A.shop.n, set: v => { A.shop.n = v; } }); frei(A); frei(B);
  const [ra, rb] = await Promise.allSettled([lauf(A.cfg, A.io), lauf(B.cfg, B.io)]);
  ist('F6: zwei LIVE-Läufe gleichzeitig auf demselben Ledger: nur EIN Produkt im Shop, der zweite wird abgewiesen', [A.shop.produkte.size, ra.status, rb.status, /SPERRE/.test(String(rb.reason?.message))], [1, 'fulfilled', 'rejected', true]);
  const r3 = await lauf(A.cfg, A.io).catch(e => e);
  ist('F6: nach dem Ende ist die Sperre frei (ein dritter Lauf wird nicht abgewiesen)', r3 instanceof Error && /SPERRE/.test(r3.message), false);
  A.weg(); B.weg();
}
{
  // L07 (Mutationsprobe): die Sperre hängt am LEDGER-Pfad — zwei LIVE-Läufe auf VERSCHIEDENEN Ledgern (eigene Welten) stören einander nicht
  const A = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }), B = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
  frei(A); frei(B);
  const [ra, rb] = await Promise.allSettled([lauf(A.cfg, A.io), lauf(B.cfg, B.io)]);
  ist('L07: zwei LIVE-Läufe gleichzeitig auf verschiedenen Ledgern laufen beide (je ein Produkt im eigenen Shop)', [ra.status, rb.status, A.shop.produkte.size, B.shop.produkte.size], ['fulfilled', 'fulfilled', 1, 1]);
  A.weg(); B.weg();
}
{
  // vor dem Aktivieren: eine SKU, die im Shop schon einem anderen Produkt gehört, verhindert das Veröffentlichen (Geld F6, Zweitnetz)
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  let n = 0;
  mit(W, async (u, init, echt) => {
    if (istGql(u) && gqlText(init).includes('products(first:3') && ++n === 2) return antwort({ data: { products: { nodes: [{ id: 'gid://shopify/Product/999', handle: 'anderes-produkt', status: 'ACTIVE', tags: [], variantsCount: { count: 2 } }] } } });
  });
  const r = await lauf(W.cfg, W.io);
  ist('Veröffentlichen: gehört die erste SKU im ganzen Shop auch einem anderen Produkt, wird NICHT aktiviert (Dublette)', [W.aus('status').length, [...W.shop.produkte.values()].map(s => s.status), /Dublette/.test(r.bericht.zeilen[0].entscheid)], [0, ['DRAFT'], true]);
  W.weg();
}

// ── Geld F9–F12: Handle-Tor, Ledger ohne Zeilenende, Gewicht, Links
{
  const E = { title: 'T', handle: 'webcam-000001', tags: [], productOptions: [], variants: [], files: [], metafields: [] };
  const t = toreNachAnlage(E, { status: 'DRAFT', title: 'T', handle: 'webcam-000001-1', tags: [], variantsCount: { count: 0 }, options: [], variants: { nodes: [] }, media: { nodes: [] } });
  ist('F9: Shopify hängt «-1» an den Handle (Kollision): das Tor «handle» schlägt an', t.tore.find(x => x.name === 'handle')?.ok, false);
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  mkdirSync(dirname(W.cfg.pfade.ledger), { recursive: true });
  writeFileSync(W.cfg.pfade.ledger, '1999999999999999999 · 2026-10-27T00:00:00.000Z · UEBERSPRUNGEN · alter Eintrag ohne Zeilenende');
  await lauf(W.cfg, W.io);
  ist('F10: ein Ledger ohne Zeilenende klebt die neue Zeile nicht an — zwei Zeilen, das Gedächtnis kennt die neue pid', [lesen(W.cfg.pfade.ledger).trim().split('\n').length, ledgerGedaechtnis(lesen(W.cfg.pfade.ledger), { jetzt: Date.now() + 1000 }).has('2000000000000000001')], [2, true]);
  W.weg();
  const sz = standardSz(), w = webcam(); w.variants.forEach(v => { v.variantWeight = 0; }); sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
  const W2 = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('F11: Gewicht 0 bei allen Varianten → zurückgestellt (Fracht nicht belastbar)', [r2.bericht.zaehl, /Gewicht bei 2 von 2 Varianten unbekannt: Fracht nicht belastbar/.test(r2.bericht.zeilen[0].entscheid), /zurueckgestellt/.test(r2.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true, true]);
  W2.weg();
  const roh = { daten: [{ label: 'Material', wert: 'ABS' }, { label: 'Hinweis', wert: 'Mehr auf www.evil-shop.example' }], lieferumfang: ['1 Webcam', 'Kontakt info@evil.example'], anleitung: [], hinweise: ['Bestellung unter https://evil.example/kaufen'] };
  const s = faktenSprachfilter(roh);
  ist('F12: Links und E-Mail-Adressen des Lieferanten fallen aus dem Fakten-Block', [s.daten.length, s.lieferumfang, s.hinweise], [1, ['1 Webcam'], []]);
  ist('F12: ein Titel mit Link wird abgelehnt', titelPruefen('Webcam www.evil-shop.example 1080p', { cjName: 'Webcam 1080p', quelle: 'Product name: Webcam 1080p' }).ok, false);
  ist('F12: Gegenprobe — «USB 2.0», «1.5 m», «3.6 mm» sind keine Domains', [faktenSprachfilter({ daten: [{ label: 'Anschluss', wert: 'USB 2.0' }, { label: 'Länge', wert: '1.5 m' }], lieferumfang: [], anleitung: [], hinweise: [] }).daten.length], [2]);
}

// ── Geld F7/F8 im Lauf: ein Laser-Pointer wird schon im Vorfilter abgelehnt (kostet keine Abfrage)
{
  const sz = standardSz(), w = webcam(); w.productNameEn = 'Tactical LED Flashlight With Laser Pointer Zoom'; sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('F8 im Lauf: Laser-Lampe wird im Vorfilter abgelehnt, ohne eine CJ-Abfrage zu bezahlen', [W.aus('cj').filter(x => x.pfad === 'product/query').length, r.bericht.vorfilter[0].abgelehnt], [0, { sperrwort: 1 }]);
  W.weg();
  const sz2 = standardSz(), w2 = webcam(); w2.productNameEn = 'Electric Heater 110V US Plug Mini Desktop Warmer'; sz2.produkte[w2.pid] = w2; sz2.listen['suche:webcam'] = [listeneintrag(w2)];
  const W2 = welt(sz2, { ZIELE: 'webcams', LIMIT: '1' });
  const r2 = await lauf(W2.cfg, W2.io);
  ist('F7 im Lauf: 110-V-Heizung mit US-Stecker wird im Vorfilter abgelehnt', [W2.aus('cj').filter(x => x.pfad === 'product/query').length, r2.bericht.vorfilter[0].abgelehnt], [0, { sperrwort: 1 }]);
  W2.weg();
}

// ── Schnittstellen 9: leere Kategorieliste ist ein Hinweis; Seite 2 der Liste, wenn Seite 1 verbraucht ist
{
  const sz = standardSz(); sz.listen = { 'suche:webcam': [], 'suche:string lights': [], 'suche:fairy lights': [], 'kategorie:CAT-STRING-LIGHTS': [] };
  const W = welt(sz, { LIMIT: '4', ZIELE: 'lichterketten' });
  const r = await lauf(W.cfg, W.io);
  ist('Leere Liste (veraltete Kategorie-ID): ein Hinweis «0 Treffer», nicht still «kein Bedarf»', [r.bericht.hinweise.some(h => /lieferte 0 Treffer/.test(h)), r.bericht.vorfilter.every(v => v.treffer === 0)], [true, true]);
  W.weg();
}
{
  // 20 Treffer auf Seite 1 (LISTE_GROESSE=20 = voll), alle schon im Shop → Seite 2 liefert den Kandidaten
  const w = webcam(), voll = Array.from({ length: 20 }, (_, i) => listeneintrag({ ...w, pid: `20000000000000009${String(i).padStart(2, '0')}`, productSku: `CJVOLL00000${i}` }));
  const sz = standardSz();
  const seitenListe = { 1: voll, 2: [listeneintrag(w)] };
  const W = welt(sz, { LIMIT: '1', ZIELE: 'webcams', LISTE_GROESSE: '20', SEITEN_MAX: '2' });
  W.io.index = baueIndex({ produkte: voll.map((t, i) => ({ id: `g${i}`, handle: `voll-${i}`, title: `Voll ${i}`, status: 'ACTIVE', skus: [`CJ-${t.pid}`] })) }, { stand: new Date().toISOString() });
  mit(W, async (u, init, echt) => {
    if (/product\/list/.test(u)) { const q = new URL(u).searchParams; const items = seitenListe[Number(q.get('pageNum'))] || []; W.log.push({ k: 'liste', seite: Number(q.get('pageNum')) }); W.punkte.remaining -= 50; return antwort({ code: 200, result: true, data: { pageNum: Number(q.get('pageNum')), pageSize: 20, total: 21, list: items }, pointsInfo: { total: 70171, usedToday: 1, remaining: W.punkte.remaining } }); }
  });
  const r = await lauf(W.cfg, W.io);
  ist('Seite 2: sind die 20 besten Treffer von Seite 1 durch Dubletten verbraucht und war die Seite voll, kommt Seite 2 (50 Punkte) und liefert den Kandidaten', [W.log.filter(x => x.k === 'liste').map(x => x.seite), r.bericht.zaehl.PLAN], [[1, 2], 1]);
  W.weg();
  const W2 = welt(standardSz(), { LIMIT: '1', ZIELE: 'webcams', LISTE_GROESSE: '20', SEITEN_MAX: '1' });
  W2.io.index = W.io.index;
  mit(W2, async (u, init) => { if (/product\/list/.test(u)) { const q = new URL(u).searchParams; W2.log.push({ k: 'liste', seite: Number(q.get('pageNum')) }); W2.punkte.remaining -= 50; return antwort({ code: 200, result: true, data: { pageNum: 1, pageSize: 20, total: 21, list: voll }, pointsInfo: { remaining: W2.punkte.remaining } }); } });
  await lauf(W2.cfg, W2.io);
  ist('SEITEN_MAX=1 begrenzt die Listenaufrufe je Zielblatt: keine Seite 2', W2.log.filter(x => x.k === 'liste').map(x => x.seite), [1]);
  W2.weg();
}

// ── Schnittstellen 7/11 im Lauf: eine Adresse, die kein Shop ist, bekommt nie die Zugangsdaten
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  W.io.shopToken = undefined; W.io.shop = undefined; W.io.env = { SHOPIFY_SHOP: 'evil.example.com', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'geheim' };
  let fehler = ''; try { await lauf(W.cfg, W.io); } catch (e) { fehler = e.message; }
  ist('LIVE mit fremder SHOPIFY_SHOP-Adresse: Abbruch ohne Token-Anfrage (client_secret geht nie an evil.example.com)', [/SHOPIFY_HOST/.test(fehler), W.aus('shop-token').length, W.aus('productSet').length], [true, 0, 0]);
  ist('...und noch VOR dem ersten CJ-Aufruf (kein Punkt und keine Fracht werden für einen Lauf bezahlt, der nicht schreiben kann)', [W.aus('cj').length, W.aus('liste').length, W.aus('fracht').length], [0, 0, 0]);
  W.weg();
}


// ═══════════════════════════ PRÜFUNG 27.10.2026, TEIL III: Tests der Geld-und-Sicherheit-Prüfung, die 26 von 39 grün gebliebenen Mutationen an Pflicht-Toren schliessen ═══════════════════════════
// (TA1–TA23 stammen aus neue_tests_A.mjs des Prüfers; jeder lief gegen den ursprünglichen Code grün und gegen den Mutanten rot.)
const abfangen = (W, f) => { const echt = W.io.fetch; W.io.fetch = async (url, init = {}) => { const b = init.body ? (() => { try { return JSON.parse(init.body); } catch { return {}; } })() : {}; const r = await f(String(url), b, init, echt); return r === undefined ? echt(url, init) : r; }; };
const json = (o, status = 200) => antwort(o, status);
const alleFracht = (c, modus) => Object.fromEntries(c.variants.map(v => [v.vid, modus]));
const jetztFest = Date.UTC(2026, 9, 27, 12);
// TA1 (S6) — Trockenlauf mit einem übersprungenen Kandidaten schreibt KEIN Ledger (die Ledger-Zeile würde den Kandidaten 14 Tage sperren)
{
  const sz = standardSz(); sz.fracht = alleFracht(webcam(), 'leer');
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('TA1 Trockenlauf: Kandidat ohne CH-Linie wird übersprungen …', r.bericht.zaehl, { UEBERSPRUNGEN: 1 });
  ist('TA1 … und es entsteht weder Ledger noch Freigabe-Ledger', [existsSync(W.cfg.pfade.ledger), existsSync(W.cfg.pfade.freigabeLedger)], [false, false]);
  W.weg();
}
// TA1b — dasselbe in der Probe
{
  const sz = standardSz(); sz.fracht = alleFracht(webcam(), 'leer');
  const W = welt(sz, { MODUS: 'probe', ZIELE: 'webcams', LIMIT: '1' });
  await lauf(W.cfg, W.io);
  ist('TA1b Probe: übersprungener Kandidat hinterlässt kein Ledger', existsSync(W.cfg.pfade.ledger), false);
  W.weg();
}
// TA2 (S7) — Freigabedatei zwischen zwei Kandidaten gelöscht: der nächste Kandidat wird nicht mehr abgefragt (spart CJ-Punkte)
{
  const sz = standardSz(); sz.fracht = alleFracht(webcam(), 'leer');
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  abfangen(W, async (u) => { if (/freightCalculate/.test(u) && existsSync(W.cfg.pfade.freigabeDatei)) unlinkSync(W.cfg.pfade.freigabeDatei); });
  await lauf(W.cfg, W.io);
  ist('TA2 Freigabedatei nach dem ersten (übersprungenen) Kandidaten gelöscht: nur eine Produktabfrage, kein productSet', [W.aus('cj').filter(x => x.pfad === 'product/query').length, W.aus('productSet').length], [1, 0]);
  W.weg();
}
// TA3 (S16, S17) — ein fremdes Produkt mit demselben Handle (ohne grind2-Tag) wird weder überschrieben, noch übernommen, noch mit Zahlsuffix daneben angelegt
{
  const h = handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001');
  const W = welt({ ...standardSz(), vorhanden: { [h]: { id: 'gid://shopify/Product/55', handle: h, status: 'ACTIVE', tags: ['cj-real'], variantsCount: { count: 3 } } } }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('TA3 Handle gehört einem fremden Produkt: kein productSet, keine Übernahme, UEBERSPRUNGEN', [W.aus('productSet').length, r.bericht.zaehl.GESCHRIEBEN ?? 0, r.bericht.zaehl.UEBERSPRUNGEN], [0, 0, 1]);
  ist('TA3 … im Ledger steht «Handle … belegt»', /UEBERSPRUNGEN · Handle .* belegt/.test(lesen(W.cfg.pfade.ledger)), true);
  W.weg();
}
// TA4 (S19) — «Daily variant creation limit» in den userErrors: Exit 4, kein FEHLER im Ledger
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  abfangen(W, async (u, b) => { if (/graphql/.test(u) && String(b.query).includes('productSet(')) return json({ data: { productSet: { product: null, userErrors: [{ field: ['input'], message: 'Daily variant creation limit reached. Try again in 24 hours.', code: 'VARIANT_THROTTLE_EXCEEDED' }] } } }); });
  const r = await lauf(W.cfg, W.io);
  ist('TA4 Tageslimit als userError: Exit 4 und genau ein Versuch', [r.exit, W.log.filter(x => x.k === 'tore').length], [EXIT.VARIANTEN, 0]);
  ist('TA4 … kein FEHLER im Ledger (kein Fehler des Produkts)', lesen(W.cfg.pfade.ledger).includes('FEHLER'), false);
  W.weg();
}
// TA5 (B11) — eigene Punktegrenze gilt auch für die Fracht: 50 (Liste) + 10 (Abfrage) passen, 20 für die Fracht nicht mehr
{
  const W = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1', PUNKTE_MAX: '70', GRIND_RESERVE: '5000' });
  const r = await lauf(W.cfg, W.io);
  ist('TA5 PUNKTE_MAX=70: Exit 3 und keine einzige Fracht-Abfrage', [r.exit, W.aus('fracht').length], [EXIT.CJ, 0]);
  W.weg();
}
// TA6 (B14) — Schreibfehler in Folge stoppen den Lauf
{
  const W = welt({ ...standardSz(), set: 'usererror' }, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_FEHLER_FOLGE: '1' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('TA6 MAX_FEHLER_FOLGE=1: nach dem ersten Schreibfehler Schluss (Exit 1, ein productSet)', [r.exit, W.aus('productSet').length], [EXIT.FEHLER, 1]);
  W.weg();
}
// TA7 (P5) — Preisurteil im Lauf: Preis über der Obergrenze → übersprungen
{
  const W = welt(standardSz(), { ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_PREIS: '10' });
  const r = await lauf(W.cfg, W.io);
  ist('TA7 MAX_PREIS=10: beide übersprungen, Grund «Obergrenze»', [r.bericht.zaehl, r.bericht.zeilen.every(z => /Obergrenze/.test(z.entscheid))], [{ UEBERSPRUNGEN: 2 }, true]);
  W.weg();
}
{
  const W = welt(standardSz(), { ZIELE: 'webcams,lichterketten', LIMIT: '4', MIN_EINSTAND_CHF: '50' });
  const r = await lauf(W.cfg, W.io);
  ist('TA7b MIN_EINSTAND_CHF=50: beide übersprungen, Grund «Einstand»', [r.bericht.zaehl, r.bericht.zeilen.every(z => /Einstand/.test(z.entscheid))], [{ UEBERSPRUNGEN: 2 }, true]);
  W.weg();
}
// TA8 (P8) — eine Variante mit unlesbarem Einkaufspreis lässt das ganze Produkt durchfallen (nicht still eine Variante weglassen)
{
  const sz = standardSz(); const l = lichterkette(); l.variants[2].variantSellPrice = 'abc'; sz.produkte[l.pid] = l; sz.listen['kategorie:CAT-STRING-LIGHTS'] = [listeneintrag(l)];
  const W = welt(sz, { ZIELE: 'lichterketten', LIMIT: '1' });
  const r = await lauf(W.cfg, W.io);
  ist('TA8 eine von vier Varianten ohne lesbaren Preis: Produkt übersprungen (Preis unbekannt)', [r.bericht.zaehl, /Preis unbekannt bei 1 von 4/.test(r.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true]);
  W.weg();
}
// TA9 (P12) — Dublette nur über eine Varianten-SKU (productSku passt nicht): im Lauf erkannt
{
  const sz = standardSz(); const w = webcam(); w.variants[0].variantSku = 'ALT777A'; w.variants[1].variantSku = 'ALT777B'; sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
  const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
  W.io.index = baueIndex({ produkte: [{ id: 'gid://shopify/Product/70', handle: 'altes-kamerapaket-777', title: 'Altes Kamerapaket', status: 'ACTIVE', skus: ['ALT777A', 'ALT777B'] }] }, { stand: new Date().toISOString() });
  const r = await lauf(W.cfg, W.io);
  ist('TA9 Varianten-SKU steht schon im Shop: Dublette, und zwar VOR dem Titel (kein KI-Aufruf)', [r.bericht.zaehl, /Dublette/.test(r.bericht.zeilen[0].entscheid), /variantSku|Varianten-SKUs/.test(r.bericht.zeilen[0].entscheid), W.aus('ki').length], [{ UEBERSPRUNGEN: 1 }, true, true, 0]);
  W.weg();
}
// TA10 (P13) — Dublette nur über den Handle (anderer pid, andere SKUs, anderer Titel im Shop)
{
  const h = handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001');
  const W = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
  W.io.index = baueIndex({ produkte: [{ id: 'gid://shopify/Product/71', handle: h, title: 'Etwas ganz anderes', status: 'DRAFT', skus: ['XYZ-1'] }] }, { stand: new Date().toISOString() });
  const r = await lauf(W.cfg, W.io);
  ist('TA10 Handle gehört schon einem Shop-Produkt: Dublette', [r.bericht.zaehl, /Dublette: Handle/.test(r.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true]);
  W.weg();
}
// TA11 (P19) — Saisonware nur im DEUTSCHEN Titel erkennbar (der englische CJ-Name nennt das Fest nicht)
{
  const sz = standardSz(); sz.titel = { ...sz.titel, [lichterkette().productNameEn]: 'Halloween-Lichterkette für den Garten' };
  const W = welt(sz, { ZIELE: 'lichterketten', LIMIT: '1' });
  W.io.jetzt = () => jetztFest; W.io.index = baueIndex({ produkte: [] }, { stand: new Date(jetztFest - 3600e3).toISOString() });
  const r = await lauf(W.cfg, W.io);
  ist('TA11 «Halloween» im deutschen Titel im Oktober: übersprungen', [r.bericht.zaehl, /Saisonware Halloween/.test(r.bericht.zeilen[0].entscheid)], [{ UEBERSPRUNGEN: 1 }, true]);
  W.weg();
}
// TA12 (E1) — weniger als 3 Referenzprodukte: nicht veröffentlichen, nicht abstürzen
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  abfangen(W, async (u, b) => { if (/graphql/.test(u) && String(b.query).includes('sortKey:CREATED_AT')) return json({ data: { products: { nodes: [{ id: 'r0', resourcePublicationsV2: { nodes: [{ isPublished: true, publication: { id: 'gid://P1' } }] } }, { id: 'r1', resourcePublicationsV2: { nodes: [{ isPublished: true, publication: { id: 'gid://P1' } }] } }] } } }); });
  const r = await lauf(W.cfg, W.io);
  ist('TA12 zwei Referenzprodukte: nicht veröffentlicht, Produkt bleibt DRAFT, Lauf endet ohne Absturz', [r.bericht.zaehl.VEROEFFENTLICHT ?? 0, [...W.shop.produkte.values()].map(s => s.status), W.aus('status').length], [0, ['DRAFT'], 0]);
  ist('TA12 ...und der Grund ist die fehlende Kanalliste (NICHT_VEROEFFENTLICHT), kein Absturz in der Kanalabfrage (FEHLER «vor dem Aktivieren»)', [/NICHT_VEROEFFENTLICHT: Kanalliste aus den Referenzprodukten nicht ableitbar/.test(r.bericht.zeilen[0].entscheid), /Veröffentlichen vor dem Aktivieren/.test(r.bericht.zeilen[0].entscheid)], [true, false]);
  W.weg();
}
// TA12b (E2) — ein Sperr-Tag (hier über ein Kategorie-Tag «adult») stoppt schon den PLAN (Tor sperrwoerter): nichts wird angelegt. Die zweite Sperre in veroeffentlichen() ist damit nur Absicherung
// (nicht erreichbar, solange das Tor sperrwoerter gilt) und per Test nicht auslösbar.
{
  const kat = { kategorien: [{ tag: 'sort-test-adult-lichterketten', passt: pr => /lichterkette/i.test(pr.title) }], geladen: ['test'], fehler: [] };
  const W = welt({ ...standardSz(), kategorienExtra: kat, liveSort: ['sort-test-adult-lichterketten'] }, { LIVE: '1', PUBLISH: '1', ZIELE: 'lichterketten', LIMIT: '1' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('TA12b Sperr-Tag im Kategorie-Tag: Tor sperrwoerter fällt, NICHTS wird angelegt oder veröffentlicht', [r.bericht.zaehl.UEBERSPRUNGEN, W.aus('productSet').length, /Sperrtag: sort-test-adult-lichterketten/.test(r.bericht.zeilen[0].entscheid)], [1, 0, true]);
  W.weg();
  const W2 = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'lichterketten', LIMIT: '1' }); frei(W2);
  const r2 = await lauf(W2.cfg, W2.io);
  ist('TA12b Gegenprobe: ohne Sperr-Tag wird veröffentlicht', [r2.bericht.zaehl.VEROEFFENTLICHT ?? 0, [...W2.shop.produkte.values()].map(s => s.status)], [1, ['ACTIVE']]);
  W2.weg();
}
// TA13 (E3) — die Tore NACH dem Veröffentlichen entscheiden: fehlt der Kanal, geht das Produkt zurück auf DRAFT
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  let reads = 0;
  abfangen(W, async (u, b, init, echt) => { if (/graphql/.test(u) && String(b.query).includes('product(id:$id)') && ++reads === 2) { const r = await echt(u, init); const j = await r.json(); j.data.product.resourcePublicationsV2.nodes = []; return json(j); } });
  const r = await lauf(W.cfg, W.io);
  ist('TA13 Kanal fehlt nach dem Veröffentlichen: zurück auf DRAFT, ZURUECK im Freigabe-Ledger', [r.bericht.zaehl.VEROEFFENTLICHT ?? 0, [...W.shop.produkte.values()].map(s => s.status), lesen(W.cfg.pfade.freigabeLedger).includes(' · ZURUECK · ')], [0, ['DRAFT'], true]);
  W.weg();
}
// TA14 (K6, K10, K11, K14) — Vorgaben und Grenzen der Konfiguration
{
  const c = konfigAus({}, '/x');
  ist('TA14 Vorgaben: MAX_VARIANTEN 40, PUBLISH_MAX 5, MIN_BILDER 3, LIMIT 10, MAX_PREIS 80, Reserve 15000', [c.maxVarianten, c.publishMax, c.minBilder, c.limit, c.maxPreis, c.reserve], [40, 5, 3, 10, 80, 15000]);
  wirft('TA14 MIN_BILDER=0 wirft', () => konfigAus({ MIN_BILDER: '0' }), /MIN_BILDER/);
  wirft('TA14 USD_CHF=0.01 wirft (unsinniger Kurs)', () => konfigAus({ USD_CHF: '0.01' }), /USD_CHF/);
  wirft('TA14 USD_CHF=100 wirft', () => konfigAus({ USD_CHF: '100' }), /USD_CHF/);
}
// TA15 (N21) — LIMIT begrenzt auch die teuren Listenaufrufe (50 Punkte je Aufruf)
{
  const W = welt(standardSz(), { ZIELE: 'webcams,lichterketten', LIMIT: '1' });
  await lauf(W.cfg, W.io);
  ist('TA15 LIMIT=1: das zweite Zielblatt wird gar nicht erst gelistet', W.aus('liste').map(x => x.key), ['suche:webcam']);
  W.weg();
}
// TA16 (N5) — ein ausdrücklich genanntes Ziel ohne Restbedarf bleibt draussen
{
  const bed = bedarfAus({ ziele: [{ id: 'voll', name: 'V', rang: 1, welle: '1', ziel: 30, luecke: 5, cj: '', cjSuche: 'v' }] }, { ziele: ['voll'], geschrieben: new Map([['voll', 5]]) });
  ist('TA16 genanntes, erfülltes Ziel: kein Bedarf', bed.length, 0);
}
// TA17 (N8) — Anführungszeichen in einer SKU zerstören die SKU-Abfrage nicht
{
  const sz = standardSz(); const w = webcam(); w.variants[0].variantSku = 'CJTS"X01AZ'; sz.produkte[w.pid] = w; sz.listen['suche:webcam'] = [listeneintrag(w)];
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  await lauf(W.cfg, W.io);
  ist('TA17 SKU mit «"»: maskiert in der Abfrage', W.aus('sku-abfrage')[0]?.q, 'sku:"CJTS\\"X01AZ"');
  W.weg();
}
// TA18 (B1) — Variantenbudget aufgebraucht: gar nicht erst prüfen (keine CJ-Punkte für Kandidaten, die nicht geschrieben werden dürfen)
{
  const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4' }); frei(W);
  writeFileSync(W.cfg.pfade.auswahlLedger, `ein-produkt · ${new Date().toISOString()} · GESCHRIEBEN · 9500 Varianten\n`);
  const r = await lauf(W.cfg, W.io);
  ist('TA18 Auswahl-Lauf hat das Tagesbudget aufgebraucht: Exit 4, keine Produktabfrage, nichts geschrieben', [r.exit, W.aus('cj').filter(x => x.pfad === 'product/query').length, W.aus('productSet').length], [EXIT.VARIANTEN, 0, 0]);
  W.weg();
}
// TA19 (B14) — Prüffehler in Folge (hier: CJ antwortet mit HTML) stoppen den Lauf
{
  const W = welt(standardSz(), { ZIELE: 'webcams,lichterketten', LIMIT: '4', MAX_FEHLER_FOLGE: '1' });
  abfangen(W, async (u) => { if (/product\/query/.test(u)) return new Response('<html>Wartung</html>', { status: 200 }); });
  const r = await lauf(W.cfg, W.io);
  ist('TA19 MAX_FEHLER_FOLGE=1: nach dem ersten Prüffehler Exit 1', [r.exit, r.bericht.zaehl.FEHLER], [EXIT.FEHLER, 1]);
  W.weg();
}
// TA20 (N15) — ACTIVE-Setzen scheitert (userErrors): nicht veröffentlichen
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  abfangen(W, async (u, b) => { if (/graphql/.test(u) && String(b.query).includes('productUpdate')) return json({ data: { productUpdate: { product: null, userErrors: [{ field: ['id'], message: 'kann nicht aktiviert werden' }] } } }); });
  const r = await lauf(W.cfg, W.io);
  ist('TA20 ACTIVE scheitert: kein publishablePublish, Produkt bleibt DRAFT', [W.aus('publish').length, [...W.shop.produkte.values()].map(x => x.status), r.bericht.zaehl.VEROEFFENTLICHT ?? 0], [0, ['DRAFT'], 0]);
  W.weg();
}
// TA21 (N16) — publishablePublish scheitert (userErrors): sofort zurück auf DRAFT, Grund im Ledger
{
  const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
  abfangen(W, async (u, b) => { if (/graphql/.test(u) && String(b.query).includes('publishablePublish')) return json({ data: { publishablePublish: { userErrors: [{ field: ['id'], message: 'Kanal gesperrt' }] } } }); });
  await lauf(W.cfg, W.io);
  ist('TA21 publishablePublish scheitert: DRAFT, ZURUECK mit Grund publishablePublish', [[...W.shop.produkte.values()].map(x => x.status), /ZURUECK · publishablePublish/.test(lesen(W.cfg.pfade.freigabeLedger))], [['DRAFT'], true]);
  W.weg();
}
// TA22 (N18) — Übernahme eines Produkts mit mehr Varianten als geplant belastet das Budget mit der echten Zahl
{
  const h = handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001');
  const sz = standardSz(); sz.vorhanden = { [h]: { id: 'gid://shopify/Product/77', handle: h, status: 'DRAFT', tags: ['grind2', 'cj-real'], variantsCount: { count: 48 } } };
  const W = welt(sz, { LIVE: '1', ZIELE: 'webcams,lichterketten', LIMIT: '4', GESAMT_MAX: '50' }); frei(W);
  const r = await lauf(W.cfg, W.io);
  ist('TA22 Übernahme mit 48 Varianten verbraucht das Budget (50): die Lichterkette (4 Varianten) passt nicht mehr', [r.bericht.zaehl.BUDGET ?? 0, W.aus('productSet').length], [1, 0]);
  W.weg();
}
// TA23 (H23) — mehr als 250 Medien (Shopify-Grenze) lassen den Plan durchfallen
{
  const P = PL, { TAXONOMIE } = await import('./lib/grind_google.mjs');
  const w = webcam(); w.productImage = JSON.stringify(Array.from({ length: 260 }, (_, i) => `https://cf.cjdropshipping.com/test/g${i}.jpg`));
  const r = P.planeNeu(w, { titel: 'USB-Webcam mit Mikrofon', googlePfad: 'Cameras & Optics > Cameras > Webcams', googleVokabular: TAXONOMIE, tags: [], preis: () => ({ preis: 19.9, kosten: 9 }) });
  ist('TA23 260 Galeriebilder (+ Variantenbilder) > 250 Medien: Plan lehnt ab', [r.ok, r.tore.find(x => x.name === 'varianten-bilder')?.ok], [false, false]);
}

// ═══════════════════════════ GEGENLESUNG 27.10.2026, RUNDE 2 («Geld und Tore», «CJ und Shopify gegen die Wirklichkeit»): die eingearbeiteten Funde ═══════════════════════════
// Jeder Test lief auf dem Stand VOR der Einarbeitung rot (Mutationsprobe in der Übergabe). Die Szenarien stammen aus den Prüfungen der beiden Gegenleser (S1–S9, B1–B7).
{
  const AUTO = dirname(fileURLToPath(import.meta.url)), ROOT = dirname(AUTO), rel = f => relative(ROOT, f);
  const planVon = W => JSON.parse(lesen(join(W.cfg.pfade.planDir, '2000000000000000001.json'))).plan;
  const typen = pfad => lesen(pfad).trim().split('\n').filter(Boolean).map(z => z.split(' · ')[2]);

  // ── 1. Der Plan-Zwischenspeicher aus Probe/Trockenlauf umgeht in LIVE weder das Tor «sort-Tag mit Collection» noch die Sperrlisten-Dateien
  {
    const W = welt({ ...standardSz(), liveSort: ['sort-gibt-es-nicht-xyz'] }, { MODUS: 'probe', ZIELE: 'webcams', LIMIT: '1', LIVE_SORT_DATEI: '/nix/da/live.json' });
    const r1 = await lauf(W.cfg, W.io);       // die Probe liest die Live-Collections nicht («Live-Sammlungen nicht bekannt»): das Tor ist dort nur ein Hinweis, der Plan wird gespeichert
    ist('S1 Probe: ein Plan liegt im Zwischenspeicher, das Tor «sort-Tag mit Collection» war nicht geprüft', [r1.bericht.zaehl, existsSync(join(W.cfg.pfade.planDir, '2000000000000000001.json')), r1.bericht.hinweise.some(h => /NICHT geprüft/.test(h))], [{ PLAN: 1 }, true, true]);
    const meldungen = [];
    frei(W);
    const r2 = await lauf({ ...W.cfg, modus: 'lauf', live: true, publish: true }, { ...W.io, log: m => meldungen.push(String(m)) });
    ist('S1/S1c LIVE+PUBLISH innerhalb der 3 Stunden: der gespeicherte Plan wird NICHT verwendet — das Tor greift (kein productSet, kein ACTIVE, zurückgestellt)', [W.aus('productSet').length, W.aus('status').length, r2.bericht.zaehl, /kein sort-Tag mit Collection im Shop/.test(r2.bericht.zeilen[0].entscheid)], [0, 0, { UEBERSPRUNGEN: 1 }, true]);
    ist('...der Plan wurde in LIVE frisch gebaut: keine Meldung «Plan aus dem Zwischenspeicher», sondern die Tore liefen neu', [meldungen.some(m => /Plan aus dem Zwischenspeicher/.test(m)), W.aus('sammlungen').length >= 1], [false, true]);
    W.weg();
    // Gegenprobe: gespeicherte Pläne bleiben im Trockenlauf eine Abkürzung (der Test «Trockenlauf wiederholt» oben hält das fest); eine gespeicherte ABLEHNUNG darf auch LIVE benutzt werden
    const sz = standardSz(); sz.fracht = { [webcam().variants[0].vid]: 'leer', [webcam().variants[1].vid]: 'leer' };
    const W3 = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
    await lauf(W3.cfg, W3.io);
    const q3 = W3.aus('cj').filter(x => x.pfad === 'product/query').length; frei(W3);
    const r3 = await lauf({ ...W3.cfg, live: true }, W3.io);
    ist('Gegenprobe: eine gespeicherte ABLEHNUNG (nicht lieferbar) gilt auch in LIVE ohne neue Abfrage (sie liegt immer auf der sicheren Seite)', [r3.bericht.zaehl, W3.aus('cj').filter(x => x.pfad === 'product/query').length], [{ UEBERSPRUNGEN: 1 }, q3]);
    W3.weg();
  }
  {
    const dateien = GM.planDateien(), relativ = dateien.map(rel);
    const muss = ['lib/cj_varianten.mjs', 'lib/kategorien.mjs', 'lib/gmc_feed_item.mjs', 'lib/top_kandidaten.mjs', 'lib/stecker_cj.mjs', 'stecker_bereinigen.mjs', 'lib/kanal_sperren.mjs', 'lib/lieferbarkeit.mjs', 'lib/varianten_sicherheit.mjs',
      'optionen_uebersetzen.mjs', 'farbwahl_scan.mjs', 'lib/seo_titel.mjs', 'lib/grind_preis.mjs', 'lib/cj_fracht.mjs', 'lib/grind_plan.mjs', 'lib/grind_google.mjs', 'lib/grind_google_daten.json', 'lib/kategorien_verengt_daten.json', 'lib/mode_taxonomie.mjs', 'lib/grind_dubletten.mjs', 'lib/fakten_block.mjs', 'grind2.mjs'].map(f => 'automation/' + f)
      .concat(['dropship/mode-taxonomie-2610/ALLES.json', 'dropship/mode-taxonomie-2610/g_korrekturen.json', 'dropship/mode-taxonomie-2610/pruef_kern.mjs']);
    ist('Plan-Version: grind2.mjs und der ABSCHLUSS aller relativen Importe stehen drin (Sperrlisten, Preisregel, Fracht, Stecker, JSON-Daten) — vorher kannte die Liste 10 von 22 Dateien', muss.filter(f => !relativ.includes(f)), []);
    const fehlt = [];
    for (const m of ['grind2.mjs', 'lib/grind_plan.mjs', 'lib/grind_preis.mjs', 'lib/cj_fracht.mjs']) {
      const pfad = join(AUTO, m), q = readFileSync(pfad, 'utf8');
      for (const x of q.matchAll(/from\s+'(\.{1,2}\/[^']+\.mjs)'/g)) { const ziel = resolve(dirname(pfad), x[1]); if (!dateien.includes(ziel)) fehlt.push(`${m} → ${rel(ziel)}`); }
    }
    ist('Plan-Version (unabhängig vom Code gelesen): jeder relative Import von grind2, grind_plan, grind_preis und cj_fracht steht drin (Mutanten R19/R20: Preisregel und Fracht fehlten in der alten Liste, ohne dass ein Test rot wurde)', fehlt, []);
    const kopiere = async (aendere) => {
      const wurzel = mkdtempSync(join(tmpdir(), 'planv-'));
      for (const f of dateien) {
        const ziel = join(wurzel, rel(f)); mkdirSync(dirname(ziel), { recursive: true });
        let t = readFileSync(f, 'utf8'); if (aendere && rel(f) === aendere) t += f.endsWith('.json') ? '\n' : '\n// geändert\n';
        writeFileSync(ziel, t);
      }
      const m = await import(pathToFileURL(join(wurzel, 'automation/grind2.mjs')).href);
      const k = m.planSchluessel(m.konfigAus({ GRIND2_TEST: '1' }, wurzel));
      rmSync(wurzel, { recursive: true, force: true });
      return k;
    };
    const k0 = await kopiere(null);
    ist('Plan-Version: derselbe Stand in einem anderen Verzeichnis ergibt dieselbe Version (nur der Inhalt zählt, nicht der Ort)', k0, planSchluessel(konfigAus({ GRIND2_TEST: '1' }, ROOT)));
    const unveraendert = [];
    for (const f of ['dropship/mode-taxonomie-2610/ALLES.json', 'dropship/mode-taxonomie-2610/g_korrekturen.json', 'dropship/mode-taxonomie-2610/pruef_kern.mjs']) {
      if (await kopiere(f) === k0) unveraendert.push(f);                 // Datendateien neben dem Code: ALLES.json bestimmt die Mode-Kategorien (sort-Tags) eines Plans
    }
    for (const f of ['lib/kategorien.mjs', 'lib/gmc_feed_item.mjs', 'lib/top_kandidaten.mjs', 'lib/stecker_cj.mjs', 'stecker_bereinigen.mjs', 'lib/kanal_sperren.mjs', 'lib/cj_varianten.mjs', 'lib/grind_preis.mjs', 'lib/cj_fracht.mjs', 'lib/lieferbarkeit.mjs',
      'lib/varianten_sicherheit.mjs', 'optionen_uebersetzen.mjs', 'farbwahl_scan.mjs', 'lib/seo_titel.mjs', 'lib/grind_google_daten.json', 'lib/kategorien_verengt_daten.json']) {
      if (await kopiere('automation/' + f) === k0) unveraendert.push(f);
    }
    ist('Plan-Version ändert sich, sobald EINE dieser Sperrlisten-/Regel-Dateien sich ändert (WAFFEN, SPERR_TAGS, RISIKO, Stecker, Preisrundung …) — ein Plan aus der Probe gilt dann nicht mehr', unveraendert, []);
  }

  // ── 2. Rücknahme auf DRAFT gilt nur, wenn der Shop DRAFT zurückliest
  for (const form of [{ productUpdate: null }, {}, { productUpdate: { product: null, userErrors: [] } }]) {
    const W = welt({ ...standardSz(), seite404: true }, { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
    mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('productUpdate') && gqlVars(init).p?.status === 'DRAFT') return antwort({ data: form }); });      // der Shop bestätigt nichts, das Produkt bleibt ACTIVE
    const r = await lauf(W.cfg, W.io);
    ist(`Rücknahme S5 (Antwort ${JSON.stringify(form)}): das Ledger sagt ZURUECK_FEHLGESCHLAGEN, nie ZURUECK; Exit 1; das Produkt ist noch ACTIVE`,
      [r.exit, typen(W.cfg.pfade.freigabeLedger).includes('ZURUECK_FEHLGESCHLAGEN'), typen(W.cfg.pfade.freigabeLedger).includes('ZURUECK'), [...W.shop.produkte.values()].map(s => s.status)], [EXIT.FEHLER, true, false, ['ACTIVE']]);
    W.weg();
  }
  {
    // Gegenprobe: die erste Rücknahme geht ins Leere, die zweite wirkt und wird zurückgelesen → ZURUECK, Exit 0
    const W = welt({ ...standardSz(), seite404: true }, { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
    let n = 0;
    mit(W, async (u, init) => { if (istGql(u) && gqlText(init).includes('productUpdate') && gqlVars(init).p?.status === 'DRAFT' && ++n === 1) return antwort({ data: { productUpdate: null } }); });
    const r = await lauf(W.cfg, W.io);
    ist('Rücknahme: der zweite Versuch wirkt und wird zurückgelesen → ZURUECK (bestätigt), das Produkt ist DRAFT, Exit 0', [r.exit, typen(W.cfg.pfade.freigabeLedger).includes('ZURUECK'), typen(W.cfg.pfade.freigabeLedger).includes('ZURUECK_FEHLGESCHLAGEN'), [...W.shop.produkte.values()].map(s => s.status)], [0, true, false, ['DRAFT']]);
    W.weg();
    // Der Status wird mit einer eigenen Abfrage gelesen (STATUS_LESEN), nicht aus der Antwort des Schreibens
    const W2 = welt({ ...standardSz(), seite404: true }, { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W2);
    let gelesen = 0;
    mit(W2, async (u, init) => { if (istGql(u) && gqlText(init) === GM.STATUS_LESEN) gelesen++; });
    await lauf(W2.cfg, W2.io);
    ist('Rücknahme: der Shop wird mit STATUS_LESEN nachgelesen', gelesen >= 1, true);
    W2.weg();
  }

  // ── 3. Übernommene Waisen werden nicht ungeprüft veröffentlicht (S8): Beschreibung, Bilder, Produktart gegen den heutigen Plan
  {
    const orphanSzenario = async (aendere, { publish = true, vorbereiten } = {}) => {
      const sz = standardSz();
      const W = welt(sz, { ZIELE: 'webcams', LIMIT: '1' });
      await lauf(W.cfg, W.io);                                       // Trockenlauf: der Plan liegt im Zwischenspeicher
      const plan = planVon(W), alt = klon(plan.eingabe);
      aendere?.(alt, plan);
      const gid = 'gid://shopify/Product/77';
      W.shop.produkte.set(gid, { input: alt, status: 'DRAFT', pubs: [] });
      sz.vorhanden = { [plan.handle]: { id: gid, handle: plan.handle, status: 'DRAFT', tags: [...alt.tags], variantsCount: { count: alt.variants.length } } };
      vorbereiten?.(W);
      frei(W);
      const r = await lauf({ ...W.cfg, live: true, publish }, W.io);
      return { W, r, gid, status: W.shop.produkte.get(gid).status, falsch: r.bericht.zeilen[0]?.tore?.falsch || [] };
    };
    const a = await orphanSzenario((alt) => {
      alt.descriptionHtml = '<!-- ls-fakten-v1 -->' + '<p>Material Plastic. This product can be used indoor and outdoor and is the best choice for your home. Contact us at shop@example.com for details and more information about it.</p>'.repeat(2);
      alt.files = alt.files.slice(0, 3);
      alt.variants.forEach(v => { if (v.file && !alt.files.some(f => f.originalSource === v.file.originalSource)) alt.files.push({ originalSource: v.file.originalSource, contentType: 'IMAGE', alt: 'x' }); });
    });
    ist('S8: ein übernommener Waisen-Entwurf mit altem Text (englischer Rest, E-Mail) und weniger Bildern wird NICHT veröffentlicht: bleibt DRAFT, TOR_FEHLER, kein ACTIVE, Tag grind2-tor-fehler',
      [a.status, a.W.aus('status').length, a.r.bericht.zaehl.TOR_FEHLER, a.falsch.includes('beschreibung-wie-geplant'), a.W.aus('tagsAdd').map(x => x.t[0])], ['DRAFT', 0, 1, true, ['grind2-tor-fehler']]);
    ist('...Freigabe-Ledger: FEHLER (nicht FREI), kein zweites productSet', [typen(a.W.cfg.pfade.freigabeLedger), a.W.aus('productSet').length], [['FEHLER'], 0]);
    const bildAb = await orphanSzenario(alt => { alt.files = alt.files.slice(0, alt.files.length - 1); });
    ist('S8: weniger Medien als geplant (Bild fehlt) → Tor «medien-wie-geplant» fällt, DRAFT', [bildAb.falsch.includes('medien-wie-geplant'), bildAb.status], [true, 'DRAFT']);
    const artAb = await orphanSzenario(alt => { alt.productType = 'Spielzeug'; });
    ist('S8: andere Produktart → Tor «produktart-wie-geplant» fällt, DRAFT', [artAb.falsch.includes('produktart-wie-geplant'), artAb.status], [true, 'DRAFT']);
    const gleich = await orphanSzenario(null);
    ist('Gegenprobe: eine Waise, die dem heutigen Plan GLEICHT, besteht alle Tore und wird veröffentlicht (kein zweites productSet)', [gleich.r.bericht.zaehl.VEROEFFENTLICHT, gleich.status, gleich.W.aus('productSet').length, gleich.falsch], [1, 'ACTIVE', 0, []]);
    // Fund 11: die Waise trägt das Datums-Tag ihres Anlege-Tages — die Übernahme am nächsten Tag darf daran nicht scheitern
    const datum = await orphanSzenario(alt => { alt.tags = alt.tags.map(t => (/^grind2-\d{8}$/.test(t) ? 'grind2-20250101' : t)); });
    ist('B2: die Waise vom «Vortag» (Tag grind2-20250101) besteht die Tore (kein «Tags fehlen: grind2-<neues Datum>»), wird übernommen und veröffentlicht', [datum.falsch, datum.r.bericht.zaehl.TOR_FEHLER ?? 0, datum.status], [[], 0, 'ACTIVE']);
    for (const x of [a, bildAb, artAb, gleich, datum]) x.W.weg();
  }
  {
    // toreNachAnlage(streng): reine Funktion
    const p0 = FRISCH(), E = { ...EINGABE, descriptionHtml: p0.descriptionHtml, productType: 'Elektronik' };
    const mitP = f => { const p = FRISCH(); p.productType = 'Elektronik'; f?.(p); return toreNachAnlage(E, p, { streng: true }); };
    const STRENG3 = /^(beschreibung|medien|produktart)-wie-geplant$/;
    ist('streng: Beschreibung, Medien und Produktart wie im Plan → alle Tore bestehen', [mitP().ok, mitP().tore.filter(t => STRENG3.test(t.name)).map(t => t.name)], [true, ['beschreibung-wie-geplant', 'medien-wie-geplant', 'produktart-wie-geplant']]);
    ist('streng: andere Beschreibung', falsch(mitP(p => { p.descriptionHtml = `<!-- ls-var-v1 --><!-- ls-fakten-v1 -->${'<li>Anderes</li>'.repeat(30)}`; })).filter(n => STRENG3.test(n)), ['beschreibung-wie-geplant']);
    ist('streng: gleicher Text, anderer Marker (Fakten-Block ↔ Fliesstext) fällt', falsch(mitP(p => { p.descriptionHtml = p.descriptionHtml.replace('ls-fakten-v1', 'ls-text-v2'); })).filter(n => STRENG3.test(n)), ['beschreibung-wie-geplant']);
    ist('streng: gleicher Text mit anderer HTML-Formatierung (Zeilenumbrüche, andere Tag-Schreibweise) fällt NICHT (Shopify formatiert um)', falsch(mitP(p => { p.descriptionHtml = p.descriptionHtml.replace(/<li>Angabe<\/li>/g, '<LI>\n Angabe </LI>'); })).filter(n => STRENG3.test(n)), []);
    ist('streng: ein Medium mehr oder weniger fällt', [falsch(mitP(p => { p.media.nodes.pop(); })).includes('medien-wie-geplant'), falsch(mitP(p => { p.media.nodes.push({ id: 'e', status: 'READY' }); })).includes('medien-wie-geplant')], [true, true]);
    ist('streng: andere Produktart fällt', falsch(mitP(p => { p.productType = 'Haushalt'; })).filter(n => STRENG3.test(n)), ['produktart-wie-geplant']);
    ist('ohne streng gelten diese drei Tore nicht (neu angelegte Produkte)', [toreNachAnlage(E, (() => { const p = FRISCH(); p.productType = 'Haushalt'; p.media.nodes.pop(); return p; })()).tore.some(t => STRENG3.test(t.name))], [false]);
  }

  // ── 4. Waise im FRISCHEN Index (S9): nicht still als «Dublette» sperren, sondern übernehmen — und sichtbar machen
  {
    const mkIndexWaise = (tags, status = 'DRAFT') => {
      const h = handleVon('Full HD USB-Webcam mit Mikrofon', '2000000000000000001');
      const sz = standardSz();
      sz.vorhanden = { [h]: { id: 'gid://shopify/Product/77', handle: h, status, tags: tags.length ? tags : ['dropship'], variantsCount: { count: 2 } } };
      const W = welt(sz, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
      appendFileSync(W.cfg.pfade.skus, JSON.stringify({ id: 'gid://shopify/Product/77', handle: h, title: 'Full HD USB-Webcam mit Mikrofon', status, ...(tags.length ? { tags } : {}), skus: ['CJTS123456701AZ', 'CJTS123456702BY'] }) + '\n');
      frei(W);
      return { W, h };
    };
    const { W, h } = mkIndexWaise(['grind2', 'grind2-20261026']);
    // die Waise im Shop braucht den vollen Zustand (Tore lesen ihn): aus einem Trockenlauf-Plan bauen
    const sz2 = standardSz(); const Wp = welt(sz2, { ZIELE: 'webcams', LIMIT: '1' }); await lauf(Wp.cfg, Wp.io);
    const eingabe = klon(planVon(Wp).eingabe); eingabe.tags = eingabe.tags.map(t => (/^grind2-\d{8}$/.test(t) ? 'grind2-20261026' : t)); Wp.weg();
    W.shop.produkte.set('gid://shopify/Product/77', { input: { ...eingabe, handle: h }, status: 'DRAFT', pubs: [] });
    const r = await lauf(W.cfg, W.io);
    ist('S9: die Waise steht im frischen Index (DRAFT, Tag grind2) → sie wird übernommen (GESCHRIEBEN, kein productSet), gezählt (WAISE) und im Hinweis genannt',
      [r.bericht.zaehl.GESCHRIEBEN, r.bericht.zaehl.WAISE, W.aus('productSet').length, r.bericht.hinweise.some(x => /Waise eines früheren Laufs im Shop/.test(x)), lesen(W.cfg.pfade.ledger).includes('gid://shopify/Product/77')], [1, 1, 0, true, true]);
    ist('...die strengen Tore laufen (die Waise gleicht dem Plan bis auf das Datums-Tag): FREI im Freigabe-Ledger', typen(W.cfg.pfade.freigabeLedger), ['FREI']);
    W.weg();
    // Gegenproben: fremde Dubletten bleiben gesperrt
    const fremd = mkIndexWaise([], 'ACTIVE'); const r2 = await lauf(fremd.W.cfg, fremd.W.io);
    ist('Gegenprobe: ein ACTIVE-Produkt mit denselben SKUs ist eine Dublette (wie bisher)', [r2.bericht.zaehl.GESCHRIEBEN ?? 0, r2.bericht.vorfilter[0].abgelehnt.dublette ?? 0, fremd.W.aus('cj').filter(x => x.pfad === 'product/query').length], [0, 1, 0]);
    fremd.W.weg();
    const ohneTag = mkIndexWaise([], 'DRAFT'); const r3 = await lauf(ohneTag.W.cfg, ohneTag.W.io);
    ist('Gegenprobe: ein DRAFT-Produkt OHNE die Marke grind2 ist eine fremde Dublette', [r3.bericht.zaehl.GESCHRIEBEN ?? 0, r3.bericht.vorfilter[0].abgelehnt.dublette ?? 0], [0, 1]);
    ohneTag.W.weg();
    const imLedger = mkIndexWaise(['grind2', 'grind2-20261026']);
    appendFileSync(imLedger.W.cfg.pfade.ledger, `2000000000000000001 · ${new Date().toISOString()} · GESCHRIEBEN · 2 Varianten · ${imLedger.h} · gid://shopify/Product/77 · webcams\n`);
    const r4 = await lauf(imLedger.W.cfg, imLedger.W.io);
    ist('Gegenprobe: kennt das Ledger die pid schon (GESCHRIEBEN), ist die Waise keine Waise mehr: gesperrt wie bisher', [r4.bericht.zaehl.GESCHRIEBEN ?? 0, r4.bericht.zaehl.WAISE ?? 0, imLedger.W.aus('productSet').length], [0, 0, 0]);
    imLedger.W.weg();
    // dublettenUrteil einzeln
    const mk = produkte => DB.baueIndex({ produkte }, { stand: new Date().toISOString() });
    const P = (id, status, tags) => ({ id: `gid://shopify/Product/${id}`, handle: `h-${id}`, title: `Titel ${id}`, status, ...(tags ? { tags } : {}), skus: ['CJZZ1234567-A'] });
    const k = { productSku: 'CJZZ1234567', variantSkus: ['CJZZ1234567-A'], titel: 'x' };
    ist('dublettenUrteil: nur Waisen → keine Dublette, waise:true', (u => [u.dublette, u.waise, u.waisen])(GM.dublettenUrteil(k, mk([P(1, 'DRAFT', ['grind2'])]))), [false, true, ['h-1']]);
    ist('dublettenUrteil: eine Waise + ein fremdes Produkt mit derselben SKU → Dublette', (u => [u.dublette, u.waise])(GM.dublettenUrteil(k, mk([P(1, 'DRAFT', ['grind2']), P(2, 'ACTIVE', ['grind2'])]))), [true, false]);
    ist('dublettenUrteil: DRAFT mit Marke grind2-20261026 (nur das Datums-Tag) ist keine Waise (die Marke heisst grind2)', (u => [u.dublette, u.waise])(GM.dublettenUrteil(k, mk([P(1, 'DRAFT', ['grind2-20261026'])]))), [true, false]);
    ist('dublettenUrteil: sechs Treffer (mehr als die fünf, die der Index nennt) → Dublette (nicht alle sind als Waisen belegt)', (u => [u.dublette, u.waise])(GM.dublettenUrteil(k, mk([1, 2, 3, 4, 5, 6].map(i => P(i, 'DRAFT', ['grind2']))))), [true, false]);
    ist('dublettenUrteil: kein Treffer → keine Dublette, keine Waise', (u => [u.dublette, u.waise])(GM.dublettenUrteil(k, mk([]))), [false, false]);
    ist('istWaise: DRAFT + Marke grind2', [GM.istWaise({ status: 'DRAFT', tags: ['grind2'] }), GM.istWaise({ status: 'ACTIVE', tags: ['grind2'] }), GM.istWaise({ status: 'DRAFT', tags: [] }), GM.istWaise({ status: 'DRAFT' }), GM.istWaise(null)], [true, false, false, false, false]);
  }

  // ── 5. Notbremse «Freigabedatei löschen = Stopp» auch zwischen den Schritten eines Produkts
  {
    const stopp = async (wann) => {
      const W = welt(standardSz(), { LIVE: '1', PUBLISH: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
      let weg = false;
      mit(W, async (u, init, echt) => {
        if (wann === 'seite' && !weg && /^https:\/\/luxestyle\.ch\/products\//.test(u)) { weg = true; const r = await echt(u, init); rmSync(W.cfg.pfade.freigabeDatei, { force: true }); return r; }
        if (!istGql(u) || weg) return undefined;
        const q = gqlText(init), v = gqlVars(init);
        const trifft = wann === 'anlegen' ? q.includes('productSet(') : wann === 'tore' ? (q.includes('product(id:$id)') && q.includes('descriptionHtml')) : wann === 'aktiv' ? (q.includes('productUpdate') && v.p?.status === 'ACTIVE')
          : wann === 'kanal' ? q.includes('publishablePublish') : false;
        if (!trifft) return undefined;
        weg = true; const r = await echt(u, init); rmSync(W.cfg.pfade.freigabeDatei, { force: true }); return r;
      });
      const r = await lauf(W.cfg, W.io);
      return { W, r, status: [...W.shop.produkte.values()].map(s => s.status), frei: typen(W.cfg.pfade.freigabeLedger), stati: W.aus('status').map(x => x.status), pub: W.aus('publish').length, grund: lesen(W.cfg.pfade.freigabeLedger), toreLesen: W.aus('tore').length, seiten: W.aus('seite').length };
    };
    const s1 = await stopp('anlegen');
    ist('Notbremse zwischen Anlegen und Toren: kein Tor gelesen, nichts aktiviert, FEHLER «Stopp» im Freigabe-Ledger, das Produkt bleibt DRAFT', [s1.W.aus('tore').length, s1.stati, s1.status, s1.frei, /Stopp vor den Toren/.test(s1.r.bericht.hinweise.join('|'))], [0, [], ['DRAFT'], ['FEHLER'], true]);
    const s2 = await stopp('tore');
    ist('S2 Notbremse während die Tore gelesen werden: die Tore bestehen, aber VOR dem Aktivieren wird die Freigabedatei erneut geprüft → nichts aktiviert, nichts veröffentlicht', [s2.stati, s2.pub, s2.status, s2.r.bericht.veroeffentlicht.length, /Stopp vor dem Aktivieren/.test(s2.r.bericht.zeilen[0].entscheid)], [[], 0, ['DRAFT'], 0, true]);
    const s3 = await stopp('aktiv');
    ist('Notbremse unmittelbar NACH dem Aktivieren: sofort zurück auf DRAFT (ZURUECK bestätigt), kein publishablePublish', [s3.stati, s3.pub, s3.status, s3.frei.includes('ZURUECK')], [['ACTIVE', 'DRAFT'], 0, ['DRAFT'], true]);
    const s4 = await stopp('kanal');
    ist('Notbremse nach dem Veröffentlichen: zurück auf DRAFT (das Produkt ist in Kanälen, darf aber nicht bleiben), ZURUECK im Ledger, keine FREI-Zeile «veröffentlicht»', [s4.stati, s4.status, s4.frei.includes('ZURUECK'), s4.frei.filter(t => t === 'FREI').length, s4.r.bericht.veroeffentlicht.length], [['ACTIVE', 'DRAFT'], ['DRAFT'], true, 1, 0]);
    ist('...und sofort: der Grund nennt «Stopp nach dem Veröffentlichen», es wurde weder nachgelesen (es bleibt bei den 2 Tore-Abfragen vor dem Aktivieren) noch die Produktseite abgerufen', [/Stopp nach dem Veröffentlichen/.test(s4.grund), s4.toreLesen, s4.seiten], [true, 2, 0]);
    const s5 = await stopp('seite');
    ist('Notbremse nach dem Seitenabruf, vor der Freigabe-Zeile: zurück auf DRAFT, Grund «Stopp vor der Freigabe-Zeile», nur die eine FREI-Zeile der Tore, nichts als veröffentlicht gemeldet', [s5.stati, s5.status, /Stopp vor der Freigabe-Zeile/.test(s5.grund), s5.frei, s5.r.bericht.veroeffentlicht.length], [['ACTIVE', 'DRAFT'], ['DRAFT'], true, ['FREI', 'ZURUECK'], 0]);
    ist('...und die anderen Haltepunkte nennen ihren eigenen Grund (nach dem Aktivieren: «Stopp nach dem Aktivieren»)', [/Stopp nach dem Aktivieren/.test(s3.grund), s3.toreLesen, s3.seiten], [true, 2, 0]);
    for (const x of [s1, s2, s3, s4, s5]) x.W.weg();
  }

  // ── 6. Sperrdatei mit Herzschlag statt reinem Alter
  {
    const dir = mkdtempSync(join(tmpdir(), 'herz-')), f = join(dir, 'x.lock'), t0 = Date.now(), MIN = 60 * 1000;
    ist('Sperre: der erste holt sie (mit Herzschlag-Feld)', [sperreHolen(f, t0), typeof JSON.parse(readFileSync(f, 'utf8')).herz], [true, 'number']);
    ist('Sperre: nach 16 Minuten OHNE Herzschlag gilt sie als Überrest eines abgestürzten Laufs (vorher erst nach 3 Stunden: der Folgelauf nach einem Container-Neustart wartete stundenlang)', sperreHolen(f, t0 + 16 * MIN), true);
    sperreHolen(f, t0 + 16 * MIN);
    ist('Sperre: ein lebender Besitzer schreibt den Herzschlag neu', sperreHerz(f, t0 + 30 * MIN), true);
    ist('Sperre: nach 4 Stunden Laufzeit, aber mit Herzschlag vor 10 Minuten, bleibt sie gehalten (vorher wurde sie nach 3 Stunden gestohlen)', [sperreHolen(f, t0 + 4 * 3600 * 1000), (() => { sperreHerz(f, t0 + 4 * 3600 * 1000 - 10 * MIN); return sperreHolen(f, t0 + 4 * 3600 * 1000); })()], [true, false]);
    // Z60 (Mutationsprobe): nach 4 Stunden Laufzeit (seit = t0) entscheidet der letzte HERZSCHLAG vor 10 Minuten, nicht das Alter der Sperre
    writeFileSync(f, JSON.stringify({ pid: 1, seit: t0, herz: t0 + 4 * 3600 * 1000 - 10 * MIN }));
    ist('Sperre: seit 4 Stunden gehalten, letzter Herzschlag vor 10 Minuten → bleibt gehalten (ein reines Alter hätte sie gestohlen); vor 16 Minuten → Überrest', [sperreHolen(f, t0 + 4 * 3600 * 1000), (() => { writeFileSync(f, JSON.stringify({ pid: 1, seit: t0, herz: t0 + 4 * 3600 * 1000 - 16 * MIN })); return sperreHolen(f, t0 + 4 * 3600 * 1000); })()], [false, true]);
    writeFileSync(f, JSON.stringify({ pid: 1, seit: t0, herz: t0 }));
    ist('Herzschlag: eine Sperre, die einem anderen Prozess gehört, wird nicht angefasst', [sperreHerz(f, t0 + MIN), JSON.parse(readFileSync(f, 'utf8')).herz], [false, t0]);
    writeFileSync(f, JSON.stringify({ pid: 1, seit: t0 }));
    ist('Sperre aus der Zeit vor dem Herzschlag (nur «seit»): zählt als letzter Lebenszeichen', [sperreHolen(f, t0 + 5 * MIN), sperreHolen(f, t0 + 20 * MIN)], [false, true]);
    ist('sperreHerz: fehlende oder kaputte Datei → false, kein Wurf', [sperreHerz(join(dir, 'gibt-es-nicht'), t0), (() => { writeFileSync(f, 'kaputt'); return sperreHerz(f, t0); })()], [false, false]);
    rmSync(dir, { recursive: true, force: true });
    ist('Herzschlag-Zeiten: Intervall 60 s, Überrest nach 15 Minuten', [GM.SPERRE_HERZ_INTERVALL_MS, GM.SPERRE_HERZ_MAX_MS], [60000, 900000]);
    // lauf() verdrahtet den Herzschlag wirklich: ein Zeitgeber im Intervall SPERRE_HERZ_INTERVALL_MS schreibt `herz` der Sperre neu, solange der LIVE-Lauf läuft (sonst wäre jede Sperre nach 15 Minuten ein «Überrest»)
    const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
    const sperre = join(tmpdir(), `grind2-${createHash('sha1').update(resolve(W.cfg.pfade.ledger)).digest('hex').slice(0, 12)}.lock`);
    const echtSI = globalThis.setInterval, gefangen = [];
    globalThis.setInterval = (fn, ms, ...a) => { if (ms === GM.SPERRE_HERZ_INTERVALL_MS) { gefangen.push(fn); const h = echtSI(() => {}, 1e9); h.unref?.(); return h; } return echtSI(fn, ms, ...a); };
    let t = Date.now(), davor = null, danach = null, unref = null;
    W.io.jetzt = () => t;
    mit(W, async (u) => { if (istGql(u) && davor === null) { davor = JSON.parse(readFileSync(sperre, 'utf8')).herz; t += 5 * 60 * 1000; gefangen[0]?.(); danach = JSON.parse(readFileSync(sperre, 'utf8')).herz; } });
    try { await lauf(W.cfg, W.io); } finally { globalThis.setInterval = echtSI; }
    ist('lauf(LIVE): genau ein Herzschlag-Zeitgeber, und sein Aufruf schreibt `herz` der Sperre neu (5 Minuten später)', [gefangen.length, danach - davor, existsSync(sperre)], [1, 5 * 60 * 1000, false]);
    W.weg();
  }

  // ── 7. Pflichtgrenzen sind per Umgebung nie in die unsichere Richtung zu verschieben (S4)
  {
    const gibt = (env, name) => { try { return konfigAus(env, '/x')[name]; } catch (e) { return 'WIRFT'; } };
    ist('PREIS_MIN: unter 14.90 wirft (1, 14.89), 14.90 und mehr geht', [gibt({ PREIS_MIN: '1' }, 'preisMin'), gibt({ PREIS_MIN: '14.89' }, 'preisMin'), gibt({ PREIS_MIN: '14.9' }, 'preisMin'), gibt({ PREIS_MIN: '20' }, 'preisMin')], ['WIRFT', 'WIRFT', 14.9, 20]);
    ist('PREIS_MIN_MODE: unter 16.90 wirft', [gibt({ PREIS_MIN_MODE: '1' }, 'preisMinMode'), gibt({ PREIS_MIN_MODE: '16.89' }, 'preisMinMode'), gibt({ PREIS_MIN_MODE: '16.9' }, 'preisMinMode')], ['WIRFT', 'WIRFT', 16.9]);
    ist('MIN_EINSTAND_CHF: unter 2 wirft (0, 1.99), 2 und mehr geht', [gibt({ MIN_EINSTAND_CHF: '0' }, 'minEinstand'), gibt({ MIN_EINSTAND_CHF: '1.99' }, 'minEinstand'), gibt({ MIN_EINSTAND_CHF: '2' }, 'minEinstand'), gibt({ MIN_EINSTAND_CHF: '50' }, 'minEinstand')], ['WIRFT', 'WIRFT', 2, 50]);
    ist('USD_CHF: nur ±12 % um den festen Kurs 0,82435 (0,65 und 0,95 werfen, 0,75 und 0,90 gehen)', [gibt({ USD_CHF: '0.65' }, 'kurs'), gibt({ USD_CHF: '0.95' }, 'kurs'), gibt({ USD_CHF: '0.75' }, 'kurs'), gibt({ USD_CHF: '0.9' }, 'kurs')], ['WIRFT', 'WIRFT', 0.75, 0.9]);
    ist('MAX_PREIS: senkbar (60), aber nie über 80 (100000 wirft) — ausser mit GRIND2_TEST=1 (Tests mit schweren Fixtures)', [gibt({ MAX_PREIS: '60' }, 'maxPreis'), gibt({ MAX_PREIS: '80' }, 'maxPreis'), gibt({ MAX_PREIS: '81' }, 'maxPreis'), gibt({ MAX_PREIS: '100000' }, 'maxPreis'), gibt({ MAX_PREIS: '1000', GRIND2_TEST: '1' }, 'maxPreis')], [60, 80, 'WIRFT', 'WIRFT', 1000]);
    ist('S4 wie in der Gegenlesung: PREIS_MIN=1, MIN_EINSTAND_CHF=0, USD_CHF=0.65, MAX_PREIS=100000 zusammen → wirft', gibt({ PREIS_MIN: '1', MIN_EINSTAND_CHF: '0', USD_CHF: '0.65', MAX_PREIS: '100000' }, 'preisMin'), 'WIRFT');
    ist('Vorgaben = Pflichtgrenzen', [GM.MAX_PREIS_STANDARD, GM.MIN_EINSTAND_STANDARD, GM.PREIS_MIN_MODE, konfigAus({}, '/x').maxPreis, konfigAus({}, '/x').minEinstand], [80, 2, 16.9, 80, 2]);
  }

  // ── 8. KI-Ausfall bei der Etiketten-Übersetzung ist vorläufig (20 Stunden), nicht zurückgestellt (7 Tage) (B5)
  {
    const nurLabelsFallenAus = W => mit(W, async (u, init) => {
      const t = /generativelanguage/.test(u) ? JSON.parse(init.body).contents[0].parts[0].text : /api\.groq\.com/.test(u) ? JSON.parse(init.body).messages[0].content : '';
      if (t.includes('Variantenbezeichnungen')) return antwort({}, 500);
    });
    const W = welt(standardSz(), { LIVE: '1', ZIELE: 'lichterketten', LIMIT: '1' }); frei(W); nurLabelsFallenAus(W);
    const r = await lauf(W.cfg, W.io);
    const l = lesen(W.cfg.pfade.ledger);
    ist('B5: fällt die KI bei den Etiketten aus, steht «vorläufig» im Ledger (20 Stunden), NICHT «zurückgestellt» (7 Tage); nichts angelegt', [r.bericht.zaehl, /UEBERSPRUNGEN · vorläufig: .*übersetzt/.test(l), /zurückgestellt/.test(l), W.aus('productSet').length], [{ UEBERSPRUNGEN: 1 }, true, false, 0]);
    ist('...und das Gedächtnis kennt die pid nach 10 Stunden noch, nach 2 Tagen nicht mehr', [ledgerGedaechtnis(l, { jetzt: Date.now() + 10 * 3600e3 }).has('2000000000000000002'), ledgerGedaechtnis(l, { jetzt: Date.now() + 48 * 3600e3 }).has('2000000000000000002')], [true, false]);
    W.weg();
    // Gegenprobe: liefert die KI Unbrauchbares (Originalwerte unverändert), ist es ein Urteil über das Produkt → zurückgestellt (7 Tage)
    const W2 = welt(standardSz(), { LIVE: '1', ZIELE: 'lichterketten', LIMIT: '1' }); frei(W2);
    mit(W2, async (u, init) => {
      if (!/generativelanguage/.test(u)) return undefined;
      const t = JSON.parse(init.body).contents[0].parts[0].text;
      if (t.includes('Variantenbezeichnungen')) return antwort({ candidates: [{ content: { parts: [{ text: JSON.stringify(JSON.parse(t.slice(t.lastIndexOf('[')))) }] } }] });
    });
    await lauf(W2.cfg, W2.io);
    ist('Gegenprobe: unveränderte Rückgabe der KI (kein Ausfall) bleibt «zurückgestellt» (7 Tage)', /UEBERSPRUNGEN · zurückgestellt: .*übersetzt/.test(lesen(W2.cfg.pfade.ledger)), true);
    W2.weg();
  }

  // ── 9. productSet wird nie blind wiederholt; der Handle der Shopify-Antwort steht im Ledger (B3)
  {
    const verloren = async ({ handleModus, fehlerart = 'fetch', angekommen = true, dauer = 1 } = {}) => {
      const W = welt({ ...standardSz(), handleModus }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
      let n = 0;
      mit(W, async (u, init, echt) => {
        if (!(istGql(u) && gqlText(init).includes('productSet('))) return undefined;
        if (++n > dauer) return undefined;
        if (angekommen) await echt(u, init);
        if (fehlerart === 'fetch') throw new Error('fetch failed (simuliert)');
        if (fehlerart === '502') return antwort({}, 502);
        if (fehlerart === 'html') return new Response('<html>Gateway</html>', { status: 200 });
      });
      const r = await lauf(W.cfg, W.io);
      return { W, r, n: Math.min(n, 99), ps: W.aus('productSet').length, ledger: lesen(W.cfg.pfade.ledger), produkte: W.shop.produkte.size };
    };
    const a = await verloren();
    ist('Antwort verloren (die Anfrage kam an): KEIN zweites productSet — das Produkt wird per SKU/Handle gefunden und übernommen', [a.n, a.ps, a.produkte, a.r.bericht.zaehl.GESCHRIEBEN, a.r.bericht.zaehl.TOR_FEHLER ?? 0, /gid:\/\/shopify\/Product\/1/.test(a.ledger)], [1, 1, 1, 1, 0, true]);
    const b = await verloren({ handleModus: 'suffix' });
    ist('B3/S5b: Antwort verloren UND Shopify hat den Handle still umnummeriert (…-1): weiter genau EIN productSet, EIN Produkt; das Ledger nennt den ECHTEN Handle, das Tor «handle» hält das Produkt als DRAFT fest', [b.n, b.ps, b.produkte, /-1 · gid:\/\/shopify\/Product\/1/.test(b.ledger), b.r.bericht.zeilen[0].tore.falsch.includes('handle')], [1, 1, 1, true, true]);
    const c = await verloren({ angekommen: false });
    ist('Fehler VOR dem Eintreffen (nichts angelegt): nach dem Nachsehen genau EINE Wiederholung (zwei Anfragen, eine kam an), ein Produkt', [c.n, c.ps, c.produkte, c.r.bericht.zaehl.GESCHRIEBEN], [2, 1, 1, 1]);
    const d = await verloren({ angekommen: false, dauer: 99 });
    ist('Dauerhafter Netzfehler: höchstens 4 Anfragen, dann FEHLER (kein Endlos-Wiederholen, keine Doppelanlage)', [d.n, d.ps, d.produkte, d.r.bericht.zaehl.FEHLER, /FEHLER · Schreiben/.test(d.ledger)], [4, 0, 0, 1, true]);
    const e5 = await verloren({ fehlerart: '502' });
    ist('HTTP 502 mit angekommener Anfrage: ebenfalls kein zweites productSet', [e5.n, e5.ps, e5.produkte], [1, 1, 1]);
    const h = await verloren({ fehlerart: 'html' });
    ist('Unlesbare Antwort (HTML) bei angekommener Anfrage: ebenfalls kein zweites productSet', [h.n, h.ps, h.produkte], [1, 1, 1]);
    for (const x of [a, b, c, d, e5, h]) x.W.weg();
    // GESCHRIEBEN nennt den Handle der Antwort auch ohne Verlust
    const W = welt({ ...standardSz(), handleModus: 'suffix' }, { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W);
    const r = await lauf(W.cfg, W.io);
    ist('B3b: Umnummerierung ohne verlorene Antwort: das Ledger nennt den Handle aus der Antwort, nicht den geplanten; Tore fallen am Handle', [/-1 · gid:\/\/shopify\/Product\/1/.test(lesen(W.cfg.pfade.ledger)), r.bericht.zeilen[0].tore.falsch.includes('handle'), typen(W.cfg.pfade.freigabeLedger)], [true, true, ['FEHLER']]);
    W.weg();
    // eine Drossel (429, Throttled) ist eine ABGELEHNTE Anfrage: bis zu sechsmal ohne Nachsehen wiederholt
    const W2 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W2);
    let k = 0;
    mit(W2, async (u, init) => { if (istGql(u) && gqlText(init).includes('productSet(') && ++k <= 2) return k === 1 ? antwort({}, 429) : antwort({ errors: [{ message: 'Throttled' }] }); });
    const r2 = await lauf(W2.cfg, W2.io);
    ist('Drossel (429, dann «Throttled») vor dem Anlegen: wird überwunden, ein Produkt, drei Anfragen', [r2.bericht.zaehl.GESCHRIEBEN, k, W2.shop.produkte.size], [1, 3, 1]);
    W2.weg();
    // das Zeitlimit für productSet ist grösser als das der Abfragen
    const W3 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W3);
    const zeiten = [];
    mit(W3, async (u, init) => { if (istGql(u)) { zeiten.push([gqlText(init).includes('productSet(') ? 'set' : 'andere', init.signal ? 'mit' : 'ohne']); } });
    await lauf(W3.cfg, W3.io);
    ist('productSet bekommt ein eigenes (längeres) Zeitlimit: PRODUCT_SET_ZEIT_MS = 120 s', [GM.PRODUCT_SET_ZEIT_MS, zeiten.filter(z => z[0] === 'set').every(z => z[1] === 'mit')], [120000, true]);
    // Z115 (Mutationsprobe): das Zeitlimit kommt wirklich im Aufruf an (AbortSignal.timeout wird mit 120 000 ms gerufen), die Abfragen behalten die 30 s
    const W4 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W4);
    const echtTimeout = AbortSignal.timeout.bind(AbortSignal), gemessen = []; let letzteMs = null;
    AbortSignal.timeout = ms => { letzteMs = ms; return echtTimeout(ms); };
    mit(W4, async (u, init) => { if (istGql(u)) gemessen.push([gqlText(init).includes('productSet(') ? 'set' : 'andere', letzteMs]); });
    try { await lauf(W4.cfg, W4.io); } finally { AbortSignal.timeout = echtTimeout; }
    ist('productSet-Aufruf: Zeitlimit 120 000 ms; alle anderen Shop-Abfragen 30 000 ms', [[...new Set(gemessen.filter(g => g[0] === 'set').map(g => g[1]))], [...new Set(gemessen.filter(g => g[0] === 'andere').map(g => g[1]))]], [[120000], [30000]]);
    W4.weg();
    W3.weg();
  }

  // ── 10. Bilder: Gesamtgrösse aus Content-Range, nie Number(null) = 0 (B6)
  {
    const hdr = o => ({ get: k => o[k.toLowerCase()] ?? null });
    const netzBild = async (u, init = {}) => {
      const gross = /gross/.test(u), tot = /tot/.test(u);
      if (tot) return { status: 404, headers: hdr({}), body: null };
      if (init.method === 'HEAD') return { status: 200, headers: hdr({ 'content-type': 'image/jpeg' }), body: null };          // das CJ-CDN: HEAD OHNE content-length
      return { status: 206, headers: hdr({ 'content-type': 'image/jpeg', 'content-range': `bytes 0-0/${gross ? 31457280 : 202913}` }), body: null };
    };
    const r = await bilderPruefen(['https://cf.cjdropshipping.com/a/gross.jpg', 'https://cf.cjdropshipping.com/a/klein.jpg', 'https://cf.cjdropshipping.com/a/tot.jpg'], { fetch: netzBild });
    ist('B6: HEAD ohne content-length (das echte CJ-CDN): ein 30-MB-Bild fällt über Content-Range der Bereichsanfrage auf, 200 KB geht durch, 404 bleibt 404', [[...r.ok], Object.fromEntries([...r.schlecht].sort())], [['https://cf.cjdropshipping.com/a/klein.jpg'], { 'https://cf.cjdropshipping.com/a/gross.jpg': 'zu gross (30 MB, Shopify: höchstens 20 MB)', 'https://cf.cjdropshipping.com/a/tot.jpg': 'HTTP 404' }]);
    // Bereichsanfrage nicht möglich (Fehler): das Bild gilt weiter als lesbar (das Tor medien-fehlerfrei fängt es nach dem Anlegen), und «keine Angabe» ist nie 0 Byte
    const r2 = await bilderPruefen(['https://cf.cjdropshipping.com/a/x.jpg'], { fetch: async (u, init = {}) => { if (init.method === 'HEAD') return { status: 200, headers: hdr({ 'content-type': 'image/jpeg' }), body: null }; throw new Error('timeout'); } });
    ist('Bereichsanfrage scheitert → Bild bleibt ok (nicht prüfbar ist kein Fehler des Bildes)', [...r2.ok].length, 1);
    ist('bildGroesse: Content-Range schlägt content-length; fehlende Angabe ist null (nicht 0); bei einer Teil-Antwort (206) zählt content-length nicht', [GM.bildGroesse(hdr({ 'content-range': 'bytes 0-0/12345' })), GM.bildGroesse(hdr({ 'content-length': '999' })), GM.bildGroesse(hdr({})), GM.bildGroesse(hdr({ 'content-length': '1' }), { ganz: false }), GM.bildGroesse(hdr({ 'content-length': '' })), GM.bildGroesse(hdr({ 'content-length': 'abc' }))], [12345, 999, null, null, null, null]);
    // Z103 (Mutationsprobe): bei einer Teil-Antwort (206) ist content-length die Länge des TEILS, nie die Gesamtgrösse — ein 206 ohne Content-Range macht ein Bild weder gross noch klein
    const r206 = await bilderPruefen(['https://cf.cjdropshipping.com/a/teil.jpg'], { fetch: async (u, init = {}) => (init.method === 'HEAD' ? { status: 200, headers: hdr({ 'content-type': 'image/jpeg' }), body: null } : { status: 206, headers: hdr({ 'content-type': 'image/jpeg', 'content-length': String(25 * 1024 * 1024) }), body: null }) });
    ist('B6: 206 mit content-length 25 MB, aber ohne Content-Range: Gesamtgrösse unbekannt, das Bild bleibt ok (kein Fehlalarm)', [[...r206.ok].length, r206.schlecht.size], [1, 0]);
    const r3 = await bilderPruefen(['https://cf.cjdropshipping.com/a/m.jpg'], { fetch: async () => ({ status: 200, headers: hdr({ 'content-type': 'image/jpeg', 'content-length': String(25 * 1024 * 1024) }), body: null }) });
    ist('Gegenprobe: ein HEAD MIT content-length über 20 MB fällt wie bisher auf, ohne zweite Anfrage', [...r3.schlecht.values()], ['zu gross (25 MB, Shopify: höchstens 20 MB)']);
  }

  // ── 11. KI-Weg: bis zu drei Groq-Schlüssel (GROQ_API_KEY, GROQ_API_KEY2, GROQ_API_KEY3)
  {
    ist('groqSchluessel: Umgebung mit drei Schlüsseln, doppelte und leere fallen weg; ein ausdrücklich übergebener Schlüssel ersetzt die Umgebung', [GM.groqSchluessel({ env: { GROQ_API_KEY: 'a', GROQ_API_KEY2: 'b', GROQ_API_KEY3: 'c' } }), GM.groqSchluessel({ env: { GROQ_API_KEY: 'a', GROQ_API_KEY2: 'a', GROQ_API_KEY3: ' ' } }), GM.groqSchluessel({ groqKey: 'x', env: { GROQ_API_KEY: 'a' } }), GM.groqSchluessel({ groqKey: '', env: { GROQ_API_KEY: 'a' } }), GM.groqSchluessel({ env: {} })],
      [['a', 'b', 'c'], ['a'], ['x'], [], []]);
    const benutzt = [];
    const fetchGroq = async (url, init) => {
      const key = /Bearer (\S+)/.exec(init.headers.Authorization)[1]; benutzt.push(key);
      if (key !== 'dritter') return antwort({ error: 'rate limit' }, 429);
      return antwort({ choices: [{ message: { content: '{"ok":true}' } }] });
    };
    const m = await modellJson('x', { fetch: fetchGroq, geminiKey: '', env: { GROQ_API_KEY: 'erster', GROQ_API_KEY2: 'zweiter', GROQ_API_KEY3: 'dritter' } });
    ist('modellJson: ist das Tageslimit der ersten zwei Schlüssel erreicht (429), antwortet der dritte; Weg «groq»', [m.o, m.weg, [...new Set(benutzt)]], [{ ok: true }, 'groq', ['erster', 'zweiter', 'dritter']]);
    const m2 = await modellJson('x', { fetch: async () => antwort({}, 429), geminiKey: '', env: { GROQ_API_KEY: 'erster', GROQ_API_KEY2: 'zweiter' } });
    ist('modellJson: alle Schlüssel erschöpft → {o:null}, die Gründe nennen jeden Schlüssel (1 und 2)', [m2.o, m2.gruende.some(g => /Groq 1 /.test(g)), m2.gruende.some(g => /Groq 2 /.test(g))], [null, true, true]);
    const vorher = benutzt.filter(k => k === 'erster').length;
    const m3 = await modellJson('x', { fetch: fetchGroq, geminiKey: '', groqKey: 'dritter', env: { GROQ_API_KEY: 'erster' } });
    ist('modellJson: ein übergebener Schlüssel (Tests) wird allein benutzt, die Umgebung bleibt unberührt', [m3.weg, benutzt.filter(k => k === 'erster').length - vorher, benutzt.at(-1)], ['groq', 0, 'dritter']);
  }

  // ── 12. Aufräumen nach einem Absturz zwischen ACTIVE und publishablePublish
  {
    const seeds = async (liste, { zurueckgelesen = null } = {}) => {
      const W = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' });
      const basis = klon((() => { return null; })() ?? {});
      void basis;
      const sz = standardSz(); const Wp = welt(sz, { ZIELE: 'webcams', LIMIT: '1' }); await lauf(Wp.cfg, Wp.io);
      const eingabe = klon(planVon(Wp).eingabe); Wp.weg();
      let i = 80;
      for (const s of liste) { const id = `gid://shopify/Product/${++i}`; W.shop.produkte.set(id, { input: { ...eingabe, handle: `seed-${i}`, tags: [...s.tags] }, status: s.status, pubs: s.pubs || [] }); }
      W.shop.n = 100;
      frei(W);
      if (zurueckgelesen) mit(W, async (u, init) => { if (istGql(u) && gqlText(init) === GM.STATUS_LESEN) return antwort({ data: { product: { id: 'x', status: zurueckgelesen } } }); });
      return W;
    };
    const W = await seeds([{ status: 'ACTIVE', tags: ['grind2', 'cj-real'], pubs: [] }, { status: 'ACTIVE', tags: ['grind2', 'cj-real'], pubs: ['gid://P1'] }, { status: 'DRAFT', tags: ['grind2'], pubs: [] }, { status: 'ACTIVE', tags: ['cj-real'], pubs: [] }]);
    // die simulierte Abfrage liefert nur Produkte mit Marke grind2; die Filter im Code (ACTIVE, ohne Kanal, Marke) werden mit einer zusätzlichen Antwort geprüft
    mit(W, async (u, init, echt) => {
      if (!(istGql(u) && gqlText(init) === GM.AKTIV_OHNE_KANAL)) return undefined;
      const echtAntwort = await (await echt(u, init)).json();
      const extra = [{ id: 'gid://shopify/Product/90', handle: 'fremd-ohne-marke', status: 'ACTIVE', tags: ['cj-real'], resourcePublicationsV2: { nodes: [] } }, { id: 'gid://shopify/Product/91', handle: 'entwurf', status: 'DRAFT', tags: ['grind2'], resourcePublicationsV2: { nodes: [] } }];
      echtAntwort.data.products.nodes.push(...extra);
      return antwort(echtAntwort);
    });
    const r = await lauf(W.cfg, W.io);
    const stati = [...W.shop.produkte.entries()].filter(([id]) => /\/8[1-4]$/.test(id)).map(([id, s]) => [id.split('/').pop(), s.status]);
    ist('Aufräumen: das ACTIVE-Produkt mit Marke grind2 OHNE Kanal geht auf DRAFT; mit Kanal, ohne Marke und DRAFT bleiben unberührt', stati, [['81', 'DRAFT'], ['82', 'ACTIVE'], ['83', 'DRAFT'], ['84', 'ACTIVE']]);
    ist('...Freigabe-Ledger: ZURUECK (bestätigt, mit Grund «Wiederaufnahme»), Hinweis und Zählung; der Lauf macht danach normal weiter (die Webcam wird angelegt)',
      [typen(W.cfg.pfade.freigabeLedger).slice(0, 1), /ZURUECK · Wiederaufnahme: ACTIVE ohne Kanal/.test(lesen(W.cfg.pfade.freigabeLedger)), r.bericht.zaehl.AUFGERAEUMT, r.bericht.hinweise.some(h => /ACTIVE ohne Kanal mit Marke grind2/.test(h)), r.bericht.zaehl.GESCHRIEBEN, r.exit], [['ZURUECK'], true, 1, true, 1, 0]);
    W.weg();
    // die Rücknahme wird nicht bestätigt (der Shop meldet weiter ACTIVE): Exit 1, NICHTS Neues angelegt
    const W2 = await seeds([{ status: 'ACTIVE', tags: ['grind2'], pubs: [] }], { zurueckgelesen: 'ACTIVE' });
    const r2 = await lauf(W2.cfg, W2.io);
    ist('Aufräumen ohne Bestätigung: ZURUECK_FEHLGESCHLAGEN, Exit 1, es wird nichts Neues angelegt', [r2.exit, typen(W2.cfg.pfade.freigabeLedger), W2.aus('productSet').length], [EXIT.FEHLER, ['ZURUECK_FEHLGESCHLAGEN'], 0]);
    W2.weg();
    // nur LIVE räumt auf; ohne Treffer kostet es eine Abfrage und ändert nichts
    const W3 = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
    await lauf(W3.cfg, W3.io);
    ist('Trockenlauf und Probe lesen den Shop nicht (kein Aufräumen)', W3.aus('aufraeumen').length, 0);
    W3.weg();
    const W4 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W4);
    await lauf(W4.cfg, W4.io);
    ist('LIVE ohne Altlasten: genau eine Abfrage, kein Eingriff, die Webcam wird normal angelegt', [W4.aus('aufraeumen').length, W4.aus('status').length, W4.aus('productSet').length], [1, 0, 1]);
    W4.weg();
    // die Abfrage fällt aus: kein Schreiben ohne dieses Netz
    const W5 = welt(standardSz(), { LIVE: '1', ZIELE: 'webcams', LIMIT: '1' }); frei(W5);
    mit(W5, async (u, init) => { if (istGql(u) && gqlText(init) === GM.AKTIV_OHNE_KANAL) return antwort({}, 500); });
    let fehler = ''; try { await lauf(W5.cfg, W5.io); } catch (e) { fehler = e.message; }
    ist('Fällt die Aufräum-Abfrage aus, bricht LIVE ab, bevor etwas angelegt wird', [/GraphQL/.test(fehler), W5.aus('productSet').length], [true, 0]);
    W5.weg();
  }

  // ── 13. Mutationslücken der Gegenlesung (A15, C14, K07)
  {
    const cfg = konfigAus({}, '/x');
    const p = (kosten) => ({ ok: true, varianten: kosten.map(k => ({ ok: true, kosten: k })), maxPreis: 40, margeMin: 0.31, flaggen: [] });
    ist('A15: der Einstand fürs Urteil ist der KLEINSTE (min), nicht der grösste: Kosten [1.0, 5.0] bei Mindest-Einstand 2 → abgelehnt', [preisUrteil(p([1.0, 5.0]), cfg).ok, preisUrteil(p([2.0, 5.0]), cfg).ok, preisUrteil(p([5.0, 1.0]), cfg).ok], [false, true, false]);
    const l = { ziele: [{ id: 'r1', name: 'R', rang: 1, welle: 'R', ziel: 10, luecke: 9, cj: '', cjSuche: 'a', risiko: 'Babyprodukt' }, { id: 'a1', name: 'A', rang: 5, welle: '1', ziel: 10, luecke: 9, cj: '', cjSuche: 'b' }, { id: 's1', name: 'S', rang: 9, welle: 'S', ziel: 10, luecke: 9, cj: '', cjSuche: 'c' }] };
    ist('K07: Handprüfung-Ziele (Welle R) kommen in der Reihenfolge HINTEN, auch wenn man ihre Welle ausdrücklich zulässt (Rang 3 nach S, 1, Z)', bedarfAus(l, { wellen: ['S', '1', 'R'] }).map(z => z.id), ['s1', 'a1', 'r1']);
    // C14: ein gespeicherter Plan hat die Dublettenprüfung dieses Index nicht durchlaufen → im Trockenlauf wird sie nachgeholt
    const W = welt(standardSz(), { ZIELE: 'webcams', LIMIT: '1' });
    const r1 = await lauf(W.cfg, W.io);
    const q1 = W.aus('cj').filter(x => x.pfad === 'product/query').length;
    // der Vorfilter kennt nur pid und productSku der Liste, NICHT den Handle des Plans: ein Shop-Produkt, das erst nach der Planung diesen Handle belegt, trifft nur die Prüfung des gespeicherten Plans
    W.io.index = DB.baueIndex({ produkte: [{ id: 'gid://shopify/Product/9', handle: planVon(W).handle, title: 'Etwas ganz anderes', status: 'ACTIVE', skus: ['XYZ-9'] }] }, { stand: new Date().toISOString() });
    const r2 = await lauf(W.cfg, W.io);
    ist('C14: zwischen zwei Trockenläufen belegt im Shop ein anderes Produkt den Handle des Plans → der gespeicherte Plan wird wegen der Dublette verworfen (UEBERSPRUNGEN statt PLAN), ohne neue Abfrage', [r1.bericht.zaehl, r2.bericht.zaehl, /Dublette: Handle/.test(r2.bericht.zeilen[0]?.entscheid || ''), W.aus('cj').filter(x => x.pfad === 'product/query').length], [{ PLAN: 1 }, { UEBERSPRUNGEN: 1 }, true, q1]);
    W.weg();
  }

  // ── 14. Vorfilter (Liste, Name) kennt Kinderware und die zusätzlichen Sperrwörter
  {
    ist('sperrwort(): Kinderware im englischen Namen (Kids, Infant, Toddler, Newborn, Pacifier, Teether) und die Zusatzliste (Brass Knuckles, Herb Grinder, Hidden Spy Camera)',
      ['Kids Smart Watch', 'Infant Teether Silicone', 'Toddler Walking Shoes', 'Newborn Photo Props', 'Pacifier Clip Chain'].map(n => /^Kinderware/.test(sperrwort(n) ?? '')).concat(['Brass Knuckles Keychain', 'Herb Grinder Metal', 'Mini Hidden Spy Camera Pen'].map(n => /^heikel/.test(sperrwort(n) ?? ''))), [true, true, true, true, true, true, true, true]);
    ist('sperrwort(): Gegenproben (Farbe «Baby Pink», «Baby\'s Breath», Kaffeemühle) bleiben frei', ['Baby Pink Hoodie Women', "Baby's Breath Dried Flowers", 'Coffee Grinder Electric Burr Mill', 'Smart Watch Blood Oxygen Heart Rate'].map(n => sperrwort(n)), [null, null, null, null]);
    const W = welt(standardSz(), {}); void W; W.weg();
  }
}

// ── 15. CI: jede Testdatei der Grind-Pipeline steht im Workflow (vorher lief KEINE davon in einem Workflow: ein Test, der nie läuft, ist kein Test)
{
  const AUTO = dirname(fileURLToPath(import.meta.url)), ROOT = dirname(AUTO);
  const yml = join(ROOT, '.github', 'workflows', 'luxestyle-automation-tests.yml');
  const GRIND_TESTS = /^(grind\w*|cj_fracht|cj_response|cj_fetch|stecker_cj|fakten_block|lieferbarkeit|varianten_sicherheit)_test\.mjs$/;
  const dateien = [...readdirSync(AUTO).filter(f => GRIND_TESTS.test(f)).map(f => `automation/${f}`), ...readdirSync(join(AUTO, 'lib')).filter(f => GRIND_TESTS.test(f)).map(f => `automation/lib/${f}`)].sort();
  ist('CI-Probe: das Muster findet die 13 Testdateien der Pipeline (kein totes Muster)', dateien.length >= 13, true);
  if (!existsSync(yml)) console.log('  (übersprungen: .github/workflows/luxestyle-automation-tests.yml ist in diesem Checkout nicht vorhanden)');
  else {
    const text = readFileSync(yml, 'utf8');
    const laufend = new Set([...text.matchAll(/^\s*node\s+(?:--test\s+)?(automation\/\S+_test\.mjs)/gm)].map(x => x[1]));
    ist('CI: jede Testdatei der Grind-Pipeline (grind*, cj_fracht, cj_response, cj_fetch, stecker_cj, fakten_block, lieferbarkeit, varianten_sicherheit) wird im Workflow als eigener Befehl «node …» aufgerufen (ein Treffer in einem Kommentar zählt nicht)', dateien.filter(f => !laufend.has(f)), []);
    // GRIND2_TEST=1 ist der Schalter der Tests (hebt Obergrenzen an und erlaubt eine andere Freigabedatei): in keinem Workflow darf er stehen
    const wfDir = join(ROOT, '.github', 'workflows');
    ist('CI: GRIND2_TEST (Testschalter, lockert Pflichtgrenzen) steht in keinem Workflow', readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f) && /GRIND2_TEST/.test(readFileSync(join(wfDir, f), 'utf8'))), []);
    ist('CI: die Workflow-Datei steht in der sparse-checkout-Liste (sonst fände dieser Test sie im Workflow nicht und übersprünge sich still)', /sparse-checkout: \|[\s\S]*?\n\s+\.github\/workflows\/luxestyle-automation-tests\.yml\n/.test(text), true);
  }
}

// <<< ENDE EINSCHUB PRUEFUNG-2710

// ── Zusammenfassung
console.log(`\n${ok} ok, ${fehl} Fehler`);
if (fehl) process.exit(1);
