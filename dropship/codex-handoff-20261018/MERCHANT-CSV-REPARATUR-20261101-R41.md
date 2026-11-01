# LuxeStyle: CSV-Korrekturen R41

Drei hochgeladene Exporte vom 01.11.2026 vollständig offline geprüft: **57’223 Zeilen, 27’269 Offer-IDs und 29’055 Listing-Identitäten**. Ein Listing umfasst Kanal, Sprache, Feedlabel und Item-ID. Die Exporte enthalten keine Merchant-Konto-ID oder Exportzeitzone; ihre Fehlerstände sind keine aktuelle Liveabnahme.

## Tatsächlich behoben

Die weisse Comic-Uhr, Produkt 15491403940225 / Variante 67814685475207, verwendet jetzt das vorhandene passende Originalfoto mit **655 × 655** statt 214 × 349 Pixeln. Media 70451373080961 ersetzt die Variantenverknüpfung mit Media 70451372786049. Nativ und öffentlich bestätigt; keine Bildgenerierung oder Hochskalierung. Preis CHF 51.90, SKU, Status, Tags einschliesslich rueckhol-0907 und Inventareinstellungen sind unverändert. Keine Kanalaktivierung. Die Neubewertung dieses Bildes durch Google bleibt unbekannt.

## Befunde und nächste Korrekturen

| Bereich | Belegter Stand | Vorgehen |
|---|---|---|
| Preise | 2’004 Offer-IDs mit Preisfehler; 20 davon auch ohne Verfügbarkeit. Die geprüfte Hose ist DRAFT und hat bereits CHF 44.90 bei allen zwölf Varianten | Bestehende primäre Quelle und exakte Variante lesen. Veraltete Entwurfeinträge dort gezielt bereinigen; kein Produkt aktivieren oder Preise blind füllen |
| Deutschland | 1’510 Versandmeldungen für das Zielland Deutschland. Aktuelle öffentliche Versandregel: nur CH/LI | Keine erfundenen DE-Tarife anlegen. Nach Quellenprüfung nur das unerwünschte Zielland bereinigen; deutsche Sprache, gesamte Datenquelle und CH-/LI-Einträge erhalten |
| CSS-Kapazität | 51’082 Zeilen betreffen 25’541 mehrsprachige Listings für Shopping-Anzeigen und Remarketing; keine kostenlosen Einträge in diesem Fehlerblock | Tatsächliches Kontolimit und Quelle prüfen. Keine pauschale Katalogabwahl, Kontenplan- oder Budgetänderung |
| Weitere Bilder | Für die silberne Uhr fehlt ein belegtes grosses Einzelbild derselben Ausführung. Hawaii-Hemd ist DRAFT, Export-SKU nicht genau gebunden | Kein Gold-, Verpackungs- oder fremdes Variantenbild zuordnen; keine Aktivierung |
| Gemeldete FR-Uhrenseite | Aktuelle Default-/FR-Seite und genaue Variante liefern HTTP 200, Variante kaufbar zu CHF 23.90 | Tatsächlich bei Google eingereichte URL und Crawlfehler lesen; kein geratener Redirect |

## Technischer Restblocker

Merchant-Konto **5797470070, LuxeStyle CH** ist frisch verbunden bestätigt. Die verfügbare Verbindung bietet **keine Merchant-Schreibaktion**. Genau eine neue Einzelabfrage zu Quelle, Preis und Link des CSV-Eintrags 15413245706625_14:691;5:4183#3xl / de / CH / ONLINE endete mit **MCP -32603 Timeout**. Kein Retry oder force_refresh; Ergebnis unbekannt, keine leeren Daten, Null oder 404 daraus abgeleitet. Andere legitime externe Zugänge bleiben unbestätigt.

Bestehende Helfer wurden frisch gelesen. Ihr Handle-ID-/Erstvarianten-Feed erklärt diese CSV-Identitäten nicht als aktive Quelle. Das Schaufenster-Werkzeug würde Google-Publikationen ändern und breit Produkte sowie Bestellungen lesen; es wurde nicht gestartet. Für die restlichen Korrekturen müssen primäre Datenquelle, Fetch-URL und Originalfelder authentifiziert gelesen und gezielt bearbeitet werden. Die Freigabe für denselben beauftragten Fix ist vorhanden; der Zugriff ist der Blocker.

## Prüfdatei und Kontinuität

Die lokale **PRUEFLISTE_KEIN_FEEDUPLOAD.csv** enthält 3’676 deduplizierte Nicht-Kapazitäts-Fehler-/Listing-Schlüssel aus 6’141 Exportzeilen. Sie bewahrt exakte ID-/SKU-Schreibweise, Länder, Zieltypen und Quellen. **Dies ist keine Produktdatenquelle und kein Merchant-Upload.** Datei und SHA sind im JSON dokumentiert. Die Roh-Exporte wurden nicht ins Repository kopiert. Bei fehlender lokaler Datei die Originale erneut lesen; fehlende Historie ist nicht leer.

Sperrtags, Ausschlüsse, DRAFT-Status, Preise, Versandgrenzen CHF 50/CHF 45, Kundendomäne, R40-Theme-Entwurf und R39-Threads-Termin bleiben erhalten. Keine neue Bestellung, Kauf-Watch-, Kennzahl- oder Flow-Abfrage, Automation, Frequenzänderung, Kundenansprache, Kampagnen-, DNS- oder Flowaktion und kein kostenpflichtiger Render. Dieselben 16 Aufgaben-IDs fortgeführt; tatsächlicher Claude-Empfang unbekannt.
