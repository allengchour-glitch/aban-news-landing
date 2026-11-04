// Katalogfenster «Selbst gestalten» (Sektion luxe-clothing im MAIN-Theme), Stand 04.11.2026:
//  1. EU-Schuhgrössen und ml/g statt oz als Etiketten (assets/luxe-clothing-reference-gallery.json, Feld variants[].displaySizeCh)
//  2. Grössenfilter und Filter-Chip zeigen bei mehreren Etiketten ALLE statt des US-Rohwerts
//  3. Knopf «Jetzt selbst gestalten» (führt auf die Produktseite mit dem echten Editor), ehrliche Texte für nicht bestellbare Modelle/Ausführungen
//  4. Sprung-Skript auf Produktseiten mit Editor (der Anker #lspod-start landete auf dem Desktop 536 px unterhalb des Fensters)
// Reine Textarbeit: anwenden(dateien) bekommt die sieben Live-Texte und liefert die neuen; jede Ankerstelle muss GENAU EINMAL vorkommen.
import { inGalerieEinfuegen } from './etiketten.mjs';

export const DATEIEN = {
  JS: 'assets/luxe-clothing.js',
  CSS: 'assets/luxe-clothing.css',
  GALERIE: 'assets/luxe-clothing-reference-gallery.json',
  SECTION: 'sections/luxe-clothing.liquid',
  DE: 'locales/de.json',
  EN: 'locales/en.default.json',
  BUY: 'blocks/buy-buttons.liquid',
};
// MD5 der Live-Dateien VOR dem Eingriff (gemessen 04.11.2026 ca. 22:20 UTC, Admin-API; lokale Kopie byte-gleich).
export const MD5_VOR = {
  [DATEIEN.JS]: '66998e1ab2df428bec60ed0bc7e0cf78',
  [DATEIEN.CSS]: 'ce07203b9525d83d8d7366b51799ad88',
  [DATEIEN.GALERIE]: '7bc83b6ec989b72804554a8c7f5f5436',
  [DATEIEN.SECTION]: '88cfc0a382c60e792ca61f8d430d9525',
  [DATEIEN.DE]: 'cf07635898956f99cdedd88c95e65af5',
  [DATEIEN.EN]: '5eed965fe4e7c88612ed8f34517b1c18',
  [DATEIEN.BUY]: 'a1f3b6caa3e39cad43abff2037734078',
};
export const MARKE = 'lx-einheiten-0411';

// Reihenfolge beim Schreiben: Texte und Section zuerst (t() zeigt bei fehlendem Label den rohen Schlüsselnamen), JS/CSS zuletzt.
export const SCHREIB_REIHENFOLGE = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE, DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];

const einmal = (text, anker, ersatz, name) => {
  const teile = text.split(anker);
  if (teile.length !== 2) throw new Error(`Anker «${name}» kommt ${teile.length - 1}× vor (erwartet genau 1)`);
  return teile[0] + ersatz + teile[1];
};

