# LuxeStyle: Bild-, Produkt- und Variantenmatrix «Selbst gestalten»

Stand: 8. November 2026. Die Auswertung gleicht ausschliesslich gespeicherte, aktuelle Shopify- und Printful-Belege sowie vorhandene lokale Dateien ab. Beim Aufbau gab es keine Netzwerkabfrage, keinen Remote-Write und keine neue Bildgenerierung.

## Ergebnis

- Die Shopify-Vollmatrix enthält **41 Produkte und 398 von 398 Varianten**: 19 ACTIVE und 22 DRAFT. Alle Datensätze wurden einzeln geprüft.
- **39 Printful-Produkte mit 377 Shopify-Variantenzeilen** sind vollständig und eindeutig über den numerischen Printful-Variantenanteil der aktuellen SKU mit dem aktuellen Printful-Katalog verbunden. Es gibt keine partielle Zuordnung.
- Bei den ACTIVE-Produkten sind **18 Printful-Produkte mit 244 Variantenzeilen über 22 Printful-Modell-IDs** vollständig verbunden. Der einzelne ACTIVE-Bügeltransfer mit einer Variante wird gemäss Projektbeleg durch Mister DTF erfüllt und bleibt ausserhalb Printful.
- Bei den DRAFT-Produkten sind **21 Printful-Produkte mit 133 Variantenzeilen** vollständig verbunden. Das WM-Trikot mit 20 eigenen `WM-TRIKOT-*`-SKU besitzt keine numerische Printful-Varianten-ID und bleibt deshalb ungebunden.
- Die 45 relevanten Printful-Modelle enthalten aktuell 2'257 von 2'257 Varianten; alle Modellantworten sind bestätigt und vollständig. Über alle 39 exakt verbundenen Shopify-Produkte werden alle 45 Modelle verwendet.
- Die Produkt-/Variantenidentität ist damit für den gesamten aktuellen Umfang prüfbar. Diese Identität ist kein Bild-, Geometrie-, Qualitäts- oder Rechtenachweis.

## Bild- und Rechtebefund

- Alle 41 Produkte besitzen eine aktuelle Shopify-Featured-Image-URL. Deren Bytes, Abmessungen und Hashes liegen lokal nicht vor; die URL belegt nur die Shopify-Zuordnung.
- 23 Produkte besitzen lokale Kandidatendateien, insgesamt 65 Zuordnungen. Darunter sind KI-retuschierte oder KI-generierte Bilder, KI-Umfärbungen, blanke iPhone-Editorbilder mit ungeklärter Quellenkette, fest eingebrannte «Dein Design»-Beispiele, Schema-Vorlagen, Marketing-Kacheln und generische Blanks. Sie sind nicht als produkt- und variantengenaue Kundendesign-Vorschau freigegeben.
- Für 16 Produkte sind 19 exakte Hersteller-Katalogrohling-Referenzen an ein nun vollständig verifiziertes Modell gebunden. Ihre dokumentierte Freigabe gilt nur für die Anzeige des leeren Katalogrohlings. Sie umfasst keine lokale Überlagerung mit Kundendesigns.
- Für **0 von 41 Produkten** liegt gemeinsam eine verifizierte lokale Produktgeometrie, eine produkt- und variantengenaue Bildquelle und eine kommerzielle Freigabe für die Kundendesign-Überlagerung vor.
- Für **0 von 41 Produkten** ist ein offizielles, bereits erzeugtes Kundendesign-Mockup gespeichert. Eine lokale Vorschau bleibt deshalb für alle Produkte fail-closed.

Die drei Vorschauwege sind getrennt zu behandeln:

1. **Lokale dynamische Überlagerung:** derzeit für alle 41 Produkte blockiert, weil exakte Geometrie und Overlay-Rechte fehlen.
2. **Printful EDM:** separater Anbieter-Editorpfad. Die vollständige Produkt-/Variantenmatrix schafft die Identitätsgrundlage, ersetzt aber keine Laufzeit-, Design-, Rechte- oder Rückleseprüfung.
3. **Offizielles Printful-Mockup:** separat serverseitig erzeugen und anschliessend dem konkreten Produkt, der Variante und der Designdatei zuordnen. Erst dessen gespeicherte Rücklesedaten und Bildprüfung können eine offizielle Druckvorschau belegen.

## Tasse, Printful-Modell 19

Die Shopify-Varianten der beiden Tassenprodukte sind vollständig mit Modell 19 verbunden. Für die drei Modellvarianten liegen zusätzlich echte Printful-Blankfotos und flache Druckvorlagen vor:

