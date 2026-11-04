// Stufe 2 der Seitenverschlankung (04.11.2026): die zwei Filter-Kopien (zusammen 480–700 KB) und die 24 Produktkarten
// auf Kategorieseiten verdichten ihren Leerraum. Neues Snippet snippets/lx-verdichten.liquid + zwei Ankerstellen in
// sections/main-collection.liquid. Rein (kein Netz): anwenden() / zuruecknehmen() / MD5_VOR / SNIPPET_TEXT.
export const SNIPPET = 'snippets/lx-verdichten.liquid';
export const DATEI = 'sections/main-collection.liquid';
/** md5 der Live-Datei vor dem Eingriff (GEMESSEN 04.11.2026, 6 494 Byte, MAIN-Theme 213013037447). */
export const MD5_VOR = '08668990659841e49f28a580e7ac06f8';
export const KETTE = [32, 32, 8, 4, 2, 2];
const sp = (n) => ' '.repeat(n);
const kettenText = () => KETTE.map((n) => `replace: '${sp(n)}', ' '`).join(' | ');

export const SNIPPET_TEXT = `{%- doc -%}
  lx-slim 04.11.2026: verdichtet den Leerraum eines HTML-Teils (Googlebot liest nur die ersten 2 MB der Seite).
  Gleiche Kette und gleiche Schutzregeln wie im Kopf-Snippet header-drawer (dropship/seo-kopf-0411/README.md).

  @param {string} html - der Teil, der verdichtet werden soll
  @param {string} modus - 'filter' (nur leere <script src>-Tags, kein <style>) oder 'karten' (nur <script type="application/json">)

  Rueckweg: im Aufrufer (sections/main-collection.liquid) die Ausgabe wieder ohne dieses Snippet erzeugen.
{%- enddoc -%}
{%- capture lx_nl %}
{% endcapture -%}
{%- assign lx_ok = false -%}
{%- if lx_nl.size > 0 and lx_nl.size < 3 -%}
  {%- assign lx_ok = true -%}
  {%- if html contains '<textarea' -%}{%- assign lx_ok = false -%}{%- endif -%}
  {%- if html contains '<pre>' or html contains '<pre ' -%}{%- assign lx_ok = false -%}{%- endif -%}
  {%- if html contains '<script>' -%}{%- assign lx_ok = false -%}{%- endif -%}
  {%- assign lx_auf = html | split: '<script' | size -%}
  {%- if modus == 'filter' -%}
    {%- if html contains '<style' -%}{%- assign lx_ok = false -%}{%- endif -%}
    {%- assign lx_zu = html | split: '></script>' | size -%}
    {%- if lx_auf != lx_zu -%}{%- assign lx_ok = false -%}{%- endif -%}
  {%- elsif modus == 'karten' -%}
    {%- assign lx_json = html | split: '<script type="application/json"' | size -%}
    {%- if lx_auf != lx_json -%}{%- assign lx_ok = false -%}{%- endif -%}
  {%- else -%}
    {%- assign lx_ok = false -%}
  {%- endif -%}
{%- endif -%}
{%- if lx_ok -%}
  {{- html | replace: lx_nl, ' ' | ${kettenText()} -}}
{%- else -%}
  {{- html -}}
{%- endif -%}
`;

const FILTER_ALT = `    {% content_for 'block',
      type: 'filters',
      id: 'filters',
      results: collection,
      results_size: collection.products_count
    %}
`;
const FILTER_NEU = `    {%- capture lx_filter -%}
      {% content_for 'block',
        type: 'filters',
        id: 'filters',
        results: collection,
        results_size: collection.products_count
      %}
    {%- endcapture -%}
    {% render 'lx-verdichten', html: lx_filter, modus: 'filter' %}
`;
const KARTEN_ALT = `      {% endcapture %}

      {% render 'product-grid',`;
const KARTEN_NEU = `      {% endcapture %}
      {%- capture lx_karten -%}{% render 'lx-verdichten', html: children, modus: 'karten' %}{%- endcapture -%}
      {%- assign children = lx_karten -%}

      {% render 'product-grid',`;

function genau1(text, anker, name) {
  const n = text.split(anker).length - 1;
  if (n !== 1) throw new Error(`Anker «${name}» kommt ${n}× vor (erwartet 1×)`);
}

/** Live-Text der Section -> Text mit Verdichtung. Wirft, wenn ein Anker fehlt/doppelt ist oder der Eingriff schon drin steckt. */
export function anwenden(text) {
  if (text.includes('lx-verdichten')) throw new Error('Eingriff steckt schon in der Section');
  genau1(text, FILTER_ALT, 'filter'); genau1(text, KARTEN_ALT, 'karten');
  return text.replace(FILTER_ALT, () => FILTER_NEU).replace(KARTEN_ALT, () => KARTEN_NEU);
}

/** Umkehrung. Wirft, wenn der Stand nicht dem eingespielten entspricht. */
export function zuruecknehmen(text) {
  genau1(text, FILTER_NEU, 'filter (neu)'); genau1(text, KARTEN_NEU, 'karten (neu)');
  return text.replace(FILTER_NEU, () => FILTER_ALT).replace(KARTEN_NEU, () => KARTEN_ALT);
}
