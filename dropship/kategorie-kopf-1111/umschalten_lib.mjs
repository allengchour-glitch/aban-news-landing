// Reine Logik fuer umschalten.mjs (ohne Netz), damit sie offline getestet werden kann (test_umschalten.mjs).
// 12.11.2026, Pruefrunde: main-collection.liquid wird DIREKT gepatcht (kein Typwechsel auf die Kopie mehr), Ruecknahmen
// entfernen nur die eigenen Teile und pruefen danach gegen die Sicherung.
import { createHash } from 'node:crypto';
export const md5 = s => createHash('md5').update(s).digest('hex');

// Ausgangsstaende (gelesen 11.11. 22:42 UTC und erneut 12.11. 00:33 UTC)
export const COLLECTION_BASIS_MD5 = '63dd0f313d0fb00b888807611952375e';
export const MAIN_BASIS_MD5 = '84a055d53bbd90b1b0b1f47b5b1dae40';

// sections/main-collection.liquid: genau dieser Teil wird ersetzt (Karte erfassen, Karten 1 bis 4 eager)
export const KARTE_ALT = "            {% content_for 'block', type: '_product-card', id: 'product-card', closest.product: product %}\n            {% # theme-check-enable %}\n";
export const KARTE_NEU = "            {%- capture lx_karte -%}{% content_for 'block', type: '_product-card', id: 'product-card', closest.product: product %}{%- endcapture -%}\n            {% # theme-check-enable %}\n            {%- comment -%}\n              lx-kopf-kompakt 11.11.2026: card-gallery laedt eager nur bei section.index < 5 (hier nie). Darum je Karte einzeln:\n              Seite 1, Karten 1 bis 4 eager (ohne sizes auto), Karten 1 und 2 zusaetzlich fetchpriority high; ab Karte 5 immer lazy.\n              Nur der erste Treffer in der Karte (= erstes Galeriebild) wird ersetzt.\n            {%- endcomment -%}\n            {%- liquid\n              if paginate.current_page == 1 and forloop.index0 < 4\n                assign lx_karte = lx_karte | replace_first: 'loading=\"lazy\"', 'loading=\"eager\"' | replace_first: 'sizes=\"auto, ', 'sizes=\"'\n                if forloop.index0 < 2\n                  assign lx_karte = lx_karte | replace_first: 'fetchpriority=\"auto\"', 'fetchpriority=\"high\"'\n                endif\n              else\n                assign lx_karte = lx_karte | replace_first: 'loading=\"eager\"', 'loading=\"lazy\"'\n              endif\n            -%}\n            {{- lx_karte -}}\n";

export function mainPatchen(t) {
  if (t.includes('{%- capture lx_karte -%}')) throw new Error('main-collection: Patch ist schon drin');
  if (t.split(KARTE_ALT).length !== 2) throw new Error('main-collection: Karten-Stelle nicht genau einmal gefunden');
  return t.replace(KARTE_ALT, () => KARTE_NEU);
}
export function mainEntpatchen(t) {
  if (t.split(KARTE_NEU).length !== 2) throw new Error('main-collection: eigener Patch nicht genau einmal gefunden');
  return t.replace(KARTE_NEU, () => KARTE_ALT);
}

// layout/theme.liquid (nur mit ANKUENDIGUNG=1): eine Zeile vor </head>
export const ANK_ZEILE = "{%- render 'lx-ankuendigung-stabil' -%}\n";
export function ankEinfuegen(t) {
  if (t.includes("render 'lx-ankuendigung-stabil'")) throw new Error('theme.liquid: Zeile ist schon drin');
  if (t.split('</head>').length !== 2) throw new Error('theme.liquid: </head> nicht genau einmal');
  return t.replace('</head>', () => ANK_ZEILE + '</head>');
}
export function ankEntfernen(t) {
  if (t.split(ANK_ZEILE + '</head>').length !== 2) throw new Error('theme.liquid: eigene Zeile vor </head> nicht genau einmal gefunden');
  return t.replace(ANK_ZEILE + '</head>', () => '</head>');
}

