# LuxeStyle – Merchant und Search Console, 29.10.2026

Stand: 09:25 Europe/Zurich. Fortsetzung des aktuellen Inhaberauftrags «merchant fix und console». Neue Arbeit ist die echte Shopify-Vorschau mit nativer Ausgabeprüfung; die beiden bereits vorhandenen Patches werden nicht als neu erfundene Korrekturen ausgegeben.

## Konkret umgesetzt und geprüft

Aus dem frisch bestätigten MAIN-Theme `212656488839` genau ein unveröffentlichtes Prüftheme `212752499079` erstellt: **LuxeStyle – Schema-Prüfung 29.10.2026**. Nach Ende der Verarbeitung beide Originaldateien bytegenau gegen MAIN verglichen, den konkreten Diff geprüft und ausschliesslich `sections/product-information.liquid` sowie `sections/header.liquid` aktualisiert. Beide Mutationen lieferten keine userErrors. Dateien danach nativ mit passenden Bytes und MD5 zurückgelesen. Keine Theme-Publikation und kein MAIN-Dateiwrite.

[Native Hängematten-Vorschau](https://luxestyle.ch/products/reise-hangematte-aus-fallschirm-nylon-86eb20?preview_theme_id=212752499079)

| Befund | Korrektur in der Vorschau | Tatsächliche Prüfung |
|---|---|---|
| Hängematte 15450856292737: 24 ungültige SKU-Werte mit Leerraum im JSON-LD | Nur diese 24 optionalen SKU-Eigenschaften aus der strukturierten Ausgabe entfernt; operative Shopify-SKUs bleiben unverändert | Echter HTTP-Render identifiziert das unveröffentlichte Prüftheme. 33 Varianten, 33 Offers, alle IDs/URLs/Preise/Bilder/Verfügbarkeiten und neun gültige SKU-Eigenschaften erhalten |
| Schweizer Versand-Schema nennt CHF 40.50 statt öffentlicher CHF 50 | Genau `40.49 → 49.99` und `40.5 → 50` in den vorhandenen CH-Schemagrenzen | Tiefer Vergleich aller JSON-LD-Blöcke bestätigt exakt diese zwei Zahlenänderungen; CH-Porto CHF 7 und LI-Porto CHF 14.90 sowie sichtbare Shop-/Checkout-Einstellungen nicht geändert |
| Rückgabe-Warnung aus früherem Console-Screenshot | Keine zusätzliche oder erfundene Rückgaberegel eingefügt | Globale Organization-Richtlinie für CH/LI, 30 Tage, Postrückgabe/Kundenkosten ist heute vorhanden; aktuelle Google-Dokumentation erlaubt globale Regeln und den verwendeten Kostenwert. Die Anerkennung durch Google bleibt unbekannt |

Der kombinierte Vergleich der echten Hängematten-Vorschau gegen die frische Live-Baseline besteht exakt: 24 entfernte SKU-Eigenschaften plus zwei Zahlenänderungen, keine weiteren JSON-LD-Deltas. Eine unabhängige Gegenlese bestätigt Quellenhashes und Render. Zusätzlich ein anderes Produkt als Kontrolle geprüft: Ladegerät 15447560520065 liefert im MAIN und im Prüftheme HTTP 200; dessen vollständige Produktdaten sind im Schema identisch, nur die beiden globalen Versandwerte unterscheiden sich. Das ist eine begrenzte native Prüfung, keine vollständige visuelle Theme-Abnahme oder Google-Zulassung.

## Live-Übernahme und Google-Prüfung offen

MAIN `212656488839` ist weiterhin das veröffentlichte Theme; dieser Lauf hat dort keine Dateien geändert. Die verbundene Shopify-App erlaubt Theme-Dateiänderungen nur für unveröffentlichte Themes und blockiert MAIN-Dateiwrites sowie themePublish. Deshalb wurde keine Live-Publikation versucht und kein alternativer Credential-/Workflowweg als Umgehung verwendet; es gab keinen automatischen Write-Reject. Die Korrekturen sind im Prüftheme konkret abrufbar, nicht live aktiv.

Nächster Schritt: Im legitimen Shopify-Admin beziehungsweise durch den zuständigen Koordinator zuerst den dann aktuellen MAIN-Dateihash mit dem [engen Dateidiff](MERCHANT-CONSOLE-20261029.patch) abgleichen und genau diese zwei Änderungen übernehmen. Kein inzwischen veraltetes Volltheme pauschal veröffentlichen. Danach öffentliche Ausgabe erneut prüfen, den tatsächlich gerenderten Stand in einer angemeldeten Google-Prüfsitzung testen und erst anschliessend Search Console «Fehlerbehebung überprüfen» ausführen. Die separate frühere Rich-Results-Sitzung verlangte bereits eine Anmeldung; heute wurde kein Ersatzresultat oder erfolgreicher Google-Test behauptet. Ob Google die verbleibenden Variantenkennungen akzeptiert, ist trotz nativer Fehlerbereinigung weiter offen.

## Merchant: einzelner Seitenfehler eng verfolgt

Merchant-Konto `5797470070 / LuxeStyle CH` und Search-Console-Properties `sc-domain:luxestyle.ch` / `https://luxestyle.ch/` frisch zugeordnet. Search Console bietet über den verbundenen Report-Connector keine Schreibaktion; Merchant hatte im unmittelbar vorherigen Lauf ebenfalls keine Push-/Fetch-Aktion. Keine anderen Marken bearbeitet.

Für genau `shopify_ZZ_15448020582785_55873968701825` gültige Felder für eingereichten Link, Canonical und Datenquelle entdeckt und einmal abgefragt. Der Request endete mit MCP `-32603 request timed out`; Link, Source-ID und Crawlbeleg bleiben **unbekannt**, keine leere Datenmenge oder 404. Keine Wiederholung. Die historischen Nutzer-CSVs enthalten 20 Zeilen in zehn Problem-/Land-/Verkehrsart-Kontexten und keinen eingereichten Produktlink oder HTTP-Code. «Product page unavailable» allein rechtfertigt keinen geratenen URL-Write.

Die zwei aktuellen Feedschutzdateien sind unverändert gegenüber der Basis des vorhandenen Entwurfs vom 28.10.; kein erneuter Rebase/Test als Fortschritt gezählt. Kein Merchant-Push, keine Datenquellen-/Ausschlussänderung und keine pauschale Freischaltung. Die Genehmigung für den engen bestehenden Push bleibt bestehen; der authentifizierte aktive Quellenzugriff fehlt.

## Fortführung

Arbeitsstand und heutiges Tagesprotokoll fortschreiben; gleiche Aufgaben-IDs behalten. Die bisher offene native Renderprüfung ist für diesen engen Scope erledigt. Google-Abnahme, legitime Live-Übernahme und tatsächlicher Merchant-Item-/Quellenzugriff bleiben offen. Keine neue Automation, keine Frequenzänderung, keine Kennzahl-/Flow-/Bestellreports oder Kundenansprache. Claude-Kenntnisnahme ist nicht belegt.

[Quellen, Request und Vorher-/Nachher-Belege](MERCHANT-CONSOLE-BELEGE-20261029.json). Offizielle Referenz: [Merchant return policy](https://developers.google.com/search/docs/appearance/structured-data/return-policy).
