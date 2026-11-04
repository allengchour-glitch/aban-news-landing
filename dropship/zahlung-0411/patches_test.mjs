// Offline-Prüfung der Zahlungs-Symbole (kein Netz): lädt die gesicherten Ausgangsstände, wendet an, prüft Form und Rundweg.
//   node dropship/zahlung-0411/patches_test.mjs [Ordner mit den Sicherungen *.vor]   (Vorgabe: dropship/zahlung-0411/sicherung)
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as P from './patches.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const DIR = process.argv[2] || HIER + 'sicherung';
const md5 = (s) => createHash('md5').update(s).digest('hex');
let fehler = 0, n = 0;
const ok = (b, was) => { n++; if (!b) { fehler++; console.log('FEHLER:', was); } else console.log('ok   :', was); };

const vor = {};
for (const d of P.DATEIEN) { const p = `${DIR}/${d.replace(/\//g, '__')}.vor`; if (!existsSync(p)) { console.log('Sicherung fehlt:', p); process.exit(2); } vor[d] = readFileSync(p, 'utf8'); }
for (const d of P.DATEIEN) ok(md5(vor[d]) === P.MD5_VOR[d], `Basis-md5 ${d}`);

const neu = P.anwenden(vor);
ok(Object.keys(neu).length === 4 && neu[P.SNIPPET] === P.SNIPPET_TEXT, 'vier Ergebnisse (drei Dateien + Snippet)');
for (const d of P.DATEIEN) ok(neu[d].length > vor[d].length, `${d} ist gewachsen (+${neu[d].length - vor[d].length} Byte)`);

// Rundweg
const zurueck = P.zuruecknehmen(neu);
ok(P.DATEIEN.every((d) => zurueck[d] === vor[d]), 'Rundweg byte-gleich für alle drei Dateien');
let doppelt = false; try { P.anwenden({ ...neu }); } catch (e) { doppelt = /schon eingespielt/.test(e.message); }
ok(doppelt, 'zweites Anwenden wird abgelehnt');

// Form der JSON-Vorlagen
const p = P.jsonOhneKopf(neu[P.PRODUKT]);
const pd = p.sections.main.blocks['product-details'];
ok(pd.blocks.lux_zahlungsarten.type === 'custom-liquid' && /render 'lx-zahlungsarten'/.test(pd.blocks.lux_zahlungsarten.settings.custom_liquid), 'product.json: Block ist custom-liquid mit render');
ok(pd.block_order.indexOf('lux_zahlungsarten') === pd.block_order.indexOf('lux_trust') + 1, 'product.json: Block steht direkt hinter lux_trust');
ok(pd.block_order.filter((x) => x === 'lux_zahlungsarten').length === 1, 'product.json: Block genau einmal in der Reihenfolge');
const alt = P.jsonOhneKopf(vor[P.PRODUKT]).sections.main.blocks['product-details'];
ok(alt.block_order.length + 1 === pd.block_order.length && Object.keys(alt.blocks).length + 1 === Object.keys(pd.blocks).length, 'product.json: genau ein Block mehr');
const f = P.jsonOhneKopf(neu[P.FOOTER]);
ok(f.order.join(',') === 'footer_m9NzUG,custom_liquid_lxzahlung,footer_utilities_jLGE8U,custom_liquid_lxpopup,lux_assistent', 'footer-group.json: Reihenfolge');
ok(f.sections.custom_liquid_lxzahlung.type === 'custom-liquid' && f.sections.custom_liquid_lxzahlung.settings.color_scheme === f.sections.footer_m9NzUG.settings.color_scheme, 'footer-group.json: Abschnitt custom-liquid im Farbschema der Fusszeile');
ok(JSON.stringify(P.jsonOhneKopf(vor[P.FOOTER]).sections.custom_liquid_lxpopup) === JSON.stringify(f.sections.custom_liquid_lxpopup), 'footer-group.json: Popup-Abschnitt unverändert');

