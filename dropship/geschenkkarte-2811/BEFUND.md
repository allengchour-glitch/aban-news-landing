# Digitale Geschenkkarte auf der Produktseite

Am 28.11.2026 gab die DE- und FR-Seite für die Geschenkkarte vor dem Kauf eine physische Lieferzeit und CHF 7 Versand aus. In der FR-Seite standen «expédition directe depuis l’Asie» und «Livraison en Suisse CHF 7». Shopify meldete für Produkt 16742376538503 `isGiftCard=true` und für alle drei Beträge `requiresShipping=false`. Die deutsche und französische Gegenprobe beim physischen Sternenlicht-Projektor (15521256604033, `isGiftCard=false`, `requiresShipping=true`) war ebenfalls mit HTTP 200 erreichbar.

## Vergleich mit dem aktuellen Theme

Die Grundlage ist das aktive Theme 214565814663, «LuxeStyle – Startseite 21.11.2026», Stand 27.11.2026 15:55:57 UTC. Der Gutschein nutzt das Standardtemplate. Die Sondertemplates `lxszene` und `viele-varianten` enthalten dieselben Liefer- und Vertrauensblöcke und dasselbe Versand-/Rückgabe-Akkordeon. `luxe-studio` rendert einen Konfigurator für geeignete Produkte und enthält kein Geschenkkarten-Empfängerformular. Ein passendes produktspezifisches Template oder ein entsprechender Produktschalter war im aktiven Theme nicht vorhanden.

## Lokale Vorschau

Der Generator prüft die SHA-256-Prüfsummen aller sechs Eingabedateien vor dem Schreiben. Er liest nur lokale Kopien, benötigt keine Zugangsdaten und schreibt in einen neuen, separaten Ordner. Pro Export sind die relativen Pfade unter `FILES` im Generator beizubehalten.

- Im Standardprodukt bleiben die physischen Blöcke `lux_delivery` und `lux_trust` für echte Shopify-Geschenkkarten leer. Das Versand-/Rückgabe-Akkordeon bekommt nur in dieser Instanz die Option `hide_for_gift_cards`. Das Empfängerformular, die Variantenauswahl, die Zahlungsarten und der bestehende Saisonhinweis bleiben erhalten.
- Der gemeinsame Akkordeon-Block unterstützt die Option und nutzt die vorhandene nächstgelegene Produktressource. Sein Standardwert ist `false`. Der neue Editor-Text steht in den Schema-Locales DE, FR und EN.
- Der unabhängige Browser-Code in `snippets/meta-tags.liquid` errechnet auf Geschenkkarten keine Paketlieferdaten mehr. Die übrigen Skripte und Metadaten bleiben gleich.

```sh
python3 gutschein_lieferhinweis_vorschau.py original vorschau
LIQUIDJS_PATH=/pfad/zu/liquid.browser.umd.js node test_gutschein_vorschau.cjs original vorschau
```

Als temporärer Testinterpreter diente LiquidJS 10.21.1 aus dem offiziellen npm-Archiv. Die Archiv-Integrität wurde vor dem Auslesen der einzelnen Bundle-Datei gegen das Registry-Metadatum geprüft. SHA-256 des geprüften UMD-Bundles ist `dcd52942a54e221901ee897aba05d9c86761e6744e3284461d0f6afeb5980a80`. Es wurde kein Paket installiert.

Alle 42 Liquid-Prüffälle bestanden. Die beiden vollständigen Custom-Liquid-Blöcke wurden in DE und FR mit drei kaufbaren Gutscheinvarianten und physischen Varianten gerendert. Bei CHF 25 prüft der Test auf die echten ursprünglichen Ausgaben zu Versand aus Asien und CHF 7 in beiden Sprachen. Der kaufbare physische Panda 55970886648193 behält vor und nach der Korrektur die Schweizer Lagerklassifikation und den Hinweis auf den Gratisversand aus dem Schweizer Lager. Beide Texte wurden unabhängig an der öffentlichen DE- und FR-Variantenseite bestätigt. Die Kaufbarkeit aller vier Varianten wurde über die Produkt-JSON des Storefront bestätigt. Auch ein physisches Produkt mit dem Texttag «geschenkkarte» behielt seine Ausgabe. Die Akkordeon-Prüfung kontrolliert die tatsächliche Liquid-Bedingung und die byteidentische eingebettete originale Shopify-Komponente. Das native Shopify-`content_for` wird im lokalen Interpreter durch einen Platzhalter vertreten. Die Script-Fälle kontrollieren, auf welchen Seiten das ursprüngliche Script ausgeliefert wird. Drei weitere Proben betrafen einen veränderten Ausgangsexport, eine fehlende Quelle und ein bereits existierendes Ziel. In allen Fällen brach der Generator ab.

Im aktiven Shopify-Theme wurde nichts geändert. Die Kontrolle des tatsächlichen Shopify-Renderers, aller drei Gutscheinwerte, des Empfängerformulars und der DE-/FR-Darstellung bleibt Gegenstand der separaten Theme-Vorschau. Der Warenkorb wird separat bearbeitet.

