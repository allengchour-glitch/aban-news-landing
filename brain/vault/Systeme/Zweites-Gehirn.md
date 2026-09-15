---
tags: [system, gedaechtnis]
quelle: TikTok @herr_tech
gelernt: 2026-09-12
---
# System 1 — Zweites Gehirn

Das Video: „In Obsidian speicherst du alles, was für dich wichtig ist — Projekte, Meetings, Ideen,
Kundenwissen, Entscheidungen. Mit Claude ziehst du alles mit einem Prompt rein, und Claude bekommt
Zugriff auf dieses **zusammenhängende** Wissen."

## Was hier vorher war

`CLAUDE.md` (~470 Zeilen) und `SHARED-MEMORY.md` (~1140 Zeilen), zusammen **rund 158 KB Prosa**.
Vollständig, aber linear: jede Session liest eine Textwand, um eine einzelne Tatsache zu finden.
Und weil alles Prosa war, überlebte eine **falsche** Aussage monatelang unentdeckt — siehe
[[Hypothese-mit-Datum]].

## Was jetzt da ist

Dieser Obsidian-Vault unter `brain/vault/`. Atomare Notizen, über `[[Wikilinks]]` verbunden,
jede mit `quelle` und `gelernt`-Datum im Frontmatter. Die grossen Dateien bleiben die Historie,
der Vault ist der Zugriff darauf.

## Werkzeuge

```bash
python3 tools/gedaechtnis.py "review"       # Fakten zum Stichwort, mit Datum und Quelle
python3 tools/gedaechtnis.py --sackgassen   # was nachweislich nicht funktioniert
python3 tools/gedaechtnis.py --offen        # was nur der User klicken kann
python3 tools/vault.py bauen                # Index neu bauen, Links prüfen
python3 tools/lehre.py "..."                # neue Lehre aufnehmen
```

Verwandt: [[Claude-Skills]] · [[Selbst-besser-werden]]
