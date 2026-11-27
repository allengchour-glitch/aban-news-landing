# «push für mehr einkäufe» (Betreiber 27.11.2026)

Quelle: Workflow `mehr-einkaeufe-push` (1 Messung, 5 Blickwinkel, 5 Skeptiker). Urteile im Wortlaut: `urteile-workflow.txt`.

## Gemessen (27.11. ~09:45 UTC)
- **Schweiz, 7 T:** 318 Sitzungen → 13 Warenkörbe → 10 an der Kasse → 2 Käufe. **30 T:** 1'345 → 67 → 36 → 11 (CR 0,82 %).
- Dazu 5 Bestellungen über die **Shop-App**; diese tauchen im Sitzungs-Trichter nicht auf.
- Heute 758 Bot-Sitzungen aus China, die die Gesamtzahlen verzerren.
- **ChatGPT** bringt die besten Warenkörbe (7,7 %), **Google** die beste Kaufquote (1,8 %). Social bringt kaum etwas (94 Sitzungen in 30 T, 0 Käufe).
- **Black Week:** Rabatt bisher 0× genutzt. In 14 T lag keine Bestellung über CHF 47.80, im Schnitt CHF 31.80.
- **BF-Mail:** an 17 Personen, 1–2 Öffnungen, 0 Klicks.
- **Abbruch-Mail 1:** 5 von 10 Mails kamen nicht an. Die Sendedomain ist nicht bestätigt.

## Von der Sitzung erledigt (27.11.)
1. **Black-Week-Seite neu sortiert:** zuerst die 4 Artikel ab CHF 80, dann die Artikel ab CHF 40, dazu der Satz «Die ersten vier Artikel erreichen den Rabatt allein, ab CHF 40 reichen zwei.»
   - Sicherung: `dropship/black-week-2411/reihenfolge-vor-2711.json` und `beschreibung-vor-2711.html`.
2. **Warenkorb:** «🖤 Noch CHF X bis 15 % Black-Week-Rabatt» ab CHF 40 Warenwert, oder «Rabatt ist aktiv».
   - Schaltet sich am 30.11. um 22:59:59 UTC selbst ab.
   - Skript: `automation/bw_warenkorb_hinweis_2711.py`, Rückweg mit `--zurueck`.
3. **Produktseite:** Vertrauenszeile und Zahlarten stehen jetzt direkt unter «In den Warenkorb». Der Weihnachts-Lieferhinweis steht davor.
   - Betrifft 3 Vorlagen, der Editor ist unberührt.
   - Skript: `automation/pdp_vertrauen_reihenfolge_2711.py`, Rückweg mit `--zurueck`.
4. **Ankündigungsleiste:** Platz 2 heisst jetzt «🇨🇭 Schweizer Shop · TWINT · Klarna (Rechnung) · 30 Tage Rückgabe (ausser selbst gestaltete Artikel)».
   - **«Inkl. MwSt.» → «Preise in CHF.»** an 15 Stellen, weil der Shop nicht MWST-pflichtig ist.
   - Skript: `automation/vertrauen_leiste_mwst_2711.py`.
5. **Abbruch-Mail 1** (Klaviyo-Vorlage RfQt4V) zeigt jetzt bis zu 3 Produkte aus dem Warenkorb mit Bild, Menge und Variante. Mit Testdaten geprüft.
   - Sicherung: `dropship/verkauf-2511/klaviyo-RfQt4V-vorher-2711.html`.
6. **Reel-Bildtexte:** «Gratis Versand ab CHF 50 nach Rabatt» (`bild_reel.py`, `cj_video_reel_engine.mjs`). Selbsttest ok.

## Bewusst nicht gemacht
- **Black-Week-Schwelle 80 → 60:** Das würde vor allem Rabatt an Leute verschenken, die ohnehin kaufen. Gemessen: 2 von 14 Körben lagen über CHF 60.
- **2. BF-Mail:** Die erste ging an 17 Personen und brachte 0 Klicks.
- **Zusatzartikel im Warenkorb:** Die meisten springen erst an der Kasse ab, nicht im Warenkorb.
- **Heizdecken-Umleitung auf die Hoodie-Decke:** Die Hoodie-Decke ist nicht beheizt. Die Umleitung auf die Heizdecken-Kollektion bleibt.
- **Zustellereignisse an Shopify melden:** Erst messen, ob die CJ-Zustellungen innerhalb von 10 Tagen ab Versand kommen. Sonst schadet die Meldung dem Shop-Campaign-Signal.

## Nächste Sitzungs-Schritte
- Nagel-Seiten: Angabe zur UV-Lampe und Lieferumfang (aus CJ-Daten).
- Gewitterwolken-Licht: falsche Masse und Stromangabe korrigieren.
- Thermo-Strumpfhose: Auswahl ordnen.
- Ab 01.12.: Abbruch-Mail ohne Wegwerf-Adressen versenden.
- Ab 01./02.12.: FAQ-Runde 3 für ChatGPT-Kollektionen.

## Für den Betreiber
1. **Klaviyo-Sendedomain bestätigen** (Namecheap → luxestyle.ch → Advanced DNS → 4 neue Einträge):
   - CNAME `send` → `3848818023763335087.klaviyodns.com`
   - CNAME `mtd1._domainkey` → `mtd1._domainkey.3848818023763335087.klaviyodns.com`
   - CNAME `mtd2._domainkey` → `mtd2._domainkey.3848818023763335087.klaviyodns.com`
   - TXT `@` → `klaviyo-site-verification=XWqMAD` (als zusätzliche TXT-Zeile)

   SPF und _dmarc nicht ändern. Danach bestätigt die Sitzung die Domain bei Klaviyo.
2. **«Stufe 3 ja»:** 578 Artikel ab Schweizer Lager (vor allem Spielzeug) zeigen dann ein kurzes Lieferdatum vor Weihnachten statt «11.–25. Dez.».
   - Kosten: Reine CH-Lager-Körbe unter CHF 50 werden versandkostenfrei (bis CHF 7 weniger je Bestellung).
3. **Geschenkkarte?** Ja/Nein, Beträge (Vorschlag CHF 25/50/100) und Gültigkeit (Vorschlag 2 Jahre). Damit gibt es einen Ausweg für alle, die Weihnachten zu knapp wird.
4. **Shop-App** (Erinnerung): Advertising-Banner, «Ineligible products» und Store-Kategorien, siehe `dropship/SHOP-APP-KAMPAGNE-2611.md`.
5. **Trustpilot-Profil:** Land von «United States» auf Schweiz ändern, Adresse und Beschreibung eintragen.
