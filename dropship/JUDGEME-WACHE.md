# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: 2026-10-09 03:10 UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer 173 s

**JUDGEME: unklar (unvollstaendig: rating 5 >100 Seiten (API-Deckel page=100)) · bis dahin 0 verdaechtig · 3 Namen unmaskiert · 14355 von 15498 gelesen**

Hausregel: NIE Fake-Reviews (UWG). Die Wache LIEST nur — jeder Befund ist ein Entscheid fuer einen Menschen:
ausblenden = `PUT https://judge.me/api/v1/reviews/<id>` mit `{"curated":"spam"}` (privater Token + shop_domain),
loeschen = Judge.me-Admin. Geprueft und in Ordnung → ID in `dropship/_judgeme_freigabe.txt` (ID, Leerzeichen, Grund).

## Regeln
- **hart** (Ampel-Zahl, nur veroeffentlichte): ohne Produkt (Shop-Bewertung) · Titel/Text/Name = Testwort (1234, 12345, abc, asdf, asdfasdf, hallo test, lorem, lorem ipsum, …) · Absender = Betreiber-Adresse (ENV `JUDGEME_BETREIBER_MAILS`, 0 hinterlegt) · @luxestyle.ch ohne Importer-Muster (`cj-import@`, `importiert+…@`) · Testdomain (example.*, *.invalid, *.test).
- **weich** (eigene Zahl): Reviewer-Name unmaskiert — die Importer maskieren («C***t»), CJ-Nutzernamen ohne Leerzeichen blieben roh. Die API kann Namen/Texte nicht aendern («for authenticity reason»), nur ausblenden.
- Paginierung: je rating 1..5, per_page 100 (Deckel der API), page klemmt bei 100 (gemessen) → je Teilmenge max. 10'000; Stopp bei kurzer Seite, ohne neue IDs oder Klemme; `/reviews/count` als Gegenzahl. Fehler/Klemme → «unklar»/«unvollstaendig», nie «0».

## Vorgang 22.09.2026 — die Testbewertung

| Feld | Wert (GET mit privatem Token, 22.09. 23:52Z) |
|---|---|
| ID | 1335720164 |
| rating / title / body | 5 / `null` / «Probelauf» |
| reviewer | name «Test», E-Mail auf `example.invalid`, source `web`, verified `nothing` |
| product_external_id | 0 (= Shop-Bewertung, «Judge.me Shop Reviews») |
| created / updated | 2026-09-14T20:06:17Z / 20:30:34Z |
| VORHER | published `true`, curated `ok`, hidden `false` |
| DELETE-Versuch | HTTP 404 «page not found» — die API bietet kein DELETE (docs.yaml) |
| Massnahme | PUT `reviews/1335720164` `{"curated":"spam"}` → 200 «Action performed successful» |
| NACHHER (frischer GET 23:55Z) | published **false**, curated **spam**, hidden false |

Shopify-Metafelder `judgeme` VOR der Massnahme (23:50Z): `shop_reviews_count` **1** (updatedAt 14.09. 20:30:36Z),
`shop_reviews_rating` 5.00, `all_reviews_count` **10'375**, `reviews_grid.metafield_updated_at` 22.09.
Judge.me schreibt sie zeitverzoegert; der Waechter unten liest sie bei jedem Lauf mit — sobald
`shop_reviews_count` auf 0 steht, ist die Zahl auf der Startseite bereinigt.
**Endgueltig loeschen** (Papierkorb) geht nur im Judge.me-Admin — Betreiber-Klick, kein API-Weg.

## Shopify-Metafelder `judgeme` (was die Startseite zeigt; Judge.me schreibt zeitverzoegert)

| Feld | Wert | updatedAt |
|---|---|---|
| all_reviews_count | 12594 | 2026-10-09T02:28:14Z |
| all_reviews_rating | 4.84 | 2026-10-08T12:31:39Z |
| reviews_grid.metafield_updated_at | 2026-10-09T02:31:22Z | 2026-10-09T02:31:24Z |
| shop_reviews_count | 0 | 2026-09-23T00:11:06Z |
| shop_reviews_rating | 0.00 | 2026-09-23T00:11:06Z |

## Harte Befunde — veroeffentlicht (0)

_keine_

## Namen unmaskiert — veroeffentlicht (3)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1316672656 | 2026-08-31T16:12 | 5 | 15451638038913 | AliExpress Müşterisi | cj…@luxestyle.ch | «excelente vale la pena por el precio .graba super bien en la» | veröffentlicht | Name unmaskiert «AliExpress Müşterisi» |
| 1315625975 | 2026-08-30T20:23 | 5 | 15450858062209 | Darksin | cj…@luxestyle.ch | «Phofay is one of those brands where you question how it isn'» | veröffentlicht | Name unmaskiert «Darksin» |
| 1313874473 | 2026-08-29T02:17 | 5 | 15450852786561 | Unishkhyaju | cj…@luxestyle.ch | «Das Produkt sieht nicht neu aus. Auf dem Gehäuse sind Kratze» | veröffentlicht | Name unmaskiert «Unishkhyaju» |

## Bereits ausgeblendet / unveroeffentlicht mit Befund (1)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1335720164 | 2026-09-14T20:06 | 5 | 0 | Test | te…@example.invalid | «Probelauf» | ausgeblendet (curated spam) | ohne Produkt (Shop-Bewertung); body = Testwort «Probelauf»; Name = Testwort «Test»; Testdomain example.invalid |

## Freigegeben durch Menschen (0)

_keine_
