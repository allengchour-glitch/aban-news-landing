# Woher kommen Besuche und Bestellungen? Korrektur und Messrezept (10.11.2026)

## Ergebnis in einem Satz
**ChatGPT-Links sind die grösste messbare Quelle von Bestellungen:** 6 von 11 Bestellungen seit dem 27.10. (CHF 395.56 von 559.52) hatten einen ChatGPT-Besuch. Meine Messung vom selben Morgen («ChatGPT 5 Sitzungen in 30 Tagen, kleiner Hebel», PR #3057) war falsch und ist hiermit korrigiert (die Stellen in `CLAUDE.md` und `dropship/google-bild-1011/README.md` sind markiert).

## Warum die erste Messung falsch war
Shopify ordnet Sitzungen, die über einen ChatGPT-Link kommen, bei `referrer_source` als «direct» ein (alle 272 gemessenen: `direct`, Name leer). Das Merkmal steht nur in der Adresse: `utm_source=chatgpt.com`. Wer nach `referrer_name` auswertet, sieht die wenigen mit echtem Verweis (5 in 30 Tagen) und lässt den Rest in den «direkten» Sitzungen verschwinden. Diese «direkten» (3 871 von 4 234 in 30 Tagen) hatte ich pauschal als Roboter abgetan; mindestens 272 davon sind Menschen mit Warenkorb und Kauf.

## Messung 10.11.2026 ca. 06:22 bis 06:30 UTC (ShopifyQL und Admin-GraphQL, nur lesend)
**Sitzungen mit `utm_source = chatgpt.com`, 14 Tage (27.10. bis 10.11., der letzte Tag unvollständig):**
- 272 Sitzungen; je Tag 8 bis 29 (Mittel rund 20). Schweiz 254, Deutschland 8, Liechtenstein 5, übrige 5.
- Gerät: Handy 235, Desktop 37. Warenkorb 22 (8 %), Kasse erreicht 10, Kauf 4 (1,5 %).
- Tageszeit (Zeitzone des Shops): Tief 1 bis 5 Uhr (1 bis 5 Sitzungen je Stunde), Höchstwerte 19 bis 22 Uhr (bis 29 je Stunde): der Tagesgang von Menschen. Die «Direkt-Welle» vom 04.11. war dagegen rund um die Uhr gleich verteilt und landet auf anderen Seiten (Boho-Set, Weinöffner, Damenbluse …): ein anderes Phänomen.
- Einstiegsseiten (Top 12 = 77 von 272, breit gestreut): Startseite 19; `/collections/halloween` 7; Halloween-Kostüm für zwei 7; LED-Wasserwellen-Lampe 6; `/collections/punk-gothic-schmuck` 6; Hoodie selbst gestalten 5; Magnet selbst gestalten 5; Rizinusöl-Wickel 10 (deutsch 5, `/fr/` 5); heizbare Kuscheldecke 4; `/collections/uhren-herren` 4; Geschenkbox mit Decke 4. ChatGPT verlinkt also auch Sammlungen und `/fr/`-Seiten (für Google `noindex`) und folgt der Saison (Halloween-Sammlung nur 27. und 29.10.).

**Bestellungen seit 27.10. nach Besuchsquelle** (Admin-GraphQL `customerJourneySummary`, ohne Kundendaten):

| Bestellung | Datum | CHF | erster Besuch | letzter Besuch |
|---|---|---|---|---|
| #1039 | 08.11. | 34.90 | **ChatGPT** (Produkt Gliederkette) | **ChatGPT** (gleiche Seite) |
| #1038 | 08.11. | 60.53 | Google (Suche) | direkt (Shop-Suche) |
| #1037 | 07.11. | 23.90 | keine Daten | keine Daten |
| #1036 | 05.11. | 47.61 | **ChatGPT** (Sammlung Kochutensilien-Sets) | direkt |
| #1035 | 05.11. | 23.90 | Google (Rizinusöl-Wickel) | Google |
| #1034 | 04.11. | 158.44 | direkt (Sammlung Tier-Pullover) | **ChatGPT** (Sammlung Tier-Pullover) |
| #1033 | 31.10. | 23.83 | Google (Sticker) | direkt (Startseite) |
| #1032 | 30.10. | 31.80 | Google (Startseite) | Google (Startseite) |
| #1031 | 27.10. | 43.90 | **ChatGPT** (Sammlung Halloween) | **ChatGPT** |
| #1030 | 27.10. | 28.90 | **ChatGPT** (Jeanskleid) | **ChatGPT** |
| #1029 | 27.10. | 81.81 | **ChatGPT** (heizbare Kuscheldecke) | **ChatGPT** |

- Erster oder letzter Besuch ChatGPT: **6 von 11** (#1029, #1030, #1031, #1034, #1036, #1039), CHF 395.56 von 559.52.
- Beide Besuche ChatGPT: 4 (#1029, #1030, #1031, #1039), CHF 189.51.
- Erster Besuch Google (Suche): 4 (#1032, #1033, #1035, #1038), CHF 140.06. Ohne Daten: #1037 (CHF 23.90).

## Grenzen
- Nur 11 Bestellungen in 14 Tagen: Tendenz, kein Beweis. Drei der sechs ChatGPT-Bestellungen kamen am 27.10. innerhalb von acht Stunden.
- Die Quelle ist Shopifys eigene Einordnung der Besuche (`customerJourneySummary`); bei #1037 fehlt sie.
- Warum ChatGPT diese Seiten nennt (Bing-Index, eigener Crawler, Shopify-Katalog), ist nicht gemessen. Laut Berichten Dritter nutzt die ChatGPT-Suche Bing und den Crawler OAI-SearchBot, das Mischungsverhältnis ist nicht belegt. `robots.txt` sperrt keinen KI-Crawler (gemessen 10.11. morgens: nur die Gruppen `*` und `adsbot-google`).
- Ob die Käufe ohne ChatGPT woanders stattgefunden hätten, ist offen.

## Instagram-Bio-Link (Wiedervorlage `trig_01JEwEW6syWPeZ81DDsRhnFj`, ausgelöst 10.11. 06:21:58 UTC)
Sitzungen mit `utm_medium = 'bio'` seit 09.11.: **0**. Kontrollabfrage (alle UTM-Quellen und -Medien, 14 Tage) liefert Daten (ohne UTM 2 889; chatgpt.com 272; Pinterest/organic 10; ig/social 1; google/product_sync 1; shop_campaigns/paid 1), die Abfrage trägt also. Auf `/collections/aus-tiktok-und-instagram` ist seit dem 03.11. keine Sitzung gelandet (0 Zeilen). Urteil: **Klickweg nicht messbar, kein Klick gesehen**, nicht «kaputt» (Reichweite rund 120 je Woche, Verzögerung der Auswertung einige Stunden). Wiederholung Mo 17.11.

## Kandidaten (nichts davon umgesetzt)
1. **Einstiegsseiten gesund halten:** Startseite und die Sammlungen und Produkte, die ChatGPT nennt. ChatGPT folgt der Saison: die Halloween-Sammlung bekam Besuche nur am 27. und 29.10. (7 Sitzungen, danach 0). In den letzten 5 Tagen (36 Sitzungen) führen Startseite 9, Rizinusöl-Wickel 4, Hardcase-iPhone-Hülle selbst gestalten 4 und Punk-Schmuck 3, dazu je 2: Wasserkocher, Haltungsgurte, Thermo-Strumpfhose, Kunstfell-Jacken, Winterjacken, Muschel-Set, Wanddeko, Geschenkbox.
2. **Strukturierte Daten:** Rückgabe (`hasMerchantReturnPolicy`) und Versand (`shippingDetails`) im Produktdatensatz (Rich-Results-Warnungen vom 09.11.). Ob das ChatGPT-Antworten beeinflusst, ist Hypothese; für Google-Einträge ist es üblich.
3. **Bing:** Bing Webmaster Tools (Import aus der Search Console, Handgriff des Besitzers), dann URL-Übermittlung. IndexNow braucht eine Schlüsseldatei im Stammverzeichnis (mit Shopify wohl nicht möglich, ungeprüft).
4. **Wöchentlich messen** (Rezept unten); erste Wiederholung Mo 17.11. (`trig_014i6zw9p2wbapYKj7ze3ZnS`).

## Messrezepte
ShopifyQL (`mcp__Shopify__run-analytics-query`):
```
FROM sessions SHOW sessions GROUP BY utm_source, utm_medium SINCE -14d UNTIL today ORDER BY sessions DESC LIMIT 20
FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout WHERE utm_source = 'chatgpt.com' GROUP BY session_country SINCE -14d UNTIL today ORDER BY sessions DESC LIMIT 10
FROM sessions SHOW sessions WHERE utm_source = 'chatgpt.com' TIMESERIES day SINCE -14d UNTIL today
FROM sessions SHOW sessions WHERE utm_source = 'chatgpt.com' GROUP BY hour_of_day SINCE -14d UNTIL today ORDER BY hour_of_day
FROM sessions SHOW sessions WHERE utm_source = 'chatgpt.com' GROUP BY landing_page_path SINCE -14d UNTIL today ORDER BY sessions DESC LIMIT 12
FROM sessions SHOW sessions WHERE utm_source = 'chatgpt.com' GROUP BY session_device_type SINCE -14d UNTIL today
FROM sessions SHOW sessions WHERE utm_medium = 'bio' GROUP BY utm_source, utm_campaign, landing_page_path SINCE 2026-11-09 UNTIL today
```
Admin-GraphQL (`mcp__Shopify__graphql_query`, Variable `q` = `created_at:>=2026-10-27`; keine Kundendaten abfragen):
```
query($q: String!) { orders(first: 50, query: $q, sortKey: CREATED_AT, reverse: true) { nodes { name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } customerJourneySummary { ready firstVisit { source sourceType utmParameters { source medium campaign } landingPage } lastVisit { source sourceType utmParameters { source medium campaign } landingPage } } } pageInfo { hasNextPage } } }
```

## Einstiegsseiten gesund? (Messrezept, erstmals 10.11. gegen 12:30 UTC, nur lesend)
Frage: Landen die ChatGPT-Besucher auf aktiven, lieferbaren Seiten? Wöchentlich zusammen mit den Messrezepten oben fahren.
1. ShopifyQL (`mcp__Shopify__run-analytics-query`):
```
FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_completed_checkout GROUP BY landing_page_path WHERE utm_source = 'chatgpt.com' SINCE -14d UNTIL today ORDER BY sessions DESC LIMIT 40
```
2. Produkte (`mcp__Shopify__graphql_query`, Handle = Pfad ohne `/products/`, Aliase `p1` bis `pN`; `productByIdentifier`, nicht `productByHandle`):
```
query{ p1:productByIdentifier(identifier:{handle:"..."}){...F} p2:productByIdentifier(identifier:{handle:"..."}){...F} }
fragment F on Product{handle title status onlineStoreUrl totalInventory tracksInventory variantsCount{count} variants(first:60){nodes{availableForSale}}}
```
Befund, wenn `status` nicht ACTIVE ist, `onlineStoreUrl` leer ist oder keine Ausführung `availableForSale` ist.
3. Sammlungen (Handle = Pfad ohne `/collections/`):
```
query{ c1:collectionByIdentifier(identifier:{handle:"..."}){...C} }
fragment C on Collection{handle title sortOrder productsCount{count} products(first:12){nodes{status tracksInventory totalInventory}}}
```
Befund, wenn die Sammlung fehlt (`null`), unter den ersten 12 Produkten eines nicht ACTIVE ist oder `tracksInventory` gilt und `totalInventory` höchstens 0 ist (ausverkauft; Bestand 0 bei `tracksInventory: false` heisst NICHT ausverkauft).
Grenzen: `Collection.publishedOnCurrentPublication` ist im Connector (API 2026-10) abgekündigt und wird abgelehnt; ob eine Sammlung im Online-Shop veröffentlicht ist, zeigt nur ein Seitenaufruf (höchstens zehn je Messung, mit Pausen). Französische Adressen (`/fr/...`) wurden nicht geprüft.
**Ergebnis 10.11. gegen 12:30 UTC:** 142 Sitzungen auf den Top 40; alle 13 Produktseiten ACTIVE und lieferbar, alle 23 Sammlungen da, vorne nichts ausverkauft ausser Platz 1 in `haltungsgurte-ruecken`. Auffällig: 5 Sitzungen auf der gesperrten Seite `magnet-zum-selbstgestalten`; 20 von 142 auf «Selbst gestalten»-Seiten (3 Warenkörbe, 0 Käufe).

## Lehren
1. **Quellen nie nur nach `referrer_name` auswerten:** Shopify ordnet Sitzungen mit verstecktem Verweis als «direct» ein, auch wenn die Adresse `utm_source=chatgpt.com` trägt. Zusätzlich nach `utm_source` und nach der Reise der Bestellung (`customerJourneySummary`) messen.
2. «Direkt = überwiegend Roboter» war zu grob: ein Teil sind Menschen mit anderem Verweis-Verhalten. Vor jeder Zuschreibung Tagesgang, Geräte, Warenkorb und Einstiegsseiten ansehen.
3. Eine Aussage, die ich am selben Morgen ins Gedächtnis geschrieben hatte («kleiner Hebel»), war falsch. Korrekturen gehören an die Stelle der falschen Aussage, nicht nur in einen neuen Block.
4. Eine Abfrage mit 0 Zeilen erst glauben, wenn eine Kontrollabfrage derselben Spalten Daten liefert (hier bestanden: `utm_medium` liefert Daten).
