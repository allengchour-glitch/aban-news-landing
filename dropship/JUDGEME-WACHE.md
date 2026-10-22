# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: 2026-10-22 00:41 UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer 181 s

**JUDGEME: 0 verdaechtig · 0 Namen unmaskiert · 51 ausgeblendet · 14539 von 16891 gelesen · API-Deckel: Rest älter als ID 1199671739, zuletzt vollständig gelesen (ID ≤ 1368220721) · NACH-STOPP: 0 veroeffentlicht, 1191 ausgeblendet (Importer-Muster, ID > 1374773944), 0 neu seit der letzten Messung**

Hausregel: NIE Fake-Reviews (UWG). Die Wache LIEST nur — jeder Befund ist ein Entscheid fuer einen Menschen:
ausblenden = `PUT https://judge.me/api/v1/reviews/<id>` mit `{"curated":"spam"}` (privater Token + shop_domain),
loeschen = Judge.me-Admin. Geprueft und in Ordnung → ID in `dropship/_judgeme_freigabe.txt` (ID, Leerzeichen, Grund).

## Regeln
- **hart** (Ampel-Zahl, nur veroeffentlichte): ohne Produkt (Shop-Bewertung) · Titel/Text/Name = Testwort (1234, 12345, abc, asdf, asdfasdf, hallo test, lorem, lorem ipsum, …) · Absender = Betreiber-Adresse (ENV `JUDGEME_BETREIBER_MAILS`, 0 hinterlegt) · @luxestyle.ch ohne Importer-Muster (`cj-import@`, `importiert+…@`) · Testdomain (example.*, *.invalid, *.test) · Quelle `aliexpress` (übernommene Fremdbewertung, seit 19.10.).
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
| all_reviews_count | 12539 | 2026-10-20T08:26:35Z |
| all_reviews_rating | 4.83 | 2026-10-20T08:06:30Z |
| reviews_grid.metafield_updated_at | 2026-10-20T08:21:01Z | 2026-10-20T08:21:04Z |
| shop_reviews_count | 0 | 2026-09-23T00:11:06Z |
| shop_reviews_rating | 0.00 | 2026-09-23T00:11:06Z |

## Harte Befunde — veroeffentlicht (0)

_keine_

## Nach dem Stopp entstanden (Importer-Muster, ID > 1374773944) — veroeffentlicht (0) / ausgeblendet (1191)

Grundlage: `dropship/_bewertungen_stopp.txt` (Betreiber-Entscheid A, 20.10.2026: der Import bleibt aus). Eine Bewertung mit `cj-import…@luxestyle.ch`
und einer ID ÜBER der Grenze kann nur ein Schreiber erzeugt haben, der die Stopp-Datei nicht kennt (Beleg 20.10.: eine zweite Sitzung auf `main`).
Echte Käufer (andere Adresse) zählen nie. Ausblenden = `PUT …/reviews/<id>` `{"curated":"spam"}` — umkehrbar, entscheidet der Betreiber.

_keine_

## Namen unmaskiert — veroeffentlicht (0)

_keine_

