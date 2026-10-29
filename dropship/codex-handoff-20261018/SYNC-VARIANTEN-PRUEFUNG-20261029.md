# Printful-Sync und CJ-Varianten: geprüfte Korrekturen

Stand 29.10.2026, Europe/Zurich. Zwei lokal korrigierte Codeursachen, unabhängig offline geprüft. Keine produktive Ausführung, keine echten Aufträge, keine Shopify-/Merchant-Änderungen. Ablage als Review-Artefakte im bestehenden LuxeStyle-Handoff; kein Merge oder Deployment. Claude-Kenntnisnahme bleibt ohne Quittung unbekannt.

## Printful-Sync

Der bestehende Fulfilment-Runner bevorzugte die heutige Katalog-SKU vor der SKU der gekauften Position. Bei später geänderter Katalog-SKU konnte deshalb die falsche Printful-Variante im bestätigten Auftrag landen. Das wurde mit synthetischen Bestelldaten reproduziert; kein tatsächlicher Kundenfall behauptet.

Der [enge Patch](PRINTFUL-SYNC-SCHUTZ-20261029.patch) verwendet die historische Bestell-SKU. Eine widersprüchliche, fehlende oder ungültige SKU blockiert den gesamten Printful-Auftrag vor dem POST, auch wenn andere Positionen gültig sind. Keine Teilbestellung oder Draft-Bestellung als Ersatz. Ein Review-Tag wird angefordert; dessen Speicherung bleibt wegen des bestehenden Tag-Helfers unbestätigt.

Dies ist ein Auftrags-/Fulfilment-Sync, kein belegter Merchant-Preisfeed. Offizielle Printful-Dokumentation: https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder. `confirm` startet Fulfilment; daher wurde ausschliesslich mit abgefangenen Aufrufen getestet.

## CJ-Mehrvarianten

Die bisherige Preisbasis war die erste CJ-Variante nach Filterung. Antwortreihenfolge oder ein entfernter Stecker-Typ konnten somit die Preisbasis verschieben. Zusätzlich konnte fehlender Einkaufspreis den alten Einheitspreis als Ersatz liefern.

Der [CJ-Patch](CJ-VARIANTEN-SCHUTZ-20261029.patch) bindet die Preisbasis vor Filterung an genau eine passende bestehende Shop-SKU. Fehlende Kosten, CHF-Währungsbelege oder ein explizit gesetzter positiver Wechselkurs blockieren die Planung. Ein gesetzter Kurs allein ist noch kein Beleg wirtschaftlicher Aktualität. Eine blosse Produkt-ID reicht nicht als Variantenbeweis. Frühere ungebundene Plan-Dateien werden nicht übernommen.

Vor `productSet` werden fremde/doppelte SKUs, unvollständige Suchantworten sowie veränderte SKU-, Preis-, Kosten- und Variantenstände geprüft. Unklare Schreibantworten gelten als unbekannt. SKU-Reservierungen erfolgen vor dem Versand und gelten nur innerhalb desselben Prozesses.

Der separate bestehende `SKU_NACHZIEHEN`-Pfad ist nicht Teil dieser Korrektur. Seine Suchantwort-/Pagination-/Reservierungslücken bleiben offen. Keine Aussage, dass sämtliche CJ-Schreibwege oder der ganze Katalog fehlerfrei seien.

## Prüfung und Grenzen

| Prüfung | Belegtes Ergebnis |
| --- | --- |
| Printful erweiterte Suite auf altem Code | 24 erfolgreich / 8 fehlgeschlagen |
| Printful auf dem Patch | 32 erfolgreich / 0 fehlgeschlagen, unabhängig bestätigt |
| Printful vorhandene Platzierungsprüfung | 140 erfolgreich / 0 fehlgeschlagen; optionaler Katalogtest mangels Datenpaket übersprungen |
| CJ neue Verhaltensprüfung | 119 erfolgreich / 0 fehlgeschlagen, unabhängig bestätigt |
| CJ weitere bestehende Prüfungen | 89 reine Logik, 20 Stecker, 288 Grind erfolgreich; Grind-Mengenrabattvergleich ausgelassen |
| Eigene Gegenproben des Reviewers | Printful-Konflikt an letzter Position blockiert ganzen POST; fehlende CJ-Kosten blockieren Preis; unklare CJ-Antwort verhindert zweiten Send im Prozess |
| GraphQL | Neue Felder/Typen anhand aktueller nativer Introspektion geprüft; Codeblock-Validator meldet ausdrücklich «skipped». Keine tatsächliche Ausführung der neuen Writer-Abfragen |
| Laufzeit | Node 24.19.0 lokal; keine vollständige produktive CI-/Node-22- oder API-Integrationsprüfung behauptet |

