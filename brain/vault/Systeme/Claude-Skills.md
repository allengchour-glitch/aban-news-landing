---
tags: [system, skills]
quelle: TikTok @herr_tech
gelernt: 2026-09-12
---
# System 5 — Claude Skills (die Königsdisziplin)

Das Video nennt es ausdrücklich die „absolute Königsdisziplin":

> „Statt jedes Mal neu zu prompten, bringst du Claude **einmal** bei, wie du arbeitest."

## Der gemessene Befund

`.claude/skills/` **existierte in diesem Repo überhaupt nicht.** Es gab keine einzige
`SKILL.md` — gemessen mit `find . -name SKILL.md`, Ergebnis leer. Genau das Stück, das das Video
als wichtigstes bezeichnet, war das einzige, das vollständig fehlte.

Stattdessen standen alle teuer gelernten Regeln als Prosa in einer 470-Zeilen-Datei, die jede
Session komplett liest und trotzdem einzelne Fallen übersieht.

## Was jetzt da ist

| Skill | löst aus bei |
|---|---|
`messgeraet-zuerst` | „besser", „schöner", „eleganter", „optimieren" — alles ohne Zahl |
`shopify-publizieren` | Produkt oder Collection anlegen, Token, 404, FAILED-Bild |
`massen-html-aendern` | eine Änderung über viele der 1133 HTML-Seiten |
`gedaechtnis` | „wo war ich", Stand, Sackgassen, Gedächtnis fortschreiben |
`git-und-pr` | Branch, Push, PR, GitHub-404, Rate-Limit |

Ein Skill lädt sich **selbst**, wenn die Beschreibung zur Aufgabe passt. Die Beschreibung ist
deshalb der wichtigste Teil: sie muss die Wörter enthalten, die der User tatsächlich benutzt.

## Pflege

```bash
python3 tools/skills_pruefen.py     # findet verrottete Datei- und Werkzeugverweise
```

Skills verrotten, wenn sie auf gelöschte Dateien zeigen. Das Werkzeug prüft jeden Pfad, den eine
`SKILL.md` nennt.

Verwandt: [[Selbst-besser-werden]] · [[Zweites-Gehirn]]
