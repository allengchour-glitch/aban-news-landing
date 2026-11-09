# Claude-Review: unabhängige Prüfung des Forschungslabors (09.11.2026)

**Auftrag:** «Unabhängiger Auftrag an Claude Code» in [README.md](README.md). Der Besitzer schickte am 09.11. abends nur den Link auf [INTEGRATION.md](INTEGRATION.md); Auslegung (meine, nicht bestätigt): die Prüfung durchführen.
**Geprüfter Stand:** Branch `codex/ki-bot-gemeinsam` @ `6834a207533d` (09.11. 21:48 UTC), `labor.py` sha256 `e64d5de6…a13fbf`, Kursdatei `tools/trading/daten/BTC-USD.json` sha256 `d17fbfe2…21d6df` (4 390 Tage, 17.09.2014 bis 23.09.2026).
**Nicht geprüft und nicht verändert:** der Handelsbot, Broker, Schlüssel, Futures. `labor.py` blieb unangetastet; ergänzt wurden nur Tests, Prüfskripte und dieses Dokument.

## Urteil in sechs Sätzen

1. **Der Rechenkern stimmt.** Eine eigene, unabhängig geschriebene Nachrechnung (Wertreihe je Tag statt nur Endwerte) weicht bei allen 36 Kombinationen (6 Strategien, 3 Kostenszenarien, 2 Zeiträume) um höchstens 1,8·10⁻¹⁵ von `labor.simulieren` ab. Zeitachse (Signal von t, Handel am Schluss von t+1, Rendite erst ab t+1→t+2), Kostenformel, Drift, Handelsband und Schlussliquidation sind wie beschrieben.
2. **Die Reproduktion gelingt.** Code-, Daten- und Protokoll-Hash sowie die Versuch-ID stimmen; die Zahlen sind unter Python 3.12 und 3.13 byte-gleich zu `ergebnis-v2.json`, unter 3.11 (Version des CI) weichen 28 Zeilen in der letzten Stelle ab (Befund F3).
3. **Die Tests waren löchrig.** Die 20 Tests laufen grün (2 s), erkennen aber nur **11 von 32** absichtlich eingebauten Fehlern in `labor.py` (Befund F1). Mit 14 neuen Regressionstests sind es **29 von 32** (die drei übrigen sind gleichwertig oder reine Gleichheitsgrenzen).
4. **Das Zukunftswissen-Messgerät hat eine Grenze:** ein Zwei-Tage-Leck an jedem 7. Tag besteht die Prüfung bei 4 von 7 Versätzen und bringt im Rechner +4 450 % bis +208 478 % (Befund F2).
5. **Die Zahlen belegen keine Überlegenheit.** Der «Konsens» hat dasselbe Sharpe-Verhältnis wie der einfache Trend 200 (0,72), ist also ein verkleinerter Trend 200; sein Vorteil kommt aus 2022; die Schätzung ist auf dem 95-%-Niveau nicht abgesichert (Deflated Sharpe Ratio 0,85 bis 0,91).
6. **Kein Blocker für das Zusammenführen:** nur Offline-Rechnung, `handelsfreigabe` bleibt immer `false`, nichts am Handelsbot. Echtgeld, Hebel und automatisches Hochstufen bleiben ausgeschlossen (Zone Rot in `docs/KRYPTO-AUTONOMIE.md`).

## Was geprüft wurde

