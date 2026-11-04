# Sicherer Produktkorrektur-Batch fuer LuxeStyle

Stand: 4. November 2026, Europe/Zurich  
Pruefgegenstand: `allengchour-glitch/aban-news-landing`, aktueller `main`-Commit `5ea0abe5831119cf1007a290a6c3447f8ce2eb4f`  
Umfang dieses Berichts: lokale Code- und Testpruefung; keine Shopify-Schreiboperation, keine Installation und kein Workflowstart.

## Ergebnis

Die vorhandenen Helfer liefern brauchbare Bausteine fuer Katalog-Leseabfragen und Dry-runs. Keiner der geprueften Helfer ist in seinem aktuellen Stand fuer einen allgemeinen Live-Batch mit 20 bis 50 Produkten und mehreren Feldern freigegeben. Es fehlen insbesondere ein vollstaendiger Vorher-Snapshot, ein Feldschutz, Konfliktpruefungen fuer Kernfelder, ein belastbarer Zustand fuer unklare Mutationsergebnisse und eine vollstaendige Ruecklesepruefung jedes geschriebenen Produkts.

Ein sicherer Batch darf 20 bis 50 exakte Produkt-IDs gemeinsam pruefen und planen. Live-Korrekturen muessen danach seriell und gestuft erfolgen: zuerst ein Produkt, dann hoechstens fuenf, danach maximal zwanzig pro kontrolliertem Abschnitt. Ein Write fuer 50 Produkte gleichzeitig ist nicht vorgesehen.

`compareDigest` schuetzt nur Metafield-Schreibvorgaenge mit `metafieldsSet`. Fuer Produkt-Kernfelder wie Titel, Beschreibung, SEO, Status, Tags und Taxonomie wurde in der geprueften Shopify-Dokumentation kein gleichwertiger atomarer Compare-and-set-Mechanismus gefunden. Dort braucht es eine unmittelbare Vorab-Leseabfrage mit `updatedAt` und Feld-Hashes. Zwischen Vorab-Leseabfrage und Mutation bleibt trotzdem ein kleines Race-Window. Deshalb sind minimale Mutationen, serielle Ausfuehrung und sofortiges Ruecklesen zwingend.

## Gepruefte Helfer

