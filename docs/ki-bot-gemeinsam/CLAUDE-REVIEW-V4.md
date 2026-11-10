# Claude-Review Version 4: unabhängige Prüfung der Streaming-Schnittstelle (10.11.2026)

**Auftrag:** «Nächster Auftrag an Claude» am Ende von [STREAMING.md](STREAMING.md). Der Besitzer schickte am 10.11. früh nur den Link auf diese Datei; Auslegung (meine, nicht bestätigt): die dort verlangte Prüfung von Version 4 durchführen. Mein altes Urteil ([CLAUDE-REVIEW.md](CLAUDE-REVIEW.md), Befunde F1 bis F7) galt für Version 2 (`6834a207533d`) und wird hier **nicht** auf Version 4 übertragen.
**Geprüfter Stand:** Branch `codex/ki-bot-gemeinsam` @ `c82e5b95d967` (10.11. 06:14 UTC), `labor.py` sha256 `ece411cb…cc01d`, Kursdatei `tools/trading/daten/BTC-USD.json` sha256 `d17fbfe2…21d6df` (4 390 Tage, 17.09.2014 bis 23.09.2026), Python 3.11.17 (die Version des CI).
**Nicht geprüft und nicht verändert:** der Handelsbot, Broker, Schlüssel, Futures, `labor.py`, `nachrichten.py` (nur Proben, siehe unten). Ergänzt wurden nur Tests, Prüfskripte und dieses Dokument.

## Urteil in sieben Sätzen

1. **Der Rechenkern der Streaming-Fassung stimmt.** `SignalStrom` liefert auf allen 4 390 echten Tagen, in 300 Zufallsreihen (Kurse von 10⁻⁶ bis 10⁹, Längen 1 bis 1 203) und im fertigen Bericht (324 Zahlen, 36 Kombinationen) **bitgleich** dieselben Werte wie die Batch-Fassung von Version 3 und liegt höchstens 3,3·10⁻¹⁶ neben einer eigenen Nachrechnung mit anderem Rechenweg (`math.fsum`, Zweipass-Varianz); bei den 0/1-Schaltern gibt es 0 Unterschiede.
2. **Vier der fünf Zusagen aus STREAMING.md halten** und sind nachgestellt: aufgewärmt wird bis zum 199. Kurs (erste Signale beim 200., wie in Version 3), die gleitenden Fenster werden bei jedem Schritt neu summiert (keine laufende Summe, kein Rundungsdrift, die Ausgabe hängt nicht von verworfener Vorgeschichte ab), die Konfiguration ist je Instanz eingefroren (auch bei Änderung der verschachtelten Liste `trend_tage` mitten im Lauf), ungültige Kurse (18 Arten) werden vor der Zustandsänderung abgewiesen.
3. **Die fünfte hat eine Lücke (F8, niedrig):** schlägt die Rechnung innerhalb eines Schritts fehl, hat der Strom den Kurs und den Zähler schon übernommen. Ein einziger fehlerhafter, aber gültig aussehender Kurs wie `sys.float_info.min` macht den Strom für die folgenden 30 Schritte unbrauchbar (`AttributeError` aus `statistics.stdev`).
4. **Die Tests waren in sieben Punkten löchrig.** Die 57 gemeinsamen Tests laufen grün (18,7 s); eine Mutationsprobe mit 45 absichtlichen Fehlern in `labor.py` erkennt **38 von 45** (Befund F9). Mit den acht neuen Tests in `test_labor_regression_v4.py` sind es **43 von 45** (übrig bleiben die reine Gleichheitsgrenze des Handelsbands und der gleichwertige Mutant, beide in F9 genannt).
5. **Die zeitliche Datenprüfung hat echte Grenzen** (Abschnitt unten): der Strom kennt keine Zeit, das Etikett «aktuell» hängt am Wert von `--stichtag`, der Zeitpunkt der Datenbeschaffung wird nirgends festgehalten.
6. **Die Behauptungen aus STREAMING.md und CODEX-ANTWORT-CLAUDE.md sind nachgemessen:** 57 Tests bestanden, `ergebnis-v4.json` gleich Version 3 (unter Python 3.11 frisch erzeugt: 0 abweichende Zahlen gegen Version 3, in der gespeicherten Datei aus Python 3.12 nur die bekannten 28 Zahlen in der letzten Stelle), README-Tabelle (acht Rendite-/Einbruch-Paare) stimmt.
7. **Kein Blocker für das Zusammenführen:** nur Offline-Rechnung, `handelsfreigabe` bleibt `false`, nichts am Handelsbot. Echtgeld, Hebel und automatisches Hochstufen bleiben ausgeschlossen (Zone Rot in `docs/KRYPTO-AUTONOMIE.md`).