// ---------- Texte ----------
export const TEXTE = {
  de: {
    notice: 'Produktkatalog zur Auswahl. Modelle mit dem Knopf «Jetzt selbst gestalten» lassen sich im Shop gestalten und bestellen; alle anderen sind noch nicht bestellbar. Preise zeigen wir nur, wo es ein Shopprodukt gibt. Schuhgrössen stehen in der Europa-Tabelle des Herstellers, Werte mit «ca.» können leicht abweichen.',
    shop_price_note: 'Gestaltet und bestellt wird auf der Produktseite im Shop.',
    design_cta: 'Jetzt selbst gestalten',
    not_orderable: 'Noch nicht bestellbar: Für dieses Modell gibt es bei LuxeStyle noch kein Produkt zum Selbstgestalten.',
    variant_not_orderable: 'Diese Ausführung ist noch nicht bestellbar. Andere Ausführungen dieses Modells kannst du gestalten.',
    switch_orderable: 'Zu einer bestellbaren Ausführung wechseln',
    offer_unavailable: 'Diese Ausführung ist derzeit nicht lieferbar.',
  },
  en: {
    notice: 'Product catalogue. Models with the «Design it yourself now» button can be designed and ordered in the shop; all others cannot be ordered yet. Prices are shown only where a shop product exists. Shoe sizes follow the manufacturer\'s European size chart; values marked «ca.» may differ slightly.',
    shop_price_note: 'You design and order on the product page in the shop.',
    design_cta: 'Design it yourself now',
    not_orderable: 'Not available to order yet: LuxeStyle does not offer this model for custom design yet.',
    variant_not_orderable: 'This variant cannot be ordered yet. You can design other variants of this model.',
    switch_orderable: 'Switch to an orderable variant',
    offer_unavailable: 'This variant is currently unavailable.',
  },
};
const NEUE_SCHLUESSEL = ['design_cta', 'not_orderable', 'variant_not_orderable', 'switch_orderable', 'offer_unavailable'];
const GEAENDERTE_SCHLUESSEL = ['notice', 'shop_price_note'];

// Findet den Block «"luxe_clothing": { … }» (zeichenkettenbewusst) und liefert [anfang, ende] der Klammern.
function blockGrenzen(text, name) {
  const marke = `"${name}": {`;
  const teile = text.split(marke);
  if (teile.length !== 2) throw new Error(`Block «${name}» kommt ${teile.length - 1}× vor (erwartet 1)`);
  const open = text.indexOf(marke) + marke.length - 1;
  let tiefe = 0, inStr = false, esc = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') tiefe++;
    else if (c === '}') { tiefe--; if (tiefe === 0) return [open, i]; }
  }
  throw new Error('Block nicht geschlossen');
}
export function ohneKommentar(text) { return text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''); }

function sprachdatei(text, sprache) {
  const [a, e] = blockGrenzen(text, 'luxe_clothing');
  let block = text.slice(a, e + 1);
  if (block.includes('"design_cta"')) throw new Error('Sprachdatei trägt die neuen Schlüssel schon');
  for (const k of GEAENDERTE_SCHLUESSEL) {
    const re = new RegExp(`^(\\s*"${k}": )"(?:[^"\\\\]|\\\\.)*"(,?)\\s*$`, 'm');
    const treffer = block.match(new RegExp(re.source, 'gm')) || [];
    if (treffer.length !== 1) throw new Error(`Schlüssel «${k}» kommt im Block ${treffer.length}× vor (erwartet 1)`);
    block = block.replace(re, (_m, vorn, komma) => `${vorn}${JSON.stringify(TEXTE[sprache][k])}${komma}`);
  }
  const zeile = block.match(/^(\s*)"shop_product_link": "(?:[^"\\]|\\.)*",?\s*$/m);
  if (!zeile) throw new Error('Anker shop_product_link fehlt');
  const einzug = zeile[1];
  const neu = NEUE_SCHLUESSEL.map((k) => `${einzug}${JSON.stringify(k)}: ${JSON.stringify(TEXTE[sprache][k])},`).join('\n');
  const mitKomma = zeile[0].trimEnd().endsWith(',') ? zeile[0].trimEnd() : zeile[0].trimEnd() + ',';
  block = block.replace(zeile[0], `${mitKomma}\n${neu}`);
  return text.slice(0, a) + block + text.slice(e + 1);
}

// ---------- Section ----------
function section(text) {
  if (text.includes("'luxe_clothing.design_cta'")) throw new Error('Section trägt die neuen Labels schon');
  const anker = `      "shop_product_link": {{ 'luxe_clothing.shop_product_link' | t | json }},\n`;
  const neu = NEUE_SCHLUESSEL.map((k) => `      "${k}": {{ 'luxe_clothing.${k}' | t | json }},\n`).join('');
  return einmal(text, anker, anker + neu, 'Section shop_product_link');
}

