---
tags: [falle, teuer-gelernt]
quelle: Session 2026-09-12, Bau der Werkzeuge
gelernt: 2026-09-12
---
# Selbsttests finden Fehler im Werkzeug selbst

Beim Bau der vier Gedaechtnis-Werkzeuge fanden die eingebauten Gegenproben **zwei echte Fehler im
eigenen Code** — beide in Werkzeugen, die vorher "funktioniert" hatten.

1. **`tools/skills_pruefen.py`** hatte den Repo-Pfad in `frontmatter_pruefen` fest verdrahtet
   (`p.relative_to(REPO)`). Auf dem echten Repo lief es fehlerfrei; sobald der Selbsttest es auf
   eine Kopie in `/tmp` anwandte, stuerzte es mit `ValueError` ab. Ohne Selbsttest waere der
   Fehler erst aufgefallen, wenn jemand das Werkzeug aus einem Worktree aufruft — genau die
   Situation, in der auch `th-pruef.mjs` schon einmal stolperte.

2. **`tools/lehre.py`** ersetzte Umlaute **nach** `unicodedata.normalize("NFKD", …)`. NFKD zerlegt
   "ä" in "a" + kombinierendes Trema, deshalb traf `.replace("ä","ae")` nie etwas: aus "öäü" wurde
   "oau" statt "oeaeue". Die Funktion lief ohne Fehlermeldung durch und lieferte still falsche
   Dateinamen.

Beide Fehler waren unsichtbar, solange man das Werkzeug nur am Gutfall benutzt. Das ist dasselbe
Muster wie bei `tools/kopfleiste.mjs`, nur eine Ebene tiefer: nicht die Messung war falsch,
sondern das Messgeraet.

**Regel:** Ein neues Werkzeug bekommt die Gegenprobe **im selben Arbeitsgang**, nicht spaeter —
und die Gegenprobe laeuft gegen eine **Kopie an einem anderen Pfad**, nicht gegen das Original.
Reihenfolge-Fallen (normalisieren vor ersetzen) und fest verdrahtete Pfade sind die zwei Fehler,
die sie zuverlaessig fangen.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
