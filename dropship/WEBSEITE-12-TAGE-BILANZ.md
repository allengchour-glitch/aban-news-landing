# Webseite pimpen — Bilanz nach 12 Tagen (Tag 12, Stand 12.10.2026, ~00:50 UTC)

Plan: `dropship/WEBSEITE-12-TAGE-PLAN.md` (01.–12.10.2026). Alle Zahlen **GEMESSEN** mit
`python3 tools/webseite_bilanz.py` (ShopifyQL `sessions`, Shopify-Bestellungen, Metafeld `reviews.rating_count`)
sowie `tools/werbetest_trichter.py` und Abfragen nach `utm_source`, `referrer_name`, Tag und Seite.
Nur Menschen (`human_or_bot_session = 'human'`). Fenster: **12 Tage vorher (19.–30.09.)** gegen **12 Tage Plan
(01.10.–heute)**; «heute» ist der 12.10. erst ab 00:00 UTC.

## Kurzfassung

- **Sitzungen ×2,7, Käufe 2 → 3, aber die Warenkorb-Quote fiel von 5,3 % auf 1,4 %.** Der Zuwachs besteht aus
  Produktsitzungen ohne Warenkorb: TikTok (Werbetest 01.–04.10.) 144 Sitzungen auf drei Seiten, davon Sirène 58 und
  Aurora 46 **ohne** Warenkorb; dazu 189 Produktsitzungen **ohne Herkunft** mit **0 Warenkörben**.
- **Die Startseite hat nicht zugelegt:** 12 Tage 52 → 54; 7 Tage 46 → 34 (Ausgangsmessung 01.10. gegen heute).
- **Bewertungen:** von 29 meistbesuchten Produktseiten haben jetzt **5** Bewertungen (am 01.10.: 2).
- **Mit 2 bis 3 Käufen je Fenster ist keine Quote belastbar:** ein Kauf mehr verschiebt die Kaufquote um 0,2 bis
  0,5 Prozentpunkte. Eine Wirkung des Plans auf die Käufe ist damit **nicht nachweisbar**.

## 1. Trichter (menschliche Sitzungen)

| Fenster | Sitzungen | Warenkorb | Kasse erreicht | Käufe (Sitzungen) | Startseite |
|---|---:|---:|---:|---:|---:|
| vorher 19.–30.09. (12 T) | 190 | 10 (5,3 %) | 6 (3,2 %) | 3 (1,6 %) | 52 |
| **nachher 01.10.–heute (12 T)** | **508** | **7 (1,4 %)** | **5 (1,0 %)** | **2 (0,4 %)** | **54** |
| 7 T (01.10.: 115 · heute: 177) | 177 | 4 (2,3 %) | 2 (1,1 %) | 2 (1,1 %) | 34 (01.10.: 46) |

Die 115 der Ausgangsmessung vom 01.10. stammen aus den sieben Tagen davor (vermutlich 24.–30.09.); die 177 sind
05.–12.10. Der Vergleich ist deshalb nur ungefähr.

## 2. Woher die Sitzungen kamen (nachher, 01.10.–heute)

| Quelle | Seitenart | Sitzungen | Warenkorb | Kauf |
|---|---|---:|---:|---:|
| TikTok (Werbetest 01.–04.10.) | Produkt | 144 | 2 | 0 |
| ohne utm, **ohne Referrer-Angabe** | Produkt | 130 | 0 | 0 |
| ohne utm, Referrer Facebook | Produkt | 35 | 0 | 0 |
| ohne utm, Referrer Google | Produkt | 22 | 0 | 0 |
| ohne utm, Referrer Pinterest | Produkt | 2 | 0 | 0 |
| ohne utm (direkt/organisch) | Startseite | 42 | 1 | 1 |
| ohne utm (direkt/organisch) | Kollektion | 35 | 1 | 0 |
| Google (Gratis-Einträge) | Produkt | 27 | 0 | 0 |
| chatgpt.com | Produkt / Kollektion / Startseite | 13 / 13 / 9 | 0 / 1 / 1 | 0 |
| ohne utm (direkt/organisch) | Warenkorb | 8 | 1 | 1 |

**TikTok-Produktsitzungen (144) auf drei Seiten:** Sirène-Abendkleid 58 (0 Warenkörbe), Aurora-Satinkleid 46 (0),
Provence-Leinenset 40 (2).

**Produktsitzungen ohne Herkunft (189, 0 Warenkörbe):** verteilen sich auf viele Seiten (größte Einzelseite 3
Sitzungen). Die Tageswerte haben eine Spitze am **01.10. (59)** und **02.10. (36)**, danach 5–14 pro Tag. Ob das echte
Menschen sind (Vorschau-Links, In-App-Browser, Bots, die Shopify als Mensch zählt), ist **nicht belegt** — Plan-Punkt 14.10.
Die Spitze fällt in den Tag des Grow-Plans (01.10.); ein Zusammenhang ist eine Vermutung, keine Messung.

## 3. Käufe (Shopify-Bestellungen seit 19.09., ohne Test/Storno; Kunden-IDs nicht im Bericht)

| Bestellung | Datum (UTC) | CHF | Status (12.10. 00:50) | Fenster |
|---|---|---:|---|---|
| #1019 | 27.09. | 0.00 | **erstattet** | vorher |
| #1020 | 29.09. | 36.90 | bezahlt | vorher |
| #1021 | 30.09. | 45.90 | bezahlt | vorher |
| #1022 | 03.10. | 80.82 | bezahlt | nachher |
| #1023 | 11.10. | 63.81 | bezahlt, CJ-Auftrag «Pending» (bezahlt, unversandt) | nachher |
| #1024 | 11.10. | 40.12 | bezahlt, **manuell**: Bügeltransfer bei Mister DTF (kein CJ) | nachher |

