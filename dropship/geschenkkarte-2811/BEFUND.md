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

## Warenkorb und seitlicher Warenkorb

Die vier geprüften Theme-Dateien für den Warenkorb stammen aus demselben Shopify-Theme. In der Originalvorlage behandelt der Lieferhinweis einen Gutschein ohne Lagerkennzeichnung wie eine Sendung aus Asien. Der Warenwert des Gutscheins fliesst ausserdem in eingeblendete Versandkosten und den Black-Week-Hinweis ein. Das wurde anhand der ausgelesenen Vorlagen und Testkörbe nachgestellt. Die tatsächliche Abrechnung wurde nicht geprüft.

In der lokalen Korrektur zählt die Lieferprognose nur physische Positionen. Ein reiner Gutscheinkorb zeigt die E-Mail-Zustellung. In gemischten Körben stammt die Lieferzeile vom enthaltenen physischen Artikel. Bei einem Gutschein im Korb entfallen geschätzte Versandkosten und der noch fehlende Rabattbetrag. Ein von Shopify bereits angewendeter Rabatt bleibt sichtbar. Die neue Prüfung gilt für die Warenkorbseite und den seitlichen Warenkorb einschliesslich nachgeladener Versandanzeige. Tarif, Checkout und Rabattregeln sind davon unberührt.

```sh
python3 gutschein_warenkorb_vorschau.py original vorschau-warenkorb
LIQUIDJS_PATH=/pfad/zu/liquid.browser.umd.js node test_gutscheinkorb.cjs original vorschau-warenkorb
```

72 Offline-Szenarien prüfen reine Gutschein-, Waren- und Mischkörbe, Deutsch und Französisch, die Warenkorbaktualisierung im Browser und verspätete Antworten. Bei physischen Warenkörben wurden die bestehenden Ausgaben mit der Ausgangsfassung verglichen. Der derzeitige Prüflauf von `automation/warenkorb_gratisversand.py` meldet bereits die zusätzliche Black-Week-Sektion gegenüber seiner älteren Vorlage. Der reguläre Aufseher schreibt bei vorhandener Marke nichts zurück. Den separaten Reparaturpfad vor jeder manuellen Verwendung gegen den vollständigen aktuellen Block prüfen.

## Abweichung in der Shopify-Vorschau

Am 28.11.2026 lieferten zwei Ansichten desselben Themes verschiedene Versionen des bestehenden Lieferblocks in `templates/product.json`. Der Shopify-Admin lieferte 82'929 Bytes mit SHA-256 `5f7f25f74dc400f5b12401de23f7cd1e7fa114d495bf5522edd5e143e94d8726`. Die Bearbeitungsansicht meldete 82'556 Bytes mit SHA-256 `e712e044ab2566810cdaa1fbb3b5e6aa2eb0fbac4774b1a2757c574f18c41407` und keine ausstehenden Änderungen. Im deutschen Text enthält die erste Fassung zusätzliche Preisgrenzen, die zweite an derselben Stelle einen eigenen Liechtenstein-Hinweis. Die öffentliche Panda-Seite bestätigte die Schweizer Lagerangabe.

Die lokale Korrektur verwendet die Admin-Fassung. Beim nächsten Vorschauversuch beide Versionen des Lieferblocks erneut abgleichen und die lokalen Tests gegen dieselbe Basis ausführen. Anschliessend die echte Empfängerauswahl auf DE und FR, einen physischen Artikel sowie den reinen und den gemischten Warenkorb im Shopify-Renderer prüfen.
