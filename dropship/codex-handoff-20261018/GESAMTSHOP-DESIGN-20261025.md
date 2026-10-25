# LuxeStyle: ein zusammenhängender Gesamtshop

25.10.2026, Europe/Zurich. Lokaler Design-/Umsetzungsentwurf zur Inhaberprüfung, kein veröffentlichtes Theme. Der Auftrag umfasst Startseite, gesamte Hauptnavigation, Kategorie-/Filterdarstellung, Produktkarten, Produktdetails, Suche, Warenkorb und mobile Oberfläche. Die zwei bereits vorbereiteten Beschreibungs-Diffs und der neutrale Video-CTA werden als Teilarbeiten erhalten.

## Beobachtete Grundlage

Aktuelle Quelle https://luxestyle.ch/ am25.10. über einen einzelnen gezielten Firecrawl-Designabruf mit Branding, Text und vollständiger1440px-Screenshotaufnahme gelesen; kein Crawl/Map. Root hat tatsächlich obere und mittlere Bildbereiche angesehen. Screenshot1440×12487, SHA256158498c886cb62d64f3160b38a2a4ef30c5e7ebed5090dd062a0133c1ce76086. Zusätzlicher Roh-HTML-Gegencheck ist auf1.5MB begrenzt und daher nur eine Teilaufnahme, keine vollständige Seitenquelle. Navigation und Filter über drei gezielte aktuelle Kategorie-Seiten gegenbelegt, weitere vorhandene Unterlinks nur als beobachtete Links erfasst.

Branding nennt Inter als Textschrift und Iowan Old Style mit Georgia-/Serif-Fallback als Überschriftenschrift. Beobachtete Rollen: Hintergrund#FAF7F2, Primärakzent#C9A35F, Braun#8B7355, ergänzendes Beige#D4B896, Text#535352. Diese vom Werkzeug extrahierten Werte sind Quellhinweise, keine pixelgenaue Analyse jedes Elements. Die tatsächlich angesehenen Bilder zeigen cremefarbene Flächen, eine dunkle Mode-Heroaufnahme, viele parallel laufende Produktreihen und lange Wege bis zu den Kategorieeinstiegen.

Aktives Theme MAIN187533001089, Horizon. Live-Kerndateien frisch gelesen:25 Startsektionen,22 aktiv,18 Produktreihen davon15 aktiv; Kategorien erst anPosition8. Kategorie hat Filter/Sortierung bereits, Produktseite hat Kaufbereich/Merkliste/Sticky-CTA/Trust/Details bereits, Cart Drawer existiert. Das neue Konzept verbessert diese vorhandenen Funktionen und behauptet nicht, sie hätten gefehlt.

## Echte Probleme und Entwurfsentscheidungen

| Bereich | Belegter Ist-Zustand | Zusammenhängende Verbesserung |
|---|---|---|
|Startseite |22 aktive Sektionen,15 aktive Produktreihen; Kategorieeinstieg erst8. |Kategorien direkt nach Hero/Service. Für die Gesamtvorschau ruhige Auswahl statt langer Reihenfolge vieler ähnlicher Reihen. Ein enger echter Theme-Diff verschiebt nur die bestehende Kategorie-Sektion nach3; Reduktion bleibt gesonderter Entwurf. |
|Navigation |12 Kaufbereiche plus Merkliste; unter Mehr liegen weitere Einstiege. |Sechs aufklappbare Hauptbereiche,44 vorhandene Unterlinks, keine erfundenen Sammel-URLs. Suche gut sichtbar und mobil erreichbar. |
|Kategorien/Filter |Technik zeigt u.a. Mode/Partydeko/Schmuck als Produkttypwerte; Grössen mischen Zahlen,S/L,cm/mm/Zoll. Auch Schuhe mischen Grössensysteme. |Kategoriegerechte Filter aus tatsächlich vorhandenen Produktoptionen, aktive Filterchips und klares Zurücksetzen. Preis/Grösse/Farbe nur soweit Quelle passt. Kein automatisches US→EU-Mapping, keine erfundenen Kompatibilitäts-/Materialwerte, keine internen Tags als Kundenfilter. |
|Produktkarten |Lange Produktnamen und dichte Reihen dominieren. |Einheitliche Bildfelder mit unveränderten echten Fotos, kurze neutrale Namen, klare CHF-Preise und ein eindeutiger Weg zur Auswahl. Keine erfundenen Sale-/Bewertungs-/Knappheitssignale. |
|Produktdetail |Umfangreiche bestehende Funktionen; zwei konkrete Beschreibungsentwürfe liegen vor. |Saubere Hierarchie Bild→Name→Preis→echte Ausführung→CTA→Details/Policies. Echte Variante und Preis koppeln; ungeklärte Film-/Technikclaims nicht neu übernehmen. |
|Warenkorb |Cart Drawer und Seite existieren; öffentliche Versandanzeige rechnet mitCHF50. |Übersichtliche Mengen-/Preisdarstellung und sichtbare Fortsetzung. Vorschau-Warenkorb bleibt vollständig im Speicher; kein tatsächlicher Checkout oder Shopwarenkorb. |
|Mobil |Desktopaufnahme allein belegt keine mobile Funktionsqualität. |Eigene390px-Abnahme für Menü, Suche, Filterdialog, Produktauswahl und Warenkorb; keine horizontale Überbreite, erreichbare Schliessen-/Zurückwege, Tastatur/Escape/Fokus prüfen. |
|Vertrauen/Inhalte |Homepage zeigt bestehende Review-/Liefer-/Lagermengen-/Rabattelemente; deren jeweilige Herkunft/Gültigkeit hier nicht neu geprüft. Footer zeigt teils englisches Sign up. |Keine dieser unbestätigten Aussagen in den neuen Entwurf kopieren. Klare deutschschweizerische Serviceverweise ohne erfundene Frist oder Herkunft. Kein Newsletter-/Flowumbau und keine echte Formularsendung. |