## Bereits ausgeblendet / unveroeffentlicht mit Befund (51)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1203420600 | 2026-06-01T00:00 | 1 | 15413739684225 | Beau Luettgen | su…@judge.me | «I didn't like it, I ordered an XS and the dress arrived too » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Beau Luettgen» |
| 1203437999 | 2026-05-20T00:00 | 1 | 15413651046785 | Buford Becker | su…@judge.me | «The item doesn’t look as on the photo at all. it is quite cl» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Buford Becker» |
| 1203730112 | 2026-04-27T00:00 | 1 | 15413025145217 | Dudley Kuhic | su…@judge.me | «After 4 weeks, finally a clarification. No goods, but money » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Dudley Kuhic» |
| 1203440042 | 2026-04-03T00:00 | 1 | 15413083832705 | Nakesha Beer | su…@judge.me | «Never received item says they’re reshipping but tracking say» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Nakesha Beer» |
| 1203420598 | 2026-04-03T00:00 | 1 | 15413739684225 | Alesia Kub | su…@judge.me | «Not xs way to big» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Alesia Kub» |
| 1203420591 | 2026-04-03T00:00 | 1 | 15413739684225 | Jacki Zemlak | su…@judge.me | «Wrong color and wrong size» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Jacki Zemlak» |
| 1203730105 | 2026-03-30T00:00 | 1 | 15413025145217 | Noah Johnson | su…@judge.me | «My order does not match the description, very disappointed w» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Noah Johnson» |
| 1203420588 | 2026-03-22T00:00 | 1 | 15413739684225 | Virgilio Bahringer | su…@judge.me | «Horrible and came with stains on it» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Virgilio Bahringer» |
| 1203420540 | 2026-01-11T00:00 | 1 | 15413739684225 | Rod Greenholt | su…@judge.me | «This dress is huge, i got an xs and it fit my mom who’s an x» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Rod Greenholt» |
| 1203420605 | 2026-01-11T00:00 | 1 | 15413739684225 | Hong Deckow | su…@judge.me | «Sommerkleid ärmellos · Damen, tailliert & elegant (Schwarz)» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Hong Deckow» |
| 1203438001 | 2026-01-05T00:00 | 1 | 15413651046785 | Clint Okuneva | su…@judge.me | «The colour faded when i put it in the water for the first ti» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Clint Okuneva» |
| 1203438002 | 2025-12-07T00:00 | 1 | 15413651046785 | Hugo McGlynn | su…@judge.me | «I never received the item because of the delivery company.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Hugo McGlynn» |
| 1203469315 | 2025-11-26T00:00 | 1 | 15413651046785 | Kendrick D'Amore | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Kendrick D'Amore» |
| 1203469316 | 2025-11-26T00:00 | 1 | 15413651046785 | Susana Lang | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Susana Lang» |
| 1203469311 | 2025-11-26T00:00 | 1 | 15413651046785 | Jami Lueilwitz | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Jami Lueilwitz» |
| 1203469317 | 2025-11-26T00:00 | 1 | 15413651046785 | Pamela Pfeffer | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Pamela Pfeffer» |
| 1203420699 | 2025-11-11T00:00 | 1 | 15413739684225 | Roberta Shields | su…@judge.me | «I bought size S. I am 1.67cm tall, weigh 61kg, bust 94cm, wa» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Roberta Shields» |
| 1203420718 | 2025-08-28T00:00 | 1 | 15413739684225 | Shamika Bernier | su…@judge.me | «Nothing, this dress is for sleeping, not for going out.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Shamika Bernier» |
| 1203420594 | 2025-08-03T00:00 | 1 | 15413739684225 | Classie Keeling | su…@judge.me | «I am sending dress back not size xs very disapointed i recei» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Classie Keeling» |
| 1203420596 | 2025-07-09T00:00 | 1 | 15413739684225 | Mirta Dickinson | su…@judge.me | «Thin see-through material, just a long tank top not a dress,» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Mirta Dickinson» |
| 1203437029 | 2026-05-20T00:00 | 2 | 15413724676481 | Danyelle Runte | su…@judge.me | «Nylon dress» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Danyelle Runte» |
| 1203420572 | 2026-04-24T00:00 | 2 | 15413739684225 | Daniell Ryan | su…@judge.me | «I really liked the M and XS, they run large.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Daniell Ryan» |
| 1203420697 | 2026-04-20T00:00 | 2 | 15413739684225 | Titus Strosin | su…@judge.me | «SORRY, BUT THIS ISN'T A DRESS 👗? IT'S A HOT AND HUGE NIGHTGO» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Titus Strosin» |
| 1203469694 | 2025-08-26T00:00 | 2 | 15413083242881 | Leonardo Jacobson | su…@judge.me | «The embroidery is not bad, it has been bad for me with embro» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Leonardo Jacobson» |
| 1203437031 | 2026-05-27T00:00 | 3 | 15413724676481 | Tynisha Klein | su…@judge.me | «For that quality the price is too high. its is 100% plastic» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Tynisha Klein» |
| 1203478587 | 2026-05-22T00:00 | 3 | 15413724676481 | Donnell Runte | su…@judge.me | «Everything is fine, but the dress is not as beautiful in per» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Donnell Runte» |
| 1203469691 | 2026-05-14T00:00 | 3 | 15413083242881 | Anne Turner | su…@judge.me | «There are some loose threads, but that doesn't matter much c» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Anne Turner» |
| 1237361369 | 2026-03-29T00:00 | 3 | 15422970134913 | Catherine Bogan | su…@judge.me | «I was expecting more purple-violet color; I use these stones» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Catherine Bogan» |
| 1203420528 | 2026-01-09T00:00 | 3 | 15413739684225 | Harley Bosco | su…@judge.me | «3 xl is closer to size 8 us» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Harley Bosco» |
| 1203438000 | 2025-09-26T00:00 | 3 | 15413651046785 | Giselle Von | su…@judge.me | «Average product quality» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Giselle Von» |
| 1385410025 | 2026-10-18T06:04 | 4 | 16612790763911 | المتسوق في AliExpress | cj…@luxestyle.ch | «Ich muss zugeben, ich hätte nicht erwartet, dass das Produkt» | ausgeblendet (curated spam) | Name unmaskiert «المتسوق في AliExpress» |
| 1203478585 | 2026-05-17T00:00 | 4 | 15413724676481 | Elroy Wisoky | su…@judge.me | «For price this is good quality, nice colour and lovely summe» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Elroy Wisoky» |
| 1203462974 | 2026-05-02T00:00 | 4 | 15413724676481 | Caleb DuBuque | su…@judge.me | «M - for size 42-44. For height 150-152, you need XL.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Caleb DuBuque» |
| 1203420623 | 2026-02-21T00:00 | 4 | 15413739684225 | Tyree Frami | su…@judge.me | «Bright, transparent, 100% synthetic, but pleasant to the tou» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Tyree Frami» |
| 1199672149 | 2026-02-19T00:00 | 4 | 15403009704321 | Davis Senger | su…@judge.me | «The package arrived within 2 weeks and matches the descripti» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Davis Senger» |
| 1199671739 | 2026-02-02T00:00 | 4 | 15408457843073 | Maryjane Hoeger | su…@judge.me | «Good device, unfortunately one arrived broken.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Maryjane Hoeger» |
| 1203469681 | 2026-01-22T00:00 | 4 | 15413083242881 | Bao Witting | su…@judge.me | «The set is very cute. It looks of excellent quality. The onl» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Bao Witting» |
| 1203420625 | 2026-01-19T00:00 | 4 | 15413739684225 | Wm McCullough | su…@judge.me | «I saw this in the reviews. I took size S for my M-L (height » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Wm McCullough» |
| 1203469688 | 2025-11-17T00:00 | 4 | 15413083242881 | Adrian Wisozk | su…@judge.me | «I wear M and bought G, the best thing I did. It fit more snu» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Adrian Wisozk» |
| 1203469689 | 2025-10-27T00:00 | 4 | 15413083242881 | Yee Von | su…@judge.me | «Better than I expected, the size fits me perfectly.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Yee Von» |
| 1203440055 | 2025-10-12T00:00 | 4 | 15413083832705 | Theresia Ebert | su…@judge.me | «In general, everything is fine. Practically as in the photo.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Theresia Ebert» |
| 1203815777 | 2025-09-22T00:00 | 4 | 15412915339649 | Jody Kirlin | su…@judge.me | «The dress is as described, I usually wear size S/M. I took t» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Jody Kirlin» |
| 1203440054 | 2025-08-30T00:00 | 4 | 15413083832705 | Sudie Schaefer | su…@judge.me | «Cool» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung); Name unmaskiert «Sudie Schaefer» |
| 1385398917 | 2026-10-18T05:35 | 5 | 15481799934337 | google9711777042365908 | cj…@luxestyle.ch | «Super und perfekt!» | ausgeblendet (curated spam) | Name unmaskiert «google9711777042365908» |
| 1385391532 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Alles war perfekt. Ich kann den Verkäufer wirklich empfehlen» | ausgeblendet (curated spam) | Name unmaskiert «Anónimo» |
| 1385391512 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Artikel wie beschrieben! Ist gut!» | ausgeblendet (curated spam) | Name unmaskiert «Anónimo» |
| 1385385229 | 2026-10-18T04:50 | 5 | 15479468294529 | Zaracail | cj…@luxestyle.ch | «Der Akku ist okay, hält 3 halbe Tage. Ansonsten ist für den » | ausgeblendet (curated spam) | Name unmaskiert «Zaracail» |
| 1383701253 | 2026-10-17T02:45 | 5 | 15479625908609 | Anónimo | cj…@luxestyle.ch | «Echt gut!» | ausgeblendet (curated spam) | Name unmaskiert «Anónimo» |
| 1383697361 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service! Danke!» | ausgeblendet (curated spam) | Name unmaskiert «TechHome26» |
| 1383697347 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service und schneller Versand!» | ausgeblendet (curated spam) | Name unmaskiert «TechHome26» |
| 1335720164 | 2026-09-14T20:06 | 5 | 0 | Test | te…@example.invalid | «Probelauf» | ausgeblendet (curated spam) | ohne Produkt (Shop-Bewertung); body = Testwort «Probelauf»; Name = Testwort «Test»; Testdomain example.invalid |

## Freigegeben durch Menschen (0)

_keine_
