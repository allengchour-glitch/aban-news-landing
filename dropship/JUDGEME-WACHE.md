# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: 2026-10-20 06:54 UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer 337 s

**JUDGEME: 0 verdaechtig · 5 Namen unmaskiert · 46 ausgeblendet · 14539 von 16891 gelesen · API-Deckel: Rest älter als ID 1199671739, zuletzt vollständig gelesen (ID ≤ 1368220721) · NACH-STOPP: 901 veroeffentlicht, 290 ausgeblendet (Importer-Muster, ID > 1374773944) ⚠️ der Stopp wird umgangen**

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
| all_reviews_count | 13387 | 2026-10-18T23:14:26Z |
| all_reviews_rating | 4.84 | 2026-10-18T05:24:12Z |
| reviews_grid.metafield_updated_at | 2026-10-19T12:51:46Z | 2026-10-19T12:51:48Z |
| shop_reviews_count | 0 | 2026-09-23T00:11:06Z |
| shop_reviews_rating | 0.00 | 2026-09-23T00:11:06Z |

## Harte Befunde — veroeffentlicht (0)

_keine_

## Nach dem Stopp entstanden (Importer-Muster, ID > 1374773944) — veroeffentlicht (901) / ausgeblendet (290)

Grundlage: `dropship/_bewertungen_stopp.txt` (Betreiber-Entscheid A, 20.10.2026: der Import bleibt aus). Eine Bewertung mit `cj-import…@luxestyle.ch`
und einer ID ÜBER der Grenze kann nur ein Schreiber erzeugt haben, der die Stopp-Datei nicht kennt (Beleg 20.10.: eine zweite Sitzung auf `main`).
Echte Käufer (andere Adresse) zählen nie. Ausblenden = `PUT …/reviews/<id>` `{"curated":"spam"}` — umkehrbar, entscheidet der Betreiber.

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1385848328 | 2026-10-18T18:54 | 4 | 15449486295425 | O***m | cj…@luxestyle.ch | «Nettes Design, lässt sich fest montieren. Bild ist tagsüber » | veröffentlicht | Importer-Muster nach Stopp |
| 1385848313 | 2026-10-18T18:54 | 4 | 15449486295425 | P***d | cj…@luxestyle.ch | «Das Paket kam total zerknittert an, aber innen ist zum Glück» | veröffentlicht | Importer-Muster nach Stopp |
| 1385848124 | 2026-10-18T18:53 | 4 | 15449485672833 | Z***g | cj…@luxestyle.ch | «Das Produkt kam sehr schnell an und scheint von guter Qualit» | veröffentlicht | Importer-Muster nach Stopp |
| 1385847985 | 2026-10-18T18:52 | 4 | 15449485312385 | Y***u | cj…@luxestyle.ch | «Auf dem iPhone 7 Pro nimmt die Gimbal Show App Videos ohne T» | veröffentlicht | Importer-Muster nach Stopp |
| 1385847939 | 2026-10-18T18:52 | 4 | 15449485312385 | J***l | cj…@luxestyle.ch | «Kaufst du es einmal, verstehst du, warum du lieber ein Cosmo» | veröffentlicht | Importer-Muster nach Stopp |
| 1385847916 | 2026-10-18T18:52 | 4 | 15449485312385 | O***w | cj…@luxestyle.ch | «Nützliches Tool für den Preis.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385847834 | 2026-10-18T18:52 | 4 | 15449485246849 | B***v | cj…@luxestyle.ch | «Die Kamera ist gut und funktioniert super, kam aber mit lose» | veröffentlicht | Importer-Muster nach Stopp |
| 1385418135 | 2026-10-18T06:18 | 4 | 15501899727233 | Q***z | cj…@luxestyle.ch | «Lädt sehr, sehr langsam, aber eine super Idee für Reisen.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385416571 | 2026-10-18T06:15 | 4 | 15501006537089 | A***w | cj…@luxestyle.ch | «Die Lieferung war etwas spät, aber das Produkt kam gut verpa» | veröffentlicht | Importer-Muster nach Stopp |
| 1385416265 | 2026-10-18T06:15 | 4 | 15502256275841 | Z***p | cj…@luxestyle.ch | «Super, weil die 6 Klingen den Stoff kaum beschädigen.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385416247 | 2026-10-18T06:15 | 4 | 15502256275841 | V***v | cj…@luxestyle.ch | «Reinigt gut, aber ist super zerbrechlich. Mir ist es aus der» | veröffentlicht | Importer-Muster nach Stopp |
| 1385413468 | 2026-10-18T06:11 | 4 | 15524696359297 | D***q | cj…@luxestyle.ch | «Gute Qualität.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385413442 | 2026-10-18T06:11 | 4 | 15524696359297 | L***o | cj…@luxestyle.ch | «Das Handy vibriert nur dreimal pro Anruf. Ich hätte mir gewü» | veröffentlicht | Importer-Muster nach Stopp |
| 1385413201 | 2026-10-18T06:10 | 4 | 15521256604033 | L***b | cj…@luxestyle.ch | «Genau das, was ich wollte.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385411068 | 2026-10-18T06:07 | 4 | 16613835604359 | L***v | cj…@luxestyle.ch | «Kartensteckplatz nicht gefunden.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385410035 | 2026-10-18T06:05 | 4 | 16612790763911 | p***g | cj…@luxestyle.ch | «Die Uhr gefällt mir, aber die Beschreibung ist unzureichend » | veröffentlicht | Importer-Muster nach Stopp |
| 1385410025 | 2026-10-18T06:04 | 4 | 16612790763911 | المتسوق في AliExpress | cj…@luxestyle.ch | «Ich muss zugeben, ich hätte nicht erwartet, dass das Produkt» | veröffentlicht | Importer-Muster nach Stopp |
| 1385406245 | 2026-10-18T05:53 | 4 | 16612778738055 | U***p | cj…@luxestyle.ch | «Schnelle Lieferung, kam aber komplett entladen an. Minuspunk» | veröffentlicht | Importer-Muster nach Stopp |
| 1385405238 | 2026-10-18T05:49 | 4 | 16613788090759 | N***o | cj…@luxestyle.ch | «Qualität ist nur "okay", etwas wackelig, aber es erfüllt sei» | veröffentlicht | Importer-Muster nach Stopp |
| 1385405227 | 2026-10-18T05:49 | 4 | 16613788090759 | D***m | cj…@luxestyle.ch | «Ist okay, nicht das beste Produkt, aber erfüllt seinen Zweck» | veröffentlicht | Importer-Muster nach Stopp |
| 1385404631 | 2026-10-18T05:48 | 4 | 16613846778247 | A***v | cj…@luxestyle.ch | «Funktioniert nicht. Zeigt immer 0% auf jedem Holz an.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385404472 | 2026-10-18T05:48 | 4 | 16613847073159 | V***n | cj…@luxestyle.ch | «Geld zurückbekommen!» | veröffentlicht | Importer-Muster nach Stopp |
| 1385404453 | 2026-10-18T05:48 | 4 | 16613847073159 | C***v | cj…@luxestyle.ch | «Produkt erhalten, funktioniert gut. Gutes Produkt, danke Ver» | veröffentlicht | Importer-Muster nach Stopp |
| 1385403494 | 2026-10-18T05:47 | 4 | 16613767315847 | G***r | cj…@luxestyle.ch | «Nicht schlecht, bin sehr zufrieden.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385403196 | 2026-10-18T05:46 | 4 | 16610122039687 | H***h | cj…@luxestyle.ch | «Günstig, gut und klein.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385402931 | 2026-10-18T05:46 | 4 | 16613782159751 | O***k | cj…@luxestyle.ch | «Normal, alles funktioniert. Es fehlen nur die russischen Buc» | veröffentlicht | Importer-Muster nach Stopp |
| 1385402930 | 2026-10-18T05:46 | 4 | 16613782159751 | L*** | cj…@luxestyle.ch | «Die Verpackung war beschädigt, die Tastatur aber heil.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385401900 | 2026-10-18T05:43 | 4 | 15499700142465 | B***m | cj…@luxestyle.ch | «Sehr gut verarbeitet und solide. Das Laden funktioniert gut,» | veröffentlicht | Importer-Muster nach Stopp |
| 1385400745 | 2026-10-18T05:40 | 4 | 15517622632833 | 4***r | cj…@luxestyle.ch | «Optisch hat mir die Uhr gut gefallen. Beim Einschalten hatte» | veröffentlicht | Importer-Muster nach Stopp |
| 1385400109 | 2026-10-18T05:39 | 4 | 16613786681735 | V***i | cj…@luxestyle.ch | «Gut wie beschrieben.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385399963 | 2026-10-18T05:38 | 4 | 16613828657543 | K***a | cj…@luxestyle.ch | «Sehr gut. Leuchtet und hält ein ziemlich schweres Handy. Du » | veröffentlicht | Importer-Muster nach Stopp |
| 1385399962 | 2026-10-18T05:38 | 4 | 16613828657543 | R***r | cj…@luxestyle.ch | «Sieht gut aus. Bin zufrieden mit dem Kauf. Das Einzige: Ich » | veröffentlicht | Importer-Muster nach Stopp |
| 1385399898 | 2026-10-18T05:38 | 4 | 15449131614593 | J***c | cj…@luxestyle.ch | «Kleiner, netter Hub. Macht, was er soll.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385398566 | 2026-10-18T05:34 | 4 | 15495082049921 | T***g | cj…@luxestyle.ch | «Häng es an die Hüfte und fixier dein Oberteil mit einer Klam» | veröffentlicht | Importer-Muster nach Stopp |
| 1385398098 | 2026-10-18T05:32 | 4 | 15496361345409 | 4***r | cj…@luxestyle.ch | «Ware schnell da, danke Verkäufer! Verpackung intakt.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385397108 | 2026-10-18T05:28 | 4 | 15523086434689 | L***c | cj…@luxestyle.ch | «Gut für den Preis.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385393580 | 2026-10-18T05:17 | 4 | 16612780474759 | B***r | cj…@luxestyle.ch | «Gute Verarbeitung, aber die Akkulaufzeit ist nicht toll, wen» | veröffentlicht | Importer-Muster nach Stopp |
| 1385393168 | 2026-10-18T05:16 | 4 | 16612780867975 | M***a | cj…@luxestyle.ch | «Sieht sehr schön aus.» | veröffentlicht | Importer-Muster nach Stopp |
| 1385392995 | 2026-10-18T05:16 | 4 | 16612786110855 | H***a | cj…@luxestyle.ch | «Die Qualität ist wie erwartet gut. Ich wollte eigentlich sch» | veröffentlicht | Importer-Muster nach Stopp |
| 1385392979 | 2026-10-18T05:16 | 4 | 16612786110855 | I***h | cj…@luxestyle.ch | «Das Armband ist viel zu lang für schmale Handgelenke. Aber d» | veröffentlicht | Importer-Muster nach Stopp |
… und 861 weitere (Deckel 40)