| Helfer | Brauchbarer Teil | Sicherheitsbefund | Verwendung im vorgeschlagenen Prozess |
| --- | --- | --- | --- |
| `automation/katalog_bulk.mjs` | Read-only-Bulkabzug aktiver Produkte; verweigert einen Start bei bereits laufender Bulkoperation | Erfasst nur ID, Handle, Titel, Produkttyp, Tags und Google-Kategorie. Es fehlen unter anderem `updatedAt`, SEO, Beschreibung, Varianten, Preis, Inventar, Medien, Shopify-Taxonomie, Publikationsstatus und Metafield-Digests. | Nur zur groben Kandidatensuche. Nicht als Vorher-Snapshot und nicht als Beleg fuer einen sicheren Write. |
| `automation/material_nachtragen.mjs` | Dry-run ist Standard; `LIMIT` und `ONLY` existieren; `metafieldsSet` wird in Bloecken bis 25 verwendet | Fragt keinen `compareDigest` ab und sendet keinen Digest. Der Plan bindet nicht an `updatedAt`. Bestehende Werte koennen uebersetzt werden. Nach Live-Writes werden nur 25 zufaellig ausgewaehlte Produkte rueckgelesen. Bei unklaren Netzwerkresultaten fehlt ein dauerhafter `uncertain`-Zustand. | Dry-run-Ideen koennen als Kandidaten dienen. Live-Materialschreibungen bleiben gesperrt. |
| `automation/optionen_reparieren.mjs` | Dry-run ist Standard; liest vor einem Live-Write die aktuellen Optionen erneut; `LIMIT` vorhanden | Kein eingefrorener Vorher-Hash fuer alle Optionen und Varianten; keine Bindung an `updatedAt`; kein Schutz von SKU, Preis, Bild, Inventar und Optionswerten; kein vollstaendiges Ruecklesen; kein expliziter ID-Allowlist-Parameter. | Nur einzelne Vorschlaege offline analysieren. Kein allgemeiner Options-Batch. |
| `automation/optionswerte_umbenennen.mjs` | Liest Optionen vor der Mutation erneut; nutzt Review-/Urteilsdateien | Kein `LIMIT`, keine exakte Produkt-Allowlist, kein kompletter Vorher-/Nachher-Snapshot. Teilfehler innerhalb eines Produkts koennen zu schwer nachvollziehbaren Zwischenstaenden fuehren. | Nicht fuer Live-Batches verwenden. |
| `automation/optionen_uebersetzen.mjs` | Dry-run ist Standard; `LIMIT` vorhanden | KI-Uebersetzung und Cache sind keine Produktquelle. Kein `updatedAt`-/Feldhash-Schutz und keine vollstaendige Ruecklesepruefung. | Nur als sprachlicher Entwurf mit manueller Quellenpruefung. |
| `automation/titel_korrigieren.mjs` | Kleiner, handlebasierter Eingabebereich | Liest nur ID, Titel und Status. Ein Titel-Write schreibt zugleich SEO-Titel und SEO-Beschreibung neu. Es fehlen erwarteter Altwert, `updatedAt`, aktueller SEO-Snapshot, ID-Allowlist und vollstaendige Ruecklesepruefung. | Nicht live ausfuehren. Titel und SEO muessen getrennte, explizit erlaubte Felder bleiben. |
| `automation/lib/shopify_gql.mjs` | Solide Read-Retries und getestete Fehlerbehandlung | Wiederholt Netzwerkfehler, HTTP 429 und 5xx bis zu sechs Mal ohne Unterscheidung zwischen Query und Mutation. Wenn Shopify eine Mutation ausgefuehrt, die Antwort aber verloren hat, kann ein automatischer Retry doppelte oder nicht nachvollziehbare Writes erzeugen. | Fuer Reads verwendbar. Writes brauchen einen separaten Client ohne automatische Mutation-Retries. |
| `automation/fortschritt_daten.mjs` | Fasst vorhandene Ledger zusammen | Ledger-Zaehlungen sind keine aktuelle Shopify-Wahrheit; teilweise beruhen Summen auf historischen Markern. | Nur Dokumentation, nie Freigabe- oder Ruecklesebeleg. |

### Dateinachweise

| Datei | SHA-256 |
| --- | --- |
| `automation/katalog_bulk.mjs` | `c4d12322a536295852961e17beffc2f7a6522b4a2ae749424de247acd5dd1dcd` |
| `automation/material_nachtragen.mjs` | `c3fd4c5362811ae34c1b42cefc753943c0f760b5135ba6f59ff8a7f61df73a9e` |
| `automation/lib/material.mjs` | `e5065eb1f2f9b2ffb4b2c03d9ef158859c80902904937323328473bdfaaf6b29` |
| `automation/optionen_reparieren.mjs` | `fa3144d5d4115bccb7cfd4502dd95d4cc6da3779813e9ac06889f08ecf8ca2c8` |
| `automation/optionswerte_umbenennen.mjs` | `43ad9a456baf80d6b035306b629d47e3e9e28d49694d90aa86ca5b1f9c04c071` |
| `automation/optionen_uebersetzen.mjs` | `962c3643ac97defb891dfa5ba5828873b1a50fb9585033d8bf63b3b1fed3388c` |
| `automation/titel_korrigieren.mjs` | `c355f856f9e0741b33abf2540d2ff9969741da57dae92a94bb5c7d53262c83ae` |
| `automation/lib/shopify_gql.mjs` | `89273375da65bf2bcd2a8b3c4e12e96bad42be2f8626795edf3d457687b8a02a` |

## Feldschutz

Jeder Batch beginnt mit einer leeren `allowedFields`-Liste. Nur ein nach Quelle und Vorherwert einzeln freigegebenes Feld wird aufgenommen. Alles andere bleibt geschuetzt.

