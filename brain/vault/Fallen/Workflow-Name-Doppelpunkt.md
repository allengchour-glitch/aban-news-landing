---
tags: [falle, ci]
quelle: CLAUDE.md
gelernt: 2026-06-11
---
# Workflow-Name nie mit Doppelpunkt

Ein `name:` mit Doppelpunkt im Wert bricht den YAML-Trigger eines GitHub-Workflows — die Folge
ist ein **422** beim Dispatch. Quoten oder den Doppelpunkt weglassen.

Verwandt: [[Actions-Sperre]]
