# LuxeStyle – Selbst gestalten, Kategorie-Vorschau

Stand: 30.10.2026 Europe/Zurich. Aufgabe: personalizer-fullscreen-20261029, Revision 16.

[Kategorie öffnen](https://luxestyle.ch/collections/selbst-gestalten-1?preview_theme_id=212752499079&view=luxe-gestalten)

Die eigene Kategorie ist im bestehenden UNPUBLISHED-Theme gespeichert: ein grosser Einstieg in Creme/Taupe mit drei tatsächlichen unbedruckten Produktbildern, fünf Produktgruppen, ein Katalog mit 31 geprüften Blankprodukten, sichtbaren echten Optionen und aufklappbaren weiteren Werten. Desktop zeigt bis vier, Mobil zwei Produktspalten. Die Navigation enthält «Selbst gestalten» und führt direkt zur Kategorie. Die Gestaltungsvorschau ist in drei Schritten erreichbar.

32 Ausgangsprodukte wurden gezielt geprüft. Ein Bügeltransfer ohne positive POD-Zuordnung bleibt ausgeschlossen. Keine King-/Queen-Motive im neuen Auswahlbereich. Nur bestehende Shopify-Varianten und CHF-Shoppreise; es wurden keine neuen Produkte, Preise, Stoffoptionen oder Bestandszusagen erzeugt. Die drei Farbwerte für 15 bestehende T-Shirt-Varianten wurden gegen Printful-Modell 71 abgeglichen. Nicht vorhandene Variantenbilder bleiben eine Einschränkung: Marineblau verwendet derzeit das allgemeine weisse Referenzfoto.

Die eigene Kategorie teilt nach Prüfung in 12/12/7 Produkte. Der separate Editor-Picker verwendet die vorhandene native Kollektionspagination und zeigt 11/12/8 zulässige Produkte. Das ist dieselbe Menge von 31 IDs.

## Prüfung

- 15 Theme-Dateien geschrieben; 14 textuell exakt, JSON-Template semantisch identisch zurückgelesen.
- Layout, Standardproduktvorlage und Designzwang-Snippet der Vorschau hashgleich erhalten. MAIN 212656488839 bleibt MAIN; Vorschau 212752499079 bleibt UNPUBLISHED.
- 19 native Katalogprüfungen ohne funktionalen Fehler. Kategorie zusätzlich nativ geprüft; Einzelresultate stehen im Beleg.
- Shopify-Liquid-/JSON-/Locale-Validierung und JavaScript-Syntaxprüfung bestanden. Dokumentationsschema wurde teilweise aus dem vorhandenen Cache gelesen, weil der frische Schemaabruf scheiterte; die native API und Browserprüfungen sind separat belegt.
- Desktop- und Mobilbilder durch Root visuell geprüft; keine horizontale Überbreite. Keine Warenkorb- oder Bestelltests mit echten Schreibzugriffen.

## Originaleditor und vollständiger Katalog

Die EDM-Freischaltung für luxestyle.ch ist vom Inhaber bestätigt. Das lokale Integrationspaket verwendet das offizielle Printful-SDK mit serverseitiger Nonce-Erzeugung; 11 Offline-Tests bestanden. Es ist weder deployt noch mit einem echten Nonce-Aufruf getestet. Vor produktiver Einbindung fehlen der nachgewiesene sichere Server-/Tokenanschluss, persistenter Entwurfsspeicher, aktuelle Template-/Druckflächenbelege und die geprüfte Zuordnung zum Bestellprozess. Token gehören nicht in Theme-Code oder Chat.

571 öffentliche Printful-Stammsätze wurden gelesen, aber nicht in Shopify importiert. Der Originaleditor hat dokumentierte produktspezifische Grenzen; vollständige 1:1-Gleichheit mit jedem Dashboard-Werkzeug wird nicht behauptet. Der neue Hero verwendet Bilder; ein Video wurde nicht gerendert.

## Artefakte

- BLANK-KATALOG-BELEGE-20261030.json: Identitäten, Prüfungen, Quellen und Hashes.
- BLANK-KATALOG-THEME-20261030.patch: enger Theme-Diff.
- PRINTFUL-EDM-VORBEREITUNG-20261030.patch: lokales Integrationspaket ohne produktive Ausführung.

Nächster Schritt: Inhaber beurteilt die Kategorieseite; sichere bestehende Printful-Anbindung auffinden und technisch verifizieren. Keine Änderung von Zeitplan, Ads, Merchant-Daten, Flows oder Kaufziel durch diese Gestaltung.
