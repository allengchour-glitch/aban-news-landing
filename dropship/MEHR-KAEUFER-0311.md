# Mehr Käufer — Messung, Rangliste, Umsetzung (03.11.2026)

Auftrag des Besitzers am 03.11.: «ich brauche mehr Käufer». Methode: Workflow `wf_e69af547-e4b` (12 Agenten, nur lesend): 6 Analysten
(Trichter, Google, Social, Kassen-Mail, Saison, Nachfrage) → 1 Synthese → 5 Skeptiker, die die tragenden Zahlen am Rohdatum nachmassen.
Rohtext von Rangliste und Gegenprüfung: `dropship/mehr-kaeufer-0311/synthese-und-gegenpruefung.txt`.
Marken: **GEMESSEN** = am 03.11. selbst an der Quelle gelesen (mit Zahl), **Hypothese** = Schätzung, **unbekannt** = keine Messquelle.

## Lage (GEMESSEN 03.11.)
- **Schweiz, 30 Tage:** 1 005 Sitzungen → 36 Warenkörbe (3,6 %) → 22 Kasse → 10 Käufe (1,0 %). Die Kopfzahl über alle Länder (0,51 %) ist halb so hoch,
  weil China und USA (40 % der Sitzungen) nie kaufen («Bots» ist Hypothese). Handy 80–87 % der Sitzungen, Kaufquote Handy = Desktop (0,68 % gegen 0,67 %).
- **Der Engpass sind Besucher mit Kaufabsicht**, nicht Seite oder Kasse. Social: 0 Sitzungen von TikTok/Instagram in 14 Tagen, 0 von 11 Bestellungen
  zuordenbar aus Social (8 von 11 ohne Quelle). Bezahlter TikTok-Test: 0 Käufe aus 550 Sitzungen.
- **ChatGPT** ist die einzige wachsende Quelle (1 → 111 Sitzungen pro Woche, Warenkorbquote 6,1 % gegen 1,3 %), aber die 3 Käufe fielen alle auf den 27.10.;
  danach 109 Sitzungen ohne Kauf. Kaufquote nicht belegt (CH 3 von 270, Spanne 0,4–3,2 %).
- **Unmarkierte CH-Welle seit 31.10.:** 65–72 CH-Sitzungen pro Tag statt 16–48, aber fast nur direkte Sitzungen ohne UTM auf fünf Mode-Seiten
  (Boho-Set, Provence, Aurora, Rüschenbluse, Sirène): 0 Warenkörbe in 81 Sitzungen. Dieselbe Produktfamilie brachte am 1.–3.10. (bezahlter TikTok-Test) 0 Käufe.
  Quelle unbekannt; **Kostenrisiko**, falls bezahlt. Beitrag oder Anzeige dazu in Metricool: keine.
