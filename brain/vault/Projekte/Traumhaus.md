---
tags: [projekt, spiel]
quelle: CLAUDE.md, SHARED-MEMORY.md
---
# Traumhaus (Spiel)

Browser-Spiel `traumhaus.html`, Drei-D über Three.js. Eigene Session-Familie mit eigenem Runbook:
`spiele-dev/RUNBOOK-TRAUMHAUS.md` und `spiele-dev/RUNBOOK-SPIELE.md` **zuerst lesen**.

## Prüfwerkzeuge (nach jeder Charge laufen lassen)

| Werkzeug | prüft |
|---|---|
| `spiele-dev/tools/th-pruef.mjs` | Gesamtprüfung, Exit 1 bei Befund |
| `spiele-dev/tools/th-3d.mjs` | trennt echte Überschneidungen von Luft |
| `spiele-dev/tools/th-mass.mjs` | Grundfläche je Zielhöhe — Pflicht vor jedem `viertel()`-cfg |
| `spiele-dev/tools/th-blick.mjs` | Screenshot |
| `spiele-dev/tools/th-handschrift.py` | zählt Verläufe, Emoji, HUD-Symbole |

## Regeln, die teuer waren

- `bau()` skaliert **nur über die Höhe** — Grundflächen vorher messen.
- `wegVonStrasse` prüft nur den **Ankerpunkt**; für Flächen `korridorKonflikt` nehmen.
- **Wer eine Fläche belegt, muss sie anmelden** (`window.SPORTFELD`-Muster). Bäume und Felder
  haben keine Kollider, `inSolid` sieht sie nicht.
- **Eine 2D-Überschneidungszahl ist kein Befund.** Von 176 Funden waren **69 reine Luft** —
  Vordächer, Baumkronen, Kranausleger. Nach der 2D-Zahl zu handeln hätte die Tankstelle wegen
  einer 30-cm-Stütze 2,7 m auf die Ringfahrbahn gesetzt. Fahrbahnen stehen in keiner
  Kollider-Karte, sondern in `STRASSENBAND`.
- Bewegte Objekte liegen während jeder Messung im **Nullpunkt**, weil die Frame-Kette hinter
  `if(running)` hängt und eine Sonde nie auf Start drückt.
- `_dorfNacht` wird jeden Frame aus `uhrzeit` neu gerechnet — direkt setzen wirkt nicht,
  `window.__th.zeit(min)` nehmen.
- `th-pruef.mjs` hat `REPO` fest verdrahtet — aus einem Worktree die Tools kopieren und die
  Konstante patchen, nicht die Repo-Datei ändern.

Das ist dasselbe Muster wie [[Messgeraet-Gegenprobe]]: die Zahl allein lügt.
