# R137 – offizieller Printful-Editor für jedes Selbstgestalten-Produkt

Stand: 08.11.2026, 11:45 Europe/Zurich

## Ergebnis

Die bisherige lokal gezeichnete Tassenprojektion ist keine belastbare Printful-Druckvorschau und bleibt für eine Veröffentlichung gesperrt. Als einheitlicher Zielweg wurde deshalb ein fail-closed Kandidat für den offiziellen Printful Embedded Design Maker (EDM) vorbereitet. Er verwendet die offizielle Produkt- und Variantenidentität; er kopiert weder Printful-Oberfläche noch Printful-Assets in das LuxeStyle-Theme.

Der aktuelle begrenzte Shopify-Abgleich umfasst 41 Selbstgestalten-Produkte mit 398 Varianten:

- 19 ACTIVE mit 245 Varianten;
- davon 18 Printful-Produkte mit 244 exakt Shopify-Variant-GID zu Printful-Variant-ID zugeordneten Varianten;
- ein ACTIVE Bügeltransfer mit einer Variante gehört zu Mister DTF und bleibt im Printful-Weg blockiert;
- 22 DRAFT mit 153 Varianten bleiben vollständig blockiert;
- darunter ein WM-Trikot mit 20 Varianten und ungeklärtem Provider-/Printful-Mapping;
- 39 Produkte mit 377 Varianten haben insgesamt ein exaktes Printful-Mapping; diese Zahl enthält auch DRAFT-Produkte und ist keine Freigabe.

Die aktuelle Printful-Gegenprobe liest 45 relevante Modelle mit 2’257 Varianten. Alle 377 verwendeten Shopify-/Printful-Paare sind gegen die aktuelle Varianten-Ownership abgeglichen. Wiederverwendete Printful-Varianten-IDs werden nur über die eindeutige Shopify-Variant-GID aufgelöst; SKU-Präfixe werden nicht als Printful-Produkt-ID interpretiert.

## Bilder und Vorschau

Produkt-/Variantenidentität und Bild-/Mockup-Rechte sind getrennt. Für jedes Produkt sind die vorhandenen Shopify-Bilder im Prüfmanifest referenziert; daraus folgt keine Berechtigung für eine dynamische Überlagerung oder eine physisch korrekte Druckvorschau.

Nur für die weisse Keramiktasse, Printful-Modell 19, sind alle drei aktuellen Varianten samt Druckgeometrie und Referenzbildern exakt belegt. Deshalb darf der lokale Mockup-Relay-Entwurf ausschliesslich diese drei Varianten verarbeiten. Für die übrigen Produkte bleibt der offizielle EDM der vorgesehene Vorschauweg. Es wird keine generische Tasse, kein Foto-Zoom und keine erfundene Projektion als Ersatz verwendet.

## Technischer Stand und Blocker

Der EDM-Host, die serverseitige Nonce-Logik, das Produktmanifest und der Mockup-Relay sind lokale Review-Entwürfe. Sie sind nicht deployt, nicht im MAIN-Theme und nicht live. DRAFT-, Fremdprovider- und unvollständige Zuordnungen sperren fail-closed.

Der aktuelle Printful Store-Token besitzt die nötigen Rechte nicht:

- `POST /embedded-designer/nonces` antwortete HTTP 403; `product_templates/write` fehlt;
- `GET /product-templates` antwortete HTTP 403; `product_templates/read` fehlt;
- ein legitimer Account-Token mit der Erweiterung `embedded_designer`, den erforderlichen `product_templates`-Scopes und der bei Printful erlaubten Domain `luxestyle.ch` ist nicht verfügbar;
- ein erfolgreicher frischer Nonce-Test und ein vollständiger Editor-Save-/Bestellpfad fehlen.

Zugangsdaten gehören in den bestehenden Secret-Store. Bis die Gegenprobe erfolgreich ist, bleiben `edmAccessConfirmed=false`, alle EDM-Freigaben 0 und alle produktiven Writes blockiert.

## Durchgeführte Grenzen

In R137 wurde kein Shopify-Produkt, kein Theme, keine Produktseite, kein Printful-Template, kein Auftrag, kein Warenkorb, kein Checkout und keine Bestellung geschrieben. Es gab keinen Theme-Publish, keinen Deploy und keinen kostenpflichtigen Render. Die lokale Prüfung ändert auch keine Social-, Merchant-, Flow-, DNS-, Rabatt- oder Budgeteinstellung.

## Nächster enger Schritt

Nach sicherer Bereitstellung des passenden Account-Tokens im Secret-Store und bestätigter Domainbindung ist genau eine redigierte, serverseitige Nonce-Gegenprobe zulässig. Erst danach darf der offizielle Editor für ein einzelnes exakt zugeordnetes ACTIVE-Produkt im unveröffentlichten Theme getestet werden. Der Test muss Produkt, Variante, Druckflächen, gespeichertes Template, Bilddarstellung, Mobilansicht und den weiterhin nicht ausgelösten Bestellpfad zurücklesen. Eine katalogweite Aktivierung oder ein MAIN-Publish folgt daraus nicht.
