# Strategie-Prüfstand — Anleitung

Mit diesem Kit prüfst du eine Trading-Idee, bevor sie dich Geld kostet. Es beantwortet eine
einzige Frage ehrlich: **Steckt in deiner Regel Können, oder hattest du Glück?**

Keine Anlageberatung. Der Prüfstand sagt dir nicht, was du kaufen sollst. Er sagt dir, ob ein
Ergebnis, das gut aussieht, einem ernsthaften Test standhält.

---

## 1. In 5 Minuten starten

Du brauchst nur Python 3.9 oder neuer (python.org, gratis). Keine Zusatzpakete.

```
python3 pruefstand.py --demo
```

Das rechnet neun bekannte Trading-Stile auf einem **reinen Zufallskurs** durch. In diesen Daten
steckt kein Muster, trotzdem sehen einige Stile ordentlich aus. Diesen Effekt musst du einmal
gesehen haben: Bei echten Kursen passiert genau dasselbe, nur merkt man es dort nicht.

Danach mit echten Kursen (Internet nötig):

```
python3 pruefstand.py --symbol ^SSMI        # SMI
python3 pruefstand.py --symbol ^GSPC        # S&P 500
python3 pruefstand.py --symbol NESN.SW      # Nestlé
python3 pruefstand.py --symbol GC=F         # Gold
python3 pruefstand.py --symbol BTC-USD      # Bitcoin
```

Oder mit einer eigenen Kursdatei (z. B. Export aus deinem Broker):

```
python3 pruefstand.py --csv meine_kurse.csv
```

Die Datei braucht eine Datums- und eine Schlusskurs-Spalte. Komma oder Semikolon, Schweizer
Zahlen (`1'234,50`) und englische (`1234.50`) werden erkannt.

Jeder Lauf schreibt zusätzlich **bericht.html**, zum Öffnen im Browser.

## 2. Deine eigene Regel testen

Öffne `meine_regel.py`. Dort steht eine Funktion:

```python
def regel(kurse, i):
    ...
    return 1   # investiert
    return 0   # Cash
```

`kurse` enthält die Schlusskurse **bis heute**, `kurse[-1]` ist der heutige. Mehr bekommt die
Regel nicht zu sehen. Greift sie trotzdem auf einen späteren Kurs zu, bricht der Prüfstand mit
dem **Zukunfts-Schutz** ab. Das ist der häufigste Fehler in selbstgebauten Backtests.

```
python3 pruefstand.py --symbol ^SSMI --regel meine_regel.py
```

Deine Regel erscheint in der Tabelle mit ◀ markiert, direkt neben den neun eingebauten Stilen.

Weitere Optionen:

| Option | Bedeutung |
|---|---|
| `--kosten 0.2` | Kosten pro Wechsel in Prozent (Standard 0.1). Bei Kleinbeträgen und CFDs eher 0.3 bis 1.0 |
| `--zufall 500` | mehr Zufallsstrategien, genauere Skill-Zahl, längere Rechenzeit |
| `--bericht gold.html` | Name der Berichtsdatei |
| `--seed 7` | wiederholbarer Zufall für die Demo |

## 3. So liest du den Bericht

| Spalte | Was sie sagt |
|---|---|
| **pro Jahr** | durchschnittliche Rendite nach Kosten |
| **Einbruch** | grösster Verlust vom Höchststand. Frag dich ehrlich, ob du den ausgehalten hättest |
| **im Markt** | Anteil der Tage, an denen das Geld investiert war |
| **Trades** | abgeschlossene Käufe und Verkäufe |
| **Skill** | siehe unten, die wichtigste Zahl |
| **Urteil** | Zusammenfassung in Worten |

### Skill in Prozent

Der Prüfstand erzeugt 200 Zufallsstrategien, die **genau so lange investiert sind** und **genau so
oft wechseln** wie deine Regel. Dann zählt er, wie viele davon deine Regel nach Kosten schlägt.

- **um 50 %**: nicht besser als Würfeln
- **über 95 %**: auffällig. Jetzt beginnt die eigentliche Prüfung (Abschnitt 5)
- **unter 5 %**: schlechter als Zufall. Auch das ist eine Information, vielleicht funktioniert das Gegenteil

Warum nicht einfach „Rendite höher als Halten“? Eine Regel, die nur halb so lange investiert ist,
hat automatisch weniger Einbruch **und** weniger Rendite. Das ist kein Können, das ist weniger
Einsatz. Der Skill vergleicht fair: gleicher Einsatz, gleiche Kosten, nur das Timing zählt.

### Gegenprobe

Vor jedem Lauf prüft der Prüfstand sich selbst: Eine Regel, die den nächsten Tag kennt, muss fast
100 % Skill erreichen. Kommt sie nicht dorthin, stimmt etwas mit den Daten nicht (Lücken,
doppelte Tage, falsche Spalte), und das Programm rechnet gar nicht erst weiter.

