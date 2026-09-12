---
tags: [falle, teuer-gelernt]
quelle: Session 2026-09-12, gemessen an build-pages.sh
gelernt: 2026-09-12
---
# Ein neues Verzeichnis landet oeffentlich auf abannews.com

Wer in diesem Repo ein neues Verzeichnis auf oberster Ebene anlegt, **veroeffentlicht es**, sofern
er es nicht ausdruecklich ausschliesst. `build-pages.sh` kopiert das Wurzelverzeichnis per `tar`
nach `_site/` und nennt nur eine **Ausschlussliste**: `.git`, `.github`, `node_modules`, `game`,
`video-prototypes`, `reels`, `social`, `dropship`, `ki-schriftsteller`, `luxestyle-3d`,
`luxestyle-shop`, `mediakit`, `tools`, `automation`, `server`, `linkedin`, `reports`,
`ki-tools-radar`. Alles andere geht live.

**Genau das ist in dieser Session passiert.** Der neue Obsidian-Vault `brain/` und die
Arbeitsanweisungen in `.claude/` standen in keiner Liste. Gemessen mit der echten
`tar`-Befehlszeile: **63 Eintraege** waeren auf abannews.com oeffentlich abrufbar gewesen —
Projekt-Gedaechtnis, Zugangs-Hinweise, interne Kennzahlen, Sackgassen.

Aufgefallen ist es nur, weil ich wegen eines roten Cloudflare-Checks in `build-pages.sh`
hineingesehen habe. Kein Test, kein Linter und kein `html-validate` haette das gemeldet, und die
Zahl „Dateien im Deploy" faellt bei 7167 um 63 nicht auf.

Behoben: `--exclude=./brain` und `--exclude=./.claude` ergaenzt. Nachgemessen 63 auf **0**, und die
Gegenprobe zeigt, dass `functions/` mit 39 Eintraegen weiter dabei ist — das ist Pflicht, sonst
sind alle `/api/*` tot.

**Regel: wer ein Verzeichnis anlegt, das nicht auf die Webseite gehoert, traegt es im selben
Arbeitsgang in die Ausschlussliste von `build-pages.sh` ein — und misst nach:**

```bash
tar -cf - --exclude=./.git --exclude=./node_modules . | tar -tf - | grep -c "^\./<verzeichnis>/"
```

⚠️ `build-pages.sh` **schreibt beim Laufen in verfolgte Dateien** (Sitemap, erzeugte Uebersichts-
seiten, Fusszeilen-Anker). Nach einem Testlauf die Nebenwirkungen pruefen und zuruecknehmen, sonst
wandern fremde Generator-Ausgaben in den eigenen Commit.


**Traegt der Skill `massen-html-aendern`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
