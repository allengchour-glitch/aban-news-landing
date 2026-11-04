# LuxeStyle: Live-Änderungsbericht Produktstapel 1

Stand: 04.11.2026. Shop: `luxestyle.ch`.

## Geltungsbereich

Dieser Bericht dokumentiert ausschliesslich drei am 04.11.2026 aktuell in Shopify gelesene, minimal geänderte und anschliessend erneut gelesene Produkte. Die separate Vollkatalogprüfung ist eine deduplizierte **Offline-Auswertung eines historischen ACTIVE-Exports mit 56’630 Produkten**. Sie ist keine Behauptung, dass 56’630 Produkte am 04.11.2026 einzeln live gegengeprüft wurden.

Vor jedem Write wurden aktueller Status, Titel, Beschreibung, Produkttyp, Tags, Taxonomie, SEO, Varianten, SKUs, Preise, Kaufbarkeit, `inventoryPolicy` und Trackingzustand gelesen. Die Writes wurden seriell ausgeführt. Alle Shopify-Mutationen kamen ohne `userErrors` zurück; jede Änderung wurde danach mit einer gezielten Admin-API-Abfrage zurückgelesen.

## Tatsächliche Änderungen

| Produkt | Vorher | Nachher | Erhalten |
|---|---|---|---|
| `15454094426497` | «Katzenhängematte mit Fensterhalter für Balkon»; keine Shopify-Kategorie; Text mit unbelegten Aussagen zu Balkon, Metall/ABS, 20 kg, Farben, Lieferumfang und Lieferzeit | Titel «Katzen-Fensterhängematte mit Saugnäpfen»; neutraler, bildgestützter Text; Kategorie `ap-2-2-2-2` Katzenregale und -sitze; SEO bereinigt; fachfremder Tag `hund` entfernt | **DRAFT blieb DRAFT**; nicht veröffentlicht; Preis CHF 110.90, Default-Variante, SKU `CJ-2501040136551625300`, `availableForSale=true`, `inventoryPolicy=CONTINUE`, `tracked=false`; Sperrtags `marge-verlust-draft`, `verlust-auto-draft`, `rueckhol-0907` |
| `15493884445057` | «L-förmige Katzenhängematte Plüsch»; Produkttyp «Spielzeug & Spiele»; Elternkategorie Haustierbetten; Text und Varianten mit widersprüchlichen Tiermaterialbegriffen; fachfremde Tags `hund` und `sort-kinder-baby` | Titel «L-förmige Katzenhängematte mit Plüschbezug»; neutraler Text; Produkttyp Haustierbedarf; Leaf-Kategorie `ap-2-9-10` Haustierliegen; SEO bereinigt; Option «Farbe» zu «Bezug» und Werte zu «Strukturplüsch Beige/Grau» sowie «Glattplüsch Beige/Grau» umbenannt; zwei fachfremde Tags entfernt | **ACTIVE blieb ACTIVE**; öffentlicher Produktpfad und Kaufbarkeit erhalten; alle acht Varianten-IDs, SKUs und Preise CHF 24.90/25.90 unverändert; alle acht `availableForSale=true`, `inventoryPolicy=CONTINUE`, `tracked=false`; Sperrtag `rueckhol-0907` |
| `15495226098049` | «Wand-Katzenhängematte aus Holz»; Elternkategorie Katzenmöbel; Text mit pauschalem Materialclaim und falscher «Produktkategorie: Kabine»; Tag `hund` | Titel «Wand-Katzenhängematte mit Stoffliege»; neutraler Text ohne «Kabine» und ohne pauschale Holzaussage; Leaf-Kategorie `ap-2-2-2-2` Katzenregale und -sitze; SEO bereinigt; Tag `hund` entfernt | **ACTIVE blieb ACTIVE**; öffentlicher Produktpfad und Kaufbarkeit erhalten; Preis CHF 37.90, Variante und SKU `CJ-DD3BD999-1B53-4767-AFE8-5C3B2F847551` unverändert; `availableForSale=true`, `inventoryPolicy=CONTINUE`, `tracked=false`; Sperrtag `rueckhol-0907` |

Admin-Rücklesezeiten:

- `15454094426497`: `updatedAt=2026-11-04T17:43:10Z`
- `15493884445057`: Produktfelder `2026-11-04T17:43:30Z`, Optionen `2026-11-04T17:45:43Z`
- `15495226098049`: abschliessende Rücklese `updatedAt=2026-11-04T17:43:52Z`

## Öffentliche Gegenprobe

Die beiden ACTIVE-Seiten wurden nach den Writes frisch als HTML gelesen:

