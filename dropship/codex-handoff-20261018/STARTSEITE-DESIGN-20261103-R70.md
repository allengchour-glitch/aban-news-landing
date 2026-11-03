# LuxeStyle: Startseite dichter und klarer gestalten

Stand: 03.11.2026, R70. Aktuelle Quelle https://luxestyle.ch/; MAIN213013037447, HTTP200. Dies ist ein geprüfter Gestaltungsvorschlag, keine Websiteänderung.

## Befund

Die Startseite enthält bereits25 Produktkarten in13 Abschnitten. Konkrete Produkte erscheinen jedoch erst bei2705px auf Desktop und2708px auf Handy. Bei der geprüften mobilen Höhe von844px entspricht das rund3.2 Bildschirmhöhen ab Seitenanfang. Der Eindruck von Leere lässt sich damit teilweise erklären: Einstieg, Kategorieübersicht und Selbstgestalten beanspruchen den oberen Seitenbereich.

| Gemessen | Desktop1440px | Handy390px |
|---|---:|---:|
| Einstiegsbereich | 640px | 472px |
| 16 Kategorie-Kacheln, gesamter Abschnitt | 821px | 969px |
| Selbstgestalten, gesamter Abschnitt | 891px | 842px |
| Beginn erster Produktkarte ab Seitenanfang | 2705px | 2708px |

[Aktueller Desktop-Ausschnitt](STARTSEITE-DESKTOP-20261103-R70.png) · [Aktueller Handy-Ausschnitt](STARTSEITE-MOBIL-20261103-R70.png).

## Konkreter Vorschlag

1. **Produkte früher zeigen.** Die vorhandene Reihe «Trends entdecken» unmittelbar nach einer kompakten Kategorieauswahl platzieren. Für den ersten Bereich acht bestehende, frisch geprüfte Artikel vorsehen. CHF-Preise und Bilder weiterhin dynamisch aus Shopify; keine neue Bestseller-Behauptung.
2. **Oben sechs klare Einstiege.** Mode, Wohnen, Technik, Beauty, Geschenke und Selbstgestalten als vorgeschlagene Gruppen; genaue vorhandene Zielseiten vor Umsetzung abgleichen. Die vollständigen16 Kategorien bleiben über «Alle Kategorien» erreichbar. Keine Collection oder Unterkategorie entfernen.
3. **Abstände gezielt verkürzen.** Feste Titel-Mindesthöhen von66px auf Desktop bzw78px auf Handy und grosse Info-/Preisabstände prüfen. Mindestens44px grosse Bedienflächen und vollständige Titel erhalten. Versteckte Bewertungsfelder sind bereits per `display:none!important` entfernt; dort liegt keine belegte leere Platzreserve. Keine Bewertungen erfinden oder verschieben.
4. **Winter und Geschenke früher einsetzen.** Die vorhandenen saisonalen Bildkarten sowie Geschenk-Einstiege nach Preis weiter oben verwenden. Bestehende Ziele und Preisfilter24.99/49.99 unverändert. Den langen Selbstgestalten-Bereich danach einordnen; der direkte Einstieg bleibt oben verfügbar.
5. **Neuen Film passend einbinden.** Der tatsächlich gerenderte R69-Markenfilm ist noch nicht live. Nach kreativer Abnahme eine eigene Videofläche verwenden und den bisherigen grossen Textüberzug passend umgestalten: Der Film enthält bereits Schrift. Originalseitenverhältnisse8:7 und3:4 erhalten, keine Texte durch pauschales `cover` abschneiden. Poster, Pause und Reduced-motion berücksichtigen; kein zweiter grosser Bannerblock darüber.

Empfohlene Reihenfolge: kompakter Einstieg mit Film → sechs Kategorieeinstiege → erste Produktreihe → Winter/Geschenke → Selbstgestalten → weitere passende Produktauswahl → Bestellinformationen.

