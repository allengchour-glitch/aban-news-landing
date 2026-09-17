---
tags: [referenz, ci]
quelle: SHARED-MEMORY.md
gelernt: 2026-06-27
---
# GitLab-CI als Cron-Ersatz

Weil [[Actions-Sperre]] gilt, laufen alle Automationen auf GitLab-CI, Projekt `aban-ci`
(`gitlab.com/allengchour/aban-ci`), Schedule `7 8 * * *` (täglich 08:07 Europe/Zurich).

## Ergebnis-Branches — nie `main`

| Branch | Inhalt |
|---|---|
| `brain/youtube` | `automation/SECOND-BRAIN.md` — gelernte Trends, Hashtags, Hooks |
| `brain/intel` | Produkt-Ideen, Caption-Vorschläge, Tages-Digest, Conversion-Radar, Merchant-Feed |
| `brain/auto` | Seiten-Selbstverbesserung abannews |

⚠️ `brain/intel` liefert seit 27.06. nichts — GitLab prüfen.

Langsame Jobs (`aban-upload`, `pinterest`) laufen **nur manuell**, nicht im Schedule
(Minuten-Budget).

Doku: `docs/GITLAB-SETUP.md`, `automation/autopilot/AUTOPILOT.md`
