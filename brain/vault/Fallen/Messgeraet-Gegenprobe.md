---
tags: [falle, methode, teuer-gelernt]
quelle: CLAUDE.md
gelernt: 2026-09-07
---
# Ein Messgerät ohne Gegenprobe ist ein Verdacht

`tools/kopfleiste.mjs` meldete auf 54 Seiten überall **0,00** Durchschlag. Das Ergebnis sah
perfekt aus. Die eingebaute Gegenprobe — eine künstlich halbtransparente Leiste **muss**
ausschlagen — entlarvte das Gerät: `page.screenshot({clip})` rechnet in **Dokument**-, nicht in
Bildschirmkoordinaten, der Ausschnitt lag weit unter der Leiste.

Ohne den Selbsttest wäre „alles sauber" gemeldet worden, während der Fehler unverändert live stand.

**Regel:** Jedes Messgerät muss an einem künstlich verschlechterten Fall ausschlagen, bevor seine
Nullmeldung etwas wert ist.

Verwandt: [[Kennzahl-zaehlt-Absicht]] · [[Diff-Falle]] · [[Hypothese-mit-Datum]]