Summen (GEMESSEN): vorher **2 Käufe · CHF 82.80** (+1 erstattet) → nachher **3 Käufe · CHF 184.75**.
Die Sitzungs-Käufe (2 nachher) und die Bestellungen (3 nachher) weichen um eine ab — die Zuordnung läuft über
Sitzungen, nicht über Bestellungen. **Maßgeblich sind die Bestellungen.**
Eigene Testkäufe sind **nicht** herausgerechnet (`EIGENE_KUNDEN_IDS` ist leer). Alle sechs Kunden haben genau eine
Bestellung (`numberOfOrders = 1`), eine Mehrfach-Eigenbestellung kommt in diesem Fenster also nicht vor.

## 4. Ausgangsmessung 01.10. ↔ heute

| Kennzahl | 01.10. | heute | Bemerkung |
|---|---:|---:|---|
| Menschliche Sitzungen (7 T) | 115 | 177 | andere Fenster, siehe Abschnitt 1 |
| Startseite (7 T) | 46 | 34 | gesunken; Ursache nicht gemessen (Verdacht: Werbetest-Ende 04.10.) |
| Top-29-Produktseiten mit Bewertung | 2 | **5** | Tag-9-Import (echte CJ-Kommentare), Metafeld `reviews.rating_count` |

## 5. Was der Plan gebracht hat — ehrlich

- **Gebracht und messbar:** Bewertungen auf den meistbesuchten Seiten (2 → 5); Startseite mobil (Tag 11: 38 statt 150
  Bilddateien, GEMESSEN am 08.10.); Kaufweg am Handy (10.10., Preis im ersten Bildschirm); Lieferzeit-Kasten mit
  Liechtenstein (10.10.); Kollektionen für Saison- und Suchbegriffe (Herbst, Weihnachten, Wichtel).
- **Nicht messbar bisher:** Käufe. Die Kaufquote hängt am Verkehr, und der Verkehr im Plan-Fenster war kalt
  (Werbetest: 548 Sitzungen → 8 Warenkörbe → 0 Käufe, Trichter-Test vom 10.10.; jetzt 144 → 2 → 0).
- **Offener Befund:** die Abendkleid-Seiten. Sirène und Aurora bekamen 104 TikTok-Sitzungen und kein Warenkorb.
  Die Leute kommen dort gezielt an — der Hebel ist die Seite, nicht der Verkehr.

## 6. Nächster Plan — «Kauf-Strecke» (13.–24.10.2026)

Jeder Tag: messen → ändern → nachmessen → hier abhaken. Was liegen bleibt, wandert weiter.

| Tag | Punkt | Messbar fertig, wenn … |
|---|---|---|
| 13.10. | **Abendkleid-Seiten** (Sirène, Aurora) prüfen: Preis, Grössentabelle, Lieferzeit, Bilder, Bewertungen, Versandsatz; Kaufweg am Handy (`tools/kaufweg_handy.mjs`) | Je Seite ein Ursachenbefund mit Zahl |
| 14.10. | **189 Produktsitzungen ohne Herkunft prüfen:** echte Menschen oder Vorschau-Bots? (Gerät, Land, Referrer, Spitze 01./02.10.) | Befund mit Zahl; bei Bots: Wächter statt Anzeige |
| 15.10. | Änderung an den zwei Seiten (Grössenhilfe, Lieferzeit, echte Bewertungen, Bilder) — live bei 390 px geprüft | Warenkorb-Quote der Seiten ≥ 3 % |
| 16.–20.10. | Täglich nachmessen: `python3 tools/webseite_bilanz.py` + Zeile KAUFWILLE in der Keepalive-Meldung | Warenkörbe je Tag gegen den Vortag |
| 21.10. | Warenkorb-Mail (Flow `XEGbTB`, live seit 10.10.): wie viele Empfänger nach Mail 1 bezahlt haben | Zahl, auch wenn klein |
| 22.10. | Bewertungen auf den 29 Top-Seiten: ≥ 10 — nur echte CJ-Kommentare, nie erfundene | ≥ 10 von 29 |
| 24.10. | **Bilanz 2**, gleiches Schema, Fenster 12.–24.10. gegen 01.–11.10. | `dropship/WEBSEITE-KAUFSTRECKE-BILANZ.md` |

## 7. Offen — Betreiber-Klicks

- **#1024 bei Mister DTF bestellen** (manuell, kein CJ). Die Druckdateien wurden dem Betreiber direkt geschickt
  (Notiz 11.10.). Die Marge ist knapp (Notiz 11.10.: ca. CHF 2). A5 steht seit 11.10. auf 35.90.
- **Bügeltransfer A5** streichen oder dauerhaft bepreisen (Entscheid offen seit 11.10.).
- **Versandbanner «ab CHF 50»** gegen die Kasse-Schwelle 45: Entscheid des Betreibers (Notiz 11.10.).
- **Google Ads**, Produktgruppe «Alles andere»: 24 Sitzungen auf fremden Produkten, 0 Warenkorb (seit 11.10. offen).

## 8. Befehle

```
python3 tools/webseite_bilanz.py                              # Bilanz: Trichter, Käufe, Bewertungen
python3 tools/werbetest_trichter.py                           # Trichter je Kampagne (30 T)
python3 tools/werbetest_trichter.py sirene-test 14            # eine Kampagne je Tag
EIGENE_KUNDEN_IDS=123,456 python3 tools/webseite_bilanz.py    # eigene Testkäufe herausrechnen
```
