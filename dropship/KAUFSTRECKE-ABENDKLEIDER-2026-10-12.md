# Kauf-Strecke Tag 1 — Abendkleid-Seiten «Sirène» und «Aurora» (vorgezogen auf 12.10.2026, «weiter verbessern»)

Plan-Punkt 13.10. aus `dropship/WEBSEITE-12-TAGE-BILANZ.md` §6: «Je Seite ein Ursachenbefund mit Zahl».

## Ergebnis in einem Satz
**Die Seiten scheitern nicht am Inhalt, sondern am Verkehr.** Seit 05.10. hatten beide Seiten 0 Sitzungen. Davor kamen
104 von 123 Sitzungen (90 T) aus einer einzigen TikTok-Werbewelle (01.–04.10.), und aus der Welle entstand kein Warenkorb.
Bei Google sind beide Seiten unsichtbar: 0 Impressionen in 3 Monaten.

## GEMESSEN je Seite

| | Sirène (CHF 49.90, 8 Varianten) | Aurora (CHF 69.90, 30 Varianten) |
|---|---|---|
| Sitzungen 90 T (Menschen) | 69 · Warenkorb 1 · Kasse 1 · Kauf 0 | 54 · Warenkorb 1 · Kasse 1 · Kauf 0 |
| davon TikTok 01.–04.10. | 58 → 0 Warenkorb | 46 → 0 Warenkorb |
| Sitzungen seit 05.10. | 0 | 0 |
| Google-Index (Search Console, `inspect_urls`) | **«Crawled – currently not indexed»**, letzter Crawl **18.08.** (vor der Textüberarbeitung vom 10.10.) | indexiert, letzter Crawl 27.07. |
| Google-Suche 3 Mt. (Search Console) | 0 Impressionen | 0 Impressionen |
| Google-Kanal (product.feedback) | im Kanal; nur «Missing shipping info [LI]» + Shopping-Ads-Kapazität | keine Meldung |
| Bewertungen | 0 | 0 |
| Handy 390 px: erster Bildschirm | **nur das Foto** (Hauptbild 1252×1920, Hochformat 0,65): Titel, Preis, Knopf erst darunter; Knopf bei y=1528 | Titel + Preis sichtbar (Hauptbild quadratisch); Knopf bei y=1225 |
| Kaufweg bis Kasse | geht · Warenkorb «Gratis-Versand gesichert» · Kasse 30. Okt–13. Nov | geht · gleich |

## Gegenprobe zur naheliegenden Vermutung
«Hochformat-Hauptbild drückt Preis und Knopf unter den Rand → weniger Warenkörbe» — **am eigenen Bestand widerlegt**:
Von den 60 meistbesuchten Produktseiten (30 T) haben 5 ein Hauptbild höher als 4:5. Sie hatten 114 Sitzungen und 2 Warenkörbe
(1,8 %), die übrigen 54 Seiten 202 Sitzungen und 2 Warenkörbe (1,0 %). Bei diesen Zahlen trennt das Bildformat nichts.
→ Kein Bildtausch (er hätte nur eine neue Google-Bildprüfung ausgelöst).

## Nebenbefunde (Klasse, nicht nur diese zwei Seiten)
1. **Liechtenstein bei Google ohne Versandangabe: 28'226 Produkte** («Missing shipping info … [LI]»). In Shopify gibt es den
   Tarif seit 09.10. (General profile, Zone «Liechtenstein» CHF 14.90). Bisher riet der Google-Bericht, LI im Merchant Center
   zu entfernen («Shop liefert nur CH», Stand 22.09.). Das war seit 09.10. falsch.
   **Behoben:** `google_feedback_wache.py` misst die Lieferländer jetzt live aus Shopify Markets (`lieferlaender()`) und weist
   Meldungen für ein weiteres Lieferland eigens aus (`teile_ausland()`, Kanarienvögel 11/11). Die Ampel zeigt
   «LI: 28230 ohne Google-Versandangabe». Der Klick selbst ist ein Betreiber-Klick (siehe unten).
2. **Strukturierte Daten (Search Console, 5 Seiten geprüft):** Breadcrumbs «Unnamed item» auf allen geprüften Seiten.
   Merchant-Listing-Warnungen (description/shippingDetails/hasMerchantReturnPolicy je Variante): Die Live-Seite sendet
   heute Rückgabe- und Versandangaben auf Organisationsebene, die Crawls sind 1–11 Wochen alt. Beides sind nur Warnungen.
   Die Breadcrumbs wären ein Theme-Eingriff (Theme gesperrt) → offen.

## Was das für 15.10. heisst
Die Änderung «Grössenhilfe, Lieferzeit, echte Bewertungen, Bilder» kann ohne Besucher nicht gemessen werden: Ziel
≥ 3 % Warenkorb-Quote braucht Sitzungen. Reihenfolge deshalb:
1. Verkehr auf die Seiten bringen, ohne Geld: Sirène muss in den Index (neuer Crawl nach der Textüberarbeitung). Interne
   Links von oft gecrawlten Seiten helfen dabei. Eine Messung an Sirène zeigt die Wirkung: `inspect_urls`, Feld `lastCrawlTime`.
