// «TWINT Zahlung sichtbar» (Auftrag Besitzer 04.11.2026): Zahlungs-Symbole mit den offiziellen Shopify-Symbolen.
// Gemessen am Live-Shop (Wegwerf-Vorlage, 04.11.2026): shop.enabled_payment_types = american_express, apple_pay, google_pay, klarna,
// master, paypal, shopify_pay, twint, unionpay, usdc, visa; payment_type_svg_tag liefert für «twint» das offizielle Symbol.
// Bisher stand TWINT nur als Text im Shop (Vertrauenszeile der Produktseite, Warenkorb-Liste); Symbole gab es nirgends.
// Reine Daten + reine Funktionen; Einspielen/Rücknahme in apply.mjs. Alles wird eingefügt, nichts umgeschrieben.

export const SNIPPET = 'snippets/lx-zahlungsarten.liquid';
export const CART = 'snippets/cart-summary.liquid';
export const PRODUKT = 'templates/product.json';
export const FOOTER = 'sections/footer-group.json';
export const DATEIEN = [CART, PRODUKT, FOOTER];

// Stände VOR der Änderung (md5 des Live-Stands am 04.11.2026 ~16:20 UTC).
export const MD5_VOR = {
  [CART]: '37cea65031e931dd41c91ee459346f0e',
  [PRODUKT]: '3f4eeb5f2cfc8811ba356169cd5f23c2',
  [FOOTER]: '4178124897cb1fcb35024effced14583',
};

// Reihenfolge der gezeigten Zahlungsarten: TWINT zuerst. Nicht gezeigt (obwohl aktiviert): UnionPay, USDC, Shop Pay (für Kundschaft in der Schweiz kein Kaufgrund).
export const ZAHLUNGSARTEN = ['twint', 'visa', 'master', 'american_express', 'paypal', 'klarna', 'apple_pay', 'google_pay'];

export const SNIPPET_TEXT = `{%- comment -%}
  04.11.2026 «TWINT Zahlung sichtbar» (Besitzer): Zahlungs-Symbole mit den offiziellen Shopify-Symbolen.
  Gezeigt wird nur, was im Shop wirklich aktiviert ist (shop.enabled_payment_types), TWINT steht vorn.
  Eingebunden in snippets/cart-summary (Schublade und Warenkorb-Seite), templates/product.json (Block lux_zahlungsarten)
  und sections/footer-group.json (Abschnitt custom_liquid_lxzahlung).
  Parameter: ausrichtung = 'start' (linksbündig) oder leer (zentriert); kennung = Kurzname der Stelle ('produkt', 'fuss', 'korb'), damit die
  festen IDs der Shopify-Symbole (id="pi-twint") auch bei mehreren Reihen auf einer Seite nur einmal vorkommen. Rücknahme: dropship/zahlung-0411/README.md.
{%- endcomment -%}
{%- liquid
  assign lx_pay_reihe = '${ZAHLUNGSARTEN.join(',')}' | split: ','
  assign lx_pay_aktiv = shop.enabled_payment_types
  assign lx_pay_kennung = kennung | default: 'lx'
  assign lx_pay_ersatz = '"' | append: lx_pay_kennung | append: '-pi-'
  if request.locale.iso_code == 'fr'
    assign lx_pay_label = 'Payer avec'
  elsif request.locale.iso_code == 'en'
    assign lx_pay_label = 'Pay with'
  else
    assign lx_pay_label = 'Bezahlen mit'
  endif
-%}
{%- capture lx_pay_liste -%}
  {%- for lx_pay_typ in lx_pay_reihe -%}
    {%- if lx_pay_aktiv contains lx_pay_typ -%}
      {%- capture lx_pay_svg -%}{{ lx_pay_typ | payment_type_svg_tag: class: 'lx-pay__icon' }}{%- endcapture -%}
      <li class="lx-pay__item">{{ lx_pay_svg | replace: '"pi-', lx_pay_ersatz }}</li>
    {%- endif -%}
  {%- endfor -%}
{%- endcapture -%}
{%- if lx_pay_liste != blank -%}
<div class="lx-pay{% if ausrichtung == 'start' %} lx-pay--start{% endif %}">
  <span class="lx-pay__label">{{ lx_pay_label }}</span>
  <ul class="lx-pay__list" role="list">{{ lx_pay_liste }}</ul>
</div>
{%- endif -%}

{% stylesheet %}
  .lx-pay { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 10px; margin: 0; padding: 0; font-size: 12px; line-height: 1.4; color: #6b6b6b; }
  .lx-pay--start { justify-content: flex-start; }
  .lx-pay__label { white-space: nowrap; }
  .lx-pay__list { display: flex; flex-wrap: wrap; align-items: center; justify-content: inherit; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .lx-pay__item { display: flex; margin: 0; padding: 0; }
  .lx-pay__icon { display: block; width: 38px; height: 24px; }
  .lx-pay-cart { margin-top: 12px; }
  .cart-drawer__dialog .lx-pay__label { display: none; }
  /* Niedrige Fenster (Laptop, Handy mit Browserleisten): in der Schublade fehlt der Platz, die Reihe wäre angeschnitten. Kasse und Express-Zahlung bleiben dort zu 100 % sichtbar. */
  @media (max-height: 759px) { .cart-drawer__dialog .lx-pay-cart { display: none; } }
{% endstylesheet %}
`;

// --- snippets/cart-summary.liquid: unter dem Block mit Kasse und Express-Zahlung (gilt für Schublade und Warenkorb-Seite)
export const CART_ANKER = `      {{ content_for_additional_checkout_buttons }}
    </div>
  {% endif %}
</div>
`;
export const CART_EINSATZ = `
{%- comment -%} LX-ZAHLUNG (04.11.2026): Zahlungs-Symbole (TWINT zuerst) unter den Kassenknöpfen. {%- endcomment -%}
{%- unless cart == empty -%}
  <div class="lx-pay-cart">{%- render 'lx-zahlungsarten', kennung: 'korb' -%}</div>
{%- endunless -%}
`;