| Prüfung | Ergebnis (GEMESSEN 09.11.2026) | Wie |
|---|---|---|
| Tests von Codex | 20 von 20 bestanden, 1,9 s, Python 3.11 / 3.12 / 3.13 | `python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor.py' -v` |
| Bericht reproduzieren | Hashes gleich, Zahlen byte-gleich ab 3.12, unter 3.11 nur letzte Stelle | `labor.py --stichtag 2026-10-29 --ausgabe …` und Vergleich |
| Unabhängige Nachrechnung | 36 von 36, grösste Abweichung 1,78·10⁻¹⁵ | `claude-pruefung/pruefung1.py` Teil 1 |
| Zahlen der README | stimmen, bis auf eine Rundung (F5) | Vergleich mit `ergebnis-v2.json` |
| Mutationsprobe der Tests | 11 von 32 erkannt (Codex' Tests), 29 von 32 (mit Regressionstests) | `claude-pruefung/mutation.py [--mit-regression]` |
| Gegenbeispiele zur Signalprüfung | Zwei-Tage-Leck an jedem 7. Tag besteht bei 4 von 7 Versätzen (F2) | `claude-pruefung/pruefung2.py` |
| Exposure gegen Timing | siehe unten | `pruefung1.py` Teil 3 und 4 |
| Unsicherheit | Alpha/Beta mit Block-Bootstrap, Deflated Sharpe, Parameter-Nachbarschaft | `claude-pruefung/pruefung3.py` |
| Daten | keine Ausreisser ausser zwei echten Ereignissen (2017-12-07 +25,2 %, 2020-03-12 −37,2 %), 1 Tag mit gleichem Schlusskurs wie am Vortag | `pruefung2.py` Teil C |

## Befunde (Eingabe, falsches Ergebnis, Empfehlung)

**F1 · mittel · Tests prüfen Eigenschaften, nicht Definitionen.** 21 von 32 Änderungen an `labor.py` blieben unbemerkt, zum Beispiel: Konsens verlangt nur eine der beiden Trendbedingungen statt beider (`and` → `or`); Trend 150 benutzt den Mittelwert über 200 Tage; Schwankung mit √252 statt √365 annualisiert; Risikoziel 20 % statt 25 %; Handelsband 5 % statt 10 %; Kaufkosten bei Teilquote falsch; Verkaufskosten mitten im Lauf fehlen; Umsatz ohne Schlusshandel; Stress-Kosten gleich Basis-Kosten; Datenhash über leere Bytes; Versuch-ID ohne Stichtag; eine einzelne fehlende Kerze in der Zeitreihe wird akzeptiert. In allen Fällen bleiben alle 20 Tests grün, die Berichtszahlen ändern sich aber. **Behoben** durch `test_labor_regression.py` (14 Tests, 2,4 s): zweite, aus der README abgeleitete Fassung der Signale, die Protokollwerte, Kosten bei Teilquote, Umsatz und Exposure, alle drei Kostenstufen, Periodengrenzen, Datenhash, Versuch-ID und der gespeicherte Bericht (Zahlen mit relativer Toleranz 1e-9, dadurch unabhängig von der Python-Version). Wer künftig `labor.py` absichtlich ändert, muss eine neue Protokollversion und eine neue `ergebnis-v<N>.json` anlegen. Der CI-Schritt im `Deploy Check` führt jetzt `test_labor*.py` aus.

**F2 · mittel · `signalpruefung` erkennt nicht jedes Zukunftswissen.** Eingabe: eine Strategie, die an jedem 7. Tag zwei Tage in die Zukunft schaut (`p[i+2] > p[i+1]`), alle sieben Versätze (`i % 7 == 0` bis `6`) probiert. Ergebnis: `signalpruefung` meldet bei **4 von 7 Versätzen `bestanden = True`** (Versätze 1, 2, 3, 5); im Rechner bringt das Leck **+4 450 % bis +208 478 %** (Versatz 5: +97 395,7 % bei 7,4 % Exposure). Jeden 97. Tag: `bestanden`, +43,4 %. Ursache: geprüft werden nur drei feste Präfixlängen (250, 400, Gesamtlänge − 1) und drei Historienlängen; ob ein Leck auffällt, hängt davon ab, ob es an den letzten Tagen dieser Präfixe gerade ein Signal verändert. Einordnung: ein Ein-Tages-Leck ist wegen der Ausführung am Folgeschluss im Rechner wirkungslos (−3,4 % bei Leck an jedem 97. Tag), ein Zwei-Tages-Leck nicht. Die echten Strategien des Labors sind kausal (Tests und Nachrechnung). Besser geeignet ist eine **Störungsprobe**: die Zukunft ab einem zufälligen Tag verändern, die Vergangenheit muss gleich bleiben. Sie findet das 7-Tage-Leck in 3 bis 9 von 40 Schnitten, das 97-Tage-Leck nur in 1 von 40: die Zahl der Schnitte muss zur Leckdichte passen. **Empfehlung:** Strategien als Funktion `f(p[:t+1])` anbinden (Streaming-Schnittstelle), sodass die Zukunft gar nicht übergeben wird, bevor KI-Merkmale hinzukommen; bis dahin die Störungsprobe mit mehreren hundert Schnitten fahren.

**F3 · niedrig · Reproduzierbarkeit hängt von der Python-Version ab.** Unter 3.11 weichen 28 Zeilen von `ergebnis-v2.json` ab (zum Beispiel `exposure_schnitt` 0,544083606466972 gegen 0,5440836064669722), unter 3.12 und 3.13 ist die Datei byte-gleich. Hypothese (nicht isoliert): Änderung von `statistics.stdev` ab 3.12. Das CI läuft mit 3.11. **Empfehlung:** Python-Version im Bericht festhalten und Zahlen mit Toleranz vergleichen (so macht es der Regressionstest).

**F4 · niedrig · Protokollwerte ohne Wirkung.** `signal_verzoegerung_tage` und `vorwaertstest_mindesttage` stehen im Protokoll (und damit im `protokoll_sha256`), werden aber im Code nie gelesen; die Verzögerung ist fest eingebaut, die Mindestlänge 180 und der Messbeginn 201 sind Literale. Wer den Wert im Protokoll ändert, ändert den Hash, nicht das Verhalten.

**F5 · niedrig · Rundung in der README.** Konsens 2022–2023: gespeichert 0,3275253… = **+32,8 %**, die README-Tabelle nennt +32,7 %. Alle anderen Tabellenzahlen stimmen.

**F6 · Darstellung · die README-Tabelle lässt die stärkste Vergleichszeile aus.** Der unskalierte Trend 200 steht im Bericht, aber nicht in der Tabelle: 2022–2023 +73,4 % / −22,2 %, 2024–2026 +39,4 % / −36,3 %. Über beide Zeiträume (Basis-Kosten, Zinseszins der zwei Periodenwerte): Trend 200 **+141,7 %**, Konsens +76,4 %, Halten +67,7 %, Trend 150 Risiko 25 +59,9 %, Trend 200 Risiko 25 +59,8 %, Halten Risiko 25 +54,8 %. Das Sharpe-ähnliche Verhältnis (beide Zeiträume zusammen, ohne Zins) ist bei Trend 200 und Konsens gleich (0,72), bei Bitcoin 0,50. Die Risikosteuerung kostet Rendite in Aufwärtsphasen; der Konsens ist ein verkleinerter Trend 200, kein besserer Signalgeber.

**F7 · Hinweis · Daten.** Die Kursreihe endet am 23.09.2026 (47 Tage alt am 09.11.): der Bericht ist historisch und liefert kein aktuelles Signal (so steht es auch im Bericht). Die Herkunft der Datei ist im Labor nicht dokumentiert (Hypothese: Tageskerzen eines Kursportals, Zeitpunkt 00:00 UTC; nicht geprüft). Zweite Quelle zum Gegenprüfen: nicht verglichen.

## Exposure von Timing getrennt (Basis-Kosten 20 bp je Richtung)

Vergleich jeder Strategie mit einer **festen Quote in Höhe ihrer mittleren Exposure** (gleiches Band, gleiche Kosten):

| Strategie | Exposure 2022–23 | Rendite / Einbruch | feste Quote | Exposure 2024–26 | Rendite / Einbruch | feste Quote |
|---|---|---|---|---|---|---|
| Trend 200 | 0,40 | +73,4 % / −22,2 % | +3,8 % / −32,3 % | 0,60 | +39,4 % / −36,3 % | +57,3 % / −34,8 % |
| Halten Risiko 25 | 0,54 | +11,0 % / −40,6 % | +2,4 % / −42,1 % | 0,61 | +39,4 % / −44,5 % | +59,2 % / −35,1 % |
| Trend 150 Risiko 25 | 0,25 | +24,9 % / −19,1 % | +4,1 % / −19,6 % | 0,35 | +28,0 % / −24,5 % | +35,8 % / −21,4 % |
| Trend 200 Risiko 25 | 0,24 | +32,2 % / −18,6 % | +4,1 % / −19,1 % | 0,36 | +20,9 % / −23,1 % | +36,9 % / −22,1 % |
| Konsens 150/200 | 0,24 | +32,8 % / −16,7 % | +4,2 % / −18,8 % | 0,33 | +32,9 % / −17,7 % | +34,1 % / −20,0 % |

**Das Timing zahlt sich nur 2022 aus** (Bitcoin −65 %, die Trendfilter blieben draussen: +20 bis +70 Prozentpunkte gegen die feste Quote). 2024–2026 liegen alle Trendstrategien hinter der festen Quote (−1 bis −18 Prozentpunkte) bei kaum besserem Einbruch; am nächsten kommt der Konsens (−1,2 Prozentpunkte, Einbruch 2,3 Punkte besser). Rendite je Kalenderjahr (Basis, Konsens): 2022 0,0 %, 2023 +32,8 %, 2024 +35,1 %, 2025 −9,9 %, 2026 (bis 23.09.) +9,1 %; Trend 200 Risiko 25 im selben Zeitraum 0,0 / +32,2 / +25,9 / −12,0 / +9,1 %: der Unterschied zum Konsens entsteht fast ganz in 2024 und 2025.

## Unsicherheit

* **Alpha und Beta gegen Bitcoin** (Tagesrenditen, 90-%-Intervall aus gleitendem Block-Bootstrap, Blocklänge 20 Tage, 2 000 Ziehungen, Zufallssamen 20261109), Alpha pro Jahr in Prozentpunkten: Konsens 2022–23 +14,0 [−4,8; +31,4], 2024–26 +1,8 [−12,9; +17,3], beide +8,0 [−4,8; +19,3]; Beta 0,16 / 0,29 / 0,23. Alle fünf Strategien haben für beide Zeiträume ein Intervall, das die Null enthält.
* **Konsens gegen Halten Risiko 25**, mittlere Renditedifferenz pro Jahr, beide Zeiträume: +0,4 Prozentpunkte [−17,4; +17,8], Anteil der Ziehungen über null 49 %. Konsens gegen Trend 200 Risiko 25: +1,9 [−2,6; +6,2], 75 %. Konsens gegen unskalierten Trend 200: −10,5 [−23,1; +3,3].
* **Deflated Sharpe Ratio** (Bailey und López de Prado 2014, Gleichung 2; Formel an der Seite des Papiers nachgelesen), 1 727 Tage: Konsens und Trend 200 je Sharpe 0,72 pro Jahr, PSR gegen null **0,94**; mit Abzug für N unabhängige Versuche (Varianz der Sharpe-Werte aus 24 benachbarten Konfigurationen): N = 5 / 10 / 24 / 50 / 100 → 0,91 / 0,89 / 0,88 / 0,86 / 0,85. Das Papier verlangt für «belegt» 0,95. Mindestlänge der Messreihe für Sharpe 0,72 bei 95 %: **5,0 Jahre**, vorhanden 4,7. Grenzen: Näherung unter Annahme unabhängiger Renditen (Trendstrategien sind es nicht), die wahre Zahl der Versuche ist unbekannt (es gibt kein Versuchsregister), die Varianz stammt aus meinem eigenen Raster.
* **Parameter-Nachbarschaft** (24 Konfigurationen: Trendfenster 100 oder 150 und 200 oder 250, Risikoziel 20, 25, 30 %, Band 5 oder 10 %): Sharpe 0,58 bis 0,89 (Median 0,78), Gesamtrendite 44 % bis 121 % (Median 76 %). Codex' Wahl (150/200, 25 %, 10 %) liegt auf Rang 16 von 24 nach Sharpe und trifft die mittlere Gesamtrendite (76 %): **kein Anzeichen für ein Herauspicken des besten Parameters.** Die Streuung der Nachbarschaft (±0,15 Sharpe) ist so gross wie die Unterschiede zwischen den verglichenen Strategien (0,46 bis 0,72).

## Recherche: die offenen Originaltexte

| Quelle | Stand | Befund |
|---|---|---|
| Bailey, López de Prado: *The Deflated Sharpe Ratio* (JPM 2014) | **gelesen** (PDF von davidhbailey.com, SSRN lieferte 403) | Gleichung 2 und das Rechenbeispiel (N = 46 unabhängige Versuche bei 5 Jahren Tagesdaten, Sharpe 2,5) dienen oben; Aussage: ohne die Zahl der Versuche ist ein bester Backtest nicht beurteilbar; Regel: Zahl der Versuche vorab planen (Stopp-Regel 1/e). |
| Bailey, Borwein, López de Prado, Zhu: *The Probability of Backtest Overfitting* | PDF in Text gewandelt, **nur Zusammenfassung gelesen** | Rahmen zur Schätzung der Wahrscheinlichkeit von Überanpassung (CSCV); nicht angewandt, weil dafür eine Matrix vieler Versuche nötig ist, die das Labor nicht führt. |
| *Pseudo-Mathematics and Financial Charlatanism* (AMS Notices 2014) | **nicht lesbar** (HTTP 403) | Die Mindestlänge eines Backtests wurde nicht aus dem Papier belegt. |
| *R&D-Agent-Quant* (arXiv 2505.15155), *Qlib* (2009.11189), *FinRL-X* (2603.21330) | **teilweise gelesen** (Zusammenfassung und Teile der HTML-Fassung, Rest über automatische Zusammenfassung) | Alle drei untersuchen Aktien (R&D-Agent: CSI 300, Test 2017–2020; FinRL-X: US-Aktien und ETFs, Papierhandel rund viereinhalb Monate, Autoren: «not intended to establish statistically significant alpha»; Qlib 2020: Infrastruktur-Benchmark ohne Handelsbewertung). **Keine der drei enthält belegte Aussagen zu Kryptowährungen.** Der Verzicht auf ungeprüfte Installationen bleibt begründet. |
| Binance Futures und Alpaca Dokumentation | nicht gelesen | kein Handelspfad wurde geändert. |

## Empfehlung für den nächsten Kandidaten (Vorschlag, nicht beschlossen)

Vorab festlegen, bevor etwas Neues gebaut wird (README Punkt 6):

1. **Versuchsregister** `versuche.json` (Datum, Parameter, Ergebnis, auch verworfene): daraus ergibt sich N für die Deflated Sharpe Ratio.
2. **Streaming-Schnittstelle** `f(p[:t+1])` statt ganzer Kursreihe (F2).
3. **Vergleichsbasis immer dreifach:** Halten Risiko 25, unskalierter Trend 200 und feste Quote gleicher Exposure; Gewinne nur zählen, wenn sie diese schlagen.
4. **Zeitfenster:** mindestens 5 Jahre Messreihe plus ein beobachtetes Vorwärts-Schattenkonto von mindestens 180 Tagen, das erst ab Festlegung zählt (die bestehenden Schattenbücher in `tools/trading/schatten/` laufen schon).
5. **Erfolgskriterium vorab:** Deflated Sharpe Ratio mindestens 0,95 bei N laut Register und positive Differenz zur festen Quote in beiden Zeiträumen. Auch dann: kein Echtgeld ohne ausdrückliches Ja des Besitzers.

## Grenzen dieser Prüfung

Nur Linux, Python 3.11 bis 3.13. Nicht geprüft: Version 1 (`ergebnis.json`), die 21 Binance-Spot-Tests und `automation/ci_simulation.sh` (bei Codex am schreibgeschützten Dateisystem gescheitert), ein Futures-, Funding- oder Orderbuchmodell, die Kursdatei gegen eine zweite Quelle. Statistik: Annahmen siehe oben. Die Agenten, die Originaltexte lasen, lieferten Teile über automatische Zusammenfassungen; diese Angaben sind als Behauptungen zu behandeln.

## Reproduktion

```bash
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor*.py' -v     # 34 Tests (20 von Codex, 14 neu)
python3 docs/ki-bot-gemeinsam/claude-pruefung/pruefung1.py     # Nachrechnung, Tabellen, Exposure gegen Timing, Kalenderjahre
python3 docs/ki-bot-gemeinsam/claude-pruefung/pruefung2.py     # Gegenbeispiele zur Signalprüfung, Datenprüfung
python3 docs/ki-bot-gemeinsam/claude-pruefung/pruefung3.py     # Alpha/Beta, Bootstrap, Parameter-Nachbarschaft, Deflated Sharpe
python3 docs/ki-bot-gemeinsam/claude-pruefung/mutation.py --mit-regression     # Mutationsprobe (32 Mutanten, rund 2 Minuten)
```
