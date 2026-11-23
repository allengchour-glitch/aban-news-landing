# Webseiten-Fixes 23.11.2026 (Layout-Verschiebung, Gewicht, Bedienbarkeit)

Grundlage: Auftrag des Besitzers «ja und alle sonstige verb.» und «und fix» (22.11.). Die Funde kommen aus einer Messrunde mit 15 Agenten (Workflow `wf_7de01989-5d1`): 50 Funde, 9 gegengeprüft, davon diese 6 Theme-Dateien als bestätigt eingespielt. Die übrigen Funde sind nicht gegengeprüft oder brauchen einen Entscheid des Besitzers. Sie sind nicht eingespielt.

## LIVE (MAIN-Theme 214565814663, 23.11.2026 02:34:05 bis 02:37:04 UTC)

| Datei | Änderung | Gemessen (Nachprüfung `wf_e1da77bd-33f`, 4 Prüfer + Skeptiker + Kritik) |
|---|---|---|
| `sections/luxe-edit-home.liquid` | Stilblock der Startseite vor `#lx-top` verschoben; srcset des Kampagnenbilds nur bis 1600; `clip-path:inset(0 0 15% 0)` auf dem Hero-Video unter 760 px | Handy 393×727 CLS 0,719 → 0,0006 (Replay je 6 Läufe), live 0,006; 360×720 0,016 → 0,0006; Desktop-Replay 0,82 → 0; LCP-Element Handy VIDEO → IMG (393: 6 von 6, 360×640: 13 von 14); Standbild 2 → 1 Abruf (width=1600 und 3200 byte-gleich); Endgeometrie 0 von 13 434 Elementen über 1 px verschoben; Video läuft; unteres Band optisch gleich |
| `layout/theme.liquid` | `<style id="lx-wish-frueh">` vor `</head>`; Übersetzungs-Skript `fix()` gedrosselt (`lxFixStart`, 300 ms, nur bei neuen sichtbaren Knoten) | Produkt: Herz-/Titelsprung 0,1336 vorher 30 von 30, nachher 0 von 45 Replays und 0 von 5 live; Fortura-Produkt 0,054 → 0,0006; `fix()` Handy Kostüme 1,6–1,7 s → 0,14–0,17 s; Filter deutsch nach Filtern, Sortieren, Seitenwechsel |
| `snippets/product-media.liquid` | Galeriebilder ausser dem Hauptbild `loading=lazy` | Handy P1 3 634 → 3 125 KB, Bilder 739 → 239 KB; LCP unverändert (kein Gewinn); Wischen, Zoom, Variante, Kauf-POST, Editor gehen |
| `assets/base.css` | `.shopify-section-group-footer-group:has(> .section-background){position:relative}` | Nur deterministisch belegt (Footer-Rennen tritt in Replays nicht spontan auf) |
| `sections/product-information.liquid` | Text im Sticky-Kaufknopf (Handy) visuell versteckt statt `display:none` | Bedienname leer → «In den Warenkorb legen»; Leiste pixelgleich |
| `assets/paginated-list.js` | Seite 2 nur bei unendlichem Scrollen vorladen | Kategorie: Vorladen vorher 23 von 23, nachher 0 von 23 Replays, live 0 von 4; Suche lädt weiter vor |

Cache: Ab 02:55 UTC trugen alle 27 Live-Dokumente den neuen Stand (auch ohne Query). Die sechs Dateien waren um 05:46 UTC zeichengleich mit `sicherung/*.nach`.

## Rücknahme

```bash
cd dropship/webseite-fixes-2311
./tok.sh                                   # Token per Client-Credentials (SHOPIFY_SHOP/_CLIENT_ID/_CLIENT_SECRET), Datei .tok
ZURUECK=1 python3 apply.py                 # Trockenlauf
ZURUECK=1 LIVE=1 python3 apply.py          # alle sechs Dateien auf .vor
ZURUECK=1 LIVE=1 DATEIEN=assets/base.css python3 apply.py   # nur eine Datei
```

Die Rücknahme bricht ab, wenn eine Datei seither von jemand anderem geändert wurde (`FREMD=1` überschreibt bewusst).

## Offen (nicht eingespielt)

- **Empfohlen, vorbestehend:** Derselbe Hintergrund-Sprung wie im Footer tritt an «Ähnliche Produkte» auf (`product-recommendations > .section-background`, live 1 von 5 Handy-Läufen mit CLS 1,0). Auch die Kopfgruppe ist betroffen (Startseite spontan 0,25 aus `lux_searchbar`). Vorschlag: in `assets/base.css` die Regeln `.shopify-section:has(> product-recommendations > .section-background){position:relative}` und `.shopify-section-group-header-group:not(.header-section):has(> .section-background){position:relative}` ergänzen. Sie sind nur deterministisch geprüft; vor dem Schreiben Endgeometrie, Sticky-Kopf und Suchleiste messen.
- **Optional:** Hero-Text auf dem Handy bis `#lx-worlds` unsichtbar lassen, mit 3-s-Rückfall (nur wenn der HTML-Strom mitten im Hero stockt, 0,03 bis 0,06).
- **Optional, latent:** `lxFixPlan` beobachtet kein `characterData`. Englische Filterbegriffe gibt es live heute keine.
- **Vorbestehend, gemessen:** Warenkorb CLS 0,115 bis 1,18 (Versandbalken), Merkliste 0,26 bis 0,44, Cookie-Hinweis verdeckt auf 360×640 die Hero-Knöpfe, Suchseite 2,31 MB.

Ungemessen: Safari/iPhone, echtes Handy, Feld-Werte (CrUX), Wirkung auf Käufe.