// ---------- CSS ----------
export const CSS_NEU = `
/* ${MARKE}: Knopf «Jetzt selbst gestalten» und Hinweise im Katalogfenster */
.lcl-design-cta{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;margin:2px 0 12px;padding:12px 16px;background:#2b261f;color:#fff!important;border:0;border-radius:6px;font-size:15px;font-weight:600;line-height:1.3;text-decoration:none}
.lcl-design-cta:hover{background:#463d31}
.lcl-design-cta:focus-visible{outline:2px solid #63584a;outline-offset:3px}
.lcl-design-switch{display:block;width:100%;min-height:44px;margin-top:10px;padding:10px 14px;border:1px solid #bfae94;border-radius:6px;background:#fff;color:#30291f;font-size:14px}
.lcl-not-orderable{font-weight:600}
`;
function css(text) {
  if (text.includes(MARKE)) throw new Error('CSS trägt die Marke schon');
  return text.replace(/\s*$/, '\n') + CSS_NEU;
}

// ---------- JS ----------
const JS_FILTER_HELFER = `    const joinSizeLabels = labels => {const eu=labels.filter(x=>/^EU\\s/.test(x)), rest=labels.filter(x=>!/^EU\\s/.test(x)), cmp=(a,b)=>a.localeCompare(b,config.locale||'de',{numeric:true});return labels.length<2?(labels[0]||''):[...eu.sort(cmp),...rest.sort(cmp)].join(' / ');};\n`;
function js(text) {
  if (text.includes(MARKE)) throw new Error('JS trägt die Marke schon');
  let t = text;
  // 1. Helfer für mehrere Grössenetiketten (vor titleForProduct, nach displaySize)
  t = einmal(t, `    const titleForProduct = product => {\n`, JS_FILTER_HELFER + `    const titleForProduct = product => {\n`, 'JS titleForProduct');
  // 2. Grössenfilter: alle Etiketten statt US-Rohwert
  t = einmal(t, `return new Option(labels.length===1?labels[0]:metricText(value),value);`, `return new Option(labels.length?joinSizeLabels(labels):metricText(value),value);`, 'JS Filter-Option');
  // 3. Filter-Chip: dasselbe
  t = einmal(t, `sizeLabels.length===1?sizeLabels[0]:metricText(sizeFilter.value)`, `sizeLabels.length?joinSizeLabels(sizeLabels):metricText(sizeFilter.value)`, 'JS Filter-Chip');
  // 4. Knopf und ehrliche Anzeige im Preisfeld
  t = einmal(t,
    `      let priceChoiceVariant='',priceChoiceId='';\n      const renderPrice = () => {\n`,
    `      let priceChoiceVariant='',priceChoiceId='';\n      const designUrl=u=>{try{const x=new URL(u,location.href);x.hash='lspod-start';return x.href;}catch{return u;}};\n      const orderableVariants=variants.filter(v=>offersFor(v).offers.some(o=>o.available!==false));\n      const renderPrice = () => {\n`,
    'JS renderPrice-Kopf');
  t = einmal(t,
    `        if(offer){priceBox.append(el('p','lcl-retail-price',offer.priceFormatted));const link=el('a','lcl-shop-product-link',t('shop_product_link'));link.href=offer.url;priceBox.append(link);}else priceBox.append(el('p','lcl-price-pending',t(data.offers.length?'shop_price_ambiguous':'shop_price_unknown')));\n`,
    `        if(offer){priceBox.append(el('p','lcl-retail-price',offer.priceFormatted));if(offer.available===false)priceBox.append(el('p','lcl-price-pending lcl-not-orderable',t('offer_unavailable')));else{const cta=el('a','lcl-button lcl-design-cta',t('design_cta'));cta.href=designUrl(offer.url);cta.dataset.lclDesignCta='';priceBox.append(cta);}const link=el('a','lcl-shop-product-link',t('shop_product_link'));link.href=offer.url;priceBox.append(link);}\n        else if(data.offers.length)priceBox.append(el('p','lcl-price-pending',t('shop_price_ambiguous')));\n        else{priceBox.append(el('p','lcl-price-pending lcl-not-orderable',t(orderableVariants.length?'variant_not_orderable':'not_orderable')));if(orderableVariants.length){const sw=button(t('switch_orderable'),()=>{referencePreview=false;selected=orderableVariants.find(v=>colorKey(v)===selectedColor)||orderableVariants[0];selectedColor=colorKey(selected);update();},'lcl-design-switch');priceBox.append(sw);}}\n`,
    'JS Preis-Zweig');
  t = einmal(t,
    `        priceBox.append(el('p','lcl-small',t('shop_price_note')));if(keepFocus && chooser)chooser.focus({preventScroll:true});`,
    `        if(offer)priceBox.append(el('p','lcl-small',t('shop_price_note')));if(keepFocus && chooser)chooser.focus({preventScroll:true});`,
    'JS shop_price_note');
  return t.replace(/\s*$/, '\n') + `/* ${MARKE} */\n`;
}

