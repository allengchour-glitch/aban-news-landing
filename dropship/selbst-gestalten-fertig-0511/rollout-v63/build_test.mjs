import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bauen, chBelegLaden, panel84Pruefen } from './build.mjs';
import { chBelegPruefen } from './allowlist_bauen.mjs';
import { karteFuerEditor } from '../../../pod/v6/werkzeug/karte_fuer_editor.mjs';

let n = 0; const errors = [];
function test(name, ok, detail = '') { n++; if (!ok) { errors.push(`${name}: ${detail}`); console.log(`x ${name} ${detail}`); } }

function editorHelpers(version = '6.3.1') {
  const g = { Shopify: { locale: 'de-CH' }, location: { search: '' }, console, setTimeout: () => 0, addEventListener() {} };
  g.window = g;
  g.document = { readyState: 'complete', documentElement: { lang: 'de-CH' }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  const context = vm.createContext(g);
  vm.runInContext(readFileSync(resolve(`pod/v6/lspod-designer-v6-${version}.js`), 'utf8'), context);
  return g.LSPOD6.hilfen;
}

let missingPanelBlocked = false;
try { bauen({ write: false }); } catch (error) { missingPanelBlocked = /PANEL84_EXPLICIT_APPROVAL_MISSING/.test(String(error)); }
test('PANEL84 braucht auch bei Import einen expliziten Schalter', missingPanelBlocked);
const { allow, outputs, report } = bauen({ write: false, panelModels: [84] });
const H = editorHelpers();
test('vollstaendiger Printful-Scope', outputs.length === 18 && outputs.reduce((sum, output) => sum + output.variants, 0) === 244);
test('Status-Scope 9/73 + 8/170 + 1/1', report.readyPreviewProductCount === 9 && report.readyPreviewVariantCount === 73
  && report.readyBindingProductCount === 8 && report.readyBindingVariantCount === 170 && report.blockedProductCount === 1 && report.blockedVariantCount === 1);
test('einziger Printful-Blocker ist die Dad-Cap', JSON.stringify(outputs.filter((output) => output.status === 'blocked').map((output) => output.handle)) === '["dad-cap-selbst-gestalten"]');
test('aktives Nicht-Printful-Produkt bleibt ausgeschlossen', report.excludedActiveCount === 1 && allow.blocked[0].handle === 'buegeltransfer-selbst-gestalten');
test('Katalogbeleg 22/22 ohne Fehler', report.catalogEvidence.workflowRun === 42475585326 && report.catalogEvidence.branchCommit === '68975230b' && report.catalogEvidence.filesRead === 22 && report.catalogEvidence.errors.length === 0);
test('regionale Unbekannt-Werte bleiben unbekannt', report.availabilityUnknown.length === 4 && report.availabilityUnknown.every((entry) => entry.euStatus === 'unknown'));
test('Magnet hat drei unbekannte EU-Werte', report.availabilityUnknown.filter((entry) => entry.model === 656).length === 3);

// ---- Magnet (Modell 656), freigegeben am 11.11.2026: nur mit Beleg der Schweizer Lieferbarkeit ----
{
  const magnet = allow.products.find((product) => product.handle === 'magnet-zum-selbstgestalten');
  const magnetOut = outputs.find((output) => output.handle === 'magnet-zum-selbstgestalten');
  const karte = JSON.parse(magnetOut.text);
  test('Magnet: ready-binding, drei Varianten, keine Vorschau, keine Sperrgruende', magnet.rolloutStatus === 'ready-binding' && magnet.variants.length === 3 && magnet.previewAsset === null && magnet.reasonCodes.length === 0 && magnetOut.previewText === null);
  test('Magnet: Karte ist keine Sperrkarte und traegt die technische Klasse FLACH', karte.blocked === undefined && karte.printfulProductId === 656 && karte.klasse === 'FLACH');
  test('Magnet: Shopify-Variante -> Printful-Variante wie im Shop gelesen (SKU 9000001_<Printful-Variante>)', JSON.stringify(karte.shop.varianten) === JSON.stringify({ 55791941812609: 16366, 55791941845377: 16367, 55791941878145: 16465 }));
  const jeVariante = karte.varianten.map((variant) => {
    const id = karte.druckdateiGruppen[variant.druckdateiGruppe].platzierungen.default; const d = karte.druckdateien[id];
    return [variant.printfulVariantId, id, d.breitePx, d.hoehePx, d.dpi];
  });
  test('Magnet: jede Variante hat ihre eigene quadratische Druckdatei (900, 1200, 1800 px bei 300 dpi = 3, 4, 6 Zoll)', JSON.stringify(jeVariante) === JSON.stringify([[16366, 183, 900, 900, 300], [16367, 184, 1200, 1200, 300], [16465, 419, 1800, 1800, 300]]), JSON.stringify(jeVariante));
  test('Magnet: je Druckdatei eine eigene Vorlagengeometrie, nur die kostenlose Flaeche «default»', karte.platzierungen.length === 1 && karte.platzierungen[0].id === 'default' && JSON.stringify(karte.platzierungen[0].geometrien.map((g) => [g.printfileId, g.vorlage.flaecheBreite, g.vorlage.flaecheHoehe])) === '[[183,518,518],[184,590,590],[419,699,699]]');
  // reine Editor-Logik (kein Browser): 6.3.1 (Referenz), 6.4.0 (live am 11.11.2026) und 6.4.2 (bereit) lesen dieselbe Karte gleich
  for (const version of ['6.3.1', '6.4.0', '6.4.2']) {
    const HV = version === '6.3.1' ? H : editorHelpers(version);
    const norm = HV.karteNormalisieren(karte);
    test(`Magnet: der Editor ${version} (reine Logik) liest die Zuordnung Shopify-Variante -> Printful-Variante`, Boolean(norm.karte) && JSON.stringify(norm.karte.shop) === JSON.stringify({ 55791941812609: 16366, 55791941845377: 16367, 55791941878145: 16465 }), JSON.stringify(norm.karte?.shop) + ' ' + (norm.fehler || ''));
    const geo = norm.karte ? [16366, 16367, 16465].map((pv) => { const g = HV.geometrieFuer(norm.karte, norm.karte.platzierungen[0], pv); return [g.printfile.printfileId, g.printfile.breitePx, g.printfile.hoehePx, g.printfile.dpi, g.vorlage.flaecheBreite]; }) : null;
    test(`Magnet: der Editor ${version} nimmt je Variante die eigene Druckdatei und Vorlagengeometrie`, JSON.stringify(geo) === '[[183,900,900,300,518],[184,1200,1200,300,590],[419,1800,1800,300,699]]', JSON.stringify(geo));
  }
  test('Magnet: CH-Beleg ist an die Allowlist gebunden (Pfad, SHA-256, drei Varianten)', allow.source.availabilityCh?.path === 'source/lieferbarkeit-ch-1111.json' && /^[a-f0-9]{64}$/.test(allow.source.availabilityCh.sha256) && JSON.stringify(allow.source.availabilityCh.products) === JSON.stringify([{ handle: 'magnet-zum-selbstgestalten', model: 656, printfulVariantIds: [16366, 16367, 16465] }]));
  test('Magnet: der Bau meldet den Beleg im Bericht', JSON.stringify(report.availabilityCh.handles) === '["magnet-zum-selbstgestalten"]' && report.availabilityCh.evidence === 'source/lieferbarkeit-ch-1111.json');
  const beleg = JSON.parse(readFileSync(resolve('dropship/selbst-gestalten-fertig-0511/rollout-v63/source/lieferbarkeit-ch-1111.json'), 'utf8'));
  const produkt = { shopifyHandle: magnet.handle, variants: magnet.variants };
  const wirft = (fn, rx) => { try { fn(); return false; } catch (error) { return rx.test(String(error.message)); } };
  const mut = (aendern) => { const kopie = JSON.parse(JSON.stringify(beleg)); aendern(kopie); return kopie; };
  test('CH-Beleg: der echte Beleg besteht (Lager und Rate je Variante)', chBelegPruefen(beleg, produkt, 656) === true);
  test('CH-Beleg: jede der drei Varianten traegt eine Rate in CHF mit Lieferzeit', beleg.modelle['656'].varianten.length === 3 && beleg.modelle['656'].varianten.every((v) => v.inStock === true && v.raten.some((r) => Number(r.chf) > 0 && r.tageMin > 0 && r.tageMax >= r.tageMin)));
  test('CH-Beleg: fehlende Variante bricht ab', wirft(() => chBelegPruefen(mut((b) => { b.modelle['656'].varianten.pop(); }), produkt, 656), /CH_DELIVERY_EVIDENCE_MISSING.*16465/));
  test('CH-Beleg: Variante nicht auf Lager bricht ab', wirft(() => chBelegPruefen(mut((b) => { b.modelle['656'].varianten[1].inStock = false; }), produkt, 656), /nicht auf Lager/));
  test('CH-Beleg: Variante ohne Rate bricht ab', wirft(() => chBelegPruefen(mut((b) => { b.modelle['656'].varianten[0].raten = []; }), produkt, 656), /keine Schweizer Versandrate/));
  test('CH-Beleg: Rate 0 CHF oder ohne Lieferzeit zaehlt nicht', wirft(() => chBelegPruefen(mut((b) => { b.modelle['656'].varianten[0].raten[0].chf = '0'; }), produkt, 656), /keine Schweizer Versandrate/) && wirft(() => chBelegPruefen(mut((b) => { delete b.modelle['656'].varianten[2].raten[0].tageMin; }), produkt, 656), /keine Schweizer Versandrate/));
  test('CH-Beleg: fehlendes Modell, doppelte Variante, fremdes Schema brechen ab', wirft(() => chBelegPruefen(mut((b) => { delete b.modelle['656']; }), produkt, 656), /Modell 656 fehlt/) && wirft(() => chBelegPruefen(mut((b) => { b.modelle['656'].varianten.push(b.modelle['656'].varianten[0]); }), produkt, 656), /nicht genau einmal/) && wirft(() => chBelegPruefen(mut((b) => { b.schema = 2; }), produkt, 656), /Schema 1/));
  test('CH-Beleg: ein Produkt mit einer Variante eines anderen Modells bricht ab', wirft(() => chBelegPruefen(beleg, { shopifyHandle: 'x', variants: [...magnet.variants, { printfulProductId: 358, printfulVariantId: 10163 }] }, 656), /ausserhalb von Modell 656/));
  test('Bau: ein veraenderter Beleg (SHA weicht von der Allowlist ab) bricht ab', wirft(() => chBelegLaden(allow, () => Buffer.from(JSON.stringify(mut((b) => { b.modelle['656'].varianten[0].raten[0].chf = '9.99'; })))), /CH_DELIVERY_EVIDENCE_MISMATCH/));
  test('Bau: ohne Eintrag in der Allowlist gilt kein Produkt als CH-belegt', chBelegLaden({ ...allow, source: { ...allow.source, availabilityCh: undefined } }).size === 0);
  const katalog656 = JSON.parse(readFileSync(resolve('dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/katalog/656.json'), 'utf8'));
  test('Kartenwerkzeug: ohne lieferbarCh bleibt Modell 656 UNGEEIGNET (kein EU-Lager), mit lieferbarCh gilt die Druckgeometrie', karteFuerEditor(katalog656).klasse === 'UNGEEIGNET' && karteFuerEditor(katalog656, { lieferbarCh: true }).klasse === 'FLACH');
}
test('keine freigegebene Karte traegt die Klasse UNGEEIGNET', outputs.filter((output) => output.status !== 'blocked').every((output) => { const card = JSON.parse(output.text); return (card.modelle ? Object.values(card.modelle) : [card]).every((model) => model.klasse !== 'UNGEEIGNET'); }));
test('T-Shirt-Variante 12872 hat unbekannten EU-Wert', report.availabilityUnknown.some((entry) => entry.model === 71 && entry.printfulVariantId === 12872));

for (const output of outputs) {
  const product = allow.products.find((entry) => entry.handle === output.handle);
  const card = JSON.parse(output.text);
  const normalized = H.karteNormalisieren(card);
  if (output.status === 'blocked') {
    test(`${output.handle}: Blocker ist absichtlich nicht zeichenbar`, !normalized.karte && card.blocked === true);
    test(`${output.handle}: Blockergruende exakt`, JSON.stringify(card.reasonCodes) === JSON.stringify(product.reasonCodes));
    test(`${output.handle}: keine Vorschau`, output.previewText === null && output.previewAsset === null);
    continue;
  }
  test(`${output.handle}: Karte ist zeichenbar`, Boolean(normalized.karte), normalized.fehler);
  const models = card.modelle ? Object.values(card.modelle) : [card];
  test(`${output.handle}: nur kostenlose Nicht-Etiketten-Flaechen`, models.every((model) => model.platzierungen.length > 0 && model.platzierungen.every((placement) => placement.art !== 'etikett' && !(Number(placement.aufpreisUsd || 0) > 0) && !(Number(placement.aufpreisChf || 0) > 0))));
  const mapping = card.shop?.varianten || {};
  test(`${output.handle}: jede Shopify-Variante exakt gebunden`, Object.keys(mapping).length === product.variants.length && product.variants.every((variant) => {
    const value = mapping[variant.shopifyVariantId];
    return card.modelle ? Number(value?.pv) === Number(variant.printfulVariantId) && Number(value?.m) === Number(variant.printfulProductId) : Number(value) === Number(variant.printfulVariantId);
  }));
  test(`${output.handle}: Preview nur im geprueften Preview-Scope`, output.status === 'ready-preview' ? Boolean(output.previewText && output.previewAsset) : output.previewText === null && output.previewAsset === null);
  if (output.previewText) test(`${output.handle}: Preview wird vom Editor akzeptiert`, Boolean(H.vorschauNormalisieren(JSON.parse(output.previewText))));
}

const cup = outputs.find((output) => output.handle === 'tasse-zum-selbstgestalten');
const cupCard = JSON.parse(cup.text), cupPreview = JSON.parse(cup.previewText);
test('2-Varianten-Tasse enthaelt nur 1320/4830', JSON.stringify(cupCard.varianten.map((variant) => variant.printfulVariantId)) === '[1320,4830]');
test('2-Varianten-Tasse entfernt Gruppe/Geometrie/Druckdatei 426', !cup.text.includes('426') && JSON.stringify(cupCard.druckdateiGruppen.map((group) => group.platzierungen.default)) === '[43,44]');
test('2-Varianten-Tassenpreview entfernt 16586', JSON.stringify(Object.keys(cupPreview.modelle['19'].tasse)) === '["1320","4830"]');
const fullCup = outputs.find((output) => output.handle === 'keramik-tasse-selbst-gestalten');
test('3-Varianten-Tasse behaelt belegte Variante/Printfile 16586/426', fullCup.text.includes('16586') && fullCup.text.includes('426'));

const panelProduct = allow.products.find((product) => product.models.includes(84));
const panelCard = JSON.parse(outputs.find((output) => output.handle === panelProduct.handle).text);
const panelCatalog = JSON.parse(readFileSync(resolve('dropship/selbst-gestalten-fertig-0511/target-katalog-20261108/katalog/84.json'), 'utf8'));
test('PANEL84 besteht explizite Geometriepruefung', panel84Pruefen(panelCard, panelCatalog, panelProduct) === true);
let badPanel = JSON.parse(JSON.stringify(panelCard)); badPanel.platzierungen[0].vorlage.flaecheBreite = 99999;
let panelBlocked = false; try { panel84Pruefen(badPanel, panelCatalog, panelProduct); } catch { panelBlocked = true; }
test('PANEL84-Geometrieabweichung blockiert', panelBlocked);

const headers = readFileSync(resolve('_headers'), 'utf8');
test('Pod-v6-Route entfernt globales CORP und setzt CORS/CORP einmal', /\/pod\/v6\/\*\s+! Cross-Origin-Resource-Policy\s+Access-Control-Allow-Origin: \*\s+Cross-Origin-Resource-Policy: cross-origin/m.test(headers));
test('Editor-Route ersetzt nur Cache-Control und verdoppelt CORS/CORP nicht', /\/pod\/v6\/lspod-designer-v6-\*\.js\s+! Cache-Control\s+Cache-Control: public, max-age=31536000, immutable/m.test(headers));

if (errors.length) { console.error(`\n${errors.length} von ${n} Pruefungen fehlgeschlagen`); process.exit(1); }
console.log(`\n${n} Pruefungen bestanden`);
