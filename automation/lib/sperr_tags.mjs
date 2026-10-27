/**
 * Sperr-Tags: EINE Quelle für die Listen der Kategorie-Engine (lib/kategorien.mjs) und der Taxonomie «Rest des Shops» (dropship/taxonomie-2610-b/kern.mjs).
 * Vorher standen zwei Listen mit verschiedenem Umfang in zwei Dateien (8 und 11 Tags) und liefen unbemerkt auseinander.
 *
 * BASIS: Produkte mit einem dieser Tags kommen in KEINE Kategorie (Erwachsene, Tabak, Waffen, kein CH-Stecker …).
 * ZUSATZ_TAXONOMIE: nur die neuen Bereichs-Kategorien (Schmuck, später Handy, Computer, Spielzeug …) schliessen zusätzlich aus
 *   · google-gesperrt-adult, lizenz-nicht-bewerben: nicht zu bewerben (Google, Lizenz),
 *   · fortura: Kostüm- und Party-Ware, die eigene Collections hat.
 * Die alte Engine sperrt diese drei BEWUSST nicht: ein Fortura-Artikel bleibt in seiner alten Themenkategorie auffindbar
 * (lib/kategorien_test.mjs, «sperr: Gegenprobe gewöhnliche Tags sperren nicht» prüft genau das für fortura). Wer die Basisliste verändert, ändert beide.
 * Ausnahme Schmuck: die vorhandenen Collections im neuen Schmuck-Ast (sub-ringe, sub-ohrringe, sub-armbaender, schmuck-sets …) tragen mit SCHMUCK=1 die drei Zusatz-Tags als `sperrZusatz`
 * (lib/kategorien.mjs), damit dort dieselbe Ware steht wie in den neuen Seiten; Fortura-Kostümstücke bleiben in ihren Kostüm-Collections.
 */
export const BASIS_SPERR_TAGS = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch'];
export const ZUSATZ_SPERR_TAGS_TAXONOMIE = ['google-gesperrt-adult', 'lizenz-nicht-bewerben', 'fortura'];
export const SPERR_TAGS_TAXONOMIE = [...BASIS_SPERR_TAGS, ...ZUSATZ_SPERR_TAGS_TAXONOMIE];
