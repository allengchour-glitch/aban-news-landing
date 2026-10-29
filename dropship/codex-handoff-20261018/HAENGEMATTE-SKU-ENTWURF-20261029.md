# Hängematte: konkreter SKU-Themeentwurf

29.10.2026, Europe/Zurich. Fortsetzung der vorhandenen Aufgabe schema-hammock-15450856292737. Kein Theme-Write, keine Produkt-/Varianten-SKU verändert, kein Google-Review gestartet.

## Frische Gegenprobe

Shopify LuxeStyle / luxestyle.ch / CHF sowie Metricool 6227837 / Europe/Zurich und alle sechs vorgesehenen Kanalidentitäten wurden frisch bestätigt. Das aktive MAIN-Theme ist 212656488839. Sein Name enthält «Entwurf», seine tatsächliche API-Rolle ist MAIN; der Name ist kein Beleg für eine unveröffentlichte Vorschau. Die aktuelle Datei sections/product-information.liquid hat MD5 e4ba950be4a05c5d6dd6f6ebf5d8a0a9, SHA-256 11c7600f9688b817d349bb04e5b4e0327284f224b8a8a56a6b1c101dbb3e9012.

Natives Produkt 15450856292737: ACTIVE, 33 Varianten. Die öffentliche Produktseite lieferte sowohl über Firecrawl mit maxAge=0 als auch als direkte HTTP-Gegenprobe Status 200. Beide Abrufe ergaben denselben ProductGroup-Inhalt. 24 der 33 sku-Auszeichnungen enthalten ASCII-Leerzeichen; die anderen neun nicht. Alle 33 Varianten besitzen unterschiedliche @id und Angebots-URLs. Der Defekt ist weiterhin reproduzierbar; die erneute Feststellung ist keine umgesetzte Reparatur.

## Enger Änderungsvorschlag

[HAENGEMATTE-SKU-20261029.patch](HAENGEMATTE-SKU-20261029.patch) ergänzt acht Liquid-Zeilen unmittelbar nach dem vorhandenen structured_data-Aufruf. Nur bei Produkt-ID 15450856292737 werden die fehlerhaften sku-Eigenschaften aus diesem JSON-LD-String ausgelassen. Die 33 @id, Angebote, URLs, Bilder, Namen, Preise, Währungen und Verfügbarkeiten bleiben erhalten. Die neun gültigen sku-Auszeichnungen bleiben ebenfalls erhalten. Weder die Shopify-/CJ-SKUs noch deren Zuordnung ändern sich. Es werden keine Ersatz-SKUs, GTINs oder Produkteigenschaften erfunden.

Der Vorschlag ist bewusst auf den beobachteten Fehler und dieses eine Produkt begrenzt. Er ist kein allgemeiner Unicode-SKU-Normalisierer. Er setzt Shopifys aktuell beobachtete kompakte JSON-Serialisierung voraus; bei geänderter Serialisierung muss die Ausgabe neu geprüft werden. Gleiches gilt bei veränderten Varianten oder SKU-Werten.

## Validierung und Grenze

Die Referenztransformation auf dem vollständig erfassten aktuellen JSON-LD wurde als JSON gelesen und mit einem unabhängig aus den nativen Varianten gebildeten Sollzustand verglichen. Genau 24 optionale Eigenschaften entfallen; alle übrigen Daten sind tiefengleich. Alle 33 Varianten-/Angebotsbindungen und die neun gültigen SKUs bleiben erhalten. Die restlichen Bytes der Section bleiben unverändert.

Der vorhandene Shopify-Liquid-Validator wurde mit seiner aktuellen Skillquelle verglichen und für Vorher/Nachher ausgeführt. Beide Läufe melden success, Exit 0. Beide melden daneben das fehlende globale settings_schema im isolierten Prüfkontext. Das ist eine begrenzte statische Prüfung, kein vollständiger Theme-Test. Eine native Shopify-Liquid-Ausführung und ein Google-Rich-Results-Test sind nicht erfolgt. Der Referenztest wird deshalb nicht als gerenderte oder von Google freigegebene Seite bezeichnet.

Google verlangt für Varianten eindeutige Kennungen und nennt sku/gtin als Beispiele. Die vorhandenen @id bleiben eindeutig; ob Google genau diese verbleibende Identifikation vollständig akzeptiert, ist ohne anschliessenden Markup-Test unbekannt. Keine Zusage «0 Google-Fehler» oder automatischer Sichtbarkeitsgewinn.

## Rückgaberichtlinie: bisherigen Vorschlag eingegrenzt

Die aktuelle Seitenausgabe enthält bereits eine allgemeine MerchantReturnPolicy unter Organization: CH/LI, 30 Tage, Rückgabe per Post, Kundenverantwortung für Rücksendekosten. Die aktuelle Google-Dokumentation empfiehlt diese globale Auszeichnung ausdrücklich. Eine Policy unter Offer ist vor allem bei abweichenden Produktregeln oder fehlender globaler Regel vorgesehen. Deshalb wird der ältere Entwurf mit 33 zusätzlichen Offer-Referenzen hier nicht umgesetzt oder weiter verallgemeinert. Die separate Search-Console-Meldung ist damit nicht als erledigt bestätigt; deren aktueller Prüfstatus bleibt unbekannt.

Separat enthält das vorhandene Organization-Versand-Markup weiterhin CHF 40.50 als Gratisversand-Grenze. Das war auch im früheren Datenentwurf sichtbar und widerspricht der öffentlichen Inhabervorgabe CHF 50. Diese Gegenprobe ist kein neuer Versandfix. Der enge SKU-Patch verändert weder diese Ausgabe noch die öffentliche Schwelle CHF 50, die interne CHF 45 nach Rabatt oder die Kundendomäne. Der Versandbefund benötigt einen eigenen Quell-/Diff-Abgleich.

Firecrawl-Metadaten enthielten zusätzlich Angaben eingebetteter Shop-Pay-Widgets. Das dortige robots=none wurde nicht der Produktseite zugeschrieben: Im direkt gelesenen Haupt-head war kein solches robots-Meta vorhanden. Rohes Widget-/Sitzungs-Metadatenmaterial wird nicht in die Übergabe übernommen.

## Quellen und nächster Schritt

- Produkt: https://luxestyle.ch/products/reise-hangematte-aus-fallschirm-nylon-86eb20
- SKU und globale Rückgaberegel: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Varianten-Kennungen: https://developers.google.com/search/docs/appearance/structured-data/product-variants
- Shopify structured_data: https://shopify.dev/docs/api/liquid/filters/structured_data
- Shopify json: https://shopify.dev/docs/api/liquid/filters/json

Vor einer zulässigen Übernahme: aktuellen MAIN-Dateihash und exakt diesen Diff erneut abgleichen, im passenden Theme-Prüfkontext rendern, alle 33 Varianten und Google-Markup prüfen. Erst danach eine produktive Übernahme samt frischem Rücklesen separat belegen. Keine Massenänderung oder Änderung von Bestell-/Fulfilment-Kennungen.
