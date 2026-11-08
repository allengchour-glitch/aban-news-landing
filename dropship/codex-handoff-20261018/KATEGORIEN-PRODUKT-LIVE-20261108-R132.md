# R132 – vier Kategorien und ein fehlklassifiziertes Damenkleid live korrigiert

**Datum:** 08.11.2026
**Dokumentiert:** 2026-11-08T05:16:20+01:00
**Ausgangsrevision:** 131, Commit `fbe9fb958651ef8af1e63e4ffc9b3800971573b6`

## Ergebnis

Vor den Writes stimmten Shopify `LuxeStyle`/`luxestyle.ch`/CHF/Schweiz und Metricool Brand `6227837`/`Europe/Zurich` samt Instagram, Threads und TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH` und YouTube `UCSfCEYjAsdOyYxyfTClXRZA`. Es gab keinen Metricool-Write.

Vier ACTIVE Collections erhielten je genau einen `collectionUpdate`. Geändert wurden ausschliesslich `descriptionHtml` und die SEO-Beschreibung; alle vier Antworten hatten `userErrors=[]`. Titel, Handle, SEO-Titel, Bild/Alttext, Sortierung, Produktzahl, Regeln und Produktzuordnungen blieben erhalten.

| Collection | ID | Admin-`updatedAt` | Produkte | Änderung und öffentliche Gegenprobe |
|---|---:|---|---:|---|
| Hautpflege & Skincare (`hautpflege-skincare`) | 688391979393 | 2026-11-08T04:08:11Z | 1’333 | Sachliche Orientierung nach Anwendung/Inhalt/Ausführung; HTTP200, Canonical/H1/Body/Meta exakt; Beauty-Link erhalten und HTTP200 |
| Schuhe (`schuhe`) | 688018162049 | 2026-11-08T04:08:41Z | 5’230 | Auswahl und produktseitige Prüfung statt Preis-/Versand-/Rückgabeclaims; HTTP200, Canonical/H1/Body/Meta exakt; vier Links erhalten und HTTP200 |
| Trends & Gadgets (`trends-gadgets`) | 688577577345 | 2026-11-08T04:09:33Z | 4’015 | Funktions-/Kompatibilitätsprüfung statt Innovations-/Leistungsclaims; HTTP200, Canonical/H1/Body/Meta exakt; Technik-Link erhalten und HTTP200 |
| Ladegeräte & Powerbanks (`elektronik-laden`) | 690802262401 | 2026-11-08T04:09:54Z | 591 | Anschluss, Leistung, Steckertyp, Kapazität und Kompatibilität als Prüfpunkte; HTTP200, Canonical/H1/Body/Meta exakt; Technik-Link erhalten und HTTP200 |

Die früheren Zielclaims zu exklusiver/hochwirksamer/revolutionierender Pflege, täglich neuen Modellen/fairen Preisen, innovativer/leistungsstarker Technik, kuratierter Auswahl sowie pauschaler Lieferung, Gratisversand, Rückgabe und Zahlungsarten fehlen in den jeweils korrigierten Collection-Inhalten. Die öffentliche Gratisversandsschwelle wurde nicht geändert.

## Produkt 15449508577665

Die aktuellen Bilder und Varianten belegen ein knielanges Kleid mit asymmetrischer Drapierung, keinen Rock. Ein `productUpdate` um `2026-11-08T04:12:23Z` setzte:

- Titel: **Damenkleid mit asymmetrischer Drapierung**
- neutralen, bild- und variantenbasierten Body
- SEO-Titel: **Damenkleid mit Drapierung | LuxeStyle Schweiz**
- SEO-Beschreibung: **Knielanges Damenkleid mit asymmetrischer Drapierung. Farbe, Ärmelvariante und Grösse direkt auf der Produktseite auswählen.**

Ein einziger Batch-`fileUpdate` um `2026-11-08T04:12:39Z` setzte fünf exakte Alttexte. Beide Mutationen hatten `userErrors=[]`; die finale Rücklesung um `2026-11-08T04:12:40Z` bestätigte die Werte.

| Medium | Exakter Alttext |
|---|---|
| 69874277941633 | Weisses knielanges Damenkleid mit Dreiviertelarm und asymmetrischer Drapierung |
| 69874277974401 | Weisses knielanges Damenkleid mit Langarm und asymmetrischer Drapierung |
| 69874278007169 | Weisses knielanges Damenkleid mit Kurzarm und asymmetrischer Drapierung |
| 69874278039937 | Weisses ärmelloses knielanges Damenkleid mit asymmetrischer Drapierung |
| 69874278072705 | Schwarzes knielanges Damenkleid mit Kurzarm und asymmetrischer Drapierung |

Erhalten blieben `ACTIVE`, Handle `elegante-taille-verjungung-rock-fur-frauen-609600`, Canonical, `Damenmode`, Vendor `LuxeStyle`, alle Tags, 23 Varianten-IDs/SKUs, CHF55.90, Kaufbarkeit, Menge0, `tracked=false`, `CONTINUE` sowie fünf READY-Medien-IDs, URLs und Bindungen. Die exakten 23 ID/SKU-Paare und fünf URLs stehen im JSON-Beleg. Öffentlich: HTTP200, Canonical, Titel, Body, Meta und Kaufbarkeit exakt; alte englische Bodytexte, Rockbeschreibung, «Sorglos shoppen» und englische `White`-Werte fehlen im Zielinhalt. Beide internen Links sind erhalten und HTTP200.

Der alte Rock-Handle und die Tags `kategorie-rock`/`sort-damen-roecke` bleiben bewusst als **separate Taxonomie-/Redirect-Aufgabe** offen. Ein Handlewechsel ohne Redirectentscheidung wäre nicht begrenzt gewesen. `rueckhol-0907` blockiert Social weiterhin; kein Social-Write.

## Begrenzter Website-Audit

Firecrawl prüfte acht Produkte, zwölf Pages und eine Collection; alle 21 Ziele lieferten HTTP200. Der Lauf verbrauchte zwei Credits und ist keine Katalogvollmessung. Offen bleiben:

- fremdsprachig benannte Root-Pages mit `html lang=de` (`about-us-en`, `why-luxestyle-en`, `privacy-policy-en`, `refund-policy-en`, `a-propos-fr`, `chi-siamo-it`),
- `/pages/firmen-vereine` mit noch zu belegenden Mengen-, Lieferzeit-, Lager-, Antwortzeit-, Rabatt- und Zahlungsclaims,
- weitere Produktkandidaten aus der begrenzten Stichprobe.

Daraus wurde kein zusätzlicher Shop-, Theme-, Feed- oder Locale-Write abgeleitet.

## Zählung und Grenzen

- **6 erfolgreiche Shopify-Mutationsaufrufe:** 4 × `collectionUpdate`, 1 × `productUpdate`, 1 × Batch-`fileUpdate`
- **10 Mutation-Inputziele:** 4 Collections + 1 Produkt + 5 Medien
- **5 logische Inhaltsziele:** 4 Collections + 1 Produkt
- **0** unklare Writes oder blinde Wiederholungen
- keine Wiederholung von Tageskennzahlen, Klaviyo-Flows, Bestellungen oder beendetem Kauf-Watch
- keine weiteren externen Writes: kein Theme, Merchant/Feed, Metricool, Klaviyo, DNS, Rabatt, Budget, Kundenkontakt, Bestellung, Render oder Publikation

## Nächster begrenzter Schritt

Die Produktklassifikation/der alte Handle benötigen eine eigenständige Taxonomie- und Redirectentscheidung. Danach sind die fremdsprachigen Root-Pages und die belegpflichtigen Firmen-/Produktkandidaten einzeln gegen Quellen zu prüfen. Bis dahin bleiben historische Handle/Tags erhalten und das Produkt wegen `rueckhol-0907` Social-blockiert.

[Maschinenlesbarer R132-Beleg](KATEGORIEN-PRODUKT-LIVE-20261108-R132.json)