| Bereich | Standard | Zulaessiger Ausnahmefall |
| --- | --- | --- |
| Produktidentitaet: Produkt-GID, Varianten-GIDs, Handle | Gesperrt | Keine automatische Aenderung in diesem Prozess. Handles sind nur Anzeige, nie Primaerschluessel. |
| Status und Publikationen | Gesperrt | DRAFT bleibt DRAFT. Fehlende Vertriebskanaele werden nicht aktiviert. Publikationsaenderungen gehoeren in einen getrennten Auftrag. |
| Tags | Gesperrt | Nur ein explizit gepruefter Tag-Diff. Leere oder fehlende Tags sowie Sperrtags werden nicht pauschal repariert oder entfernt. |
| Titel | Gesperrt | Exakter Alt- und Neuwert mit Quellenbeleg; SEO bleibt unveraendert, sofern SEO nicht separat freigegeben ist. |
| `descriptionHtml` | Gesperrt | Nur belegte Produktinformationen; kein erfundenes Material, keine Masse, Lieferzeit, Features, Reviews oder Herkunftsbehauptungen. HTML separat validieren. |
| SEO-Titel und SEO-Beschreibung | Gesperrt | Separater, expliziter Diff. Keine automatische Ableitung durch einen Titel-Write. |
| Shopify-Taxonomiekategorie | Gesperrt | Nur eine aktuell gueltige Kategorie-ID aus der live validierten Shopify-Taxonomie. Keine Kategorie aus Freitext raten. |
| Google-Shopping-Kategorie und weitere Metafields | Gesperrt | Separater Namespace/Key-Nachweis und `compareDigest`-CAS. Shopify- und Google-Taxonomie nicht verwechseln. |
| Varianten, Optionen, SKU, Barcode, Preise, Vergleichspreise | Gesperrt | Nur ein separater Spezialbatch mit vollstaendiger Varianten- und Optionspruefung. |
| Inventar: Tracking, Policy, Mengen und Standorte | Gesperrt | In diesem Korrekturbatch keine Aenderung. Bestand 0 ist bei Dropshipping kein ausreichender Ausverkaufsbeleg. |
| Medien: IDs, Reihenfolge, Alt-Texte, Zuordnung | Gesperrt | Nur ein eigener Medienbatch mit echter Produktzuordnung und Rechtebeleg. |
| Storefront-/Channel-Verfuegbarkeit | Gesperrt | Wird gelesen und oeffentlich gegengeprueft, aber nicht automatisch veraendert. ACTIVE allein beweist keine Storefront-Publikation. |

Material darf weder aus einem Bild noch aus Produkttitel, Kategorie oder einem aehnlichen Produkt abgeleitet werden. Eine sichtbare, aber unplausible bestehende Materialangabe ist ein Prueffall, kein Beleg fuer einen Ersatzwert. Ohne Lieferanten-, Hersteller- oder gleichwertigen Produktquellennachweis lautet das Ergebnis `unbekannt` und der Write bleibt blockiert.

## Sicherer Ablauf fuer 20 bis 50 Produkt-IDs

### 1. Identitaet, Schema und Batch-Manifest

Vor jeder Abfrage muessen Shopidentitaet und aktuelle API-Version gegengeprueft werden. Zur Shopidentitaet gehoeren die unveraenderliche `shop.id`, die `myshopifyDomain` und die `primaryDomain`; die Custom Domain `luxestyle.ch` allein identifiziert den Admin-Shop nicht sicher. Das GraphQL-Schema wird fuer die konkret verwendeten Queries und Mutationsfelder aktuell validiert. Historische Feldnamen werden nicht ungeprueft uebernommen.

Das Manifest enthaelt ausschliesslich exakte Produkt-GIDs, keine Handle-Liste als Identitaetsbasis. Es wird kanonisch serialisiert und gehasht. Doppelte IDs und IDs eines anderen Shops brechen den Lauf ab.

