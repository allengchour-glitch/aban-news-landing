# ⏱️ Timer-Tools — zeitverzögerte Aktionen (luxestyle + abannews)

Zwei wiederverwendbare GitHub-Actions-Tools, um Dinge „in N Stunden" auszulösen,
**ohne dass eine Session offen bleiben muss**. Öffentliches Repo → Runner-Minuten
gratis, langes Warten ist unkritisch. Beide Workflows liegen auf `main` und werden
über **Actions → Workflow wählen → „Run workflow"** gestartet.

## 1. Timer-Dispatch — beliebigen Workflow verzögert starten
Datei: `.github/workflows/delay-dispatch.yml`

Wartet `delay_minutes` und startet dann den angegebenen Ziel-Workflow (per Dateiname)
mit optionalen JSON-Inputs. Das universelle Timer-Tool für **alles**.

| Input | Beispiel | Bedeutung |
|---|---|---|
| `workflow` | `aban-youtube.yml` | Ziel-Workflow (Dateiname) |
| `delay_minutes` | `180` | Wartezeit (Standard 120 = 2 Std) |
| `ref` | `main` | Branch des Ziel-Workflows |
| `inputs` | `{"count":"1","privacy":"public"}` | optionale Inputs als JSON |

### abannews-Beispiele
- **ABAN-Files-Folge in 3 Std posten:** `workflow=aban-youtube.yml`, `delay_minutes=180`, `inputs={"count":"1","privacy":"public"}`
- **YouTube-Aufrufe heute Abend ziehen:** `workflow=aban-yt-stats.yml`, `delay_minutes=480`
- **Mehrere Folgen gestaffelt:** den Timer mehrfach mit verschiedenen `delay_minutes` starten (z. B. 60 / 240 / 420) → Posts über den Tag verteilt statt alle auf einmal.

### luxestyle-Beispiele
- **Social-Post in 2 Std:** `workflow=social-meta-autopost.yml`, `delay_minutes=120`
- **Reel-Render anstoßen:** `workflow=reel-render.yml`, `delay_minutes=90`

## 2. PR Merge-Timer — PR verzögert mergen
Datei: `.github/workflows/pr-merge-timer.yml`

Wartet `delay_minutes` und mergt dann den angegebenen PR. Draft-PRs werden vorher
auf „ready" gesetzt; das Ergebnis wird als PR-Kommentar gemeldet.

| Input | Beispiel | Bedeutung |
|---|---|---|
| `pr` | `484` | PR-Nummer |
| `delay_minutes` | `120` | Wartezeit (Standard 2 Std) |
| `method` | `squash` | `squash` / `merge` / `rebase` |

## Hinweise
- **Granularität:** Die Tools warten per `sleep` im Job — auf die Minute genau ab Start.
- **Abbrechen:** den laufenden Timer-Run unter Actions einfach „Cancel"en.
- **Warum nicht in der Session warten:** Session-Container werden bei Inaktivität
  recycelt; ein Actions-Job läuft unabhängig zuverlässig bis zu ~5,8 Std.
- **`workflow_dispatch`-Regel:** Ziel-Workflows müssen auf der Default-Branch (`main`)
  liegen, damit der Timer sie starten kann.