// Liquid-Form des Snippets und der Einfügung
const s = P.SNIPPET_TEXT;
ok(/payment_type_svg_tag: class: 'lx-pay__icon'/.test(s) && /shop\.enabled_payment_types/.test(s), 'Snippet: offizielle Symbole nur für aktivierte Zahlungsarten');
ok(/\{%-\s*if lx_pay_aktiv contains lx_pay_typ\s*-%\}/.test(s), 'Snippet: jedes Symbol hängt an der Prüfung «im Shop aktiviert»');
ok(/'Bezahlen mit'/.test(s) && /'Payer avec'/.test(s) && /'Pay with'/.test(s) && /iso_code == 'fr'/.test(s) && /iso_code == 'en'/.test(s), 'Snippet: Beschriftung deutsch, französisch, englisch');
ok(/@media \(max-height: 759px\) \{ \.cart-drawer__dialog \.lx-pay-cart \{ display: none; \} \}/.test(s), 'Snippet: Reihe in der Schublade bei niedrigen Fenstern ausgeblendet (sonst angeschnitten)');
ok(s.indexOf("'twint,visa") > 0 && P.ZAHLUNGSARTEN[0] === 'twint', 'Snippet: TWINT steht vorn');
ok(!/unionpay|usdc|shopify_pay/.test(s), 'Snippet: UnionPay, USDC, Shop Pay werden nicht gezeigt');
const count = (t, re) => (t.match(re) || []).length;
ok(count(s, /\{%-?\s*if\b/g) === count(s, /\{%-?\s*endif\b/g) && count(s, /\{%-?\s*for\b/g) === count(s, /\{%-?\s*endfor\b/g), 'Snippet: if/endif und for/endfor ausgeglichen');
ok(count(neu[P.CART], /\{%-?\s*unless\b/g) === count(neu[P.CART], /\{%-?\s*endunless\b/g) && count(neu[P.CART], /\{%-?\s*if\b/g) === count(neu[P.CART], /\{%-?\s*endif\b/g), 'cart-summary: if/unless ausgeglichen (wie vorher)');
ok(count(neu[P.CART], /lx-zahlungsarten/g) === 1, 'cart-summary: genau eine Einbindung');
ok(neu[P.CART].indexOf('lx-zahlungsarten') > neu[P.CART].indexOf('content_for_additional_checkout_buttons'), 'cart-summary: Einbindung hinter den Express-Knöpfen');
// Es werden keine Texte zu Preisen, Versand oder Rabatten verändert: Einfügungen enthalten keines dieser Wörter ausser Zahlungsarten.
const einsatz = [P.CART_EINSATZ, P.PRODUKT_BLOCK, P.FOOTER_ABSCHNITT].join('\n');
ok(!/CHF|Gratis|gratis|Rabatt|Versand|Rückgabe/.test(einsatz + s), 'keine Preis-, Versand- oder Rabattaussage in den Einfügungen');

// Die drei Aufrufer übergeben je eine eigene kennung (sonst gäbe es doppelte IDs, sobald zwei Reihen auf einer Seite stehen).
const kennungen = [P.CART_EINSATZ, P.PRODUKT_BLOCK, P.FOOTER_ABSCHNITT].map((t) => (t.match(/kennung: '([a-z]+)'/) || [])[1]);
ok(kennungen.every(Boolean) && new Set(kennungen).size === 3 && kennungen.join(',') === 'korb,produkt,fuss', 'Aufrufer: korb, produkt, fuss je eigene kennung');
ok(/replace: '"pi-', lx_pay_ersatz/.test(s) && /lx_pay_kennung = kennung \| default: 'lx'/.test(s), 'Snippet: Symbol-IDs werden mit der kennung präfixiert');
ok(/\{%-\s*if lx_pay_liste != blank\s*-%\}/.test(s), 'Snippet: Reihe nur, wenn mindestens ein Symbol vorhanden ist');

// Echtes Rendern mit LiquidJS (optional: LIQUIDJS_DIR = Ordner, in dem `npm install liquidjs` lief). Ohne LiquidJS wird dieser Teil übersprungen.
let Liquid = null;
try {
  const { createRequire } = await import('node:module');
  Liquid = createRequire((process.env.LIQUIDJS_DIR || '.') + '/').call(null, 'liquidjs').Liquid;
} catch { /* nicht vorhanden */ }
if (!Liquid) {
  console.log('übersprungen: LiquidJS nicht gefunden (LIQUIDJS_DIR setzen)');
} else {
  const rendern = (aktiv, o = {}) => {
    const engine = new Liquid();
    // Shopifys payment_type_svg_tag schreibt feste IDs («pi-<Typ>») in jedes Symbol; hier nachgebaut.
    engine.registerFilter('payment_type_svg_tag', (t) => `<svg class="lx-pay__icon" aria-labelledby="pi-${t}"><title id="pi-${t}">${t}</title></svg>`);
    const text = P.SNIPPET_TEXT.replace(/\{% stylesheet %\}[\s\S]*?\{% endstylesheet %\}/, '');
    return engine.parseAndRender(text, { shop: { enabled_payment_types: aktiv }, request: { locale: { iso_code: o.locale || 'de' } }, ausrichtung: o.ausrichtung, kennung: o.kennung });
  };
  const typen = (html) => [...html.matchAll(/<title id="[^"]*pi-([a-z_]+)">/g)].map((m) => m[1]);
  const alle = ['american_express', 'apple_pay', 'google_pay', 'klarna', 'master', 'paypal', 'shopify_pay', 'twint', 'unionpay', 'usdc', 'visa'];
  const r1 = await rendern(alle, { kennung: 'produkt', ausrichtung: 'start' });
  ok(typen(r1).join(',') === 'twint,visa,master,american_express,paypal,klarna,apple_pay,google_pay', 'Rendern: alle Shop-Zahlungsarten ergeben genau die gewählten acht, TWINT zuerst');
  ok(!/unionpay|usdc|shopify_pay/.test(r1), 'Rendern: UnionPay, USDC und Shop Pay erscheinen nicht');
  ok(/class="lx-pay lx-pay--start"/.test(r1) && /Bezahlen mit/.test(r1), "Rendern: ausrichtung 'start' und deutsche Beschriftung");
  const r2 = await rendern(alle.filter((x) => x !== 'twint'));
  ok(!/twint/.test(r2) && typen(r2).length === 7, 'Rendern: ist TWINT im Shop nicht aktiviert, steht es auch nicht da');
  const r3 = await rendern([]);
  ok(r3.trim() === '', 'Rendern: ohne aktivierte Zahlungsart entsteht gar keine Reihe (keine leere Beschriftung)');
  const r4 = await rendern(['visa', 'unionpay']);
  ok(typen(r4).join(',') === 'visa' && /lx-pay"/.test(r4), 'Rendern: nur aktivierte und gewählte Arten, ohne ausrichtung zentriert');
  const fr = await rendern(alle, { locale: 'fr' }), en = await rendern(alle, { locale: 'en' }), de = await rendern(alle, { locale: 'de' });
  ok(/Payer avec/.test(fr) && /Pay with/.test(en) && /Bezahlen mit/.test(de) && !/Bezahlen mit/.test(fr), 'Rendern: Beschriftung folgt der Sprache');
  const ids = (h) => [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const drei = [r1, await rendern(alle, { kennung: 'fuss' }), await rendern(alle, { kennung: 'korb' })];
  const alleIds = drei.flatMap(ids);
  ok(alleIds.length === 24 && new Set(alleIds).size === 24, 'Rendern: drei Reihen auf einer Seite (produkt, fuss, korb) haben 24 verschiedene IDs');
  ok(/ id="produkt-pi-twint"/.test(r1) && /aria-labelledby="produkt-pi-twint"/.test(r1), 'Rendern: id und aria-labelledby zeigen aufeinander (Präfix produkt)');
  const ohne = await rendern(alle);
  ok(/ id="lx-pi-twint"/.test(ohne), "Rendern: ohne kennung gilt das Präfix 'lx'");
}

console.log(`\n${n - fehler} von ${n} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