Pflichtfelder des Manifests:

```json
{
  "batchId": "luxestyle-product-review-20261104-001",
  "shop": {
    "id": "gid://shopify/Shop/...",
    "myshopifyDomain": "...myshopify.com",
    "primaryDomain": "luxestyle.ch"
  },
  "productIds": ["gid://shopify/Product/..."],
  "plannedAt": "2026-11-04T...Z",
  "allowedFields": [],
  "sourceRefs": [],
  "mode": "dry-run",
  "manifestSha256": "..."
}
```

Ein Manifest darf 20 bis 50 IDs enthalten. Die Leseabfragen werden zur Kostenkontrolle in kleine Gruppen von etwa 10 bis 20 IDs geteilt. Es wird nur innerhalb dieser IDs paginiert, falls einzelne Medien-, Varianten- oder Inventarverbindungen mehr Seiten haben. Eine ungezielte Katalog-Massenpagination ist nicht Teil dieses Verfahrens.

### 2. Vollstaendiger Vorher-Snapshot

Fuer jede ID wird ein aktueller, kanonischer Snapshot gespeichert. Die konkrete Query muss vor Verwendung gegen das aktuelle Schema validiert werden. Der Snapshot umfasst mindestens:

- Produkt-GID, Handle, Titel, Produkttyp, Vendor, Status, Tags und `updatedAt`;
- `descriptionHtml`, SEO-Titel und SEO-Beschreibung;
- Shopify-Taxonomiekategorie mit stabiler Kategorie-ID;
- relevante Google-Shopping- und Produkt-Metafields mit Typ, Wert, Aktualisierungszeit und `compareDigest`;
- Medien-IDs, Reihenfolge, Status, Alt-Text und Produktzuordnung;
- Optionen mit IDs, Namen, Reihenfolge und Werten;
- alle Varianten mit IDs, ausgewaehlten Optionen, SKU, Barcode, Preis, Vergleichspreis und Medienzuordnung;
- Inventory-Tracking, `inventoryPolicy` und die fuer den Schutz erforderlichen Inventar-Referenzen beziehungsweise -Levels nach aktueller Schemavalidierung;
- Admin-Publikationszustand je relevantem Verkaufskanal und die verfuegbare Online-Store-URL;
- separater oeffentlicher Storefront-Check fuer ACTIVE-Produkte: erreichbare Produkt-URL, dargestellte Variante, Preis in CHF und Kaufbarkeit. Fuer DRAFT wird keine oeffentliche Erreichbarkeit erwartet.

Jedes Produkt erhaelt einen Gesamthash und einzelne Feldgruppen-Hashes. Vor dem Hashen wird kanonisiert: semantisch ungeordnete Listen wie Tags werden sortiert, Ressourcenlisten werden nach stabiler ID abgebildet, Preise werden als kanonische Dezimalstrings gespeichert und Reihenfolge wird nur dort erhalten, wo sie fachlich Bedeutung hat, insbesondere bei Medien und Optionen. Dadurch erzeugt eine andere API-Reihenfolge keinen falschen Konflikt. Unvollstaendige Seiten, fehlgeschlagene Verbindungen, Auth-, Quota- oder 429-Fehler werden als `unknown` gespeichert. Sie werden nie in leere Listen oder Nullwerte umgedeutet.

### 3. Regel- und Quellenpruefung

Ein vorgeschlagener Wert braucht einen datierten Quellenbeleg, dessen Inhalt oder Export ebenfalls gehasht wird. Zulassungsregeln:

- vorhandene Produktdaten duerfen sprachlich klarer strukturiert, aber nicht inhaltlich erweitert werden;
- Material, Masse, Lieferzeit, Garantie, Zertifikate, Funktionen, Reviews und Herkunft brauchen einen direkten Produktbeleg;
- Variantenangaben werden nicht von einer Ausfuehrung auf andere uebertragen;
- Taxonomie-IDs werden gegen die aktuelle Taxonomie aufgeloest;
- Status, Tags, Preise, Inventar, Vertriebskanaele, Medien und Varianten bleiben geschuetzt, solange sie nicht Teil eines eigenen freigegebenen Spezialbatches sind;
- ein Konflikt zwischen Storefront, Admin, Lieferantenquelle oder bestehendem Metafield blockiert den betreffenden Wert.

