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

export const THEME_BLOCK = `<style id="${MARKE_THEME}">
/* 04.11.2026 Optik-Politur Stufe 3. Rücknahme: diesen Block entfernen (dropship/optik-0411/README.md). */
/* «Selbst gestalten»: Beschriftung der Materialkacheln (Poster, T-Shirt, Hoodie) wurde abgeschnitten («Gerahmt · …», «Ringgarn-Baumwolle»). Volle Kachel-Innenbreite, Umbruch mit Silbentrennung; die Regel steht im Produkttemplate inline, darum die höhere Spezifität. */
.lx-bildwahl .lx-bildwahl__knopf span{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:break-word;hyphens:auto;margin:0 -3px}
</style>`;

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
