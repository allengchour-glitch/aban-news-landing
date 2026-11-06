# Preise «Selbst gestalten» nach der Preisformel (05.11.2026, LIVE)

**Besitzer 05.11.2026 abends: «zu allem ja»** (auf meine Frage, ob die Preise der 38 Bestandsprodukte nach der neuen Formel steigen sollen, samt den Setzungen der Formel: Kurs 0.90, Mindestgewinn CHF 4.00, Faktor 2.3, Aufschlag CHF 12).

**LIVE 05.11. ca. 21:00 UTC (GEMESSEN):** 203 von 334 Shop-Varianten (37 Produkte, 31 aktiv) angehoben, Summe +CHF 385.00; alle 203 frisch zurückgelesen GLEICH dem Soll, zweiter Trockenlauf danach «ANHEBEN 0», Storefront bestätigt (Magnet 16.90/17.90/19.90 statt ab 7.90, Keramik-Tasse 22.90/23.90/25.90). 114 Varianten blieben gleich. **17 Varianten, bei denen die Formel einen tieferen Preis ergäbe, wurden NICHT gesenkt** (Senkungen waren nicht besprochen).
- Rechnung: `../werkzeuge/preisformel.mjs` (Kosten = Printful-Ware + Versand nach CH, Umrechnung mit Kurs 0.90, MWST 8.1 % und Zahlungsgebühr 3.4 % + 0.30 abgezogen, Endpreis X.90). Eingabe `../werkzeuge/preise_gegenprobe.json` (Printful-Katalogpreis, `estimate-costs`, Versandrate, gemessen 05.11.).
- **MWST-Status des Shops: UNBEKANNT.** Die Formel rechnet vorsichtig mit MWST-Pflicht (Preise sind Endpreise inkl. 8.1 %). Ist der Shop nicht MWST-pflichtig, sind die Preise etwas höher als nötig (nur anheben, nie senken, bleibt also sicher).
- Grösste Sprünge: Magnet 7.90 → 16.90 (bisher echter Verlust bei Einzelkauf: Printful-Kosten über dem Preis), Kissen 32.90 → 39.90, Kuscheldecke 44.90 → 51.90, Strandtuch 54.90 → 60.90, Kiss-Cut-Aufkleber 14.90 → 17.90. Wirkung auf Verkäufe: unbekannt (Hypothese: gering, Kontrolle nach 7 Tagen).
- **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/selbst-gestalten-fertig-0511/preise/apply.mjs` (setzt nur Varianten zurück, deren Preis noch dem neuen Wert entspricht; fremd Verändertes bleibt). Sicherung `sicherung.json` (203 Zeilen mit alt/neu).
- Skript: `apply.mjs` (Trockenlauf Vorgabe, `LIVE=1`), Planung `plan.mjs`, Test `plan_test.mjs` (7 Prüfungen).
- **Aufpreise für Zusatzplatzierungen** (Rückseite, Ärmel, Stickerei) sind in den Bestandsprodukten noch nicht angeboten; die Formel nimmt sie 1:1 mit, sobald die Fabrik Produkte mit mehreren Platzierungen anlegt.