## 4. Die sieben Fallen

1. **Blick in die Zukunft.** Heute mit dem Schlusskurs von heute handeln geht nicht. Du erfährst
   ihn erst, wenn die Börse zu ist. Der Prüfstand handelt deshalb immer am nächsten Tag.
2. **Kosten vergessen.** 0.1 % pro Wechsel klingt nach nichts. Bei 250 Wechseln im Jahr fehlen
   rund 25 Prozentpunkte Rendite. Im Daytrading-Test (Abschnitt 6) wird aus +19 % bei Gold so −7 %.
3. **Die Auswahl-Falle.** Wer zehn Regeln testet und die beste nimmt, nimmt meistens die
   glücklichste. Der Bericht zeigt das direkt: Der Sieger der ersten Hälfte wird auf der zweiten
   Hälfte gemessen. Beim SMI war Trendfolge vorher der beste Stil (Sharpe 0.59) und danach
   schwach (0.12, Skill 3 %).
4. **Zu viele Versuche.** Bei 20 getesteten Regeln landet im Schnitt eine rein zufällig über
   95 %. Der Bericht rechnet dir vor, wie viele Zufallstreffer zu erwarten sind.
5. **Zu kurze Daten.** Drei gute Jahre sagen wenig. Ein ehrlicher Test umfasst mindestens einen
   Crash (2008, 2020, 2022).
6. **Auswendig lernen.** Je mehr Stellschrauben (Parameter) eine Regel hat, desto besser passt
   sie auf die Vergangenheit und desto schlechter auf die Zukunft. Faustregel: höchstens zwei
   Zahlen, die du einstellst.
7. **Nur auf einem Markt geprüft.** Eine echte Eigenschaft der Märkte zeigt sich meist auch auf
   ähnlichen Märkten. Taucht der gute Wert nur beim SMI auf und bei DAX und S&P 500 nicht, war es
   vermutlich Glück.

## 5. Wenn deine Regel über 95 % kommt

Gratuliere, jetzt fängt die Arbeit an:

1. **Andere Märkte:** gleiche Regel, ohne Änderung, auf 3 bis 5 ähnlichen Märkten.
2. **Andere Zeiträume:** Liegt der Skill auch in der ersten und in der zweiten Hälfte der Daten
   hoch? Schneide dafür deine CSV-Datei.
3. **Höhere Kosten:** `--kosten 0.3`. Bricht die Regel ein, lebt sie von zu vielen Trades.
4. **Mit echter Rendite vergleichen:** Hohes Timing-Können mit weniger Rendite als Halten kann
   sich trotzdem lohnen, wenn dir der kleinere Einbruch wichtig ist. Das ist eine persönliche
   Entscheidung, keine mathematische.
5. **Papier-Handel:** Mindestens 3 Monate mit Spielgeld, vorab notiert, ohne nachträgliches
   Anpassen. Erst dann mit einem Betrag, dessen Verlust du verkraftest.

## 6. Bonus: Daytrading-Test

```
python3 daytrading_test.py
```

Er testet neun Tagesregeln (der ersten Stunde folgen, gegen sie setzen, Ausbruch aus der
Anfangs-Spanne) auf Stundenkerzen der letzten zwei Jahre: Gold, Silber, Öl, S&P-500-Future, Bitcoin
und neun Aktien (Apple, Nvidia, Tesla, Microsoft, Amazon, Nestlé, Novartis, Roche, UBS). Die Regel
wählt der Test jeweils auf 120 Tagen und handelt damit die nächsten 20 ungesehenen Tage. Das
Ergebnis landet in `daytrading-bericht.md`.

**Stabilitätsprüfung:** Derselbe Test läuft mit allen 20 möglichen Startpunkten der Blöcke. Die
Spalte „im Plus“ zeigt, bei wie vielen davon nach Kosten ein Gewinn bleibt. Ein gutes Ergebnis bei
nur einem Startpunkt ist Zufall der Einteilung.

Märkte ändern: In `daytrading_test.py` oben `ROHSTOFFE = {...}` und `AKTIEN = {...}` anpassen
(Yahoo-Symbole). Aktien brauchen mindestens 6 Stundenkerzen pro Tag, US-Börsen haben nur 7.

## 7. Unsere eigenen Ergebnisse

Auf abannews.com/trading-lernen.html zeigen wir, was dieselben Werkzeuge auf acht Märkten seit 2000
ergeben haben, und ein Übungsdepot, in dem ein Bot täglich mit Spielgeld handelt und seine
Trefferquote offenlegt. Kurz gesagt: Kein Stil schlägt einfaches Halten verlässlich. Einige zeigen
echtes Timing-Können (Swing auf Aktienindizes), verdienen aber trotzdem weniger, weil das Geld
meist nicht investiert ist.

---

Fragen, Fehler, Ideen: hallo@abannews.com
