# Index-Analyse Menü-Kategorien 02.11.2026 (GEMESSEN mit OpenSEO `inspect_urls`, Search Console, nur lesend)

Marken: **GEMESSEN** = hier abgefragt (2.11.2026, 22:00–23:40 UTC) · **QUELLE** = fremde Angabe, Ort genannt · **Hypothese** = nicht belegt.
Rohdaten: `dropship/index-analyse-0311/index_menue_0311.csv` (735 Menü-Kategorien, Status, Menü-Tiefe, Produktzahl).

## 1. Befund
- Von **735 Kategorien im Hauptmenü** sind **227 indexiert (31 %)**, **319 «Discovered – currently not indexed» (43 %)**, **179 «URL is unknown to Google» (24 %)**, 6 «Crawled – currently not indexed», 4 «Not found (404)» (alle vier laden heute mit HTTP 200 und sind in 9 Kanälen veröffentlicht: Googles Stand ist alt).
- Alle 720 älteren Menü-Kategorien stehen in der Sitemap (GEMESSEN gegen `sitemap_collections_*.xml`). Google hat sie also gesehen oder kennt sie, **ruft sie aber nicht ab**. Nicht in der Sitemap: nur die 15 am 2.11. 16:47 UTC neu angelegten Kleider-/Jacken-Unterfilter (Sitemap hinkt).
- Je tiefer im Menü und je kleiner die Kategorie, desto seltener indexiert: Tiefe 1: 65 %, Tiefe 2: 46 %, Tiefe 3: 23 %; unter 20 Produkte: 11 %, 20–99: 20 %, ab 100: 50 %.
- **Selbst grosse Oberkategorien fehlen**: `uhren` (4 226 Produkte), `damen-schuhe`, `herren-schuhe`, `spielzeug`, `werkzeug-maschinen` sind «entdeckt» oder «unbekannt».

## 2. Wahrscheinliche Hauptursache: zu schwere Seiten (Hypothese, aber mit gemessenen Zahlen)
- GEMESSEN (rohes HTML ohne Kompression): Startseite 1,46 MB; Produktseite 1,44 MB; **Kategorieseiten Median 2,08 MB, 24 von 59 gemessenen ≥ 2 MiB, Maximum 2,65 MB**.
- **Davon 1,02 MB reine Kopfzeile**: das mobile Menü (`header-drawer`) allein 847 KB, das Desktop-Menü 152 KB; 1 473 Links, nur 744 verschieden (jede Adresse doppelt). Rund die Hälfte der Kopfzeile ist Leerraum/Einrückung (GEMESSEN: 48 %, ohne Leerraum rund 525 KB).
- QUELLE: Google-Blog «Inside Googlebot» (developers.google.com/search/blog/2026/03/crawler-blog-post): Googlebot liest **nur die ersten 2 MB** des rohen HTML. Auf Seiten darüber fehlen Fuss und die unteren Produktkarten; zudem kostet jede Seite viel Abrufzeit, was bei ~57 000 aktiven Produkten die Abrufrate drückt.
- Hypothese: das schwere Menü ist ein wesentlicher Grund, warum Google zögert. Bewiesen ist nur, dass die Seiten schwer sind und viele über der Grenze liegen.

## 3. Plan
1. **Kopfzeile schlanker machen** (Theme, nur Leerraum, gleiche Darstellung): `snippets/header-drawer.liquid` fängt das Menü mit `capture` ein und gibt es ohne Zeilenumbrüche und Doppel-Leerzeichen aus. Erwartung (nicht gemessen): −400 bis −500 KB je Seite, Kategorieseiten Median rund 1,6 MB. Vorbereitet, **noch nicht live**: der Shop steht bei 20 von 20 Themes, ein Entwurf zum Prüfen lässt sich erst nach dem Löschen eines alten Themes anlegen (Besitzer-Entscheid). Prüfung: Entwurf laden, Kopfzeile Zeichen für Zeichen mit der Live-Fassung vergleichen (nur Leerraum darf abweichen), Seitengrösse messen, erst dann veröffentlichen.
2. **Anträge in der Search Console** (rund 3–5 je Tag, Betreiber): zuerst die Oberkategorien (Liste unten). Anträge wirken innerhalb von Stunden, `inspect_urls` hinkt (erst am nächsten Morgen messen).
3. **Nach 7 und 14 Tagen neu messen** (gleiches Verfahren, gleiche 735 Adressen), um Wirkung von Menü-Gewicht und Anträgen zu trennen.
4. Nicht tun: Menü-Links entfernen (die Menüs sind das Netz der internen Links) und nichts in Google-Daten oder Sitemap «nachhelfen» (Shopify erzeugt die Sitemap selbst).

## 4. Anträge: nächste 25 (nicht indexiert, ab 100 Produkten, Oberkategorien zuerst)
| # | Seite | Produkte | Google-Stand |
|---|---|---|---|
| 1 | `/collections/uhren` | 4226 | entdeckt |
| 2 | `/collections/fitness-training` | 2008 | entdeckt |
| 3 | `/collections/auto-kfz-zubehoer` | 769 | entdeckt |
| 4 | `/collections/jacken-outdoor` | 690 | entdeckt |
| 5 | `/collections/💎-premium-ab-chf-80` | 8422 | entdeckt |
| 6 | `/collections/luxestyle-premium` | 3812 | entdeckt |
| 7 | `/collections/blitzversand-schweiz` | 2942 | unbekannt |
| 8 | `/collections/outdoor-garten` | 2507 | entdeckt |
| 9 | `/collections/spielzeug` | 2436 | entdeckt |
| 10 | `/collections/damen-schuhe` | 2352 | entdeckt |
| 11 | `/collections/herren-weitere-taschen` | 2171 | unbekannt |
| 12 | `/collections/werkzeug-maschinen` | 2123 | entdeckt |
| 13 | `/collections/herren-schuhe` | 2037 | unbekannt |
| 14 | `/collections/damen-weitere-taschen` | 1841 | unbekannt |
| 15 | `/collections/kinderschuhe` | 1502 | entdeckt |
| 16 | `/collections/viral-hits` | 1351 | unbekannt |
| 17 | `/collections/parfum-duefte` | 1284 | entdeckt |
| 18 | `/collections/haustier-hunde` | 1266 | entdeckt |
| 19 | `/collections/naegel-manikuere` | 1159 | unbekannt |
| 20 | `/collections/smartwatches-wearables` | 1032 | entdeckt |
| 21 | `/collections/rucksaecke-material-gruppe` | 844 | entdeckt |
| 22 | `/collections/make-up` | 826 | entdeckt |
| 23 | `/collections/herren-uhren` | 761 | entdeckt |
| 24 | `/collections/uhren-herren` | 743 | entdeckt |
| 25 | `/collections/elektronik-kleinteile` | 733 | entdeckt |

Klickweg: search.google.com/search-console → oben «URL prüfen» → Adresse (https://luxestyle.ch + Seite) einfügen → «Indexierung beantragen». Bei «Kontingent überschritten» den Rest am nächsten Tag und notieren, ab welcher Nummer es stoppte.

## 5. Unbekannt / nicht gemessen
Ob das Gewicht der Seiten die Hauptursache ist; wie viel die Kopfzeilen-Verschlankung bringt; Google-Stand der 818 Kategorien, die nicht im Menü stehen; Stand der Produktseiten (nur Stichprobe); Ladezeiten für Kunden.
