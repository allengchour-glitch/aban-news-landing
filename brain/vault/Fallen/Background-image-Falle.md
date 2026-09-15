---
tags: [falle, css, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-09-07
---
# background-image nimmt keine Farbe an

Einen Verlauf in `background-image` durch eine Farbe zu ersetzen erzeugt eine **ungültige**
Angabe, die der Browser **still** verwirft. Die Fläche ist danach durchsichtig — ohne
Fehlermeldung, ohne Konsolen-Warnung, ohne Befund in `html-validate`.

Farben gehören nach `background-color` oder in die `background`-Kurzschrift.

Verwandt: [[Diff-Falle]]
