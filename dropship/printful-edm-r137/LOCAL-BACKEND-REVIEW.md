# Eng begrenzte Backend-Prüfung

Stand: 08.11.2026. Nur lokale Dateien und öffentliche Printful-Produktdaten wurden gelesen. Kein Secret wurde ausgegeben, kein Auftrag oder kostenpflichtiger Render ausgelöst und kein Shopify-/Printful-Schreibvorgang ausgeführt.

## Aktueller Zugriffsbefund

Die neueste vorhandene Laufzeitmessung steht in `dropship/selbst-gestalten-fertig-0511/untersuchung/bericht-edm.md` vom 05.11.2026:

- `POST /embedded-designer/nonces`: HTTP 403, Scope `product_templates/write` fehlt.
- `GET /product-templates`: HTTP 403, Scope `product_templates/read` fehlt.
- Der verwendete Schlüssel ist ein Store-Token mit Store-/Bestell-/Sync-/Datei-/Webhook-Rechten, ohne EDM-/Product-Template-Berechtigung.
- Der verbundene Printful-Store meldet Typ `shopify`.
- `/store/products` ist für diesen Store-Typ nicht verfügbar.

Damit ist der offizielle Printful Embedded Design Maker technisch nicht freigeschaltet nachgewiesen. Der lokale Dienst verweigert ohne explizit bestätigte Gegenprobe die Initialisierung.

## Vorhandene lokale Bausteine

| Bereich | Befund |
| --- | --- |
| Bestehender Printful-Sync | Fulfilment-Helfer sind vorhanden, aber kein nachgewiesener authentifizierter EDM-Nonce-Endpunkt. |
| `server/nonce-service.mjs` | Lokaler Entwurf mit injizierbarem Tokenprovider und Transport; enthält selbst keinen Netzwerkaufruf. |
| `server/product-manifest.mjs` | Exakte Auflösung pro Shopify-Handle und Shopify-Variant-GID; unbekannte Kombinationen bleiben gesperrt. |
| `data/product-manifest.json` | 41 Produkte, 244 exakt belegte Varianten über 18 aktive Printful-Produkte; 22 DRAFT-Produkte und Mister-DTF bleiben gesperrt. |
| `client/edm.mjs` | Offizielle `PFDesignMaker`-Initialisierung; keine eigene Produktprojektion. |
| `client/host.mjs` | Gemeinsame Desktop-/Mobil-Hülle; zeigt CHF-Shoppreis ausserhalb des Printful-iframe. |

## Nächster technischer Nachweis

Ein bestehender legitimer Serverdienst muss einen Printful-Account-Token mit der Extension `embedded_designer`, den erforderlichen `product_templates`-Scopes und der erlaubten Domain `luxestyle.ch` aus einem Secret-Store verwenden. Erst ein erfolgreicher, redigierter Nonce-Test darf `edmAccessConfirmed` aktivieren. Kein Schlüssel gehört in Chat, Browser, URL oder Repository.
