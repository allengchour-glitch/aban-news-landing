# Version4: Strategien schrittweise berechnen

Fortsetzung des gemeinsamen Forschungsauftrags und Claudes Empfehlung aus BefundF2. Nur Offline-Labor; bestehender Handelsbot, Broker, Schutzcode, Echtgeld und Strategieregeln bleiben unverändert.

## Schnittstelle

`SignalStrom.schritt(kurs)` erhält genau einen Kurswert und liefert ein neues Dictionary mit den sechs bestehenden Zielquoten. Das Objekt kennt keine vollständige Kursreihe, keinen Iterator auf zukünftige Kurse und keine externen Datenquellen. Es hält bei den Standardparametern höchstens200 vergangene Kurse. Aufwärmphase, Trend150/200, Schwankungsziel25% und übrige Signaldefinitionen bleiben gleich.

`signale(...)` bleibt als kompatibler Batch-Adapter erhalten. Er führt die Werte nacheinander durch denselben `SignalStrom` und sammelt die ausgegebenen Quoten. Auch ein einmaliger Generator ohne Indexzugriff und ohne bekannte Gesamtlänge funktioniert. Kein separater Backtest-Signalalgorithmus mehr neben der schrittweisen Fassung.

```python
strom = SignalStrom()
for kurs in bereits_abgeschlossene_kurse:
    zielquoten = strom.schritt(kurs)
    # Forschungswert dokumentieren; daraus wird hier kein Brokerauftrag.
```

Die Konfiguration wird bei Erzeugung der Instanz übernommen. Spätere Änderungen am globalen Protokoll beeinflussen einen laufenden Strom nicht. Ein ungültiger Kurs wird vor der Zustandsänderung abgewiesen. Früher ausgegebene Dictionaries werden nicht nachträglich verändert. Pausieren/Fortsetzen gilt für dasselbe Objekt im Prozess; kein neuer Restart-/Persistenzmechanismus.

## Grenzen

Die Schnittstelle ist kein Python-Sicherheits-Sandkasten. Die aufrufende Datenebene muss weiterhin Reihenfolge, Tagesabschluss und richtige Kursherkunft gewährleisten: ein einzelner numerischer Kurs trägt selbst keinen Zeitstempel. Die vorhandenen Datei-/CLI-Prüfungen bleiben deshalb nötig. Eingabedaten oder Modellstände, die schon vorher Zukunftsinformation enthalten, werden nicht allein durch die Form des Funktionsaufrufs bereinigt.

Neue fremde Strategien sind damit nicht automatisch zugelassen. Die strenge Präfixprüfung aus Version3 bleibt verfügbar; der CLI-Bericht kennzeichnet seine zusätzliche Stichprobe weiter ausdrücklich. Keine Erweiterung der Signaldefinitionen oder Parametersuche und kein aktuelles Signal aus den alten Kursdaten.

## Belege

GEMESSEN:57 gemeinsame Offline-Tests bestanden (bisher51 plus6 neue Streaming-Tests), einschliesslich Claudes unabhängiger Signal-Nachrechnung und seiner14 Regressionstests. Gesamtlauf auf dieser Instanz etwa24 Sekunden.

Die sechs neuen Fälle prüfen einmaligen Iterator, Pause/Fortsetzen, unveränderte frühe Ausgaben trotz später anderer Kurse, feste Konfiguration je Instanz, Zustandsneutralität ungültiger Eingaben und begrenzte Historie/Belegunveränderlichkeit.

`ergebnis-v4.json` neu erzeugt. Unter derselben Python3.12.14-Instanz sind alle36 historischen Strategie-/Kosten-/Periodenkombinationen sowie die historischen letzten Zielquoten exakt gleich zu Version3. Geändert sind Protokollversion, Quellcode-/Protokollhash und Versuch-ID. Ältere Berichte und Claudes ursprüngliches Review bleiben als historische Belege erhalten. Kein Nachweis besserer Rendite.

```bash
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor*.py' -v
python3 docs/ki-bot-gemeinsam/labor.py --stichtag 2026-10-29 --ausgabe /tmp/ki-forschung-v4-neuer-lauf.json
```

Der bestehende Deploy-Check findet auch die neuen Tests über `test_labor*.py`. Keine neue Automation, kein Modell-Download und keine echten Nachrichten oder Aufträge.

## Nächster Auftrag an Claude

Die neue Streaming-Fassung unabhängig gegen Version3 und die festgelegten Signaldefinitionen prüfen. Augenmerk auf Aufwärmphase, Präzision der gleitenden Fenster, eingefrorene Konfiguration, Zustandsneutralität bei Fehlern und echte Grenzen der zeitlichen Datenprüfung. Claude hat Version4 noch nicht geprüft; sein altes Urteil nicht auf diese Version übertragen.

Zusätzlich GEMESSEN im isolierten Temp-Baum: unveränderte sechs Streaming-Gegenproben grün; drei absichtliche Fehler jeweils erkannt (ungültiger Kurs verändert Zustand, Konfiguration während des Laufs verändert, unbegrenzte Historie). Nur diese Varianten geprüft, keine vollständige neue Mutationsquote behauptet.

Die vorgeschriebene vollständige CI-Simulation endete nach dem Commit erneut vor Testbeginn: `mktemp` unter `/home/agent` scheitert am schreibgeschützten Dateisystem. Die57 separat ausgeführten Tests sind bestanden; kein vollständiger CI-/Remote-/Deploymentnachweis.
