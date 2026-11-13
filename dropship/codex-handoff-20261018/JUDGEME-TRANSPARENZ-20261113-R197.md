# Judge.me read audit — LuxeStyle

Shopify Admin GraphQL read only; query fields were discovered from schema first. Read exactly the three requested products and their `judgeme.review_widget_data` metafields, plus the two requested shop aggregate metafields.

| Product | Status | Judge.me widget | Requested UUID | Match | Verified | Source status |
|---|---|---:|---|---|---|---|
| Notizbuch für Gewichtsverfolgung (`16603787985287`) | ACTIVE | 3 reviews, 5.00 | `032a010b-65cd-4ee5-b0db-16099aba202a` | Yes | false | `source: null`; badge `review_collected_from_store_visitor` |
| Drehwinkelmesser für Fahrzeuge (`16606125097351`) | ACTIVE | 8 reviews, 4.38 | `c546cc49-4cce-43f5-a315-80e873cf8857` | Yes | false | `source: null`; badge `review_collected_from_store_visitor` |
| 2-in-1 10W kabelloses Ladegerät (`16613767381383`) | ACTIVE | 8 reviews, 3.62 | `2a31f8b7-1969-4d20-aecb-5ff64126a44e` | Yes | false | `source: null`; badge `review_collected_from_store_visitor` |

The `product_external_id` in each widget matches its owning Shopify product ID. All requested UUIDs were found on the expected product; no mismatch or missing UUID among these three. The latter two also appear in each product's Judge.me photo gallery data.

Judge.me shop-level metafields returned `all_reviews_rating = 4.83` and `all_reviews_count = 12563`. These are shop aggregates and say nothing by themselves about product-specific reviews or verified purchases.

**Provenance caveat:** each requested review has `verified_buyer: false`, `source: null`, and a `review_collected_from_store_visitor` transparency badge. The review data does not establish a verified purchase. No personal reviewer fields or review text were retained here.

## Live-Seiten-/Disclosure-Prüfung (13.11.2026)

Abruf der drei öffentlichen Produktseiten auf luxestyle.ch; nur HTML-Quellenprüfung, keine Review-API oder Admin-Reviewabfrage. Die aktuelle Seitenquelle enthält Judge.me-Widget-Markup und dieselben erwarteten UUIDs. Die eingebetteten Judge.me-Datensätze auf den Seiten enthalten `verified_buyer:false` für die erwarteten Reviews (insgesamt Seite 1: 3 false-Datensätze, Seite 2: 6, Seite 3: 7; die zusätzlichen Datensätze sind nicht Teil dieses gezielten Audits). In der Seitenquelle wurde kein sichtbarer Text „Verifizierter Kauf“, „Verifizierter Käufer“ oder „Kauf bestätigt“ gefunden. Es gibt CSS-Regeln für einen verifizierten Käufer-Badge, aber die angefragten Reviews sind nicht verifiziert.

Judge.me-Live-CSS blendet `jdgm-rev__transparency-badge[data-badge-type="review_collected_from_store_visitor"]` mit `display:none !important` aus. Das bedeutet: Die Herkunft als Store-Visitor-Review wird durch diese CSS-Regel nicht sichtbar kenntlich gemacht. Zusammen mit `verified_buyer:false` spricht die Quelle nicht dafür, dass der „verifizierter Käufer“-Badge auf diese Reviews angewendet wird; die Besucher-Herkunfts-Disclosure wird allerdings gezielt verborgen.

Es wurde kein Judge.me-Badge für Schweizer Käufer gefunden. Die Seitenquelle enthält den Ausdruck „aus der Schweiz“ an einer Stelle in einem `<b>`-Element; anhand der flüchtigen Quellensuche lässt sich nicht sicher belegen, ob dies Reviewtext oder ein anderer Seitentext ist. Daher bleibt ein möglicher Schweizer-Kauf-Eindruck **unklar**. Das Wort „Schweizer“ erscheint außerdem in der allgemeinen Versand-Ankündigung „Kostüme ab Schweizer Lager“; das ist eine Lager-/Versandaussage, kein Kauf-/Review-Provenienznachweis.

**Einschränkung:** Dies ist eine Prüfung der HTML-Seitenquelle, keine gerenderte Browserprüfung nach vollständigem JavaScript-Laden. Widgets können nachladen. Die Originalseiten-HTML wurde nach der Auswertung gelöscht; es wurden keine Reviewtexte oder Reviewerangaben in den Bericht übernommen.

Root-Gegenprobe: Read-only Theme-Suche in layout/snippets/sections/assets nach dem exakten Badge-Klassennamen lieferte keine Treffer (rg Exit1). Herkunft der ausgelieferten CSS-Regel damit nicht lokalisiert; App-Injektion möglich, nicht bewiesen. Keine Theme-/App-/Reviewänderung. Nächster Schritt: Regelquelle in Judge.me/nativem Editor lokalisieren und Besucher-Hinweis erhalten; keine Bewertungen erfinden oder verifizieren.
