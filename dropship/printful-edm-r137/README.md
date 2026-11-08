# LuxeStyle: offizieller Printful-Editor, lokaler R137-Kandidat

Stand: 08.11.2026. Dieses Paket ist lokal, nicht deployt und hat weder Shopify noch Printful verändert. Es hat keinen Auftrag, keine Vorlage und keinen kostenpflichtigen Render ausgelöst.

## Ergebnis

Der Kandidat verwendet Printfuls offiziellen `PFDesignMaker`. Er zeichnet keine Tasse, Hülle oder Druckfläche selbst nach. Produktansicht, Rundum-Druckfläche, Platzierungszonen, Bild- und Textwerkzeuge sowie die Druckvorschau müssen aus dem echten Printful-iframe kommen. Damit wird die vom Inhaber gezeigte Printful-Oberfläche funktional erreichbar, sobald Printful den technischen Zugriff zulässt. Eine eigene Projektion könnte diese Produktgeometrie nicht zuverlässig ersetzen.

Der technische Zugriff ist am 08.11.2026 weiterhin blockiert. Die Messung vom 05.11.2026 ergab:

- Der aktuelle LuxeStyle-Schlüssel ist ein Store-Token ohne `product_templates/read` und `product_templates/write`.
- `POST /embedded-designer/nonces` antwortete HTTP 403 mit dem fehlenden Scope `product_templates/write`.
- Der Printful-Store ist vom Typ `shopify`; der in Printfuls Beispiel verwendete Weg über `/store/products` ist für diesen Store nicht verfügbar.
- Ein legitimer Account-Token mit der Erweiterung `embedded_designer`, die bei Printful erlaubte Domain `luxestyle.ch` und der tatsächliche EDM-/Enterprise-Zugang sind technisch nicht belegt.

Deshalb setzt `createNonceService()` ausdrücklich `edmAccessConfirmed: true` voraus. Diesen Schalter darf der Server erst nach einer erfolgreichen aktuellen Nonce-Gegenprobe setzen. Das Paket zeigt bis dahin keinen vermeintlichen Printful-Originaleditor und enthält keinen Ersatzeditor.

## Aktuelle Produktmatrix

Die Datenbasis umfasst 41 Shopify-Produkte:

- 39 vollständige Treffer des Tags `wunschdesign`;
- 2 gezielt gelesene aktive Selbstgestalten-Produkte ausserhalb dieses Tags;
- 19 `ACTIVE`, 22 `DRAFT`;
- 45 relevante Printful-Modelle mit aktueller Produkt-, Technik-, Datei- und Bildmetadaten-Gegenprobe; 45 gefunden, keines als eingestellt gemeldet.

Das Host-Manifest enthält alle 41 Produkte. Es löst ausschliesslich die 244 exakt belegten Varianten der 18 aktiven Printful-Produkte auf. Diese technische Zuordnung hebt den globalen 403-/Zugriffsblocker nicht auf.

| Gruppe | Laufzeit-Varianten | Zuordnung | Status |
| --- | ---: | --- | --- |
| 18 aktive Printful-Produkte | 244 von 244 | Exakte Shopify-Variant-GID → Printful-Modell/Variante/Default-Technik | lokal auflösbar; EDM insgesamt blockiert |
| Darin: Keramik-Tasse – Selbst gestalten | 3 von 3 | Modell 19; Varianten 1320, 4830, 16586; `SUBLIMATION` | `default`-Druckfläche |
| Darin: Transparente iPhone®-Hülle – Selbst gestalten | 31 von 31 | Modell 181; aktuelle Variantenbesitz-Gegenprobe; `UV` | `default`-Druckfläche |
| Bügeltransfer – selbst gestalten | 0 von 1 | Mister DTF, kein Printful-Produkt | `NON_PRINTFUL_FULFILLMENT` |
| 21 Printful-Produkte im Status `DRAFT` | 0 von 133 | Zuordnungen bleiben nur im Auditkatalog | `SHOPIFY_DRAFT` |
| WM-Trikot im Status `DRAFT` | 0 von 20 | Keine decodierbare Printful-SKU | `PRINTFUL_VARIANT_MAPPING_UNVERIFIED` |

