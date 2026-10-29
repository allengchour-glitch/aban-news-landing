# Merchant-CSV: unabhängige lokale Gegenprüfung vom 29.10.2026

**Neuer hochgeladener Export, keine Live-Merchant-Abfrage.** Datei `product_issues_2026-10-29_13-18-02.csv`, SHA-256 `391c0a1d37291f2d02a5afeab262c706039ef2916726f2c3c6bbd73d82536f05`, 6,156,338 Bytes. Dateiname nennt 29.10.2026 13:18:02; die Zeitzone dieses Dateinamens ist im CSV nicht belegt. Keine Konto-/Datenquellen-ID im Export, keine API-/Repo-Writes.

## Umfang und doppelte Zählung

- **20’343 Fehlerzeilen, 8’327 eindeutige Item-IDs**, zehn Fehlertitel.
- **0 vollständig identische Zeilen**; **0 doppelte Schlüssel aus Item-ID, Fehler, Land, Traffic-Typ, Feedlabel und Sprache**.
- Eine Item-ID kommt wegen mehrerer Länder und teilweise mehrerer Fehler mehrfach vor. Das sind keine belegten doppelten Produkteinreichungen.
- Alle 8’327 exportierten Item-IDs haben «Missing product price». Das sind **16’694 länderbezogene Preisfehlerzeilen**, nicht 16’694 Produkte.
- **1’353 dieser IDs haben zusätzlich fehlende availability**; 2’711 länderbezogene Zeilen. Alle availability-Scope-Schlüssel kommen auch im Preisfehlerset vor.
- Alle Zeilen ONLINE, Sprache de und Itemstatus NOT_ELIGIBLE_OR_DISAPPROVED. 19’572 SEVERITY_DISAPPROVED- und 771 SEVERITY_PENDING-Zeilen.
- Diese Datei ist kein Nenner für den ganzen Shop oder alle Merchant-Produkte. Nicht enthaltene IDs sind damit weder fehlerfrei noch gelöscht oder genehmigt.

| Fehlertitel | Fehlerzeilen | Eindeutige Item-IDs |
|---|---:|---:|
| Missing product price | 16’694 | 8’327 |
| Item pending processing | 771 | 385 |
| Image too small | 152 | 76 |
| Missing attribute: [availability] | 2’711 | 1’353 |
| Promotional overlay on image | 6 | 3 |
| Illegal drugs | 2 | 1 |
| Vehicles | 2 | 1 |
| Alcoholic beverages | 1 | 1 |
| Explosives | 2 | 1 |
| Tobacco products & related equipment | 2 | 1 |

## Traffic, Länder und Feedlabel

Alle Einträge betreffen **Free listings**. Es gibt hier keine Shopping-Ads- oder Remarketing-Zeilen. Ein Shopping-Ads-Ausschluss behebt diese Exportbefunde nicht automatisch.

| Traffic | Land | Feedlabel | Sprache | Fehlerzeilen |
|---|---|---|---|---:|
| Free listings | Switzerland | CH | de | 10’102 |
| Free listings | Liechtenstein | CH | de | 10’103 |
| Free listings | Switzerland | DE | de | 46 |
| Free listings | Germany | DE | de | 46 |
| Free listings | Liechtenstein | DE | de | 46 |

Feedlabel CH: 8’287 IDs, jede mit Preisfehler in Schweiz und Liechtenstein (16’574 Preiszeilen). Feedlabel DE: weitere 40 IDs, jede mit Preisfehler in Schweiz, Deutschland und Liechtenstein (120 Preiszeilen). Insgesamt 138 Fehlerzeilen tragen DE, nicht CH. CH-/DE-ID-Mengen überschneiden sich nicht. **Feedlabel ist keine bestätigte Datenquellen-ID, kein Währungsfeld und kein Nachweis einer bestimmten Shopify-App.**

## ID-Formen und genaue Stichproben

