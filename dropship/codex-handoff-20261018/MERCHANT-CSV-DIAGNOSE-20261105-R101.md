# LuxeStyle R101 – Merchant-CSV-Diagnose und Quellenabgrenzung

Stand: 2026-11-05T20:14:53+01:00. Shopify **LuxeStyle / luxestyle.ch / CHF / Schweiz** und Metricool **6227837 / Europe/Zurich** samt den sechs erwarteten Kanälen wurden frisch passend gelesen. Es gab keine externe Änderung.

## Neue Dateien

| Datei | Struktur | Kernaussage |
|---|---|---|
| `product_issues_2026-11-05_09-02-47.csv` | 6’206 Zeilen, 3’008 eindeutige Item-IDs | Alle 3’008 IDs tragen «Missing product price»; 60 davon zusätzlich «Missing attribute: [availability]», eine zusätzlich «Item pending processing». Länderzeilen wiederholen Angebote für CH/LI, bei 68 Preiszeilen zusätzlich DE. |
| `product_issues_2026-11-05_09-03-01.csv` | 1’455 Zeilen, 1’452 eindeutige Item-IDs | Alle 1’452 IDs tragen «Missing shipping info in some countries» für Deutschland; eine rein numerische ID zusätzlich dreimal «Missing attribute: [availability]» für DE/CH/LI. |

Die CSVs enthalten keine aktive Datenquellen-ID, keine eingereichte Produkt-URL und keine Rohwerte für Preis, Verfügbarkeit oder Versand. Sie sind Diagnosen, keine Sachquelle und keine Anweisung für Produktwrites. Keine exakt doppelten Zeilen, Formeln, Geheimnisse oder eingebetteten Ausführungsanweisungen wurden gefunden.

## Zwei gezielte Shopify-Gegenproben

### Preisfall: Workout-Set 15421165404545

Das CSV-Angebot `15421165404545_cjtz292404406fu` ist über SKU `CJTZ292404406FU` eindeutig gebunden. Shopify führt das Produkt als **DRAFT**, ohne Storefront-URL und ohne Publikationsknoten. Alle zwölf Varianten haben CHF 44.90, `availableForSale=true`, ungetracktes Inventar und `CONTINUE`. Der öffentliche Handle liefert lediglich die Damen-Kategorieseite; der Produkt-JSON-Endpunkt liefert HTTP 404. Ein Preiswrite oder Aktivieren wäre sachlich falsch. Das Merchant-Angebot ist gegenüber dem aktuellen Shopify-Zustand veraltet oder stammt aus einer anderen Quelle.

### Preis- und Versandfall: Herren-Hoodie 15493863997825

Das Produkt ist **ACTIVE**, öffentlich erreichbar und hat 50 Varianten zu CHF 17.90–18.90. Die konkrete Versandwarnung `...935ir` stimmt mit SKU `CJ-CJWY263443935IR` überein; Shopify und die öffentliche Produkt-JSON-Datei melden CHF 18.90 und kaufbar. Die öffentliche strukturierte Produktinformation enthält für diese Variante `price=18.90 CHF` und `InStock`. Auch die zwei im ersten CSV gemeldeten Varianten `...922ve` und `...938lo` besitzen öffentlich Preis und Verfügbarkeit. Alle Varianten sind ungetrackt mit `CONTINUE`; Menge 0 ist daher kein Ausverkaufsbeleg.

Das Produkt hat sechs aktuelle Publikationen, aber keinen aktuellen Google-&-YouTube-Publikationsknoten. Der erhaltene Tag `rueckhol-0907` wurde nicht verändert. Produktpreis, Produktverfügbarkeit und öffentliche strukturierte Daten sind in dieser Stichprobe vorhanden; die Deutschland-Meldung bleibt ein Quellen-/Zielland-/Versandkonfigurationsproblem.

## Repo-Gegenprobe

Frisch gelesener `origin/main`-Commit: `e1e232301a75b2f5d200ec2d79178ac4de6e2f6b`.

- `automation/autopilot/merchant_feed.mjs` liest standardmässig nur `status:active`, verwendet den Handle als Merchant-ID und nur die erste Variante.
- `automation/lib/gmc_feed_item.mjs` schreibt belegte Preis-/Verfügbarkeitsfelder und standardmässig nur einen CH-Versandblock.
- Die neuen CSV-IDs sind überwiegend Produktpräfix plus Varianten-/SKU-Code oder rein numerische IDs, nicht Handles. Das DRAFT-Angebot kann nicht aus dem aktuellen `status:active`-Generator stammen.
- Der Generator läuft im GitLab-Job `shop-autopilot` und schreibt auf `brain/intel`; der GitHub-Workflow `shop-autopilot.yml` ruft diesen Feedgenerator nicht auf.

Damit ist dieser Repo-Feed nicht als aktive Primärquelle der CSV-Meldungen belegt. Ein Code-, Workflow- oder Feedwrite ohne aktuelle Merchant-Quellen-ID würde die Ursache nicht nachweislich beheben.

## Entscheidung und nächster enger Fix

Keine Produkt-, Preis-, Verfügbarkeits-, Publikations-, Versand-, Länder-, Feed-, Theme- oder Merchant-Einstellung wurde verändert. Der richtige nächste Schritt ist ein authentifizierter Merchant-Einzelartikelread für genau ein aktives Preisangebot und ein Deutschland-Versandangebot: aktive Quelle, eingereichte URL, Rohpreis/Währung, Rohverfügbarkeit, Zielland und Rohversand lesen. Erst danach darf ein Diff an genau dieser Quelle vorbereitet werden.

Für Deutschland braucht es zusätzlich eine Geschäftsentscheidung mit belegtem Versandgebiet und Tarif: tatsächliche DE-Versanddaten eintragen oder die DE-Ausrichtung der verantwortlichen Quelle entfernen. Beides ist eine Versand-/Länder-/Feedänderung und wurde hier nicht ausgeführt. Die eine rein numerische Availability-ID bleibt bis zur sicheren Shopify-/Variantenzuordnung unbekannt.

Der strenge Produktkatalog-Fortschritt bleibt unverändert bei 32 von 56’506 ACTIVE, rund 0,06 %; dieser Lauf war eine Quellenprüfung und keine weitere Produktkorrektur.
