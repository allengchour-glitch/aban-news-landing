# «Variante: Standard» und besuchte Seiten ohne Auswahl (09.10.2026, Betreiber «verbessere mehr»)

## Gemessen

**1. Besuchte Seiten ohne Auswahl**
- 812 besuchte Produktseiten (Landeseiten, 90 Tage, 1'036 Sitzungen) sind aktiv, haben **eine** Variante und eine CJ-SKU.
- Gemessen waren davon erst 16.
- Bei den ersten 11 neu gemessenen führt CJ bei 7 mehrere Varianten.

**2. Die Messung brach nach 11 Seiten ab:** «CJ antwortet nicht». Grund war ein einzelnes Produkt mit der SKU
`CJ-CJJJJTJT22925`.
- `cj_stecker_pruefen.cj_url()` kannte diese Form nicht und gab `None` zurück.
- `cj(None)` versuchte es achtmal und beendete dann den ganzen Lauf.
- 22 von 812 SKUs hatten eine unbekannte Form:
  - klein geschrieben `cj-CJLX2935543`
  - CJ + 6 Buchstaben + Ziffern
  - mit Varianten-Anhang `-default`, `-Brown`, `-Pumpkin`
- Bestell-Automat und Versandprüfung kannten diese Formen schon. Nur der Zwilling in der Auswahl-Messung nicht.

**3. Der Nachrüster lehnte alle Neuimporte ab: «Produkt trägt schon eine echte Option: Variante».** Im Probelauf über die
besuchten Seiten traf das 19 von 40.
- Die CJ-Importer legen Nicht-Mode-Ware mit der Platzhalter-Option **«Variante»** und dem einzigen Wert **«Standard»** an.
- Der Nachrüster kannte als Platzhalter nur Shopifys «Title / Default Title».
- Damit hätte auch der Neuimport-Wächter von 20:55 gemessen, aber nichts umgebaut.

**4. Die Kundin sah ein Wahlfeld mit einem Knopf.** Shopify wertet nur «Title / Default Title» als «keine Auswahl»
(`hasOnlyDefaultVariant`).
- Auf der Produktseite stand **«Variante: Standard»** als Auswahl, in den Spezifikationen nochmals «Variante: Standard».
  Geprüft per WebFetch an `handpumpen-pumpe-fur-autos-779e8d`.
- Im Optionen-Export von 04:28 hatten **1'063 Produkte** diesen Platzhalter.

## Getan

**Quelle (Importer):** `cj_category_fill.mjs`, `cj_trending_import.mjs` und `cj_sku_import.mjs` legen den Platzhalter jetzt als
**«Title / Default Title»** an.
- Vorher an einem Wegwerf-Entwurf getestet: `hasOnlyDefaultVariant: true`, Entwurf danach gelöscht.
- `node --check` 3/3.
- Laufende Runner übernehmen den Code beim nächsten Container-Neustart.

**Bestand:** `automation/platzhalter_option.py` (neu).
- Kandidaten kommen aus dem Optionen-Export und werden live nachgelesen. Bedingung: genau eine Option «Variante» = [«Standard»],
  genau eine Variante, kein Editor/POD.
- Dann `productOptionsDelete(POSITION)` und Rücklesen: `hasOnlyDefaultVariant`, dieselbe Varianten-ID, SKU und Preis
  unverändert.
- Stichprobe 5/5 ok. Live per WebFetch: kein Wahlfeld mehr, Preis CHF 41.90 und Warenkorb-Knopf unverändert.
- Dann der ganze Bestand: **1'062 ok, 0 Fehler** (21:37–22:07 UTC). Einer war schon «live anders», die Hundeschüssel, die zuvor umgebaut worden war.
- Wächter im Aufseher läuft täglich und fängt Nachzügler (Runner mit altem Code).

**Nachrüster:** `auswahl_nachruesten.py` erkennt «Variante / Standard» als Platzhalter und entfernt ihn vor
`productOptionsCreate`, mit Rücklesen des Live-Zustands. Test an «Silikon-Hundeschüssel Doppel»: 3 Farben × 2 Grössen,
6 Varianten mit exakter CJ-SKU, Bild je Variante, S CHF 17.90 / M CHF 25.90, alle kaufbar.

**Besuchte Seiten zuerst:**
- `automation/auswahl_besucht_liste.py` (neu) schreibt `dropship/_klassen/auswahl-besuchte-seiten.txt`, sortiert nach
  Sitzungen.
- Der Aufseher erneuert die Liste täglich und misst sie **vor** allen anderen Listen.
- Der Nachrüster nimmt diese Produkte per `VORRANG=` zuerst, der Rest bleibt «jüngste Messung zuerst».
- Lauf in dieser Session: Messung und Umbau besuchte Seiten 21:35–23:07 UTC: 246 von 812 gemessen (Zeitgrenze), davon **190 mit mehreren CJ-Varianten (77 %)**; **62 umgebaut, 40 MANUELL, 0 Fehler** (z. B. Weisse Vintage-Sandalen Farbe 2 × Grösse 6, Smartwatch Outdoor 4 Farben, Duschvorhang 6 Modelle × 2 Grössen). Die MANUELL-Fälle sind meist «KI-Übersetzung abgelehnt» oder «schon umgestellt?». Der Aufseher macht stündlich weiter.

**SKU-Formen:** `cj_url()` kennt jetzt alle drei neuen Formen, 22/22 werden aufgelöst. Die alten Formen geben dieselbe Adresse
wie vorher. Getestet an `CJJJJTJT22925`: CJ antwortet «Wood grain aroma diffuser», 16 Varianten.
`auswahl_fehlt_messen.py` überspringt eine unbekannte Form künftig für das einzelne Produkt, statt den Lauf zu beenden.

## Offen

- **«KI-Übersetzung fehlt/abgelehnt»** ist der häufigste MANUELL-Grund bei den besuchten Seiten. Beispiele: «Smoky Gray»,
  «Lake Blue», «Brown / Beagle», «Single Bowl / Set». Diese Produkte bleiben 7 Tage gemerkt. Eine Prüfung, ob die
  Zweitprüfung zu streng ist, ist eine eigene Klasse.
- **Altbestand ohne Besuche:** rund 28'000 Ein-Varianten-Produkte, ungemessen. Sie laufen über die Klassenliste nach und nach.
- **Einwertige echte Optionen** («Grösse: 38 × 38 cm» 30×, «Farbe: Wie abgebildet» 5×) zeigen ebenfalls ein Wahlfeld mit einem
  Knopf. Sie tragen aber eine Information (Mass). Klein, nicht angefasst.

## Lehre

**Platzhalter müssen die Form haben, die die Plattform als Platzhalter kennt.** «Variante / Standard» sieht in der eigenen
Datenbank harmlos aus. Für Shopify ist es eine echte Option, also ein Wahlfeld für die Kundin. Und jedes Werkzeug, das korrekt
nach «Default Title» fragt, schliesst die Ware aus.

**Ein einzelner unbekannter Datensatz darf keinen Lauf beenden.** «Nicht erreichbar» und «nicht verstanden» sind verschiedene
Zustände. Nur das Erste ist ein Grund aufzuhören.
