---
name: git-und-pr
description: Vor jedem Branch, Commit, Push, Merge oder Pull Request in diesem Repo - und immer wenn GitHub mit 404, einem Rate-Limit, "Actions has been disabled for this user" oder einer klemmenden Draft-PR antwortet. Enthält die Stale-Ref-Falle, die festen Branches und was die Spam-Markierung des Kontos wirklich bedeutet.
---

# Git und GitHub in diesem Repo

Repo: `allengchour-glitch/aban-news-landing`. Mehrere Sessions und Bots arbeiten **parallel**.

## Vor jedem neuen Branch — die Stale-Ref-Falle

`git fetch origin main` hat in einer frisch angelegten Arbeitskopie den Ref **nicht**
aktualisiert: `origin/main` zeigte auf einen Monate alten Commit. Ein darauf gebauter Branch
hätte die Integrationsarbeit einer anderen Session überschrieben — ein Datenverlust um Haaresbreite.

```bash
git fetch origin +refs/heads/main:refs/remotes/origin/main --force
git log -1 --format='%h %ad %s' --date=short origin/main
```

**Immer frisch von `origin/main` branchen**, nie auf alten Arbeitsbranches stapeln — andere Bots
pushen dort ständig. Wenn etwas von einem alten Branch gebraucht wird: cherry-picken.

## Die festen Branches

| Arbeit | Branch |
|---|---|
| Dropship, Shop, CJ, LuxeStyle | `claude/luxestyle-product-CizQ6` (vom User festgelegt) |
| Sonst | der Branch, den der Session-Auftrag nennt |

**Nie direkt nach `main` pushen** — das ist gesperrt. Immer Branch, dann Draft-PR nach `main`.
Die alten Branches `claude/dropship-lade-memory-SrAs5` und `claude/dropshipping-session-LehDs`
sind in `main` gemergt und vom Remote gelöscht — nicht mehr benutzen.

Push mit `git push -u origin <branch>`; bei Netzfehlern bis 4 Versuche mit 2s/4s/8s/16s Pause.

## Das Konto ist als Spam markiert — was das heisst

GitHubs eigene Meldung lautet `Validation Failed: User flagged as spammy`. Das erklärt in einem
Zug drei Dinge, die früher als getrennte Rätsel im Gedächtnis standen: die Actions-Sperre, die
harten API-Limits und dass Repo **und** Benutzerprofil für alle ausser dem Besitzer **404** liefern.

- **Ein 404 auf dieses Repo ist kein Beweis, dass es fehlt.** Erst anmelden, dann urteilen.
  Authentifizierter REST-Zugriff funktioniert vollständig: `list_branches`, `pull_request_read`,
  `push`, `merge_pull_request` laufen. Benutzer existiert, ID 284760098.
- **Ein anonymer Gegentest aus der Cloud-Session ist wertlos** — der Agent-Proxy liefert selbst
  403/404, unabhängig von der Markierung.
- **Nur GraphQL ist gedrosselt.** Eine Draft-PR auf "ready for review" zu setzen geht nur über
  GraphQL und klemmt deshalb. Dann: weiterarbeiten, die Commits sammeln sich im selben PR,
  später ein Merge. Nicht gegen das Limit hämmern.
- Ein **zweiter PR für dasselbe head nach base** geht nicht, GitHub lehnt ab.
- **Lösen kann das nur der User:** support.github.com/contact, Konto-Wiederherstellung beantragen.

## GitHub Actions ist kontoweit gesperrt

Grund war Fair-Use: 158 Workflows, rund 60 Crons. Auf `main` sind daher alle `schedule:`-Blöcke
auskommentiert (0 aktive Crons), `workflow_dispatch` bleibt überall.

**Crons nicht massenhaft reaktivieren** — das löst die Sperre erneut aus. Nur einzeln und
sparsam, höchstens einmal pro Tag, und erst wenn Actions stabil zurück ist.

**Ersatz für Crons:** GitLab-CI, Projekt `aban-ci` (`gitlab.com/allengchour/aban-ci`), Schedule
`7 8 * * *`. Ergebnisse landen auf den Branches `brain/youtube`, `brain/intel`, `brain/auto` —
nie auf `main`. Doku: `docs/GITLAB-SETUP.md`, `automation/autopilot/AUTOPILOT.md`.

Workflow-`name:` **nie mit Doppelpunkt** — das bricht den YAML-Trigger mit 422. Quoten oder weglassen.

## Merge ohne Actions

Über die GitHub-API `merge_pull_request` — das funktioniert. Alternativ `pr-merge-timer.yml`
(mergt mit Runner-Token und umgeht damit das API-Limit), sobald Actions wieder läuft.
Timer-Werkzeuge auf `main`: `delay-dispatch.yml`, `pr-merge-timer.yml`, Doku `docs/TIMER-TOOLS.md`.

## Werkzeuge, die im Container laufen

`spiele-dev/tools/th-pruef.mjs` hat `REPO` **fest** auf `/home/user/aban-news-landing`. Wer aus
einem Worktree arbeitet, kopiert die Tools und patcht die Konstante — nicht die Datei im Repo
ändern.
