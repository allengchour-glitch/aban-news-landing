// Kopfzeilen-Verschlankung (04.11.2026): snippets/header-drawer.liquid verdichtet seinen Leerraum, damit Kategorieseiten
// unter Googles Lesegrenze von 2 MiB rohem HTML bleiben. Rein (kein Netz): anwenden() / zuruecknehmen() / MD5_VOR.
// Gegenstück zur Analyse: dropship/INDEX-ANALYSE-0311.md, Belege: dropship/seo-kopf-0411/README.md.
export const DATEI = 'snippets/header-drawer.liquid';
/** md5 des Live-Snippets vor dem Eingriff (GEMESSEN 04.11.2026, 57 086 Byte, MAIN-Theme 213013037447). */
export const MD5_VOR = '8e1f8fc1406bde7635e2a3cccf62feff';

// Kette: Zeilenumbruch -> Leerzeichen, dann Leerzeichenfolgen von gross nach klein zusammenfassen (32, 32, 8, 4, 2, 2).
// Rechnerisch fallen damit alle Folgen von 1 bis 5000 Leerzeichen auf genau eines (Test: patches_test.mjs).
export const KETTE = [32, 32, 8, 4, 2, 2];
const sp = (n) => ' '.repeat(n);
const kettenText = () => KETTE.map((n) => `replace: '${sp(n)}', ' '`).join(' | ');

const BLOCK_NL = `{%- comment -%}
  lx-slim 04.11.2026: Leerraum der Drawer-Ausgabe verdichten (Googlebot liest nur die ersten 2 MB der Seite).
  Nur dieser Block, der capture um <header-drawer> und der Waechter nach </header-drawer> sind neu.
  Rueckweg: snippets/header-drawer.liquid aus der Sicherung zurueckschreiben.
{%- endcomment -%}
{%- capture luxe_nl %}
{% endcapture -%}
`;
const BLOCK_START = `{%- capture luxe_drawer_html -%}
`;
const BLOCK_ENDE = `</header-drawer>
{%- endcapture -%}
{%- assign luxe_ok = false -%}
{%- if luxe_nl.size > 0 and luxe_nl.size < 3 -%}
  {%- assign luxe_ok = true -%}
  {%- if luxe_drawer_html contains '<script' -%}{%- assign luxe_ok = false -%}{%- endif -%}
  {%- if luxe_drawer_html contains '<style' -%}{%- assign luxe_ok = false -%}{%- endif -%}
  {%- if luxe_drawer_html contains '<textarea' -%}{%- assign luxe_ok = false -%}{%- endif -%}
  {%- if luxe_drawer_html contains '<pre>' or luxe_drawer_html contains '<pre ' -%}{%- assign luxe_ok = false -%}{%- endif -%}
{%- endif -%}
{%- if luxe_ok -%}
  {{- luxe_drawer_html | replace: luxe_nl, ' ' | ${kettenText()} -}}
{%- else -%}
  {{- luxe_drawer_html -}}
{%- endif -%}
`;

// Ankerstellen im Live-Snippet (je genau einmal)
const ANKER_SCRIPT = `\n<script\n  src="{{ 'header-drawer.js' | asset_url }}"`;
const ANKER_DRAWER = `></script>\n\n<header-drawer\n  class="header-drawer {{ class }}"`;
const ANKER_ENDE = `</header-drawer>\n\n{% stylesheet %}`;

function genau1(text, anker, name) {
  const n = text.split(anker).length - 1;
  if (n !== 1) throw new Error(`Anker «${name}» kommt ${n}× vor (erwartet 1×)`);
}

/** Live-Text -> verschlankter Text. Wirft, wenn ein Anker fehlt/doppelt ist oder der Eingriff schon drin steckt. */
export function anwenden(text) {
  if (text.includes('lx-slim') || text.includes('luxe_drawer_html')) throw new Error('Eingriff steckt schon im Snippet');
  genau1(text, ANKER_SCRIPT, 'script'); genau1(text, ANKER_DRAWER, 'drawer'); genau1(text, ANKER_ENDE, 'ende');
  let t = text.replace(ANKER_SCRIPT, () => `\n${BLOCK_NL}<script\n  src="{{ 'header-drawer.js' | asset_url }}"`);
  t = t.replace(ANKER_DRAWER, () => `></script>\n\n${BLOCK_START}<header-drawer\n  class="header-drawer {{ class }}"`);
  t = t.replace(ANKER_ENDE, () => `${BLOCK_ENDE}\n{% stylesheet %}`);
  return t;
}

/** Umkehrung: entfernt genau die drei eingefügten Blöcke. Wirft, wenn der Stand nicht dem eingespielten entspricht. */
export function zuruecknehmen(text) {
  const bausteine = [[`\n${BLOCK_NL}<script`, '\n<script'], [`></script>\n\n${BLOCK_START}<header-drawer`, '></script>\n\n<header-drawer'], [`${BLOCK_ENDE}\n{% stylesheet %}`, '</header-drawer>\n\n{% stylesheet %}']];
  let t = text;
  for (const [mit, ohne] of bausteine) {
    const n = t.split(mit).length - 1;
    if (n !== 1) throw new Error(`Baustein kommt ${n}× vor (erwartet 1×): Snippet entspricht nicht dem eingespielten Stand`);
    t = t.replace(mit, () => ohne);
  }
  return t;
}