### 4. Reproduzierbarer Dry-run

Der Dry-run erzeugt pro Produkt genau eine JSONL-Zeile und einen lesbaren Diff. Er fuehrt keine Mutation aus und kennt kein implizites `LIVE` aufgrund einer Umgebungsvariable.

Beispielstruktur:

```json
{
  "batchId": "luxestyle-product-review-20261104-001",
  "productId": "gid://shopify/Product/...",
  "observedUpdatedAt": "...",
  "beforeSha256": "...",
  "targetFieldHashes": {"descriptionHtml": "..."},
  "protectedFieldHashes": {"statusTags": "...", "variants": "...", "inventory": "..."},
  "allowedFields": ["descriptionHtml"],
  "proposed": {"descriptionHtml": "..."},
  "sourceRef": "...",
  "sourceSha256": "...",
  "state": "planned"
}
```

Der Plan wird nach seiner Erstellung nicht stillschweigend neu berechnet. Jede Aenderung an Produkt, Quelle, Zielwert, Feldfreigabe oder Code erzeugt einen neuen Plan-Hash und verlangt eine erneute Pruefung. Vorschlaege ohne tatsaechliche Wertaenderung werden als `no-op` verworfen und duerfen nicht in den Write-Plan gelangen. Vor einem spaeteren Live-Lauf werden API-Version, Code-Commit, Manifest-Hash und Plan-Hash festgehalten.

### 5. Kontrollierter Write

Live-Writes brauchen einen separaten Modus und einen separaten GraphQL-Client, der Mutationen bei Netzwerkfehlern, HTTP 5xx, Timeout oder fehlender Antwort nicht automatisch wiederholt.

Pro Produkt gilt diese Reihenfolge:

1. Ledger atomar von `reviewed` auf `inflight` setzen und auf Datentraeger schreiben.
2. Produkt unmittelbar vor der Mutation erneut lesen.
3. `updatedAt`, Zielwert-Hash und saemtliche geschuetzten Feldgruppen-Hashes mit dem freigegebenen Plan vergleichen.
4. Bei jeder Abweichung `conflict` setzen, nicht schreiben und einen neuen Dry-run verlangen.
5. Fuer Kernfelder ausschliesslich eine minimale `productUpdate`-Mutation mit den explizit freigegebenen Feldern senden. Beschreibung, Titel und SEO werden nie unbeabsichtigt gemeinsam geschrieben.
6. Fuer Metafields `metafieldsSet` mit dem zuvor gelesenen `compareDigest` verwenden. Bei einer beabsichtigten Neuanlage wird `compareDigest: null` verwendet, damit zwischenzeitliches Anlegen als Konflikt auffaellt. Ein Aufruf enthaelt hoechstens 25 Metafields und nur Metafields desselben Produkts; Produkte werden nicht in einer Mutation gemischt. Damit bleiben Atomizitaet, Ledger und die Aufloesung eines unklaren Ergebnisses produktbezogen. Die Mutation ist gemaess Shopify-Dokumentation atomar.
7. GraphQL-`userErrors` und die Antwort vollstaendig speichern.
8. Bei Timeout, Netzwerkfehler, 5xx oder unlesbarer Antwort den Zustand auf `uncertain` setzen. Zuerst gezielt dieselbe Produkt-ID ruecklesen. Weil ein bereits vorher vorhandener Zielwert keinen Mutationserfolg beweisen wuerde, sind No-op-Writes ausgeschlossen; bleibt die Ausfuehrung trotzdem nicht eindeutig belegbar, bleibt der Zustand `uncertain`. Bis zur eindeutigen Aufloesung darf keine zweite Mutation gesendet werden.
9. Nach einer eindeutigen Erfolgsantwort sofort denselben vollstaendigen Produkt-Snapshot erneut lesen.

