## Ergebnis (25.11.2026)

Ich habe nur gelesen. Im Shop, im Theme und in den Texten habe ich nichts geändert.

Der Plan wählt **12 Kollektionen** und schreibt für jede einen fertigen Block «Häufige Fragen» (siehe `seiten`). Jeder Block enthält nur gemessene Preise und Grössen sowie Angaben aus der Versand- und der Rückgaberichtlinie.

Wichtigste Abweichung von der Vorgabe: Die pauschale Aussage «30 Tage Rückgabe» stimmt laut Rückgaberichtlinie nicht für alle Artikel. Drei Gruppen sind ausgenommen (ausser bei Mängeln):
- selbst gestaltete Artikel,
- personalisierte bzw. gravierte Artikel,
- hygienisch versiegelter Schmuck und Kosmetik, sobald die Versiegelung geöffnet ist.

Die Blöcke sagen das jeweils so.

## Was ChatGPT heute schickt

**Verkehr und Käufe (ShopifyQL, `utm_source = chatgpt.com`, 90 Tage = 27.08.–25.11.2026):**
- 889 Sitzungen auf 442 Landepfaden. 60 davon legten etwas in den Warenkorb, 8 schlossen den Checkout ab.
- Das ergibt eine Kaufquote von 0,90 %. Ohne utm sind es 6'378 Sitzungen und 17 Checkouts, also 0,27 %.
- Unter den 15 grössten Quellen bringt ChatGPT rund 11 % der Sitzungen, aber 8 von 25 Checkouts.
- Verlauf pro Woche: 6 (24.08.) → 31 (12.10.) → 91 → 111 → 152 → 176 (09.11.) → 122 (16.11.).
- 528 der 889 Sitzungen fielen seit dem 01.11.
- Letzte 30 Tage (Stand 25.11., 06:45 UTC): 448 Sitzungen und 33 Warenkörbe auf 190 Seiten (`dropship/_chatgpt_landeseiten.json`).

