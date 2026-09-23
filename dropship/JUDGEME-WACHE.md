# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: 2026-09-23 00:07 UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer 119 s

**JUDGEME: 0 verdaechtig · 12 Namen unmaskiert · 1 ausgeblendet · 10415 von 10415 gelesen**

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
| all_reviews_count | 10396 | 2026-09-23T00:07:35Z |
| all_reviews_rating | 4.89 | 2026-09-15T05:19:17Z |
| reviews_grid.metafield_updated_at | 2026-09-23T00:06:43Z | 2026-09-23T00:06:45Z |
| shop_reviews_count | 1 | 2026-09-14T20:30:36Z |
| shop_reviews_rating | 5.00 | 2026-09-14T20:30:37Z |

## Harte Befunde — veroeffentlicht (0)

_keine_

## Namen unmaskiert — veroeffentlicht (12)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1316672656 | 2026-08-31T16:12 | 5 | 15451638038913 | AliExpress Müşterisi | cj…@luxestyle.ch | «excelente vale la pena por el precio .graba super bien en la» | veröffentlicht | Name unmaskiert «AliExpress Müşterisi» |
| 1315625975 | 2026-08-30T20:23 | 5 | 15450858062209 | Darksin | cj…@luxestyle.ch | «Phofay is one of those brands where you question how it isn'» | veröffentlicht | Name unmaskiert «Darksin» |
| 1313874473 | 2026-08-29T02:17 | 5 | 15450852786561 | Unishkhyaju | cj…@luxestyle.ch | «Das Produkt sieht nicht neu aus. Auf dem Gehäuse sind Kratze» | veröffentlicht | Name unmaskiert «Unishkhyaju» |
| 1288261379 | 2026-08-07T14:11 | 5 | 15450840531329 | crugggzz | cj…@luxestyle.ch | «Hat etwas gedauert, war aber sehr gut.» | veröffentlicht | Name unmaskiert «crugggzz» |
| 1287668857 | 2026-08-07T03:16 | 5 | 15450833060225 | entiretyboutique | cj…@luxestyle.ch | «Kam in der schwarzen Box, die ich für Kunden bestellt habe. » | veröffentlicht | Name unmaskiert «entiretyboutique» |
| 1287667782 | 2026-08-07T03:13 | 5 | 15450832798081 | R3D2 | cj…@luxestyle.ch | «Super, dabei zu sein!» | veröffentlicht | Name unmaskiert «R3D2» |
| 1287641354 | 2026-08-07T02:12 | 5 | 15450830799233 | Adeebay | cj…@luxestyle.ch | «Schnelle Lieferung, Produkt gut, aber der Karton war beschäd» | veröffentlicht | Name unmaskiert «Adeebay» |
| 1287640531 | 2026-08-07T02:10 | 5 | 15450830176641 | jingan | cj…@luxestyle.ch | «Die Kleidung ist sehr warm und passt super. Ich bin total zu» | veröffentlicht | Name unmaskiert «jingan» |
| 1286443803 | 2026-08-06T04:12 | 5 | 15449425445249 | jeaneneE | cj…@luxestyle.ch | «Die sind ausgezeichnet und das Design ist super clever. Wirk» | veröffentlicht | Name unmaskiert «jeaneneE» |
| 1286443638 | 2026-08-06T04:11 | 5 | 15449425412481 | UKStyleStore | cj…@luxestyle.ch | «Ich brauche eine Rechnung.» | veröffentlicht | Name unmaskiert «UKStyleStore» |
| 1286441206 | 2026-08-06T04:08 | 5 | 15449424953729 | Darksin | cj…@luxestyle.ch | «Es ist sehr süß und ästhetisch. Es dreht sich nicht, wie in » | veröffentlicht | Name unmaskiert «Darksin» |
| 1286441197 | 2026-08-06T04:08 | 5 | 15449424953729 | junru | cj…@luxestyle.ch | «Wir haben es gerade geöffnet, und es war beschädigt.» | veröffentlicht | Name unmaskiert «junru» |

## Bereits ausgeblendet / unveroeffentlicht mit Befund (1)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1335720164 | 2026-09-14T20:06 | 5 | 0 | Test | te…@example.invalid | «Probelauf» | ausgeblendet (curated spam) | ohne Produkt (Shop-Bewertung); body = Testwort «Probelauf»; Name = Testwort «Test»; Testdomain example.invalid |

## Freigegeben durch Menschen (0)

_keine_