| Variante | Reales Blankfoto | Ansicht | Flache Druckvorlage |
|---|---|---|---|
| 1320, 325 ml | `1320-product.jpg`, 700 × 1000, SHA-256 `58f409c6763e16f48a504c3d2d1704c18b291c882f5749c18fad184d50fdbbb4` | vorne schräg, Henkel links | `1320-template.png`, 728 × 728, SHA-256 `df79e9f13eed1c1e7dc861a424479bd7f027cff55d7628265c88b6a163dbe6d0` |
| 4830, 444 ml | `4830-product.jpg`, 275 × 500, SHA-256 `8f73d3022fcea75f4297876539ea091fa8351a7574b0fa1491c7de59d207ccbf` | vorne schräg, Henkel links | `4830-template.png`, 728 × 728, SHA-256 `1b318c427391be55782b2a9d8e45c131a96fb9aa999087488d26624f70b36fe6` |
| 16586, 591 ml | `16586-product.jpg`, 700 × 1000, SHA-256 `9bfd9142a67bbc5a9da95b4365e5b082c0d17c86ea1547f06bd352eb4aec0195` | vorne schräg, Henkel links | `16586-template.png`, 728 × 728, SHA-256 `e3a6fb8527df99ec6da80a02a464971714d6e3eca28a5183c71ab068177f7cc9` |

Das allgemeine Modell-19-Katalogbild ist 600 × 600 Pixel gross, SHA-256 `cd7a7d3fea02b729c7607a1425c40b0833dbc0746a725f280a732e71198e71f3`. Seine dokumentierte Nutzung gilt für genau diesen leeren Hersteller-Katalogrohling. Die drei Variantenfotos stammen aus den Printful-Katalogbelegen; ihre exakten Hashes sind jedoch nicht für eine Kundendesign-Überlagerung freigegeben.

Vorhanden sind die Blankansicht mit Henkel links und die flache Druckflächenvorlage. Henkel-rechts-, Seiten-, Rück-, Rundum- und 3D-Ansichten sowie ein offizieller Render des ausgewählten Kundendesigns fehlen. Eine lokale Zylinderverzerrung darf daher nicht als originale Printful-Druckvorschau bezeichnet werden.

## iPhone-Hüllen und Bügeltransfer

- Die transparente iPhone-Hülle ist ACTIVE. **Alle 31 Shopify-Varianten** sind aktuell und exakt mit Printful-Modell 181 verbunden. Die frühere Aussage, nur fünf Stichproben seien gebunden, ist durch die Vollmatrix überholt. Das Modell-181-Katalogrohling-Asset besitzt den dokumentierten Hash `712ede7f11333827fbd8555ae4282f409785ee47ce009e5b9aa74ad82c714484`; seine Freigabe schliesst eine Kundendesign-Überlagerung aus. Lokal liegt weiterhin kein produkt- und variantengenau freigegebenes Bild der transparenten Hülle vor.
- Die Hardcase-iPhone-Hülle mit MagSafe ist ACTIVE. Alle 48 Shopify-Varianten sind exakt über die Printful-Modelle 181, 601 und 798 verbunden. Die 22 lokalen Kandidatendateien sind feste Beispiele oder Blanks mit unvollständiger Quellen-/Geometrie-/Rechtekette und bleiben für die originalgetreue Vorschau gesperrt.
- Der Bügeltransfer ist ACTIVE und wird gemäss aktuellem Projektbeleg durch Mister DTF erfüllt. Er darf nicht an Printful gebunden werden. Seine vorhandenen lokalen Bilder sind eine synthetische Ansicht, eine Schema-Vorlage und eine Marketing-Kachel; sie belegen keine originalgetreue Druckvorschau.

## Reproduzierbare Dateien

- `mapping.json`: vollständige, fail-closed Matrix aller 41 Produkte und 398 Shopify-Varianten, jede exakte Printful-Mitgliedschaft, Modellmetadaten, Bildreferenzen, lokale Pfade, Hashes, Abmessungen, Rechteumfang und Blocker.
- `product-coverage.csv`: kompakte Produktübersicht mit Variantenzahl, exakten Identitäten, Modell-IDs und Vorschauentscheidung.
- `validation.json`: Struktur-, Vollständigkeits- und Fail-closed-Prüfung.
- `evidence/local-candidate-assets-contact-sheet.jpg`: visuelle Übersicht der lokal vorhandenen Bildkandidaten.
- `evidence/mug-r137/`: Tassenbelege mit Detailmapping, Originaldateien und Kontaktbogen.
- `tools/build-image-mapping.py`: reproduzierbarer lokaler Aufbau ohne Netzwerkzugriff.

Der nächste belastbare Bildschritt ist je ausgewählter Variante entweder der geprüfte Printful-EDM-Pfad oder ein offiziell erzeugtes und zurückgelesenes Printful-Mockup. Lokale Ersatzbilder dürfen erst nach exaktem Produkt-/Varianten-, Geometrie- und Rechtebeleg verwendet werden.