- Bestellungen seit 25.10.: 5 (#1029–#1033), CHF 210.24, Ø CHF 42.05; 3 ChatGPT, 2 Google, 0 Social.

## Rangliste und Urteil der Gegenprüfung
| Rang | Hebel | autonom | Gegenprüfung |
|---|---|---|---|
| 1 | Quelle der Welle klären | ja (lesen) | abgeschwächt: Warenkorbquote 4,4 % kommt von ChatGPT, nicht von der Welle; Erwartung 0 (Spanne 0–2) statt +1; Stunden-Abgleich überflüssig (Plateau); **Frage an den Besitzer nach laufender Anzeige zuerst** |
| 2 | ChatGPT-Einstiege herrichten | ja | abgeschwächt: `/collections/halloween` bekommt seit 30.10. keine ChatGPT-Sitzung mehr; Umbau auf «Kostüme/Fasnacht» würde titel-wahrheit verletzen (Inhalt ist CJ-Halloween-Deko). Nur lesen und Einstiege prüfen |
| 3 | TWINT prüfen | nein | **widerlegt:** TWINT ist aktiv und wird benutzt (3 Zahlungen, CHF 89.94, 17,9 % des Volumens; Klarna 1) |
| 4 | Startseite Saison-Block | ja | abgeschwächt: die Startseite ist ein einziger Liquid-Abschnitt (`luxe-edit-home.liquid`), kein «nur JSON»; Effekt +0,1 bis +0,4 |
| 5 | Klickweg Social (PC-Claude) | nein | abgeschwächt: nur Voraussetzung; `BROWSER-BEFEHL-BIO-LINKS-2810.md` NICHT übergeben, stattdessen `BROWSER-BEFEHL-INSTAGRAM-BIO-0311.md` |
| 6–12 | Leiste ehrlich · Wegweiser-Sammlung ergänzen · Vorderseiten · Kassen-Mail (bedingt) · Google-Pflege · Black Week · Messbasis | gemischt | siehe Rohtext |

Nicht empfohlen (Grund im Rohtext): neue bezahlte Kampagne vor Pixel, Kassen-Rückholung ohne Bedingungen, Preissenkung/zusätzliche Rabattaktion,
Versandschwelle «korrigieren» (die 50/45-Regel ist bewusst), fester Kaufknopf mobil, mehr Reels als Kaufhebel jetzt, China/USA sperren.
**Ehrliche Summe aller autonomen Hebel: Hypothese +1 bis +4 Käufe in 14 Tagen, Mitte etwa +2.** Mehr gibt es nur, wenn die Welle oder ChatGPT trägt.

## Heute umgesetzt (03.11.)
1. **Ankündigungsleiste ehrlich** (MAIN-Theme `sections/header-group.json`, Sicherung `dropship/mehr-kaeufer-0311/header-group.vor.json`, genau 3 Zeilen,
   Rücklesen gleich Soll, Live-Seite HTTP 200, 1,46 MB): Slide 5 sagte «–10 % ab 2 Artikeln» (der alte Bundle-Rabatt endete am 27.10.); jetzt «bei ausgewählten Artikeln: ab 2 Stück –5 %, ab 3 Stück bis –10 %»
   (Regel `dropship/MENGENRABATT-FREI.txt`). Slide 4 ohne das veraltete «Lieferung nach Halloween», Link auf `kostueme-ch-lager` statt `halloween`.
2. **TikTok:** der Test mit `autoAddMusic` am Hochlandrind-Beitrag ist PUBLISHED; auf der öffentlichen TikTok-Seite trägt er einen Bibliotheks-Sound
   (GEMESSEN: «A Perfect Moment Perfectly», Gale Harbor, `original:false`). `autoAddMusic` jetzt auch an den sechs Fotobeiträgen 4.–9.11.
3. **Grind LIVE:** Webcam 1080P Konferenz und Laptop-Tasche Schultertasche als DRAFT (PR #2848), beide `text-offen`.
4. **Printful-Rückmeldung** gemergt (PR #2847), Trockenlauf in Actions grün; scharf ab 04.11. 15:23 UTC.

## Sterne und Bewertungen auf der Startseite (Besitzer 03.11. mit Screenshots: «Sterne fehlen bzw. Bewertungen»)
- GEMESSEN am Live-HTML: von 25 Karten haben **22 nachweislich 0 Bewertungen** (Judge.me-Abzeichen `countRaw 0`), 2 haben 8 × 5,0, 1 unbekannt.
  Die Karte zeigt bei bestätigter Null absichtlich leere Sterne und «Noch keine Bewertungen» (`assets/luxe-product-reviews.js`, Zustand `confirmedZero`).
- Im ganzen Shop tragen 2 084 von 56 636 aktiven Produkten Judge.me-Bewertungen (3,7 %); **fast alle sind importierte CJ-Bewertungen, genau 8 je Produkt, fast alle 5,0** (Importgrenze).
  Eigene Kundenbewertungen gibt es kaum: die Bewertungsanfrage (Klaviyo-Flow «Post-Purchase Order + Review» `RnTvsY`) ist seit 02.11. pausiert.
- Der sichere Pool «bewertet ≥ 4,6 mit ≥ 5 Stimmen UND Marge-A-Tag UND aktiv, Bild ≥ 700 px, nicht gesperrt» umfasst nur **18 Produkte**, fast alles Billigschmuck (CHF 15–17, Rohmarge rund CHF 7–9): die Klasse, die am 24.10. als «zu dünn» von der Startseite ausgeschlossen wurde. Darum **kein Austausch der Trends-Reihe** gegen Billigartikel.
- **Vorbereitet, vom Auto-Modus abgelehnt, NICHT ausgeführt:** zwei CSS-Zeilen in `assets/luxe-edit.css` (nach `.lx-home .lx-review-badge[hidden]`), die auf der Startseite die leere Sternzeile mit «Noch keine Bewertungen» ausblenden (`[data-review-state="confirmedZero"],[data-review-state="unknown"]{display:none!important}`), Karten mit Bewertung bleiben. Skript: Scratch `css_0311.mjs`, Trockenlauf ok (46 349 → 46 726 Zeichen).
- Rechtlich offen (Besitzerentscheid, siehe CLAUDE.md 03.11. nachts): importierte CJ-Bewertungen als Shop-Bewertungen (synthetische Adressen, nur positiv) gegen Googles Regel und mögliche UWG-Fragen; **kein weiterer Import**.

## Messbasis und Kontrollen (nur CH, nur UTM; jede Zahl mit n und Spanne, Käufe nie ohne Gegenprobe Kaufsitzungen = Bestellungen)
- Baseline 03.11. (30 Tage CH): 1 005 / 36 / 22 / 10; ChatGPT-UTM 298 Sitzungen, 20 Warenkörbe, 3 Käufe; Social 159 CH-Sitzungen, 1 Warenkorb, 0 Käufe; Instagram-Reichweite 7 Tage 123.
- Kontrollen: **Mi 05.11.** (Quelle der Welle: Warenkorbquote der Gruppe ohne UTM; Warenkörbe auf den fünf Wellenprodukten), **Mo 10.11.**, **Mo 17.11.** (dieselben Abfragen).
- Messfallen: ChatGPT nur per `utm_source = 'chatgpt.com'` zählen (Referrer-Berichte zeigen 6 statt 298 Sitzungen; am Bestellobjekt `customerJourneySummary` gegengeprüft);
  TWINT/Klarna sind lesbar über `orders.transactions.paymentDetails.paymentMethodName` oder ShopifyQL `FROM payments GROUP BY payment_method`;
  GA4 ist in OpenSEO nicht verbunden (kein zweiter Sitzungszähler); die Abandoned-Checkout-Liste enthält Testskript-Muster (17 Abbrüche einer Kunden-ID) und ist kein Zähler.

## Entscheide des Besitzers (Standard ohne Antwort in Klammern)
1. **Läuft oder lief seit etwa 30.10. eine Anzeige oder ein Boost** (Meta, TikTok, Google Ads mit Restguthaben CHF 58 — in Shopify sind «sirene-test»-Sitzungen aus Google-Anzeige sichtbar —, Pinterest), oder wurde Boho-Set/Provence/Aurora/Sirène/Rüschenbluse irgendwo geteilt? Falls bezahlt und 0 Warenkörbe: pausieren. (Standard: Quelle bleibt Hypothese.)
2. Instagram-Bio-Link auf `luxestyle.ch/ig` an PC-Claude geben (`dropship/BROWSER-BEFEHL-INSTAGRAM-BIO-0311.md`). (Standard: kein Klickweg.)
3. **Bewertungsanfrage-Mail** (`RnTvsY`) wieder einschalten, damit eigene Sterne entstehen? Empfehlung: ja, sobald Sendedomain verifiziert; Erwartung klein (rund 10 Bestellungen im Monat). Dazu die Lesart von «mail news abstellen» (nur Posteingang oder auch Kundenmails?). (Standard: alle Flows bleiben draft.)
4. Startseite: leere Sterne ausblenden (CSS, vom Auto-Modus abgelehnt): Erlaubnis oder selbst einsetzen.
5. `GIFT2026` (–20 % auf alles, kein Mindestwert, unbegrenzt, Start 01.11., angelegt am 23.05. im Rahmen der Mai-Codes, 0 Nutzungen) und rund 35 weitere aktive 10–15-%-Codes: beschränken oder beenden? Bei Marge im Median 22–23 % bleiben 0–4 %. (Standard: unverändert; Claude liest den Zähler Mo und Do.)
6. Black Week 25.–30.11. klein (nur Tag `mengenrabatt-a`, –15 %, höchstens 20 %, nicht mit Codes kombinierbar): Entscheid bis 17.11. (Standard: keine Aktion, nur Entwurf der Sammlung).
7. Alte Themes «Horizon» und «Horizon-Polish-Grid» von Hand löschen (Shop bei 20/20). GA4 in OpenSEO verbinden und Merchant-Center-Leistung als Screenshot schicken.

## Offen aus der Gegenprüfung (autonom, noch nicht getan)
- `kostueme-ch-lager`: Beschreibung und SEO-Text versprechen «meist in 2–3 Werktagen» (ungemessen, #1031 seit 27.10. offen) und enthalten einen «Für Halloween»-Absatz; Text auf «Lieferdatum steht auf jeder Produktseite» kürzen und Halloween-Absatz auf Fasnacht stellen. Zuvor prüfen, ob eine Automatik den Absatz `data-lux-anlass="halloween"` setzt (Suche im Repo ohne Treffer).
- Wegweiser-Sammlung `aus-tiktok-und-instagram`: 6 Beitragsprodukte ab 10.11. fehlen (Bruder-Traktor, Haarspange Herz-Keks, Kerzenhalter Hirsch, Plüsch Kaiserpinguin, Rennrad mit Radfahrer, USB-Stick Flaschenöffner); Aufnahme-Gate je Produkt, vor Mo 09.11.