## Namen unmaskiert — veroeffentlicht (5)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1385410025 | 2026-10-18T06:04 | 4 | 16612790763911 | المتسوق في AliExpress | cj…@luxestyle.ch | «Ich muss zugeben, ich hätte nicht erwartet, dass das Produkt» | veröffentlicht | Name unmaskiert «المتسوق في AliExpress» |
| 1385391532 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Alles war perfekt. Ich kann den Verkäufer wirklich empfehlen» | veröffentlicht | Name unmaskiert «Anónimo» |
| 1385391512 | 2026-10-18T05:14 | 5 | 16612790731143 | Anónimo | cj…@luxestyle.ch | «Artikel wie beschrieben! Ist gut!» | veröffentlicht | Name unmaskiert «Anónimo» |
| 1383697361 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service! Danke!» | veröffentlicht | Name unmaskiert «TechHome26» |
| 1383697347 | 2026-10-17T02:37 | 5 | 15448847319425 | TechHome26 | cj…@luxestyle.ch | «Super Service und schneller Versand!» | veröffentlicht | Name unmaskiert «TechHome26» |

## Bereits ausgeblendet / unveroeffentlicht mit Befund (46)

| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |
|---|---|---|---|---|---|---|---|---|
| 1203420600 | 2026-06-01T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «I didn't like it, I ordered an XS and the dress arrived too » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203437999 | 2026-05-20T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «The item doesn’t look as on the photo at all. it is quite cl» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203730112 | 2026-04-27T00:00 | 1 | 15413025145217 | Anonymous | su…@judge.me | «After 4 weeks, finally a clarification. No goods, but money » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203440042 | 2026-04-03T00:00 | 1 | 15413083832705 | Anonymous | su…@judge.me | «Never received item says they’re reshipping but tracking say» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420598 | 2026-04-03T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Not xs way to big» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420591 | 2026-04-03T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Wrong color and wrong size» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203730105 | 2026-03-30T00:00 | 1 | 15413025145217 | Anonymous | su…@judge.me | «My order does not match the description, very disappointed w» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420588 | 2026-03-22T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Horrible and came with stains on it» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420540 | 2026-01-11T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «This dress is huge, i got an xs and it fit my mom who’s an x» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420605 | 2026-01-11T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Sommerkleid ärmellos · Damen, tailliert & elegant (Schwarz)» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203438001 | 2026-01-05T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «The colour faded when i put it in the water for the first ti» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203438002 | 2025-12-07T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «I never received the item because of the delivery company.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469315 | 2025-11-26T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469316 | 2025-11-26T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469311 | 2025-11-26T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469317 | 2025-11-26T00:00 | 1 | 15413651046785 | Anonymous | su…@judge.me | «First, they never sent the item i ordered i ordered a brown » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420699 | 2025-11-11T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «I bought size S. I am 1.67cm tall, weigh 61kg, bust 94cm, wa» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420718 | 2025-08-28T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Nothing, this dress is for sleeping, not for going out.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420594 | 2025-08-03T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «I am sending dress back not size xs very disapointed i recei» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420596 | 2025-07-09T00:00 | 1 | 15413739684225 | Anonymous | su…@judge.me | «Thin see-through material, just a long tank top not a dress,» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203437029 | 2026-05-20T00:00 | 2 | 15413724676481 | Anonymous | su…@judge.me | «Nylon dress» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420572 | 2026-04-24T00:00 | 2 | 15413739684225 | Anonymous | su…@judge.me | «I really liked the M and XS, they run large.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420697 | 2026-04-20T00:00 | 2 | 15413739684225 | Anonymous | su…@judge.me | «SORRY, BUT THIS ISN'T A DRESS 👗? IT'S A HOT AND HUGE NIGHTGO» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469694 | 2025-08-26T00:00 | 2 | 15413083242881 | Anonymous | su…@judge.me | «The embroidery is not bad, it has been bad for me with embro» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203437031 | 2026-05-27T00:00 | 3 | 15413724676481 | Anonymous | su…@judge.me | «For that quality the price is too high. its is 100% plastic» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203478587 | 2026-05-22T00:00 | 3 | 15413724676481 | Anonymous | su…@judge.me | «Everything is fine, but the dress is not as beautiful in per» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469691 | 2026-05-14T00:00 | 3 | 15413083242881 | Anonymous | su…@judge.me | «There are some loose threads, but that doesn't matter much c» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1237361369 | 2026-03-29T00:00 | 3 | 15422970134913 | Anonymous | su…@judge.me | «I was expecting more purple-violet color; I use these stones» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420528 | 2026-01-09T00:00 | 3 | 15413739684225 | Anonymous | su…@judge.me | «3 xl is closer to size 8 us» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203438000 | 2025-09-26T00:00 | 3 | 15413651046785 | Anonymous | su…@judge.me | «Average product quality» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203478585 | 2026-05-17T00:00 | 4 | 15413724676481 | Anonymous | su…@judge.me | «For price this is good quality, nice colour and lovely summe» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203462974 | 2026-05-02T00:00 | 4 | 15413724676481 | Anonymous | su…@judge.me | «M - for size 42-44. For height 150-152, you need XL.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420623 | 2026-02-21T00:00 | 4 | 15413739684225 | Anonymous | su…@judge.me | «Bright, transparent, 100% synthetic, but pleasant to the tou» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1199672149 | 2026-02-19T00:00 | 4 | 15403009704321 | Anonymous | su…@judge.me | «The package arrived within 2 weeks and matches the descripti» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1199671739 | 2026-02-02T00:00 | 4 | 15408457843073 | Anonymous | su…@judge.me | «Good device, unfortunately one arrived broken.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469681 | 2026-01-22T00:00 | 4 | 15413083242881 | Anonymous | su…@judge.me | «The set is very cute. It looks of excellent quality. The onl» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203420625 | 2026-01-19T00:00 | 4 | 15413739684225 | Anonymous | su…@judge.me | «I saw this in the reviews. I took size S for my M-L (height » | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469688 | 2025-11-17T00:00 | 4 | 15413083242881 | Anonymous | su…@judge.me | «I wear M and bought G, the best thing I did. It fit more snu» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203469689 | 2025-10-27T00:00 | 4 | 15413083242881 | Anonymous | su…@judge.me | «Better than I expected, the size fits me perfectly.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203440055 | 2025-10-12T00:00 | 4 | 15413083832705 | Anonymous | su…@judge.me | «In general, everything is fine. Practically as in the photo.» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203815777 | 2025-09-22T00:00 | 4 | 15412915339649 | Anonymous | su…@judge.me | «The dress is as described, I usually wear size S/M. I took t» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1203440054 | 2025-08-30T00:00 | 4 | 15413083832705 | Anonymous | su…@judge.me | «Cool» | ausgeblendet (curated spam) | Quelle AliExpress (übernommene Fremdbewertung) |
| 1385398917 | 2026-10-18T05:35 | 5 | 15481799934337 | google9711777042365908 | cj…@luxestyle.ch | «Super und perfekt!» | ausgeblendet (curated spam) | Name unmaskiert «google9711777042365908» |
| 1385385229 | 2026-10-18T04:50 | 5 | 15479468294529 | Zaracail | cj…@luxestyle.ch | «Der Akku ist okay, hält 3 halbe Tage. Ansonsten ist für den » | ausgeblendet (curated spam) | Name unmaskiert «Zaracail» |
| 1383701253 | 2026-10-17T02:45 | 5 | 15479625908609 | Anónimo | cj…@luxestyle.ch | «Echt gut!» | ausgeblendet (curated spam) | Name unmaskiert «Anónimo» |
| 1335720164 | 2026-09-14T20:06 | 5 | 0 | Test | te…@example.invalid | «Probelauf» | ausgeblendet (curated spam) | ohne Produkt (Shop-Bewertung); body = Testwort «Probelauf»; Name = Testwort «Test»; Testdomain example.invalid |

## Freigegeben durch Menschen (0)

_keine_
