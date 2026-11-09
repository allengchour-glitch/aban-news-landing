// Reine Funktionen (kein Netz): der CSS-Block, der das Vorlagenbild im «Selbst gestalten»-Editor wieder im richtigen Seitenverhältnis zeigt.
//
// Befund (GEMESSEN 09.11.2026, Playwright, Live-Seiten): Der Editor setzt für das Vorlagenbild (img.lsp6-tpl) und das Hintergrundbild
// (img.lsp6-bg) eine Inline-Breite in Prozent der Bühne, die über 100 % liegen kann (z. B. 162,9 %), weil nur der Druckflächen-Ausschnitt
// der Vorlage gezeigt wird. Die allgemeine Theme-Regel `img{max-width:100%}` klemmt die Breite auf 100 %, die Höhe bleibt: das Bild
// ist gequetscht und verschoben (T-Shirt 356 × 762 statt 762 × 762 px, Samsung 356 × 580 statt 580 × 580).
// Die Korrektur gehört eigentlich in den Editor (`max-width:none` bei `.lsp6-bg,.lsp6-tpl`); eine neue Editor-Version braucht aber den
// ganzen Rollout (neuer unveränderlicher Pfad, SRI, 16 Beschreibungen). Diese Regel im MAIN-Theme wirkt sofort, ist auf die Bühne des
// Editors begrenzt und bleibt auch nach einer späteren Editor-Korrektur harmlos (gleiche Aussage).

export const THEME_DATEI = 'layout/theme.liquid';
export const MARKE = 'lx-editor-vorlage-0911';
export const CSS_REGEL = '.lsp6-stage img.lsp6-bg,.lsp6-stage img.lsp6-tpl{max-width:none!important;max-height:none!important}';
const ANKER = '</head>';

export const BLOCK = `{%- if template.name == 'product' -%}
<style id="${MARKE}">
/* 09.11.2026: Vorlagenbild im Editor «Selbst gestalten» nicht mehr auf 100 % Breite klemmen (Theme-Regel img{max-width:100%}). Rücknahme: diesen Block entfernen (dropship/editor-vorlage-0911/README.md). */
${CSS_REGEL}
</style>
{%- endif -%}
`;

const zaehle = (s, t) => s.split(t).length - 1;

/** Theme-Text mit dem Block vor dem einzigen </head>. Wirft, wenn schon eingespielt oder der Anker nicht genau einmal vorkommt. */
export function anwenden(theme) {
  if (typeof theme !== 'string' || !theme) throw new Error('theme.liquid leer oder nicht lesbar');
  if (theme.includes(`id="${MARKE}"`)) throw new Error('schon eingespielt');
  const n = zaehle(theme, ANKER);
  if (n !== 1) throw new Error(`Anker ${ANKER} kommt ${n}-mal vor, erwartet 1`);
  return theme.split(ANKER).join(BLOCK + ANKER);
}

/** Entfernt genau den eingespielten Block. Wirft, wenn er nicht genau einmal vorkommt. */
export function zuruecknehmen(theme) {
  const n = zaehle(theme, BLOCK);
  if (n !== 1) throw new Error(`Block kommt ${n}-mal vor, erwartet 1: nichts zurückgenommen`);
  return theme.split(BLOCK).join('');
}
