---
name: stand
description: Zeigt den Git-Stand dieses Repos nur lesend (Branch, offene Änderungen, die letzten fünf Commits). Verwenden bei «Stand», «git status», «was ist offen» oder «wo stehen wir im Repo». Nicht für Shop-Zahlen (dafür shop-puls) und nicht zum Committen oder Pushen.
---

# Stand

Der Git-Stand dieses Repos auf einen Blick. Nur lesen: kein `add`, `commit`, `checkout`, `stash`, `pull` oder `push`, kein Aufräumen.

## Ablauf

1. Im Hauptordner des Repos diese zwei Befehle ausführen (die Reihenfolge ist egal):

   ```
   GIT_OPTIONAL_LOCKS=0 git status -sb
   git log --oneline -5
   ```

   `GIT_OPTIONAL_LOCKS=0` hält `git status` davon ab, den Index zu schreiben: mehrere Sitzungen arbeiten parallel in diesem Repo.
2. In wenigen Zeilen berichten: Branch und Abstand zu origin (`ahead` / `behind`), Zahl der geänderten Dateien und der unbekannten (`??`), die ersten Dateinamen, dann die fünf Commits. Bei mehr als 20 Statuszeilen 20 zeigen und die Zahl der übrigen nennen.

## Wenn es nicht klappt

- Meldet ein Befehl einen Fehler (Exit ungleich 0, zum Beispiel «not a git repository»), den Fehler wörtlich nennen und den anderen Befehl trotzdem zeigen. Nie «sauber» sagen, wenn der Status nicht gelesen werden konnte.
- «Keine offenen Änderungen» nur sagen, wenn `git status -sb` mit Exit 0 endete und nach der Branch-Zeile nichts kam. Ein Fehler und eine leere Antwort sind nicht dasselbe.
- Der Abstand zu origin gilt nur für den Stand der letzten Abholung. Dieser Skill holt nichts ab (kein `git fetch`, er liest nur): was inzwischen auf origin dazukam, steht nicht darin, und der Hetzner-Agent und parallele Sitzungen pushen laufend. Darum «Abstand zum zuletzt abgeholten origin» sagen, nie «auf Stand» oder «aktuell».
- Steht in der Branch-Zeile kein `...origin/…` (zum Beispiel «## lokal», ein Branch ohne Upstream), gibt es keinen Abstand zu nennen: genau das sagen, nichts erraten.
- Der Stand ist eine Momentaufnahme: parallele Sitzungen können ihn inzwischen geändert haben. Das einmal erwähnen, wenn der Besitzer daraus etwas entscheiden will.
