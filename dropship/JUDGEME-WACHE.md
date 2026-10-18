# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: 2026-10-18 22:58 UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer 137 s

**JUDGEME: unklar (unvollstaendig: rating 5 >100 Seiten (API-Deckel page=100)) · bis dahin 0 verdaechtig · 8 Namen unmaskiert · 14539 von 16891 gelesen**

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
| all_reviews_count | 13677 | 2026-10-18T19:00:34Z |
| all_reviews_rating | 4.84 | 2026-10-18T05:24:12Z |
| reviews_grid.metafield_updated_at | 2026-10-18T19:02:15Z | 2026-10-18T19:02:17Z |
| shop_reviews_count | 0 | 2026-09-23T00:11:06Z |
| shop_reviews_rating | 0.00 | 2026-09-23T00:11:06Z |

## Harte Befunde — veroeffentlicht (0)

_keine_

## Namen unmaskiert — veroeffentlicht (8)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1385410025 | 2026-10-18T06:04 | 4 | 16612790763911 | المتسوق في AliExpress | cj…@luxestyle.ch | «Ich muss zugeben, ich hätte nicht erwartet, dass das Produkt» | veröffentlicht | Name unmaskiert «المتسوق في AliExpress» |
| 1385398917 | 2026-10-18T05:35 | 5 | 15481799934337 | google9711777042365908 | cj…@luxestyle.ch | «Super und perfekt!» | veröffentlicht | Name unmaskiert «google9711777042365908» |
| 1385391532 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Alles war perfekt. Ich kann den Verkäufer wirklich empfehlen» | veröffentlicht | Name unmaskiert «Anónimo» |
| 1385391512 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Artikel wie beschrieben! Ist gut!» | veröffentlicht | Name unmaskiert «Anónimo» |
| 1385385229 | 2026-10-18T04:50 | 5 | 15479468294529 | Zaracail | cj…@luxestyle.ch | «Der Akku ist okay, hält 3 halbe Tage. Ansonsten ist für den » | veröffentlicht | Name unmaskiert «Zaracail» |
| 1383701253 | 2026-10-17T02:45 | 5 | 15479625908609 | Anónimo | cj…@luxestyle.ch | «Echt gut!» | veröffentlicht | Name unmaskiert «Anónimo» |
| 1383697361 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service! Danke!» | veröffentlicht | Name unmaskiert «TechHome26» |
| 1383697347 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service und schneller Versand!» | veröffentlicht | Name unmaskiert «TechHome26» |

## Bereits ausgeblendet / unveroeffentlicht mit Befund (1)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1335720164 | 2026-09-14T20:06 | 5 | 0 | Test | te…@example.invalid | «Probelauf» | ausgeblendet (curated spam) | ohne Produkt (Shop-Bewertung); body = Testwort «Probelauf»; Name = Testwort «Test»; Testdomain example.invalid |

## Freigegeben durch Menschen (0)

_keine_
