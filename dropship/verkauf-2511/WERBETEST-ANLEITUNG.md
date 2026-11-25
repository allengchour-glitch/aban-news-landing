# Werbetest Google Shopping «shopping-test-dez26» — Anleitung für den Betreiber

**Ziel:** den echten Klickpreis und die Kosten je Verkauf messen, bevor mehr Geld fliesst.

- **Budget:** CHF 10 pro Tag, 14 Tage, höchstens CHF 140 gesamt. Kein Nachladen ohne neuen Entscheid.
- **Kampagne:** Standard-Shopping (nicht Performance Max), manueller CPC CHF 0.40 (nach 3 Tagen unter CHF 4/Tag ausgegeben → 0.50, nie über 0.55), nur Schweiz, ohne Suchnetzwerk-Partner/Display.
- **Produkte:** 51 Produkte mit hohem Stückgewinn (Median CHF 27), Label 0 = «test-dez26» (setzt die Sitzung nach deinem OK; Ersatzweg: Artikel-IDs).
- **Abbruchregel:** Stopp, wenn nach CHF 50 Ausgaben kein einziger Warenkorb kam, ODER wenn nach CHF 100 die Kosten je Verkauf über dem Stückgewinn liegen.
- **Erfolg:** Kosten je Verkauf ≤ Stückgewinn des verkauften Produkts. Dann (und nur dann) Budget erhöhen.
- **Messung:** täglich durch die Sitzung (ShopifyQL utm_source=google & utm_medium=cpc, Warenkörbe, Käufe; Google-Ads-Kosten liest du ab).

**Vorher prüfen (Betreiber):** Merchant Center → Produkte → Filter Label 0 = test-dez26 → wie viele «Over capacity for Shopping ads»? Bei > 20 % zuerst das Kontingent-Problem lösen (siehe unten).

---

## A. Testprodukte «shopping-test-dez26» (51 Produkte, 166 Varianten; live gelesen am 25.11. ~22:00 UTC)

