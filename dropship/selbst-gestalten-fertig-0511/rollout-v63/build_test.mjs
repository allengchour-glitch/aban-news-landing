import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bauen, panel84Pruefen } from './build.mjs';

let n = 0; const errors = [];
function test(name, ok, detail = '') { n++; if (!ok) { errors.push(`${name}: ${detail}`); console.log(`x ${name} ${detail}`); } }

function editorHelpers() {
  const g = { Shopify: { locale: 'de-CH' }, location: { search: '' }, console, setTimeout: () => 0, addEventListener() {} };
  g.window = g;
  g.document = { readyState: 'complete', documentElement: { lang: 'de-CH' }, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  const context = vm.createContext(g);
  vm.runInContext(readFileSync(resolve('pod/v6/lspod-designer-v6-6.3.0.js'), 'utf8'), context);
  return g.LSPOD6.hilfen;
}

let missingPanelBlocked = false;
try { bauen({ write: false }); } catch (error) { missingPanelBlocked = /PANEL84_EXPLICIT_APPROVAL_MISSING/.test(String(error)); }
test('PANEL84 braucht auch bei Import einen expliziten Schalter', missingPanelBlocked);
const { allow, outputs, report } = bauen({ write: false, panelModels: [84] });
const H = editorHelpers();
test('vollstaendiger Printful-Scope', outputs.length === 18 && outputs.reduce((sum, output) => sum + output.variants, 0) === 244);
test('Status-Scope 9/73 + 7/167 + 2/4', report.readyPreviewProductCount === 9 && report.readyPreviewVariantCount === 73
  && report.readyBindingProductCount === 7 && report.readyBindingVariantCount === 167 && report.blockedProductCount === 2 && report.blockedVariantCount === 4);
test('aktives Nicht-Printful-Produkt bleibt ausgeschlossen', report.excludedActiveCount === 1 && allow.blocked[0].handle === 'buegeltransfer-selbst-gestalten');
test('Katalogbeleg 22/22 ohne Fehler', report.catalogEvidence.workflowRun === 42475585326 && report.catalogEvidence.branchCommit === '68975230b' && report.catalogEvidence.filesRead === 22 && report.catalogEvidence.errors.length === 0);
test('regionale Unbekannt-Werte bleiben unbekannt', report.availabilityUnknown.length === 4 && report.availabilityUnknown.every((entry) => entry.euStatus === 'unknown'));
test('Magnet hat drei unbekannte EU-Werte', report.availabilityUnknown.filter((entry) => entry.model === 656).length === 3);
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
test('Map-Route ist explizit CORS/CORP-freigegeben', /\/pod\/v6\/maps\/\*[\s\S]*Access-Control-Allow-Origin: \*[\s\S]*Cross-Origin-Resource-Policy: cross-origin/.test(headers));

if (errors.length) { console.error(`\n${errors.length} von ${n} Pruefungen fehlgeschlagen`); process.exit(1); }
console.log(`\n${n} Pruefungen bestanden`);