Die separate CI-Simulation wurde vor Start wegen fehlender Workflow-YAML abgebrochen. Syntax und sauberer Patch-Anwendungs-/Bytevergleich waren erfolgreich; sie ersetzen diese nicht ausgeführte CI nicht.

Im engen Korrekturumfang fand die unabhängige Prüfung keine verbleibende blockierende Regression. [Review](SYNC-VARIANTEN-REVIEW-20261029.md), [Baseline-/Prüfbelege](SYNC-VARIANTEN-BELEGE-20261029.json). Diese Prüfung ist keine Freigabe des gesamten Fulfilment-Prozesses.

Weitere offene Printful-Bestandspunkte: stabile Auftragsidempotenz (`external_id`), geprüfte Shopify-Mutationsquittungen, Verhalten bei fehlender Designprüfung und die Begrenzung auf 50 Bestellpositionen. Ein unbekannter früherer Send darf nicht durch einen neuen Auftrag ersetzt werden.

## Begrenzte aktuelle Produktprobe

Shop luxestyle.ch / CHF und Metricool-Marke 6227837 mit den vorgegebenen Kanalidentitäten wurden frisch abgeglichen. Zwei Printful-Produkte über die tatsächlich verwendeten Tags gelesen, jeweils nur vier Varianten; weitere Produkte/Varianten vorhanden. Keine Hochrechnung auf den Katalog.

- Produkt 15422811439489 «Unisex T-Shirt – Selbst gestalten»: die vier gelesenen Varianten tragen Printful-SKUs und CHF 24.90.
- Produkt 15422815699329 «Unisex Hoodie – Selbst gestalten»: die vier gelesenen Varianten tragen Printful-SKUs und CHF 38.90; unter «Material» steht «Sweatshirt (Rundhals)». Das ist eine prüfpflichtige Zuordnung, kein Materialnachweis. Native Printful-Katalogquelle vor Änderung abgleichen.

Im aktuellen Arbeitsumfeld fehlen Printful-API-Key/Store-ID als konfigurierte Runtime-Werte. CJ-Helfer im Repository und CJ-Connector sind vorhanden; im abgefragten Windsor-Zugang ist kein CJ-Konto verbunden. Keine Schlüssel im Chat anfordern, keine Installation als Ersatz für fehlende Lieferantendaten.

## Merchant bleibt separat offen

Die zweite CSV-ID `shopify_ZZ_15413245510017_55749268537729` wurde einer aktiven nativen Variante mit CHF 12.90 zugeordnet. Das Produkt hat `ae-import`-Tags. Die erste CSV-ID `15413245510017_16361786756345133009` enthält einen undurchsichtigen Variantenanteil; gleiche Variante/Quelle ist trotz gleichem Produktpräfix und passendem Titel nicht bewiesen.

Der gezielte neue Merchant-Read lieferte bis zum Abbruch der wartenden Lesezelle keine abgeschlossene Antwort. Datenquelle, eingereichte URL und Rohpreis bleiben unbekannt, nicht Null oder 404. Kein blindes Wiederholen. Konto 5797470070 / LuxeStyle CH bestätigt; der aktuelle Connector bietet keine Schreibaktionen.

Nächster Arbeitsschritt: den separaten CJ-SKU-Pfad und Printful-Quittierung/Idempotenz als eigene eng begrenzte Korrekturen fortführen; vor produktiven Attributnachträgen die genaue Printful-/CJ-Katalogvariante belegen. Merchant-Quellenidentität und Rohfelder müssen pro betroffenem Artikel geklärt werden, bevor ein Feed-Fix behauptet oder angewendet wird. Kein Sync-/Workflowstart aus diesem Paket.
