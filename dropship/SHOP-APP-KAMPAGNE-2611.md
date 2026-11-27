# Shop Campaigns + Shop-App, 26.11.2026 (Betreiber: «shop campagne aufpimpen und shop app»)

Quelle: Workflow `shop-campaign-app-pimpen` (3 Recherchen, 3 Gegenprüfungen). Rohdaten: Journal 26.11. «🛍️».

## Gemessen
- Die Shop-App ist Kanal Nr. 2: 4 Bestellungen über die Kampagne (#1037, #1040, #1047, #1048), alles Neukunden, CHF 142.60, Ausgaben CHF 25.92, ROAS 5.5, CHF 6.48 je Neukunde. 3 von 4 waren Uhren. Keine Rabatte; die Kampagne zahlt mit Shop Cash.
- Mehr Budget bringt nichts: Genutzt sind ~13 % von CHF 100 im Monat. Die Reichweite hängt am **Kundenerlebnis** mit 6 Signalen über 90 Tage. Gemessen: Erfüllung in 96 h nur 58 %, Tracking 24/26, gemeldete Zustellung 1/26, nicht erstattet 82 %, nicht storniert 97 %.

## Von der Sitzung erledigt
1. Gesperrt (DRAFT, umkehrbar):
   - Lederbearbeitungs-Set: Messer im Hauptbild, Klingenregel 16.09.
   - Doppler zur Fetalmessung und Atmungsübungsgerät: Medizinprodukte.
   - Rohrreiniger: ätzend (NaOH + Hypochlorit), Gefahrgut.
   - **Anti-Aging Augencreme:** Die CJ-Bilder zeigen das Markenprodukt «Paula's Choice RESIST Anti-Aging Eye Gel». Gefahr einer Fälschung.
2. Regeln erweitert, damit neue Importe gleich erkannt werden: Klingenregel (Ledermesser, Leder-Sets mit Schneiden/Trimmen), Medizinregel (Doppler/Fetal, Atmungsübung).
3. «Geschenkideen unter CHF 30» (5'148 Produkte) im Shop-Kanal freigegeben. Damit ist die Kollektion in der Shop-App wählbar.
4. Knopf «Follow on Shop» in der Fusszeile eingebaut (`automation/follow_on_shop_patch_2611.py`). Er erscheint nur, wenn Shopify die Funktion für den Shop freigibt; am 26.11. war er live noch nicht sichtbar.
5. Quarzuhr (#1048): Suchmaschinen-Beschreibung ergänzt.
6. CJ-Grind: bekommt jetzt auch während der Kosten-Neurechnung einen festen Anteil der CJ-Abrufe (`cj_takt.mjs`, 1 Abruf je 6 s).

## Für dich (Betreiber)
1. **#1047 Augencreme entscheiden:** Die Bestellung ist bei CJ bezahlt und noch nicht versandt. Kommt eine gefälschte Markentube, kann der Schweizer Zoll sie beschlagnahmen. Dann ist die Kundin verärgert und es droht eine Erstattung.
   - Weg A: In CJ fragen, ob die Tube ohne Marke kommt.
   - Weg B: Bestellung stornieren und erstatten.
   - Sag «1047 A» oder «1047 B», dann erledige ich den Rest.
2. **Reichweiten-Status ansehen (1 Minute):** Admin → Vertriebskanäle → Shop → Advertising.
   - Kein Banner: Status «Good», nichts zu tun.
   - Banner «Your ad reach is significantly limited»: auf «View improvements» klicken und mir die 6 Werte als Screenshot schicken.
3. ~~CJ-Zahllinks am selben Tag zahlen = stärkster Hebel~~ **Korrigiert 27.11.: Zahlung ist kein Engpass (22/25 LX-Aufträge ≤ 1 h nach Anlage bezahlt). Engpass ist die CJ-Lagerzeit (7 von 11 Verspätungen: #1021, #1029, #1034, #1038, #1039, #1042, #1044).** Sync-Verzug (#1041) ist seit 27.11. behoben (Fulfill-Sync über die ganze CJ-Liste). Die Lagerzeit wird ab jetzt nur gemessen (`dropship/_cj_versandoptionen.tsv`), Urteile erst bei n ≥ 20 je Lager.
4. **Shop-Store gestalten** (geht nur im Admin): Shop → Store → Customize.
   - Unter «Categories» (bis 12) in dieser Reihenfolge eintragen: Uhren, Smartwatches, Weihnachten 2026, Geschenke für Sie, Geschenke für Ihn, Geschenkideen unter CHF 30, Schuhe, Wohnen & Dekoration, Blitzversand Schweiz, Gerade im Trend.
   - Unter «Header» das Logo (quadratisch, mind. 512 px) und ein Hintergrundbild (1080×1170) setzen.
5. Shop → Catalog → «Ineligible products» öffnen und mir einen Screenshot der Gründe schicken.
6. Lassen, wie es ist: Budget CHF 100/Monat, Ziel-ROAS 4, Freigabe nötig für Autopilot-Taktiken. Taktiken mit Sonderpreis über 15 % ablehnen.
7. NICHT einschalten: «Ads on other platforms» (gibt es für die Schweiz nicht). NICHT abschalten: «Sell directly on Shop» und «Shopify Network Intelligence».
