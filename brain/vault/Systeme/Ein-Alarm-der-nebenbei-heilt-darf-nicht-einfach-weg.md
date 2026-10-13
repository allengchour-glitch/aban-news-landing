---
tags: [system]
quelle: Hetzner-Plan 13.10.
gelernt: 2026-10-13
---
# Ein Alarm, der nebenbei heilt, darf nicht einfach weg

Der Rewind-Alarm des Servers (~4x/Tag, 'falsch') war die einzige Selbstheilung des Klons bei blockiertem Merge (98 Stashes). Erst die Heilung ersetzen, dann den Alarm abschalten. Server-Takt: Type=oneshot + KillMode=control-group beendet alle Motoren.

Verwandt: [[Hypothese-mit-Datum]]