- Beim L-Modell sind der neue Titel, die neue Kategorie, der neue Text und die Werte «Strukturplüsch»/«Glattplüsch» vorhanden. Die alten Variantenbegriffe «Lammwolle» und «Kaninchenfell» fehlen in der nachgelagerten HTML-Kopie.
- Beim Wandmodell sind der neue Titel und der neue Text vorhanden. «Produktkategorie: Kabine» und «Material: Holz» fehlen in der nachgelagerten HTML-Kopie.
- Das DRAFT-Produkt besitzt weiterhin keine öffentliche Produkt-URL; es wurde nicht aktiviert.

## Bewusst offen gelassen

- Die erste Option des L-Modells heisst weiterhin «Modell» mit den Werten «Taschen»/«Schachtel». Ihre tatsächliche Bedeutung ist ohne SKU-bezogene CJ-Quelle unbekannt. Sie wurde deshalb nicht geraten oder umbenannt.
- Die Galerie des L-Modells enthält weiterhin eingebettete englische Bildtexte zu «Lambswool» beziehungsweise «Rabbit Plush». Eine Medienänderung benötigt eine verifizierte Produktquelle und passende Nutzungs-/Bearbeitungsrechte.
- Materialzusammensetzung, Traglast, exakte Masse, Lieferumfang, Bestand und Lieferzeit wurden nicht neu behauptet. `tracked=false` zusammen mit `CONTINUE` ist keine Bestandszusage.
- Es gab keine Änderung an Preisen, Rabatten, Shop-Einstellungen, Flows, DNS, Merchant-Feeds oder Werbebudgets.
- Es wurde nichts auf Social Media vorbereitet, terminiert oder veröffentlicht. `rueckhol-0907` blockiert alle drei Produkte weiterhin für eine Social-Ausspielung.

## Vollkatalog-Prüfwarteschlange

Der historische ACTIVE-Export wurde vollständig dedupliziert und priorisiert:

- 56’630 eindeutige Produkte
- P0 Evidenz-/Complianceprüfung: 154
- P1 priorisierte Datenprüfung: 3’982
- P2 routinemässige aktuelle Prüfung: 52’494
- automatische Schreibfreigabe: 0

Jeder weitere Write verlangt eine aktuelle Live-Gegenprüfung des konkreten Produkts. Der Sicherheitsbericht erlaubt keinen allgemeinen Live-Mehrfeldbatch; empfohlen sind serielle Stufen 1, danach höchstens 5 und erst nach vollständigem Readback höchstens 20 Produkte.

## Belege und SHA-256

| Beleg | SHA-256 |
|---|---|
| Vorab-Diff `live-change-plan.json` | `284eb31a24e312b64ba2dd648f879c7db78112a780dda4909f938a1b2d1f5865` |
| Vollqueue-Zusammenfassung `SUMMARY.md` | `74bef227cf84de4b0bffef71bfc8c68ca5c6f67913ae0ce7645e914b9c30e11a` |
| Maschinenlesbare Zusammenfassung `SUMMARY.json` | `592f08215a84b7953c3a74f2b1493e9960fa55d49c2a84276451185c929d2a9e` |
| Batch-Sicherheitsbericht `BATCH-SAFETY.md` | `2a40ac70b721433526bb998ccc4df08dd40370544d48012a7a43c8a33bec32be` |
| Quellenprüfung `SOURCES-REPORT.md` | `ef9593e5689f39167dcf7faadfda53f4dddf3b61e3c830597ff476112689a123` |
| Taxonomieprüfung `taxonomy-report.md` | `54f3c5a7cd3ffc29b05440b8c7e1cb9ed0ac7efb982784c3f9a8246377f2c5e6` |
| Vorherige öffentliche Prüfung `public-review.md` | `978dfd133e1e8aeba16c6dd0593e2e13dc540a00984c62b6c4fa7ab8505ffc66` |
| Merchant-Stichprobe `merchant-selected-report.md` | `4deb6e51567d9708c6e837e702bfcb459a7170b68fd4bb4e6efcde3dfb4a9fd3` |
| Öffentliche HTML-Gegenprobe L-Modell | `cc973f2bcf3d172289ca4bec52940138766e8a154d4ff278f7269f0dc788bd56` |
| Öffentliche HTML-Gegenprobe Wandmodell | `118ef2c0a34c219a919acf4a126feb7d156c595c3037f6430da4180778cbd96d` |

Die vollständige Queue `PRODUCT-REVIEW-QUEUE.jsonl` hat SHA-256 `6761955345d87513d9d5ce3fc1cd14fa9f5629ad853d26eb0fc21face6c98746`; die inhaltsgleiche gzip-Datei SHA-256 `12e1ee0244ba502249904a5070887c9377dd80f222157d0d8f57eaf2f4151fc0`.
