// Optik-Politur Stufe 2 (04.11.2026): weitere, von unabhängigen Prüfern nachgestellte Fixes. Setzt Stufe 1 (patches.mjs) voraus.
// Wie Stufe 1: reine Daten + reine Funktionen, alles angehängt, damit die Rücknahme einfach bleibt.

export const DATEIEN = { THEME: 'layout/theme.liquid', CSS: 'assets/luxe-edit.css', FOOTER: 'sections/footer-group.json' };

// Stände NACH Stufe 1 (md5 des zurückgelesenen Live-Stands am 04.11.2026 ~13:37 UTC).
export const MD5_VOR = {
  [DATEIEN.THEME]: '3bc2da3102751e23683d4be56f5ae048',
  [DATEIEN.CSS]: '91cd0d7a2791ecb96894455c89e1e6da',
  [DATEIEN.FOOTER]: '4178124897cb1fcb35024effced14583',
};

export const MARKE_THEME = 'lx-optik-0411-b';
export const MARKE_CSS_ANFANG = '/* lx-optik-0411-b Anfang */';
export const MARKE_CSS_ENDE = '/* lx-optik-0411-b Ende */';

// Anker: das Ende des Stufe-1-Blocks (der Block endet mit dieser Zeile; Stufe 2 steht direkt dahinter im head).
export const THEME_ANKER = '  footer .menu__details nav.details-content li{break-inside:avoid}\n}\n</style>';

export const THEME_BLOCK = `<style id="${MARKE_THEME}">
/* 04.11.2026 Optik-Politur Stufe 2. Rücknahme: diesen Block entfernen (dropship/optik-0411/README.md). */
/* Preiszeile bündig am Kartenboden (Kategorie, Suche, Ähnliche Produkte; nicht in der Listenansicht), 12 px Luft zum Rand. Setzt das einheitliche 4:5-Bildformat aus Stufe 1 voraus. */
product-card:not([product-grid-view="list"] product-card) .product-card__content.spacing-style{padding-bottom:12px}
product-card:not([product-grid-view="list"] product-card) .product-card__content.spacing-style>product-price{margin-top:auto}
product-card:not([product-grid-view="list"] product-card) .product-card__content.spacing-style>.lx-review-badge[data-review-state="rated"]{margin-top:auto}
product-card:not([product-grid-view="list"] product-card) .product-card__content.spacing-style>.lx-review-badge[data-review-state="rated"]+product-price{margin-top:0}
/* Produktseite, Kaufbox: leere Custom-Liquid-Hüllen und der leere Bewertungs-Block kosten je 28 px (Handy 24 px) Abstand. Nur Hüllen ohne sichtbares Element werden ausgeblendet. */
body.template-product .group-block-content>div:not([class]):not([id]):not(:has(>:not(script):not(style))){display:none}
body.template-product .group-block-content>div:not([class]):not([id]):has(>.lx-review-badge[data-review-zero-only]):not(:has(>:not(script):not(style):not(.lx-review-badge[data-review-zero-only]))){display:none}
body.template-product .group-block-content>.shopify-app-block:has(.jdgm-prev-badge[data-number-of-reviews="0"]):not(:has(>:not(.jdgm-preview-badge))),
body.template-product .group-block-content>.shopify-app-block:has(>.jdgm-preview-badge):not(:has(.jdgm-preview-badge *)):not(:has(>:not(.jdgm-preview-badge))){display:none}
</style>`;

export const CSS_BLOCK = `${MARKE_CSS_ANFANG}
${MARKE_CSS_ENDE}
`;

function genau1(text, teil, was) {
  const n = text.split(teil).length - 1;
  if (n !== 1) throw new Error(`${was}: Anker kommt ${n}× vor (erwartet 1)`);
}

export function anwenden({ theme, css, footer }) {
  if (theme.includes(`id="${MARKE_THEME}"`) || css.includes(MARKE_CSS_ANFANG)) throw new Error('schon eingespielt');
  genau1(theme, THEME_ANKER, 'theme.liquid');
  const t2 = theme.replace(THEME_ANKER, () => `${THEME_ANKER}\n${THEME_BLOCK}`);
  const c2 = CSS_BLOCK.trim().split('\n').length > 2 ? (css.endsWith('\n') ? css + CSS_BLOCK : `${css}\n${CSS_BLOCK}`) : css;
  return { theme: t2, css: c2, footer };
}

export function zuruecknehmen({ theme, css, footer }) {
  const t2 = theme.replace(`\n${THEME_BLOCK}`, '');
  const i = css.indexOf(MARKE_CSS_ANFANG), j = css.indexOf(MARKE_CSS_ENDE);
  const c2 = i >= 0 && j > i ? css.slice(0, i) + css.slice(j + MARKE_CSS_ENDE.length + 1) : css;
  return { theme: t2, css: c2, footer };
}
