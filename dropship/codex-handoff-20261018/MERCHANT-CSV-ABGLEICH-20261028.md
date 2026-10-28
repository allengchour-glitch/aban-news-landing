# LuxeStyle: konkrete Merchant-Artikel aus drei Drive-Exporten

Nachtrag zum heutigen Code-/Verkaufspaket, 28.10.2026. Die bisherige Lücke «keine konkreten Artikel-IDs» ist für einen begrenzten Teil jetzt geschlossen. Keine Shop-, Feed-, Bild-, Preis-, Tag-, Zahlungs- oder Kanaländerung.

## Was die Dateien tatsächlich enthalten

Alle drei vom Inhaber verlinkten Dateien wurden über die verbundene Drive-App gelesen und lokal als CSV ausgewertet. Die Dateinamen nennen28.10.2026 gegen15:12, ohne bestätigte Zeitzone. Drive-Uploadzeit ist keine Live-Merchant-Messzeit.

| Export | Datenzeilen | Verschiedene Item-ID-Zeichenketten |
|---|---:|---:|
| [15-11-55.csv](https://drive.google.com/file/d/1EyfcG0Y_cJgTBWIxE6QHwrn0pS9TTCsi/view) | 110’516 | 35’644 |
| [15-12-13.csv](https://drive.google.com/file/d/1LlsIJSyzXlO6Gkqp5rUSjgfyXcyiNVqv/view) | 99’424 | 29’960 |
| [15-12-40.csv](https://drive.google.com/file/d/1gm9naYrw7La9KOrWuvsnY80hUEDNA932/view) | 495 | 112 |

GEMESSEN an den gelieferten Dateien: insgesamt210’435 Datenzeilen. Dedupliziert46’074 unterschiedliche Item-ID-Zeichenketten; separat46’539 Kombinationen aus Kanal, Sprache, Feedlabel und Item-ID. Sprache Deutsch und Französisch, KanalONLINE, FeedlabelCHF_99383214465. Konto-ID und Produkt-URL fehlen als Spalten. Deshalb keine Zählung vollständiger Merchant-Primärschlüssel oder des gesamten Shops. Zeilen sind auch Länder-/Verkehrsart-/Problemkontexte und keine Zahl verschiedener Produkte.

Die kleine Datei wurde zusätzlich von Root nachgezählt:495Zeilen,112Item-ID-Zeichenketten,116Sprach-/Kanal-/Feedlabel-Kombinationen; SHA2560cb767fa38e964723bd4d4f44a2ce8495a2917e5964602600317867cbf458da0. Sie enthält nur Quota und personal hardships. Der übrige Parser zählt alle drei CSVs streamend; unabhängige Gegenprobe mit csv.reader bestätigt die Rohzählung.

## Jetzt konkret bearbeitbare Warteschlange

Die Vereinigung enthält56Overlay-,13Page-unavailable- und1Local-Requirements-Problem-/Item-Paare. Die70Kandidaten sind mit exakten Item-IDs, Sprach-/Feedlabel-/Kanalmengen, Ländern und Verkehrsarten im Belegpaket enthalten. Das sind datierte Reviewkandidaten, keine70nachgewiesenen aktuellen Defekte.

Missing product price, Image too small, Missing attribute availability und Additional text found sind in diesen Exporten nicht abgedeckt. Ihre Fälle aus den Screenshots bleiben offen; keine Nullmeldung. Die112personal-hardships-Item-Zeichenketten erscheinen ausschliesslich für Dynamic remarketing, nicht als pauschaler Befund zu Shopping ads oder Free listings. Keine Richtlinienausnahme oder Massenfreischaltung abgeleitet.

## Drei aktuelle Gegenproben

GEMESSEN: drei exakte Varianten gezielt nativ gelesen, keine Pagination. In allen drei Fällen gehört die tatsächliche Varianten-ID zu genau der im CSV codierten Produkt-ID. Alle ACTIVE, availableForSale=true, tracked=false und inventoryPolicy=CONTINUE. Preise im frisch verifizierten ShopCHF; kein Bestands-/Lieferzeitversprechen. Native GraphQL-Validierung meldete SKIPPED, anschliessende Queries erfolgreich; kein unabhängiger Schema-Pass.

| CSV-Problem / tatsächliches Produkt | Item-ID | Aktueller Befund |
|---|---|---|
| Overlay: 3-in-1 Magnetische Ladestation, Grau-Einzeln | shopify_ZZ_15447560978817_56063588598145 | CHF196.90. [Aktuelle Produktseite](https://luxestyle.ch/products/3-in-1-magnetische-ladestation-621500) HTTP200, eigener Canonical, passender Variantenpreis/-link in JSON-LD. Tatsächlich zugeordnetes Bild enthält Zusatztext «Deep Space Gray». Tagrueckhol-0907 vorhanden. |
| Product page unavailable: Elegantes Langarmshirt mit Spitze, L | shopify_ZZ_15448020582785_55873968701825 | CHF18.90. [Aktuelle Shopify-URL](https://luxestyle.ch/products/elegantes-langarmshirt-mit-spitze-617600) HTTP200, passender Canonical und Variantenlink/Preis in JSON-LD. Alter Erreichbarkeitsbefund an dieser heutigen URL nicht reproduziert. Die damalige Google-Ziel-URL fehlt im CSV; Googlebot-/Merchant-Nachprüfung unbekannt. Tagrueckhol-0907 vorhanden. |
| Local Requirements: Elektrischer Milchshaker mit konstanter Temperatur | shopify_ZZ_15523818045825_56215831413121 | CHF29.90. [Aktuelle Produktseite](https://luxestyle.ch/products/elektrischer-milchshaker-mit-konstanter-temper-619200) HTTP200, eigener Canonical, passendes Offer. Die generische Merchant-Klasse beweist keine konkrete Stecker-, Spannungs- oder Rechtsursache. Keine Werbe-/Produktfreigabe erteilt. |

Kontexte dieser drei Exportkandidaten: Deutsch; CH undLI, jeweils Dynamic remarketing, Free listings und Shopping ads. Das Präfixshopify_ZZ ist keine Länderangabe. Die drei öffentlichen Reads sind gewöhnliche Abrufe, keine Googlebot- oder URL-Inspection-Tests. Ein heutigesHTTP200 beweist weder damalige Erreichbarkeit noch aktuelle Merchant-Zulassung.

## Konkreter Bildbefund statt ungeprüftem Ersatz

Drei tatsächliche Shopbilder wurden geladen, SHA256/Abmessungen erfasst und angesehen:

- Zugeordnetes graues Variantenbild:573×583, SHA25672fea4239ef957ae21ed6f701295e775f079db7eaf2658aac66041bdd83d024e; sichtbarer Zusatztext «Deep Space Gray».
- Produkt-Hauptbild:574×582, silberne Ausführung und Zusatztext «Glacier Silver».
- Zweites Galeriebild:800×800, keine offensichtliche zusätzliche Beschriftung ausserhalb der Geräteanzeigen in der Stichprobe, aber silberne Ausführung.

Damit ist ein aktueller Overlay-Kandidat am tatsächlich zugeordneten Variantenbild belegt. Das silberne Bild darf nicht ohne Weiteres zur grauen Ausführung erklärt werden. Kein Bild bearbeitet, kein Logo entfernt, keine KI-Ersatzaufnahme erzeugt und kein hochskaliertes Bild als neue Detailqualität ausgegeben.

**Nächster enger Reparaturschritt:** für SKU CJ-CJSJ290134301AZ ein echtes, unverfälschtes, ausreichend aufgelöstes Bild der grauen Ausführung ohne Zusatztext aus den vorhandenen verifizierten Lieferantenquellen auswählen; Variante, Form, Farbe, Rechte und tatsächliche Feed-Bildroute gegenprüfen. Dann erst einen konkreten Bild-/Feed-Diff erstellen. Bestehendesrueckhol bleibt erhalten. Aus USB-C allein keine CH-Netzteil-/Schweizer-Stecker-Zusage.

## Local Requirements und Texte

Beim Milchshaker sind die Aussagen zu Temperaturerhalt, Leistungsaufnahme, Akku und Funktionen noch nicht durch unabhängige Modell-/Lieferantennachweise bestätigt. Die native Produktbeschreibung allein ist kein solcher Nachweis. Keine Ursache aus dem Titel oder einem fehlenden Schweizer-Stecker-Hinweis raten. Zuerst den konkreten Merchant-Hinweis und das exakte Liefermodell/Netzteil prüfen; kein Reviewantrag und keine Policy-/Tagänderung aus diesem generischen Export.

Für den Langarmshirt-Link ist aktuell kein Redirect-/404-Fix begründet. Zuerst tatsächlichen eingereichten Merchant-Link und gegebenenfalls Google-Crawlbeleg mit der bestätigten Shopify-URL vergleichen. Nicht blind Handle ändern oder Produkt neu anlegen.

Diese CSV-Arbeit schliesst den fehlenden ID-Beleg für die70Reviewkandidaten, nicht alle18Problemarten. Kein Umsatz- oder Wirkungsbeweis. Aktuelle Codekorrekturen bleiben als Reviewpaket gespeichert, nicht produktiv ausgeführt.

