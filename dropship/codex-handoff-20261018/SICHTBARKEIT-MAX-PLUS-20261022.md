# LuxeStyle: Sichtbarkeits-Maximierung Plus

Stand: öffentliche Gegenprobe am 22.10.2026, keine Live-Änderung.

## Neue technische Befunde

| Bereich | Nachweis | Bedeutung |
|---|---|---|
| Startseite | HTTP 200, Canonical passend, H1 vorhanden, WebSite- und Organization-JSON-LD vorhanden, SearchAction vorhanden | Technische Basis vorhanden; keine Indexierungsfreigabe daraus ableiten |
| Collection T-Shirts & Tops | HTTP 200, Canonical passend, H1 vorhanden, BreadcrumbList und ItemList vorhanden | Kategorie ist grundsätzlich suchmaschinenlesbar |
| Projektor-Produktseite | HTTP 200, Canonical passend, Product-/Offer-JSON-LD und BreadcrumbList vorhanden, CHF 34.90 und InStock maschinenlesbar | Produktbasis für organische Auffindbarkeit vorhanden |
| Bild-Alttexte | Auf der Projektor-Seite 70 Bilder, davon 67 mit Alt-Attribut | Drei fehlende Alt-Attribute als kleiner, konkreter SEO-/Accessibility-Fix prüfen |
| Versanddaten | Öffentliches Organization-JSON-LD nennt Gratisversand ab CHF 40.50 | Konflikt mit der verbindlichen Vorgabe CHF 50 öffentlich / CHF 45 intern; vor Merchant-, SEO- und Conversion-Ausbau klären |
| Ladeumfang | Roh-HTML der Startseite ca. 2.6 MB, Collection ca. 1.8 MB, Produktseite ca. 0.8 MB | Kein Lighthouse-Befund; mögliche Optimierung durch Bildgrössen, Lazy Loading und App-Skripte prüfen |

## Priorität A: Versandangabe bereinigen

Die öffentliche strukturierte Versandangabe darf nicht dauerhaft CHF 40.50 ausgeben, wenn die verbindliche Vorgabe CHF 50 öffentlich lautet. Zuerst müssen die tatsächlich aktiven Shopify-Versandregeln und der sichtbare Banner gegengeprüft werden. Danach erst sollten JSON-LD, Merchant-Daten, Collection-Texte und Social-Captions dieselbe bestätigte Grenze verwenden.

Keine Änderung wurde vorgenommen. Die bestehende CHF-50-/CHF-45-Vorgabe bleibt erhalten.

## Priorität B: Bild- und Produktdaten

- Die drei Bilder ohne Alt-Attribut auf der Projektor-Seite einzeln identifizieren.
- Alttext nur aus sichtbarem, belegtem Produktinhalt erstellen.
- Keine erfundenen Funktionen, Materialien, Masse oder Swiss-made-Aussagen in Alttexten.
- Produkt-SKU, Preis, Verfügbarkeit und Variante vor einer Merchant-Neuverarbeitung erneut gegen Shopify prüfen.

## Priorität C: Strukturierte Daten erweitern

Bereits vorhanden und zu erhalten:

- WebSite
- Organization
- Product
- Offer
- BreadcrumbList
- ItemList

Nur nach Datenprüfung ergänzen:

- eindeutige itemListElement-Ziele je Unterkategorie
- additionalProperty nur aus gepflegten Produktattributen
- shippingDetails erst nach bestätigter CHF-50-Regel
- keine erfundenen AggregateRating- oder Review-Werte

## Priorität D: Technische Reichweite

- Bildvarianten und srcset auf Startseite und Collectionseiten prüfen.
- Nicht sichtbare App-Skripte und doppelte Tracking-Ladungen messen, ohne Tracking zu deaktivieren.
- Lazy Loading unterhalb des sichtbaren Bereichs prüfen.
- Mobile Largest Contentful Paint und Layout Shift mit einem kleinen öffentlichen Test messen.
- Canonical, hreflang, robots und Sitemap nur bei konkretem Befund ändern.

## Priorität E: Such- und Kategorienlogik

- Filtermatrix Technik & Gadgets und Schuhe als Pilot verwenden.
- Suchregel für paperang erst nach Lesen der bestehenden Search-&-Discovery-Regeln vorbereiten.
- Kategorie- und Unterkategorie-Seiten intern mit relevanten Produktseiten verknüpfen.
- Keine 181 Collections als neue Navigationsstruktur aktivieren; Duplikate bleiben bis zur Freigabe unangetastet.

## Konkrete Reihenfolge

1. Versandgrenze live und strukturiert abgleichen.
2. Drei fehlende Alt-Attribute der Projektorseite prüfen.
3. Mobile Performance und doppelte Skripte messen.
4. Search-&-Discovery-Regeln für Paperang lesen.
5. Filterpilot für Technik & Gadgets und Schuhe testen.
6. Erst danach einen begrenzten, dokumentierten Änderungs-Diff vorlegen.

Keine Shop-, Theme-, Feed-, Merchant-, DNS-, Budget-, Flow- oder Social-Änderung wurde durch diese Prüfung ausgelöst.
