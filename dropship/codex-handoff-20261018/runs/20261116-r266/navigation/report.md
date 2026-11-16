# Schmuck: bestehende Unterkategorien und Seiten

**Shop-Prüfung:** Shopify-Shop `gid://shopify/Shop/94368563585`, LuxeStyle auf `luxestyle.ch`, Währung CHF. Alle Daten in diesem Audit wurden am 16.11.2026 nur lesend aus dem Shopify-Admin und durch einen öffentlichen GET der Zielseite erhoben.

## Befund

`/collections/schmuck` ist eine echte Shopify-Kollektion (ID `gid://shopify/Collection/755392840071`), keine Filter-URL. Die Seite antwortete mit HTTP 200, ohne Weiterleitung; der Canonical verweist auf exakt dieselbe URL. Das Main menu enthält für Schmuck 67 Menüeinträge über drei Ebenen: die Hauptkollektion, 10 direkte Unterkategorien und 56 Einträge der dritten Menüebene. Alle 67 Links sind eindeutige `/collections/<handle>`-Pfade. Jeder Pfad löst auf eine Shopify-Kollektion mit passender resourceId, positivem Produktbestand und SEO-Titel/-Beschreibung auf. Die Shopify-Collection-Abfrage stellt kein `onlineStoreUrl`-Feld bereit; deshalb sind die beobachteten Menüpfade und der öffentliche GET die Routenbelege. Für keine der 67 Menü-Kollektionen ist ein `templateSuffix` gesetzt.

Die 10 direkten Menü-Kategorien sind Ringe, Ohrringe, Halsketten & Anhänger, Armbänder & Armreifen, Für Herren, Gravur & Namen, Motive, Stile, Sets & Besonderes und Zubehör. Die öffentliche Seite rendert sie als echte Collection-Links. Fünf davon tragen die Klasse `.lx-kc__x`; gemäss aktuellem Snippet werden solche Links bei eingeklappter Desktop-Ansicht ausgeblendet und über „mehr anzeigen“ erreichbar. Auf dem gelesenen Standardzustand erschienen keine `.lx-kc__f` Filteranker im Chip-Navigationsbereich. Das sagt nichts über weitere Filterfunktionen ausserhalb dieses Bereichs aus.

Eine zusätzliche, bereits angelegte Unter-Unterkategorie-Struktur ist über Shopify-Metafelder verbunden: 11 der 67 Menü-Kollektionen haben `lux.unterfilter` vom Typ `list.collection_reference`. Die vollständigen Referenzen enthalten 31 echte Shopify-Kollektionen; alle Seiten haben einen positiven Bestand. Bei allen 31 Kindern verweist `lux.eltern` zurück auf die jeweilige Elternkollektion. Die Kinder haben selbst kein `lux.unterfilter`, die belegte Referenzstruktur endet damit dort. Die Listen waren vollständig (`hasNextPage=false`); kein Produktkatalog wurde paginiert oder gelesen.

Der Root `schmuck` und seine 10 direkten Menü-Kategorien haben derzeit keine `lux.unterfilter`- oder `lux.eltern`-Referenzen. Das aktuelle Theme-Snippet liest direkt `lux.unterfilter`; wenn das leer ist, folgt es `lux.eltern` zur Elternkollektion und liest deren `unterfilter`. Zusätzlich stellt es Nachbarkategorien aus `main-menu` dar. Dies passt zum vorhandenen Modell aus echtem Menü plus Collection-Referenzlisten.

## Empfehlung

Die vorhandenen 67 Menü-Kollektionen und 31 referenzierten Kinderseiten wiederverwenden. Vor dem Anlegen neuer Seiten zunächst die gewünschte Hierarchie diesen existierenden Collection-Handles zuordnen und anschliessend nur belegte Lücken behandeln. Es gibt bereits echte Seiten für zahlreiche Schmuck-Untergruppen; Filterparameter oder neue Duplikate sind für diese belegten Gruppen nicht erforderlich. Produkt-Stichproben waren für diesen Strukturentscheid unnötig und wurden nicht durchgeführt.

## Umfang und Grenzen

Read-only: keine Shopify-Schreibvorgänge, keine Produktabfragen, keine Massenpagination. Die Prüfung belegt Navigation, Kollektionen, Referenzen, aktuelle Routen und einen öffentlichen Seitenabruf; sie belegt weder Rankings noch Umsatzwirkung oder die Vollständigkeit nicht verlinkter Schmuckkollektionen.

Belege: `shop-identity.json`, `schema-notes.json`, `schmuck-menu-branch.json`, `schmuck-collections.json`, `schmuck-metafield-hierarchy.json`, `schmuck-public-evidence.json`.