// --- templates/product.json: eigener Block direkt unter dem Vertrauensblock lux_trust
export const PRODUKT_BLOCK_ANKER = `            "accordion_xfeWHx": {`;
export const PRODUKT_BLOCK = `            "lux_zahlungsarten": {
              "type": "custom-liquid",
              "settings": {
                "custom_liquid": "{%- render 'lx-zahlungsarten', ausrichtung: 'start', kennung: 'produkt' -%}"
              },
              "blocks": {}
            },
`;
export const PRODUKT_ORDER_ANKER = `            "lux_trust",
            "accordion_xfeWHx",`;
export const PRODUKT_ORDER_NEU = `            "lux_trust",
            "lux_zahlungsarten",
            "accordion_xfeWHx",`;

// --- sections/footer-group.json: eigener Abschnitt zwischen Fusszeile und unterer Leiste
export const FOOTER_ABSCHNITT_ANKER = `    "custom_liquid_lxpopup": {
      "type": "custom-liquid",`;
export const FOOTER_ABSCHNITT = `    "custom_liquid_lxzahlung": {
      "type": "custom-liquid",
      "settings": {
        "custom_liquid": "{%- render 'lx-zahlungsarten', kennung: 'fuss' -%}",
        "color_scheme": "scheme-1",
        "section_width": "page-width",
        "padding-block-start": 0,
        "padding-block-end": 4
      }
    },
`;
export const FOOTER_ORDER_ANKER = `    "footer_m9NzUG",
    "footer_utilities_jLGE8U",`;
export const FOOTER_ORDER_NEU = `    "footer_m9NzUG",
    "custom_liquid_lxzahlung",
    "footer_utilities_jLGE8U",`;

function genau1(text, teil, was) {
  const n = text.split(teil).length - 1;
  if (n !== 1) throw new Error(`${was}: Anker kommt ${n}× vor (erwartet 1)`);
}

// Wegen der Kommentarköpfe der Vorlagen-Dateien (/* … */) gilt als gültiges JSON der Rest nach dem Kopf.
export function jsonOhneKopf(text) {
  return JSON.parse(text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
}

// dateien: { [CART]: text, [PRODUKT]: text, [FOOTER]: text } → neue Texte + das neue Snippet
export function anwenden(dateien) {
  const cart = dateien[CART], produkt = dateien[PRODUKT], footer = dateien[FOOTER];
  if (cart.includes('lx-zahlungsarten') || produkt.includes('lx-zahlungsarten') || footer.includes('lx-zahlungsarten')) throw new Error('schon eingespielt');
  genau1(cart, CART_ANKER, CART);
  genau1(produkt, PRODUKT_BLOCK_ANKER, PRODUKT + ' (Block)');
  genau1(produkt, PRODUKT_ORDER_ANKER, PRODUKT + ' (Reihenfolge)');
  genau1(footer, FOOTER_ABSCHNITT_ANKER, FOOTER + ' (Abschnitt)');
  genau1(footer, FOOTER_ORDER_ANKER, FOOTER + ' (Reihenfolge)');
  const neu = {
    [CART]: cart.replace(CART_ANKER, () => CART_ANKER + CART_EINSATZ),
    [PRODUKT]: produkt.replace(PRODUKT_BLOCK_ANKER, () => PRODUKT_BLOCK + PRODUKT_BLOCK_ANKER).replace(PRODUKT_ORDER_ANKER, () => PRODUKT_ORDER_NEU),
    [FOOTER]: footer.replace(FOOTER_ABSCHNITT_ANKER, () => FOOTER_ABSCHNITT + FOOTER_ABSCHNITT_ANKER).replace(FOOTER_ORDER_ANKER, () => FOOTER_ORDER_NEU),
    [SNIPPET]: SNIPPET_TEXT,
  };
  // Gültigkeit der JSON-Vorlagen und Stellung der neuen Einträge prüfen, bevor irgendetwas geschrieben wird.
  const p = jsonOhneKopf(neu[PRODUKT]);
  const pd = p.sections.main.blocks['product-details'];
  const o = pd.block_order, i = o.indexOf('lux_zahlungsarten');
  if (!(pd.blocks.lux_zahlungsarten && i === o.indexOf('lux_trust') + 1 && o.filter((x) => x === 'lux_zahlungsarten').length === 1)) throw new Error('product.json: Block steht nicht direkt hinter lux_trust');
  const f = jsonOhneKopf(neu[FOOTER]);
  const fo = f.order;
  if (!(f.sections.custom_liquid_lxzahlung && fo.indexOf('custom_liquid_lxzahlung') === fo.indexOf('footer_m9NzUG') + 1 && fo.indexOf('footer_utilities_jLGE8U') === fo.indexOf('custom_liquid_lxzahlung') + 1)) throw new Error('footer-group.json: Abschnitt steht nicht zwischen Fusszeile und unterer Leiste');
  return neu;
}

export function zuruecknehmen(dateien) {
  return {
    [CART]: dateien[CART].replace(CART_EINSATZ, ''),
    [PRODUKT]: dateien[PRODUKT].replace(PRODUKT_BLOCK, '').replace(PRODUKT_ORDER_NEU, PRODUKT_ORDER_ANKER),
    [FOOTER]: dateien[FOOTER].replace(FOOTER_ABSCHNITT, '').replace(FOOTER_ORDER_NEU, FOOTER_ORDER_ANKER),
  };
}
