# LuxeStyle: Preisfehler gezielt eingegrenzt, 29.10.2026

**8’327 eindeutige exportierte Artikel mit Preisfehlern; kein pauschal fehlender Shopify-Preis nachgewiesen.** Neue konkrete Gegenprobe auf den vom Inhaber gelieferten Screenshot und CSV, keine Wiederholung von Kennzahl-/Flow-/Bestellreports. Shop luxestyle.ch/CHF und Metricool 6227837/Europe/Zurich samt sechs Kanälen frisch passend.

## Was die CSV belegt

`product_issues_2026-10-29_13-18-02.csv`: 20’343 Fehlerzeilen, 8’327 unterschiedliche Item-IDs. Alle 8’327 mit Preisfehler, 1’353 zusätzlich mit fehlender Verfügbarkeit. Die 16’694 Preiszeilen entstehen aus Länderzuordnungen; null echte Zeilen-/Fehler-Scope-Dubletten. Kein Beleg doppelter Produkteinreichungen.

Alle Einträge betreffen **Free listings**. Feedlabel CH: 8’287 IDs in Schweiz/Liechtenstein. Feedlabel DE: weitere 40 IDs in Schweiz/Deutschland/Liechtenstein. Feedlabel ist weder Währung noch Datenquellen-ID. Die beiden Shopping-Ads-Kapazitätsmeldungen im Screenshot sind davon getrennt; keine Addition oder Schluss auf Gratis-Einträge aus diesen Kapazitätszählern.

Die CSV ist eine Fehlerauswahl und kein Gesamtkatalog. Die 10,4 % stammen aus der Nutzeransicht, nicht aus einer aktuellen vollständigen Shopify-Qualitätsmessung. 6’912 IDs enthalten numerischen Präfix plus Variantencode, 1’415 sind rein numerisch; keine shopify_ZZ-IDs. Aus diesem Muster wird keine Quelle behauptet.

## Kleine native und öffentliche Gegenprobe

| CSV-Produkt | Aktuelle Shopify-Gegenprobe | Öffentliche Adresse |
|---|---|---|
| Herren Cordhose, 15413245706625; 3XL / Grau | DRAFT; Variante 55749270569345, CHF 44.90; onlineStoreUrl=null | Weiterleitung auf /collections/fur-ihn, dort HTTP 200 |
| Elefanten-Kuschelkissen, 15450835222913; Pink1 S blanket | DRAFT; Variante 55889761927553, CHF 14.90; onlineStoreUrl=null | Weiterleitung auf /collections/kissen-wohntextilien, dort HTTP 200 |

Die Titel und numerischen Produktpräfixe passen zu den nativen Produkten. Die genaue Merchant-Variantenzuordnung ist noch nicht bewiesen: Cordhosen-Suffix/Shopify-SKU unterscheiden sich in Gross-/Kleinschreibung, der Elefantencode ist keine gelieferte Shopify-Varianten-ID. Erste 50 Elefantenvarianten geprüft; passende Titelvariante enthalten, weitere Varianten nicht gelesen. Keine Kataloghochrechnung.

Damit ist in dieser Stichprobe ein Shopify-Preis vorhanden, aber keine veröffentlichte Produktseite. Der HTTP-200-Endpunkt ist jeweils eine Kollektion. Veraltete oder unpassende Einreichungen sind eine plausible Erklärung, **noch keine bestätigte Fehlerursache**. Insbesondere ist nicht belegt, dass Google genau die aus dem Handle gebildeten URLs eingereicht erhielt.

## Konkreter Blocker und nächster Eingriff

Der Export enthält keine Datenquellen-ID/-Art, eingereichte URL, Rohpreise/Währung oder Rohavailability. Der gezielte Windsor-Abruf für genau zwei betroffene Original-IDs lieferte innerhalb 45 Sekunden keine Antwort; Daten unbekannt, kein leerer Befund und kein Retry. Ein vorheriger Kontrollabruf zu einer anderen historischen ID blieb ohne Ergebnis und wurde nach Eingang des betroffenen CSV nicht weiterverfolgt.

Der zweite Upload `product_issues_2026-10-29_13-19-04.csv` überschreitet die Downloadgrenze 32 MiB und wurde nicht gelesen. Der Dateiname der ersten CSV belegt keine Exportzeitzone. Vollständige erste Datei anhand SHA-256 und Zählung gesichert.

**Als Nächstes eine betroffene CH- und eine DE-Original-ID im authentifizierten Merchant-Einzelartikel zuordnen:** aktive Source-ID/Art, eingereichte URL, Rohpreis/Währung, Verfügbarkeit und letzte Verarbeitung lesen. Für die Cordhose wurden Datenquelle/URL im Chat angefragt. Erst daraus einen engen Korrektur-/Bereinigungsdiff für genau die verantwortliche Quelle ableiten. Keine Quelle löschen, DRAFT-Produkte aktivieren oder Preise/Verfügbarkeit erfinden. Bereits genehmigte Eingriffe benötigen keine erneute pauschale Freigabe, aber weiterhin konkreten passenden Scope und legitimen Writer.

## Unabhängig abgeschlossene Vorbereitung

Die fünf vorhandenen Materialkorrekturstufen sind jetzt als [ein Gesamtpatch](MATERIAL-GESAMT-20261029.md) gegen main a74459a9 zusammengebaut: 14 Pfade, vorwärts/rückwärts bytegenau geprüft; 440 vorhandene Prüfbedingungen und 13 Syntaxprüfungen bestanden. **Kein Deployment oder Materialnachtrag.** Node22/Voll-CI und echte Laufvoraussetzungen bleiben offen. Die Vollpatches überschreiten das 128-KiB-Limit des bisherigen Reviewpaket-Helfers und bleiben deshalb eigenständige Belegdateien; Helferlimit unverändert.

Der [Schneestiefel-Quellenindex](SCHNEESTIEFEL-QUELLENABGLEICH-20261029.md) ordnet 27 bereits vorhandene Variantenbelege und konkrete Suchschlüssel. Keine neue Lieferantenquelle, Material- oder Fusslängenangabe gefunden; kein erneuter Live-Abruf.

[Unabhängige CSV-Prüfung](MERCHANT-CSV-PRUEFUNG-20261029.md) · [Native/API-/HTTP-Belege](MERCHANT-PREISDIAGNOSE-BELEGE-20261029.json). Keine Shop-/Feed-/Preis-/Flow-/Ads-/Socialänderung in dieser Fortsetzung. Kaufzielstand unverändert bis zum bisherigen Abendcheck; keine neue Watch-Abfrage oder Frequenzänderung. Claude-Kenntnisnahme unbekannt.
