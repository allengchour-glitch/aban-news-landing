---
tags: [falle, html, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-09-07
---
# Bei Massenersetzungen den Diff lesen, nicht die Zahl

Ein Muster mit einfachem Bindestrich machte aus
`3-5 Minuten, kein Hype.` → `3.` — **auf 264 Seiten**.

Trefferzahlen und `html-validate` sahen dabei völlig unauffällig aus. Nur der Diff zeigte es.

Nach jeder Massenersetzung stichprobenweise lesen, mindestens fünf Seiten plus die längsten
Diff-Blöcke:

```bash
git diff | grep '^-' | grep -v '^---' | sort | uniq -c | sort -rn | head -20
```

Ziel ist der Satz: „Der Diff besteht zu 100 % aus Zeilen, die ich ändern wollte."

Verwandt: [[Generator-Vorlagen-Falle]] · [[Background-image-Falle]] · [[abannews]]