// Ruecknahme einer Datei: nur die eigenen Teile entfernen. Ergebnis gleich Sicherung -> schreiben.
// Sonst wurde die Datei seither anderweitig geaendert: Abbruch; mit fremd=true wird das ENTFERNTE Ergebnis geschrieben
// (fremde Aenderungen bleiben erhalten), nie die ganze Sicherung.
export function ruecknahmePlan(ist, sicherung, entfernen, fremd) {
  let ohne;
  try { ohne = entfernen(ist); } catch (e) { return { ok: false, grund: e.message }; }
  if (ohne === sicherung) return { ok: true, schreiben: ohne, fremd: false };
  if (fremd) return { ok: true, schreiben: ohne, fremd: true };
  return { ok: false, grund: 'Datei seit dem Umschalten anderweitig geaendert (FREMD_UEBERSCHREIBEN=1 entfernt nur die eigenen Teile)' };
}

// templates/collection.json: neue Snippets, lux_usp_coll entfaellt, main bleibt main-collection
export function umbauen(d) {
  const n = structuredClone(d);
  for (const k of ['lux_breadcrumb', 'lux_hero', 'lux_subchips', 'lux_usp_coll', 'main', 'luxe_review_assets']) if (!n.sections[k]) throw new Error('Abschnitt fehlt: ' + k);
  if (n.sections.main.type !== 'main-collection') throw new Error('main ist nicht main-collection: ' + n.sections.main.type);
  n.sections.lux_breadcrumb.settings.custom_liquid = "{% render 'lx-kopf-pfad' %}";
  n.sections.lux_hero.settings.custom_liquid = "{% render 'lx-kopf-kompakt' %}";
  n.sections.lux_subchips.settings.custom_liquid = "{% render 'lx-kopf-chips' %}";
  delete n.sections.lux_usp_coll;
  const vorne = ['lux_breadcrumb', 'lux_hero', 'lux_subchips', 'luxe_review_assets', 'main'];
  n.order = [...vorne, ...d.order.filter(k => !vorne.includes(k) && k !== 'lux_usp_coll')];
  return n;
}
// Ruecknahme collection.json bei fremder Aenderung (nur mit FREMD_UEBERSCHREIBEN=1): nur die eigenen Teile zuruecksetzen
// (drei custom_liquid, lux_usp_coll wieder da, Reihenfolge wie vorher), alles andere bleibt wie es jetzt ist.
export function zurueckbauen(ist, vor) {
  const n = structuredClone(ist);
  for (const k of ['lux_breadcrumb', 'lux_hero', 'lux_subchips']) {
    if (!n.sections[k] || !vor.sections[k]) throw new Error('Abschnitt fehlt: ' + k);
    n.sections[k].settings.custom_liquid = vor.sections[k].settings.custom_liquid;
  }
  n.sections.lux_usp_coll = structuredClone(vor.sections.lux_usp_coll);
  const sek = {}; for (const k of [...Object.keys(vor.sections), ...Object.keys(n.sections)]) if (k in n.sections && !(k in sek)) sek[k] = n.sections[k];
  n.sections = sek;
  const vorher = vor.order.filter(k => k in n.sections);
  n.order = [...vorher, ...n.order.filter(k => !vorher.includes(k))];
  return n;
}
export const jsonAus = s => JSON.parse(s.slice(s.indexOf('{')));

// Gepruefte Staende der neuen Snippets (md5 der Dateien in neu/snippets, hochgeladen 15.11. 20:26 UTC ins MAIN 213991391623); umschalten.mjs vergleicht vor LIVE.
export const SNIPPET_MD5 = {"snippets/lx-kopf-kompakt.liquid": "3b125c208666004d1236f51fdf711b7d", "snippets/lx-kopf-chips.liquid": "74104de0caa980fb1d751e0261f5d6bd", "snippets/lx-kopf-pfad.liquid": "430438e294e929cf1491455059e483a8", "snippets/lx-ankuendigung-stabil.liquid": "0ada26e7eb47028c6b36d7984f7b3953"};
