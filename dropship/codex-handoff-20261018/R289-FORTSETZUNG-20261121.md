# LuxeStyle – gezielte Fortsetzung am 21.11.2026

Diese Fortsetzung baut auf R288 auf. Die Tagesmessung wird weiterverwendet. Der sieben Tage umfassende Plan wird wegen der Prüfung eines einzelnen Fehlers nicht erneut eingelesen. [14-Uhr-Stand](R288-REPORT-20261121.md)

## Threads – bestehender Post 426961960

Der gezielte Metricool-Rücklesestand um 14:19 Zürich bestätigt Marke 6227837 und denselben Threads-Post mit UUID `-325577156053548845`, geplant am 21.11. um 14:00. `draft=false`, `autoPublish=true` und der Kanalstatus `ERROR` sind unverändert. Metricool lieferte keine Plattform-ID und keine Publikations-URL.

Die exakt verknüpfte Shopify-Bild-URL liefert mit dem Bereichsheader `Range: bytes=0-63` HTTP 206, JPEG-Signatur und `Content-Range: bytes 0-63/172186`. Der Abruf ohne Versionsparameter liefert HTTP 200, ein dekodierbares RGB-JPEG mit 1080 × 1350 Pixeln und 172’186 Byte. SHA-256 `091eab8f06fd1e3b236a613107473a73e42b016f7155e57ea5a3e7f858fa5a64` stimmt mit dem vollständigen Versionsabruf aus R288 überein. Die Ursache bei Metricool oder beim Plattformabruf ist damit weiterhin unbekannt. [Betroffene URI](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/ig_1_dd164b90-30e9-4b45-9294-d3d22efe2075.jpg?v=1794397799)

Der native Connector bietet keinen eigenen kanalbezogenen Retry. `updateScheduledPost` aktualisiert den bestehenden Planerpost. Eine gezielte Wiederholung eines fehlgeschlagenen Threads-Kanalzustands ist dafür nicht dokumentiert. Ein ungesendeter Supportentwurf fragt nach der Provider-Request-ID und einer unterstützten Wiederholung unter derselben UUID. Es gab weder ein Planer-Update noch eine Neuanlage.

## FR-Vergleich – aktuelle Quelle in Shopify belegt

Veröffentlichte Sprachen sind Deutsch als Primärsprache und Französisch. Für Produkt `15521256604033` meldet Shopify den übersetzbaren Schlüssel `body_html` in Deutsch mit Digest `bace262485ba2042359070daea9d21d3b9189a26a6abf6cfb165f0bc0a724bdd`. `translations(locale: "fr")` liefert eine leere Liste. Die öffentliche französische Seite verwendet deshalb den deutschen Text als Rückfallwert.

Der in R288 vorgeschlagene alte Kopf-/Hinweisblock kommt im 3’211 Zeichen langen Quellwert genau einmal vor. In einer lokalen Gegenprobe wurden nur seine zwei Texte ersetzt. Das Ergebnis hat 3’204 Zeichen. Die Rückersetzung ergibt exakt den ursprünglichen Wert.

**Quelle version choisir ?**

Le prix affiché correspond à la variante sélectionnée. Les équipements d’un autre modèle ne sont pas automatiquement inclus.

Shopify speichert für `body_html` einen vollständigen Sprachwert. Die Umsetzung würde erstmals eine eigene FR-Fassung anlegen. Die restlichen Modelltexte blieben zu diesem Zeitpunkt deutsch und würden spätere Änderungen der deutschen Beschreibung nicht automatisch übernehmen. Dieser Umfang benötigt eine ausdrückliche Freigabe. Es wurde kein Übersetzungswert gespeichert. [Produktseite FR](https://luxestyle.ch/fr/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719)

## Projektor A – Abnahmekontrolle für die Rohaufnahme

Der bestehende 18-Sekunden-Drehplan bleibt der Schnittentwurf. Neu ist eine ausfüllbare Vorgabe für einen ungeschnittenen 9:16-Kontrolltake: dokumentierte Zuordnung der physischen Probe zur A-SKU, sichtbare echte Bedienung, Ergebnis desselben Motivs und SHA-256 des eingegangenen Originals. Eine beschriftete Aufnahmekarte dient der Zuordnung innerhalb des Takes. Der Beleg für Modell und Lieferumfang kommt aus der physischen Probe und ihrer Lieferantendokumentation.

Die beiden weiten Planungszonen aus R288 überlappen sich. Für eine tatsächliche einzeilige Texteinstellung liegt die neue Testbox bei x128–888 und y256–336. Sie hat rechnerisch 24 Pixel Abstand zur oberen Kante des vorgesehenen Motivbereichs. Hände, Lesbarkeit und Plattform-Bedienelemente werden am aufgenommenen Film geprüft.

Native Rohaufnahme, Motivbindung und Rechtebelege stehen weiterhin aus. Es liegt kein neuer Produktfilm zur Freigabe vor.
