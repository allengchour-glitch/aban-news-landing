# Krypto-Prüfwerkzeuge vom 08.11.2026

Nur Prüfung. Die Dateien liegen bewusst unter `docs/` und nicht unter `tools/trading/`: dort gehört alles ins Programmpaket, das der PC des Besitzers sich selbst holt (`tools/trading/paket_bauen.py` packt nur Git-Dateien unter `tools/trading`).

## `zeitversatz.py`: Zeitbomben in Tests finden

Ein Test mit festem Stichtag (`J0 = 2026-11-03`) und einem Aufruf **ohne** Zeitvorgabe (`status_text(...)` nimmt die echte Uhr) ist am Tag des Schreibens grün und wird still rot, sobald der Stichtag lange genug zurückliegt. Das CI merkt es erst beim nächsten Push, im Fall `test_autoupdate.py` also erst beim nächsten Paketbau.

```
python3 docs/krypto-pruefung-0811/zeitversatz.py <Tage> <Ordner mit dem Modul> <Modulname> <Testdatei>

# Beispiel: der Updater-Test mit einer um 400 Tage vorgestellten Uhr
cd tools/trading/krypto_bot
python3 ../../../docs/krypto-pruefung-0811/zeitversatz.py 400 "$PWD" autoupdate "$PWD/test_autoupdate.py"
```

Die Uhr (`datetime.now`, `utcnow`, `date.today`, `time.time`) läuft um `<Tage>` vor, im Modul und in der Testdatei. Negative Tage stellen zurück.

- **`NUR_DATUM=1`** lässt `time.time()` echt. Das ist für Tests mit Sperrdateien und Zwischenspeichern nötig: deren Dateizeiten kommen vom Betriebssystem (echte Uhr), und mit vorgestelltem `time.time()` wirkt jede Sperre 30 Tage alt. Ohne die Einstellung meldeten `test_pilot`, `test_infos` und `test_cockpit` neun Fehlschläge, die keine Zeitbomben waren (Werkzeug-Artefakt, mit `NUR_DATUM=1` weg).
- Umgekehrt kann `NUR_DATUM=1` Tests stören, die ein Datum aus `datetime` gegen `time.time()` messen (`test_cockpit`: «Lauf älter als 36 Stunden» fällt mit `NUR_DATUM=1` ab 5 Tagen Versatz, ohne die Einstellung nicht). Ein Fehlschlag unter nur einer der beiden Einstellungen ist deshalb noch kein Befund: beide Läufe ansehen.

**Gemessen am 08.11.2026** (alle 21 Testdateien des Pakets, bei +400 Tagen, jede mindestens in einer der beiden Einstellungen; die schnellen zusätzlich bei +30): eine echte Zeitbombe, `test_autoupdate.py` Zeile «status_text: Kopfzeichen und Name» (ab 07.11. 12:00 UTC rot). Nach der Korrektur 170 von 170 bei −5, 0, 4, 30, 400 und 1500 Tagen. Alle übrigen Testdateien blieben bei +400 Tagen grün, **ausser `test_cockpit.py`**: dort melden beide Einstellungen Fehlschläge (ohne `NUR_DATUM` zwei bei den Sperr-Tests des Not-Aus, mit `NUR_DATUM` einer bei der Labor-Frist von 36 Stunden). Beide Gruppen rechnen echte Dateizeiten gegen die verschobene Uhr bzw. `datetime` gegen `time.time()`; das ist aus dem Testcode gelesen, **nicht mit einer echten Uhr nachgespielt** (ohne libfaketime lassen sich Dateizeiten nicht verschieben). Eine echte Zeitbombe im Cockpit-Test ist damit unwahrscheinlich, aber nicht ausgeschlossen.

## `mutationsprobe_wochenbericht.py`: Probe der Tests des Gesundheits-Abschnitts

```
python3 -I docs/krypto-pruefung-0811/mutationsprobe_wochenbericht.py "$PWD"    # im Repo-Wurzelordner
```

Ändert `tools/trading/schatten/wochenbericht.py` 44-mal an einer Stelle (Grenzwerte, Vergleiche, Einzahl/Mehrzahl, weggelassene Aufrufe, Texte) und verlangt, dass `test_wochenbericht.py` jedes Mal rot wird. Vorab prüft sie, dass die unveränderte Kopie grün ist (sonst gälte jeder Mutant als «erkannt»). Sie arbeitet in einem Temp-Baum mit Verweis auf `krypto_bot` und schreibt nichts ins Repo. Ergebnis 08.11.2026: **43 von 44 erkannt**, der eine (M17: `.replace("Z", "+00:00")`) ist ab Python 3.11 gleichwertig, weil `fromisoformat` das «Z» dort selbst kennt; die Zeile bleibt für ältere Pythons.
