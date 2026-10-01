---
tags: [projekt, webseite]
quelle: CLAUDE.md
---
# abannews.com

Die Webseite im Wurzelverzeichnis dieses Repos: **1133 HTML-Seiten**, Schweizer KMU-Werkzeuge,
Rechner, Vergleiche, Marktseiten, Dossiers, dazu `en/`-Übersetzungen.

## Zustand

Health-Score **100,0/100** über 2694 Seiten (`automation/brain-state.json`), letzter Scan 0 hoch,
0 mittel, 0 niedrig. Loop:

```bash
python3 tools/daily_improvement_scan.py --fix && python3 tools/daily_improvement_scan.py
```

Doku: `automation/BRAIN.md` · Bericht: `reports/IMPROVEMENT-REPORT.md`

## Was zuletzt passiert ist

- **Produktraster dichter** (11.09.): mobil von 1 Spalte / 11 298 px auf 2 Spalten / 2887 px
  (−74 %), Desktop −39 %. 17 Seiten.
- **Handschrift-Runden** (07.09.): Kopfleiste deckend (Durchschlag 2,78 → 0,00 auf 54 Seiten),
  Eckenradien 30 verschiedene → 3, Farbverläufe 1111 → 438, Hype-Floskeln 1627 → 716.
- **„Frag aban"-Assistent entfernt** (02.09.) von allen 152 betroffenen Seiten — mobil lagen vier
  fixierte Schichten übereinander, rund 270 px eines 844-px-Schirms.

## Bevor du hier etwas änderst

[[Diff-Falle]] · [[Generator-Vorlagen-Falle]] · [[Background-image-Falle]] — und der Skill
`massen-html-aendern`.

## Wichtig

Nichts davon ist live. [[Live-Deploy]] steht seit dem 29.08.2026.