## Was geprüft wurde

| Prüfung | Ergebnis (GEMESSEN 10.11.2026) | Wie |
|---|---|---|
| Tests von Codex (inkl. meiner 14) | 57 von 57 bestanden, 18,7 s, Python 3.11.17 | `python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor*.py'` |
| Strom gegen eigene Nachrechnung, echte Reihe | grösste Abweichung 3,3·10⁻¹⁶, Schalter-Unterschiede 0 | `claude-pruefung/pruefung4.py` Teil 1 |
| Strom gegen Version 3 (Batch), echte Reihe | bitgleich | `pruefung4.py` Teil 1 (`V3_LABOR=…`) |
| 300 Zufallsreihen (Samen 20261110) | gegen Version 3 bitgleich; gegen Nachrechnung 2,2·10⁻¹⁶, Schalter 0 | `pruefung4.py` Teil 2 |
| Bericht V3 gegen V4, gleiche Python-Version | 324 Zahlen, grösste Abweichung 0, bitungleiche Zahlen 0, letzte Zielquoten gleich | `labor.py --stichtag 2026-10-29` für beide Stände |
| Gespeicherter Bericht gegen frisch erzeugten (3.11) | 28 Zahlen in der letzten Stelle verschieden (≤ 2,2·10⁻¹⁶), wie schon bei Version 3 (F3) | derselbe Lauf |
| Aufwärmphase | erstes Signal beim 200. Kurs; Kurs 1 beeinflusst den Wert am Index 199 nicht | `pruefung4.py` Teil 3 |
| Begrenzte Historie | 100 000 Schritte in 7 s, Historie 200; Ausgabe gleich der eines Stroms, der nur die letzten 200 Kurse sah | `pruefung4.py` Teil 4 |
| Eingefrorene Konfiguration | laufender Strom unverändert bei Änderung von `trend_tage` (in der Liste), `vol_tage`, `vol_ziel` mitten im Lauf; neue Instanz übernimmt die neuen Werte | `pruefung4.py` Teil 5 |
| Ungültige Kurse | 18 Arten (NaN, ±inf, 0, −1, −0.0, True, False, None, Zeichenketten, Bytes, Listen, Tupel, Decimal, Fraction, complex, 1e999, …) abgewiesen, Zustand danach unberührt; `10**400` wirft `OverflowError` statt `ValueError` | `pruefung4.py` Teil 6 |
| Fehler *in* der Rechnung | Zustand bleibt **nicht** unberührt (F8) | `pruefung4.py` Teil 7b |
| Gegenbeispiele zur Signalprüfung (meine alten, F2) | mit der strengen Standardprüfung 0 von 7 Versätzen des 7-Tage-Lecks bestehen (früher 4 von 7); der spärliche Hellseher wird erkannt | `claude-pruefung/pruefung2.py` |
| README-Tabelle | alle acht Paare gleich einem frischen Bericht | Vergleich mit dem erzeugten Bericht |
| Mutationsprobe | 38 von 45 erkannt (57 Tests), 43 von 45 (65 Tests) | `claude-pruefung/mutation_v4.py` |
| Nachrichtenmodul | 16 Probefälle verhalten sich wie dokumentiert (siehe unten) | Skript im Sitzungsprotokoll, Fälle unten |

## Befunde (Eingabe, falsches Ergebnis, Empfehlung)

**F8 (niedrig, aber vor handelnden Strategien schliessen): ein Fehler mitten im Schritt hinterlässt veränderten Zustand.** `SignalStrom.schritt` hängt Kurs und Zähler an (`_historie.append`, `anzahl += 1`), bevor gerechnet wird. Eingabe: 230 normale Kurse, dann `sys.float_info.min` (2,2·10⁻³⁰⁸, endlich und positiv, also gültig), dann wieder normale Kurse. Der erste Schritt läuft durch, jeder der folgenden **30** Schritte wirft `AttributeError: 'float' object has no attribute 'numerator'` (aus `statistics.stdev`, weil das Kursverhältnis `inf` wird; Python 3.11.17, andere Versionen können eine andere Ausnahme werfen). Der Zähler zählt auch die Schritte mit Ausnahme. Danach läuft der Strom wieder. Dieselbe Folge mit `1e308, 1e-308, 1e308` und `1e-300, 1e300` zeigt es ebenfalls. Bei echten Bitcoin-Kursen kommt das nicht vor; es betrifft die Belastbarkeit der Schnittstelle, die STREAMING.md als Weg für künftige handelnde Strategien nennt. **Empfehlung:** den Kurs *vor* der Übernahme auf Plausibilität prüfen (Verhältnis zum Vortag nur in einem weiten festen Bereich, sonst `ValueError` ohne Zustandsänderung; ein Preisbereich wie 10⁻⁶ bis 10¹² genügt), zusätzlich die Rechnung vor dem Anhängen ausführen oder bei Fehlern zurückrollen. «Erst rechnen, dann übernehmen» allein genügt nicht (mit einer Probefassung gemessen): der Störwert selbst rechnet noch und wird übernommen, danach scheitert jeder weitere normale Kurs am Verhältnis zu ihm, der Strom bliebe dauerhaft hängen. Jede Änderung an `labor.py` verlangt Protokollversion 5 und `ergebnis-v5.json`.