Alle 51 sind ACTIVE, im Kanal «Google & YouTube» und im Onlineshop publiziert, alle Varianten kaufbar. Jedes hat ≥ 3 Bilder ≥ 800 px, ein Hauptbild ≥ 800 px, keinen Sperr- oder Risiko-Tag, keine Google-Sperre für CH, keine «Over capacity»-Meldung in der App-Rückmeldung (schwacher Beleg, siehe Befund 1) und keinen Streichpreis (compareAt 0 von 2'571). 6 Produkte tragen nur «Missing shipping info [LI]»; für eine Kampagne Schweiz spielt das keine Rolle.

\* «netto» = Preis × 0.956 − 0.30 − unitCost (Zahlgebühr 2.9 % + 0.30 und Währung 1.5 % wie in preis_verlustschutz.py). Der Versanderlös von CHF 7 bei Körben unter CHF 50 ist nicht eingerechnet. «BW» = Stückgewinn während der Black Week (−15 % ab CHF 80, bis 30.11.). ⚠️ Die Einkaufspreise von 46 der 51 werden vor dem Start neu gerechnet (Vorarbeit V1).

| # | Gruppe | Handle | Produkt-ID | Preis CHF | Stückgewinn CHF (Preis − unitCost) | netto* | Var. | Bilder ≥800 | Grund |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Uhren | smartwatch-fur-damen-mit-bluetooth-telefonie-645200 | 15479417635201 | 59.90 | 26.28 | 23.34 | 2 | 7 | verkauft #1040 |
| 2 | Uhren | armbanduhr-rettangolo-rechteckig-unisex | 15412945289601 | 39.90 | 30.17 | 28.11 | 6 | 9 | 9 Besuche 90 T |
| 3 | Uhren | herrenuhr-set-magnate-quarz-armband | 15412945355137 | 44.90 | 32.44 | 30.16 | 4 | 9 | Geschenkset, 4 Besuche |
| 4 | Uhren | herrenuhr-executive-business-quarz | 15412945191297 | 39.90 | 30.19 | 28.13 | 6 | 8 | 3 Besuche |
| 5 | Uhren | elegante-keramik-damenuhr-mit-quarzwerk-622800 | 15495049085313 | 50.90 | 27.84 | 25.30 | 2 | 6 | 1 Google-Besuch |
| 6 | Uhren | herrenholzarmbanduhr-631400 | 15455791907201 | 56.90 | 36.53 | 33.73 | 4 | 10 | Okt.-Testauswahl |
| 7 | Uhren | trendige-damenuhr-mit-strass-zifferblatt-616000 | 15495239106945 | 48.90 | 17.48 | 15.03 | 2 | 5 | Okt.-Testauswahl |
| 8 | Uhren | quadratische-damenuhr-mit-18k-vergoldung-225856 | 15497460810113 | 46.90 | 16.53 | 14.17 | 2 | 5 | Okt.-Testauswahl |
| 9 | Uhren | retro-damenuhr-mit-quarzwerk-602500 | 15493830443393 | 44.90 | 16.02 | 13.74 | 4 | 9 | Okt.-Testauswahl |
| 10 | Uhren | mechanische-uhr-mit-kalenderfunktion-609100 | 15454303486337 | 62.90 | 39.84 | 36.77 | 1 | 5 | Geschenk |
| 11 | Schmuck | wassertropfen-halskette-627900 | 15455080644993 | 43.90 | 30.64 | 28.41 | 2 | 7 | Schmuck verkauft (2× / 90 T) |
| 12 | Schmuck | geometrisches-schmuckset-mit-kubischen-zirkoni-098113 | 15453622993281 | 43.90 | 30.99 | 28.76 | 2 | 6 | Geschenkset |
| 13 | Schmuck | edelstahl-armband-amore-herz-geburtsstein-gold | 15431536673153 | 39.90–69.90 | 30.31 | 28.25 | 24 | 7 | Geschenk |
| 14 | Schmuck | eisblauer-zirkonia-armband-415425 | 15452688417153 | 39.90 | 28.71 | 26.65 | 5 | 5 | Geschenk |
| 15 | Schmuck | luxuriose-perlen-halskette-865922 | 15449595183489 | 59.90 | 37.99 | 35.05 | 2 | 3 | Geschenk |
| 16 | Haustier | brustgeschirr-mit-leine-fur-katzen-und-kleine-846976 | 15525477187969 | 34.90–35.90 | 17.78 | 15.94 | 6 | 7 | verkauft #1034 |
| 17 | Haustier | faltbares-katzenbett-mit-plusch-600400 | 15516521234817 | 74.90 | 34.59 | 30.99 | 6 | 9 | Winter, Katze |
| 18 | Haustier | kuscheliges-winterbett-fur-katzen-635600 | 15448937595265 | 39.90–42.90 | 19.02 | 16.96 | 6 | 8 | Winter |
| 19 | Haustier | weihnachtlicher-katzen-tunnel-607000 | 15455516688769 | 54.90–60.90 | 25.18 | 22.46 | 2 | 5 | Weihnachten |
| 20 | Haustier | automatisches-katzenspielzeug-mit-ballspender-623488 | 15521229603201 | 49.90 | 23.73 | 21.23 | 2 | 6 | 1 Besuch |
| 21 | Haustier | doppelnapf-aus-massivholz-fur-katzen-6cb5f1 | 15523921035649 | 74.90 | 33.64 | 30.04 | 1 | 4 | Katze |
| 22 | Haustier | elektronisches-hunde-spielzeug-a94fbe | 15450833551745 | 69.90 | 33.02 | 29.64 | 2 | 5 | Hund |
| 23 | Haustier | gps-tracker-fur-katzen-und-hunde-637800 | 15477132067201 | 64.90 | 38.98 | 35.82 | 1 | 4 | Geschenk |
| 24 | Haustier | sisal-kratzsaule-fur-katzen-629500 | 15453791125889 | 79.90 | 37.11 | 33.29 | 1 | 4 | Katze |
| 25 | Gadgets | magnetische-3-in-1-ladestation-613200 | 15499700142465 | 75.90 | 27.17 | 23.53 | 1 | 6 | verkauft #1023, Hype |
| 26 | Gadgets | 3-in-1-magnetische-falt-ladestation-015296 | 15449430851969 | 34.90 | 21.35 | 19.51 | 1 | 6 | Okt.-Testauswahl |
| 27 | Gadgets | bluetooth-ubersetzungs-kopfhorer-625536 | 15480824037761 | 38.90 | 28.02 | 26.01 | 1 | 10 | Okt.-Testauswahl |
| 28 | Gadgets | kabellose-kopfhorer-echobuds-bluetooth-tws-618500 | 15443496239489 | 69.90 | 38.66 | 35.28 | 4 | 8 | Geschenk |
| 29 | Gadgets | monitor-lichtleiste-mit-bewegungssensor-blendfreies-schreibtischlicht-usb | 15412408615297 | 44.90 | 21.49 | 19.21 | 1 | 6 | 4 Besuche |
| 30 | Gadgets | 5-in-1-magnetisches-wireless-ladegerat-mit-nac-274304 | 15450829357441 | 35.90 | 18.74 | 16.86 | 2 | 5 | Ladegerät |
| 31 | Gadgets | beruhrungsempfindliches-lcd-thermostat-602700 | 15454035378561 | 43.90 | 25.39 | 23.16 | 2 | 5 | Winter/Heizung |
| 32 | Gadgets | thermokamera-626600 | 15481680494977 | 110.90 | 62.25 (BW 45.62) | 57.07 | 1 | 6 | Winter/Heizung |
| 33 | Gadgets | fitness-tracker-stepgo-herzfrequenz-schritte-637200 | 15443502072193 | 65.90 | 36.00 | 32.80 | 5 | 10 | Geschenk |
| 34 | Wohnen | kristallspitzen-set-8-teilig-holzbox | 15408458006913 | 29.90 | 16.85 | 15.23 | 1 | 5 | verkauft #1020 |
| 35 | Wohnen | magnetischer-thermovorhang-fur-turen-745025 | 15449120670081 | 57.90 | 20.34 | 17.49 | 1 | 7 | Winter |
| 36 | Wohnen | doppelseitiger-seidenkissenbezug-19-momme-621400 | 15493855478145 | 36.90 | 21.00 | 19.08 | 1 | 10 | Geschenk |
| 37 | Wohnen | usb-table-lampe-retro-in-creme-tonen-612200 | 16603433468295 | 41.90 | 17.53 | 15.39 | 5 | 10 | Licht/Winter |
| 38 | Wohnen | gewichtete-schlafmaske-mit-ohrstopseln-602800 | 15484425535873 | 39.90 | 24.83 | 22.77 | 3 | 5 | Geschenk |
| 39 | Wohnen | thermosbecher-mit-keramik-innenseite-600-ml-626700 | 15466073588097 | 62.90–67.90 | 23.61 | 20.54 | 4 | 7 | Winter |
| 40 | Wohnen | franzosische-bulldogge-tasse-541824 | 15496528331137 | 51.90 | 21.56 | 18.98 | 4 | 8 | 8 Besuche |
| 41 | Wohnen | tee-tablett-aus-walnussholz-923072 | 15497436463489 | 55.90 | 27.42 | 24.66 | 1 | 6 | Geschenk |
| 42 | Mode | gepolsterter-wintermantel-fur-damen-614200 | 15448674435457 | 99.90 | 35.08 (BW 20.10) | 30.38 | 3 | 4 | Winter (Jacke verkauft #1044) |
| 43 | Mode | vielseitiger-farbblock-rollkragenpullover-aus-623700 | 15449055232385 | 43.90 | 20.15 | 17.92 | 4 | 6 | Winter |
| 44 | Mode | lace-kragen-pullover-629100 | 15458991964545 | 66.90 | 38.88 | 35.64 | 2 | 7 | Winter |
| 45 | Mode | elegantes-strickkleid-mit-spitze-638600 | 15503089598849 | 62.90 | 23.45 | 20.38 | 3 | 5 | Winter |
| 46 | Mode | cropped-blazer-damen-mit-pailletten-detail | 15413725102465 | 44.90 | 29.11 | 26.83 | 4 | 7 | Festtage, 5 Besuche |
| 47 | Mode | slip-kleid-nuit-v-ausschnitt-langarm-elegant | 15413024915841 | 39.90 | 26.72 | 24.66 | 4 | 6 | Festtage, 8 Besuche |
| 48 | Accessoires | herren-geldborse-aus-hochwertigem-leder-617500 | 15449444057473 | 75.90 | 38.01 | 34.37 | 2 | 9 | Okt.-Testauswahl |
| 49 | Accessoires | retro-leder-geldborse-616300 | 15449588400513 | 43.90 | 28.80 | 26.57 | 3 | 7 | Geschenk |
| 50 | Accessoires | pluschige-tierpfoten-handschuhe-629500 | 15447920673153 | 37.90 | 15.93 | 13.96 | 4 | 10 | Winter |
| 51 | Accessoires | schultertasche-milano-pu-leder-grosse-kapazitat | 15412976681345 | 34.90 | 18.17 | 16.33 | 4 | 9 | 3 Besuche |

Verteilung: Uhren 10 · Haustier 9 · Gadgets 9 · Wohnen 8 · Mode 6 · Schmuck 5 · Accessoires 4.

Bewusst draussen:
- Kostüme, Powerbanks/Akkus, Messer und Klingen.
- Gesundheitsgeräte (Gesundheitsring, Infrarot, EMS, Beckenboden, Wärme-Handschuhe) und Katzen-Trinkbrunnen (Heilversprechen «Harnwege»).
- Kameras und Überwachung (Smart-Brille, Bodycam), Kinder-Smartwatches.
- Fremdmarken im Titel (LEMFO, BOBO BIRD, MagSafe, CarPlay, Leica), Sommerware (Leinen-Set Provence, Sandalen).
- Kuscheldecke Tie-Dye: unter CHF 15 Stückgewinn während der Black Week.
- «Selbst gestalten»-Produkte (Editor).

Ersatzweg Artikel-IDs (166 Zeilen, Format shopify_zz_<Produkt-ID>_<Varianten-ID>): /tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/artikel_ids_test-dez26.txt. Alle Live-Daten der Auswahl: /tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/final.json. Die 2'571 Reserve-Kandidaten: /tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/scored.json. Der Scratchpad kann gelöscht werden; nötig ist allein final.json.

## B. Testplan

| | |
|---|---|
| Kampagnentyp | Standard-Shopping (bestehende pausierte «Sales-Shopping-1», ID 24340093418, Konto 719-826-3241, umbenannt auf shopping-test-dez26) – NICHT Performance Max (Begründung Befund 6) |
| Budget | CHF 10/Tag × 14 Tage = höchstens CHF 140; kein Nachladen ohne neuen Betreiber-Entscheid |
| Gebot | Manueller CPC CHF 0.40 auf der Label-Gruppe. Nach 3 Tagen unter CHF 4/Tag ausgegeben → 0.50. Nie über 0.55 (Gewinnschwelle bei 2 % Kaufquote) |
| Ausrichtung | Schweiz, «Präsenz» (Personen in der Schweiz); Suchnetzwerk-Partner AUS; YouTube/Gmail/Discover AUS; alle Geräte; ganztags |
| Produkte | Produktgruppe «Benutzerdefiniertes Label 0 = test-dez26» eingeschlossen, «Alles andere» ausgeschlossen; zusätzlich Inventarfilter Label 0 = test-dez26. Ersatzweg 166 Artikel-IDs |
| Messung | URL-Suffix utm_source=google&utm_medium=cpc&utm_campaign=shopping-test-dez26 (Automatische Tag-Kennzeichnung gclid bleibt an) |
| Start | So früh wie möglich, Ziel Sa 28.11.; Ende Fr 11.12. (Lieferzeit vs. Weihnachten, Befund 8) |
| Erfolgsmass | Werbekosten ÷ Käufe ≤ Ø Stückgewinn der gekauften Testartikel (Summe Stückgewinn der Test-Bestellungen nach Rabatt ≥ Werbekosten), bei mindestens 3 Käufen. 1–2 Käufe und positiv = «Hinweis», dann gleiches Budget 14 T verlängern (Betreiber) |
| Abbruch | (1) CHF 50 ausgegeben und 0 Warenkörbe aus utm_campaign → Stopp. (2) CHF 100 ausgegeben und Kosten je Verkauf > Ø Stückgewinn der gekauften Artikel (0 Käufe = Stopp). (3) Mehr als 20 % der Test-Sitzungen landen auf Seiten ausserhalb der 51 → sofort pausieren, Produktgruppe korrigieren. (4) Ø CPC an 3 Tagen über CHF 0.55 → pausieren. (5) Ein Testprodukt nicht mehr lieferbar oder gedraftet → in Ads ausschliessen |
| Erwartung (SCHÄTZUNG) | Ø CPC 0.30–0.50 → 280–470 Klicks → 1.4–9 Käufe → Kosten je Verkauf CHF 15–100. Lohnt erst ab ~1.5 % Kaufquote bei 0.40 |

Täglich misst die Sitzung (nur lesen):
1. Den Trichter je Tag: `BUDGET=<Ads-Kosten bisher> MARGE=27 python3 tools/werbetest_trichter.py shopping-test-dez26 14` (Sitzungen, Warenkorb, Kasse, Kauf; Ampel-Zeile «WERBETEST» aus dropship/_werbetest_aktiv.json).
2. Die Landeseiten, damit fremde Ware auffällt: ShopifyQL `FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout GROUP BY landing_page_path WHERE utm_campaign = 'shopping-test-dez26' SINCE -14d UNTIL today ORDER BY sessions DESC LIMIT 60`.
3. Den Gesamtblick: `FROM sessions SHOW … GROUP BY utm_campaign, utm_source WHERE utm_medium = 'cpc' SINCE -14d UNTIL today`.
4. Die Test-Bestellungen: GraphQL orders(query:"created_at:>=<Start>") mit customerJourneySummary first/lastVisit.utmParameters.campaign = shopping-test-dez26. Je Bestellung Stückgewinn = Positionspreis nach Rabatt − unitCost; Deckungsbeitrag = Σ Stückgewinn − Werbekosten.
5. product.feedback der 51 Produkte: Zahl der «Over capacity»-Meldungen und neue Sperren.
6. Den Betreiber-Screenshot aus Google Ads (alle 1–2 Tage): Kosten, Klicks, Impressionen, Ø CPC, CTR, Conversions, Anteil an möglichen Impressionen, verlorener Anteil (Rang), Benchmark-Max.-CPC.

Kennzahlen dazu: echter Klickpreis = Kosten ÷ Klicks (Ads); Marktpreis = Benchmark-Max.-CPC plus der Impressionsanteil, der durch den Rang verloren geht; Klick-zu-Sitzung-Verlust = Shopify-Sitzungen ÷ Ads-Klicks; Korb-Quote; Kaufquote; Kosten je Verkauf.

## C. Vorarbeit der Sitzung im Shop (vor dem Start, Do 26./Fr 27.11.)

1. V1 Einkaufspreise neu rechnen für die 51 Produkte: `NEU=1 NUR_IDS=<51 IDs> /opt/node22/bin/node automation/cj_kosten_backfill.mjs`, danach `SCHARF=1 NUR_IDS=… python3 automation/preis_verlustschutz.py` (hebt nur an). Was unter CHF 15 Stückgewinn fällt, ersetzen aus scored.json (gleiche Regeln).
2. V2 Lieferbarkeit CH prüfen: CJ-Lager und Fracht CH je Variante. Fracht «ok» beweist keine Kategorie (Klingen-Lehre); Geräte mit eingebautem Akku (Ladestationen, Kopfhörer, Tracker, Thermokamera) sind über #1023/#1040 schon nach CH versandt worden (FULFILLED, Zustellung nicht bestätigt).
3. V3 Label setzen: mm-google-shopping.custom_label_0 = «test-dez26» auf Variantenebene (166) und auf Produktebene (51). Zuerst an EINEM Produkt, rücklesen, warten, bis «test-dez26» in Google Ads → Produktgruppen → Label 0 erscheint (Betreiber-Screenshot), dann die übrigen 50. Optional das alte Aurora-Label «werbetest» löschen.
4. V4 Schreibsperre: die 51 Handles in dropship/_werbetest_sperre.txt, Ende = Start + 16 T.
5. V5 dropship/_werbetest_aktiv.json neu: kampagne shopping-test-dez26, start, ende, budget_tag 10, marge 27, gebot_max 0.40, handles (51), url_suffix, abbruch (Regeln oben); den alten Inhalt unter «vorher».
6. V6 Nach 24 h die Google-Rückmeldung der 51 lesen. Den Betreiber um den Merchant-Center-Blick bitten (Over capacity?) und über Kontingent-Antrag oder Regel entscheiden (Befund 1).
7. V7 Den Screenshot der fertigen Kampagne prüfen, BEVOR sie aktiviert wird. Prüfpunkte: Label-Gruppe 0.40 eingeschlossen, «Alles andere» ausgeschlossen, Budget 10, Suffix, Netzwerke aus, nur Schweiz.

## D. Klickweg in Google Ads (Betreiber, am Handy ≈ 20 Min.)

Am Handy ads.google.com öffnen, ganz unten «Desktop-Version» wählen (die App kann keine Produktgruppen unterteilen). Konto 719-826-3241.

**Teil 0 – kurz prüfen (einmal)**
1. Shopify-Admin → Vertriebskanäle → «Google & YouTube» → Einstellungen → Abschnitt Google-Ads-Konto: Steht dort 719-826-3241? Wenn nicht: «Verbinden» → 719-826-3241. Screenshot.
2. Google Ads → links «Ziele» → «Conversions» → «Zusammenfassung»: Gibt es eine Aktion «Kauf»/«Purchase» aus Shopify bzw. Google & YouTube mit Status «Aktiv» und «Primär»? Screenshot.
3. Wenn die Sitzung meldet «Label gesetzt»: merchants.google.com → Produkte → Filter «Benutzerdefiniertes Label 0» = test-dez26 → Spalte «Shopping-Anzeigen»: Wie viele sind «Eingeschränkt/Nicht berechtigt (Over capacity)»? Screenshot.

**Teil 1 – Kampagne umbauen (pausiert lassen)**
4. Links «Kampagnen» → «Sales-Shopping-1» → «Einstellungen»:
   - Kampagnenname: shopping-test-dez26
   - Gebote: «Manueller CPC» (wird «auto-optimierter CPC» angeboten: Haken weg)
   - Budget: 10.00 CHF pro Tag
   - Netzwerke: «Google Suchnetzwerk-Partner» Haken weg; «YouTube, Gmail und Discover» Haken weg
   - Standorte: Schweiz; «Standortoptionen» → «Präsenz: Nutzer, die sich an Ihren Zielorten befinden oder sich dort regelmässig aufhalten»
   - Start- und Enddatum: Ende = Starttag + 13 Tage
   - «Produkte filtern» bzw. «Inventarfilter»: Benutzerdefiniertes Label 0 = test-dez26
   - «Kampagnen-URL-Optionen» → «Suffix der finalen URL»: `utm_source=google&utm_medium=cpc&utm_campaign=shopping-test-dez26`
   - Speichern.
5. Anzeigengruppe öffnen → «Produktgruppen» → bei «Alle Produkte» das Stiftsymbol → alte Unterteilung (Artikel-IDs vom 13.10. oder Label «werbetest») entfernen → Speichern.
6. Neben «Alle Produkte» auf «+» → unterteilen nach «Benutzerdefiniertes Label 0» → «test-dez26» anhaken (sollte 51 Produkte zeigen) → «Fortfahren und Gebote überprüfen» → Max. CPC 0.40 → Speichern.
   Erscheint «test-dez26» nicht: stattdessen nach «Artikel-ID» unterteilen → «Werte manuell im Bulk-Verfahren hinzufügen» → die 166 IDs der Sitzung einfügen; wird eine ID nicht gefunden, die Produkt-ID (Zahl in der Mitte) suchen.
7. Zeile «Alles andere in ‹Alle Produkte›» → in der Spalte «Max. CPC» auf den Wert tippen → «Ausgeschlossen» → Speichern. Diese Zeile lässt sich nicht löschen, nur ausschliessen; im Oktober lief genau sie mit.
8. Links «Keywords» → «Auszuschliessende Keywords» → «+» → Kampagne shopping-test-dez26 → je Zeile einfügen: gratis, kostenlos, gebraucht, occasion, ricardo, tutti, anleitung, reparatur, ersatzteil, rolex, omega, tissot, swatch, longines, apple, samsung, garmin, fitbit, pandora, swarovski, thomas sabo, fossil, michael kors. NICHT «fressnapf» eintragen (bei uns ein Produktwort).
9. Screenshot von Einstellungen und Produktgruppen an die Sitzung. Richtig ist: 1 Zeile «test-dez26» mit 0.40 eingeschlossen, «Alles andere» ausgeschlossen, Budget 10, Suffix wie oben, Netzwerke aus.
10. Erst nach dem OK der Sitzung: Kampagne → Status «Aktiviert». Der Sitzung «aktiviert» schreiben (sie trägt das Datum ein).

**Teil 2 – während des Tests (alle 1–2 Tage, 2 Min.)**
11. Kampagne öffnen → Zeitraum «Gesamte Laufzeit» → Screenshot mit Kosten, Klicks, Impr., Ø CPC, CTR, Conversions. Über «Spalten» → «Wettbewerbsmesswerte» zusätzlich «Anteil an möglichen Impressionen» und «Verlorener Anteil (Rang)»; im Tab «Produktgruppen» die Spalte «Benchmark-Max.-CPC».
12. Hat die Sitzung nach 3 Tagen «unter CHF 4/Tag» gemeldet: Max. CPC der Gruppe auf 0.50 (nie höher).
13. Meldet die Sitzung «STOPP»: Kampagne → Status «Pausiert».

**Nur falls Teil 0 Punkt 3 mehr als 20 % «Over capacity» zeigt:** In der Merchant-Center-Hilfe das Formular «Request for additional quota of items, data sources or sub-accounts» ausfüllen (Bereich Shopping-Anzeigen CSS / Schweiz). Danach mit der Sitzung über die Regel «Ausgeschlossene Ziele = Shopping-Anzeigen für alles ausser Label test-dez26» entscheiden; Ziel genau «Shopping-Anzeigen», NIE «Kostenlose Einträge».

## E. Recherche-Quellen
- Maik Möhring, «Shopping Ads Schweiz» (01.06.2026): https://maik-moehring.ch/shopping-ads-schweiz/
- digital M., «Google Ads Kosten Schweiz 2026» (03/2026): https://digitalm.ch/blog/google-ads-kosten-schweiz/
- Glopal, Google Shopping Switzerland: https://merchants.glopal.com/en-gb/google-shopping/switzerland
- Channable-Benchmark EU 2025/26 (über PPC Land): https://ppc.land/channable-data-shows-advertisers-lose-46-roas-as-google-clicks-cost-more/
- Foundry CRO, Shopping-Benchmarks nach Kategorie 2026: https://foundrycro.com/blog/google-shopping-benchmarks-by-category-2026/
- WordStream-Shopping-Benchmarks (US 2018/19): https://www.searchenginejournal.com/google-shopping-ads-industry-benchmarks-wordstream-spcs/302375/
- Google, Kontingente im Merchant Center (150'000 je Bereich, Erhöhungs-Formular): https://support.google.com/merchants/answer/16564100
- PMax nicht mehr automatisch vor Standard-Shopping (Okt. 2024): https://www.seroundtable.com/google-ads-pmax-priority-standard-shopping-38265.html · https://searchengineland.com/google-shakes-up-ad-auction-dynamics-for-holiday-shopping-447646
- Benutzerdefinierte Labels: https://support.google.com/google-ads/answer/6275295 · https://support.google.com/merchants/answer/6324473

## Befunde der Vorbereitung

- **Werbe-Kontingent im Merchant Center ist voll – das blockiert den Test, nicht das Produkt** — Der Betreiber prüft im Merchant Center, nachdem das Label gesetzt ist: Produkte → Filter «Benutzerdefiniertes Label 0 = test-dez26» → wie viele stehen bei Shopping-Anzeigen auf «Over capacity»? Sind es mehr als 20 %, (a) beantragt er über das Google-Formular «Request for additional quota of items» mehr Kontingent und (b) nach Entscheid eine Merchant-Center-Regel «Ausgeschlossene Ziele = Shopping-Anzeigen» für alles mit Label 0 ≠ test-dez26. Gratis-Einträge sind ein eigenes Ziel und nicht betroffen. Ob die Regel den Zähler entlastet, ist UNBELEGT: erst am Label prüfen, dann 24–48 h nachmessen.
- **Conversion-Messung ist eingebaut, die Konto-Zuordnung ist nicht geprüft** — Der Betreiber prüft in Shopify → Google & YouTube → Einstellungen, ob 719-826-3241 verbunden ist, und in Google Ads → Ziele → Conversions, ob «Kauf» aus Shopify aktiv und primär ist (je ein Screenshot). Massgeblich für die Testauswertung bleibt die Shopify-Messung (utm_campaign + customerJourneySummary); die Google-Conversions sind nur der Gegencheck.
- **Stückgewinne von 46 der 51 Testprodukte beruhen auf alten Einkaufspreisen** — Die Sitzung rechnet die 51 Produkte vor dem Start neu (cj_kosten_backfill.mjs NEU=1 NUR_IDS=…, danach preis_verlustschutz.py SCHARF=1 NUR_IDS=…, hebt nur an). Was danach unter CHF 15 Stückgewinn fällt, kommt aus der Liste; ersetzt wird aus den 2'571 geprüften Kandidaten (Scratchpad scored.json).
- **Testprodukte über Label 0 «test-dez26» kennzeichnen, mit Artikel-IDs als Ersatz** — Die Sitzung setzt custom_label_0 = «test-dez26» auf Variantenebene (166 Varianten, metafieldsSet zu je 25) und zusätzlich auf Produktebene (51), liest zurück und tut es zuerst an 1 Produkt: Erst wenn «test-dez26» in Google Ads unter Produktgruppen → Label 0 erscheint, folgen die übrigen 50. Erscheint es nach 24 h nicht, gilt der Ersatzweg: 166 Artikel-IDs (Scratchpad artikel_ids_test-dez26.txt).
- **Schreibsperre für die 51 Produkte während des Tests** — Die Sitzung schreibt die 51 Handles mit Enddatum (Start + 16 T) in dropship/_werbetest_sperre.txt (Helfer automation/werbetest_sperre.py / lib/werbetest_sperre.mjs) und ersetzt dropship/_werbetest_aktiv.json: kampagne shopping-test-dez26, budget_tag 10, marge 27, gebot_max 0.40, handles, url_suffix, Abbruchregeln; den alten Inhalt unter «vorher» behalten. Die Ampel-Wache meldet dann Schreibvorgänge und fremde Landeseiten. Ausnahmen bleiben: Lieferbarkeit und Preisschutz.
- **Kampagnentyp: Standard-Shopping mit manuellem CPC 0.40, nicht Performance Max** — Die bestehende pausierte Kampagne «Sales-Shopping-1» (24340093418) umbauen: Name shopping-test-dez26, manueller CPC 0.40 (nach 3 Tagen unter CHF 4/Tag ausgegeben → 0.50, nie über 0.55), CHF 10/Tag, Ende = Start + 13 T, Suchnetzwerk-Partner und YouTube/Gmail/Discover aus, nur Schweiz (Präsenz), Label-Produktgruppe, «Alles andere» ausgeschlossen, Suffix, auszuschliessende Keywords (Klickweg in «listen»).
- **Erfolg ist nur plausibel, wenn bezahlte Klicks so gut kaufen wie Google gratis** — Abbruch- und Erfolgsregel streng anwenden (siehe «listen»). Kein Nachladen über CHF 140 ohne neuen Betreiber-Entscheid. Ergebnis als Messung werten: Ø CPC, Korb-Quote, Kaufquote, Kosten je Verkauf.
- **Lieferzeit 10–20 Werktage trifft das Weihnachtsgeschäft** — So früh wie möglich starten (Vorarbeit Do/Fr, Start Sa 28.11.). Rutscht der Start über den 01.12., die weihnachtsspezifischen Produkte (Katzen-Tunnel «weihnachtlich») durch Ganzjahres-Ware ersetzen. Die ehrliche Lieferzeit bleibt angeschrieben.
- **Die heute verkaufte Ware ist billiger als die Testregel erlaubt** — Die Testliste nimmt diese 4 plus 47 ähnliche oder saisonale Produkte aus denselben Kategorien (Uhren, Schmuck, Katzen, Ladestationen, Wohnen, Winter-Damenmode). Das Ergebnis gilt für das Preisfeld CHF 30–110, nicht für die billige Ware, die heute über ChatGPT und Google gratis verkauft.
- **Ein Trinkbrunnen-Kandidat hatte ein Gesundheitsversprechen und ist raus** — Kein Eingriff im Test. Den Text des Trinkbrunnens später entschärfen (gehört zur Heilversprechen-Klasse im Aufseher).
- **Falle bei den auszuschliessenden Keywords: «Fressnapf» ist bei uns ein Produktwort** — Die Ausschlussliste ohne Händlernamen, die auch Wörter sind: kein «fressnapf», kein «ikea». Nur Marken, die wir nicht führen, plus gratis/gebraucht/Reparatur (Liste im Klickweg).
- **Alte Produktgruppen und Altlast-Label in der pausierten Kampagne** — Der Betreiber entfernt vor dem Neuaufbau die alte Unterteilung (Klickweg Schritt 5). Die Sitzung löscht optional das alte Aurora-Label, damit keine Gruppe «werbetest» mehr lebt.