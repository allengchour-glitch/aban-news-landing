---
tags: [falle, teuer-gelernt]
quelle: Session 2026-09-12, PR #2514, echte Workflow-Laeufe
gelernt: 2026-09-12
---
# Actions-Sperre gilt nicht mehr fuer push und pull request

Das Gedaechtnis sagt seit 2026-06-13 in Grossbuchstaben: **„GITHUB ACTIONS IST ACCOUNT-WEIT
GESPERRT — Actions has been disabled for this user. Nichts laeuft mehr automatisch."** Darauf baut
der gesamte GitLab-CI-Umbau auf (siehe [[GitLab-Ersatz]]).

**Gemessen am 2026-09-12 an PR #2514: Workflows laufen wieder** — nicht nur angelegt, sondern
ausgefuehrt und abgeschlossen.

| Workflow | Lauf | Dauer | Ergebnis |
|---|---|---|---|
| Voice Linter | 2228 | 14:18:58 bis 14:20:28, 90 s | success |
| Quality Check | 1488 | 14:18:33 bis 14:20:23, 110 s | success |
| Cloudflare Pages | 2044 | 5 s | success |
| Voice Linter | 2224 | 91 s | failure (echter Befund, behoben) |

Eine Sperre wuerde nichts starten. 90 Sekunden Laufzeit mit `conclusion: success` ist eine echte
Ausfuehrung auf einem Runner.

**Was damit belegt ist:** `push`- und `pull_request`-Trigger funktionieren.
**Was NICHT geprueft ist:** `schedule` (Cron) und `workflow_dispatch`. Wer darauf baut, misst das
zuerst selbst.

**Warum das viel wert ist:** solange „Actions gesperrt" als Tatsache galt, wurden Arbeiten gar
nicht erst versucht — unter anderem der Reviews-Importer, der als „nur Creds fehlen" gilt und per
`workflow_dispatch` startbar waere ([[Reviews-Importer]]). Der ganze GitLab-Umbau existiert nur
wegen dieser Annahme.

**Vorsicht bleibt:** die Sperre kam von Fair-Use bei 158 Workflows und rund 60 Crons. Die
Nulldiaet gilt weiter, zumal vier Crons ohnehin schon wieder aktiv sind (siehe
[[Vier-Crons-sind-wieder-aktiv-trotz-Nulldiaet]]). Crons nicht massenhaft reaktivieren.

Das ist der zweite widerlegte „das geht nicht"-Eintrag derselben Art wie bei den CJ-Reviews —
siehe [[Hypothese-mit-Datum]]. **Ich selbst habe die falsche Aussage in dieser Session zuerst
weitergetragen** und der Userin beziehungsweise dem User gemeldet, Actions laufe nicht, bevor die
PR-Ereignisse das Gegenteil zeigten.

Verwandt: [[Hypothese-mit-Datum]]