// ---------- Produktseite: Sprung zum Editor ----------
export const SPRUNG_SKRIPT = `
            <script>
              /* ${MARKE}: Sprung zum Editor (#lspod-start): die rechte Spalte ist sticky und höher als das Fenster, der blosse Anker landete unterhalb */
              (function () {
                var ziel = function () {
                  var d = document.getElementById('lspod-start');
                  if (!d) return;
                  var y = d.getBoundingClientRect().top + window.scrollY - 100;
                  try { window.scrollTo({ top: y, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
                };
                var gehe = function () { ziel(); setTimeout(ziel, 150); setTimeout(ziel, 450); };
                if (location.hash === '#lspod-start') window.addEventListener('load', gehe);
                document.addEventListener('click', function (e) {
                  var a = e.target.closest && e.target.closest('a[href="#lspod-start"]');
                  if (!a) return;
                  e.preventDefault();
                  try { history.replaceState(null, '', '#lspod-start'); } catch (x) {}
                  gehe();
                });
              })();
            </script>`;
function buy(text) {
  if (text.includes(MARKE)) throw new Error('buy-buttons trägt die Marke schon');
  const anker = `                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setzen);\n                else setzen();\n              })();\n            </script>`;
  return einmal(text, anker, anker + SPRUNG_SKRIPT, 'buy-buttons Skript');
}

// ---------- Galerie ----------
export function galerie(text, etiketten) {
  const g = JSON.parse(text);
  if (g.schemaVersion !== 1 || !Array.isArray(g.products)) throw new Error('Galerie hat nicht das erwartete Format');
  // Format des Originals erhalten (gemessen: JSON.stringify(…, null, 2) plus Zeilenumbruch, byte-gleich)
  if (JSON.stringify(g, null, 2) + '\n' !== text) throw new Error('Galerie hat nicht das erwartete Format (2 Leerzeichen Einrückung): Rundreise nicht byte-gleich');
  const { galerie: neu, stat } = inGalerieEinfuegen(g, etiketten.produkte);
  return { text: JSON.stringify(neu, null, 2) + '\n', stat };
}

// dateien: {Dateiname: Text}; etiketten: Inhalt von daten/etiketten.json. Rückgabe: {Dateiname: neuer Text}
export function anwenden(dateien, etiketten) {
  const out = {};
  out[DATEIEN.DE] = sprachdatei(dateien[DATEIEN.DE], 'de');
  out[DATEIEN.EN] = sprachdatei(dateien[DATEIEN.EN], 'en');
  out[DATEIEN.SECTION] = section(dateien[DATEIEN.SECTION]);
  out[DATEIEN.GALERIE] = galerie(dateien[DATEIEN.GALERIE], etiketten).text;
  out[DATEIEN.CSS] = css(dateien[DATEIEN.CSS]);
  out[DATEIEN.JS] = js(dateien[DATEIEN.JS]);
  out[DATEIEN.BUY] = buy(dateien[DATEIEN.BUY]);
  return out;
}
