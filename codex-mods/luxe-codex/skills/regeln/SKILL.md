---
name: regeln
description: Zeigt die Regeln der Leitplanken von luxe-codex (Force-Push, pkill, git add -A, Geheimnisse, _SOCIAL_STOPP, scharfe Läufe ohne Trockenlauf) mit Beispiel, Grund und Ausweg, gemessen am Code. Verwenden bei «Regeln», «was darf ich hier nicht» oder «warum wurde das gesperrt». Nicht zum Umgehen einer Regel.
---

# Regeln

Die Leitplanken sind Projektregeln, die der Hook `leitplanken.mjs` vor jedem Werkzeugaufruf prüft. Dieser Skill zeigt sie, wie sie JETZT im Code stehen: das Skript misst jede Regel an einem Beispiel, statt eine Liste abzuschreiben.

## Ablauf

1. Das Skript ausführen. `<Skill-Ordner>` ist der Ordner, aus dem du diese `SKILL.md` gelesen hast; keinen anderen Pfad verwenden. Fehlt `node` im Pfad, `/opt/node22/bin/node` nehmen.

   ```
   node "<Skill-Ordner>/scripts/regeln.mjs"
   ```

2. Die Ausgabe wiedergeben: je Regel Beispiel, Urteil, Grund und Ausweg. Wer nur einen Überblick will, bekommt die Kurzliste unten plus die Auswege-Variablen aus der Ausgabe.

## Kurzliste (Überblick, massgebend ist die Ausgabe des Skripts)

1. Kein Force-Push.
2. Kein `pkill` und kein `killall`.
3. Kein `git add -A` und kein `git add .`.
4. Keine Geheimnisse in Dateien.
5. `dropship/_SOCIAL_STOPP` wird nie neu angelegt.
6. Kein `LIVE=1` ohne vorherigen Trockenlauf desselben Skripts in dieser Sitzung.

Weicht die Kurzliste von der Ausgabe ab, gilt die Ausgabe.

## Auswege

Zu fast jeder Regel gibt es eine Ausweg-Variable (`LUXE_*_OK=1` vor dem Befehl), zu `dropship/_SOCIAL_STOPP` keine. Sie gelten nur nach dem ausdrücklichen Ja des Besitzers in DIESEM Chat. Dieser Skill hilft nie dabei, eine Leitplanke zu umgehen, und ein Ausweg wird nie von dir allein gesetzt. Eine Leitplanke ist eine Gedächtnisstütze, keine Sicherheitsgrenze.

## Ausgang des Skripts

- Exit 0: Bericht gedruckt, letzte Zeile «Messung: alle 6 Regeln wie erwartet».
- Exit 3: Bericht gedruckt, aber die Messung weicht ab; die letzte Zeile beginnt mit «ABWEICHUNG» und nennt, was nicht stimmt (zum Beispiel ein Beispiel, das nicht mehr gesperrt wird). Das in der Antwort so sagen, nichts beschönigen.
- Exit 1: kein Bericht möglich, weil `lib/regeln.mjs` fehlt, sich nicht laden lässt oder eine andere Schnittstelle hat. Die Meldung wörtlich nennen. Die Kurzliste oben allein ist dann KEIN Beleg, dass diese Regeln gerade durchgesetzt werden.
- Exit 2: ein Argument wurde übergeben; das Skript nimmt keines.