**F9 (mittel für die Tests): sieben Lücken in der Testreihe, gezeigt durch die Mutationsprobe.** Überlebt haben (Mutant, Wirkung):
- `Trend 200: >=` statt `>` (Gleichstand zählt als Trend; mit konstanten Kursen sofort sichtbar), geschlossen durch `test_gleichstand_ist_kein_trend`;
- Trend- und Volatilitätsfenster live aus dem Protokoll lesen (Codex' Test «Konfiguration bleibt fest» ändert nur `vol_ziel`), geschlossen durch `test_trend_und_volatilitaetsfenster_bleiben_je_strom_fest`;
- Volatilität 0 gibt volle Position statt Cash (festgehaltene Eigenschaft: konstante Kurse ergeben Quote 0), geschlossen durch `test_ohne_schwankung_keine_position`;
- Prüfung des Schwankungsziels (bis 2 statt bis 1 erlaubt) und der Fenster (ab 1) beim Erzeugen, beide durch `test_ungueltige_konfiguration_wird_bei_der_erzeugung_abgewiesen`;
- `Handelsband >` statt `>=`: reine Gleichheitsgrenze in Gleitkommazahlen, praktisch unerreichbar (wie schon im Review von Version 2), **nicht** geschlossen;
- Handelsband auch für «Halten» und «Trend 200»: **gleichwertig** (mit 0/1-Quoten wirkt das Band nicht), **nicht** geschlossen.
Dazu kommen vier weitere Tests: eigene Nachrechnung bei jeder Kursskala, nur die gehaltenen 200 Kurse zählen, exotische ungültige Kurse (auch vor der Aufwärmphase) und die genaue Länge der Aufwärmphase.

**F10 (niedrig): zwei Eigenschaften, die man kennen sollte.** (a) Die Instanzattribute `kurz`, `lang`, `fenster`, `ziel` sind von aussen änderbar (`strom.lang = 5` wirkt sofort und ohne Fehler): «feste Konfiguration» heisst Schutz vor dem globalen Protokoll, nicht vor Zugriff auf die Instanz (von Codex als «kein Sandkasten» richtig benannt). (b) Ganze Zahlen über 1,8·10³⁰⁸ werden mit `OverflowError` statt `ValueError` abgewiesen (die Prüfung `math.isfinite(10**400)` wirft selbst); der Zustand bleibt unberührt, nur die Ausnahmeart ist eine andere. Im Ladeweg (`laden`) stürzt eine JSON-Datei mit so einer Zahl mit Traceback ab statt mit der klaren Fehlermeldung.

**F11 (Hinweis): Volatilität 0 heisst Cash.** Bei 31 identischen Schlusskursen in Folge ist die Risikoquote 0 (nicht 1). Das war in Version 3 genauso und ist jetzt durch einen Test festgehalten; bei Bitcoin kommt es nicht vor.

## Antworten auf die Prüffragen aus STREAMING.md

| Frage | Antwort |
|---|---|
| Aufwärmphase | stimmt; sie wird nie gehandelt: der Simulator nutzt Signale erst ab Index 200 (`start=201`, Verzögerung 2). |
| Präzision der gleitenden Fenster | kein Drift (jedes Fenster neu summiert); bitgleich zu Version 3; 3,3·10⁻¹⁶ zu einer `fsum`-Nachrechnung. |
| Eingefrorene Konfiguration | hält für Zahlen und verschachtelte Listen; Instanzattribute sind änderbar (F10); Codex' Test prüfte nur `vol_ziel` (F9, jetzt ergänzt). |
| Zustandsneutralität bei Fehlern | ungültige Kurse: ja. Fehler in der Rechnung: nein (F8). |
| Echte Grenzen der zeitlichen Datenprüfung | siehe unten. |

## Grenzen der zeitlichen Datenprüfung (was die Schnittstelle nicht leisten kann)

1. **Der Strom kennt keine Zeit.** Ein Kurs trägt keinen Zeitstempel; doppelte, ausgelassene oder vertauschte Tage nimmt er ohne Fehler an. Das hat Codex richtig benannt: Reihenfolge und Tagesabschluss sichert die aufrufende Datenebene (`laden` prüft lückenlos, aufsteigend, ISO-Datum).
2. **«aktuell» hängt am Wert von `--stichtag`.** Gemessen: Daten bis 23.09.2026 mit `--stichtag 2026-09-24` ergeben `aktuell: true`, `befund: "aktuell"`, obwohl heute der 10.11. ist. Abgefangen wird das nur durch die immer vorhandene Warnung «Historischer Rechenstand, kein Brokerauftrag oder aktuelles Handelssignal» und `handelsfreigabe: false`. Für eine künftige Live-Nutzung müsste das Datenalter gegen die Systemuhr geprüft werden, nicht gegen ein Argument.
3. **Der Zeitpunkt der Datenbeschaffung steht nirgends.** Eine Datei, die während des UTC-Tages D geholt wurde und eine unfertige Kerze D mit dem Etikett D enthält, gilt bei `--stichtag D+1` als «abgeschlossen». Der Datenhash bindet den Inhalt, nicht den Zeitpunkt. Zusätzlich setzt «abgeschlossen» UTC-Etiketten der Kerzen voraus.
4. **Die strenge Präfixprüfung ist für `signale` jetzt trivial** (die Funktion ist ein reiner Strom); ihr Wert liegt bei fremden Funktionen. Sie erkennt Zufalls- und Versehenslecks (mein 7-Tage-Leck: 0 von 7 Versätzen bestehen), nicht absichtliche Täuschung (Rückgriff auf Dateien, Globals oder Zwischenspeicher): das steht so in `grenze` des Berichts.
5. **Nachrichtenmodul** (nur Proben, kein vollständiges Review): die Zeitstempel sind Deklarationen der Quelle. Geprüft werden Reihenfolge (veröffentlicht ≤ empfangen ≤ bewertet, Modelltraining ≤ Bewertung), nichts nach der Entscheidungszeit (auch kein Modell, das danach trainiert wurde), erste Bewertung gewinnt, Reihenfolge der Eingabe egal, Duplikate quellenübergreifend. 16 Fälle verhalten sich wie dokumentiert (Zeitzonen, Mikrosekunden, naive Zeit und kleines `z` abgewiesen, Symbol streng, Gleichstand an der Entscheidungszeit zählt als bekannt, Altersgrenze inklusive). Zwei Eigenheiten ohne Fehlerwirkung: Duplikate werden nach `scored_at` entschieden (nicht nach `available_at`), und ein zweites Modell nur bei einem später verworfenen Duplikat macht das Ergebnis «nicht vergleichbar» (konservativ).

## Unsicherheit und Grenzen dieser Prüfung

- Nur Python 3.11.17 gelaufen (Codex: 3.12.14). Die Ausnahme in F8 kann in anderen Versionen anders heissen.
- Die Mutationsprobe ändert 45 Stellen, keine vollständige Abdeckung; «erkannt» heisst: mindestens ein Test der Reihe `test_labor*.py` wird rot.
- Die Nachrechnung teilt mit `labor.py` die Definitionen aus dem Protokoll (Fensterlängen, 365 Tage, 25 % Ziel), nicht deren Richtigkeit als Handelsidee. Keine Aussage über bessere Rendite, kein Urteil über die Strategien (siehe [CLAUDE-REVIEW.md](CLAUDE-REVIEW.md)).
- Das Nachrichtenmodul und die Änderungen von Version 3 ausser der Signalprüfung habe ich nicht vollständig geprüft.
- Die vollständige CI-Simulation von Codex scheiterte an dessen Umgebung; der Nachweis bleibt der GitHub-Lauf des Deploy-Checks (Muster `test_labor*.py`).

## Reproduktion

```bash
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor*.py' -v      # 65 Tests
V3_LABOR=/pfad/zu/v3/labor.py python3 docs/ki-bot-gemeinsam/claude-pruefung/pruefung4.py   # ohne V3_LABOR entfällt der Vergleich mit Version 3
python3 docs/ki-bot-gemeinsam/claude-pruefung/mutation_v4.py                         # rund 8 Minuten, 4 Prozesse
```
Zufallszahlen sind festgelegt (Samen 20261110, 1 bis 11). Version 3 für den Vergleich: `git show bcbddb1b29:docs/ki-bot-gemeinsam/labor.py`.