- **1’415 rein numerische IDs**. Daraus lässt sich nicht sicher Shopify-Produkt, Shopify-Variante oder CJ-ID ableiten.
- **6’912 IDs mit numerischem Präfix und Unterstrich plus Variantencode**, verteilt auf 386 verschiedene numerische Präfixe. Diese Präfixe sind zunächst Zeichenketten, keine frisch validierten Shopify-Produkt-IDs.
- **0 IDs im Schema `shopify_ZZ_…`** oder allgemein `shopify_<Land>_<Produkt>_<Variante>`.
- Ein Variantencode kann Sonderzeichen wie `:`, `;` und `#` enthalten. Die vollständige Original-ID beibehalten; nicht abschneiden, umformatieren oder aus dem sichtbaren Namen neu erzeugen.

- `15413245706625_14:691;5:4183#3xl`: 2 Fehlerzeilen; Feedlabel CH; Länder Liechtenstein, Switzerland; Fehler Missing product price.
- `1352107938370216203`: 2 Fehlerzeilen; Feedlabel CH; Länder Liechtenstein, Switzerland; Fehler Missing product price.
- `15452314239361_cj-cjns262034607gt`: 3 Fehlerzeilen; Feedlabel DE; Länder Germany, Liechtenstein, Switzerland; Fehler Missing product price.

## Nicht enthaltene Quelle und begrenzte lokale Feed-Gegenprobe

Die zwölf CSV-Spalten sind: `Item ID`, `Title`, `Click potential`, `Feed label`, `Language`, `Item status`, `Channels`, `Issue title`, `Issue additional information`, `Traffic type`, `Country`, `Issue severity`. **Nicht enthalten:** Merchant-Konto-ID, Datenquellen-ID/-name/-typ, eingereichte Produkt-URL, Rohpreis/Währung, Rohavailability, Verarbeitungs-/Abrufzeit je Item oder Änderungsverlauf. Fehlender Rohpreis im CSV ist eine Exportgrenze; der eigentliche Fehlerbefund stammt aus «Missing product price».

Gelesene lokale Referenz `/workspace/luxestyle-review/merchant-push-20261027/repo/PUBLIC-FEED-FIRST-ITEM.json` dokumentiert genau den ersten Artikel eines am 27.10., 19:55:40 UTC gelesenen 5’000-Byte-Feedpräfixes: ID `WALLET-BLK`, Preis `49.90 CHF`, availability `in stock`. Diese ID passt zu keiner der drei obigen Stichproben; der Teilbeleg beweist weder deren Feedwerte noch die aktuell aktive Datenquelle. Kein Vollfeed oder Katalog gescannt.

Der lokale Bericht `/workspace/luxestyle-review/produkt-push-20261029/merchant/HISTORICAL-13-VARIANT-ITEM-MATCH.json` enthält datierte 28.10.-Belege zu anderen konkreten Varianten mit `shopify_ZZ_…` und Feedlabel `CHF_99383214465`. Er bestätigt die unterschiedliche ID-/Labelstruktur, aber keine Herkunft oder Laufzeit der heutigen Legacy-ähnlichen IDs. Keine Quellenverwechslung oder automatische Entfernung daraus ableiten.

## Enger nächster Schritt

Im authentifizierten Merchant-Einzelartikel zunächst **eine CH-Item-ID und eine DE-Item-ID** exakt aus obiger Stichprobe öffnen und aktive Source-ID/-Art, eingereichte URL, Rohpreis/Währung und Rohavailability samt Verarbeitungshinweis lesen. Erst danach zwischen fehlendem Rohfeld, Transformations-/Zuordnungsfehler, veralteter Einreichung oder anders gelagertem Problem unterscheiden. Shopify-Preise nicht aus diesem Bericht auf null setzen oder pauschal neu schreiben; availability nicht aus Bestandszähler 0 raten. Keine Quelle löschen oder neu anlegen, bevor ihre tatsächliche Zuordnung belegt ist.

Status: unabhängig lokal gezählt und Schnittmengen/Dubletten validiert; kein Live-Fix und keine Google-Abnahme.