## Gestaltungsregeln für alle Seitentypen

- Creme bleibt die Grundfläche, mit dunklerem vorgeschlagenem Text#302B27 für klare Lesbarkeit. Gold/Taupe sparsam für wichtige Aktionen; Zustände nicht nur über Farbe anzeigen.
- Textbasis im Entwurf16px und ruhige Zeilenhöhe, kurze Überschriften, grössere konsistente Abstände. Das sind vorgeschlagene Werte; die Extraktion einzelner12px-Textstellen ist keine pauschale Aussage über alle Live-Schriften.
- Ein gemeinsamer Header, ein klarer Suchzugang, wiederkehrende Produktkarten, Buttons und Dialoge. Keine neue Markenidentität oder fremde Stockbilder.
- Desktop grosszügige Raster; mobil klare ein-/zweispaltige Inhalte, echte Buttons mit geeigneten Zielflächen. Bilder mit object-fit:contain, keine generative Produktveränderung.
- Native Dialog-/Tastaturmechanik, erkennbare Fokuszustände, beschriftete Eingaben, sinnvolle Überschriften und respektierte reduzierte Bewegung. Diese Ziele werden anhand der gebauten Vorschau überprüft; keine automatische WCAG-Zertifizierung.
- Sechs tatsächlich aktive bestehende Produkte bilden die begrenzte Datenstichprobe. Aktuelle native CHF-Preise und öffentliche Variantenpreise wurden mit Dezimalrechnung abgeglichen. Die vollständige Shopauswahl und alle Katalogzuordnungen sind dadurch nicht geprüft oder migriert.

## Quelle und Vorschlag sauber trennen

Die Webextraktion enthält auch Metadaten/Text aus eingebetteten Shop-/Shop-Pay-Frames. Ein dort geliefertes robots:none ist kein belegter noindex-Befund der Startseite. Im begrenzten Roh-Root-Head wurde diese Behauptung nicht bestätigt. Keine SEO-/Indexierungsänderung oder neue Search-Console-Anforderung daraus ableiten.

Kategorie-Obergruppen und die zugehörige Zuordnung der sechs Musterprodukte sind ein Designvorschlag. Vorhandene echte Collection-URLs bleiben als Herkunft erhalten, aber44 beobachtete Links bedeuten keine44 frisch geprüften Zielseiten. Drei ausdrücklich abgefragte Kategorieziele liefern200 mit passendem Canonical. Eine erfolgreiche HTTP-Antwort belegt kein Ranking und keine tatsächliche Filter-/Kaufinteraktion.

Öffentliche GratisversandanzeigeCHF50 bleibt erhalten; die bewusst interneCHF45-Regel nach Rabatt wird nicht geändert oder aus Theme-UI-Text als umgestellt behauptet. account.luxestyle.com.co bleibt erhalten. Die untersuchten5000-Cent-Stellen betreffen UI-Anzeigen, keine gelesene Shippingrate. Kein Rabatt/Budget, keine DNS-/Flow-/Shop-/Feedkonfiguration geändert.

## Umsetzungsunterlagen

`preview/index.html` ist die zusammenhängende lokal bedienbare Gesamtvorschau. `structure/START.json` enthält die komplette alte/neue Navigation und Filtermatrix. `theme/index-order.diff` ist ein eng begrenzter Entwurf gegen den frisch gelesenen aktiven Quellstand: nur Reihenfolge, keine Daten-/Settings-/Versandänderung. Die Liquid-Gegenprüfung im bewusst kleinen Theme-Auszug bleibt wegen fehlender Abhängigkeiten unvollständig; Baseline und Vorschlag haben0 zusätzliche Diagnosen. Das ist kein vollständiger Theme-Render oder eine Livefreigabe.

Die Quelle config/settings_data.json hat eine offen dokumentierte MD5-/Antwortabweichung und wird nicht geändert. Die übrigen relevanten Quellhashes sowie der Homepage-Diff sind gesondert geprüft. Vor späterer autorisierter Umsetzung die tatsächlichen Theme-/Quellversionen frisch gegenlesen, enge Diffs und Rücksetzreferenzen verwenden und die Gesamtansicht im Shopify-Theme prüfen. Kein ungeprüfter Merge, Workflow oder Deployment.
