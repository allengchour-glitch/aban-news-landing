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
2. ✅ **Abgelesen 27.11. (Betreiber-Screenshot, Shop → «Werbung»): KEIN Banner «Anzeigenreichweite stark eingeschränkt».** Autopilot-Kampagne aktiv seit 03.10. (54 T): Ausgaben gesamt CHF 33.92, Umsatz CHF 177.50, ROAS 5.23; 7 T: 3 Bestellungen, Ø CHF 31.23; Tagesbudget 24 (heute 0 verbraucht), Ziel-CAC 8, Zielbestellwert 16, 3 Kanäle (Shop, Produkt-Netzwerk, andere). **Entscheid gemäss Tor: Zustell-Melder (fulfillmentEventCreate DELIVERED) bleibt AUS.** **27.11. ~20:15 UTC Betreiber-Screenshot «Campaign Autopilot» (Growth → Autopilot): CAC auf CHF 12.00 gesetzt, Ziel-ROAS 4x, Monatsbudget CHF 100 (34 ausgegeben, 66 übrig), Region CH, Deutsch, «Volle Autonomie», Kanäle Shop Campaigns + Messaging aktiv, Microsoft Advertising aus.** Bremse ist zusätzlich der Ziel-ROAS 4x (≈ höchstens CHF 7.80 je Bestellung bei Ø CHF 31) → Empfehlung: CAC 12 lassen, ROAS 4x → 3x (≈ CHF 10.40 je Bestellung); Monatsbudget 100 deckelt das Risiko. **Empfehlung 27.11. abends (Workflow mails-und-shop-push): Ziel-CAC 8 → 10** (Gewinn Ø CHF 16.24/Bestellung, 18 % Erstattungen abgezogen ≈ 13.30; bei CAC 10 bleiben ~3.30, ab 01.12. Mindest-Stückgewinn ~5.80; bisher kostete ein Neukunde nur CHF 6.48; CAC 12 ließe heute nur ~1.30). Shop-Kanal-Lücke gemessen: von 56'423 aktiven fehlen nur 43 auf Shop (39 gesperrt Shisha/Kamera, 1 Editor, 3 Neuware die cj_publish gleich nachlegt) — nichts zu publizieren; Werkzeug `automation/shop_kanal_luecke.mjs` (nur Shop-Publikation, Sperrlogik aus publish_guard, Ledger + --zurueck, Deckel 300). Bremse der Reichweite ist der Ziel-CAC 8, nicht das Budget — Anheben nur mit Betreiber-Ja. (Alt: Admin → Vertriebskanäle → Shop → Advertising; deutsch «Shop ⌄ → Werbung».)
   - Kein Banner: Status «Good», nichts zu tun.
   - Banner «Your ad reach is significantly limited»: auf «View improvements» klicken und mir die 6 Werte als Screenshot schicken.
3. ~~CJ-Zahllinks am selben Tag zahlen = stärkster Hebel~~ **Korrigiert 27.11.: Zahlung ist kein Engpass (22/25 LX-Aufträge ≤ 1 h nach Anlage bezahlt). Engpass ist die CJ-Lagerzeit (7 von 11 Verspätungen: #1021, #1029, #1034, #1038, #1039, #1042, #1044).** Sync-Verzug (#1041) ist seit 27.11. behoben (Fulfill-Sync über die ganze CJ-Liste). Die Lagerzeit wird ab jetzt nur gemessen (`dropship/_cj_versandoptionen.tsv`), Urteile erst bei n ≥ 20 je Lager.
4. **Shop-Store gestalten** (geht nur im Admin): Shop → Store → Customize.
   - Unter «Categories» (bis 12) in dieser Reihenfolge eintragen: Uhren, Smartwatches, Weihnachten 2026, Geschenke für Sie, Geschenke für Ihn, Geschenkideen unter CHF 30, Schuhe, Wohnen & Dekoration, Blitzversand Schweiz, Gerade im Trend.
   - Unter «Header» das Logo (quadratisch, mind. 512 px) und ein Hintergrundbild (1080×1170) setzen.
5. Shop → Catalog → «Ineligible products» öffnen und mir einen Screenshot der Gründe schicken.
6. Lassen, wie es ist: Budget CHF 100/Monat, Ziel-ROAS 4, Freigabe nötig für Autopilot-Taktiken. Taktiken mit Sonderpreis über 15 % ablehnen.
7. NICHT einschalten: «Ads on other platforms» (gibt es für die Schweiz nicht). NICHT abschalten: «Sell directly on Shop» und «Shopify Network Intelligence».