`productSet` ist fuer schmale Korrekturen ausgeschlossen. Bei dieser Synchronisationsmutation koennen enthaltene Listen wie Optionen und Varianten als vollstaendiger Sollzustand behandelt werden; ausgelassene Listenelemente koennen dadurch entfernt werden. Ein leerer, aber enthaltener Wert wie `tags: []` kann ausserdem bestehende Daten leeren. Fuer Beschreibung oder SEO ist eine minimale `productUpdate`-Mutation wesentlich enger.

Options- und Variantenkorrekturen laufen nie zusammen mit Text- oder SEO-Korrekturen. Ein solcher Spezialbatch muss alle Options- und Varianten-IDs unmittelbar vor dem Write lesen, Kollisionen verhindern und nachher nachweisen, dass SKU, Barcode, Preis, Bild, Inventar, Variantenzahl und Optionszuordnung unveraendert geblieben sind.

### 6. Vollstaendige Ruecklesepruefung

Jeder geschriebene Datensatz wird geprueft; eine Stichprobe reicht nicht. Die Verifikation muss zeigen:

- Zielwert entspricht exakt dem freigegebenen Wert;
- bei `productUpdate` hat sich Produkt-`updatedAt` nachvollziehbar veraendert; ein reiner Metafield-Write muss Produkt-`updatedAt` nicht veraendern;
- bei `metafieldsSet` stimmen neuer Metafield-Wert, Metafield-`updatedAt` und der neu gelesene `compareDigest`;
- alle nicht freigegebenen Feldgruppen haben denselben Hash wie unmittelbar vor der Mutation;
- Varianten-, Medien- und Inventaranzahl sowie ihre stabilen IDs sind unveraendert;
- Status, Tags und Publikationszustand sind unveraendert;
- bei einem ACTIVE und publizierten Produkt bleibt die oeffentliche URL fuer den festgelegten Markt Schweiz und die festgelegte Sprache erreichbar; Preis, Waehrung CHF, exakt dieselbe Varianten-ID und Kaufbarkeit bleiben vergleichbar und verschlechtern sich nicht;
- bei DRAFT wurde keine Publikation erzeugt.

Bei der ersten Abweichung, einem unklaren Rueckleseergebnis oder einem Auth-/Quota-Fehler stoppt der ganze Write-Abschnitt. Das Ergebnis lautet `unknown` oder `uncertain`, nie automatisch `verified`.

### 7. Ledger und Sperren

Das Ledger ist append-only oder nutzt atomare Dateiersetzung mit Lock. Es enthaelt mindestens:

- Batch-ID, Produkt-GID, Shopidentitaet, API-Version und Code-Commit;
- Manifest-, Plan-, Vorher- und Nachher-Hashes;
- Quelle und Quellenhash;
- freigegebene Felder;
- Mutationstyp, Request-Hash, Start- und Endzeit;
- Shopify-`userErrors` und Ruecklesebeleg;
- Zustand `planned`, `reviewed`, `inflight`, `verified`, `conflict`, `blocked`, `uncertain` oder `failed`.

Ein vorhandener Zustand `inflight` oder `uncertain` sperrt einen Neustart fuer diese Produkt-ID, bis eine gezielte Ruecklesepruefung den Zustand aufgeloest hat. Ein neues Exportfile, eine neue Queue-ID oder ein neuer Prozess macht den Write nicht zu einer neuen Aktion.

### 8. Gestufte Batchgroesse

| Stufe | Umfang | Freigabekriterium fuer die naechste Stufe |
| --- | --- | --- |
| Pruefung und Dry-run | 20 bis 50 IDs | Vollstaendige Snapshots, Quellen, keine `unknown`-Pflichtfelder, gepruefter Diff |
| Pilot | 1 ID, 1 Feldgruppe | Vollstaendige Verifikation und unveraenderte Schutzfelder |
| Kleinbatch | maximal 5 IDs, seriell | Alle `verified`, kein Konflikt, kein `uncertain`, keine Schutzfeldabweichung |
| Normaler Abschnitt | maximal 20 IDs, seriell | Neuer Checkpoint und erneute Identitaets-/Planpruefung vor jedem Abschnitt |