Damit sind 244 Varianten über 18 aktive Produkte lokal auflösbar. 23 Produkte haben im Laufzeitmanifest keine Variante. Ein Produktstatus `DRAFT` erzeugt immer `variants: []`; der Builder verweigert versehentlich freigegebene DRAFT-Regeln. Wiederholte Printful-Variant-IDs in unterschiedlichen Shopify-Angeboten sind erlaubt, ihre Shopify-Variant-GIDs bleiben global eindeutig und der Printful-Modellbesitz muss übereinstimmen.

Fünf bestehende Produktgruppen verwenden mehrere Printful-Modelle. Der Host löst deshalb immer `Shopify handle + Shopify variant GID` auf und nie nur den Handle. Ein unbekannter oder nicht vollständig belegter Variantenschlüssel bleibt gesperrt. Das gilt unter anderem für iPhone-Hüllen, Poster, Samsung-Hüllen, Unisex-Hoodie/Sweatshirt und Unisex-T-Shirts. `wm-trikot` bleibt ohne decodierbare Printful-SKU gesperrt.

## Verhalten des offiziellen Hosts

`client/host.mjs` stellt nur die LuxeStyle-Hülle bereit. Der eigentliche Editor bleibt Printfuls iframe.

- Startansicht: offizielle Produktansicht (`initial_open_view: product_view`).
- Sprache: `de_DE`, da Printful kein `de_CH` dokumentiert; die eigene Hülle verwendet Deutsch (Schweiz).
- Datei-, Text- und Clipart-Ebenen sind im offiziellen Editor aktiviert.
- Eine Gestaltung darf genau die bereits gewählte Shopify-/Printful-Variante verwenden.
- Fail-closed ist vorerst nur die bei allen 18 aktiven Produktgruppen belegte `default`-Druckfläche zugelassen. Rückseite, Ärmel, Stickerei- und DTF-Flächen bleiben bis zu einer technikspezifischen Zuordnung deaktiviert.
- Printful-Livepreise bleiben aus. Die Hülle zeigt ausschliesslich den frisch geprüften Shopify-Verkaufspreis in CHF.
- Der Speichern-Callback ist nur ein Bericht. Er setzt `checkoutReady: false`; die Vorlage muss danach serverseitig zurückgelesen und geprüft werden.
- Gemischte oder beschädigte SDK-Listen wie `[erlaubteID, "bad"]` werden vollständig verworfen.

Für die Tasse wählt die Kundin zuerst die Shopify-Ausführung 325 ml, 444 ml oder 591 ml. Danach öffnet der Server exakt die zugehörige Printful-Variante. Die Rundum-Fläche und die Ansicht auf der Tasse stammen aus Printful; der Host berechnet keine eigene Zylinderprojektion.

## Dateien

- `data/product-manifest.json`: generierte serverseitige Allowlist für alle 41 Produkte.
- `data/verified-variant-mappings.json`: 244 positive Variantenbelege für 18 aktive Printful-Produkte.
- `data/catalog-manifest.json`: reproduzierbarer Auditkatalog mit 41 Produkten und 398 Shopify-Varianten.
- `evidence/shopify-selfdesign-products-full-20261108.json`: vollständige 41-Produkt-/398-Varianten-Gegenprobe.
- `evidence/shopify-wunschdesign-snapshot-20261108.json`: vollständige 39er-Tag-Abfrage.
- `evidence/shopify-additional-selfdesign-snapshot-20261108.json`: zwei gezielte aktive Produkte.
- `evidence/printful-relevant-products-20261108.json`: 45 aktuelle Printful-Modelle, Techniken, Dateien und offizielle Bilder.
- `evidence/printful-variant-ownership-all-20261108.json`: aktuelle öffentliche Variantenbesitz-Gegenprobe für 45 relevante Modelle mit Antwort-Hashes.
- `tools/build-product-manifest.mjs`: reproduzierbarer, fail-closed Builder und `--check`.
- `server/product-manifest.mjs`: Schema und exakte Variantenauflösung.
- `server/nonce-service.mjs`: atomarer Nonce-Ablauf ohne eingebauten Transport oder Tokenzugriff.
- `client/edm.mjs`: sichere Initialisierung des offiziellen SDK.
- `client/host.mjs`, `client/fullscreen.css`: gemeinsamer Desktop-/Mobil-Host.
- `test/edm.test.mjs`: Offline-Tests ohne Printful-Netzwerkzugriff.
- `proof/host-shell-desktop.png`, `proof/host-shell-mobile.png`: lokale 1440×900- und 390×844-Prüfbilder der Hülle. Der Platzhalter benennt den 403-Blocker ausdrücklich und imitiert keinen Printful-Editor.

