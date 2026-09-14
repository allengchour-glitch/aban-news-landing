---
tags: [lehre, grind, tmp, konfiguration]
datum: 2026-09-14
---
# Eine Konfigurationsdatei in /tmp ist keine

Der CJ-Runner las seine Zusatz-Gruppen aus `/tmp/cj_groups_extra.json`. Die Datei lag im Repo
(`automation/cj_groups_extra.json`), die /tmp-Kopie war seit dem Wipe vom 30.08. weg. Folge:
`cjwerkzeug` endete 45-mal mit «unknown GRP», und jeder dieser Läufe kostete die Rotation einen Platz.

**Lehre:** Die Regel «was nur in /tmp lebt, existiert nicht» galt bisher für Skripte und Geheimnisse.
Sie gilt genauso für Konfigurationsdateien, die ein Skript LIEST. Ein Pfad nach /tmp in einem
Startbefehl ist eine Zeitbombe, auch wenn das Skript selbst im Repo liegt.

**Und:** «Immer das gleiche» lässt sich messen — CJ hat 578 Blatt-Kategorien, die Runner zogen 159;
`cjhome` stand auf Runde 45 mit «total 0» als häufigster Zeile. Ein Grind, der nur noch
`skip(dup-titel)` meldet, holt nichts Neues mehr.

Verwandt: [[Masse-ist-kein-Hebel]], [[Katalog-Groesse-und-B2B]]

Verwandt: [[Ein-stummer-Fallback-macht-aus-einem-Ausfall-eine-Rechnung]] — derselbe Tag, dieselbe Familie: ein Zustand, den kein Log nennt.