Es gibt keine parallelen Produktmutationen. Ein Fehler beendet den Abschnitt. Die restlichen geplanten IDs bleiben unangetastet.

## Empfohlener neuer Helfer

Statt einen bestehenden Spezialhelfer fuer einen fremden Zweck zu erweitern, sollte ein neuer, eng begrenzter Helfer `automation/product_review_batch.mjs` geplant werden. Er sollte:

- standardmaessig nur `snapshot` und `dry-run` kennen;
- eine exakte Produkt-GID-Allowlist und ein gehashtes Manifest verlangen;
- ein deklaratives Feldschema mit `allowedFields` und `protectedFields` benutzen;
- Queries und Mutation gegen die festgelegte aktuelle Shopify-API-Version validieren;
- Reads mit begrenzten Retries, Mutationen ohne automatische Retries ausfuehren;
- Metafield-CAS mit `compareDigest` erzwingen;
- bei Kernfeldern `updatedAt` und Feldgruppen-Hashes vor dem Write pruefen;
- jede Produktmutation seriell und einzeln ausfuehren;
- `inflight` und `uncertain` vor einem Neustart sperren;
- jedes Produkt vollstaendig ruecklesen und Vorher-/Nachher-Artefakte schreiben;
- einen Write nur mit explizitem Plan-Hash und eigener Live-Option fuer den exakt geprueften Batch zulassen.

Dieser Bericht implementiert oder startet diesen Helfer nicht.

## Lokale Tests

Am geprueften Commit wurden ohne externe Calls folgende Tests ausgefuehrt:

```text
node --test automation/lib/material_test.mjs \
  automation/optionen_reparieren_test.mjs \
  automation/lib/option_umbenennen_test.mjs \
  automation/lib/shopify_gql_test.mjs
```

Ergebnis: alle vier Testdateien bestanden. Darin bestanden 141 Material-Basistests, 25 Tests fuer Optionsreparaturen, 12 Tests fuer Optionsumbenennungen und 25 Tests fuer den GraphQL-Client. Diese Basistests pruefen den oben beschriebenen Mehrfeld-Batchschutz nicht. Der separat dokumentierte Projektbefund R81 zur erweiterten Material-Konfliktsuite bleibt massgebend: nur 11 von 23 Konflikttests bestanden. Deshalb bleibt der Material-Live-Pfad trotz gruener Basistests blockiert.

## Shopify-Dokumentationsgrundlage

- [`metafieldsSet`, Admin GraphQL 2026-10](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet): maximal 25 Metafields pro Aufruf, atomare Operation und Compare-and-set ueber `compareDigest`.
- [Produkte mit `productSet` synchronisieren](https://shopify.dev/docs/apps/build/product-merchandising/products-and-collections/sync-data): Unterschiede zwischen weggelassenen Skalaren und als vollstaendig behandelten Listenfeldern beachten.

Vor einem spaeteren Live-Lauf muessen die konkrete Query, `productUpdate`, Publikationsfelder, Taxonomiefelder und Inventarfelder nochmals gegen die dann aktuelle Shopify-Dokumentation und das live verfuegbare Schema validiert werden.

## Freigabestatus

- Read-only-Kandidatensuche und lokale Dry-run-Planung: moeglich.
- Allgemeiner Live-Batch mit vorhandenen Helfern: blockiert.
- Material-Live-Batch: blockiert.
- Text-/SEO-Live-Batch: erst nach Implementierung des Feldschutzes, Konfliktledgers und der vollstaendigen Ruecklesepruefung pruefbar.
- Tags, Status, Inventar, Publikationen, Preise, Varianten und Optionen: in diesem Prozess geschuetzt und unveraendert.

