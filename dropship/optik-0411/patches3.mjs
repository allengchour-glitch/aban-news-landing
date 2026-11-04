// Optik-Politur Stufe 3 (04.11.2026): weitere, von unabhängigen Prüfern nachgestellte Fixes. Setzt Stufe 2 (patches2.mjs) voraus.
// Aufbau wie Stufe 2: reine Daten + reine Funktionen, alles angehängt, damit die Rücknahme einfach bleibt.

export const DATEIEN = { THEME: 'layout/theme.liquid', CSS: 'assets/luxe-edit.css', FOOTER: 'sections/footer-group.json' };

// Stände NACH Stufe 2 (md5 des zurückgelesenen Live-Stands am 04.11.2026 ~14:20 UTC).
export const MD5_VOR = {
  [DATEIEN.THEME]: '6ce17070cc094c10eaf542f6f4dff447',
  [DATEIEN.CSS]: '91cd0d7a2791ecb96894455c89e1e6da',
  [DATEIEN.FOOTER]: '4178124897cb1fcb35024effced14583',
};

export const MARKE_THEME = 'lx-optik-0411-c';

// Anker: das Ende des Stufe-2-Blocks.
export const THEME_ANKER = 'variant-picker fieldset.variant-option--equal-width-buttons:has(label:nth-of-type(13)){--variant-min-width:clamp(44px,calc(var(--variant-option-padding-inline) * 2 + var(--variant-ch)),8rem)}\n</style>';

// Inhaltsseiten, auf denen das interne Etikett «NO. 00X · …» über dem Seitentitel ausgeblendet wird.
// Nicht dabei (bewusst): impressum, cookie-richtlinie, agb, datenschutz und alle Rechtstexte, dazu rabatt-newsletter.
export const SEITEN_OHNE_ETIKETT = ['versand-lieferung', 'garantie', 'ueber-uns', 'faq', 'rueckgabe', 'kontakt-support', 'tracking', 'pflegehinweise', 'groessenberatung'];

export const THEME_BLOCK = `<style id="${MARKE_THEME}">
/* 04.11.2026 Optik-Politur Stufe 3. Rücknahme: diesen Block entfernen (dropship/optik-0411/README.md). */
/* «Selbst gestalten»: Beschriftung der Materialkacheln (Poster, T-Shirt, Hoodie) wurde abgeschnitten («Gerahmt · …», «Ringgarn-Baumwolle»). Volle Kachel-Innenbreite, Umbruch mit Silbentrennung; die Regel steht im Produkttemplate inline, darum die höhere Spezifität. */
.lx-bildwahl .lx-bildwahl__knopf span{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:break-word;hyphens:auto;margin:0 -3px}
/* Warenkorb-Schublade: die Gratisversand-Leiste stand ausserhalb des Flusses und schob «Zur Kasse» und die Express-Zahlung aus dem Bild (nur 41 % bzw. 0 % sichtbar), das Schliessen-Kreuz lag über dem Leistentext. Texte und Schwellen unverändert. */
.cart-drawer__inner{display:flex;flex-direction:column}
.cart-drawer__inner>.luxe-ship-bar{flex:0 0 auto;margin:0;padding-right:56px;border-radius:0 0 10px 10px}
.cart-drawer__inner>.luxe-ship-bar strong{white-space:nowrap}
.cart-drawer__inner>cart-items-component{flex:1 1 auto;min-height:0;height:auto}
/* Warenkorb-Seite: die Leiste sass am Bildschirmrand statt im Seitenraster. */
.shopify-section>.luxe-ship-bar{margin:10px max(var(--page-margin,16px),calc((100% - var(--page-content-width,90rem))/2))}
/* Überschriften gleicher Grösse waren teils Serif, teils Sans («Ähnliche Produkte», «Das könnte dir auch gefallen», Schubladentitel, 404, «Selbst gestalten»). Schrift wie bei den übrigen Seitentiteln, Stärke unberührt. */
.text-block.h3>*,
.text-block.h4>*,
.cart-drawer__heading.h4{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif!important;letter-spacing:0!important}
</style>
{%- assign lx_ohne_etikett = '${SEITEN_OHNE_ETIKETT.join(',')}' | split: ',' -%}
{%- if template.name == 'page' and lx_ohne_etikett contains page.handle -%}
<style id="${MARKE_THEME}-etikett">
/* Inhaltsseiten: das interne Seitennummer-Etikett («NO. 00X · …») über dem Titel ausblenden. Nur die Seiten aus der Liste, Rechtstexte bleiben unberührt. */
main[data-template="page"] .rte .eyebrow,main[data-template="page"] .rte [style*="letter-spacing:4px"]{display:none}
</style>
{%- endif -%}`;

function genau1(text, teil, was) {
  const n = text.split(teil).length - 1;
  if (n !== 1) throw new Error(`${was}: Anker kommt ${n}× vor (erwartet 1)`);
}

export function anwenden({ theme, css, footer }) {
  if (theme.includes(`id="${MARKE_THEME}"`)) throw new Error('schon eingespielt');
  genau1(theme, THEME_ANKER, 'theme.liquid');
  return { theme: theme.replace(THEME_ANKER, () => `${THEME_ANKER}\n${THEME_BLOCK}`), css, footer };
}

export function zuruecknehmen({ theme, css, footer }) {
  return { theme: theme.replace(`\n${THEME_BLOCK}`, ''), css, footer };
}
