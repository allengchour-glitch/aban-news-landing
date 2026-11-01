# Merchant-Preisprüfung 01.11.2026

Status: lokales Reparaturpaket vorbereitet; keine Merchant- oder Shopänderung ausgeführt. Der Inhaber hat «merchant fix» autorisiert. Der offene Blocker ist der technische Quellen-/Schreibzugang, keine erneut einzuholende Freigabe.

## Vollständig ausgewertete Exporte

| Datei vom 31.10.2026 | Fehlerzeilen | Eindeutige Artikel-IDs | Zeilen «Missing product price» |
|---|---:|---:|---:|
| 17-42-14 | 109’769 | 53’333 | 107’209 |
| 17-26-35 | 111’476 | 54’167 | 108’880 |

Beide Exporte betreffen Free listings, Sprache de, ONLINE, Feedlabels CH/DE. Der neuere Export enthält zusätzlich 2’435 Verfügbarkeits-, 104 Bildgrössen-, 20 Bildoverlay- und eine Alkohol-Fehlerzeile. Ländereinträge erzeugen mehrere Fehlerzeilen pro Artikel. Zusammen ergeben die Exporte 54’171 unterschiedliche Artikel-IDs; ihre Mengen dürfen nicht addiert werden. Fehlende Zeilen im späteren Export beweisen keine Reparatur. Diese Exportbefunde sind keine aktuelle Merchant-Livezählung.

## Konkreter Preisabgleich und Datei

18 betroffene Artikel-IDs aus sechs vorhandenen Selbstgestalten-Produkten wurden exakt anhand `Shopify ProductID + _ + vollständige native SKU` zugeordnet. Jede ID hat genau einen Treffer; sämtliche Variantenlisten der sechs Produkte sind vollständig. Der aktuelle Shopify-Datensatz bestätigt ACTIVE, nicht leere Tags, native Produktlinks und positive CHF-Preise zwischen CHF 23.90 und CHF 109.90. Die übrigen 53’315 IDs des neueren Exports wurden nicht als repariert oder preisgeprüft ausgegeben.

Shopidentität: `94368563585`, `au3j0y-hq.myshopify.com`, `luxestyle.ch`, CHF. Merchant-Verbindung frisch bestätigt: Konto `5797470070`, «LuxeStyle CH».

Beispiel: Artikel `15427283157377_9000001_4016` entspricht Variante `55794951258497`, Schwarz / S, CHF 24.90. Öffentliches Produkt-JSON am 01.11.2026, 00:56:12 UTC: HTTP 200, identische SKU/Variante, Preis 2490 Rappen, verfügbar. Nativ: nicht bestandsgeführt, `CONTINUE`, Bestand 0; daraus folgt kein Ausverkauf.

`MERCHANT-PREISKANDIDATEN-20261101.csv` enthält ausschliesslich die 18 eindeutigen `id,price`-Zeilen. SHA-256: `7bb61b1e96db27fdf4b6fb9bbcd6188f5eaa993b475c757750e5388fafcb1099`. Zeilenzahl, eindeutige IDs, CHF-Format und vollständige Übereinstimmung mit den Quellenbelegen wurden geprüft. Varianten-IDs, Quellenhashes und Abfragebefund stehen in `MERCHANT-BELEGE-20261101.json`.

## Weshalb noch kein Upload erfolgte

Die aktuelle Windsor-Merchant-Aktionsliste ist leer. Eine eng gefilterte Rohdatenabfrage für zwei exakte Artikel-IDs endete mit **MCP-Timeout -32603**. Quelle, eingereichte URL, Rohpreis/Währung und Verfügbarkeit bleiben unbekannt; das ist weder ein leerer Datensatz noch 404. Kein Retry und kein `force_refresh`.

Der frisch gelesene Repo-Generator `merchant_feed.mjs` verwendet `id=handle`, nur die erste Variante und deren Preis. `gmc_feed_item.mjs` verwirft fehlende positive Preise und schreibt für angenommene Artikel immer `g:price`. Diese Quellcodeprüfung beweist nicht, dass dieser Generator die betroffene Merchant-Datenquelle speist; die gemeldeten IDs lauten `ProductID_SKU`. Es wurde deshalb kein unbelegter Helper-Patch als Fehlerbehebung ausgegeben.

Nächster eng begrenzter Schritt: authentifiziert die bereits bestehende primäre Merchant-Quelle, Artikel-ID/Sprache/Feedlabel, eingereichte Varianten-URL und Preis-/Aktionspreis-Priorität abgleichen. Dann nur den bestätigten Preis-Diff mit aktuellem Beleg anwenden und zurücklesen. Die Kandidatendatei ist **nicht ungeprüft hochzuladen oder als neue Quelle einzurichten**.

Unverändert: Shopify-Preise, DRAFT-Status, Tags, Verfügbarkeit, Google-Ausschlüsse, GTIN/identifier_exists, Feedkonfiguration und Kanäle. Keine Kunden- oder Bestelldaten enthalten.