**Bestellungen (Admin-API, `customerJourneySummary`):**
- 10 der 32 Bestellungen der 90 Tage haben ihren Erstbesuch über chatgpt.com.
- Davon behalten: CHF 397.56 brutto aus 9 Bestellungen. #1021 wurde voll erstattet, #1042 teilweise.
- Jede dieser Bestellungen ist die erste ihrer Kunden-ID.
- 7 Käufe begannen auf einer Produktseite, 3 auf einer Kollektion (#1044 Felljacken, #1036 Kochutensilien, #1031 Halloween).
- Dazu kommt #1034: CHF 158.44 mit 6 Tierartikeln, die grösste Bestellung der 90 Tage. Erstbesuch direkt auf `tier-pullover`, letzter Besuch über ChatGPT.

**Themen im November** (eigene Zuordnung per Schlüsselwort, also eine Schätzung):

| Thema | Sitzungen seit 01.11. | davon mit Warenkorb | Bemerkung |
|---|---|---|---|
| Schmuck | 81 | 8 | 66 Pfade, meist kleine Unterkategorien |
| Damenmode/Winter | 68 | 9 | |
| Beauty (vor allem Rizinus-Wickel) | 61 | 7 | |
| Wohnen/Licht | 53 | 0 | |
| Selbst gestalten | 47 | 4 | 0 Käufe in 90 Tagen |
| Haustier | 27 von 29 | – | Thema wächst |

Halloween ist vorbei: 114 Sitzungen in 90 Tagen, aber nur 7 seit dem 01.11.

**Google trägt diesen Verkehr nicht** (OpenSEO/GSC, 22.08.–22.11.):
- Die 15 untersuchten Kollektionen hatten zusammen 2 Klicks, 8 davon keine einzige Impression.
- Über 28 Tage gab es 18'814 Impressionen, aber nur 45 Klicks. Bei den Kauf- und Fragesuchen stehen 83 % der Impressionen auf Position > 40.
- ChatGPT findet unsere Kollektionen also nicht über das Google-Ranking. Es liest sie direkt (Suche über Bing u. a.) und verlinkt auch Kollektionsseiten.

**Was auf den Seiten fehlt:**
- 0 von 15 untersuchten Kollektionen haben «Häufige Fragen».
- Die Standardvorlage `templates/collection.json` hat keinen FAQ-Abschnitt.
- Der vorhandene Block `lux_faq` steckt nur in den Vorlagen `collection.lxbewegt` und `collection.lxkopf`, die keine dieser Kollektionen nutzt. Er nennt zudem Klarna nicht.
- 0 von 15 Texten nennen eine konkrete Lieferzeit, 1 von 15 einen Preisrahmen.
- Nach der SERP-Messung (23 Texte) nennen 3 eine Zahlart und 5 die Rückgabe.

## Zielseiten

**So habe ich ausgewählt und gemessen:**
- Jeder Handle ist per Admin-API geprüft (am 25.11.2026): Er existiert, ist im Onlineshop veröffentlicht und hat mindestens 10 Produkte, die zugleich ACTIVE und im Onlineshop sind.
- Preise habe ich über alle Produkte jeder Kollektion gemessen, nicht über eine Stichprobe.
- «ab» ist die günstigste Variante eines Produkts, «max» die teuerste Variante.
- «Median» ist der Median der Einstiegspreise.

Abkürzungen: Sitz. = Sitzungen, WK = Sitzungen mit Warenkorb, Impr. = Impressionen, Pos. = Position.

| # | Handle | aktiv im Onlineshop / gesamt | Preise CHF ab–max · Median | ChatGPT (90 T, wenn nicht anders angegeben) | Google (GSC) | Warum diese Seite |
|---|---|---|---|---|---|---|
| 1 | `selbst-gestalten` | 18 / 39 | 16.90–141.90 · 26.90 | Thema 83 Sitz., 5 WK, 0 Käufe; Kollektion 2 Sitz. | Thema 2'390 Impr., 0 Klicks, Pos. 66–87 (28 T) | Grösste Nachfrage ohne Kauf. Preis, Druckzeit (7–14 Werktage) und Rückgaberegel fehlen im Text. |
| 2 | `damen-jacken-kunstfell` | 34 / 35 | 14.90–140.90 · 31.40 | 10 Sitz., 4 WK, 1 Checkout, alle seit 01.11.; #1044 | 1 Klick, 1 Impr. | Die Kollektion, die über ChatGPT am besten verkauft. Text ohne Lieferzeit, Rückgabe und Zahlung. |
| 3 | `weihnachtspyjama-familie` | 30 / 30 | 14.90–155.90 · 14.90 (29 von 30 höchstens 29.90) | 0 als Landeseite (30 T) | Thema 224 Impr., 0 Klicks, Pos. 27–53; Kollektion 129 Impr., Pos. 42 | Jetzt Saison. Der Text sagt noch «bis Mitte November bestellen». |
| 4 | `weihnachten-2026` | 310 / 387 | 14.90–75.90 · 19.40 | 6 Sitz. (5 seit 01.11.); Thema 31 seit 01.11. | 0 Klicks, 2 Impr., Pos. 12 (90 T); Ratgeber Pos. 5 | Die Frage «bis wann bestellen?» ist offen. |
| 5 | `tier-pullover` | 168 / 169 | 14.90–61.90 · 16.90 | 3 Sitz., alle seit 01.11.; #1034 (CHF 158.44) | keine Impr. | Grösste Bestellung der 90 Tage; das Haustier-Thema wächst. |
| 6 | `punk-gothic-schmuck` | 47 / 48 | 14.90–66.90 · 16.90 | 8 Sitz., 2 WK | keine Impr. | Grösste Kollektion im stärksten Novemberthema (Schmuck). |
| 7 | `trinkbrunnen-katzen` | 24 / 24 | 19.90–118.90 · 39.40 | 0 | Thema 455 Impr., 0 Klicks, Pos. 34.5; Kollektion Pos. 29–39 | Kaufsuche, bei der wir knapp fehlen. |
| 8 | `futterautomaten` | 46 / 46 | 28.90–139.90 · 74.40 | 0 | «elektrischer futterspender katze» 66 Impr., Pos. 17–19 (Produkt mit Platzhaltertext); Kollektion Pos. 50 | Höchster Warenkorbwert der Auswahl; auf der Seite fehlt die Antwort. |
| 9 | `gliederarmbaender` | 33 / 40 | 15.90–125.90 · 22.90 | 4 Sitz., 1 WK | keine Impr. | Der Text hat 4 Wörter. |
| 10 | `personalisierte-ringe` | 37 / 39 | 14.90–44.90 · 16.90 | 5 Sitz., 0 WK | 0 Klicks, 5 Impr., Pos. 35.6 | Ob man Gravur-Ware zurückgeben kann, ist offen (laut Richtlinie: ausgenommen). |
| 11 | `make-up-sets` | 84 / 84 | 14.90–69.90 · 25.40 | 4 Sitz., 1 WK | keine Impr. | Der Text hat 15 Wörter; Beauty hat 61 Sitzungen seit 01.11. |
| 12 | `zirkonia-moissanit-ketten` | 39 / 45 | 14.90–78.90 · 15.90 | 3 Sitz. (30 T); hier liegt die gekaufte Kette aus #1039 | nicht erhoben | Kollektion eines echten ChatGPT-Kaufs. Achtung: nur 1 Produkt trägt «Moissanit». |

Abweichungen zu den Spuren:
- Die Spur «Landeseiten» schätzte die Aktivzahlen aus den ersten 250 Produkten, z. B. 193 aktive bei `weihnachten-2026`. Gezählt sind es 310.
- Dort steht als Obergrenze der höchste Einstiegspreis, hier die teuerste Variante (z. B. `gliederarmbaender` 97.90 → 125.90).

### Vorschlag zum Einbau (nicht umgesetzt; braucht einen Auftrag)

1. **Wo:** Den Block jeweils ans Ende von `descriptionHtml` setzen. Die Beschreibung steht heute eingeklappt («Über …», Abschnitt `lx-collection-details`) unter der Produktliste. Für ChatGPT und Bing steht sie im HTML; für Besucher wäre der Block offen besser.
   - Ergänzend: `templates/collection.json` um einen Abschnitt mit FAQPage-JSON-LD erweitern, das aus den `<h3>`/`<p>` gebaut wird.
   - Ehrlich dazu (eigene Kenntnis, nicht gemessen): Google zeigt FAQ-Snippets seit 2023 nur noch für wenige Websites. Der Nutzen liegt bei maschinenlesbaren Antworten für ChatGPT und Bing, nicht bei Google-Sternchen.
   - In `lux_faq` Klarna ergänzen.
2. **Vorher:**
   - Den Satz «bis Mitte November bestellen» in `weihnachtspyjama-familie` und `weihnachtspullover` ersetzen.
   - Preise unmittelbar vor dem Schreiben neu messen. Die Zahlen gelten für den 25.11.2026, und Sortiment und Preise ändern sich täglich.
3. **Wächter (Hausregel 05.10.):** Ein lesendes Skript vergleicht wöchentlich ab-, max- und Median-Preis jedes Blocks mit dem Bestand. Weicht ein Wert um mehr als 10 % ab oder fallen unter 10 aktive Produkte, meldet es das in der Ampel.
4. **Danach:**
   - Geänderte Kollektionen per IndexNow einreichen (Bing; ChatGPT sucht u. a. dort).
   - In der GSC «Indexierung beantragen» (Betreiber-Klick, siehe Lehre 22.10.).
5. **Messen:** ChatGPT-Sitzungen, Warenkörbe und Checkouts je Kollektion, 30 Tage vorher gegen 30 Tage nachher (ShopifyQL `GROUP BY landing_page_path`). Die Ausgangswerte stehen in der Tabelle oben.

### Bewusst nicht gewählt

| Kollektion | Grund |
|---|---|
| `rizinusoel` | Nur 4 aktive Produkte (< 10). Das stärkste Produkt (Wickel) bleibt die Zielseite; das reine Öl und das Set sind DRAFT. |
| `kuschel-heizdecken` | Nur 1 der 15 aktiven Produkte ist eine Heizdecke. Ein FAQ würde Heizdecken versprechen, die es nicht gibt. Zuerst Sortiment (die gekaufte Heizdecke aus #1029 ist DRAFT). |
| `halloween`, `kostueme-ch-lager` | Seit 01.11. fast kein ChatGPT-Verkehr; Fasnacht später. |
| `wohnen-dekoration` | 4'637 Produkte, zu breit für konkrete Antworten. |
| `kratzbaeume`, `licht-nachtlicht-projektor` | Gute Kandidaten für Runde 2 (35 bzw. 132 aktiv). |
| `gps-tracker-ortung` | SIM/Abo bei 0 von 27 Produkten belegt. |
| Kaschmir-Mäntel | Materialangaben widersprechen sich (Irreführungsrisiko). |
| `sicherheitsschuhe` | «Nicht zertifiziert» – nicht auf Klicks trimmen. |
| `adventskalender` | Ab heute nicht mehr vor dem 1.12. lieferbar (Schätzung bei 10–20 Werktagen). |

### Gefunden beim Lesen (Sortiment und Produktseiten, ausserhalb dieses Plans)

- Die Hoodie-URL mit 665 Impressionen ist DRAFT und leitet auf eine Kollektion weiter.
- `trinkbrunnen-fur-haustiere-411520` ist ein Napf, kein Brunnen, rankt aber für «Trinkbrunnen».
- `futterautomat-fur-katze-527488` hat einen Platzhaltertext und steht auf Pos. 17–19.
- Die Mengenrabatte «5 % ab 2 / 10 % ab 3 Stück» sind aktiv. Ich nenne sie in den Blöcken nicht, weil ich nicht geprüft habe, für welche Produkte sie gelten.
- «Black Week 15 % ab CHF 80» endet am 30.11. und ist deshalb ebenfalls nicht erwähnt.

## Muster der Gewinner

Firecrawl, 25 Kauf-Suchanfragen mit Standort Schweiz, 25.11.2026: luxestyle.ch erscheint nur in 1 von 25 Suchen in den Top 10, nämlich mit dem Rizinus-Wickel auf Platz 7. Die Firecrawl-Reihenfolge ist nicht identisch mit Google oder Bing.

1. **Eine Seite pro Kaufbegriff.** Der Begriff steht wörtlich im Titel, darunter gibt es Unterseiten nach dem, was die Wahl entscheidet: Grösse, Länge, Preisstufe.
   - Beispiele: «Hundepullover online kaufen», «Kratzbaum ab 120 cm», «Geschenke 20–50 CHF».
   - Bei uns fehlen u. a. eigene Seiten für Hundepullover, Katzenbett und Thermo-Strumpfhose.
2. **Schweizer Kauf-Fakten im ersten Satz.** In 22 von 25 Suchen nennt mindestens ein Top-10-Snippet solche Fakten (grobe eigene Auszählung): Gratisversand-Grenze in CHF, Lieferzeit in Tagen, Kauf auf Rechnung, Rückgabe.
   - Unsere Gratisversand-Grenze ist konkurrenzfähig: CHF 50 nach Rabatt, Fressnapf/zooplus/ipet erst ab CHF 69, Globus ab CHF 150.
   - Sie steht aber kaum in unseren Texten.
   - Unsere Lieferzeit (10–20 Werktage) ist schwächer als die der Konkurrenz (1–3 Tage). Ehrlich nennen statt verschweigen.
3. **Preisanker** wie «ab CHF X» oder eine Preisspanne. 16 von 23 unserer Kollektionstexte haben keinen.
4. **Antwort auf die Entscheidungsfrage direkt auf der Seite:** Masse, Material, Technikwerte, oft als Frage und Antwort.
   - Kleine CH-Shops gewinnen so Produktsuchen, etwa «Heizdecke 132 × 183 cm, 10 Stufen» oder «Handgelenk 15–20 cm».
   - Bei uns haben 22 von 23 Texten keine Frage mit Antwort.
5. **Listen und Vergleiche besetzen Geschenk- und Technikfragen.** Galaxus erscheint in 10 der 25 Suchen.
   - Unser Ratgeber-Format funktioniert: Für «welche elektronik-geschenke sind zu weihnachten 2026 in der schweiz am beliebtesten?» steht der Ratgeber auf Pos. 5 (37 Impr., 0 Klicks).
   - Er nennt aber keine konkreten Produkte und kein Bestelldatum.

Aus GSC kommen zwei Ergänzungen:
- Wo wir schon vorne stehen (Pos. ≤ 20, 0 Klicks), fehlt die Antwort selbst: Futterspender, Rizinus-Meta-Text, Sonnenbrille mit «Variante 1–5».
- Bei «Selbst gestalten» (Pos. 66–87) löst ein FAQ das Google-Ranking nicht. Das Ziel dort ist ChatGPT.

**Was die Blöcke übernehmen:**
- Muster 2, 3 und 4: Preisanker, CH-Fakten (CHF 7 bzw. gratis ab CHF 50 nach Rabatt, Lieferzeit, Rückgabe, Zahlung), Grössen und Material.
- Alles in kurzen Antworten mit 1–3 Sätzen, in du-Form und nur mit belegten Angaben.
- Keine Bestseller-Aussagen, keine Liefergarantie bis Weihnachten, keine neuen Rabatte, keine Konkurrenten.

## Quellen

**Shopify Admin GraphQL (lesend, über `automation/seo_autopilot.gql`), 25.11.2026:**
- `collectionByHandle` für 17 Handles, mit allen Produkten: Status, Veröffentlichung im Onlineshop, `priceRangeV2`, `options`, Titel.
- Rohdaten: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/plan/scan_damen-jacken-kunstfell.json` und `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/plan/scan_weihnachten-2026.json`.
- Auswertung: `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/plan/attr.py` und `/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/plan/kw.py`.
- `productByHandle.descriptionHtml` für alle Produkte von `personalisierte-ringe`, `tier-pullover` und `damen-jacken-kunstfell`. Beispiel: Brustumfang steht in 31 von 168 Tier-Pullover-Texten.
- `shop.shopPolicies`:
  - Rückgaberichtlinie: 30 Tage ab Erhalt; Ausnahmen für selbst gestaltete, personalisierte und hygieneversiegelte Artikel; Rücksendekosten trägt der Kunde, ausser bei Mängeln.
  - Versandbedingungen: Direktversand 10–20 Werktage, Druck auf Bestellung 7–14 Werktage, Liechtenstein 15–45 Tage und CHF 14.90, gratis ab CHF 50 nach Rabatt.
- `deliveryProfiles`: General profile, Schweiz «Standard» CHF 7.00 aktiv, «Kostenloser Versand» ab CHF 50 aktiv (die 45-Regeln sind inaktiv); Liechtenstein CHF 14.90.
- `automaticDiscountNodes`: «Gratis-Versand ab CHF 50» aktiv, Mengenrabatte aktiv, «Black Week 15 % ab CHF 80» bis 30.11.2026.
- `publications`: Online Store `gid://shopify/Publication/301970915713`.

**Weitere Quellen:**
- Zahlarten TWINT, Klarna, Karte, PayPal, Apple Pay: Betreiber-Bestätigung vom 10.07.2026 in CLAUDE.md und Aufgabenkontext. Nicht per API gemessen.
- Spur «Landeseiten»:
  - ShopifyQL `FROM sessions … WHERE utm_source = 'chatgpt.com' GROUP BY landing_page_path SINCE -90d` (889 Sitzungen, 442 Pfade).
  - Admin-API `orders.customerJourneySummary` (32 Bestellungen).
  - Kollektionstexte und Theme-Vorlagen (`collection.json`, `lux_faq`, `lx-collection-details`).
- `dropship/_chatgpt_landeseiten.json` (Stand 25.11.2026, 06:45 UTC, 30 Tage: 448 Sitzungen, 33 Warenkörbe) und `dropship/CHATGPT-LANDESEITEN.md`.
- Spur «GSC»: OpenSEO `get_search_console_performance`, Projekt 443c940c-93c9-4feb-9d0c-1e4d1d88c6cf, 26.10.–22.11.2026, Dimension [query] (6'005 Zeilen) und [query, page] (7'225 Zeilen). Dazu `dropship/_gsc_seiten.json`.
- Spur «SERP»: Firecrawl `firecrawl_search`, 25 Kauf-Suchanfragen mit Standort Schweiz, je 10 Treffer.

**Firecrawl-Budget:** In diesem Schritt habe ich keine Suche ausgeführt. Die Spuren meldeten zusammen 28 Suchen (25 in der SERP-Spur, 3 in der GSC-Spur, rund 56 Credits). Das liegt 3 Suchen über der Vorgabe von höchstens 25.

**Rechtschreibung und Ton:** Die Blöcke sind in du-Form und mit ss statt ß geschrieben.