2. Werbung erst wieder mit einer Produktgruppe nur für das Kleid (Google Ads «sirene-test»: 24 Klicks, alle auf fremde Produkte).

## Betreiber-Klicks (nur diese)
- **Google & YouTube → Einstellungen → Versand neu importieren** (sonst im Merchant Center einen Versandservice für
  Liechtenstein, CHF 14.90, anlegen). Nicht das Land entfernen. Wirkung = Zahl «LI: …» beim nächsten Scan.
- Google Ads «sirene-test» bleibt pausiert, bis die Produktgruppe nur das Kleid enthält.

## Befehle
```
python3 tools/werbetest_trichter.py sirene-test 14
/opt/node22/bin/node tools/kaufweg_handy.mjs --produkt abendkleid-sirene-high-slit-meerjungfrau-mit-schleppe --aus /tmp/kw
python3 automation/google_feedback_wache.py --kanarienvogel      # 11/11
python3 automation/google_feedback_wache.py --umrechnen          # Bericht ohne Neuscan, Lieferländer live
```

---

# Kauf-Strecke Tag 2 — «Produktsitzungen ohne Herkunft»: Menschen oder Programme? (vorgezogen auf 12.10.)

Plan-Punkt 14.10.: «Befund mit Zahl; bei Bots: Wächter statt Anzeige».

## GEMESSEN (ShopifyQL, Shopify zählt alle als «human»)
- Seit 01.10.: 195 Produktsitzungen ohne utm. Davon 135 ganz ohne Referrer, 36 von Facebook (Beiträge ohne utm),
  22 von Google, 2 von Pinterest. Fast alle am Handy (180 von 195), davon 144 aus der Schweiz.
- **01.10. 21:00 UTC: 41 Sitzungen in einer Stunde, auf 41 verschiedenen Produktseiten**, jede genau 1×. Mit den
  9 «social»-Sitzungen derselben Stunde sind es genau 25 iOS und 25 Android. Die Orte reichen von Aarau über Madrid, Istanbul und Niš
  bis Norridge (USA). 0 Warenkörbe. Mit der TikTok-Welle derselben Tage hängt es nicht zusammen (Korrelation je Stunde
  r = −0,01, n = 55).
- Dasselbe Muster seit September: 03.09. 09h (24 auf 24 Seiten), 05.09. 07h (16/16), 13.09. 21h (12/10), 14.09. 20h (14/14)
  u. a. — **10 Stunden, 143 von 438 Produktsitzungen ohne Herkunft (33 %)**, alle ohne Warenkorb.

## Urteil
Das sind keine Kundinnen. Ein Mensch öffnet nicht in einer Stunde 41 verschiedene Produkte über 41 getrennte Sitzungen.
Es ist ein Abgraser (Spionage-Werkzeug oder Katalog-Prüfer) mit Handy-Kennung und wechselnden Adressen. Wer, ist nicht
belegt. Die übrigen Sitzungen ohne Herkunft (295) bleiben Menschen, bis etwas anderes gemessen ist.

## Wächter (statt Anzeige)
- `tools/botwellen.py`: Regel (SETZUNG, an 5 Wellen kalibriert) — eine Stunde ist eine Welle bei ≥ 6 Produktsitzungen
  ohne utm/Referrer, ≥ 80 % davon auf verschiedenen Seiten, 0 Warenkörbe. Gegenprobe: Werbewelle auf 3 Seiten → keine
  Welle; ein Warenkorb → Mensch. Selbsttest 8/8.
- `tools/webseite_bilanz.py` weist je Fenster eine Zeile «ohne Bot-Wellen» aus. Nichts wird gelöscht.

## Was die Bereinigung an der Bilanz ändert
| Fenster | Sitzungen | Warenkorb-Quote |
|---|---:|---:|
| vorher 19.–30.09. | 190 | 5,3 % (keine Welle im Fenster) |
| nachher 01.10.–12.10. | 523 | 1,3 % |
| nachher **ohne Bot-Wellen** | 466 (−57) | **1,5 %** |

**Die Programme erklären nur einen kleinen Teil des Rückgangs.** Der grosse Teil bleibt die TikTok-Werbung
(144 Sitzungen, 2 Warenkörbe) — Befund der 12-Tage-Bilanz bestätigt, nicht widerlegt.

## Befehle
```
python3 tools/botwellen.py                          # Wellen seit 01.09.
python3 tools/botwellen.py "SINCE -7d UNTIL today"
python3 tools/botwellen.py --selbsttest             # 8/8
python3 tools/webseite_bilanz.py                    # Bilanz mit Zeile «ohne Bot-Wellen»
```