## Prüfung

Aus diesem Ordner:

```sh
node tools/build-product-manifest.mjs --check
node --test test/edm.test.mjs
```

Aktuelles Ergebnis:

- `RUNTIME_MANIFEST_OK products=41 variants=244`
- 15 von 15 Tests bestanden.

Die Tests prüfen unter anderem exakte Shopify-Variantenauflösung, Mehrmodell-Produkte, DRAFT-Sperre, Mister-DTF-Sperre, Variantenbesitz am Printful-Modell, gemischte SDK-Daten, erlaubte Platzierungen, einmaligen atomaren Nonce-Start, Geheimnistrennung und den Status `save-reported` ohne Kaufbereitschaft. Dies ist kein Live-Editor-, Druck- oder Bestellnachweis.

## Vorgesehener Ablauf nach Aufhebung des Blockers

1. Der Server liest Produktstatus, ausgewählte aktuelle Shopify-Variante, Preis und Kaufbarkeit frisch.
2. Die exakte Kombination aus Handle und Shopify-Variant-GID muss in der positiven Allowlist stehen.
3. Eine authentifizierte, CSRF-geschützte Route reserviert einen eindeutigen Entwurf.
4. Der Server fordert mit einem berechtigten Account-Token genau einmal eine Nonce an.
5. Der Browser erhält nur Nonce, Ablaufzeit, Entwurfs-ID und die bereits aufgelöste Ein-Varianten-Policy.
6. Der offizielle `PFDesignMaker` lädt Produktansicht, Druckfläche und Werkzeuge.
7. Nach dem Speichern liest der Server die Printful-Vorlage frisch zurück und prüft Produkt, Variante, Technik, Platzierungen und gültige Druckdaten.
8. Erst eine separat geprüfte Shopify-Warenkorb-/Printful-Fulfilment-Integration darf den Entwurf verwenden.

Der produktive Dienst braucht einen dauerhaften atomaren Speicher, Sitzungs- und CSRF-Schutz, Rate Limits, `Cache-Control: no-store`, redigierte Fehler und eine aktuelle Store-/Token-/Domainprüfung. Der mitgelieferte Memory-Store dient nur lokalen Tests.

## Konkreter Blocker und nächster Schritt

Der nächste technische Schritt ist eine einmalige, serverseitige Nonce-Gegenprobe mit einem legitimen Printful-Account-Token, auf dem die Erweiterung `embedded_designer` sowie `product_templates`-Scopes tatsächlich vorhanden sind und `luxestyle.ch` als erlaubte Domain hinterlegt ist. Zugangsdaten gehören in den bestehenden Secret-Store und nicht in Chat, Repository, Browser oder URL.

Ohne erfolgreiche Gegenprobe bleibt der Editor gesperrt. Weitere lokale Tassenprojektionen, Foto-Slides oder kopierte Printful-Oberflächen würden den Qualitäts- und Identitätsfehler nicht beheben.

## Offizielle Dokumentation

- https://developers.printful.com/docs/edm/
- https://developers.printful.com/docs/edm/#tag/Authentication/How-to-get-Nonce-token-for-Embedded-Designer
- https://www.printful.com/enterprise/embedded-design-maker

Der aktuelle 403-/Scope-/Store-Typ-Befund ist in `dropship/selbst-gestalten-fertig-0511/untersuchung/bericht-edm.md` vom 05.11.2026 dokumentiert.
