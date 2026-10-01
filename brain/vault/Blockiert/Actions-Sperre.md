---
tags: [blockiert, ci, nur-user]
quelle: CLAUDE.md
gelernt: 2026-06-13
---
# GitHub Actions ist kontoweit gesperrt

> ⚠️ **TEILWEISE WIDERLEGT am 2026-09-12.** `push`- und `pull_request`-Workflows laufen wieder,
> gemessen an echten Laeufen auf PR #2514 (Voice Linter 90 s bis `success`, Quality Check 110 s).
> `schedule` und `workflow_dispatch` sind **nicht** geprueft. Details und Zahlen:
> [[Actions-Sperre-gilt-nicht-mehr-fuer-push-und-pull-request]]. Der Rest dieser Notiz
> beschreibt den Stand von 2026-06-13 und die Fair-Use-Vorsicht, die weiter gilt.

Grund war Fair-Use: **158 Workflows, rund 60 Crons**. Die Sperre ist eine Folge der
[[GitHub-Spam-Markierung]].

## Cron-Nulldiät

Auf `main` sind **alle `schedule:`-Blöcke auskommentiert** (0 aktive Crons), `workflow_dispatch`
bleibt überall manuell startbar.

**Regel: Crons nicht massenhaft reaktivieren** — sonst erneute Sperre. Nur einzeln, höchstens
einmal pro Tag, und erst wenn Actions stabil zurück ist.

## Was trotzdem autonom geht

1. **Shopify-Arbeit** vollständig über die Shopify-Werkzeuge — kein Actions nötig. Das ist der
   einzige echte autonome Hebel am Shop.
2. **PRs mergen** per GitHub-API `merge_pull_request`.
3. **Cron-Ersatz auf GitLab-CI:** siehe [[GitLab-Ersatz]].

Verwandt: [[Workflow-Name-Doppelpunkt]]