Die erste Umsetzungsstufe sollte ausschliesslich die bestehende Produktreihe vor den langen Selbstgestalten-Block ziehen und die obere Kategorieauswahl verdichten. Ein Ziel für die Vorschau ist ein Produktbeginn spätestens bei etwa1400px auf Handy. Das ist ein Gestaltungsziel, kein bereits gemessenes Ergebnis. Es benötigt keinen neuen Katalogimport und keine Preis-/Rabattänderung.

## Vorhandenes Gestaltungssystem

Firecrawl lieferte eine frische Desktopaufnahme, Seitentext und Brandingdaten; zusätzlich wurden zwei echte Chromium-Ansichten sowie das aktuelle CSS geprüft. Brandingtokens sind extrahierte Werte, keine vollständige Theme-Spezifikation.

| Rolle | Beobachteter Wert |
|---|---|
| Grundfläche | Creme `#FAF7F2` |
| Akzent | Taupe `#8B7355`, heller Akzent `#E7D8C4` |
| Typografie | Überschriften Iowan Old Style mit Palatino/Georgia-Fallback; Fliesstext Inter |
| Aufbau | Grosser Markenbereich, Kategorie-Karten, Bild-/Textmodule, Produktkarten mit Preis und Link |
| Aktueller Desktop-Abstand Kategorie/Trends | je76px Abschnittspadding oben und unten, nativ gemessen |
| Produktbilder | `contain`; seitliche freie Fläche bei hohen Bildern ist erwartbar, kein fehlendes Produkt |

Die warmen Farben und die markante Schrift bleiben sinnvoll. Kategorie-Bilder sollten einheitlicher werden: Der aktuelle Wohnen-Banner enthält sichtbar Fremdtext; mehrere Banner verwenden eingebaute Beschriftungen und Katalogzahlen. Für neue Entwürfe saubere bereits vorhandene Website-Bilder mit getrennten HTML-Titeln verwenden. Keine Produktform oder Farbe retuschieren.

Vorhandene saisonale Bildquellen:

- Winter: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-saison-winter-850e6c888ff9-20261101.png?v=1793570088
- Weihnachten: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxestyle-saison-christmas-19d8eeaa192b-20261101.png?v=1793570088
- Weitere konkrete Bildbindungen stehen im bereits gesicherten R69-Quellmanifest. Vor einem neuen Write aktuell gegenprüfen.

## Umfang und Übergabe

Ein frischer Firecrawl-Aufruf, zwei begrenzte Homepage-Browseransichten bei1440×1000 und390×844 sowie ein aktueller CSS-GET. Reale Screenshots angesehen. Kein horizontaler Überlauf im geprüften Umfang. Cookiebanner blieb sichtbar; reduzierte Bewegung im Browser für stabile Posteransichten. GET/HEAD-Wächter blockierte75/73 Anfragen einschliesslich Tracking/externen Reviews; diese Fehler sind kein Beleg fehlender Bewertungen oder kaputter Geschäftsfunktionen. Keine Produktverfügbarkeit, Checkout, Gesamtwebsite, Ranking oder Conversion geprüft.

Shop luxestyle.ch/CHF und alle sechs Metricool-Kanalidentitäten frisch passend. Tagesreports nicht wiederholt, Kauf-Watch beendet. Keine Theme-, Produkt-, Preis-, Bewertungs-, Kanal-, Budget-, Flow- oder DNSänderung. VersandgrenzenCHF50/CHF45 und account.luxestyle.com.co erhalten. R69-Film und separate Social-Master-ID unverändert. Claude-Kenntnisnahme unbekannt.

Vor Umsetzung aktuellen Theme-Diff lesen, gezielt einen Entwurf erzeugen und Vorher/Nachher bei390/1440px vergleichen. Die bestehenden Inhaberbefugnisse bleiben massgebend; keine alte Theme-Gesamtkopie veröffentlichen. [Messbelege](STARTSEITE-BELEGE-20261103-R70.json).
